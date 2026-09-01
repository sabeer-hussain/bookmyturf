import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SlotsService } from './slots.service';
import { UpdateSlotConfigDto } from './dto/update-slot-config.dto';

@ApiTags('Slot Configuration')
@ApiBearerAuth()
@Controller('slot-configs')
export class SlotConfigsController {
  constructor(private slotsService: SlotsService) {}

  @Patch(':id')
  @Roles('TURF_OWNER', 'TURF_MANAGER')
  @ApiOperation({ summary: 'Update a slot config (time, peak flag, or active toggle)' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSlotConfigDto,
  ) {
    return this.slotsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('TURF_OWNER', 'TURF_MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a slot config (hard delete)' })
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.slotsService.remove(tenantId, id);
  }
}
