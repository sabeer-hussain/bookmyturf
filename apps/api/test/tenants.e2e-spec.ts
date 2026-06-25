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
import { TenantsController } from '../src/modules/tenants/tenants.controller';
import { TenantsService } from '../src/modules/tenants/tenants.service';
import { PrismaService } from '../src/prisma/prisma.service';
import appConfig from '../src/config/app.config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

describe('Tenants (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prisma: Record<string, any>;

  const ownerToken = () =>
    jwtService.signAsync(
      { sub: 'u1', role: 'TURF_OWNER', tenantId: 't1' },
      { secret: 'dev-access-secret-change-in-production-32', expiresIn: '15m' },
    );

  const adminToken = () =>
    jwtService.signAsync(
      { sub: 'admin', role: 'SUPER_ADMIN', tenantId: null },
      { secret: 'dev-access-secret-change-in-production-32', expiresIn: '15m' },
    );

  beforeAll(async () => {
    prisma = {
      tenant: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn(), update: jest.fn() },
      plan: { findFirst: jest.fn() },
      subscription: { create: jest.fn() },
    };

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({}),
      ],
      controllers: [TenantsController],
      providers: [
        TenantsService,
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: PrismaService, useValue: prisma },
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

  describe('GET /v1/tenants/slug/:slug', () => {
    it('returns available true for free slug (public)', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      return request(app.getHttpServer())
        .get('/v1/tenants/slug/new-slug')
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.available).toBe(true);
        });
    });

    it('returns available false for taken slug', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 't1' });
      return request(app.getHttpServer())
        .get('/v1/tenants/slug/taken')
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.available).toBe(false);
        });
    });
  });

  describe('POST /v1/tenants/onboard', () => {
    it('requires authentication', () => {
      return request(app.getHttpServer()).post('/v1/tenants/onboard').send({}).expect(401);
    });

    it('validates required fields', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .post('/v1/tenants/onboard')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('creates tenant on valid request', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', tenantId: null });
      prisma.tenant.create.mockResolvedValue({ id: 't1', name: 'Test', slug: 'test' });
      prisma.user.update.mockResolvedValue({});
      prisma.plan.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.subscription.create.mockResolvedValue({});

      const token = await jwtService.signAsync(
        { sub: 'u1', role: 'CUSTOMER', tenantId: null },
        { secret: 'dev-access-secret-change-in-production-32', expiresIn: '15m' },
      );

      return request(app.getHttpServer())
        .post('/v1/tenants/onboard')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', slug: 'test', phone: '+919876543210', email: 'a@b.com' })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.slug).toBe('test');
        });
    });
  });

  describe('GET /v1/tenants/:id', () => {
    it('returns tenant for owner', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'Test' });
      const token = await ownerToken();
      return request(app.getHttpServer())
        .get('/v1/tenants/t1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.name).toBe('Test');
        });
    });

    it('returns 403 for non-owner', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 't1' });
      const token = await jwtService.signAsync(
        { sub: 'u2', role: 'TURF_OWNER', tenantId: 't2' },
        { secret: 'dev-access-secret-change-in-production-32', expiresIn: '15m' },
      );
      return request(app.getHttpServer())
        .get('/v1/tenants/t1')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('DELETE /v1/tenants/:id', () => {
    it('returns 403 for non-admin', async () => {
      const token = await ownerToken();
      return request(app.getHttpServer())
        .delete('/v1/tenants/t1')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('deactivates for super admin', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 't1' });
      prisma.tenant.update.mockResolvedValue({ id: 't1', isActive: false });
      const token = await adminToken();
      return request(app.getHttpServer())
        .delete('/v1/tenants/t1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.isActive).toBe(false);
        });
    });
  });
});
