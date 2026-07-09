import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { VenuesService } from './venues.service';

describe('VenuesService', () => {
  let service: VenuesService;
  let prisma: Record<string, any>;
  let subscriptionsService: Record<string, any>;

  const mockSubscription = {
    id: 'sub-1',
    status: 'TRIAL',
    planName: 'Starter',
    planId: 'plan-starter',
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    trialDaysLeft: 14,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    limits: { maxVenues: 3, maxCourts: 5, maxStaff: 3 },
    features: {},
  };

  const mockVenue = {
    id: 'venue-1',
    tenantId: 'tenant-1',
    name: 'SportArena Main',
    address: 'Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400058',
    openTime: '06:00',
    closeTime: '23:00',
    phone: '+919876543210',
    latitude: 19.1136,
    longitude: 72.8697,
    amenities: ['parking', 'floodlights'],
    images: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      venue: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    subscriptionsService = {
      getCurrentSubscription: jest.fn().mockResolvedValue(mockSubscription),
    };

    const module = await Test.createTestingModule({
      providers: [
        VenuesService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionsService, useValue: subscriptionsService },
      ],
    }).compile();

    service = module.get(VenuesService);
  });

  describe('create', () => {
    const createDto = {
      name: 'SportArena Main',
      address: 'Andheri West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400058',
      openTime: '06:00',
      closeTime: '23:00',
      phone: '+919876543210',
      latitude: 19.1136,
      longitude: 72.8697,
      amenities: ['parking' as any, 'floodlights' as any],
      images: [],
    };

    it('creates a venue successfully', async () => {
      prisma.venue.count.mockResolvedValue(0);
      prisma.venue.create.mockResolvedValue(mockVenue);

      const result = await service.create('tenant-1', createDto);

      expect(result).toEqual(mockVenue);
      expect(prisma.venue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'SportArena Main',
          city: 'Mumbai',
        }),
      });
    });

    it('throws SUBSCRIPTION_INACTIVE if subscription is expired', async () => {
      subscriptionsService.getCurrentSubscription.mockResolvedValue({
        ...mockSubscription,
        status: 'EXPIRED',
      });

      await expect(service.create('tenant-1', createDto)).rejects.toThrow(ForbiddenException);
      await expect(service.create('tenant-1', createDto)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'SUBSCRIPTION_INACTIVE' }),
      });
    });

    it('throws SUBSCRIPTION_INACTIVE if subscription is cancelled', async () => {
      subscriptionsService.getCurrentSubscription.mockResolvedValue({
        ...mockSubscription,
        status: 'CANCELLED',
      });

      await expect(service.create('tenant-1', createDto)).rejects.toThrow(ForbiddenException);
    });

    it('throws SUBSCRIPTION_INACTIVE if subscription is past due', async () => {
      subscriptionsService.getCurrentSubscription.mockResolvedValue({
        ...mockSubscription,
        status: 'PAST_DUE',
      });

      await expect(service.create('tenant-1', createDto)).rejects.toThrow(ForbiddenException);
    });

    it('throws VENUE_LIMIT_REACHED if max venues exceeded', async () => {
      prisma.venue.count.mockResolvedValue(3); // Already at limit (maxVenues = 3)

      await expect(service.create('tenant-1', createDto)).rejects.toThrow(ForbiddenException);
      await expect(service.create('tenant-1', createDto)).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'VENUE_LIMIT_REACHED' }),
      });
    });

    it('allows creation when under venue limit', async () => {
      prisma.venue.count.mockResolvedValue(2); // Under limit
      prisma.venue.create.mockResolvedValue(mockVenue);

      const result = await service.create('tenant-1', createDto);
      expect(result).toEqual(mockVenue);
    });

    it('allows creation with ACTIVE subscription', async () => {
      subscriptionsService.getCurrentSubscription.mockResolvedValue({
        ...mockSubscription,
        status: 'ACTIVE',
      });
      prisma.venue.count.mockResolvedValue(0);
      prisma.venue.create.mockResolvedValue(mockVenue);

      const result = await service.create('tenant-1', createDto);
      expect(result).toEqual(mockVenue);
    });
  });

  describe('findAll', () => {
    it('returns paginated venues with courts count', async () => {
      const venuesWithCount = [{ ...mockVenue, _count: { courts: 2 } }];
      prisma.venue.findMany.mockResolvedValue(venuesWithCount);
      prisma.venue.count.mockResolvedValue(1);

      const result = await service.findAll('tenant-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(prisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', isActive: true },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('applies search filter across name, city, address', async () => {
      prisma.venue.findMany.mockResolvedValue([]);
      prisma.venue.count.mockResolvedValue(0);

      await service.findAll('tenant-1', { page: 1, limit: 20, search: 'Mumbai' });

      expect(prisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'Mumbai', mode: 'insensitive' } },
              { city: { contains: 'Mumbai', mode: 'insensitive' } },
              { address: { contains: 'Mumbai', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('calculates correct pagination offset', async () => {
      prisma.venue.findMany.mockResolvedValue([]);
      prisma.venue.count.mockResolvedValue(50);

      const result = await service.findAll('tenant-1', { page: 3, limit: 10 });

      expect(prisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(result.meta.totalPages).toBe(5);
    });

    it('only returns active venues', async () => {
      prisma.venue.findMany.mockResolvedValue([]);
      prisma.venue.count.mockResolvedValue(0);

      await service.findAll('tenant-1', {});

      expect(prisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('falls back to createdAt for invalid sort field', async () => {
      prisma.venue.findMany.mockResolvedValue([]);
      prisma.venue.count.mockResolvedValue(0);

      await service.findAll('tenant-1', { sort: 'tenantId' } as any);

      expect(prisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns venue with courts count', async () => {
      const venueWithCount = { ...mockVenue, _count: { courts: 3 } };
      prisma.venue.findFirst.mockResolvedValue(venueWithCount);

      const result = await service.findById('tenant-1', 'venue-1');

      expect(result).toEqual(venueWithCount);
      expect(prisma.venue.findFirst).toHaveBeenCalledWith({
        where: { id: 'venue-1', tenantId: 'tenant-1', isActive: true },
        include: { _count: { select: { courts: { where: { isActive: true } } } } },
      });
    });

    it('throws NotFoundException if venue not found', async () => {
      prisma.venue.findFirst.mockResolvedValue(null);

      await expect(service.findById('tenant-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if venue belongs to different tenant', async () => {
      prisma.venue.findFirst.mockResolvedValue(null); // findFirst with tenantId filter returns null

      await expect(service.findById('other-tenant', 'venue-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates venue successfully', async () => {
      prisma.venue.findFirst.mockResolvedValue(mockVenue);
      prisma.venue.update.mockResolvedValue({ ...mockVenue, name: 'Updated Name' });

      const result = await service.update('tenant-1', 'venue-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(prisma.venue.update).toHaveBeenCalledWith({
        where: { id: 'venue-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('throws NotFoundException if venue not found', async () => {
      prisma.venue.findFirst.mockResolvedValue(null);

      await expect(service.update('tenant-1', 'nonexistent', { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if venue belongs to different tenant', async () => {
      prisma.venue.findFirst.mockResolvedValue(null);

      await expect(service.update('other-tenant', 'venue-1', { name: 'Hacked' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('soft deletes venue (sets isActive to false)', async () => {
      prisma.venue.findFirst.mockResolvedValue(mockVenue);
      prisma.venue.update.mockResolvedValue({ ...mockVenue, isActive: false });

      const result = await service.deactivate('tenant-1', 'venue-1');

      expect(result.isActive).toBe(false);
      expect(prisma.venue.update).toHaveBeenCalledWith({
        where: { id: 'venue-1' },
        data: { isActive: false },
      });
    });

    it('throws NotFoundException if venue not found', async () => {
      prisma.venue.findFirst.mockResolvedValue(null);

      await expect(service.deactivate('tenant-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if already deactivated', async () => {
      prisma.venue.findFirst.mockResolvedValue(null); // isActive: true filter excludes it

      await expect(service.deactivate('tenant-1', 'venue-1')).rejects.toThrow(NotFoundException);
    });
  });
});
