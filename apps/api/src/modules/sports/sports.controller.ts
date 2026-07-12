import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SportsService } from './sports.service';
import { CreateSportDto, UpdateSportDto } from './dto/create-sport.dto';

@ApiTags('Sports')
@Controller('sports')
export class SportsController {
  constructor(private sportsService: SportsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all available sports (public)' })
  findAll() {
    return this.sportsService.findAll();
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add new sport (super admin only)' })
  create(@Body() dto: CreateSportDto) {
    return this.sportsService.create(dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update sport (super admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateSportDto) {
    return this.sportsService.update(id, dto);
  }
}
