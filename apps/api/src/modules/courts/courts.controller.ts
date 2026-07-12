import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CourtsService } from './courts.service';
import { CourtSportsService } from './court-sports.service';
import { UpdateCourtDto } from './dto/create-court.dto';
import { CreateCourtSportDto } from './dto/create-court-sport.dto';

@ApiTags('Courts')
@ApiBearerAuth()
@Controller('courts')
export class CourtsController {
  constructor(
    private courtsService: CourtsService,
    private courtSportsService: CourtSportsService,
  ) {}

  @Get(':id')
  @Roles('TURF_OWNER', 'TURF_MANAGER', 'TURF_STAFF')
  @ApiOperation({ summary: 'Get court details with sports configuration' })
  findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.courtsService.findById(tenantId, id);
  }

  @Patch(':id')
  @Roles('TURF_OWNER')
  @ApiOperation({ summary: 'Update court details' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCourtDto,
  ) {
    return this.courtsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('TURF_OWNER')
  @ApiOperation({ summary: 'Deactivate court (soft delete)' })
  deactivate(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.courtsService.deactivate(tenantId, id);
  }

  @Post(':courtId/sports')
  @Roles('TURF_OWNER')
  @ApiOperation({ summary: 'Add sport to court with pricing configuration' })
  addSport(
    @CurrentUser('tenantId') tenantId: string,
    @Param('courtId') courtId: string,
    @Body() dto: CreateCourtSportDto,
  ) {
    return this.courtSportsService.addSportToCourt(tenantId, courtId, dto);
  }

  @Get(':courtId/sports')
  @Roles('TURF_OWNER', 'TURF_MANAGER')
  @ApiOperation({ summary: 'List sports configured for a court' })
  findSports(@CurrentUser('tenantId') tenantId: string, @Param('courtId') courtId: string) {
    return this.courtSportsService.findAllByCourt(tenantId, courtId);
  }
}
