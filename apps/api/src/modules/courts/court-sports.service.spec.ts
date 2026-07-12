import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CourtSportsService } from './court-sports.service';

describe('CourtSportsService', () => {
  let service: CourtSportsService;
  let prisma: Record<string, any>;

  const mockCourt = { id: 'court-1', venueId: 'venue-1', isActive: true };
  const mockSport = { id: 'sport-1', name: 'Football', icon: 'football', isActive: true };
  const mockCourtSport = {
    id: 'cs-1',
    courtId: 'court-1',
    sportId: 'sport-1',
    baseSlotMinutes: 60,
    pricePerSlot: 800,
    peakPricePerSlot: 1200,
    maxConsecutiveSlots: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    sport: { id: 'sport-1', name: 'Football', icon: 'football' },
  };

  beforeEach(async () => {
    prisma = {
      court: { findFirst: jest.fn() },
      sport: { findFirst: jest.fn() },
      courtSport: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [CourtSportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CourtSportsService);
  });

  describe('addSportToCourt', () => {
    const createDto = { sportId: 'sport-1', pricePerSlot: 800, peakPricePerSlot: 1200 };

    it('adds sport to court successfully', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt);
      prisma.sport.findFirst.mockResolvedValue(mockSport);
      prisma.courtSport.create.mockResolvedValue(mockCourtSport);

      const result = await service.addSportToCourt('tenant-1', 'court-1', createDto);
      expect(result).toEqual(mockCourtSport);
    });

    it('throws NotFoundException if court not found', async () => {
      prisma.court.findFirst.mockResolvedValue(null);
      await expect(service.addSportToCourt('tenant-1', 'court-1', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if sport not found', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt);
      prisma.sport.findFirst.mockResolvedValue(null);
      await expect(service.addSportToCourt('tenant-1', 'court-1', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException on duplicate court-sport', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt);
      prisma.sport.findFirst.mockResolvedValue(mockSport);
      const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      prisma.courtSport.create.mockRejectedValue(p2002Error);

      await expect(service.addSportToCourt('tenant-1', 'court-1', createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAllByCourt', () => {
    it('returns court sports with sport details', async () => {
      prisma.court.findFirst.mockResolvedValue(mockCourt);
      prisma.courtSport.findMany.mockResolvedValue([mockCourtSport]);

      const result = await service.findAllByCourt('tenant-1', 'court-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockCourtSport);
    });

    it('throws NotFoundException if court not found', async () => {
      prisma.court.findFirst.mockResolvedValue(null);
      await expect(service.findAllByCourt('tenant-1', 'bad-court')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates court sport configuration', async () => {
      prisma.courtSport.findFirst.mockResolvedValue(mockCourtSport);
      prisma.courtSport.update.mockResolvedValue({ ...mockCourtSport, pricePerSlot: 900 });

      const result = await service.update('tenant-1', 'cs-1', { pricePerSlot: 900 });
      expect(result.pricePerSlot).toBe(900);
    });

    it('throws NotFoundException if court sport not found', async () => {
      prisma.courtSport.findFirst.mockResolvedValue(null);
      await expect(service.update('tenant-1', 'bad-id', { pricePerSlot: 900 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if court sport belongs to different tenant', async () => {
      prisma.courtSport.findFirst.mockResolvedValue(null);
      await expect(service.update('other-tenant', 'cs-1', { pricePerSlot: 900 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('hard deletes court sport', async () => {
      prisma.courtSport.findFirst.mockResolvedValue(mockCourtSport);
      prisma.courtSport.delete.mockResolvedValue(mockCourtSport);

      await service.remove('tenant-1', 'cs-1');
      expect(prisma.courtSport.delete).toHaveBeenCalledWith({ where: { id: 'cs-1' } });
    });

    it('throws NotFoundException if court sport not found', async () => {
      prisma.courtSport.findFirst.mockResolvedValue(null);
      await expect(service.remove('tenant-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if belongs to different tenant', async () => {
      prisma.courtSport.findFirst.mockResolvedValue(null);
      await expect(service.remove('other-tenant', 'cs-1')).rejects.toThrow(NotFoundException);
    });
  });
});
