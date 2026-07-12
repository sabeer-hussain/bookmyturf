import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SportsService } from './sports.service';

describe('SportsService', () => {
  let service: SportsService;
  let prisma: Record<string, any>;

  const mockSport = {
    id: 'sport-1',
    name: 'Football',
    icon: 'football',
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      sport: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [SportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SportsService);
  });

  describe('findAll', () => {
    it('returns all active sports', async () => {
      prisma.sport.findMany.mockResolvedValue([mockSport]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(prisma.sport.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('creates a sport successfully', async () => {
      prisma.sport.create.mockResolvedValue(mockSport);

      const result = await service.create({ name: 'Football', icon: 'football' });
      expect(result.name).toBe('Football');
    });

    it('throws ConflictException on duplicate name', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      prisma.sport.create.mockRejectedValue(p2002Error);

      await expect(service.create({ name: 'Football' })).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates sport successfully', async () => {
      prisma.sport.findUnique.mockResolvedValue(mockSport);
      prisma.sport.update.mockResolvedValue({ ...mockSport, icon: 'soccer' });

      const result = await service.update('sport-1', { icon: 'soccer' });
      expect(result.icon).toBe('soccer');
    });

    it('throws NotFoundException if sport not found', async () => {
      prisma.sport.findUnique.mockResolvedValue(null);
      await expect(service.update('bad-id', { icon: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException on duplicate name during update', async () => {
      prisma.sport.findUnique.mockResolvedValue(mockSport);
      const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      prisma.sport.update.mockRejectedValue(p2002Error);

      await expect(service.update('sport-1', { name: 'Cricket' })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
