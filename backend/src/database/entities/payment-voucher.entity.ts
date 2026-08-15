import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Business } from './business.entity';
import { Vendor } from './vendor.entity';
import { User } from './user.entity';
import { PaymentDocumentStatus } from '../../common/enums/domain.enums';
import { PaymentVoucherAllocation } from './payment-voucher-allocation.entity';
import { LedgerEntry } from './ledger-entry.entity';

@Entity({ name: 'PaymentVouchers' })
@Index('UQ_PaymentVouchers_BusinessId_Number', ['businessId', 'voucherNumber'], { unique: true })
export class PaymentVoucher extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uuid' })
  businessId!: string;

  @Index()
  @Column({ name: 'VendorId', type: 'uuid' })
  vendorId!: string;

  @Index()
  @Column({ name: 'CreatedByUserId', type: 'uuid' })
  createdById!: string;

  @Index()
  @Column({ name: 'PostedByUserId', type: 'uuid', nullable: true })
  postedById?: string;

  @Index()
  @Column({ name: 'VoidedByUserId', type: 'uuid', nullable: true })
  voidedById?: string;

  @Column({ name: 'VoucherNumber', type: 'varchar', length: 50 })
  voucherNumber!: string;

  @Column({ name: 'PaymentDate', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  paymentDate!: Date;

  @Column({ name: 'PostingDate', type: 'timestamp', nullable: true })
  postingDate?: Date;

  @Column({ name: 'PaymentMethod', type: 'varchar', length: 30, nullable: true })
  paymentMethod?: string;

  @Column({ name: 'CashOrBankAccountId', type: 'uuid', nullable: true })
  cashOrBankAccountId?: string;

  @Column({ name: 'Amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount!: number;

  @Column({ name: 'ReferenceNumber', type: 'varchar', length: 100, nullable: true })
  referenceNumber?: string;

  @Column({ name: 'Remarks', type: 'varchar', length: 500, nullable: true })
  remarks?: string;

  @Column({ name: 'Status', type: 'varchar', length: 30, default: PaymentDocumentStatus.DRAFT })
  status!: PaymentDocumentStatus;

  @Column({ name: 'IsAutomatic', type: 'boolean', default: false })
  isAutomatic!: boolean;

  @Column({ name: 'PostedAt', type: 'timestamp', nullable: true })
  postedAt?: Date;

  @Column({ name: 'VoidedAt', type: 'timestamp', nullable: true })
  voidedAt?: Date;

  @Column({ name: 'VoidReason', type: 'varchar', length: 500, nullable: true })
  voidReason?: string;

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
  @JoinColumn({ name: 'VoidedByUserId' })
  voidedBy?: User;

  @OneToMany(() => PaymentVoucherAllocation, (allocation) => allocation.paymentVoucher, { cascade: true })
  allocations?: PaymentVoucherAllocation[];

  @OneToMany(() => LedgerEntry, (entry) => entry.invoice)
  ledgerEntries?: LedgerEntry[];
}
