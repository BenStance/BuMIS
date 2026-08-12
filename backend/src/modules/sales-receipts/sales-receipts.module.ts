import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesReceipt } from '../../database/entities/sales-receipt.entity';
import { SalesReceiptAllocation } from '../../database/entities/sales-receipt-allocation.entity';
import { SalesInvoice } from '../../database/entities/sales-invoice.entity';
import { Customer } from '../../database/entities/customer.entity';
import { SystemSetting } from '../../database/entities/system-setting.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { DocumentNumberingModule } from '../document-numbering/document-numbering.module';
import { SalesReceiptsController } from './sales-receipts.controller';
import { SalesReceiptsService } from './sales-receipts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesReceipt, SalesReceiptAllocation, SalesInvoice, Customer, SystemSetting, AuditLog]),
    LedgerModule,
    DocumentNumberingModule,
  ],
  controllers: [SalesReceiptsController],
  providers: [SalesReceiptsService],
  exports: [SalesReceiptsService],
})
export class SalesReceiptsModule {}
