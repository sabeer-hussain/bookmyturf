import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { RedisService } from '../../../redis/redis.service';
import { OTP_PROVIDER } from './otp-provider.interface';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  let otpService: OtpService;
  let redis: Record<string, jest.Mock>;
  let otpProvider: Record<string, jest.Mock>;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn(),
    };
    otpProvider = { sendOtp: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: RedisService, useValue: redis },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const map: Record<string, any> = {
                'otp.expiryMinutes': 10,
                'otp.provider': 'dev',
              };
              return map[key];
            },
          },
        },
        { provide: OTP_PROVIDER, useValue: otpProvider },
      ],
    }).compile();

    otpService = module.get(OtpService);
  });

  describe('generateCode', () => {
    it('returns 123456 in dev mode', () => {
      expect(otpService.generateCode()).toBe('123456');
    });
  });

  describe('send', () => {
    it('stores OTP in redis and calls provider', async () => {
      redis.get.mockResolvedValue(null);
      await otpService.send('+919876543210');
      expect(redis.set).toHaveBeenCalledWith('otp:+919876543210', '123456', 600);
      expect(otpProvider.sendOtp).toHaveBeenCalledWith('+919876543210', '123456');
    });

    it('throws 429 when rate limit exceeded', async () => {
      redis.get.mockResolvedValue('3');
      await expect(otpService.send('+919876543210')).rejects.toThrow(
        new HttpException('Maximum 3 OTP requests per 10 minutes', HttpStatus.TOO_MANY_REQUESTS),
      );
    });
  });

  describe('verify', () => {
    it('returns true for valid OTP', async () => {
      redis.get.mockResolvedValue('123456');
      const result = await otpService.verify('+919876543210', '123456');
      expect(result).toBe(true);
      expect(redis.del).toHaveBeenCalledWith('otp:+919876543210');
    });

    it('returns false for invalid OTP', async () => {
      redis.get.mockResolvedValue('123456');
      const result = await otpService.verify('+919876543210', '000000');
      expect(result).toBe(false);
    });

    it('throws when max attempts exceeded', async () => {
      redis.incr.mockResolvedValue(6);
      await expect(otpService.verify('+919876543210', '123456')).rejects.toThrow(
        'Maximum OTP attempts exceeded',
      );
    });
  });
});
