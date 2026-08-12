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
  @Column({ name: 'BusinessId', type: 'uniqueidentifier' })
  businessId!: string;

  @Index({ unique: true })
  @Column({ name: 'TransactionNumber', type: 'nvarchar', length: 50 })
  transactionNumber!: string;

  @Index()
  @Column({ name: 'ProductId', type: 'uniqueidentifier' })
  productId!: string;

  @Index()
  @Column({ name: 'VendorId', type: 'uniqueidentifier', nullable: true })
  vendorId?: string;

  @Index()
  @Column({ name: 'InvoiceId', type: 'uniqueidentifier', nullable: true })
  invoiceId?: string;

  @Index()
  @Column({ name: 'SourceId', type: 'uniqueidentifier', nullable: true })
  sourceId?: string;

  @Column({ name: 'SourceNumber', type: 'nvarchar', length: 100, nullable: true })
  sourceNumber?: string;

  @Index()
  @Column({ name: 'CreatedByUserId', type: 'uniqueidentifier', nullable: true })
  createdByUserId?: string;

  @Column({ name: 'TransactionType', type: 'nvarchar', length: 30 })
  transactionType!: InventoryTransactionType;

  @Column({ name: 'Quantity', type: 'decimal', precision: 18, scale: 3 })
  quantity!: number;

  @Column({ name: 'PreviousStock', type: 'decimal', precision: 18, scale: 3 })
  previousStock!: number;

  @Column({ name: 'NewStock', type: 'decimal', precision: 18, scale: 3 })
  newStock!: number;

  @Column({ name: 'UnitCost', type: 'decimal', precision: 18, scale: 2, nullable: true })
  unitCost?: number;

  @Column({ name: 'Reference', type: 'nvarchar', length: 100, nullable: true })
  reference?: string;

  @Column({ name: 'Reason', type: 'nvarchar', length: 255, nullable: true })
  reason?: string;

  @Column({ name: 'Notes', type: 'nvarchar', length: 255, nullable: true })
  notes?: string;

  @Column({ name: 'IsReversal', type: 'bit', default: false })
  isReversal!: boolean;

  @Column({ name: 'ReversalOfTransactionId', type: 'uniqueidentifier', nullable: true })
  reversalOfTransactionId?: string;

  @Column({ name: 'ReversalBatchId', type: 'nvarchar', length: 100, nullable: true })
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
