import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { SalesInvoice } from './sales-invoice.entity';
import { Product } from './product.entity';

@Entity({ name: 'SalesInvoiceItems' })
export class SalesInvoiceItem extends BaseUuidEntity {
  @Index()
  @Column({ name: 'InvoiceId', type: 'uniqueidentifier' })
  invoiceId!: string;

  @Index()
  @Column({ name: 'ProductId', type: 'uniqueidentifier' })
  productId!: string;

  @Column({ name: 'Quantity', type: 'decimal', precision: 18, scale: 3 })
  quantity!: number;

  @Column({ name: 'UnitPrice', type: 'decimal', precision: 18, scale: 2 })
  unitPrice!: number;

  @Column({ name: 'Discount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  discount!: number;

  @Column({ name: 'Tax', type: 'decimal', precision: 18, scale: 2, default: 0 })
  tax!: number;

  @Column({ name: 'Total', type: 'decimal', precision: 18, scale: 2 })
  total!: number;

  @ManyToOne(() => SalesInvoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'InvoiceId' })
  invoice?: SalesInvoice;

  @ManyToOne(() => Product, (product) => product.invoiceItems, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'ProductId' })
  product?: Product;
}
