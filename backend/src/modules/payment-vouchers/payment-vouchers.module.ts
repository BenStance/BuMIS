import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentVoucher } from '../../database/entities/payment-voucher.entity';
import { PaymentVoucherAllocation } from '../../database/entities/payment-voucher-allocation.entity';
import { PurchaseInvoice } from '../../database/entities/purchase-invoice.entity';
import { Vendor } from '../../database/entities/vendor.entity';
import { SystemSetting } from '../../database/entities/system-setting.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { DocumentNumberingModule } from '../document-numbering/document-numbering.module';
import { PaymentVouchersController } from './payment-vouchers.controller';
import { PaymentVouchersService } from './payment-vouchers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentVoucher, PaymentVoucherAllocation, PurchaseInvoice, Vendor, SystemSetting, AuditLog]),
    LedgerModule,
    DocumentNumberingModule,
  ],
  controllers: [PaymentVouchersController],
  providers: [PaymentVouchersService],
  exports: [PaymentVouchersService],
})
export class PaymentVouchersModule {}
