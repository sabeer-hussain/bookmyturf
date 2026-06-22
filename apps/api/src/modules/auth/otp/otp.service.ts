import { BadRequestException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../redis/redis.service';
import { OTP_PROVIDER, OtpProvider } from './otp-provider.interface';

@Injectable()
export class OtpService {
  private readonly expiryMinutes: number;

  constructor(
    private redis: RedisService,
    private config: ConfigService,
    @Inject(OTP_PROVIDER) private otpProvider: OtpProvider,
  ) {
    this.expiryMinutes = this.config.get('otp.expiryMinutes') || 10;
  }

  generateCode(): string {
    if (this.config.get('otp.provider') === 'dev') return '123456';
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async send(phone: string): Promise<void> {
    await this.checkRateLimit(phone);
    const code = this.generateCode();
    const ttl = this.expiryMinutes * 60;

    await this.redis.set(`otp:${phone}`, code, ttl);
    await this.otpProvider.sendOtp(phone, code);
    await this.incrementRateLimit(phone);
  }

  async verify(phone: string, code: string): Promise<boolean> {
    const attempts = await this.redis.incr(`otp_attempts:${phone}`);
    if (attempts === 1) {
      await this.redis.expire(`otp_attempts:${phone}`, this.expiryMinutes * 60);
    }
    if (attempts > 5) {
      throw new BadRequestException('Maximum OTP attempts exceeded');
    }

    const storedCode = await this.redis.get(`otp:${phone}`);
    if (!storedCode || storedCode !== code) return false;

    await this.redis.del(`otp:${phone}`);
    await this.redis.del(`otp_attempts:${phone}`);
    return true;
  }

  private async checkRateLimit(phone: string): Promise<void> {
    const key = `otp_rate:${phone}`;
    const count = await this.redis.get(key);
    if (count && parseInt(count, 10) >= 3) {
      throw new HttpException(
        'Maximum 3 OTP requests per 10 minutes',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async incrementRateLimit(phone: string): Promise<void> {
    const key = `otp_rate:${phone}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 600);
    }
  }
}
