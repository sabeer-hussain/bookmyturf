import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Venue } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { PaginationQueryDto, PaginatedResult } from '../../common/dto/pagination.dto';

type VenueWithCourtsCount = Venue & { _count: { courts: number } };

interface SubscriptionInfo {
  status: string;
  planName: string;
  limits: { maxVenues: number; maxCourts: number; maxStaff: number };
}

@Injectable()
export class VenuesService {
  private readonly allowedSortFields = ['createdAt', 'name', 'city', 'openTime', 'closeTime'];

  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async create(tenantId: string, dto: CreateVenueDto): Promise<Venue> {
    const subscription = await this.subscriptionsService.getCurrentSubscription(tenantId);
    this.validateSubscriptionActive(subscription);
    await this.validateVenueLimit(tenantId, subscription);

    return this.prisma.venue.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        openTime: dto.openTime,
        closeTime: dto.closeTime,
        phone: dto.phone,
        latitude: dto.latitude,
        longitude: dto.longitude,
        amenities: dto.amenities ?? [],
        images: dto.images ?? [],
      },
    });
  }

  async findAll(
    tenantId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<VenueWithCourtsCount>> {
    const { page = 1, limit = 20, search, sort, order = 'desc' } = query;
    const skip = (page - 1) * limit;
    const sortField = sort && this.allowedSortFields.includes(sort) ? sort : 'createdAt';

    const where: Prisma.VenueWhereInput = { tenantId, isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [venues, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: order },
        include: { _count: { select: { courts: { where: { isActive: true } } } } },
      }),
      this.prisma.venue.count({ where }),
    ]);

    return {
      data: venues,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(tenantId: string, venueId: string): Promise<VenueWithCourtsCount> {
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, tenantId, isActive: true },
      include: { _count: { select: { courts: { where: { isActive: true } } } } },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return venue;
  }

  async update(tenantId: string, venueId: string, dto: UpdateVenueDto): Promise<Venue> {
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, tenantId, isActive: true },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return this.prisma.venue.update({
      where: { id: venueId },
      data: dto,
    });
  }

  async deactivate(tenantId: string, venueId: string): Promise<Venue> {
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, tenantId, isActive: true },
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return this.prisma.venue.update({
      where: { id: venueId },
      data: { isActive: false },
    });
  }

  private validateSubscriptionActive(subscription: SubscriptionInfo): void {
    if (subscription.status !== 'TRIAL' && subscription.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_INACTIVE',
        message: `Your subscription is ${subscription.status.toLowerCase()}. Please renew to add new venues.`,
      });
    }
  }

  private async validateVenueLimit(
    tenantId: string,
    subscription: SubscriptionInfo,
  ): Promise<void> {
    const activeVenueCount = await this.prisma.venue.count({
      where: { tenantId, isActive: true },
    });

    if (activeVenueCount >= subscription.limits.maxVenues) {
      throw new ForbiddenException({
        code: 'VENUE_LIMIT_REACHED',
        message: `Your ${subscription.planName} plan allows a maximum of ${subscription.limits.maxVenues} venues. Please upgrade to add more.`,
      });
    }
  }
}
