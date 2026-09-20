import { E2EContext, closeE2EApp, createE2EApp, truncateAll } from './support/e2e';
import { createTenant, createUser } from './support/seed';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

/**
 * REAL-DB e2e for Tenant Onboarding (module: tenants).
 * Boots the full app against the test database; exercises onboarding, slug checks,
 * ownership access control, and super-admin deactivation with real persistence.
 */
describe('Tenants (e2e — real DB)', () => {
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

  describe('GET /v1/tenants/slug/:slug (public)', () => {
    it('returns available=true for a free slug', async () => {
      const res = await request(ctx.server()).get('/v1/tenants/slug/brand-new-slug');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.available).toBe(true);
    });

    it('returns available=false for a taken slug', async () => {
      await createTenant(ctx.prisma, { slug: 'taken-slug' });
      const res = await request(ctx.server()).get('/v1/tenants/slug/taken-slug');
      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
    });
  });

  describe('POST /v1/tenants/onboard', () => {
    it('requires authentication (401)', async () => {
      const res = await request(ctx.server()).post('/v1/tenants/onboard').send({});
      expect(res.status).toBe(401);
    });

    it('validates required fields (400)', async () => {
      const user = await createUser(ctx.prisma, { role: 'CUSTOMER' });
      const token = ctx.sign({ sub: user.id, role: 'CUSTOMER', tenantId: null });
      const res = await request(ctx.server())
        .post('/v1/tenants/onboard')
        .set(...ctx.auth(token))
        .send({});
      expect(res.status).toBe(400);
    });

    it('creates a tenant, links the user, and starts a subscription (real persistence)', async () => {
      const user = await createUser(ctx.prisma, { role: 'CUSTOMER', tenantId: null });
      const token = ctx.sign({ sub: user.id, role: 'CUSTOMER', tenantId: null });

      const res = await request(ctx.server())
        .post('/v1/tenants/onboard')
        .set(...ctx.auth(token))
        .send({
          name: 'Acme Turf',
          slug: 'acme-turf',
          phone: '+919876543210',
          email: 'acme@turf.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe('acme-turf');

      // Verify real DB effects: tenant created, user linked, subscription started.
      const tenant = await ctx.prisma.tenant.findUnique({ where: { slug: 'acme-turf' } });
      expect(tenant).not.toBeNull();
      const linked = await ctx.prisma.user.findUnique({ where: { id: user.id } });
      expect(linked?.tenantId).toBe(tenant!.id);
      const sub = await ctx.prisma.subscription.findUnique({ where: { tenantId: tenant!.id } });
      expect(sub).not.toBeNull();
    });

    it('rejects a duplicate slug (400)', async () => {
      await createTenant(ctx.prisma, { slug: 'dup-slug' });
      const user = await createUser(ctx.prisma, { role: 'CUSTOMER', tenantId: null });
      const token = ctx.sign({ sub: user.id, role: 'CUSTOMER', tenantId: null });
      const res = await request(ctx.server())
        .post('/v1/tenants/onboard')
        .set(...ctx.auth(token))
        .send({ name: 'Dup', slug: 'dup-slug', phone: '+919876500000', email: 'dup@turf.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/tenants/:id', () => {
    it('returns the tenant for its owner', async () => {
      const tenant = await createTenant(ctx.prisma, { name: 'Owned Turf' });
      const owner = await createUser(ctx.prisma, { role: 'TURF_OWNER', tenantId: tenant.id });
      const token = ctx.sign({ sub: owner.id, role: 'TURF_OWNER', tenantId: tenant.id });
      const res = await request(ctx.server())
        .get(`/v1/tenants/${tenant.id}`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Owned Turf');
    });

    it('returns 403 for a different tenant (isolation)', async () => {
      const tenantA = await createTenant(ctx.prisma);
      const token = ctx.sign({ sub: 'other', role: 'TURF_OWNER', tenantId: 'some-other-tenant' });
      const res = await request(ctx.server())
        .get(`/v1/tenants/${tenantA.id}`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /v1/tenants/:id', () => {
    it('returns 403 for a non-admin', async () => {
      const tenant = await createTenant(ctx.prisma);
      const owner = await createUser(ctx.prisma, { role: 'TURF_OWNER', tenantId: tenant.id });
      const token = ctx.sign({ sub: owner.id, role: 'TURF_OWNER', tenantId: tenant.id });
      const res = await request(ctx.server())
        .delete(`/v1/tenants/${tenant.id}`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(403);
    });

    it('deactivates the tenant for a SUPER_ADMIN (real update)', async () => {
      const tenant = await createTenant(ctx.prisma, { isActive: true });
      const token = ctx.sign({ sub: 'admin', role: 'SUPER_ADMIN', tenantId: null });
      const res = await request(ctx.server())
        .delete(`/v1/tenants/${tenant.id}`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
      const after = await ctx.prisma.tenant.findUnique({ where: { id: tenant.id } });
      expect(after?.isActive).toBe(false);
    });
  });
});
