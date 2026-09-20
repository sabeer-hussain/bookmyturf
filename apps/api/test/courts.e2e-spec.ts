import { E2EContext, closeE2EApp, createE2EApp, truncateAll } from './support/e2e';
import {
  anySport,
  createCourt,
  createTenant,
  createUser,
  createVenue,
  seedTenantWithPlan,
} from './support/seed';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

/**
 * REAL-DB e2e for Courts, Court-Sports & Sports (module: courts + sports).
 * Court-limit enforcement uses a real subscription/plan; court-sport uniqueness is
 * enforced by the real DB unique constraint.
 */
describe('Courts & Sports (e2e — real DB)', () => {
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

  /** Owner tenant + active subscription + a venue; returns ids + token + a sport. */
  async function ownerVenue(limits: { maxCourts?: number } = {}) {
    const { tenant, owner } = await seedTenantWithPlan(ctx.prisma, limits);
    const venue = await createVenue(ctx.prisma, tenant.id);
    const sport = await anySport(ctx.prisma);
    const token = ctx.sign({ sub: owner.id, role: 'TURF_OWNER', tenantId: tenant.id });
    return { tenant, owner, venue, sport, token };
  }

  describe('POST /v1/venues/:venueId/courts', () => {
    it('creates a court (real persistence)', async () => {
      const { venue, token } = await ownerVenue({ maxCourts: 5 });
      const res = await request(ctx.server())
        .post(`/v1/venues/${venue.id}/courts`)
        .set(...ctx.auth(token))
        .send({ name: 'Court 1', isIndoor: true, surfaceType: 'artificial_turf' });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Court 1');
      expect(await ctx.prisma.court.count({ where: { venueId: venue.id } })).toBe(1);
    });

    it('rejects invalid surface type (400)', async () => {
      const { venue, token } = await ownerVenue();
      const res = await request(ctx.server())
        .post(`/v1/venues/${venue.id}/courts`)
        .set(...ctx.auth(token))
        .send({ name: 'Court', surfaceType: 'lava' });
      expect(res.status).toBe(400);
    });

    it('rejects when venue belongs to another tenant (404)', async () => {
      const a = await ownerVenue();
      const b = await ownerVenue();
      const res = await request(ctx.server())
        .post(`/v1/venues/${a.venue.id}/courts`)
        .set(...ctx.auth(b.token))
        .send({ name: 'X' });
      expect(res.status).toBe(404);
    });
  });

  describe('Court limit enforcement (real subscription/plan)', () => {
    it('rejects when court limit reached across venues (403 COURT_LIMIT_REACHED)', async () => {
      const { tenant, venue, token } = await ownerVenue({ maxCourts: 1 });
      await createCourt(ctx.prisma, venue.id); // fill the single slot
      const res = await request(ctx.server())
        .post(`/v1/venues/${venue.id}/courts`)
        .set(...ctx.auth(token))
        .send({ name: 'Court 2' });
      expect(res.status).toBe(403);
      expect(res.body.code ?? res.body.error?.code).toBe('COURT_LIMIT_REACHED');
      expect(await ctx.prisma.court.count({ where: { venue: { tenantId: tenant.id } } })).toBe(1);
    });

    it('rejects creating a court when the tenant has no active subscription (403/404)', async () => {
      // Tenant + owner + venue but NO subscription.
      const tenant = await createTenant(ctx.prisma);
      const owner = await createUser(ctx.prisma, { tenantId: tenant.id, role: 'TURF_OWNER' });
      const venue = await createVenue(ctx.prisma, tenant.id);
      const token = ctx.sign({ sub: owner.id, role: 'TURF_OWNER', tenantId: tenant.id });
      const res = await request(ctx.server())
        .post(`/v1/venues/${venue.id}/courts`)
        .set(...ctx.auth(token))
        .send({ name: 'Court' });
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('GET courts', () => {
    it('lists courts for a venue with courtSports count', async () => {
      const { venue, token } = await ownerVenue();
      await createCourt(ctx.prisma, venue.id);
      const res = await request(ctx.server())
        .get(`/v1/venues/${venue.id}/courts`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]._count.courtSports).toBe(0);
    });

    it('GET /courts/:id returns court with courtSports', async () => {
      const { venue, token } = await ownerVenue();
      const court = await createCourt(ctx.prisma, venue.id);
      const res = await request(ctx.server())
        .get(`/v1/courts/${court.id}`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(court.id);
    });

    it('GET /courts/:id → 404 for non-existent', async () => {
      const { token } = await ownerVenue();
      const res = await request(ctx.server())
        .get('/v1/courts/nope')
        .set(...ctx.auth(token));
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH/DELETE court', () => {
    it('updates a court', async () => {
      const { venue, token } = await ownerVenue();
      const court = await createCourt(ctx.prisma, venue.id);
      const res = await request(ctx.server())
        .patch(`/v1/courts/${court.id}`)
        .set(...ctx.auth(token))
        .send({ name: 'Renamed' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Renamed');
    });

    it('soft-deletes a court', async () => {
      const { venue, token } = await ownerVenue();
      const court = await createCourt(ctx.prisma, venue.id);
      const res = await request(ctx.server())
        .delete(`/v1/courts/${court.id}`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(200);
      expect((await ctx.prisma.court.findUnique({ where: { id: court.id } }))?.isActive).toBe(
        false,
      );
    });
  });

  describe('POST /v1/courts/:courtId/sports (court-sport config)', () => {
    it('adds a sport to a court', async () => {
      const { venue, sport, token } = await ownerVenue();
      const court = await createCourt(ctx.prisma, venue.id);
      const res = await request(ctx.server())
        .post(`/v1/courts/${court.id}/sports`)
        .set(...ctx.auth(token))
        .send({ sportId: sport.id, pricePerSlot: 800, baseSlotMinutes: 60 });
      expect(res.status).toBe(201);
      expect(await ctx.prisma.courtSport.count({ where: { courtId: court.id } })).toBe(1);
    });

    it('rejects duplicate court-sport (409, real unique constraint)', async () => {
      const { venue, sport, token } = await ownerVenue();
      const court = await createCourt(ctx.prisma, venue.id);
      await ctx.prisma.courtSport.create({
        data: { courtId: court.id, sportId: sport.id, pricePerSlot: '800' },
      });
      const res = await request(ctx.server())
        .post(`/v1/courts/${court.id}/sports`)
        .set(...ctx.auth(token))
        .send({ sportId: sport.id, pricePerSlot: 900 });
      expect(res.status).toBe(409);
    });

    it('rejects when sport not found (404)', async () => {
      const { venue, token } = await ownerVenue();
      const court = await createCourt(ctx.prisma, venue.id);
      const res = await request(ctx.server())
        .post(`/v1/courts/${court.id}/sports`)
        .set(...ctx.auth(token))
        .send({ sportId: 'no-such-sport', pricePerSlot: 800 });
      expect(res.status).toBe(404);
    });

    it('rejects missing pricePerSlot (400)', async () => {
      const { venue, sport, token } = await ownerVenue();
      const court = await createCourt(ctx.prisma, venue.id);
      const res = await request(ctx.server())
        .post(`/v1/courts/${court.id}/sports`)
        .set(...ctx.auth(token))
        .send({ sportId: sport.id });
      expect(res.status).toBe(400);
    });

    it('rejects zero price (400)', async () => {
      const { venue, sport, token } = await ownerVenue();
      const court = await createCourt(ctx.prisma, venue.id);
      const res = await request(ctx.server())
        .post(`/v1/courts/${court.id}/sports`)
        .set(...ctx.auth(token))
        .send({ sportId: sport.id, pricePerSlot: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe('court-sport list / update / delete', () => {
    async function withCourtSport() {
      const o = await ownerVenue();
      const court = await createCourt(ctx.prisma, o.venue.id);
      const cs = await ctx.prisma.courtSport.create({
        data: { courtId: court.id, sportId: o.sport.id, pricePerSlot: '800' },
      });
      return { ...o, court, cs };
    }

    it('lists sports for a court', async () => {
      const { court, token } = await withCourtSport();
      const res = await request(ctx.server())
        .get(`/v1/courts/${court.id}/sports`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('updates a court-sport config', async () => {
      const { cs, token } = await withCourtSport();
      const res = await request(ctx.server())
        .patch(`/v1/court-sports/${cs.id}`)
        .set(...ctx.auth(token))
        .send({ pricePerSlot: 1000 });
      expect(res.status).toBe(200);
      expect(Number(res.body.data.pricePerSlot)).toBe(1000);
    });

    it('removes a court-sport (204)', async () => {
      const { cs, token } = await withCourtSport();
      const res = await request(ctx.server())
        .delete(`/v1/court-sports/${cs.id}`)
        .set(...ctx.auth(token));
      expect(res.status).toBe(204);
      expect(await ctx.prisma.courtSport.findUnique({ where: { id: cs.id } })).toBeNull();
    });

    it('returns 404 removing non-existent court-sport', async () => {
      const { token } = await ownerVenue();
      const res = await request(ctx.server())
        .delete('/v1/court-sports/nope')
        .set(...ctx.auth(token));
      expect(res.status).toBe(404);
    });
  });

  describe('Tenant isolation', () => {
    it('tenant B cannot fetch tenant A court (404)', async () => {
      const a = await ownerVenue();
      const courtA = await createCourt(ctx.prisma, a.venue.id);
      const b = await ownerVenue();
      const res = await request(ctx.server())
        .get(`/v1/courts/${courtA.id}`)
        .set(...ctx.auth(b.token));
      expect(res.status).toBe(404);
    });

    it('tenant B cannot add a sport to tenant A court (404)', async () => {
      const a = await ownerVenue();
      const courtA = await createCourt(ctx.prisma, a.venue.id);
      const b = await ownerVenue();
      const res = await request(ctx.server())
        .post(`/v1/courts/${courtA.id}/sports`)
        .set(...ctx.auth(b.token))
        .send({ sportId: b.sport.id, pricePerSlot: 800 });
      expect(res.status).toBe(404);
    });
  });

  describe('Sports master data', () => {
    it('GET /v1/sports is public', async () => {
      const res = await request(ctx.server()).get('/v1/sports');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('SUPER_ADMIN can create a sport', async () => {
      const token = ctx.sign({ sub: 'admin', role: 'SUPER_ADMIN', tenantId: null });
      const res = await request(ctx.server())
        .post('/v1/sports')
        .set(...ctx.auth(token))
        .send({ name: `Kabaddi-${Date.now()}` });
      expect(res.status).toBe(201);
    });

    it('TURF_OWNER cannot create a sport (403)', async () => {
      const token = ctx.sign({ sub: 'o', role: 'TURF_OWNER', tenantId: 't' });
      const res = await request(ctx.server())
        .post('/v1/sports')
        .set(...ctx.auth(token))
        .send({ name: 'Nope' });
      expect(res.status).toBe(403);
    });
  });

  describe('Role-based access', () => {
    it('CUSTOMER cannot create a court (403)', async () => {
      const { venue } = await ownerVenue();
      const token = ctx.sign({ sub: 'c', role: 'CUSTOMER', tenantId: null });
      const res = await request(ctx.server())
        .post(`/v1/venues/${venue.id}/courts`)
        .set(...ctx.auth(token))
        .send({ name: 'X' });
      expect(res.status).toBe(403);
    });

    it('unauthenticated cannot access courts (401)', async () => {
      const res = await request(ctx.server()).get('/v1/courts/anything');
      expect(res.status).toBe(401);
    });
  });
});
