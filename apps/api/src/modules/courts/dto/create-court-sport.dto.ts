import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCourtSportDto {
  @ApiProperty({ example: 'clx...', description: 'Sport ID' })
  @IsString()
  @IsNotEmpty()
  sportId!: string;

  @ApiPropertyOptional({ example: 60, description: 'Base slot duration in minutes', default: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  baseSlotMinutes?: number;

  @ApiProperty({ example: 800, description: 'Price per slot in INR' })
  @IsNumber()
  @Min(0.01, { message: 'pricePerSlot must be greater than 0' })
  pricePerSlot!: number;

  @ApiPropertyOptional({ example: 1200, description: 'Peak hour price per slot in INR' })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'peakPricePerSlot must be greater than 0' })
  peakPricePerSlot?: number;

  @ApiPropertyOptional({ example: 3, description: 'Max consecutive slots bookable', default: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxConsecutiveSlots?: number;
}

export class UpdateCourtSportDto {
  @ApiPropertyOptional({ example: 60, description: 'Base slot duration in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  baseSlotMinutes?: number;

  @ApiPropertyOptional({ example: 900, description: 'Price per slot in INR' })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'pricePerSlot must be greater than 0' })
  pricePerSlot?: number;

  @ApiPropertyOptional({ example: 1400, description: 'Peak hour price per slot in INR' })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'peakPricePerSlot must be greater than 0' })
  peakPricePerSlot?: number;

  @ApiPropertyOptional({ example: 3, description: 'Max consecutive slots bookable' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxConsecutiveSlots?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether this sport config is active' })
  @IsOptional()
  isActive?: boolean;
}
