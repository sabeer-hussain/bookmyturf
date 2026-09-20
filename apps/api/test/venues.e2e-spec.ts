import { E2EContext, closeE2EApp, createE2EApp, truncateAll } from './support/e2e';
import { createTenant, createUser, createVenue, seedTenantWithPlan } from './support/seed';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

/**
 * REAL-DB e2e for Venue management (module: venues).
 * Plan-limit enforcement is tested for real: a subscription + plan (with a known limit)
 * is seeded, and the limit path runs against actual venue counts.
 */
describe('Venues (e2e — real DB)', () => {
  let ctx: E2EContext;

  const validVenue = {
    name: 'Downtown Turf',
    address: '12 MG Road',
    city: 'Chennai',
    state: 'TN',
    pincode: '600001',
    phone: '+919876543210',
    openTime: '06:00',
    closeTime: '23:00',
    amenities: ['parking', 'washroom'],
  };

  beforeAll(async () => {
    ctx = await createE2EApp();
  });
  afterAll(async () => {
    await closeE2EApp(ctx);
  });
  beforeEach(async () => {
    await truncateAll(ctx.prisma);
  });

  /** Seed an owner tenant with an active subscription on a plan with given limits. */
  async function ownerCtx(limits: { maxVenues?: number; maxCourts?: number } = {}) {
    const { tenant, owner } = await seedTenantWithPlan(ctx.prisma, limits);
    const token = ctx.sign({ sub: owner.id, role: 'TURF_OWNER', tenantId: tenant.id });
    return { tenant, owner, token };
  }

  describe('POST /v1/venues', () => {
    it('creates a venue with valid data (real persistence)', async () => {
      const { tenant, token } = await ownerCtx({ maxVenues: 5 });
      const res = await request(ctx.server())
        .post('/v1/venues')
        .set(...ctx.auth(token))
        .send(validVenue);
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Downtown Turf');
      const count = await ctx.prisma.venue.count({ where: { tenantId: tenant.id } });
      expect(count).toBe(1);
    });

    it('rejects empty body (400)', async () => {
      const { token } = await ownerCtx();
      const res = await request(ctx.server())
        .post('/v1/venues')
        .set(...ctx.auth(token))
        .send({});
      expect(res.status).toBe(400);
    });

    it('rejects invalid pincode (400)', async () => {
      const { token } = await ownerCtx();
      const res = await request(ctx.server())
        .post('/v1/venues')
        .set(...ctx.auth(token))
        .send({ ...validVenue, pincode: 'abc' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid time format (400)', async () => {
      const { token } = await ownerCtx();
      const res = await request(ctx.server())
        .post('/v1/venues')
        .set(...ctx.auth(token))
        .send({ ...validVenue, openTime: '6am' });
      expect(res.status).toBe(400);
    });

    it('rejects unknown fields — mass-assignment prevention (400)', async () => {
      const { token } = await ownerCtx();
      const res = await request(ctx.server())
        .post('/v1/venues')
        .set(...ctx.auth(token))
        .send({ ...validVenue, hacker: true });
      expect(res.status).toBe(400);
    });

    it('rejects invalid amenity values (400)', async () => {
      const { token } = await ownerCtx();
      const res = await request(ctx.server())
        .post('/v1/venues')
        .set(...ctx.auth(token))
        .send({ ...validVenue, amenities: ['not_a_real_amenity'] });
      expect(res.status).toBe(400);
    });
  });

  describe('Venue limit enforcement (real subscription/plan)', () => {
    it('rejects creating beyond the plan limit (403 VENUE_LIMIT_REACHED)', async () => {
      // Plan allows exactly 1 venue.
      const { tenant, token } = await ownerCtx({ maxVenues: 1 });
      await createVenue(ctx.prisma, tenant.id); // fill the single slot
      const res = await request(ctx.server())
        .post('/v1/venues')
        .set(...ctx.auth(token))
        .send(validVenue);
      expect(res.status).toBe(403);
      expect(res.body.code ?? res.body.error?.code).toBe('VENUE_LIMIT_REACHED');
      expect(await ctx.prisma.venue.count({ where: { tenantId: tenant.id } })).toBe(1);
    });

    it('rejects when the tenant has no active subscription (403/404)', async () => {
      // Tenant + owner but NO subscription.
      const tenant = await createTenant(ctx.prisma);
      const owner = await createUser(ctx.prisma, { tenantId: tenant.id, role: 'TURF_OWNER' });
      const token = ctx.sign({ sub: owner.id, role: 'TURF_OWNER', tenantId: tenant.id });
      const res = await request(ctx.server())
        .post('/v1/venues')
        .set(...ctx.auth(token))
        .send(validVenue);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('GET /v1/venues', () => {
    it('returns paginated venues with meta', async () => {
      const { tenant, token } = await ownerCtx();
      await createVenue(ctx.prisma, tenant.id);
      await createVenue(ctx.prisma, tenant.id);
      const res = await request(ctx.server())
        .get('/v1/venues')
        .set(...ctx.auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBe(2);
    });

    it('allows TURF_MANAGER to list', async () => {
      const { tenant } = await ownerCtx();
      const mgr = await createUser(ctx.prisma, { tenantId: tenant.id, role: 'TURF_MANAGER' });
      const token = ctx.sign({ sub: mgr.id, role: 'TURF_MANAGER', tenantId: tenant.id });
      const res = await request(ctx.server())
        .get('/v1/venues')
        .set(...ctx.auth(token));
      expect(res.status).toBe(200);
    });
  });

  describe('GET /v1/venues/:id', () => {
    it('returns a venue with courts count', async () => {
      const { tenant, token } = await ownerCtx();
      const venue = await createVenue(ctx.prisma, tenant.id);
      const res = await request(ctx.server())
        .get(`/v1/venues/${venue.id}`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(venue.id);
      expect(res.body.data._count.courts).toBe(0);
    });

    it('returns 404 for a non-existent venue', async () => {
      const { token } = await ownerCtx();
      const res = await request(ctx.server())
        .get('/v1/venues/nope')
        .set(...ctx.auth(token));
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /v1/venues/:id', () => {
    it('updates a venue (real)', async () => {
      const { tenant, token } = await ownerCtx();
      const venue = await createVenue(ctx.prisma, tenant.id);
      const res = await request(ctx.server())
        .patch(`/v1/venues/${venue.id}`)
        .set(...ctx.auth(token))
        .send({ name: 'Renamed Turf' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed Turf');
      expect((await ctx.prisma.venue.findUnique({ where: { id: venue.id } }))?.name).toBe(
        'Renamed Turf',
      );
    });
  });

  describe('DELETE /v1/venues/:id', () => {
    it('soft-deactivates a venue', async () => {
      const { tenant, token } = await ownerCtx();
      const venue = await createVenue(ctx.prisma, tenant.id);
      const res = await request(ctx.server())
        .delete(`/v1/venues/${venue.id}`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(200);
      expect((await ctx.prisma.venue.findUnique({ where: { id: venue.id } }))?.isActive).toBe(
        false,
      );
    });
  });

  describe('Tenant isolation', () => {
    it('tenant B cannot fetch tenant A venue (404)', async () => {
      const a = await ownerCtx();
      const venueA = await createVenue(ctx.prisma, a.tenant.id);
      const b = await ownerCtx();
      const res = await request(ctx.server())
        .get(`/v1/venues/${venueA.id}`)
        .set(...ctx.auth(b.token));
      expect(res.status).toBe(404);
    });
  });

  describe('Role-based access', () => {
    it('CUSTOMER cannot create (403)', async () => {
      const token = ctx.sign({ sub: 'c', role: 'CUSTOMER', tenantId: null });
      const res = await request(ctx.server())
        .post('/v1/venues')
        .set(...ctx.auth(token))
        .send(validVenue);
      expect(res.status).toBe(403);
    });

    it('CUSTOMER cannot list venues (403)', async () => {
      const token = ctx.sign({ sub: 'c', role: 'CUSTOMER', tenantId: null });
      const res = await request(ctx.server())
        .get('/v1/venues')
        .set(...ctx.auth(token));
      expect(res.status).toBe(403);
    });

    it('unauthenticated returns 401', async () => {
      const res = await request(ctx.server()).post('/v1/venues').send(validVenue);
      expect(res.status).toBe(401);
    });

    it('TURF_MANAGER cannot create (403, owner-only)', async () => {
      const { tenant } = await ownerCtx();
      const mgr = await createUser(ctx.prisma, { tenantId: tenant.id, role: 'TURF_MANAGER' });
      const token = ctx.sign({ sub: mgr.id, role: 'TURF_MANAGER', tenantId: tenant.id });
      const res = await request(ctx.server())
        .post('/v1/venues')
        .set(...ctx.auth(token))
        .send(validVenue);
      expect(res.status).toBe(403);
    });

    it('TURF_MANAGER cannot delete a venue (403, owner-only)', async () => {
      const { tenant } = await ownerCtx();
      const venue = await createVenue(ctx.prisma, tenant.id);
      const mgr = await createUser(ctx.prisma, { tenantId: tenant.id, role: 'TURF_MANAGER' });
      const token = ctx.sign({ sub: mgr.id, role: 'TURF_MANAGER', tenantId: tenant.id });
      const res = await request(ctx.server())
        .delete(`/v1/venues/${venue.id}`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(403);
    });
  });
});
