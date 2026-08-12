import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Business } from './business.entity';
import { Vendor } from './vendor.entity';
import { User } from './user.entity';
import { DocumentStatus, PaymentStatus } from '../../common/enums/domain.enums';
import { PurchaseInvoiceItem } from './purchase-invoice-item.entity';
import { InventoryTransaction } from './inventory-transaction.entity';
import { LedgerEntry } from './ledger-entry.entity';

@Entity({ name: 'PurchaseInvoices' })
@Index('UQ_PurchaseInvoices_BusinessId_Number', ['businessId', 'purchaseInvoiceNumber'], { unique: true })
export class PurchaseInvoice extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uniqueidentifier' })
  businessId!: string;

  @Index()
  @Column({ name: 'VendorId', type: 'uniqueidentifier' })
  vendorId!: string;

  @Index()
  @Column({ name: 'CreatedByUserId', type: 'uniqueidentifier' })
  createdById!: string;

  @Index()
  @Column({ name: 'PostedByUserId', type: 'uniqueidentifier', nullable: true })
  postedById?: string;

  @Index()
  @Column({ name: 'CancelledByUserId', type: 'uniqueidentifier', nullable: true })
  cancelledById?: string;

  @Index()
  @Column({ name: 'ReversedByUserId', type: 'uniqueidentifier', nullable: true })
  reversedById?: string;

  @Column({ name: 'PurchaseInvoiceNumber', type: 'nvarchar', length: 50 })
  purchaseInvoiceNumber!: string;

  @Column({ name: 'VendorInvoiceNumber', type: 'nvarchar', length: 100, nullable: true })
  vendorInvoiceNumber?: string;

  @Column({ name: 'InvoiceDate', type: 'datetime2', default: () => 'GETDATE()' })
  invoiceDate!: Date;

  @Column({ name: 'PostingDate', type: 'datetime2', nullable: true })
  postingDate?: Date;

  @Column({ name: 'DueDate', type: 'date', nullable: true })
  dueDate?: Date;

  @Column({ name: 'CurrencyCode', type: 'nvarchar', length: 10, default: 'TZS' })
  currencyCode!: string;

  @Column({ name: 'ExchangeRate', type: 'decimal', precision: 18, scale: 6, default: 1 })
  exchangeRate!: number;

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

  @Column({ name: 'DocumentStatus', type: 'nvarchar', length: 30, default: DocumentStatus.DRAFT })
  documentStatus!: DocumentStatus;

  @Column({ name: 'PaymentStatus', type: 'nvarchar', length: 30, default: PaymentStatus.UNPAID })
  paymentStatus!: PaymentStatus;

  @Column({ name: 'Remarks', type: 'nvarchar', length: 500, nullable: true })
  remarks?: string;

  @Column({ name: 'PostedAt', type: 'datetime2', nullable: true })
  postedAt?: Date;

  @Column({ name: 'CancelledAt', type: 'datetime2', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'CancellationReason', type: 'nvarchar', length: 500, nullable: true })
  cancellationReason?: string;

  @Column({ name: 'ReversedAt', type: 'datetime2', nullable: true })
  reversedAt?: Date;

  @Column({ name: 'ReversalDate', type: 'date', nullable: true })
  reversalDate?: Date;

  @Column({ name: 'ReversalReason', type: 'nvarchar', length: 500, nullable: true })
  reversalReason?: string;

  @Column({ name: 'ReversalNumber', type: 'nvarchar', length: 50, nullable: true })
  reversalNumber?: string;

  @ManyToOne(() => Business, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'BusinessId' })
  business?: Business;

  @ManyToOne(() => Vendor, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'VendorId' })
  vendor?: Vendor;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'CreatedByUserId' })
  createdBy?: User;

  @ManyToOne(() => User, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'PostedByUserId' })
  postedBy?: User;

  @ManyToOne(() => User, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'CancelledByUserId' })
  cancelledBy?: User;

  @ManyToOne(() => User, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'ReversedByUserId' })
  reversedBy?: User;

  @OneToMany(() => PurchaseInvoiceItem, (item) => item.purchaseInvoice, { cascade: true })
  items?: PurchaseInvoiceItem[];

  @OneToMany(() => InventoryTransaction, (transaction) => transaction.invoice)
  inventoryTransactions?: InventoryTransaction[];

  @OneToMany(() => LedgerEntry, (entry) => entry.invoice)
  ledgerEntries?: LedgerEntry[];
}
