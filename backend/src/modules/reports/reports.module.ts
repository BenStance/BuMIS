import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { SalesInvoice } from '../../database/entities/sales-invoice.entity';
import { SalesInvoiceItem } from '../../database/entities/sales-invoice-item.entity';
import { Product } from '../../database/entities/product.entity';
import { Customer } from '../../database/entities/customer.entity';
import { InventoryTransaction } from '../../database/entities/inventory-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SalesInvoice, SalesInvoiceItem, Product, Customer, InventoryTransaction])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
