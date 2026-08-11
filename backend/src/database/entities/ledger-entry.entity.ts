import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { LedgerAccount } from './ledger-account.entity';
import { SalesInvoice } from './sales-invoice.entity';
import { User } from './user.entity';
import { LedgerEntrySourceType } from '../../common/enums/domain.enums';

@Entity({ name: 'LedgerEntries' })
export class LedgerEntry extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uniqueidentifier', nullable: true })
  businessId?: string;

  @Index()
  @Column({ name: 'AccountId', type: 'uniqueidentifier' })
  accountId!: string;

  @Index()
  @Column({ name: 'InvoiceId', type: 'uniqueidentifier', nullable: true })
  invoiceId?: string;

  @Index()
  @Column({ name: 'CreatedByUserId', type: 'uniqueidentifier', nullable: true })
  createdByUserId?: string;

  @Column({ name: 'TransactionDate', type: 'datetime2', default: () => 'GETDATE()' })
  transactionDate!: Date;

  @Column({ name: 'SourceType', type: 'nvarchar', length: 30 })
  sourceType!: LedgerEntrySourceType;

  @Column({ name: 'Reference', type: 'nvarchar', length: 100, nullable: true })
  reference?: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 255, nullable: true })
  description?: string;

  @Column({ name: 'Debit', type: 'decimal', precision: 18, scale: 2, default: 0 })
  debit!: number;

  @Column({ name: 'Credit', type: 'decimal', precision: 18, scale: 2, default: 0 })
  credit!: number;

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
