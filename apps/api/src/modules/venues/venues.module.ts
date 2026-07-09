import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [VenuesController],
  providers: [VenuesService],
  exports: [VenuesService],
})
export class VenuesModule {}
