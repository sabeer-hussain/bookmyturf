import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp/otp.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private otpService: OtpService,
  ) {}

  async sendOtp(phone: string) {
    await this.otpService.send(phone);
    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(phone: string, code: string) {
    const valid = await this.otpService.verify(phone, code);
    if (!valid) throw new UnauthorizedException('Invalid or expired OTP');

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, firstName: 'User', phoneVerified: true, role: 'CUSTOMER' },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true, lastLoginAt: new Date() },
      });
    }

    const tokens = await this.generateTokens(user.id, user.role, user.tenantId);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async refresh(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);
    if (!payload) throw new ForbiddenException('Invalid refresh token');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access denied');
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!matches) throw new ForbiddenException('Access denied');

    const tokens = await this.generateTokens(user.id, user.role, user.tenantId);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return this.sanitizeUser(user);
  }

  async generateTokens(userId: string, role: string, tenantId: string | null) {
    const payload = { sub: userId, role, tenantId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('jwt.accessSecret'),
        expiresIn: this.config.get('jwt.accessExpiry'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiry'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hash },
    });
  }

  private verifyRefreshToken(token: string) {
    try {
      return this.jwt.verify(token, {
        secret: this.config.get('jwt.refreshSecret'),
      });
    } catch {
      return null;
    }
  }

  private sanitizeUser(user: any) {
    const { refreshToken, ...sanitized } = user;
    return sanitized;
  }
}
