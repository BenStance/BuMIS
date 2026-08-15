import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { SalesReceipt } from './sales-receipt.entity';
import { SalesInvoice } from './sales-invoice.entity';

@Entity({ name: 'SalesReceiptAllocations' })
export class SalesReceiptAllocation extends BaseUuidEntity {
  @Index()
  @Column({ name: 'SalesReceiptId', type: 'uuid' })
  salesReceiptId!: string;

  @Index()
  @Column({ name: 'SalesInvoiceId', type: 'uuid' })
  salesInvoiceId!: string;

  @Column({ name: 'AllocatedAmount', type: 'decimal', precision: 18, scale: 2 })
  allocatedAmount!: number;

  @ManyToOne(() => SalesReceipt, (receipt) => receipt.allocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'SalesReceiptId' })
  salesReceipt?: SalesReceipt;

  @ManyToOne(() => SalesInvoice, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'SalesInvoiceId' })
  salesInvoice?: SalesInvoice;
}
