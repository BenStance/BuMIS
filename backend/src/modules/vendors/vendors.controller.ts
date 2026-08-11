import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @Permissions('vendor.view')
  findAll(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.vendorsService.findAll(user as never, query);
  }

  @Get(':id')
  @Permissions('vendor.view')
  findOne(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.vendorsService.findOne(id, user as never);
  }

  @Get(':id/profile')
  @Permissions('vendor.view')
  profile(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.vendorsService.profile(id, user as never);
  }

  @Post()
  @Permissions('vendor.create')
  create(@Body() dto: CreateVendorDto, @CurrentUser() user: Record<string, unknown>) {
    return this.vendorsService.create(dto, user as never);
  }

  @Patch(':id')
  @Permissions('vendor.update')
  update(@Param('id') id: string, @Body() dto: UpdateVendorDto, @CurrentUser() user: Record<string, unknown>) {
    return this.vendorsService.update(id, dto, user as never);
  }

  @Delete(':id')
  @Permissions('vendor.delete')
  remove(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.vendorsService.remove(id, user as never);
  }
}
