import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Business } from './business.entity';
import { ProductCategory } from './product-category.entity';
import { RecordStatus } from '../../common/enums/domain.enums';
import { InventoryTransaction } from './inventory-transaction.entity';
import { SalesInvoiceItem } from './sales-invoice-item.entity';

@Entity({ name: 'Products' })
@Index('UQ_Products_BusinessId_SKU', ['businessId', 'sku'], { unique: true })
export class Product extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uniqueidentifier' })
  businessId!: string;

  @Index()
  @Column({ name: 'CategoryId', type: 'uniqueidentifier', nullable: true })
  categoryId?: string;

  @Column({ name: 'ProductName', type: 'nvarchar', length: 200 })
  productName!: string;

  @Column({ name: 'SKU', type: 'nvarchar', length: 100 })
  sku!: string;

  @Column({ name: 'Barcode', type: 'nvarchar', length: 100, nullable: true })
  barcode?: string;

  @Column({ name: 'Unit', type: 'nvarchar', length: 50, nullable: true })
  unit?: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 500, nullable: true })
  description?: string;

  @Column({ name: 'BuyingPrice', type: 'decimal', precision: 18, scale: 2, default: 0 })
  buyingPrice!: number;

  @Column({ name: 'SellingPrice', type: 'decimal', precision: 18, scale: 2, default: 0 })
  sellingPrice!: number;

  @Column({ name: 'CurrentStock', type: 'decimal', precision: 18, scale: 3, default: 0 })
  currentStock!: number;

  @Column({ name: 'MinimumStock', type: 'decimal', precision: 18, scale: 3, default: 0 })
  minimumStock!: number;

  @Column({ name: 'ImageUrl', type: 'nvarchar', length: 500, nullable: true })
  imageUrl?: string;

  @Column({ name: 'LastStockMovementAt', type: 'datetime2', nullable: true })
  lastStockMovementAt?: Date;

  @Column({ name: 'Status', type: 'nvarchar', length: 30, default: RecordStatus.ACTIVE })
  status!: RecordStatus;

  @ManyToOne(() => Business, (business) => business.products, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'BusinessId' })
  business?: Business;

  @ManyToOne(() => ProductCategory, (category) => category.products, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'CategoryId' })
  category?: ProductCategory;

  @OneToMany(() => InventoryTransaction, (transaction) => transaction.product)
  inventoryTransactions?: InventoryTransaction[];

  @OneToMany(() => SalesInvoiceItem, (item) => item.product)
  invoiceItems?: SalesInvoiceItem[];
}
