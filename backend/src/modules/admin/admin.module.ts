import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Business } from '../../database/entities/business.entity';
import { BusinessSubscription } from '../../database/entities/business-subscription.entity';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';
import { SubscriptionPayment } from '../../database/entities/subscription-payment.entity';
import { User } from '../../database/entities/user.entity';
import { SalesInvoice } from '../../database/entities/sales-invoice.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, BusinessSubscription, SubscriptionPlan, SubscriptionPayment, User, SalesInvoice]),
    AuthModule,
    AuditModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
