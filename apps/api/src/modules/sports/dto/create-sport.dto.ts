import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSportDto {
  @ApiProperty({ example: 'Pickleball', description: 'Sport name (unique)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'pickleball', description: 'Icon identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;
}

export class UpdateSportDto {
  @ApiPropertyOptional({ example: 'Pickleball', description: 'Sport name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'pickleball', description: 'Icon identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether sport is active' })
  @IsOptional()
  isActive?: boolean;
}
