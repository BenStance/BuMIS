import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';
import { BusinessSubscription } from '../../database/entities/business-subscription.entity';
import { Business } from '../../database/entities/business.entity';
import { SubscriptionPayment } from '../../database/entities/subscription-payment.entity';
import { User } from '../../database/entities/user.entity';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuditModule } from '../audit/audit.module';
import { MailerService } from '../../common/services/mailer.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([SubscriptionPlan, BusinessSubscription, Business, SubscriptionPayment, User]), AuditModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PermissionsGuard, MailerService],
  exports: [SubscriptionsService, TypeOrmModule],
})
export class SubscriptionsModule {}
