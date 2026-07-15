import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export enum CourtSurfaceType {
  ARTIFICIAL_TURF = 'artificial_turf',
  NATURAL_GRASS = 'natural_grass',
  SYNTHETIC_FLOORING = 'synthetic_flooring',
  WOODEN = 'wooden',
  CONCRETE = 'concrete',
  ACRYLIC = 'acrylic',
  MAT = 'mat',
}

export class CreateCourtDto {
  @ApiProperty({ example: 'Court A', description: 'Court name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Main football court with floodlights' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: false, description: 'Whether court is indoor' })
  @IsOptional()
  @IsBoolean()
  isIndoor?: boolean;

  @ApiPropertyOptional({
    example: 'artificial_turf',
    description: 'Court surface type',
    enum: CourtSurfaceType,
  })
  @IsOptional()
  @IsEnum(CourtSurfaceType, { message: 'surfaceType must be a valid surface type' })
  surfaceType?: CourtSurfaceType;

  @ApiPropertyOptional({ example: '100x50 ft', description: 'Court dimensions' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dimensions?: string;

  @ApiPropertyOptional({ example: 14, description: 'Maximum players allowed' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPlayers?: number;

  @ApiPropertyOptional({
    example: ['https://cdn.bookmyturf.in/courts/img1.jpg'],
    description: 'Array of image URLs (max 5)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Maximum 5 images allowed per court' })
  @IsUrl({ require_tld: false }, { each: true, message: 'Each image must be a valid URL' })
  images?: string[];
}

export class UpdateCourtDto {
  @ApiPropertyOptional({ example: 'Court A Premium', description: 'Court name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Upgraded football court' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isIndoor?: boolean;

  @ApiPropertyOptional({ example: 'artificial_turf', enum: CourtSurfaceType })
  @IsOptional()
  @IsEnum(CourtSurfaceType, { message: 'surfaceType must be a valid surface type' })
  surfaceType?: CourtSurfaceType;

  @ApiPropertyOptional({ example: '100x50 ft' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dimensions?: string;

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPlayers?: number;

  @ApiPropertyOptional({
    example: ['https://cdn.bookmyturf.in/courts/img1.jpg'],
    description: 'Array of image URLs (max 5)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Maximum 5 images allowed per court' })
  @IsUrl({ require_tld: false }, { each: true, message: 'Each image must be a valid URL' })
  images?: string[];
}
