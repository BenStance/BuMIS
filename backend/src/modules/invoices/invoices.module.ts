import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesInvoice } from '../../database/entities/sales-invoice.entity';
import { SalesInvoiceItem } from '../../database/entities/sales-invoice-item.entity';
import { Product } from '../../database/entities/product.entity';
import { Customer } from '../../database/entities/customer.entity';
import { InventoryTransaction } from '../../database/entities/inventory-transaction.entity';
import { Business } from '../../database/entities/business.entity';
import { SystemSetting } from '../../database/entities/system-setting.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { User } from '../../database/entities/user.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { SalesReceiptsModule } from '../sales-receipts/sales-receipts.module';
import { SalesReceiptAllocation } from '../../database/entities/sales-receipt-allocation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesInvoice,
      SalesInvoiceItem,
      Product,
      Customer,
      InventoryTransaction,
      Business,
      SystemSetting,
      AuditLog,
      User,
      SalesReceiptAllocation,
    ]),
    LedgerModule,
    SalesReceiptsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}
