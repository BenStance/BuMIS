import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Permissions('invoice.view')
  findAll(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.invoicesService.findAll(user as never, query);
  }

  @Get('search')
  @Permissions('invoice.view')
  search(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.invoicesService.search(user as never, query);
  }

  @Get(':id')
  @Permissions('invoice.view')
  findOne(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.invoicesService.findOne(id, user as never);
  }

  @Get(':id/print-data')
  @Permissions('invoice.view')
  printData(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.invoicesService.printData(id, user as never);
  }

  @Post()
  @Permissions('invoice.create')
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: Record<string, unknown>) {
    return this.invoicesService.create(dto, user as never);
  }

  @Patch(':id')
  @Permissions('invoice.update')
  updateDraft(@Param('id') id: string, @Body() dto: UpdateInvoiceDto, @CurrentUser() user: Record<string, unknown>) {
    return this.invoicesService.updateDraft(id, dto, user as never);
  }

  @Post(':id/cancel')
  @Permissions('invoice.cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelInvoiceDto, @CurrentUser() user: Record<string, unknown>) {
    return this.invoicesService.cancel(id, dto, user as never);
  }
}
