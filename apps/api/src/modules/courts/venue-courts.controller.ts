import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CourtsService } from './courts.service';
import { CreateCourtDto } from './dto/create-court.dto';

@ApiTags('Courts')
@ApiBearerAuth()
@Controller('venues/:venueId/courts')
export class VenueCourtsController {
  constructor(private courtsService: CourtsService) {}

  @Post()
  @Roles('TURF_OWNER')
  @ApiOperation({ summary: 'Create a court in a venue' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Param('venueId') venueId: string,
    @Body() dto: CreateCourtDto,
  ) {
    return this.courtsService.create(tenantId, venueId, dto);
  }

  @Get()
  @Roles('TURF_OWNER', 'TURF_MANAGER', 'TURF_STAFF')
  @ApiOperation({ summary: 'List courts in a venue' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Param('venueId') venueId: string) {
    return this.courtsService.findAllByVenue(tenantId, venueId);
  }
}
