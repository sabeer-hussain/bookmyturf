import { Module } from '@nestjs/common';
import { SlotsService } from './slots.service';
import { CourtSportSlotsController } from './court-sport-slots.controller';
import { SlotConfigsController } from './slot-configs.controller';

@Module({
  controllers: [CourtSportSlotsController, SlotConfigsController],
  providers: [SlotsService],
  exports: [SlotsService],
})
export class SlotsModule {}
