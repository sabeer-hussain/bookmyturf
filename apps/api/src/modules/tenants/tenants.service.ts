import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardTenantDto, UpdateTenantDto } from './dto/tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async onboard(userId: string, dto: OnboardTenantDto) {
    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) throw new BadRequestException('Slug already taken');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.tenantId) throw new BadRequestException('User already belongs to a tenant');

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        onboardingComplete: true,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { tenantId: tenant.id, role: 'TURF_OWNER' },
    });

    const plan = await this.prisma.plan.findFirst({ where: { isActive: true } });
    if (plan) {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      await this.prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: 'TRIAL',
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialEndsAt: trialEnd,
        },
      });
    }

    return tenant;
  }

  async checkSlug(slug: string) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    return { available: !existing, slug };
  }

  async findById(id: string, _userId: string, userRole: string, userTenantId: string | null) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (userRole !== 'SUPER_ADMIN' && userTenantId !== id) {
      throw new ForbiddenException('Access denied');
    }
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto, userRole: string, userTenantId: string | null) {
    if (userRole !== 'SUPER_ADMIN' && userTenantId !== id) {
      throw new ForbiddenException('Access denied');
    }
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.tenant.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
