import { SlotsService } from '../src/modules/slots/slots.service';
import { E2EContext, closeE2EApp, createE2EApp, truncateAll } from './support/e2e';
import { anySport, createCourt, createTenant, createUser, createVenue } from './support/seed';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

/**
 * REAL-DATABASE end-to-end tests for the slot-configuration feature (issue #31).
 *
 * Uses the shared real-DB harness (`test/support/e2e.ts`): boots the full AppModule against
 * the dedicated test database and exercises the complete stack
 * HTTP → guards → controllers → SlotsService → Prisma → SQL. Overlap/alignment/within-hours/
 * all-or-nothing/tenant isolation are verified by real persisted state, not mock returns.
 */
describe('Slot Configuration — real DB (integration)', () => {
  let ctx: E2EContext;

  // Seeded per-test (populated in beforeEach after truncate)
  let tenantAId: string;
  let tenantBId: string;
  let courtSportAId: string; // tenant A, base 60m, 06:00–23:00, price 800/peak 1200

  let ownerA: string;
  let managerA: string;
  let ownerB: string;
  let customer: string;

  const server = () => ctx.server();
  const auth = (t: string) => ctx.auth(t);

  /** Seed a tenant + owner + venue + court + court-sport; return the ids. */
  async function seedTenant(opts: { price: string; peak: string | null }) {
    const tenant = await createTenant(ctx.prisma);
    const owner = await createUser(ctx.prisma, { tenantId: tenant.id, role: 'TURF_OWNER' });
    const venue = await createVenue(ctx.prisma, tenant.id, {
      openTime: '06:00',
      closeTime: '23:00',
    });
    const court = await createCourt(ctx.prisma, venue.id);
    const sport = await anySport(ctx.prisma);
    const courtSport = await ctx.prisma.courtSport.create({
      data: {
        courtId: court.id,
        sportId: sport.id,
        baseSlotMinutes: 60,
        pricePerSlot: opts.price,
        peakPricePerSlot: opts.peak,
      },
    });
    return { tenantId: tenant.id, ownerId: owner.id, courtSportId: courtSport.id };
  }

  beforeAll(async () => {
    ctx = await createE2EApp();
  });

  afterAll(async () => {
    await closeE2EApp(ctx);
  });

  beforeEach(async () => {
    await truncateAll(ctx.prisma);
    const a = await seedTenant({ price: '800', peak: '1200' });
    const b = await seedTenant({ price: '500', peak: null });
    tenantAId = a.tenantId;
    tenantBId = b.tenantId;
    courtSportAId = a.courtSportId;

    ownerA = ctx.sign({ sub: a.ownerId, role: 'TURF_OWNER', tenantId: tenantAId });
    managerA = ctx.sign({ sub: `${a.ownerId}-mgr`, role: 'TURF_MANAGER', tenantId: tenantAId });
    ownerB = ctx.sign({ sub: b.ownerId, role: 'TURF_OWNER', tenantId: tenantBId });
    customer = ctx.sign({ sub: 'cust', role: 'CUSTOMER', tenantId: null });
  });

  // ── Full lifecycle: create → list → update → delete ──────────────────────────
  describe('lifecycle (create → list → update → delete)', () => {
    it('creates, lists, updates, and deletes a slot config with real persistence', async () => {
      // CREATE
      const created = await request(server())
        .post(`/v1/court-sports/${courtSportAId}/slots`)
        .set(...auth(ownerA))
        .send({ dayOfWeek: 'MONDAY', startTime: '06:00', endTime: '07:00', isPeakHour: false });
      expect(created.status).toBe(201);
      const id = created.body.data.id;
      expect(id).toBeTruthy();
      // verify actually in DB
      expect(await ctx.prisma.slotConfig.findUnique({ where: { id } })).not.toBeNull();

      // LIST
      const listed = await request(server())
        .get(`/v1/court-sports/${courtSportAId}/slots`)
        .set(...auth(ownerA));
      expect(listed.status).toBe(200);
      expect(listed.body.data).toHaveLength(1);
      expect(listed.body.data[0].id).toBe(id);

      // UPDATE (toggle peak)
      const updated = await request(server())
        .patch(`/v1/slot-configs/${id}`)
        .set(...auth(ownerA))
        .send({ isPeakHour: true });
      expect(updated.status).toBe(200);
      expect(updated.body.data.isPeakHour).toBe(true);
      expect((await ctx.prisma.slotConfig.findUnique({ where: { id } }))?.isPeakHour).toBe(true);

      // DELETE (hard)
      const deleted = await request(server())
        .delete(`/v1/slot-configs/${id}`)
        .set(...auth(ownerA));
      expect(deleted.status).toBe(204);
      expect(await ctx.prisma.slotConfig.findUnique({ where: { id } })).toBeNull();
    });
  });

  // ── Bulk: valid week generated & persisted ───────────────────────────────────
  describe('bulk creation', () => {
    it('persists a valid multi-slot week (201) and rows exist in DB', async () => {
      const res = await request(server())
        .post(`/v1/court-sports/${courtSportAId}/slots/bulk`)
        .set(...auth(ownerA))
        .send({
          slots: [
            { dayOfWeek: 'MONDAY', startTime: '06:00', endTime: '07:00' },
            { dayOfWeek: 'MONDAY', startTime: '07:00', endTime: '08:00' },
            { dayOfWeek: 'TUESDAY', startTime: '06:00', endTime: '07:00' },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toHaveLength(3);
      const count = await ctx.prisma.slotConfig.count({ where: { courtSportId: courtSportAId } });
      expect(count).toBe(3);
    });

    it('all-or-nothing: an invalid slot in the batch rejects the whole batch (nothing persisted)', async () => {
      await request(server())
        .post(`/v1/court-sports/${courtSportAId}/slots/bulk`)
        .set(...auth(ownerA))
        .send({
          slots: [
            { dayOfWeek: 'MONDAY', startTime: '06:00', endTime: '07:00' }, // valid
            { dayOfWeek: 'MONDAY', startTime: '06:00', endTime: '06:45' }, // misaligned → 400
          ],
        })
        .expect(400);
      // transaction rolled back → zero rows
      const count = await ctx.prisma.slotConfig.count({ where: { courtSportId: courtSportAId } });
      expect(count).toBe(0);
    });

    it('all-or-nothing: intra-batch overlap rejects the whole batch (409, nothing persisted)', async () => {
      await request(server())
        .post(`/v1/court-sports/${courtSportAId}/slots/bulk`)
        .set(...auth(ownerA))
        .send({
          slots: [
            { dayOfWeek: 'MONDAY', startTime: '06:00', endTime: '07:00' },
            { dayOfWeek: 'MONDAY', startTime: '06:30', endTime: '07:30' }, // overlaps first
          ],
        })
        .expect(409)
        .expect((res: any) => expect(res.body.code).toBe('SLOT_OVERLAP'));
      const count = await ctx.prisma.slotConfig.count({ where: { courtSportId: courtSportAId } });
      expect(count).toBe(0);
    });
  });

  // ── Validation rejections against real state ─────────────────────────────────
  describe('validation', () => {
    it('rejects overlap with an existing persisted slot (409, SLOT_OVERLAP)', async () => {
      await request(server())
        .post(`/v1/court-sports/${courtSportAId}/slots`)
        .set(...auth(ownerA))
        .send({ dayOfWeek: 'MONDAY', startTime: '06:00', endTime: '07:00' })
        .expect(201);
      // second overlapping create must be rejected by real DB query
      await request(server())
        .post(`/v1/court-sports/${courtSportAId}/slots`)
        .set(...auth(ownerA))
        .send({ dayOfWeek: 'MONDAY', startTime: '06:30', endTime: '07:30' })
        .expect(409)
        .expect((res: any) => expect(res.body.code).toBe('SLOT_OVERLAP'));
      expect(await ctx.prisma.slotConfig.count({ where: { courtSportId: courtSportAId } })).toBe(1);
    });

    it('rejects misaligned duration (400, SLOT_NOT_ALIGNED)', async () => {
      await request(server())
        .post(`/v1/court-sports/${courtSportAId}/slots`)
        .set(...auth(ownerA))
        .send({ dayOfWeek: 'MONDAY', startTime: '06:00', endTime: '06:45' })
        .expect(400)
        .expect((res: any) => expect(res.body.code).toBe('SLOT_NOT_ALIGNED'));
    });

    it('rejects slot outside venue operating hours (400, SLOT_OUTSIDE_OPERATING_HOURS)', async () => {
      await request(server())
        .post(`/v1/court-sports/${courtSportAId}/slots`)
        .set(...auth(ownerA))
        .send({ dayOfWeek: 'MONDAY', startTime: '05:00', endTime: '06:00' })
        .expect(400)
        .expect((res: any) => expect(res.body.code).toBe('SLOT_OUTSIDE_OPERATING_HOURS'));
    });
  });

  // ── Tenant isolation (real cross-tenant rows) ────────────────────────────────
  describe('tenant isolation', () => {
    it('tenant B cannot create/list/update/delete on tenant A court-sport (404)', async () => {
      // B create on A → 404
      await request(server())
        .post(`/v1/court-sports/${courtSportAId}/slots`)
        .set(...auth(ownerB))
        .send({ dayOfWeek: 'MONDAY', startTime: '06:00', endTime: '07:00' })
        .expect(404);

      // B list A → 404
      await request(server())
        .get(`/v1/court-sports/${courtSportAId}/slots`)
        .set(...auth(ownerB))
        .expect(404);

      // Seed a real slot under A, then B tries to update/delete it → 404
      const slot = await ctx.prisma.slotConfig.create({
        data: {
          courtSportId: courtSportAId,
          dayOfWeek: 'MONDAY',
          startTime: '06:00',
          endTime: '07:00',
        },
      });
      await request(server())
        .patch(`/v1/slot-configs/${slot.id}`)
        .set(...auth(ownerB))
        .send({ isPeakHour: true })
        .expect(404);
      await request(server())
        .delete(`/v1/slot-configs/${slot.id}`)
        .set(...auth(ownerB))
        .expect(404);

      // The slot must be untouched (still exists, still off-peak).
      const after = await ctx.prisma.slotConfig.findUnique({ where: { id: slot.id } });
      expect(after).not.toBeNull();
      expect(after?.isPeakHour).toBe(false);
    });
  });

  // ── Role enforcement ─────────────────────────────────────────────────────────
  describe('role enforcement', () => {
    it('CUSTOMER cannot create (403); unauthenticated → 401', async () => {
      await request(server())
        .post(`/v1/court-sports/${courtSportAId}/slots`)
        .set(...auth(customer))
        .send({ dayOfWeek: 'MONDAY', startTime: '06:00', endTime: '07:00' })
        .expect(403);

      await request(server())
        .post(`/v1/court-sports/${courtSportAId}/slots`)
        .send({ dayOfWeek: 'MONDAY', startTime: '06:00', endTime: '07:00' })
        .expect(401);
    });

    it('MANAGER can create single but cannot bulk (bulk is owner-only, 403)', async () => {
      await request(server())
        .post(`/v1/court-sports/${courtSportAId}/slots`)
        .set(...auth(managerA))
        .send({ dayOfWeek: 'MONDAY', startTime: '06:00', endTime: '07:00' })
        .expect(201);

      await request(server())
        .post(`/v1/court-sports/${courtSportAId}/slots/bulk`)
        .set(...auth(managerA))
        .send({ slots: [{ dayOfWeek: 'TUESDAY', startTime: '06:00', endTime: '07:00' }] })
        .expect(403);
    });
  });

  // ── Availability computation (via a real controller path if exposed, else service) ──
  // Availability has no public HTTP endpoint in Sprint 4 (Sprint 5 wires it). We assert
  // the computation directly against real persisted configs + real pricing.
  describe('availability computation (real configs + pricing)', () => {
    it('returns ordered slots with correct peak/base pricing for the weekday', async () => {
      // Seed Monday config: one off-peak 06–07 (base 800), one peak 07–08 (peak 1200).
      await ctx.prisma.slotConfig.createMany({
        data: [
          {
            courtSportId: courtSportAId,
            dayOfWeek: 'MONDAY',
            startTime: '07:00',
            endTime: '08:00',
            isPeakHour: true,
          },
          {
            courtSportId: courtSportAId,
            dayOfWeek: 'MONDAY',
            startTime: '06:00',
            endTime: '07:00',
            isPeakHour: false,
          },
        ],
      });

      // 2026-09-14 is a Monday.
      const svc = ctx.app.get(SlotsService);
      const result = await svc.computeAvailability(tenantAId, courtSportAId, '2026-09-14');

      expect(result.courtSport.pricePerSlot).toBe(800);
      expect(result.slots).toHaveLength(2);
      // ordered by startTime
      expect(result.slots.map((s: any) => s.startTime)).toEqual(['06:00', '07:00']);
      expect(result.slots[0].price).toBe(800); // off-peak → base
      expect(result.slots[1].price).toBe(1200); // peak → peak price
      expect(result.slots.every((s: any) => s.status === 'AVAILABLE')).toBe(true);
    });

    it('returns an empty grid for a weekday with no configs', async () => {
      const svc = ctx.app.get(SlotsService);
      // 2026-09-15 is a Tuesday, no configs seeded → empty.
      const result = await svc.computeAvailability(tenantAId, courtSportAId, '2026-09-15');
      expect(result.slots).toHaveLength(0);
    });
  });
});
