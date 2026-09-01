import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SlotsService } from './slots.service';
import { CreateSlotConfigDto } from './dto/create-slot-config.dto';
import { BulkCreateSlotsDto } from './dto/bulk-create-slots.dto';

@ApiTags('Slot Configuration')
@ApiBearerAuth()
@Controller('court-sports/:courtSportId/slots')
export class CourtSportSlotsController {
  constructor(private slotsService: SlotsService) {}

  @Post()
  @Roles('TURF_OWNER', 'TURF_MANAGER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a slot config for a court-sport' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Param('courtSportId') courtSportId: string,
    @Body() dto: CreateSlotConfigDto,
  ) {
    return this.slotsService.create(tenantId, courtSportId, dto);
  }

  @Get()
  @Roles('TURF_OWNER', 'TURF_MANAGER')
  @ApiOperation({
    summary: 'List slot configs for a court-sport (ordered Mon→Sun, then start time)',
  })
  findAll(@CurrentUser('tenantId') tenantId: string, @Param('courtSportId') courtSportId: string) {
    return this.slotsService.findAllByCourtSport(tenantId, courtSportId);
  }

  @Post('bulk')
  @Roles('TURF_OWNER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create slot configs for the week (all-or-nothing)' })
  bulkCreate(
    @CurrentUser('tenantId') tenantId: string,
    @Param('courtSportId') courtSportId: string,
    @Body() dto: BulkCreateSlotsDto,
  ) {
    return this.slotsService.bulkCreate(tenantId, courtSportId, dto);
  }
}
