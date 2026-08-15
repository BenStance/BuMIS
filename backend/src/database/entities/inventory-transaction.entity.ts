import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Business } from './business.entity';
import { Product } from './product.entity';
import { SalesInvoice } from './sales-invoice.entity';
import { User } from './user.entity';
import { Vendor } from './vendor.entity';
import { InventoryTransactionType } from '../../common/enums/domain.enums';

@Entity({ name: 'InventoryTransactions' })
export class InventoryTransaction extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uuid' })
  businessId!: string;

  @Index({ unique: true })
  @Column({ name: 'TransactionNumber', type: 'varchar', length: 50 })
  transactionNumber!: string;

  @Index()
  @Column({ name: 'ProductId', type: 'uuid' })
  productId!: string;

  @Index()
  @Column({ name: 'VendorId', type: 'uuid', nullable: true })
  vendorId?: string;

  @Index()
  @Column({ name: 'InvoiceId', type: 'uuid', nullable: true })
  invoiceId?: string;

  @Index()
  @Column({ name: 'SourceId', type: 'uuid', nullable: true })
  sourceId?: string;

  @Column({ name: 'SourceNumber', type: 'varchar', length: 100, nullable: true })
  sourceNumber?: string;

  @Index()
  @Column({ name: 'CreatedByUserId', type: 'uuid', nullable: true })
  createdByUserId?: string;

  @Column({ name: 'TransactionType', type: 'varchar', length: 30 })
  transactionType!: InventoryTransactionType;

  @Column({ name: 'Quantity', type: 'decimal', precision: 18, scale: 3 })
  quantity!: number;

  @Column({ name: 'PreviousStock', type: 'decimal', precision: 18, scale: 3 })
  previousStock!: number;

  @Column({ name: 'NewStock', type: 'decimal', precision: 18, scale: 3 })
  newStock!: number;

  @Column({ name: 'UnitCost', type: 'decimal', precision: 18, scale: 2, nullable: true })
  unitCost?: number;

  @Column({ name: 'Reference', type: 'varchar', length: 100, nullable: true })
  reference?: string;

  @Column({ name: 'Reason', type: 'varchar', length: 255, nullable: true })
  reason?: string;

  @Column({ name: 'Notes', type: 'varchar', length: 255, nullable: true })
  notes?: string;

  @Column({ name: 'IsReversal', type: 'boolean', default: false })
  isReversal!: boolean;

  @Column({ name: 'ReversalOfTransactionId', type: 'uuid', nullable: true })
  reversalOfTransactionId?: string;

  @Column({ name: 'ReversalBatchId', type: 'varchar', length: 100, nullable: true })
  reversalBatchId?: string;

  @ManyToOne(() => Business, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'BusinessId' })
  business?: Business;

  @ManyToOne(() => Product, (product) => product.inventoryTransactions, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'ProductId' })
  product?: Product;

  @ManyToOne(() => Vendor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'VendorId' })
  vendor?: Vendor;

  @ManyToOne(() => SalesInvoice, (invoice) => invoice.inventoryTransactions, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'InvoiceId' })
  invoice?: SalesInvoice;

  @ManyToOne(() => User, (user) => user.inventoryTransactions, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'CreatedByUserId' })
  createdBy?: User;
}
