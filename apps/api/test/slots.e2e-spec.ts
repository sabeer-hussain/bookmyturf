import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SlotsService } from '../src/modules/slots/slots.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

const JWT_SECRET = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-in-production-32';

/**
 * REAL-DATABASE end-to-end tests for the slot-configuration feature (issue #31).
 *
 * This suite boots the full AppModule against a live PostgreSQL database (Docker locally,
 * a `postgres:16` service container in CI) and exercises the complete stack:
 * HTTP → guards → controllers → SlotsService → Prisma → SQL.
 * Overlap/alignment/within-hours/all-or-nothing/tenant isolation are verified by real
 * persisted state, not mock returns.
 *
 * Data is fully isolated: everything is created under a unique run-scoped tenant slug
 * prefix in `beforeAll` and torn down in `afterAll`, so the suite is repeatable and does
 * not collide with dev/seed data.
 */
describe('Slot Configuration — real DB (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const runId = `slots-it-${Date.now()}`;

  // Seeded entity ids (populated in beforeAll)
  let tenantAId: string;
  let tenantBId: string;
  let courtSportAId: string; // tenant A, base 60m, 06:00–23:00, price 800/peak 1200
  let courtSportBId: string; // tenant B (for isolation checks)

  // Tokens
  let ownerA: string;
  let managerA: string;
  let ownerB: string;
  let customer: string;

  const sign = (payload: Record<string, unknown>) =>
    jwt.sign(payload, { secret: JWT_SECRET, expiresIn: '15m' });

  const server = () => app.getHttpServer();
  const auth = (t: string) => ['Authorization', `Bearer ${t}`] as const;

  async function seedTenant(slugSuffix: string, opts: { price: string; peak: string | null }) {
    const tenant = await prisma.tenant.create({
      data: {
        name: `${runId}-${slugSuffix}`,
        slug: `${runId}-${slugSuffix}`,
        email: `${slugSuffix}@example.com`,
        phone: '9990000000',
      },
    });
    const owner = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        firstName: `Owner-${slugSuffix}`,
        email: `owner-${slugSuffix}-${runId}@example.com`,
        role: 'TURF_OWNER',
      },
    });
    const venue = await prisma.venue.create({
      data: {
        tenantId: tenant.id,
        name: `Venue ${slugSuffix}`,
        address: '1 Test Rd',
        city: 'Chennai',
        state: 'TN',
        pincode: '600001',
        openTime: '06:00',
        closeTime: '23:00',
      },
    });
    const court = await prisma.court.create({
      data: { venueId: venue.id, name: `Court ${slugSuffix}` },
    });
    // Sport is shared/global; upsert one for the test run.
    const sport = await prisma.sport.upsert({
      where: { name: `${runId}-Football` },
      update: {},
      create: { name: `${runId}-Football` },
    });
    const courtSport = await prisma.courtSport.create({
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
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    // Mirror main.ts bootstrap so behavior matches production exactly.
    // NOTE: TransformInterceptor + LoggingInterceptor are registered globally in AppModule
    // via APP_INTERCEPTOR, so we must NOT add them again here (that would double-wrap responses).
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('v1');
    await app.init();

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    const a = await seedTenant('a', { price: '800', peak: '1200' });
    const b = await seedTenant('b', { price: '500', peak: null });
    tenantAId = a.tenantId;
    tenantBId = b.tenantId;
    courtSportAId = a.courtSportId;
    courtSportBId = b.courtSportId;

    ownerA = sign({ sub: a.ownerId, role: 'TURF_OWNER', tenantId: tenantAId });
    managerA = sign({ sub: `${a.ownerId}-mgr`, role: 'TURF_MANAGER', tenantId: tenantAId });
    ownerB = sign({ sub: b.ownerId, role: 'TURF_OWNER', tenantId: tenantBId });
    customer = sign({ sub: 'cust', role: 'CUSTOMER', tenantId: null });
  });

  afterAll(async () => {
    // Tear down everything created for this run (FK cascade from tenant handles children;
    // sport is global so delete explicitly).
    if (prisma) {
      await prisma.tenant.deleteMany({ where: { slug: { startsWith: runId } } });
      await prisma.sport.deleteMany({ where: { name: { startsWith: runId } } });
    }
    if (app) await app.close();
  });

  // Clear slot rows for court-sport A between tests so each starts from a known state.
  beforeEach(async () => {
    await prisma.slotConfig.deleteMany({ where: { courtSportId: courtSportAId } });
    await prisma.slotConfig.deleteMany({ where: { courtSportId: courtSportBId } });
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
      expect(await prisma.slotConfig.findUnique({ where: { id } })).not.toBeNull();

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
      expect((await prisma.slotConfig.findUnique({ where: { id } }))?.isPeakHour).toBe(true);

      // DELETE (hard)
      const deleted = await request(server())
        .delete(`/v1/slot-configs/${id}`)
        .set(...auth(ownerA));
      expect(deleted.status).toBe(204);
      expect(await prisma.slotConfig.findUnique({ where: { id } })).toBeNull();
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
      const count = await prisma.slotConfig.count({ where: { courtSportId: courtSportAId } });
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
      const count = await prisma.slotConfig.count({ where: { courtSportId: courtSportAId } });
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
      const count = await prisma.slotConfig.count({ where: { courtSportId: courtSportAId } });
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
      expect(await prisma.slotConfig.count({ where: { courtSportId: courtSportAId } })).toBe(1);
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
      const slot = await prisma.slotConfig.create({
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
      const after = await prisma.slotConfig.findUnique({ where: { id: slot.id } });
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
      await prisma.slotConfig.createMany({
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
      const svc = app.get(SlotsService);
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
      const svc = app.get(SlotsService);
      // 2026-09-15 is a Tuesday, no configs seeded → empty.
      const result = await svc.computeAvailability(tenantAId, courtSportAId, '2026-09-15');
      expect(result.slots).toHaveLength(0);
    });
  });
});
