import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { CourtsController } from '../src/modules/courts/courts.controller';
import { VenueCourtsController } from '../src/modules/courts/venue-courts.controller';
import { CourtSportsController } from '../src/modules/courts/court-sports.controller';
import { CourtsService } from '../src/modules/courts/courts.service';
import { CourtSportsService } from '../src/modules/courts/court-sports.service';
import { SportsController } from '../src/modules/sports/sports.controller';
import { SportsService } from '../src/modules/sports/sports.service';
import { SubscriptionsService } from '../src/modules/subscriptions/subscriptions.service';
import { PrismaService } from '../src/prisma/prisma.service';
import appConfig from '../src/config/app.config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

describe('Courts & Sports (e2e)', () => {
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

  const adminToken = () =>
    jwtService.signAsync(
      { sub: 'admin', role: 'SUPER_ADMIN', tenantId: null },
      { secret: 'dev-access-secret-change-in-production-32', expiresIn: '15m' },
    );

  const mockSubscription = {
    id: 'sub-1',
    status: 'TRIAL',
    planName: 'Starter',
    limits: { maxVenues: 3, maxCourts: 5, maxStaff: 3 },
  };

  const mockVenue = { id: 'v1', tenantId: 't1', isActive: true, name: 'Arena' };
  const mockCourt = {
    id: 'c1',
    venueId: 'v1',
    name: 'Court A',
    description: null,
    isIndoor: false,
    surfaceType: 'artificial_turf',
    dimensions: '100x50 ft',
    maxPlayers: 14,
    images: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockCourtWithSports = {
    ...mockCourt,
    courtSports: [
      {
        id: 'cs1',
        sportId: 's1',
        baseSlotMinutes: 60,
        pricePerSlot: '800',
        peakPricePerSlot: '1200',
        maxConsecutiveSlots: 3,
        isActive: true,
        sport: { id: 's1', name: 'Cricket', icon: 'cricket' },
      },
    ],
  };
  const mockSport = {
    id: 's1',
    name: 'Cricket',
    icon: 'cricket',
    isActive: true,
    createdAt: new Date(),
  };
  const mockCourtSport = {
    id: 'cs1',
    courtId: 'c1',
    sportId: 's1',
    baseSlotMinutes: 60,
    pricePerSlot: '800',
    peakPricePerSlot: '1200',
    maxConsecutiveSlots: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    sport: { id: 's1', name: 'Cricket', icon: 'cricket' },
  };

  beforeAll(async () => {
    prisma = {
      venue: { findFirst: jest.fn().mockResolvedValue(mockVenue) },
      court: {
        create: jest.fn().mockResolvedValue(mockCourt),
        findMany: jest.fn().mockResolvedValue([{ ...mockCourt, _count: { courtSports: 1 } }]),
        findFirst: jest.fn().mockResolvedValue(mockCourtWithSports),
        count: jest.fn().mockResolvedValue(2),
        update: jest.fn().mockResolvedValue(mockCourt),
      },
      sport: {
        findMany: jest.fn().mockResolvedValue([mockSport]),
        findFirst: jest.fn().mockResolvedValue(mockSport),
        findUnique: jest.fn().mockResolvedValue(mockSport),
        create: jest.fn().mockResolvedValue(mockSport),
        update: jest.fn().mockResolvedValue(mockSport),
      },
      courtSport: {
        create: jest.fn().mockResolvedValue(mockCourtSport),
        findMany: jest.fn().mockResolvedValue([mockCourtSport]),
        findFirst: jest.fn().mockResolvedValue(mockCourtSport),
        update: jest.fn().mockResolvedValue(mockCourtSport),
        delete: jest.fn().mockResolvedValue(mockCourtSport),
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
      controllers: [
        VenueCourtsController,
        CourtsController,
        CourtSportsController,
        SportsController,
      ],
      providers: [
        CourtsService,
        CourtSportsService,
        SportsService,
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

  // ─── COURT LIFECYCLE ───────────────────────────────────

  describe('POST /v1/venues/:venueId/courts', () => {
    it('creates court successfully', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/venues/v1/courts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Court A', surfaceType: 'artificial_turf' })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Court A');
        });
    });

    it('rejects invalid surface type', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/venues/v1/courts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Court B', surfaceType: 'marble' })
        .expect(400);
    });

    it('rejects when venue not found (wrong tenant)', async () => {
      prisma.venue.findFirst.mockResolvedValueOnce(null);
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/venues/bad-venue/courts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Court X' })
        .expect(404);
    });
  });

  describe('GET /v1/venues/:venueId/courts', () => {
    it('lists courts with courtSports count', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .get('/v1/venues/v1/courts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });
  });

  describe('GET /v1/courts/:id', () => {
    it('returns court with courtSports and sport details', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .get('/v1/courts/c1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.courtSports).toBeInstanceOf(Array);
          expect(res.body.data.courtSports[0].sport.name).toBe('Cricket');
        });
    });

    it('returns 404 for non-existent court', async () => {
      prisma.court.findFirst.mockResolvedValueOnce(null);
      const token = await ownerToken();
      return request(app.getHttpServer())
        .get('/v1/courts/bad-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /v1/courts/:id', () => {
    it('updates court', async () => {
      prisma.court.findFirst.mockResolvedValueOnce(mockCourt);
      prisma.court.update.mockResolvedValueOnce({ ...mockCourt, name: 'Court A Premium' });
      const token = await ownerToken();
      return request(app.getHttpServer())
        .patch('/v1/courts/c1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Court A Premium' })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.name).toBe('Court A Premium');
        });
    });
  });

  describe('DELETE /v1/courts/:id', () => {
    it('deactivates court (soft delete)', async () => {
      prisma.court.findFirst.mockResolvedValueOnce(mockCourt);
      prisma.court.update.mockResolvedValueOnce({ ...mockCourt, isActive: false });
      const token = await ownerToken();
      return request(app.getHttpServer())
        .delete('/v1/courts/c1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.isActive).toBe(false);
        });
    });
  });

  // ─── COURT LIMIT ENFORCEMENT ───────────────────────────

  describe('Court Limit Enforcement', () => {
    it('rejects when court limit reached across all venues (403)', async () => {
      prisma.court.count.mockResolvedValueOnce(5); // At limit
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/venues/v1/courts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Over Limit' })
        .expect(403);
    });

    it('rejects when subscription inactive', async () => {
      subscriptionsService.getCurrentSubscription.mockResolvedValueOnce({
        ...mockSubscription,
        status: 'CANCELLED',
      });
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/venues/v1/courts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test' })
        .expect(403);
    });
  });

  // ─── COURT-SPORT LIFECYCLE ─────────────────────────────

  describe('POST /v1/courts/:courtId/sports', () => {
    it('adds sport to court', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/courts/c1/sports')
        .set('Authorization', `Bearer ${token}`)
        .send({ sportId: 's1', pricePerSlot: 800, peakPricePerSlot: 1200 })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.data.sport.name).toBe('Cricket');
        });
    });

    it('rejects duplicate court-sport (409)', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      prisma.courtSport.create.mockRejectedValueOnce(p2002);
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/courts/c1/sports')
        .set('Authorization', `Bearer ${token}`)
        .send({ sportId: 's1', pricePerSlot: 800 })
        .expect(409);
    });

    it('rejects when sport not found', async () => {
      prisma.sport.findFirst.mockResolvedValueOnce(null);
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/courts/c1/sports')
        .set('Authorization', `Bearer ${token}`)
        .send({ sportId: 'bad-sport', pricePerSlot: 800 })
        .expect(404);
    });

    it('rejects missing pricePerSlot', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/courts/c1/sports')
        .set('Authorization', `Bearer ${token}`)
        .send({ sportId: 's1' })
        .expect(400);
    });

    it('rejects zero price', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/courts/c1/sports')
        .set('Authorization', `Bearer ${token}`)
        .send({ sportId: 's1', pricePerSlot: 0 })
        .expect(400);
    });
  });

  describe('GET /v1/courts/:courtId/sports', () => {
    it('lists sports for court', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .get('/v1/courts/c1/sports')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });
  });

  describe('PATCH /v1/court-sports/:id', () => {
    it('updates court-sport config', async () => {
      prisma.courtSport.update.mockResolvedValueOnce({ ...mockCourtSport, pricePerSlot: '1000' });
      const token = await ownerToken();
      return request(app.getHttpServer())
        .patch('/v1/court-sports/cs1')
        .set('Authorization', `Bearer ${token}`)
        .send({ pricePerSlot: 1000 })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.pricePerSlot).toBe('1000');
        });
    });
  });

  describe('DELETE /v1/court-sports/:id', () => {
    it('removes sport from court (hard delete, 204)', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .delete('/v1/court-sports/cs1')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });

    it('returns 404 for non-existent court-sport', async () => {
      prisma.courtSport.findFirst.mockResolvedValueOnce(null);
      const token = await ownerToken();
      return request(app.getHttpServer())
        .delete('/v1/court-sports/bad-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ─── TENANT ISOLATION ──────────────────────────────────

  describe('Tenant Isolation', () => {
    it('tenant B cannot see tenant A courts', async () => {
      prisma.court.findFirst.mockResolvedValueOnce(null);
      const token = await otherOwnerToken();
      return request(app.getHttpServer())
        .get('/v1/courts/c1')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('tenant B cannot add sport to tenant A court', async () => {
      prisma.court.findFirst.mockResolvedValueOnce(null);
      const token = await otherOwnerToken();
      return request(app.getHttpServer())
        .post('/v1/courts/c1/sports')
        .set('Authorization', `Bearer ${token}`)
        .send({ sportId: 's1', pricePerSlot: 800 })
        .expect(404);
    });
  });

  // ─── SPORTS ENDPOINTS ──────────────────────────────────

  describe('GET /v1/sports', () => {
    it('returns sports without auth (public)', () => {
      return request(app.getHttpServer())
        .get('/v1/sports')
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
        });
    });
  });

  describe('POST /v1/sports', () => {
    it('SUPER_ADMIN can create sport', async () => {
      const token = await adminToken();
      return request(app.getHttpServer())
        .post('/v1/sports')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Squash', icon: 'squash' })
        .expect(201);
    });

    it('TURF_OWNER cannot create sport (403)', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/sports')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Squash' })
        .expect(403);
    });
  });

  // ─── ROLE-BASED ACCESS ─────────────────────────────────

  describe('Role-Based Access', () => {
    it('CUSTOMER cannot create court (403)', async () => {
      const token = await customerToken();
      return request(app.getHttpServer())
        .post('/v1/venues/v1/courts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hack' })
        .expect(403);
    });

    it('unauthenticated cannot access courts', () => {
      return request(app.getHttpServer()).get('/v1/courts/c1').expect(401);
    });
  });
});
