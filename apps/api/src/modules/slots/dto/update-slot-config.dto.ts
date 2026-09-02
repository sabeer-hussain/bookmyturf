import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { HH_MM_REGEX } from '@bookmyturf/shared';
import { SlotDayOfWeek } from './create-slot-config.dto';

export class UpdateSlotConfigDto {
  @ApiPropertyOptional({ enum: SlotDayOfWeek, description: 'Day of week' })
  @IsOptional()
  @IsEnum(SlotDayOfWeek, { message: 'dayOfWeek must be a valid day (MONDAY..SUNDAY)' })
  dayOfWeek?: SlotDayOfWeek;

  @ApiPropertyOptional({ example: '06:00', description: 'Slot start time in HH:mm 24hr format' })
  @IsOptional()
  @IsString()
  @Matches(HH_MM_REGEX, { message: 'startTime must be in HH:mm 24-hour format (e.g., 06:00)' })
  startTime?: string;

  @ApiPropertyOptional({ example: '07:00', description: 'Slot end time in HH:mm 24hr format' })
  @IsOptional()
  @IsString()
  @Matches(HH_MM_REGEX, { message: 'endTime must be in HH:mm 24-hour format (e.g., 07:00)' })
  endTime?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether this slot is a peak-hour slot' })
  @IsOptional()
  @IsBoolean()
  isPeakHour?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable/disable this slot config without deleting it',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
