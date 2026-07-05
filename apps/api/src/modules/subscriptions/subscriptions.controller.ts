import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@Controller()
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'List available subscription plans' })
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Get('subscriptions/current')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current tenant subscription' })
  getCurrentSubscription(@CurrentUser() user: any) {
    return this.subscriptionsService.getCurrentSubscription(user.tenantId);
  }
}
