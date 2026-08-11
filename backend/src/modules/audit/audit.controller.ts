import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Permissions('audit.view')
  findAll(@Query() query: Record<string, unknown>) {
    return this.auditService.findAll(query);
  }

  @Get('summary')
  @Permissions('audit.view')
  summary(@Query() query: Record<string, unknown>) {
    return this.auditService.summary(query);
  }
}
