import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseInvoice } from '../../database/entities/purchase-invoice.entity';
import { PurchaseInvoiceItem } from '../../database/entities/purchase-invoice-item.entity';
import { Product } from '../../database/entities/product.entity';
import { Vendor } from '../../database/entities/vendor.entity';
import { Business } from '../../database/entities/business.entity';
import { SystemSetting } from '../../database/entities/system-setting.entity';
import { InventoryTransaction } from '../../database/entities/inventory-transaction.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { User } from '../../database/entities/user.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { DocumentNumberingModule } from '../document-numbering/document-numbering.module';
import { PurchaseInvoicesController } from './purchase-invoices.controller';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { PaymentVouchersModule } from '../payment-vouchers/payment-vouchers.module';
import { PaymentVoucherAllocation } from '../../database/entities/payment-voucher-allocation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseInvoice,
      PurchaseInvoiceItem,
      Product,
      Vendor,
      Business,
      SystemSetting,
      InventoryTransaction,
      AuditLog,
      User,
      PaymentVoucherAllocation,
    ]),
    LedgerModule,
    DocumentNumberingModule,
    PaymentVouchersModule,
  ],
  controllers: [PurchaseInvoicesController],
  providers: [PurchaseInvoicesService],
  exports: [PurchaseInvoicesService],
})
export class PurchaseInvoicesModule {}
