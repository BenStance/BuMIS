import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';
import { StockInDto } from './dto/stock-in.dto';
import { StockOutDto } from './dto/stock-out.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('transactions')
  @Permissions('inventory.view')
  findAll(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.inventoryService.findAll(user as never, query);
  }

  @Get('low-stock')
  @Permissions('inventory.view')
  lowStock(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.inventoryService.lowStock(user as never, query);
  }

  @Get('products/:productId/stock')
  @Permissions('inventory.view')
  productStock(@Param('productId') productId: string, @CurrentUser() user: Record<string, unknown>) {
    return this.inventoryService.productStock(productId, user as never);
  }

  @Post('stock-in')
  @Permissions('inventory.stock_in')
  stockIn(@Body() dto: StockInDto, @CurrentUser() user: Record<string, unknown>) {
    return this.inventoryService.stockIn(dto, user as never);
  }

  @Post('stock-out')
  @Permissions('inventory.stock_out')
  stockOut(@Body() dto: StockOutDto, @CurrentUser() user: Record<string, unknown>) {
    return this.inventoryService.stockOut(dto, user as never);
  }

  @Post('adjustments')
  @Permissions('inventory.adjustment')
  adjustment(@Body() dto: StockAdjustmentDto, @CurrentUser() user: Record<string, unknown>) {
    return this.inventoryService.adjustment(dto, user as never);
  }
}
