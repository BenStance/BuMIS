import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LedgerService } from './ledger.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('accounts')
  @Permissions('ledger.view')
  findAccounts(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.ledgerService.findAccounts(user as never, query);
  }

  @Get('entries')
  @Permissions('ledger.view')
  findEntries(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.ledgerService.findEntries(user as never, query);
  }
}
