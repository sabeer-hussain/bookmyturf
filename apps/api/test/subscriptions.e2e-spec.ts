import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { SubscriptionsController } from '../src/modules/subscriptions/subscriptions.controller';
import { SubscriptionsService } from '../src/modules/subscriptions/subscriptions.service';
import { PrismaService } from '../src/prisma/prisma.service';
import appConfig from '../src/config/app.config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

describe('Subscriptions (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prisma: Record<string, any>;

  beforeAll(async () => {
    prisma = {
      plan: { findMany: jest.fn() },
      subscription: { findUnique: jest.fn() },
    };

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({}),
      ],
      controllers: [SubscriptionsController],
      providers: [
        SubscriptionsService,
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.setGlobalPrefix('v1');
    await app.init();
    jwtService = module.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/plans', () => {
    it('returns plans (public, no auth needed)', async () => {
      prisma.plan.findMany.mockResolvedValue([
        { id: 'p1', name: 'Starter', monthlyPrice: 999 },
        { id: 'p2', name: 'Pro', monthlyPrice: 2499 },
      ]);
      return request(app.getHttpServer())
        .get('/v1/plans')
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveLength(2);
          expect(res.body.data[0].name).toBe('Starter');
        });
    });
  });

  describe('GET /v1/subscriptions/current', () => {
    it('requires auth', () => {
      return request(app.getHttpServer()).get('/v1/subscriptions/current').expect(401);
    });

    it('returns subscription for authenticated user', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      prisma.subscription.findUnique.mockResolvedValue({
        id: 's1',
        tenantId: 't1',
        planId: 'p1',
        status: 'TRIAL',
        trialEndsAt: futureDate,
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        plan: { name: 'Starter', maxVenues: 3, maxCourts: 5, maxStaff: 3, features: {} },
      });

      const token = await jwtService.signAsync(
        { sub: 'u1', role: 'TURF_OWNER', tenantId: 't1' },
        { secret: 'dev-access-secret-change-in-production-32', expiresIn: '15m' },
      );

      return request(app.getHttpServer())
        .get('/v1/subscriptions/current')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.planName).toBe('Starter');
          expect(res.body.data.status).toBe('TRIAL');
          expect(res.body.data.trialDaysLeft).toBeGreaterThan(0);
          expect(res.body.data.limits).toHaveProperty('maxVenues', 3);
        });
    });
  });
});
