import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Seed factories for real-DB e2e specs. Each returns the created row so tests can
 * reference real ids. All data is created in the dedicated test DB and cleared by
 * `truncateAll` between suites/tests.
 *
 * Uniqueness: each factory derives unique `slug`/`email`/`phone` values from an
 * internal monotonic counter (`uniq()`), so repeated calls within a suite never clash
 * on unique constraints — even when several rows are created in the same millisecond.
 */

let seq = 0;
const uniq = () => `${Date.now()}-${seq++}`;

export async function createTenant(
  prisma: PrismaService,
  overrides: Partial<{
    name: string;
    slug: string;
    email: string;
    phone: string;
    isActive: boolean;
  }> = {},
) {
  const u = uniq();
  return prisma.tenant.create({
    data: {
      name: overrides.name ?? `Tenant ${u}`,
      slug: overrides.slug ?? `tenant-${u}`,
      email: overrides.email ?? `tenant-${u}@example.com`,
      phone: overrides.phone ?? `9${u.replace(/\D/g, '').slice(-9).padStart(9, '0')}`,
      isActive: overrides.isActive ?? true,
      onboardingComplete: true,
    },
  });
}

export async function createUser(
  prisma: PrismaService,
  overrides: Partial<{
    tenantId: string | null;
    firstName: string;
    email: string;
    phone: string;
    role: 'SUPER_ADMIN' | 'TURF_OWNER' | 'TURF_MANAGER' | 'TURF_STAFF' | 'CUSTOMER';
  }> = {},
) {
  const u = uniq();
  return prisma.user.create({
    data: {
      tenantId: overrides.tenantId ?? null,
      firstName: overrides.firstName ?? `User ${u}`,
      email: overrides.email ?? `user-${u}@example.com`,
      phone: overrides.phone ?? `+91${u.replace(/\D/g, '').slice(-10).padStart(10, '9')}`,
      role: overrides.role ?? 'CUSTOMER',
    },
  });
}

/** Create a Plan with the given limits (defaults are generous). */
export async function createPlan(
  prisma: PrismaService,
  limits: Partial<{ maxVenues: number; maxCourts: number; maxStaff: number; name: string }> = {},
) {
  const u = uniq();
  return prisma.plan.create({
    data: {
      name: limits.name ?? `Plan ${u}`,
      monthlyPrice: '999',
      annualPrice: '9990',
      commissionRate: '5',
      maxVenues: limits.maxVenues ?? 10,
      maxCourts: limits.maxCourts ?? 50,
      maxStaff: limits.maxStaff ?? 20,
      features: {},
    },
  });
}

/** Attach an ACTIVE subscription (tenant → plan) so plan-limit enforcement runs for real. */
export async function createSubscription(
  prisma: PrismaService,
  tenantId: string,
  planId: string,
  status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' = 'ACTIVE',
) {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
  return prisma.subscription.create({
    data: {
      tenantId,
      planId,
      status,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: status === 'TRIAL' ? periodEnd : null,
    },
  });
}

/**
 * Convenience: a tenant with an owner + an active subscription on a plan with the
 * given limits. Returns the ids + tokens-ready owner.
 */
export async function seedTenantWithPlan(
  prisma: PrismaService,
  limits: Partial<{ maxVenues: number; maxCourts: number; maxStaff: number }> = {},
) {
  const tenant = await createTenant(prisma);
  const owner = await createUser(prisma, { tenantId: tenant.id, role: 'TURF_OWNER' });
  const plan = await createPlan(prisma, limits);
  await createSubscription(prisma, tenant.id, plan.id);
  return { tenant, owner, plan };
}

export async function createVenue(
  prisma: PrismaService,
  tenantId: string,
  overrides: Partial<{ name: string; openTime: string; closeTime: string; isActive: boolean }> = {},
) {
  const u = uniq();
  return prisma.venue.create({
    data: {
      tenantId,
      name: overrides.name ?? `Venue ${u}`,
      address: '1 Test Rd',
      city: 'Chennai',
      state: 'TN',
      pincode: '600001',
      openTime: overrides.openTime ?? '06:00',
      closeTime: overrides.closeTime ?? '23:00',
      isActive: overrides.isActive ?? true,
    },
  });
}

export async function createCourt(
  prisma: PrismaService,
  venueId: string,
  overrides: Partial<{ name: string; isActive: boolean }> = {},
) {
  const u = uniq();
  return prisma.court.create({
    data: { venueId, name: overrides.name ?? `Court ${u}`, isActive: overrides.isActive ?? true },
  });
}

/** Get a seeded sport (from `db seed`) or create one. */
export async function anySport(prisma: PrismaService) {
  const existing = await prisma.sport.findFirst();
  if (existing) return existing;
  const u = uniq();
  return prisma.sport.create({ data: { name: `Sport ${u}` } });
}
