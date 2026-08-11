import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Permissions('customer.view')
  findAll(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.customersService.findAll(user as never, query);
  }

  @Get(':id')
  @Permissions('customer.view')
  findOne(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.customersService.findOne(id, user as never);
  }

  @Get(':id/profile')
  @Permissions('customer.view')
  profile(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.customersService.profile(id, user as never);
  }

  @Get(':id/history')
  @Permissions('customer.view')
  history(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.customersService.history(id, user as never);
  }

  @Post()
  @Permissions('customer.create')
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: Record<string, unknown>) {
    return this.customersService.create(dto, user as never);
  }

  @Patch(':id')
  @Permissions('customer.update')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() user: Record<string, unknown>) {
    return this.customersService.update(id, dto, user as never);
  }

  @Delete(':id')
  @Permissions('customer.delete')
  remove(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.customersService.remove(id, user as never);
  }
}
