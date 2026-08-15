import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Business } from './business.entity';
import { Customer } from './customer.entity';
import { User } from './user.entity';
import { InvoiceStatus, PaymentMethod } from '../../common/enums/domain.enums';
import { SalesInvoiceItem } from './sales-invoice-item.entity';
import { InventoryTransaction } from './inventory-transaction.entity';
import { LedgerEntry } from './ledger-entry.entity';
import { DocumentStatus, PaymentStatus } from '../../common/enums/domain.enums';

@Entity({ name: 'SalesInvoices' })
@Index('UQ_SalesInvoices_BusinessId_InvoiceNumber', ['businessId', 'invoiceNumber'], { unique: true })
export class SalesInvoice extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uuid' })
  businessId!: string;

  @Index()
  @Column({ name: 'CustomerId', type: 'uuid', nullable: true })
  customerId?: string;

  @Index()
  @Column({ name: 'CreatedByUserId', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'InvoiceNumber', type: 'varchar', length: 50 })
  invoiceNumber!: string;

  @Column({ name: 'PaymentMethod', type: 'varchar', length: 30, nullable: true })
  paymentMethod?: PaymentMethod;

  @Column({ name: 'InvoiceDate', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  invoiceDate!: Date;

  @Column({ name: 'DueDate', type: 'date', nullable: true })
  dueDate?: Date;

  @Column({ name: 'Subtotal', type: 'decimal', precision: 18, scale: 2, default: 0 })
  subtotal!: number;

  @Column({ name: 'DiscountTotal', type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountTotal!: number;

  @Column({ name: 'TaxTotal', type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxTotal!: number;

  @Column({ name: 'TotalAmount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ name: 'AmountPaid', type: 'decimal', precision: 18, scale: 2, default: 0 })
  amountPaid!: number;

  @Column({ name: 'Balance', type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance!: number;

  @Column({ name: 'Status', type: 'varchar', length: 30, default: InvoiceStatus.DRAFT })
  status!: InvoiceStatus;

  @Column({ name: 'DocumentStatus', type: 'varchar', length: 30, default: DocumentStatus.DRAFT })
  documentStatus!: DocumentStatus;

  @Column({ name: 'PaymentStatus', type: 'varchar', length: 30, default: PaymentStatus.UNPAID })
  paymentStatus!: PaymentStatus;

  @Column({ name: 'Notes', type: 'varchar', length: 500, nullable: true })
  notes?: string;

  @Column({ name: 'PdfUrl', type: 'varchar', length: 500, nullable: true })
  pdfUrl?: string;

  @Column({ name: 'CancelledAt', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'CancelledByUserId', type: 'uuid', nullable: true })
  cancelledByUserId?: string;

  @Column({ name: 'CancellationReason', type: 'varchar', length: 500, nullable: true })
  cancellationReason?: string;

  @ManyToOne(() => Business, (business) => business.invoices, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'BusinessId' })
  business?: Business;

  @ManyToOne(() => Customer, (customer) => customer.invoices, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'CustomerId' })
  customer?: Customer;

  @ManyToOne(() => User, (user) => user.createdInvoices, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'CreatedByUserId' })
  createdBy?: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'CancelledByUserId' })
  cancelledBy?: User;

  @OneToMany(() => SalesInvoiceItem, (item) => item.invoice, { cascade: true })
  items?: SalesInvoiceItem[];

  @OneToMany(() => InventoryTransaction, (transaction) => transaction.invoice)
  inventoryTransactions?: InventoryTransaction[];

  @OneToMany(() => LedgerEntry, (entry) => entry.invoice)
  ledgerEntries?: LedgerEntry[];
}
