import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OtpProvider } from './otp-provider.interface';

@Injectable()
export class Msg91OtpProvider implements OtpProvider {
  private readonly logger = new Logger(Msg91OtpProvider.name);

  constructor(private config: ConfigService) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const apiKey = this.config.get('otp.apiKey');
    const templateId = this.config.get('otp.templateId');

    try {
      await axios.post(
        'https://control.msg91.com/api/v5/otp',
        {
          template_id: templateId,
          mobile: phone.replace('+', ''),
          otp: code,
        },
        {
          headers: {
            authkey: apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        },
      );
    } catch (error: any) {
      this.logger.error(`MSG91 OTP send failed for ${phone}: ${error.message}`);
      throw error;
    }
  }
}
