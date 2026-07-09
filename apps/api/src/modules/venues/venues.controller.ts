import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@ApiTags('Venues')
@ApiBearerAuth()
@Controller('venues')
export class VenuesController {
  constructor(private venuesService: VenuesService) {}

  @Post()
  @Roles('TURF_OWNER')
  @ApiOperation({ summary: 'Create a new venue' })
  create(@CurrentUser('tenantId') tenantId: string, @Body() dto: CreateVenueDto) {
    return this.venuesService.create(tenantId, dto);
  }

  @Get()
  @Roles('TURF_OWNER', 'TURF_MANAGER')
  @ApiOperation({ summary: "List tenant's venues (paginated)" })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() query: PaginationQueryDto) {
    return this.venuesService.findAll(tenantId, query);
  }

  @Get(':id')
  @Roles('TURF_OWNER', 'TURF_MANAGER')
  @ApiOperation({ summary: 'Get venue details with courts count' })
  findById(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.venuesService.findById(tenantId, id);
  }

  @Patch(':id')
  @Roles('TURF_OWNER')
  @ApiOperation({ summary: 'Update venue details' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.venuesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('TURF_OWNER')
  @ApiOperation({ summary: 'Deactivate venue (soft delete)' })
  deactivate(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.venuesService.deactivate(tenantId, id);
  }
}
