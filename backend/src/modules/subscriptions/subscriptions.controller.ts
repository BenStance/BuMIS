import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { RequestSubscriptionDto } from './dto/request-subscription.dto';
import { SubscribeBusinessDto } from './dto/subscribe-business.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  findPlans() {
    return this.subscriptionsService.findPlans();
  }

  @Post('plans')
  @Permissions('subscription.manage')
  createPlan(@Body() dto: CreateSubscriptionPlanDto, @CurrentUser() user: Record<string, unknown>) {
    return this.subscriptionsService.createPlan(dto, user as never);
  }

  @Patch('plans/:id')
  @Permissions('subscription.manage')
  updatePlan(@Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto, @CurrentUser() user: Record<string, unknown>) {
    return this.subscriptionsService.updatePlan(id, dto, user as never);
  }

  @Delete('plans/:id')
  @Permissions('subscription.manage')
  deletePlan(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.subscriptionsService.deletePlan(id, user as never);
  }

  @Post('businesses')
  @Permissions('subscription.manage')
  subscribe(@Body() dto: SubscribeBusinessDto, @CurrentUser() user: Record<string, unknown>) {
    return this.subscriptionsService.subscribe(dto, user as never);
  }

  @Post('businesses/request')
  @UseInterceptors(
    FileInterceptor('proof', {
      storage: diskStorage({
        destination: (req: Request, file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) => {
          const uploadDir = join(process.cwd(), 'uploads', 'subscriptions');
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }
          callback(null, uploadDir);
        },
        filename: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
          const timestamp = Date.now();
          const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          callback(null, `${timestamp}-${sanitized}`);
        },
      }),
    }),
  )
  requestSubscription(
    @Req() req: Request,
    @UploadedFile() proof: Express.Multer.File | undefined,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    const body = req.body as Record<string, unknown> | undefined;
    const normalizedDto: RequestSubscriptionDto = {
      planId: String((body?.planId ?? '') || '').trim(),
      billingCycle: String((body?.billingCycle ?? '') || '').trim() as RequestSubscriptionDto['billingCycle'],
      startDate: String((body?.startDate ?? '') || '').trim() || undefined,
      endDate: String((body?.endDate ?? '') || '').trim() || undefined,
      gracePeriodDays:
        body?.gracePeriodDays !== undefined && body?.gracePeriodDays !== ''
          ? Number(body.gracePeriodDays)
          : undefined,
      paymentMethod: String((body?.paymentMethod ?? '') || '').trim() || undefined,
      transactionReference: String((body?.transactionReference ?? '') || '').trim() || undefined,
      proofPath: String((body?.proofPath ?? '') || '').trim() || undefined,
    };
    return this.subscriptionsService.requestSubscription(normalizedDto, proof, user as never);
  }

  @Get('me')
  getMySubscription(@CurrentUser() user: Record<string, unknown>) {
    return this.subscriptionsService.getMySubscription(user as never);
  }

  @Post(':id/renew')
  @Permissions('subscription.manage')
  renew(
    @Param('id') id: string,
    @Body() dto: Pick<SubscribeBusinessDto, 'startDate' | 'endDate' | 'gracePeriodDays'>,
    @CurrentUser() user: Record<string, unknown>,
  ) {
    return this.subscriptionsService.renew(id, dto, user as never);
  }

  @Get('businesses/:businessId')
  listBusinessSubscriptions(@Param('businessId') businessId: string) {
    return this.subscriptionsService.listBusinessSubscriptions(businessId);
  }
}
