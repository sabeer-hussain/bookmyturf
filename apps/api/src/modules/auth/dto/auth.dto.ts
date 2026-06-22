import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'Phone in E.164 format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{10,14}$/, {
    message: 'Phone must be in E.164 format (e.g., +919876543210)',
  })
  phone!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'Phone in E.164 format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{10,14}$/, {
    message: 'Phone must be in E.164 format (e.g., +919876543210)',
  })
  phone!: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit code' })
  code!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJ...', description: 'Refresh token from login' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
