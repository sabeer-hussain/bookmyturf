import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SlotsService } from './slots.service';
import { SlotDayOfWeek } from './dto/create-slot-config.dto';

/**
 * The service runs its writes inside prisma.$transaction(async (tx) => ...).
 * We mock $transaction to invoke the callback with a `tx` that delegates to the
 * same mocked prisma models, so the transactional and non-transactional paths
 * share one set of jest mocks.
 */
describe('SlotsService', () => {
  let service: SlotsService;
  let prisma: Record<string, any>;

  const venue = {
    id: 'venue-1',
    tenantId: 'tenant-1',
    isActive: true,
    openTime: '06:00',
    closeTime: '23:00',
  };
  const courtSport = {
    id: 'cs-1',
    baseSlotMinutes: 60,
    pricePerSlot: 800,
    peakPricePerSlot: 1200,
    isActive: true,
    court: { isActive: true, venue },
  };

  const makeConfig = (over: Partial<Record<string, any>> = {}) => ({
    id: 'slot-1',
    courtSportId: 'cs-1',
    dayOfWeek: 'MONDAY',
    startTime: '06:00',
    endTime: '07:00',
    isPeakHour: false,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      courtSport: { findFirst: jest.fn().mockResolvedValue(courtSport) },
      slotConfig: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    // $transaction invokes its callback with the same mocked prisma as `tx`.
    prisma.$transaction = jest.fn((cb: any) => cb(prisma));

    const module = await Test.createTestingModule({
      providers: [SlotsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SlotsService);
  });

  describe('create', () => {
    const dto = {
      dayOfWeek: SlotDayOfWeek.MONDAY,
      startTime: '06:00',
      endTime: '07:00',
      isPeakHour: false,
    };

    it('creates a valid slot config and returns the created row', async () => {
      prisma.slotConfig.findMany.mockResolvedValueOnce([]); // overlap check: no existing
      prisma.slotConfig.create.mockResolvedValue(makeConfig());
      const result = await service.create('tenant-1', 'cs-1', dto);
      expect(prisma.slotConfig.create).toHaveBeenCalled();
      expect(result).toEqual(makeConfig());
    });

    it('returns the newly-created row even when other slots already exist (regression)', async () => {
      prisma.slotConfig.findMany.mockResolvedValueOnce([{ startTime: '06:00', endTime: '07:00' }]);
      const wednesday = makeConfig({
        id: 'slot-wed',
        dayOfWeek: 'WEDNESDAY',
        startTime: '10:00',
        endTime: '11:00',
      });
      prisma.slotConfig.create.mockResolvedValue(wednesday);
      const result = await service.create('tenant-1', 'cs-1', {
        dayOfWeek: SlotDayOfWeek.WEDNESDAY,
        startTime: '10:00',
        endTime: '11:00',
      });
      expect(result.id).toBe('slot-wed');
      expect(result.dayOfWeek).toBe('WEDNESDAY');
    });

    it('throws NotFound if court-sport not owned by tenant', async () => {
      prisma.courtSport.findFirst.mockResolvedValue(null);
      await expect(service.create('other-tenant', 'cs-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('rejects startTime >= endTime (INVALID_SLOT_RANGE)', async () => {
      await expect(
        service.create('tenant-1', 'cs-1', { ...dto, startTime: '07:00', endTime: '06:00' }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_SLOT_RANGE' } });
    });

    it('rejects slot outside venue hours (SLOT_OUTSIDE_OPERATING_HOURS)', async () => {
      await expect(
        service.create('tenant-1', 'cs-1', { ...dto, startTime: '05:00', endTime: '06:00' }),
      ).rejects.toMatchObject({ response: { code: 'SLOT_OUTSIDE_OPERATING_HOURS' } });
    });

    it('rejects slot not aligned to baseSlotMinutes (SLOT_NOT_ALIGNED)', async () => {
      await expect(
        service.create('tenant-1', 'cs-1', { ...dto, startTime: '06:00', endTime: '06:45' }),
      ).rejects.toMatchObject({ response: { code: 'SLOT_NOT_ALIGNED' } });
    });

    it('accepts an aligned multi-base slot (tournament block, 2h on 60m base)', async () => {
      prisma.slotConfig.findMany.mockResolvedValueOnce([]);
      prisma.slotConfig.create.mockResolvedValue(makeConfig({ endTime: '08:00' }));
      await expect(
        service.create('tenant-1', 'cs-1', { ...dto, startTime: '06:00', endTime: '08:00' }),
      ).resolves.toBeDefined();
    });

    it('rejects overlap with existing active slot (SLOT_OVERLAP)', async () => {
      prisma.slotConfig.findMany.mockResolvedValueOnce([{ startTime: '06:30', endTime: '07:30' }]);
      await expect(service.create('tenant-1', 'cs-1', dto)).rejects.toMatchObject({
        response: { code: 'SLOT_OVERLAP' },
      });
      expect(prisma.slotConfig.create).not.toHaveBeenCalled();
    });

    it('allows a slot adjacent to an existing one (no overlap)', async () => {
      prisma.slotConfig.findMany.mockResolvedValueOnce([{ startTime: '05:00', endTime: '06:00' }]);
      prisma.slotConfig.create.mockResolvedValue(makeConfig());
      await expect(service.create('tenant-1', 'cs-1', dto)).resolves.toBeDefined();
    });
  });

  describe('bulkCreate', () => {
    it('creates multiple valid slots and returns only the created rows', async () => {
      prisma.slotConfig.findMany.mockResolvedValueOnce([]); // overlap check for MONDAY
      prisma.slotConfig.create
        .mockResolvedValueOnce(makeConfig())
        .mockResolvedValueOnce(makeConfig({ id: 'slot-2', startTime: '07:00', endTime: '08:00' }));
      const result = await service.bulkCreate('tenant-1', 'cs-1', {
        slots: [
          { dayOfWeek: SlotDayOfWeek.MONDAY, startTime: '06:00', endTime: '07:00' },
          { dayOfWeek: SlotDayOfWeek.MONDAY, startTime: '07:00', endTime: '08:00' },
        ],
      } as any);
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toEqual(['slot-1', 'slot-2']);
      expect(prisma.slotConfig.create).toHaveBeenCalledTimes(2);
    });

    it('rejects the whole batch if two slots overlap within the payload (all-or-nothing)', async () => {
      await expect(
        service.bulkCreate('tenant-1', 'cs-1', {
          slots: [
            { dayOfWeek: SlotDayOfWeek.MONDAY, startTime: '06:00', endTime: '07:00' },
            { dayOfWeek: SlotDayOfWeek.MONDAY, startTime: '06:00', endTime: '07:00' },
          ],
        } as any),
      ).rejects.toMatchObject({ response: { code: 'SLOT_OVERLAP' } });
      expect(prisma.slotConfig.create).not.toHaveBeenCalled();
    });

    it('rejects the whole batch if one slot is misaligned', async () => {
      await expect(
        service.bulkCreate('tenant-1', 'cs-1', {
          slots: [
            { dayOfWeek: SlotDayOfWeek.MONDAY, startTime: '06:00', endTime: '07:00' },
            { dayOfWeek: SlotDayOfWeek.MONDAY, startTime: '07:00', endTime: '07:45' },
          ],
        } as any),
      ).rejects.toMatchObject({ response: { code: 'SLOT_NOT_ALIGNED' } });
      expect(prisma.slotConfig.create).not.toHaveBeenCalled();
    });

    it('allows same time range on different days', async () => {
      prisma.slotConfig.findMany.mockResolvedValue([]);
      prisma.slotConfig.create
        .mockResolvedValueOnce(makeConfig())
        .mockResolvedValueOnce(makeConfig({ id: 'slot-tue', dayOfWeek: 'TUESDAY' }));
      await expect(
        service.bulkCreate('tenant-1', 'cs-1', {
          slots: [
            { dayOfWeek: SlotDayOfWeek.MONDAY, startTime: '06:00', endTime: '07:00' },
            { dayOfWeek: SlotDayOfWeek.TUESDAY, startTime: '06:00', endTime: '07:00' },
          ],
        } as any),
      ).resolves.toBeDefined();
    });
  });

  describe('findAllByCourtSport', () => {
    it('returns active configs sorted by day then start time', async () => {
      prisma.slotConfig.findMany.mockResolvedValue([
        makeConfig({ id: 'a', dayOfWeek: 'TUESDAY', startTime: '06:00' }),
        makeConfig({ id: 'b', dayOfWeek: 'MONDAY', startTime: '18:00' }),
        makeConfig({ id: 'c', dayOfWeek: 'MONDAY', startTime: '06:00' }),
      ]);
      const result = await service.findAllByCourtSport('tenant-1', 'cs-1');
      expect(result.map((s) => s.id)).toEqual(['c', 'b', 'a']);
    });

    it('throws NotFound if court-sport not owned by tenant', async () => {
      prisma.courtSport.findFirst.mockResolvedValue(null);
      await expect(service.findAllByCourtSport('other-tenant', 'cs-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates isActive toggle without time revalidation', async () => {
      prisma.slotConfig.findFirst.mockResolvedValue(makeConfig());
      prisma.slotConfig.update.mockResolvedValue(makeConfig({ isActive: false }));
      const result = await service.update('tenant-1', 'slot-1', { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('revalidates and rejects a misaligned time update', async () => {
      prisma.slotConfig.findFirst.mockResolvedValue(makeConfig());
      await expect(
        service.update('tenant-1', 'slot-1', { endTime: '06:45' }),
      ).rejects.toMatchObject({ response: { code: 'SLOT_NOT_ALIGNED' } });
    });

    it('rejects a time update that overlaps another existing slot', async () => {
      prisma.slotConfig.findFirst.mockResolvedValue(makeConfig());
      prisma.slotConfig.findMany.mockResolvedValue([{ startTime: '08:00', endTime: '09:00' }]);
      await expect(
        service.update('tenant-1', 'slot-1', { startTime: '08:00', endTime: '09:00' }),
      ).rejects.toMatchObject({ response: { code: 'SLOT_OVERLAP' } });
    });

    it('throws NotFound if slot not owned by tenant', async () => {
      prisma.slotConfig.findFirst.mockResolvedValue(null);
      await expect(service.update('other-tenant', 'slot-1', { isPeakHour: true })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('hard deletes a slot config', async () => {
      prisma.slotConfig.findFirst.mockResolvedValue(makeConfig());
      prisma.slotConfig.delete.mockResolvedValue(makeConfig());
      await service.remove('tenant-1', 'slot-1');
      expect(prisma.slotConfig.delete).toHaveBeenCalledWith({ where: { id: 'slot-1' } });
    });

    it('throws NotFound if slot not owned by tenant', async () => {
      prisma.slotConfig.findFirst.mockResolvedValue(null);
      await expect(service.remove('other-tenant', 'slot-1')).rejects.toThrow(NotFoundException);
    });
  });
});
