import { E2EContext, TEST_JWT_SECRET, closeE2EApp, createE2EApp, truncateAll } from './support/e2e';
import { createUser } from './support/seed';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

/**
 * REAL-DB e2e for the auth guards (JwtAuthGuard + @Public).
 * Uses the real `/v1/auth/me` (DB-backed) as the protected route and a real user.
 */
describe('Guards (e2e — real DB)', () => {
  let ctx: E2EContext;

  beforeAll(async () => {
    ctx = await createE2EApp();
  });
  afterAll(async () => {
    await closeE2EApp(ctx);
  });
  beforeEach(async () => {
    await truncateAll(ctx.prisma);
  });

  describe('JwtAuthGuard', () => {
    it('returns 401 for a missing token on a protected route', async () => {
      const res = await request(ctx.server()).get('/v1/auth/me');
      expect(res.status).toBe(401);
      // 401s are normalized to the error envelope with a status-derived code.
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(typeof res.body.error.message).toBe('string');
      expect(res.body.error.details).toBeUndefined();
    });

    it('returns 401 for an expired token', async () => {
      const expired = ctx.jwt.sign(
        { sub: 'u1', role: 'CUSTOMER', tenantId: null },
        { secret: TEST_JWT_SECRET, expiresIn: '-1s' },
      );
      const res = await request(ctx.server())
        .get('/v1/auth/me')
        .set(...ctx.auth(expired));
      expect(res.status).toBe(401);
    });

    it('returns 200 for a valid token on a protected route (real user)', async () => {
      const user = await createUser(ctx.prisma, { firstName: 'Guarded', role: 'CUSTOMER' });
      const token = ctx.sign({ sub: user.id, role: 'CUSTOMER', tenantId: null });
      const res = await request(ctx.server())
        .get('/v1/auth/me')
        .set(...ctx.auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(user.id);
    });

    it('allows a @Public() route without a token', async () => {
      const res = await request(ctx.server()).get('/v1/plans');
      expect(res.status).toBe(200);
    });
  });
});
