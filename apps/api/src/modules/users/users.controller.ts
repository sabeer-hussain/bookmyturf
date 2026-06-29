import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  findById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.findById(id, user.sub, user.role);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own profile' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: any) {
    return this.usersService.update(id, dto, user.sub, user.role);
  }
}
