import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantsService } from './tenants.service';
import { OnboardTenantDto, UpdateTenantDto } from './dto/tenant.dto';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Post('onboard')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete tenant onboarding wizard' })
  onboard(@CurrentUser('sub') userId: string, @Body() dto: OnboardTenantDto) {
    return this.tenantsService.onboard(userId, dto);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Check slug availability' })
  checkSlug(@Param('slug') slug: string) {
    return this.tenantsService.checkSlug(slug);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant details' })
  findById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tenantsService.findById(id, user.sub, user.role, user.tenantId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tenant' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto, @CurrentUser() user: any) {
    return this.tenantsService.update(id, dto, user.role, user.tenantId);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate tenant (super admin)' })
  deactivate(@Param('id') id: string) {
    return this.tenantsService.deactivate(id);
  }
}
