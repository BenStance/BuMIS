import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { SalesInvoice } from '../../database/entities/sales-invoice.entity';
import { SalesInvoiceItem } from '../../database/entities/sales-invoice-item.entity';
import { Product } from '../../database/entities/product.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Vendor } from '../../database/entities/vendor.entity';
import { User } from '../../database/entities/user.entity';
import { Business } from '../../database/entities/business.entity';
import { BusinessSubscription } from '../../database/entities/business-subscription.entity';
import { InventoryTransaction } from '../../database/entities/inventory-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesInvoice,
      SalesInvoiceItem,
      Product,
      Customer,
      Vendor,
      User,
      Business,
      BusinessSubscription,
      InventoryTransaction,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
