import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { VenuesController } from '../src/modules/venues/venues.controller';
import { VenuesService } from '../src/modules/venues/venues.service';
import { SubscriptionsService } from '../src/modules/subscriptions/subscriptions.service';
import { PrismaService } from '../src/prisma/prisma.service';
import appConfig from '../src/config/app.config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

describe('Venues (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prisma: Record<string, any>;
  let subscriptionsService: Record<string, any>;

  const ownerToken = () =>
    jwtService.signAsync(
      { sub: 'u1', role: 'TURF_OWNER', tenantId: 't1' },
      { secret: 'dev-access-secret-change-in-production-32', expiresIn: '15m' },
    );

  const otherOwnerToken = () =>
    jwtService.signAsync(
      { sub: 'u2', role: 'TURF_OWNER', tenantId: 't2' },
      { secret: 'dev-access-secret-change-in-production-32', expiresIn: '15m' },
    );

  const customerToken = () =>
    jwtService.signAsync(
      { sub: 'u3', role: 'CUSTOMER', tenantId: null },
      { secret: 'dev-access-secret-change-in-production-32', expiresIn: '15m' },
    );

  const managerToken = () =>
    jwtService.signAsync(
      { sub: 'u4', role: 'TURF_MANAGER', tenantId: 't1' },
      { secret: 'dev-access-secret-change-in-production-32', expiresIn: '15m' },
    );

  const mockSubscription = {
    id: 'sub-1',
    status: 'TRIAL',
    planName: 'Starter',
    planId: 'plan-starter',
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    trialDaysLeft: 14,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    limits: { maxVenues: 3, maxCourts: 5, maxStaff: 3 },
    features: {},
  };

  const mockVenue = {
    id: 'v1',
    tenantId: 't1',
    name: 'SportArena Main',
    address: 'Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400058',
    openTime: '06:00',
    closeTime: '23:00',
    phone: '+919876543210',
    latitude: 19.1136,
    longitude: 72.8697,
    amenities: ['parking', 'floodlights'],
    images: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { courts: 2 },
  };

  beforeAll(async () => {
    prisma = {
      venue: {
        create: jest.fn().mockResolvedValue(mockVenue),
        findMany: jest.fn().mockResolvedValue([mockVenue]),
        findFirst: jest.fn().mockResolvedValue(mockVenue),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue(mockVenue),
      },
    };

    subscriptionsService = {
      getCurrentSubscription: jest.fn().mockResolvedValue(mockSubscription),
    };

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({}),
      ],
      controllers: [VenuesController],
      providers: [
        VenuesService,
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionsService, useValue: subscriptionsService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.setGlobalPrefix('v1');
    await app.init();

    jwtService = module.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── VENUE LIFECYCLE ───────────────────────────────────

  describe('POST /v1/venues', () => {
    it('creates venue with valid data', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/venues')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'SportArena Main',
          address: 'Andheri West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400058',
          openTime: '06:00',
          closeTime: '23:00',
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('SportArena Main');
        });
    });

    it('rejects empty body with validation errors', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/venues')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('rejects invalid pincode format', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/venues')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          address: 'Test',
          city: 'Mumbai',
          state: 'MH',
          pincode: '40005',
          openTime: '06:00',
          closeTime: '23:00',
        })
        .expect(400)
        .expect((res: any) => {
          expect(res.body.message).toContain('Pincode must be a 6-digit number');
        });
    });

    it('rejects invalid time format', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/venues')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          address: 'Test',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400058',
          openTime: '25:00',
          closeTime: '6pm',
        })
        .expect(400);
    });

    it('rejects invalid amenity values', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/venues')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          address: 'Test',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400058',
          openTime: '06:00',
          closeTime: '23:00',
          amenities: ['swimming_pool'],
        })
        .expect(400);
    });

    it('rejects unknown fields (mass assignment prevention)', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/venues')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          address: 'Test',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400058',
          openTime: '06:00',
          closeTime: '23:00',
          tenantId: 'hacked',
          isActive: false,
        })
        .expect(400);
    });
  });

  // ─── VENUE LIMIT ENFORCEMENT ───────────────────────────

  describe('Venue Limit Enforcement', () => {
    it('rejects when venue limit reached (403)', async () => {
      prisma.venue.count.mockResolvedValueOnce(3); // At limit
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/venues')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Over Limit',
          address: 'Test',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400058',
          openTime: '06:00',
          closeTime: '23:00',
        })
        .expect(403);
    });

    it('rejects when subscription inactive (403)', async () => {
      subscriptionsService.getCurrentSubscription.mockResolvedValueOnce({
        ...mockSubscription,
        status: 'EXPIRED',
      });
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/venues')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          address: 'Test',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400058',
          openTime: '06:00',
          closeTime: '23:00',
        })
        .expect(403);
    });
  });

  // ─── VENUE LIST & GET ──────────────────────────────────

  describe('GET /v1/venues', () => {
    it('returns paginated venues with meta', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .get('/v1/venues')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.meta).toBeDefined();
          expect(res.body.meta.page).toBe(1);
        });
    });

    it('allows TURF_MANAGER access', async () => {
      const token = await managerToken();
      return request(app.getHttpServer())
        .get('/v1/venues')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('GET /v1/venues/:id', () => {
    it('returns venue with courts count', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .get('/v1/venues/v1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('SportArena Main');
        });
    });

    it('returns 404 for non-existent venue', async () => {
      prisma.venue.findFirst.mockResolvedValueOnce(null);
      const token = await ownerToken();
      return request(app.getHttpServer())
        .get('/v1/venues/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ─── VENUE UPDATE & DEACTIVATE ─────────────────────────

  describe('PATCH /v1/venues/:id', () => {
    it('updates venue successfully', async () => {
      prisma.venue.update.mockResolvedValueOnce({ ...mockVenue, name: 'Updated' });
      const token = await ownerToken();
      return request(app.getHttpServer())
        .patch('/v1/venues/v1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.name).toBe('Updated');
        });
    });
  });

  describe('DELETE /v1/venues/:id', () => {
    it('deactivates venue (soft delete)', async () => {
      prisma.venue.update.mockResolvedValueOnce({ ...mockVenue, isActive: false });
      const token = await ownerToken();
      return request(app.getHttpServer())
        .delete('/v1/venues/v1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.isActive).toBe(false);
        });
    });
  });

  // ─── TENANT ISOLATION ──────────────────────────────────

  describe('Tenant Isolation', () => {
    it('tenant B cannot see tenant A venues', async () => {
      prisma.venue.findFirst.mockResolvedValueOnce(null); // tenantId filter excludes
      const token = await otherOwnerToken();
      return request(app.getHttpServer())
        .get('/v1/venues/v1')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ─── ROLE-BASED ACCESS ─────────────────────────────────

  describe('Role-Based Access', () => {
    it('CUSTOMER cannot create venue (403)', async () => {
      const token = await customerToken();
      return request(app.getHttpServer())
        .post('/v1/venues')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          address: 'Test',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400058',
          openTime: '06:00',
          closeTime: '23:00',
        })
        .expect(403);
    });

    it('CUSTOMER cannot list venues (403)', async () => {
      const token = await customerToken();
      return request(app.getHttpServer())
        .get('/v1/venues')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('unauthenticated request returns 401', () => {
      return request(app.getHttpServer()).get('/v1/venues').expect(401);
    });

    it('TURF_MANAGER cannot create venue (403)', async () => {
      const token = await managerToken();
      return request(app.getHttpServer())
        .post('/v1/venues')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test',
          address: 'Test',
          city: 'Mumbai',
          state: 'MH',
          pincode: '400058',
          openTime: '06:00',
          closeTime: '23:00',
        })
        .expect(403);
    });

    it('TURF_MANAGER cannot delete venue (403)', async () => {
      const token = await managerToken();
      return request(app.getHttpServer())
        .delete('/v1/venues/v1')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});
