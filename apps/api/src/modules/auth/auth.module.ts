import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DevOtpProvider } from './otp/dev-otp.provider';
import { Msg91OtpProvider } from './otp/msg91-otp.provider';
import { OTP_PROVIDER } from './otp/otp-provider.interface';
import { OtpService } from './otp/otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    JwtStrategy,
    {
      provide: OTP_PROVIDER,
      useFactory: (config: ConfigService) => {
        const provider = config.get('otp.provider');
        if (provider === 'msg91') return new Msg91OtpProvider(config);
        return new DevOtpProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
