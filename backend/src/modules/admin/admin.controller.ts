import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { SubscriptionStatus } from '../../common/enums/domain.enums';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @Permissions('admin.view')
  dashboard(@CurrentUser() user: Record<string, unknown>) {
    return this.adminService.dashboard(user as never);
  }

  @Get('businesses')
  @Permissions('admin.view')
  businesses(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.adminService.businesses(user as never, query);
  }

  @Get('businesses/:id')
  @Permissions('admin.view')
  business(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string) {
    return this.adminService.getBusiness(user as never, id);
  }

  @Get('statistics')
  @Permissions('admin.view')
  statistics(@CurrentUser() user: Record<string, unknown>) {
    return this.adminService.businessStatistics(user as never);
  }

  @Get('users/active')
  @Permissions('admin.view')
  activeUsers(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.adminService.activeUsers(user as never, query);
  }

  @Get('subscriptions')
  @Permissions('admin.view')
  subscriptions(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.adminService.subscriptions(user as never, query);
  }

  @Get('revenue')
  @Permissions('admin.view')
  revenue(@CurrentUser() user: Record<string, unknown>) {
    return this.adminService.revenueAnalytics(user as never);
  }

  @Post('login-as-business/:id')
  @Permissions('admin.impersonate')
  loginAsBusiness(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string) {
    return this.adminService.loginAsBusiness(user as never, id);
  }

  @Patch('subscriptions/:id/renew')
  @Permissions('admin.view')
  renewSubscription(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.adminService.renewSubscription(user as never, id, body);
  }

  @Patch('subscriptions/:id/status')
  @Permissions('admin.view')
  updateStatus(
    @CurrentUser() user: Record<string, unknown>,
    @Param('id') id: string,
    @Body() body: { status: SubscriptionStatus; rejectionReason?: string },
  ) {
    return this.adminService.updateSubscriptionStatus(user as never, id, body.status, { rejectionReason: body.rejectionReason });
  }
}
