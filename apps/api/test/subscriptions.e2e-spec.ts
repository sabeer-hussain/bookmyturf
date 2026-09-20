import { E2EContext, closeE2EApp, createE2EApp, truncateAll } from './support/e2e';
import { seedTenantWithPlan } from './support/seed';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

/**
 * REAL-DB e2e for Subscriptions (module: subscriptions).
 * Plans are seeded reference data; the current-subscription path reads a real
 * subscription→plan row.
 */
describe('Subscriptions (e2e — real DB)', () => {
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

  describe('GET /v1/plans (public)', () => {
    it('returns the seeded plans without auth', async () => {
      const res = await request(ctx.server()).get('/v1/plans');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /v1/subscriptions/current', () => {
    it('requires authentication (401)', async () => {
      const res = await request(ctx.server()).get('/v1/subscriptions/current');
      expect(res.status).toBe(401);
    });

    it('returns the current subscription for the tenant owner (real)', async () => {
      const { tenant, owner, plan } = await seedTenantWithPlan(ctx.prisma);
      const token = ctx.sign({ sub: owner.id, role: 'TURF_OWNER', tenantId: tenant.id });
      const res = await request(ctx.server())
        .get('/v1/subscriptions/current')
        .set(...ctx.auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.planId).toBe(plan.id);
      expect(res.body.data.status).toBe('ACTIVE');
    });
  });
});
