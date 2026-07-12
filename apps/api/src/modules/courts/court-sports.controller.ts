import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CourtSportsService } from './court-sports.service';
import { UpdateCourtSportDto } from './dto/create-court-sport.dto';

@ApiTags('Court Sports')
@ApiBearerAuth()
@Controller('court-sports')
export class CourtSportsController {
  constructor(private courtSportsService: CourtSportsService) {}

  @Patch(':id')
  @Roles('TURF_OWNER')
  @ApiOperation({ summary: 'Update court-sport configuration (price, duration)' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCourtSportDto,
  ) {
    return this.courtSportsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('TURF_OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove sport from court (hard delete)' })
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.courtSportsService.remove(tenantId, id);
  }
}
