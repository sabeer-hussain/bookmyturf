import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateSlotConfigDto } from './create-slot-config.dto';

/** Upper bound: 7 days × generous per-day slot count. Guards against abusive payloads. */
const MAX_BULK_SLOTS = 500;

export class BulkCreateSlotsDto {
  @ApiProperty({
    type: [CreateSlotConfigDto],
    description: 'Explicit list of slot configs to create for the week (all-or-nothing)',
    example: [
      { dayOfWeek: 'MONDAY', startTime: '06:00', endTime: '07:00', isPeakHour: false },
      { dayOfWeek: 'MONDAY', startTime: '18:00', endTime: '19:00', isPeakHour: true },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'slots must contain at least one entry' })
  @ArrayMaxSize(MAX_BULK_SLOTS, { message: `slots cannot exceed ${MAX_BULK_SLOTS} entries` })
  @ValidateNested({ each: true })
  @Type(() => CreateSlotConfigDto)
  slots!: CreateSlotConfigDto[];
}
