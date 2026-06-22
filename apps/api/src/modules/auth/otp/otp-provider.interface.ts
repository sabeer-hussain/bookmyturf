export interface OtpProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

export const OTP_PROVIDER = 'OTP_PROVIDER';
