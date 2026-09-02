import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { HH_MM_REGEX } from '@bookmyturf/shared';

/** Prisma DayOfWeek enum values (kept local to avoid a runtime import of @prisma/client in DTOs). */
export enum SlotDayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export class CreateSlotConfigDto {
  @ApiProperty({ enum: SlotDayOfWeek, example: SlotDayOfWeek.MONDAY, description: 'Day of week' })
  @IsEnum(SlotDayOfWeek, { message: 'dayOfWeek must be a valid day (MONDAY..SUNDAY)' })
  dayOfWeek!: SlotDayOfWeek;

  @ApiProperty({ example: '06:00', description: 'Slot start time in HH:mm 24hr format' })
  @IsString()
  @IsNotEmpty()
  @Matches(HH_MM_REGEX, { message: 'startTime must be in HH:mm 24-hour format (e.g., 06:00)' })
  startTime!: string;

  @ApiProperty({ example: '07:00', description: 'Slot end time in HH:mm 24hr format' })
  @IsString()
  @IsNotEmpty()
  @Matches(HH_MM_REGEX, { message: 'endTime must be in HH:mm 24-hour format (e.g., 07:00)' })
  endTime!: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this slot is a peak-hour slot',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPeakHour?: boolean;
}
