import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: Record<string, any>;
  let jwt: Record<string, jest.Mock>;
  let otpService: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('token'),
      verify: jest.fn(),
    };
    otpService = {
      send: jest.fn(),
      verify: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, any> = {
                'jwt.accessSecret': 'access-secret',
                'jwt.refreshSecret': 'refresh-secret',
                'jwt.accessExpiry': '15m',
                'jwt.refreshExpiry': '7d',
              };
              return map[key];
            },
          },
        },
        { provide: OtpService, useValue: otpService },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  describe('sendOtp', () => {
    it('delegates to OtpService', async () => {
      await authService.sendOtp('+919876543210');
      expect(otpService.send).toHaveBeenCalledWith('+919876543210');
    });
  });

  describe('verifyOtp', () => {
    it('creates user on first login', async () => {
      otpService.verify.mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: '1',
        phone: '+919876543210',
        role: 'CUSTOMER',
        tenantId: null,
        firstName: 'User',
      });

      const result = await authService.verifyOtp('+919876543210', '123456');
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('returns existing user on subsequent login', async () => {
      otpService.verify.mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        phone: '+919876543210',
        role: 'CUSTOMER',
        tenantId: null,
      });
      prisma.user.update.mockResolvedValue({
        id: '1',
        phone: '+919876543210',
        role: 'CUSTOMER',
        tenantId: null,
      });

      const result = await authService.verifyOtp('+919876543210', '123456');
      expect(prisma.user.update).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
    });

    it('throws on invalid OTP', async () => {
      otpService.verify.mockResolvedValue(false);
      await expect(authService.verifyOtp('+919876543210', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('generateTokens', () => {
    it('returns access and refresh tokens', async () => {
      const tokens = await authService.generateTokens('user-1', 'CUSTOMER', null);
      expect(jwt.signAsync).toHaveBeenCalledTimes(2);
      expect(tokens).toEqual({ accessToken: 'token', refreshToken: 'token' });
    });
  });

  describe('logout', () => {
    it('nullifies refresh token', async () => {
      prisma.user.update.mockResolvedValue({});
      await authService.logout('user-1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshToken: null },
      });
    });
  });

  describe('getMe', () => {
    it('returns sanitized user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        phone: '+919876543210',
        refreshToken: 'hashed',
      });
      const result = await authService.getMe('1');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).toHaveProperty('id', '1');
    });

    it('throws if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(authService.getMe('unknown')).rejects.toThrow(UnauthorizedException);
    });
  });
});
