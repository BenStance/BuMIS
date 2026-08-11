import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Permissions('dashboard.view')
  summary(@CurrentUser() user: Record<string, unknown>) {
    return this.dashboardService.summary(user as never);
  }

  @Get('today-sales')
  @Permissions('dashboard.view')
  todaySales(@CurrentUser() user: Record<string, unknown>) {
    return this.dashboardService.todaySales(user as never);
  }

  @Get('recent-invoices')
  @Permissions('dashboard.view')
  recentInvoices(@CurrentUser() user: Record<string, unknown>) {
    return this.dashboardService.recentInvoices(user as never);
  }

  @Get('low-stock')
  @Permissions('dashboard.view')
  lowStock(@CurrentUser() user: Record<string, unknown>) {
    return this.dashboardService.lowStock(user as never);
  }

  @Get('best-selling-products')
  @Permissions('dashboard.view')
  bestSellingProducts(@CurrentUser() user: Record<string, unknown>) {
    return this.dashboardService.bestSellingProducts(user as never);
  }
}
