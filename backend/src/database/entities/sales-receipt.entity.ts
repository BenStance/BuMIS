import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Business } from './business.entity';
import { Customer } from './customer.entity';
import { User } from './user.entity';
import { PaymentDocumentStatus } from '../../common/enums/domain.enums';
import { SalesReceiptAllocation } from './sales-receipt-allocation.entity';
import { LedgerEntry } from './ledger-entry.entity';

@Entity({ name: 'SalesReceipts' })
@Index('UQ_SalesReceipts_BusinessId_Number', ['businessId', 'receiptNumber'], { unique: true })
export class SalesReceipt extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uniqueidentifier' })
  businessId!: string;

  @Index()
  @Column({ name: 'CustomerId', type: 'uniqueidentifier' })
  customerId!: string;

  @Index()
  @Column({ name: 'CreatedByUserId', type: 'uniqueidentifier' })
  createdById!: string;

  @Index()
  @Column({ name: 'PostedByUserId', type: 'uniqueidentifier', nullable: true })
  postedById?: string;

  @Index()
  @Column({ name: 'VoidedByUserId', type: 'uniqueidentifier', nullable: true })
  voidedById?: string;

  @Column({ name: 'ReceiptNumber', type: 'nvarchar', length: 50 })
  receiptNumber!: string;

  @Column({ name: 'ReceiptDate', type: 'datetime2', default: () => 'GETDATE()' })
  receiptDate!: Date;

  @Column({ name: 'PostingDate', type: 'datetime2', nullable: true })
  postingDate?: Date;

  @Column({ name: 'PaymentMethod', type: 'nvarchar', length: 30, nullable: true })
  paymentMethod?: string;

  @Column({ name: 'CashOrBankAccountId', type: 'uniqueidentifier', nullable: true })
  cashOrBankAccountId?: string;

  @Column({ name: 'Amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount!: number;

  @Column({ name: 'ReferenceNumber', type: 'nvarchar', length: 100, nullable: true })
  referenceNumber?: string;

  @Column({ name: 'Remarks', type: 'nvarchar', length: 500, nullable: true })
  remarks?: string;

  @Column({ name: 'Status', type: 'nvarchar', length: 30, default: PaymentDocumentStatus.DRAFT })
  status!: PaymentDocumentStatus;

  @Column({ name: 'IsAutomatic', type: 'bit', default: false })
  isAutomatic!: boolean;

  @Column({ name: 'PostedAt', type: 'datetime2', nullable: true })
  postedAt?: Date;

  @Column({ name: 'VoidedAt', type: 'datetime2', nullable: true })
  voidedAt?: Date;

  @Column({ name: 'VoidReason', type: 'nvarchar', length: 500, nullable: true })
  voidReason?: string;

  @ManyToOne(() => Business, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'BusinessId' })
  business?: Business;

  @ManyToOne(() => Customer, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'CustomerId' })
  customer?: Customer;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'CreatedByUserId' })
  createdBy?: User;

  @ManyToOne(() => User, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'PostedByUserId' })
  postedBy?: User;

  @ManyToOne(() => User, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'VoidedByUserId' })
  voidedBy?: User;

  @OneToMany(() => SalesReceiptAllocation, (allocation) => allocation.salesReceipt, { cascade: true })
  allocations?: SalesReceiptAllocation[];

  @OneToMany(() => LedgerEntry, (entry) => entry.invoice)
  ledgerEntries?: LedgerEntry[];
}
