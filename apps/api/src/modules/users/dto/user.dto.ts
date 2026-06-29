import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Gender } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Rahul' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Kumar' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ example: 'MALE', enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender?: Gender;
}
