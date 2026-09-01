import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourtSport, DayOfWeek, Prisma, SlotConfig, Venue } from '@prisma/client';
import { IAvailabilityResponse, SlotStatus } from '@bookmyturf/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSlotConfigDto } from './dto/create-slot-config.dto';
import { UpdateSlotConfigDto } from './dto/update-slot-config.dto';
import { BulkCreateSlotsDto } from './dto/bulk-create-slots.dto';
import {
  durationMinutes,
  findFirstOverlap,
  isAlignedToBase,
  isWithinOperatingHours,
  rangesOverlap,
  resolveWeekday,
  TimeRange,
} from './slot-time.util';

/**
 * Prisma includes needed to resolve tenant + venue hours + baseSlotMinutes from
 * a court-sport in a single query.
 */
const COURT_SPORT_WITH_CONTEXT = {
  court: { include: { venue: true } },
} satisfies Prisma.CourtSportInclude;

type CourtSportWithContext = CourtSport & {
  court: { isActive: boolean; venue: Venue };
};

/** Weekday ordering (Mon → Sun) matching the Prisma DayOfWeek enum declaration order. */
const DAY_ORDER: Record<DayOfWeek, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
  SATURDAY: 5,
  SUNDAY: 6,
};

@Injectable()
export class SlotsService {
  constructor(private prisma: PrismaService) {}

  /** Create a single slot config for a court-sport. */
  async create(
    tenantId: string,
    courtSportId: string,
    dto: CreateSlotConfigDto,
  ): Promise<SlotConfig> {
    return this.prisma.$transaction(async (tx) => {
      const courtSport = await this.loadCourtSportContext(tx, courtSportId, tenantId);
      this.validateSingleRange(dto, courtSport);
      await this.assertNoOverlap(tx, courtSportId, dto.dayOfWeek as DayOfWeek, [dto]);

      return tx.slotConfig.create({
        data: {
          courtSportId,
          dayOfWeek: dto.dayOfWeek as DayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
          isPeakHour: dto.isPeakHour ?? false,
        },
      });
    });
  }

  /**
   * Bulk create slot configs for a court-sport (all-or-nothing).
   * Returns only the rows created by this call.
   */
  async bulkCreate(
    tenantId: string,
    courtSportId: string,
    dto: BulkCreateSlotsDto,
  ): Promise<SlotConfig[]> {
    return this.prisma.$transaction(async (tx) => {
      const courtSport = await this.loadCourtSportContext(tx, courtSportId, tenantId);

      // 1. Per-slot structural validation (start<end, within hours, alignment).
      for (const slot of dto.slots) {
        this.validateSingleRange(slot, courtSport);
      }

      // 2. Intra-batch overlap: no two slots in the same payload may overlap on the same day.
      this.assertNoOverlapWithinBatch(dto.slots);

      // 3. Cross-batch overlap: none may overlap existing active configs (per day).
      const byDay = this.groupByDay(dto.slots);
      for (const [dayOfWeek, ranges] of byDay) {
        await this.assertNoOverlap(tx, courtSportId, dayOfWeek, ranges);
      }

      // 4. Insert each and collect the created rows (createMany does not return rows).
      const created: SlotConfig[] = [];
      for (const slot of dto.slots) {
        const row = await tx.slotConfig.create({
          data: {
            courtSportId,
            dayOfWeek: slot.dayOfWeek as DayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isPeakHour: slot.isPeakHour ?? false,
          },
        });
        created.push(row);
      }
      return created;
    });
  }

  /**
   * List active slot configs for a court-sport, ordered by day (Mon→Sun) then start time.
   */
  async findAllByCourtSport(tenantId: string, courtSportId: string): Promise<SlotConfig[]> {
    await this.getCourtSportOrThrow(tenantId, courtSportId);

    const configs = await this.prisma.slotConfig.findMany({
      where: { courtSportId, isActive: true },
    });

    return configs.sort((a, b) => {
      const dayDiff = DAY_ORDER[a.dayOfWeek] - DAY_ORDER[b.dayOfWeek];
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  /** Update a slot config (fields, peak flag, or isActive toggle). */
  async update(
    tenantId: string,
    slotConfigId: string,
    dto: UpdateSlotConfigDto,
  ): Promise<SlotConfig> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.getSlotConfigOrThrow(tx, tenantId, slotConfigId);
      const courtSport = await this.loadCourtSportContext(tx, existing.courtSportId, tenantId);

      const next = {
        dayOfWeek: dto.dayOfWeek ?? existing.dayOfWeek,
        startTime: dto.startTime ?? existing.startTime,
        endTime: dto.endTime ?? existing.endTime,
        isPeakHour: dto.isPeakHour ?? existing.isPeakHour,
        isActive: dto.isActive ?? existing.isActive,
      };

      // Only re-validate time/placement when a time-affecting field changes and the
      // slot remains active (an inactive slot can't conflict with anything).
      const timeChanged =
        dto.startTime !== undefined || dto.endTime !== undefined || dto.dayOfWeek !== undefined;

      if (next.isActive && (timeChanged || dto.isActive === true)) {
        this.validateSingleRange(next, courtSport);
        await this.assertNoOverlap(tx, existing.courtSportId, next.dayOfWeek, [next], slotConfigId);
      }

      return tx.slotConfig.update({ where: { id: slotConfigId }, data: next });
    });
  }

