import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CourtsController } from './courts.controller';
import { VenueCourtsController } from './venue-courts.controller';
import { CourtSportsController } from './court-sports.controller';
import { CourtsService } from './courts.service';
import { CourtSportsService } from './court-sports.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [VenueCourtsController, CourtsController, CourtSportsController],
  providers: [CourtsService, CourtSportsService],
  exports: [CourtsService, CourtSportsService],
})
export class CourtsModule {}
