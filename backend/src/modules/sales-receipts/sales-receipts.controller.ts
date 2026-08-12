import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SalesReceiptsService } from './sales-receipts.service';
import { CreateSalesReceiptDto } from './dto/create-sales-receipt.dto';
import { VoidSalesReceiptDto } from './dto/void-sales-receipt.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales-receipts')
export class SalesReceiptsController {
  constructor(private readonly salesReceiptsService: SalesReceiptsService) {}

  @Get()
  @Permissions('sales_receipt.view')
  findAll(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.salesReceiptsService.findAll(user as never, query);
  }

  @Get(':id')
  @Permissions('sales_receipt.view')
  findOne(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.salesReceiptsService.findOne(id, user as never);
  }

  @Post()
  @Permissions('sales_receipt.create')
  create(@Body() dto: CreateSalesReceiptDto, @CurrentUser() user: Record<string, unknown>) {
    return this.salesReceiptsService.create(dto, user as never);
  }

  @Post(':id/post')
  @Permissions('sales_receipt.post')
  post(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.salesReceiptsService.post(id, user as never);
  }

  @Post(':id/void')
  @Permissions('sales_receipt.void')
  void(@Param('id') id: string, @Body() dto: VoidSalesReceiptDto, @CurrentUser() user: Record<string, unknown>) {
    return this.salesReceiptsService.void(id, dto, user as never);
  }
}
