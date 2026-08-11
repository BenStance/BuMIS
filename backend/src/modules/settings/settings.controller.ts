import { Body, Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Permissions('settings.view')
  getAll(@CurrentUser() user: Record<string, unknown>) {
    return this.settingsService.getAll(user as never);
  }

  @Patch('business')
  @Permissions('settings.update')
  updateBusiness(@CurrentUser() user: Record<string, unknown>, @Body() body: Record<string, unknown>) {
    return this.settingsService.updateBusiness(user as never, body);
  }

  @Patch('smtp')
  @Permissions('settings.update')
  updateSmtp(@CurrentUser() user: Record<string, unknown>, @Body() body: Record<string, unknown>) {
    return this.settingsService.updateSmtp(user as never, body);
  }

  @Patch('invoice')
  @Permissions('settings.update')
  updateInvoice(@CurrentUser() user: Record<string, unknown>, @Body() body: Record<string, unknown>) {
    return this.settingsService.updateInvoice(user as never, body);
  }

  @Patch('currency')
  @Permissions('settings.update')
  updateCurrency(@CurrentUser() user: Record<string, unknown>, @Body() body: Record<string, unknown>) {
    return this.settingsService.updateCurrency(user as never, body);
  }

  @Patch('tax')
  @Permissions('settings.update')
  updateTax(@CurrentUser() user: Record<string, unknown>, @Body() body: Record<string, unknown>) {
    return this.settingsService.updateTax(user as never, body);
  }

  @Get(':category')
  @Permissions('settings.view')
  getCategory(@Param('category') category: string, @CurrentUser() user: Record<string, unknown>) {
    return this.settingsService.getCategory(user as never, category);
  }
}
