import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { OTP_PROVIDER } from '../src/modules/auth/otp/otp-provider.interface';
import { OtpService } from '../src/modules/auth/otp/otp.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import appConfig from '../src/config/app.config';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let redis: Record<string, jest.Mock>;
  let prisma: Record<string, any>;

  beforeAll(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn(),
      ttl: jest.fn(),
    };
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({}),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        OtpService,
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: RedisService, useValue: redis },
        { provide: PrismaService, useValue: prisma },
        { provide: OTP_PROVIDER, useValue: { sendOtp: jest.fn() } },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformInterceptor());
    app.setGlobalPrefix('v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/auth/otp/send', () => {
    it('sends OTP for valid phone', () => {
      redis.get.mockResolvedValue(null);
      return request(app.getHttpServer())
        .post('/v1/auth/otp/send')
        .send({ phone: '+919876543210' })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.message).toBe('OTP sent successfully');
        });
    });

    it('rejects invalid phone format', () => {
      return request(app.getHttpServer())
        .post('/v1/auth/otp/send')
        .send({ phone: '9876543210' })
        .expect(400);
    });

    it('rejects empty body', () => {
      return request(app.getHttpServer()).post('/v1/auth/otp/send').send({}).expect(400);
    });
  });

  describe('POST /v1/auth/otp/verify', () => {
    it('returns tokens for valid OTP', () => {
      redis.get.mockResolvedValue('123456');
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'usr-1',
        phone: '+919876543210',
        role: 'CUSTOMER',
        tenantId: null,
        firstName: 'User',
      });
      prisma.user.update.mockResolvedValue({});

      return request(app.getHttpServer())
        .post('/v1/auth/otp/verify')
        .send({ phone: '+919876543210', code: '123456' })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data.user).not.toHaveProperty('refreshToken');
        });
    });

    it('rejects invalid OTP', () => {
      redis.get.mockResolvedValue('123456');
      return request(app.getHttpServer())
        .post('/v1/auth/otp/verify')
        .send({ phone: '+919876543210', code: '000000' })
        .expect(401);
    });

    it('rejects invalid code format', () => {
      return request(app.getHttpServer())
        .post('/v1/auth/otp/verify')
        .send({ phone: '+919876543210', code: '12' })
        .expect(400);
    });
  });

  describe('POST /v1/auth/refresh', () => {
    it('rejects invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(403);
    });

    it('rejects empty body', () => {
      return request(app.getHttpServer()).post('/v1/auth/refresh').send({}).expect(400);
    });
  });

  describe('POST /v1/auth/logout', () => {
    it('rejects unauthenticated request', () => {
      return request(app.getHttpServer()).post('/v1/auth/logout').expect(401);
    });
  });

  describe('GET /v1/auth/me', () => {
    it('rejects unauthenticated request', () => {
      return request(app.getHttpServer()).get('/v1/auth/me').expect(401);
    });

    it('returns user for valid token', async () => {
      const jwtService = app.get(JwtService);
      const token = await jwtService.signAsync(
        { sub: 'usr-1', role: 'CUSTOMER', tenantId: null },
        { secret: 'dev-access-secret-change-in-production-32', expiresIn: '15m' },
      );
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr-1',
        phone: '+919876543210',
        role: 'CUSTOMER',
        refreshToken: 'hashed',
      });

      return request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('id', 'usr-1');
          expect(res.body.data).not.toHaveProperty('refreshToken');
        });
    });
  });
});
