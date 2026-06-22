import { Injectable, Logger } from '@nestjs/common';
import { OtpProvider } from './otp-provider.interface';

@Injectable()
export class DevOtpProvider implements OtpProvider {
  private readonly logger = new Logger(DevOtpProvider.name);

  async sendOtp(phone: string, code: string): Promise<void> {
    this.logger.log(`[DEV] OTP for ${phone}: ${code}`);
  }
}
