import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { YYYY_MM_DD_REGEX } from '@bookmyturf/shared';

/**
 * Query params for availability lookup.
 * Defined now (issue #29) and reused by the Sprint 5 public availability endpoint.
 */
export class AvailabilityQueryDto {
  @ApiProperty({
    example: '2026-06-20',
    description: 'Date to compute availability for (YYYY-MM-DD)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(YYYY_MM_DD_REGEX, { message: 'date must be in YYYY-MM-DD format (e.g., 2026-06-20)' })
  date!: string;
}
