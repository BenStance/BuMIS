import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { PurchaseInvoice } from './purchase-invoice.entity';
import { Product } from './product.entity';

@Entity({ name: 'PurchaseInvoiceItems' })
export class PurchaseInvoiceItem extends BaseUuidEntity {
  @Index()
  @Column({ name: 'PurchaseInvoiceId', type: 'uuid' })
  purchaseInvoiceId!: string;

  @Index()
  @Column({ name: 'ProductId', type: 'uuid', nullable: true })
  productId?: string;

  @Column({ name: 'Description', type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ name: 'Quantity', type: 'decimal', precision: 18, scale: 3 })
  quantity!: number;

  @Column({ name: 'UnitCost', type: 'decimal', precision: 18, scale: 2 })
  unitCost!: number;

  @Column({ name: 'DiscountAmount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ name: 'TaxRate', type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxRate!: number;

  @Column({ name: 'TaxAmount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ name: 'LineSubtotal', type: 'decimal', precision: 18, scale: 2 })
  lineSubtotal!: number;

  @Column({ name: 'LineTotal', type: 'decimal', precision: 18, scale: 2 })
  lineTotal!: number;

  @Column({ name: 'IsInventoryItem', type: 'boolean', default: true })
  isInventoryItem!: boolean;

  @ManyToOne(() => PurchaseInvoice, (purchaseInvoice) => purchaseInvoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'PurchaseInvoiceId' })
  purchaseInvoice?: PurchaseInvoice;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'ProductId' })
  product?: Product;
}
