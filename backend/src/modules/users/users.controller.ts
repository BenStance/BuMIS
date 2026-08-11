import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserPermissionsDto } from './dto/assign-user-permissions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@CurrentUser() user: Record<string, unknown>, @Query('businessId') businessId?: string) {
    return this.usersService.findAll(user as never, businessId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.usersService.findOne(id, user as never);
  }

  @Post()
  @Permissions('user.create')
  create(@Body() dto: CreateUserDto, @CurrentUser() user: Record<string, unknown>) {
    return this.usersService.create(dto, user as never);
  }

  @Patch(':id')
  @Permissions('user.update')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: Record<string, unknown>) {
    return this.usersService.update(id, dto, user as never);
  }

  @Delete(':id')
  @Permissions('user.delete')
  remove(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.usersService.remove(id, user as never);
  }

  @Post(':id/activate')
  @Permissions('user.activate')
  activate(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.usersService.activate(id, user as never);
  }

  @Post(':id/deactivate')
  @Permissions('user.deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.usersService.deactivate(id, user as never);
  }

  @Post(':id/role')
  @Permissions('user.update')
  assignRole(@Param('id') id: string, @Body() dto: { roleId: string }, @CurrentUser() user: Record<string, unknown>) {
    return this.usersService.assignRole(id, dto.roleId, user as never);
  }

  @Post(':id/permissions')
  @Permissions('user.update')
  assignPermissions(@Param('id') id: string, @Body() dto: AssignUserPermissionsDto, @CurrentUser() user: Record<string, unknown>) {
    return this.usersService.assignPermissions(id, dto.permissionIds, user as never);
  }

  @Get(':id/profile')
  profile(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.usersService.profile(id, user as never);
  }
}