  /** Hard-delete a slot config. */
  async remove(tenantId: string, slotConfigId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.getSlotConfigOrThrow(tx, tenantId, slotConfigId);
      await tx.slotConfig.delete({ where: { id: slotConfigId } });
    });
  }

  /**
   * Compute slot availability for a court-sport on a given date.
   *
   * Pure/deterministic: expands the court-sport's active slot configs for the
   * date's weekday into a priced grid. Every slot is AVAILABLE for now — the
   * booked-slot subtraction seam (see below) returns none until Sprint 5 wires
   * in Booking/BookingSlot. Reused unchanged by the Sprint 5 public endpoint.
   *
   * Note: no past-date/lead-time filtering here — that is a Sprint 5 booking concern.
   */
  async computeAvailability(
    tenantId: string,
    courtSportId: string,
    date: string,
  ): Promise<IAvailabilityResponse> {
    const courtSport = await this.loadCourtSportWithSport(tenantId, courtSportId);

    let weekday: DayOfWeek;
    try {
      weekday = resolveWeekday(date) as DayOfWeek;
    } catch {
      throw new BadRequestException({
        code: 'INVALID_DATE',
        message: `Invalid date "${date}"; expected a valid calendar date in YYYY-MM-DD format`,
      });
    }

    const configs = await this.prisma.slotConfig.findMany({
      where: { courtSportId, dayOfWeek: weekday, isActive: true },
      orderBy: { startTime: 'asc' },
    });

    const basePrice = Number(courtSport.pricePerSlot);
    const peakPrice =
      courtSport.peakPricePerSlot != null ? Number(courtSport.peakPricePerSlot) : null;

    // Booked-slot subtraction seam (Sprint 5): given a date, load booked BookingSlots
    // for this court-sport and mark matching grid slots as BOOKED. Returns none for now.
    const bookedRanges: TimeRange[] = [];

    const slots = configs
      .map((config) => {
        const isBooked = bookedRanges.some((b) =>
          rangesOverlap({ startTime: config.startTime, endTime: config.endTime }, b),
        );
        const price = config.isPeakHour && peakPrice != null ? peakPrice : basePrice;
        return {
          startTime: config.startTime,
          endTime: config.endTime,
          status: isBooked ? SlotStatus.BOOKED : SlotStatus.AVAILABLE,
          price,
        };
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return {
      date,
      courtSport: {
        id: courtSport.id,
        sportName: courtSport.sport.name,
        pricePerSlot: basePrice,
      },
      slots,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────────────────────────────────────

  /** Structural validation for a single slot range against its court-sport/venue. */
  private validateSingleRange(
    range: { startTime: string; dayOfWeek: string; endTime: string },
    courtSport: CourtSportWithContext,
  ): void {
    const timeRange: TimeRange = { startTime: range.startTime, endTime: range.endTime };

    if (durationMinutes(timeRange) <= 0) {
      throw new BadRequestException({
        code: 'INVALID_SLOT_RANGE',
        message: `startTime (${range.startTime}) must be before endTime (${range.endTime})`,
      });
    }

    const { openTime, closeTime } = courtSport.court.venue;
    if (!isWithinOperatingHours(timeRange, openTime, closeTime)) {
      throw new BadRequestException({
        code: 'SLOT_OUTSIDE_OPERATING_HOURS',
        message: `Slot ${range.startTime}-${range.endTime} is outside venue hours (${openTime}-${closeTime})`,
      });
    }

    if (!isAlignedToBase(timeRange, courtSport.baseSlotMinutes)) {
      throw new BadRequestException({
        code: 'SLOT_NOT_ALIGNED',
        message: `Slot ${range.startTime}-${range.endTime} must be a multiple of the base slot duration (${courtSport.baseSlotMinutes} min)`,
      });
    }
  }

  /** Rejects overlaps among slots in the same submitted batch (grouped by day). */
  private assertNoOverlapWithinBatch(slots: CreateSlotConfigDto[]): void {
    const byDay = this.groupByDay(slots);
    for (const [, ranges] of byDay) {
      const overlap = findFirstOverlap(ranges);
      if (overlap) {
        const [i, j] = overlap;
        throw new ConflictException({
          code: 'SLOT_OVERLAP',
          message: `Slots ${ranges[i].startTime}-${ranges[i].endTime} and ${ranges[j].startTime}-${ranges[j].endTime} overlap`,
        });
      }
    }
  }

  /** Rejects overlaps against existing active configs for the same court-sport + day. */
  private async assertNoOverlap(
    tx: Prisma.TransactionClient,
    courtSportId: string,
    dayOfWeek: DayOfWeek,
    incoming: TimeRange[],
    excludeSlotConfigId?: string,
  ): Promise<void> {
    const existing = await tx.slotConfig.findMany({
      where: {
        courtSportId,
        dayOfWeek,
        isActive: true,
        ...(excludeSlotConfigId ? { id: { not: excludeSlotConfigId } } : {}),
      },
      select: { startTime: true, endTime: true },
    });

    for (const incomingRange of incoming) {
      const clash = existing.find((e) => rangesOverlap(incomingRange, e));
      if (clash) {
        throw new ConflictException({
          code: 'SLOT_OVERLAP',
          message: `Slot ${incomingRange.startTime}-${incomingRange.endTime} overlaps an existing slot ${clash.startTime}-${clash.endTime} on ${dayOfWeek}`,
        });
      }
    }
  }

  private groupByDay(slots: CreateSlotConfigDto[]): Map<DayOfWeek, TimeRange[]> {
    const map = new Map<DayOfWeek, TimeRange[]>();
    for (const slot of slots) {
      const day = slot.dayOfWeek as DayOfWeek;
      const ranges = map.get(day) ?? [];
      ranges.push({ startTime: slot.startTime, endTime: slot.endTime });
      map.set(day, ranges);
    }
    return map;
  }

  /**
   * Loads a court-sport with venue context, enforcing tenant ownership via
   * courtSport → court → venue → tenantId. Throws NotFound if it doesn't belong
   * to the tenant (or isn't active).
   */
  private async loadCourtSportContext(
    tx: Prisma.TransactionClient,
    courtSportId: string,
    tenantId?: string,
  ): Promise<CourtSportWithContext> {
    const courtSport = await tx.courtSport.findFirst({
      where: {
        id: courtSportId,
        isActive: true,
        court: {
          isActive: true,
          venue: { isActive: true, ...(tenantId ? { tenantId } : {}) },
        },
      },
      include: COURT_SPORT_WITH_CONTEXT,
    });

    if (!courtSport) {
      throw new NotFoundException('Court sport configuration not found');
    }
    return courtSport as CourtSportWithContext;
  }

  /** Non-transactional court-sport ownership check (for read paths). */
  private async getCourtSportOrThrow(
    tenantId: string,
    courtSportId: string,
  ): Promise<CourtSportWithContext> {
    return this.loadCourtSportContext(this.prisma, courtSportId, tenantId);
  }

  /**
   * Loads a tenant-scoped court-sport including its sport (for `sportName`).
   * Used by availability computation.
   */
  private async loadCourtSportWithSport(
    tenantId: string,
    courtSportId: string,
  ): Promise<CourtSport & { sport: { name: string } }> {
    const courtSport = await this.prisma.courtSport.findFirst({
      where: {
        id: courtSportId,
        isActive: true,
        court: { isActive: true, venue: { isActive: true, tenantId } },
      },
      include: { sport: { select: { name: true } } },
    });

    if (!courtSport) {
      throw new NotFoundException('Court sport configuration not found');
    }
    return courtSport;
  }

  /**
   * Loads a slot config and verifies tenant ownership through its court-sport chain.
   */
  private async getSlotConfigOrThrow(
    tx: Prisma.TransactionClient,
    tenantId: string,
    slotConfigId: string,
  ): Promise<SlotConfig> {
    const slotConfig = await tx.slotConfig.findFirst({
      where: {
        id: slotConfigId,
        courtSport: {
          court: { venue: { tenantId } },
        },
      },
    });

    if (!slotConfig) {
      throw new NotFoundException('Slot configuration not found');
    }
    return slotConfig;
  }
}
