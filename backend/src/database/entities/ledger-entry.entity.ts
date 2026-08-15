import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { LedgerAccount } from './ledger-account.entity';
import { SalesInvoice } from './sales-invoice.entity';
import { User } from './user.entity';
import { LedgerEntrySourceType } from '../../common/enums/domain.enums';

@Entity({ name: 'LedgerEntries' })
export class LedgerEntry extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uuid', nullable: true })
  businessId?: string;

  @Index()
  @Column({ name: 'AccountId', type: 'uuid' })
  accountId!: string;

  @Index()
  @Column({ name: 'InvoiceId', type: 'uuid', nullable: true })
  invoiceId?: string;

  @Index()
  @Column({ name: 'SourceId', type: 'uuid', nullable: true })
  sourceId?: string;

  @Column({ name: 'SourceNumber', type: 'varchar', length: 100, nullable: true })
  sourceNumber?: string;

  @Column({ name: 'PostingBatchId', type: 'varchar', length: 100, nullable: true })
  postingBatchId?: string;

  @Index()
  @Column({ name: 'CreatedByUserId', type: 'uuid', nullable: true })
  createdByUserId?: string;

  @Column({ name: 'TransactionDate', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  transactionDate!: Date;

  @Column({ name: 'PostingDate', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  postingDate!: Date;

  @Column({ name: 'SourceType', type: 'varchar', length: 30 })
  sourceType!: LedgerEntrySourceType;

  @Column({ name: 'Reference', type: 'varchar', length: 100, nullable: true })
  reference?: string;

  @Column({ name: 'Description', type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ name: 'Debit', type: 'decimal', precision: 18, scale: 2, default: 0 })
  debit!: number;

  @Column({ name: 'Credit', type: 'decimal', precision: 18, scale: 2, default: 0 })
  credit!: number;

  @Column({ name: 'IsReversal', type: 'boolean', default: false })
  isReversal!: boolean;

  @Column({ name: 'ReversalOfEntryId', type: 'uuid', nullable: true })
  reversalOfEntryId?: string;

  @Column({ name: 'ReversalBatchId', type: 'varchar', length: 100, nullable: true })
  reversalBatchId?: string;

  @ManyToOne(() => LedgerAccount, (account) => account.ledgerEntries, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'AccountId' })
  account?: LedgerAccount;

  @ManyToOne(() => SalesInvoice, (invoice) => invoice.ledgerEntries, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'InvoiceId' })
  invoice?: SalesInvoice;

  @ManyToOne(() => User, (user) => user.ledgerEntries, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'CreatedByUserId' })
  createdBy?: User;
}
