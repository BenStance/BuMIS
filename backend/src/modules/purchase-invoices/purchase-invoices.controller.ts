import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { ReversePurchaseInvoiceDto } from './dto/reverse-purchase-invoice.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-invoices')
export class PurchaseInvoicesController {
  constructor(private readonly purchaseInvoicesService: PurchaseInvoicesService) {}

  @Get()
  @Permissions('purchase_invoice.view')
  findAll(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.purchaseInvoicesService.findAll(user as never, query);
  }

  @Get(':id')
  @Permissions('purchase_invoice.view')
  findOne(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.purchaseInvoicesService.findOne(id, user as never);
  }

  @Post()
  @Permissions('purchase_invoice.create')
  create(@Body() dto: CreatePurchaseInvoiceDto, @CurrentUser() user: Record<string, unknown>) {
    return this.purchaseInvoicesService.create(dto, user as never);
  }

  @Post(':id/post')
  @Permissions('purchase_invoice.post')
  post(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.purchaseInvoicesService.post(id, user as never);
  }

  @Post(':id/reverse')
  @Permissions('purchase_invoice.reverse')
  reverse(@Param('id') id: string, @Body() dto: ReversePurchaseInvoiceDto, @CurrentUser() user: Record<string, unknown>) {
    return this.purchaseInvoicesService.reverse(id, dto, user as never);
  }
}
