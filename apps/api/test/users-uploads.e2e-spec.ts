import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../src/common/guards/auth.guard';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';
import { UploadsController } from '../src/modules/uploads/uploads.controller';
import { UploadsService } from '../src/modules/uploads/uploads.service';
import { UPLOAD_PROVIDER } from '../src/modules/uploads/providers/upload-provider.interface';
import { PrismaService } from '../src/prisma/prisma.service';
import appConfig from '../src/config/app.config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

describe('Users & Uploads (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let prisma: Record<string, any>;

  const userToken = (sub = 'u1') =>
    jwtService.signAsync(
      { sub, role: 'CUSTOMER', tenantId: null },
      { secret: 'dev-access-secret-change-in-production-32', expiresIn: '15m' },
    );

  beforeAll(async () => {
    prisma = { user: { findUnique: jest.fn(), update: jest.fn() } };

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({}),
      ],
      controllers: [UsersController, UploadsController],
      providers: [
        UsersService,
        UploadsService,
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: PrismaService, useValue: prisma },
        {
          provide: UPLOAD_PROVIDER,
          useValue: {
            getPresignedUrl: jest
              .fn()
              .mockResolvedValue({ uploadUrl: 'http://up', fileUrl: 'http://file' }),
          },
        },
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

  describe('GET /v1/users/:id', () => {
    it('returns own profile', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', firstName: 'Test', refreshToken: 'h' });
      const token = await userToken();
      return request(app.getHttpServer())
        .get('/v1/users/u1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.firstName).toBe('Test');
          expect(res.body.data).not.toHaveProperty('refreshToken');
        });
    });

    it('returns 403 for other user', async () => {
      const token = await userToken('u2');
      return request(app.getHttpServer())
        .get('/v1/users/u1')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('returns 401 without token', () => {
      return request(app.getHttpServer()).get('/v1/users/u1').expect(401);
    });
  });

  describe('PATCH /v1/users/:id', () => {
    it('updates own profile', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue({ id: 'u1', firstName: 'New', refreshToken: 'h' });
      const token = await userToken();
      return request(app.getHttpServer())
        .patch('/v1/users/u1')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'New' })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.firstName).toBe('New');
        });
    });

    it('rejects invalid gender', async () => {
      const token = await userToken();
      return request(app.getHttpServer())
        .patch('/v1/users/u1')
        .set('Authorization', `Bearer ${token}`)
        .send({ gender: 'INVALID' })
        .expect(400);
    });
  });

  describe('POST /v1/uploads/presigned', () => {
    it('returns presigned URL', async () => {
      const token = await userToken();
      return request(app.getHttpServer())
        .post('/v1/uploads/presigned')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileName: 'logo.png', fileType: 'image/png', folder: 'logos' })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.data).toHaveProperty('uploadUrl');
          expect(res.body.data).toHaveProperty('fileUrl');
        });
    });

    it('rejects invalid file type', async () => {
      const token = await userToken();
      return request(app.getHttpServer())
        .post('/v1/uploads/presigned')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileName: 'doc.pdf', fileType: 'application/pdf', folder: 'logos' })
        .expect(400);
    });

    it('rejects invalid folder', async () => {
      const token = await userToken();
      return request(app.getHttpServer())
        .post('/v1/uploads/presigned')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileName: 'img.png', fileType: 'image/png', folder: 'invalid' })
        .expect(400);
    });

    it('requires auth', () => {
      return request(app.getHttpServer())
        .post('/v1/uploads/presigned')
        .send({ fileName: 'a.png', fileType: 'image/png', folder: 'logos' })
        .expect(401);
    });
  });

  describe('PUT /v1/uploads/file/:folder/:filename', () => {
    it('uploads file in dev mode (public endpoint)', () => {
      return request(app.getHttpServer())
        .put('/v1/uploads/file/avatars/test-upload.png')
        .set('Content-Type', 'image/png')
        .send(Buffer.from('fake-image-data'))
        .expect(200)
        .expect((res: any) => {
          expect(res.body.data.message).toBe('File uploaded');
        });
    });
  });
});
