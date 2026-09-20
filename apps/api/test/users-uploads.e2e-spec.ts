import {
  E2EContext,
  closeE2EApp,
  createE2EApp,
  truncateAll,
  uploadProviderMock,
} from './support/e2e';
import { createUser } from './support/seed';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

/**
 * REAL-DB e2e for Users & Uploads (modules: users, uploads).
 * User profile read/update run against the real DB (self-access control).
 * The S3 upload provider is mocked in the harness (external boundary); the
 * presigned-URL endpoint is still exercised end-to-end through the controller.
 */
describe('Users & Uploads (e2e — real DB)', () => {
  let ctx: E2EContext;

  beforeAll(async () => {
    ctx = await createE2EApp();
  });
  afterAll(async () => {
    await closeE2EApp(ctx);
  });
  beforeEach(async () => {
    await truncateAll(ctx.prisma);
    uploadProviderMock.getPresignedUrl.mockClear();
  });

  describe('GET /v1/users/:id', () => {
    it('returns own profile (real)', async () => {
      const user = await createUser(ctx.prisma, { firstName: 'Alice', role: 'CUSTOMER' });
      const token = ctx.sign({ sub: user.id, role: 'CUSTOMER', tenantId: null });
      const res = await request(ctx.server())
        .get(`/v1/users/${user.id}`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('Alice');
    });

    it('returns 403 for another user', async () => {
      const target = await createUser(ctx.prisma);
      const token = ctx.sign({ sub: 'someone-else', role: 'CUSTOMER', tenantId: null });
      const res = await request(ctx.server())
        .get(`/v1/users/${target.id}`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(403);
    });

    it('returns 401 without a token', async () => {
      const res = await request(ctx.server()).get('/v1/users/anyone');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /v1/users/:id', () => {
    it('updates own profile (real persistence)', async () => {
      const user = await createUser(ctx.prisma, { firstName: 'Old' });
      const token = ctx.sign({ sub: user.id, role: 'CUSTOMER', tenantId: null });
      const res = await request(ctx.server())
        .patch(`/v1/users/${user.id}`)
        .set(...ctx.auth(token))
        .send({ firstName: 'New' });
      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('New');
      expect((await ctx.prisma.user.findUnique({ where: { id: user.id } }))?.firstName).toBe('New');
    });

    it('rejects invalid gender (400)', async () => {
      const user = await createUser(ctx.prisma);
      const token = ctx.sign({ sub: user.id, role: 'CUSTOMER', tenantId: null });
      const res = await request(ctx.server())
        .patch(`/v1/users/${user.id}`)
        .set(...ctx.auth(token))
        .send({ gender: 'INVALID' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/uploads/presigned', () => {
    it('returns a presigned URL (upload provider mocked)', async () => {
      const user = await createUser(ctx.prisma);
      const token = ctx.sign({ sub: user.id, role: 'CUSTOMER', tenantId: null });
      const res = await request(ctx.server())
        .post('/v1/uploads/presigned')
        .set(...ctx.auth(token))
        .send({ fileName: 'pic.jpg', fileType: 'image/jpeg', folder: 'avatars' });
      expect(res.status).toBe(201);
      expect(res.body.data.uploadUrl).toBeTruthy();
      expect(res.body.data.fileUrl).toBeTruthy();
      expect(uploadProviderMock.getPresignedUrl).toHaveBeenCalledWith(
        'pic.jpg',
        'image/jpeg',
        'avatars',
      );
    });

    it('rejects an invalid file type (400)', async () => {
      const user = await createUser(ctx.prisma);
      const token = ctx.sign({ sub: user.id, role: 'CUSTOMER', tenantId: null });
      const res = await request(ctx.server())
        .post('/v1/uploads/presigned')
        .set(...ctx.auth(token))
        .send({ fileName: 'f.exe', fileType: 'application/x-msdownload', folder: 'avatars' });
      expect(res.status).toBe(400);
    });

    it('rejects an invalid folder (400)', async () => {
      const user = await createUser(ctx.prisma);
      const token = ctx.sign({ sub: user.id, role: 'CUSTOMER', tenantId: null });
      const res = await request(ctx.server())
        .post('/v1/uploads/presigned')
        .set(...ctx.auth(token))
        .send({ fileName: 'pic.jpg', fileType: 'image/jpeg', folder: 'secrets' });
      expect(res.status).toBe(400);
    });

    it('requires authentication (401)', async () => {
      const res = await request(ctx.server())
        .post('/v1/uploads/presigned')
        .send({ fileName: 'pic.jpg', fileType: 'image/jpeg', folder: 'avatars' });
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /v1/uploads/file/:folder/:filename', () => {
    it('accepts a file upload in dev mode (public endpoint)', async () => {
      const res = await request(ctx.server())
        .put(`/v1/uploads/file/avatars/test-${Date.now()}.txt`)
        .set('Content-Type', 'text/plain')
        .send('hello');
      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('File uploaded');
    });
  });
});
