import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { PaymentVoucher } from './payment-voucher.entity';
import { PurchaseInvoice } from './purchase-invoice.entity';

@Entity({ name: 'PaymentVoucherAllocations' })
export class PaymentVoucherAllocation extends BaseUuidEntity {
  @Index()
  @Column({ name: 'PaymentVoucherId', type: 'uuid' })
  paymentVoucherId!: string;

  @Index()
  @Column({ name: 'PurchaseInvoiceId', type: 'uuid' })
  purchaseInvoiceId!: string;

  @Column({ name: 'AllocatedAmount', type: 'decimal', precision: 18, scale: 2 })
  allocatedAmount!: number;

  @ManyToOne(() => PaymentVoucher, (voucher) => voucher.allocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'PaymentVoucherId' })
  paymentVoucher?: PaymentVoucher;

  @ManyToOne(() => PurchaseInvoice, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'PurchaseInvoiceId' })
  purchaseInvoice?: PurchaseInvoice;
}
