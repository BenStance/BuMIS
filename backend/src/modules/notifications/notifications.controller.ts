import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.notificationsService.list(user as never, query);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: Record<string, unknown>, @Param('id') id: string) {
    return this.notificationsService.markRead(user as never, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    return this.notificationsService.markAllRead(user as never, query);
  }
}
