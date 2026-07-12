import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Sport } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSportDto, UpdateSportDto } from './dto/create-sport.dto';

@Injectable()
export class SportsService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Sport[]> {
    return this.prisma.sport.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateSportDto): Promise<Sport> {
    try {
      return await this.prisma.sport.create({
        data: {
          name: dto.name,
          icon: dto.icon,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Sport with this name already exists');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateSportDto): Promise<Sport> {
    const sport = await this.prisma.sport.findUnique({ where: { id } });

    if (!sport) {
      throw new NotFoundException('Sport not found');
    }

    try {
      return await this.prisma.sport.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Sport with this name already exists');
      }
      throw error;
    }
  }
}
