import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/redis/redis.service';
import { OTP_PROVIDER } from '../../src/modules/auth/otp/otp-provider.interface';
import { UPLOAD_PROVIDER } from '../../src/modules/uploads/providers/upload-provider.interface';

/**
 * Shared REAL-DATABASE e2e harness.
 *
 * Boots the full `AppModule` against a live PostgreSQL database (the dedicated
 * `bookmyturf_test` DB configured via `.env.test`, loaded by `dotenv -e .env.test`)
 * and a live Redis. The complete stack runs for real:
 * HTTP → guards → interceptors → controllers → services → Prisma → SQL, and Redis
 * for OTP storage / rate-limiting.
 *
 * Only true third-party I/O boundaries are mocked, because they cannot/should not run
 * in automated tests:
 *   - `UPLOAD_PROVIDER`  (S3)         → returns canned presigned URLs
 *   - `OTP_PROVIDER`     (SMS send)   → no-op (the OTP code itself is real in Redis;
 *                                       dev provider yields the fixed code `123456`)
 *   - Google token verification is handled by an empty `GOOGLE_CLIENT_ID` in `.env.test`
 *     (the app returns "not configured" without any external call).
 */

export const TEST_JWT_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-in-production-32';

/** Mock upload provider — records calls; returns deterministic URLs. */
export const uploadProviderMock = {
  getPresignedUrl: jest.fn(async (fileName: string, _fileType: string, folder: string) => ({
    uploadUrl: `https://test-upload.local/${folder}/${fileName}`,
    fileUrl: `https://test-cdn.local/${folder}/${fileName}`,
  })),
};

/** Mock OTP send provider — no-op (code is stored in real Redis by OtpService). */
export const otpSendMock = { sendOtp: jest.fn(async () => undefined) };

export interface E2EContext {
  app: INestApplication;
  prisma: PrismaService;
  jwt: JwtService;
  redis: RedisService;
  /** Sign a JWT access token for the given payload (sub/role/tenantId). */
  sign(payload: Record<string, unknown>): string;
  /** supertest server handle. */
  server(): ReturnType<INestApplication['getHttpServer']>;
  /** Convenience: `.set(...auth(token))` for a Bearer header. */
  auth(token: string): readonly [string, string];
}

/**
 * Boot the app once for a suite. Mirrors `main.ts` bootstrap (global validation pipe +
 * `v1` prefix). Interceptors/guards/filters come from `AppModule` (`APP_*`) — do NOT
 * re-register them here (that would double-wrap responses).
 */
export async function createE2EApp(): Promise<E2EContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(UPLOAD_PROVIDER)
    .useValue(uploadProviderMock)
    .overrideProvider(OTP_PROVIDER)
    .useValue(otpSendMock)
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.setGlobalPrefix('v1');
  await app.init();

  const prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  const redis = app.get(RedisService);

  return {
    app,
    prisma,
    jwt,
    redis,
    sign: (payload) => jwt.sign(payload, { secret: TEST_JWT_SECRET, expiresIn: '15m' }),
    server: () => app.getHttpServer(),
    auth: (token) => ['Authorization', `Bearer ${token}`] as const,
  };
}

/**
 * Tables that hold seeded *reference* data and must be preserved between tests
 * (seeded once by `prisma db seed`). Everything else is tenant/transactional data
 * and is truncated.
 */
const PRESERVED_TABLES = new Set(['plans', 'sports', '_prisma_migrations']);

/**
 * Truncate all tenant/transactional tables (everything except seeded reference data).
 * Discovers tables dynamically from the DB so new models are covered automatically.
 * `RESTART IDENTITY CASCADE` keeps it deterministic and FK-safe.
 */
export async function truncateAll(prisma: PrismaService): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const tables = rows.map((r) => r.tablename).filter((t) => !PRESERVED_TABLES.has(t));
  if (tables.length === 0) return;
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}

/** Close the app + disconnect Prisma. */
export async function closeE2EApp(ctx: E2EContext | undefined): Promise<void> {
  if (ctx?.app) await ctx.app.close();
}
