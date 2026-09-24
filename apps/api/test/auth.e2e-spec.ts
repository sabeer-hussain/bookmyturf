import { E2EContext, closeE2EApp, createE2EApp, otpSendMock, truncateAll } from './support/e2e';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

/**
 * REAL-DB + REAL-REDIS e2e for Authentication (module: auth).
 *
 * The full OTP flow runs for real: `otp/send` stores the code in real Redis and calls
 * the (mocked) SMS-send provider; `otp/verify` reads Redis, creates/updates a real user,
 * and issues real JWTs. Rate-limiting uses the real Redis counter.
 *
 * In test config (`OTP_PROVIDER=dev`) the generated code is the fixed `123456`, so verify
 * is deterministic. Google login is "not configured" (empty `GOOGLE_CLIENT_ID`).
 */
describe('Auth (e2e — real DB + Redis)', () => {
  let ctx: E2EContext;
  const DEV_OTP = '123456';

  // Unique phone per test AND per run (timestamp-based) so Redis OTP / rate-limit keys
  // (`otp:`, `otp_attempts:`, `otp_rate:`) never bleed across tests or repeated runs.
  const runTag = Date.now() % 100000;
  let phoneSeq = 0;
  const nextPhone = () =>
    `+9198${String(runTag).padStart(5, '0')}${String(phoneSeq++).padStart(3, '0')}`;

  async function cleanOtp(phone: string) {
    await ctx.redis.del(`otp:${phone}`);
    await ctx.redis.del(`otp_attempts:${phone}`);
    await ctx.redis.del(`otp_rate:${phone}`);
  }

  beforeAll(async () => {
    ctx = await createE2EApp();
  });
  afterAll(async () => {
    await closeE2EApp(ctx);
  });
  beforeEach(async () => {
    await truncateAll(ctx.prisma);
    otpSendMock.sendOtp.mockClear();
  });

  describe('POST /v1/auth/otp/send', () => {
    it('sends an OTP for a valid phone (stores in real Redis, calls send provider)', async () => {
      const phone = nextPhone();
      await cleanOtp(phone);
      const res = await request(ctx.server()).post('/v1/auth/otp/send').send({ phone });
      expect(res.status).toBe(201);
      expect(res.body.data.message).toBe('OTP sent successfully');
      // Real Redis holds the code; send provider (SMS) was invoked (mocked).
      expect(await ctx.redis.get(`otp:${phone}`)).toBe(DEV_OTP);
      expect(otpSendMock.sendOtp).toHaveBeenCalledWith(phone, DEV_OTP);
      await cleanOtp(phone);
    });

    it('rejects an invalid phone format (400)', async () => {
      const res = await request(ctx.server()).post('/v1/auth/otp/send').send({ phone: '123' });
      expect(res.status).toBe(400);
    });

    it('rejects an empty body (400)', async () => {
      const res = await request(ctx.server()).post('/v1/auth/otp/send').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/auth/otp/verify', () => {
    it('verifies the OTP, creates a real user, and returns tokens', async () => {
      const phone = nextPhone();
      await cleanOtp(phone);
      await request(ctx.server()).post('/v1/auth/otp/send').send({ phone }).expect(201);

      const res = await request(ctx.server())
        .post('/v1/auth/otp/verify')
        .send({ phone, code: DEV_OTP });
      expect(res.status).toBe(201);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.refreshToken).toBeTruthy();

      // Real user was created and OTP key consumed.
      const user = await ctx.prisma.user.findUnique({ where: { phone } });
      expect(user).not.toBeNull();
      expect(await ctx.redis.get(`otp:${phone}`)).toBeNull();
      await cleanOtp(phone);
    });

    it('rejects an incorrect OTP (401)', async () => {
      const phone = nextPhone();
      await cleanOtp(phone);
      await request(ctx.server()).post('/v1/auth/otp/send').send({ phone }).expect(201);
      const res = await request(ctx.server())
        .post('/v1/auth/otp/verify')
        .send({ phone, code: '000000' });
      expect(res.status).toBe(401);
      await cleanOtp(phone);
    });

    it('rejects an invalid code format (400)', async () => {
      const phone = nextPhone();
      const res = await request(ctx.server())
        .post('/v1/auth/otp/verify')
        .send({ phone, code: 'abc' });
      expect(res.status).toBe(400);
    });

    it('enforces the verify rate limit after too many attempts (real Redis counter)', async () => {
      const phone = nextPhone();
      await cleanOtp(phone);
      await request(ctx.server()).post('/v1/auth/otp/send').send({ phone }).expect(201);
      // verify() blocks when attempts > 5; attempts 1–5 return 401 (wrong code), the 6th is blocked (400).
      for (let i = 0; i < 5; i++) {
        const r = await request(ctx.server())
          .post('/v1/auth/otp/verify')
          .send({ phone, code: '000000' });
        expect(r.status).toBe(401);
      }
      const sixth = await request(ctx.server())
        .post('/v1/auth/otp/verify')
        .send({ phone, code: '000000' });
      expect(sixth.status).toBe(400); // "Maximum OTP attempts exceeded"
      await cleanOtp(phone);
    });

    it('enforces the send rate limit (429 RATE_LIMIT_EXCEEDED envelope)', async () => {
      const phone = nextPhone();
      await cleanOtp(phone);
      // Send allows 3 requests / 10 min; the 4th is blocked with 429.
      await request(ctx.server()).post('/v1/auth/otp/send').send({ phone }).expect(201);
      await request(ctx.server()).post('/v1/auth/otp/send').send({ phone }).expect(201);
      await request(ctx.server()).post('/v1/auth/otp/send').send({ phone }).expect(201);
      const fourth = await request(ctx.server()).post('/v1/auth/otp/send').send({ phone });
      expect(fourth.status).toBe(429);
      expect(fourth.body.success).toBe(false);
      expect(fourth.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      await cleanOtp(phone);
    });
  });

  describe('POST /v1/auth/refresh', () => {
    it('issues new tokens for a valid refresh token (real bcrypt-stored)', async () => {
      const phone = nextPhone();
      await cleanOtp(phone);
      await request(ctx.server()).post('/v1/auth/otp/send').send({ phone }).expect(201);
      const login = await request(ctx.server())
        .post('/v1/auth/otp/verify')
        .send({ phone, code: DEV_OTP });
      const refreshToken = login.body.data.refreshToken;

      const res = await request(ctx.server()).post('/v1/auth/refresh').send({ refreshToken });
      expect(res.status).toBe(201);
      expect(res.body.data.accessToken).toBeTruthy();
      await cleanOtp(phone);
    });

    it('rejects an invalid refresh token (403)', async () => {
      const res = await request(ctx.server())
        .post('/v1/auth/refresh')
        .send({ refreshToken: 'not-a-real-token' });
      expect(res.status).toBe(403);
    });

    it('rejects an empty body (400)', async () => {
      const res = await request(ctx.server()).post('/v1/auth/refresh').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/auth/google', () => {
    it('rejects an empty body (400)', async () => {
      const res = await request(ctx.server()).post('/v1/auth/google').send({});
      expect(res.status).toBe(400);
    });

    it('returns "not configured" when GOOGLE_CLIENT_ID is unset (401)', async () => {
      const res = await request(ctx.server())
        .post('/v1/auth/google')
        .send({ idToken: 'any-token' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /v1/auth/logout', () => {
    it('rejects an unauthenticated request (401)', async () => {
      const res = await request(ctx.server()).post('/v1/auth/logout');
      expect(res.status).toBe(401);
    });

    it('clears the refresh token for an authenticated user (real update)', async () => {
      const phone = nextPhone();
      await cleanOtp(phone);
      await request(ctx.server()).post('/v1/auth/otp/send').send({ phone }).expect(201);
      const login = await request(ctx.server())
        .post('/v1/auth/otp/verify')
        .send({ phone, code: DEV_OTP });
      const accessToken = login.body.data.accessToken;
      const user = await ctx.prisma.user.findUnique({ where: { phone } });

      const res = await request(ctx.server())
        .post('/v1/auth/logout')
        .set(...ctx.auth(accessToken));
      expect(res.status).toBe(201);
      expect(
        (await ctx.prisma.user.findUnique({ where: { id: user!.id } }))?.refreshToken,
      ).toBeNull();
      await cleanOtp(phone);
    });
  });

  describe('GET /v1/auth/me', () => {
    it('rejects an unauthenticated request (401)', async () => {
      const res = await request(ctx.server()).get('/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns the current user for a valid token', async () => {
      const phone = nextPhone();
      await cleanOtp(phone);
      await request(ctx.server()).post('/v1/auth/otp/send').send({ phone }).expect(201);
      const login = await request(ctx.server())
        .post('/v1/auth/otp/verify')
        .send({ phone, code: DEV_OTP });

      const res = await request(ctx.server())
        .get('/v1/auth/me')
        .set(...ctx.auth(login.body.data.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe(phone);
      await cleanOtp(phone);
    });
  });
});
