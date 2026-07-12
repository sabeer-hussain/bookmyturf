import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Court } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateCourtDto, UpdateCourtDto } from './dto/create-court.dto';

interface SubscriptionInfo {
  status: string;
  planName: string;
  limits: { maxVenues: number; maxCourts: number; maxStaff: number };
}

@Injectable()
export class CourtsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async create(tenantId: string, venueId: string, dto: CreateCourtDto): Promise<Court> {
    // Verify venue belongs to tenant and is active
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, tenantId, isActive: true },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    // Check subscription and court limit
    const subscription = await this.subscriptionsService.getCurrentSubscription(tenantId);
    this.validateSubscriptionActive(subscription);
    await this.validateCourtLimit(tenantId, subscription);

    return this.prisma.court.create({
      data: {
        venueId,
        name: dto.name,
        description: dto.description,
        isIndoor: dto.isIndoor ?? false,
        surfaceType: dto.surfaceType,
        dimensions: dto.dimensions,
        maxPlayers: dto.maxPlayers,
        images: dto.images ?? [],
      },
    });
  }

  async findAllByVenue(
    tenantId: string,
    venueId: string,
  ): Promise<(Court & { _count: { courtSports: number } })[]> {
    // Verify venue belongs to tenant
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, tenantId, isActive: true },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return this.prisma.court.findMany({
      where: { venueId, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { courtSports: { where: { isActive: true } } } } },
    });
  }

  async findById(tenantId: string, courtId: string) {
    const court = await this.prisma.court.findFirst({
      where: {
        id: courtId,
        isActive: true,
        venue: { tenantId, isActive: true },
      },
      include: {
        courtSports: {
          where: { isActive: true },
          include: { sport: { select: { id: true, name: true, icon: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    return court;
  }

  async update(tenantId: string, courtId: string, dto: UpdateCourtDto): Promise<Court> {
    const court = await this.prisma.court.findFirst({
      where: {
        id: courtId,
        isActive: true,
        venue: { tenantId, isActive: true },
      },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    return this.prisma.court.update({
      where: { id: courtId },
      data: dto,
    });
  }

  async deactivate(tenantId: string, courtId: string): Promise<Court> {
    const court = await this.prisma.court.findFirst({
      where: {
        id: courtId,
        isActive: true,
        venue: { tenantId, isActive: true },
      },
    });

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    return this.prisma.court.update({
      where: { id: courtId },
      data: { isActive: false },
    });
  }

  private validateSubscriptionActive(subscription: SubscriptionInfo): void {
    if (subscription.status !== 'TRIAL' && subscription.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_INACTIVE',
        message: `Your subscription is ${subscription.status.toLowerCase()}. Please renew to add new courts.`,
      });
    }
  }

  private async validateCourtLimit(
    tenantId: string,
    subscription: SubscriptionInfo,
  ): Promise<void> {
    const activeCourtCount = await this.prisma.court.count({
      where: {
        isActive: true,
        venue: { tenantId, isActive: true },
      },
    });

    if (activeCourtCount >= subscription.limits.maxCourts) {
      throw new ForbiddenException({
        code: 'COURT_LIMIT_REACHED',
        message: `Your ${subscription.planName} plan allows a maximum of ${subscription.limits.maxCourts} courts. Please upgrade to add more.`,
      });
    }
  }
}
