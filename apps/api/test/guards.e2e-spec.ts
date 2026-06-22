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
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { OtpService } from '../src/modules/auth/otp/otp.service';
import { OTP_PROVIDER } from '../src/modules/auth/otp/otp-provider.interface';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import appConfig from '../src/config/app.config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

describe('Guards (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prisma: Record<string, any>;

  beforeAll(async () => {
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
        { provide: APP_GUARD, useClass: RolesGuard },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            incr: jest.fn().mockResolvedValue(1),
            expire: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: OTP_PROVIDER, useValue: { sendOtp: jest.fn() } },
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

  describe('JwtAuthGuard', () => {
    it('returns 401 for missing token on protected route', () => {
      return request(app.getHttpServer()).get('/v1/auth/me').expect(401);
    });

    it('returns 401 for expired token', async () => {
      const token = await jwtService.signAsync(
        { sub: 'usr-1', role: 'CUSTOMER', tenantId: null },
        { secret: 'dev-access-secret-change-in-production-32', expiresIn: '0s' },
      );
      // Wait for token to expire
      await new Promise((r) => setTimeout(r, 1000));
      return request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('returns 200 for valid token on protected route', async () => {
      const token = await jwtService.signAsync(
        { sub: 'usr-1', role: 'CUSTOMER', tenantId: null },
        { secret: 'dev-access-secret-change-in-production-32', expiresIn: '15m' },
      );
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr-1',
        phone: '+919876543210',
        role: 'CUSTOMER',
        refreshToken: 'hash',
      });
      return request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('allows access to @Public() routes without token', () => {
      return request(app.getHttpServer())
        .post('/v1/auth/otp/send')
        .send({ phone: '+919876543210' })
        .expect(201);
    });
  });
});
