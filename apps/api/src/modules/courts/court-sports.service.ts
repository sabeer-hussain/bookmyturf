import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CourtSport, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourtSportDto, UpdateCourtSportDto } from './dto/create-court-sport.dto';

@Injectable()
export class CourtSportsService {
  constructor(private prisma: PrismaService) {}

  async addSportToCourt(
    tenantId: string,
    courtId: string,
    dto: CreateCourtSportDto,
  ): Promise<CourtSport> {
    // Verify court belongs to tenant and is active
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

    // Verify sport exists and is active
    const sport = await this.prisma.sport.findFirst({
      where: { id: dto.sportId, isActive: true },
    });

    if (!sport) {
      throw new NotFoundException('Sport not found');
    }

    try {
      return await this.prisma.courtSport.create({
        data: {
          courtId,
          sportId: dto.sportId,
          baseSlotMinutes: dto.baseSlotMinutes ?? 60,
          pricePerSlot: dto.pricePerSlot,
          peakPricePerSlot: dto.peakPricePerSlot,
          maxConsecutiveSlots: dto.maxConsecutiveSlots ?? 4,
        },
        include: { sport: { select: { id: true, name: true, icon: true } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This sport is already configured for this court');
      }
      throw error;
    }
  }

  async findAllByCourt(tenantId: string, courtId: string) {
    // Verify court belongs to tenant
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

    return this.prisma.courtSport.findMany({
      where: { courtId, isActive: true },
      include: { sport: { select: { id: true, name: true, icon: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(
    tenantId: string,
    courtSportId: string,
    dto: UpdateCourtSportDto,
  ): Promise<CourtSport> {
    const courtSport = await this.prisma.courtSport.findFirst({
      where: {
        id: courtSportId,
        isActive: true,
        court: { isActive: true, venue: { tenantId, isActive: true } },
      },
    });

    if (!courtSport) {
      throw new NotFoundException('Court sport configuration not found');
    }

    return this.prisma.courtSport.update({
      where: { id: courtSportId },
      data: dto,
      include: { sport: { select: { id: true, name: true, icon: true } } },
    });
  }

  async remove(tenantId: string, courtSportId: string): Promise<void> {
    const courtSport = await this.prisma.courtSport.findFirst({
      where: {
        id: courtSportId,
        court: { isActive: true, venue: { tenantId, isActive: true } },
      },
    });

    if (!courtSport) {
      throw new NotFoundException('Court sport configuration not found');
    }

    await this.prisma.courtSport.delete({
      where: { id: courtSportId },
    });
  }
}
