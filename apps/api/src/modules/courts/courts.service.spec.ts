import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CourtsService } from './courts.service';

describe('CourtsService', () => {
  let service: CourtsService;
  let prisma: Record<string, any>;
  let subscriptionsService: Record<string, any>;

  const mockSubscription = {
    id: 'sub-1',
    status: 'TRIAL',
    planName: 'Starter',
    limits: { maxVenues: 3, maxCourts: 5, maxStaff: 3 },
  };

  const mockVenue = { id: 'venue-1', tenantId: 'tenant-1', isActive: true };
  const mockCourt = {
    id: 'court-1',
    venueId: 'venue-1',
    name: 'Court A',
    description: null,
    isIndoor: false,
    surfaceType: 'artificial_turf',
    dimensions: '100x50 ft',
    maxPlayers: 14,
    images: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      venue: { findFirst: jest.fn() },
      court: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    subscriptionsService = {
      getCurrentSubscription: jest.fn().mockResolvedValue(mockSubscription),
    };

    const module = await Test.createTestingModule({
      providers: [
        CourtsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionsService, useValue: subscriptionsService },
      ],
    }).compile();

    service = module.get(CourtsService);
  });

  describe('create', () => {
    const createDto = { name: 'Court A', surfaceType: 'artificial_turf' as any, maxPlayers: 14 };

    it('creates a court successfully', async () => {
      prisma.venue.findFirst.mockResolvedValue(mockVenue);
      prisma.court.count.mockResolvedValue(0);
      prisma.court.create.mockResolvedValue(mockCourt);

      const result = await service.create('tenant-1', 'venue-1', createDto);
      expect(result).toEqual(mockCourt);
    });

    it('throws NotFoundException if venue not found', async () => {
      prisma.venue.findFirst.mockResolvedValue(null);
      await expect(service.create('tenant-1', 'venue-1', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if venue belongs to different tenant', async () => {
      prisma.venue.findFirst.mockResolvedValue(null);
      await expect(service.create('other-tenant', 'venue-1', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws SUBSCRIPTION_INACTIVE if subscription expired', async () => {
      prisma.venue.findFirst.mockResolvedValue(mockVenue);
      subscriptionsService.getCurrentSubscription.mockResolvedValue({
        ...mockSubscription,
        status: 'EXPIRED',
      });

      await expect(service.create('tenant-1', 'venue-1', createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws COURT_LIMIT_REACHED if max courts exceeded', async () => {
      prisma.venue.findFirst.mockResolvedValue(mockVenue);
      prisma.court.count.mockResolvedValue(5);

      await expect(service.create('tenant-1', 'venue-1', createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('counts courts across all active venues for the tenant', async () => {
      prisma.venue.findFirst.mockResolvedValue(mockVenue);
      prisma.court.count.mockResolvedValue(2);
      prisma.court.create.mockResolvedValue(mockCourt);

      await service.create('tenant-1', 'venue-1', createDto);

      expect(prisma.court.count).toHaveBeenCalledWith({
        where: { isActive: true, venue: { tenantId: 'tenant-1', isActive: true } },
      });
    });
  });

  describe('findAllByVenue', () => {
    it('returns courts with courtSports count', async () => {
      prisma.venue.findFirst.mockResolvedValue(mockVenue);
      prisma.court.findMany.mockResolvedValue([{ ...mockCourt, _count: { courtSports: 2 } }]);

      const result = await service.findAllByVenue('tenant-1', 'venue-1');
      expect(result).toHaveLength(1);
      expect(result[0]._count.courtSports).toBe(2);
    });

    it('throws NotFoundException if venue not found', async () => {
      prisma.venue.findFirst.mockResolvedValue(null);
      await expect(service.findAllByVenue('tenant-1', 'bad-venue')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findById', () => {
    it('returns court with courtSports and sport details', async () => {
      const courtWithSports = {
        ...mockCourt,
        courtSports: [{ id: 'cs-1', sport: { id: 's-1', name: 'Football', icon: 'football' } }],
      };
      prisma.court.findFirst.mockResolvedValue(courtWithSports);

      const result = await service.findById('tenant-1', 'court-1');
      expect(result.courtSports[0].sport.name).toBe('Football');
    });

    it('throws NotFoundException if court not found', async () => {
      prisma.court.findFirst.mockResolvedValue(null);
      await expect(service.findById('tenant-1', 'bad-court')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if court belongs to different tenant', async () => {
      prisma.court.findFirst.mockResolvedValue(null);
      await expect(service.findById('other-tenant', 'court-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates court successfully', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt);
      prisma.court.update.mockResolvedValue({ ...mockCourt, name: 'Court B' });

      const result = await service.update('tenant-1', 'court-1', { name: 'Court B' });
      expect(result.name).toBe('Court B');
    });

    it('throws NotFoundException if court not found', async () => {
      prisma.court.findFirst.mockResolvedValue(null);
      await expect(service.update('tenant-1', 'bad-court', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('soft deletes court', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt);
      prisma.court.update.mockResolvedValue({ ...mockCourt, isActive: false });

      const result = await service.deactivate('tenant-1', 'court-1');
      expect(result.isActive).toBe(false);
    });

    it('throws NotFoundException if court not found', async () => {
      prisma.court.findFirst.mockResolvedValue(null);
      await expect(service.deactivate('tenant-1', 'bad-court')).rejects.toThrow(NotFoundException);
    });
  });
});
