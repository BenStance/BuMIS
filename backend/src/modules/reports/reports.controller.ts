import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales/daily')
  @Permissions('reports.view')
  dailySales(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.reportsService.dailySales(user as never, query);
  }

  @Get('sales/monthly')
  @Permissions('reports.view')
  monthlySales(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.reportsService.monthlySales(user as never, query);
  }

  @Get('sales/annual')
  @Permissions('reports.view')
  annualSales(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.reportsService.annualSales(user as never, query);
  }

  @Get('customers/:id')
  @Permissions('reports.view')
  customerReports(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.reportsService.customerReports(user as never, id);
  }

  @Get('products')
  @Permissions('reports.view')
  productReports(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.reportsService.productReports(user as never, query);
  }

  @Get('inventory')
  @Permissions('reports.view')
  inventoryReports(@CurrentUser() user: Record<string, unknown>) {
    return this.reportsService.inventoryReports(user as never);
  }

  @Get('invoices')
  @Permissions('reports.view')
  invoiceReports(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.reportsService.invoiceReports(user as never, query);
  }

  @Get('trends')
  @Permissions('reports.view')
  salesTrends(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.reportsService.salesTrends(user as never, query);
  }
}
