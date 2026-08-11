import { Column, Entity, Index, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { BusinessStatus } from '../../common/enums/domain.enums';
import { BusinessSubscription } from './business-subscription.entity';
import { SubscriptionPayment } from './subscription-payment.entity';
import { Customer } from './customer.entity';
import { InventoryTransaction } from './inventory-transaction.entity';
import { Product } from './product.entity';
import { ProductCategory } from './product-category.entity';
import { SalesInvoice } from './sales-invoice.entity';
import { User } from './user.entity';
import { Vendor } from './vendor.entity';
import { SystemSetting } from './system-setting.entity';

@Entity({ name: 'Businesses' })
export class Business extends BaseUuidEntity {
  @Index({ unique: true })
  @Column({ name: 'BusinessName', type: 'nvarchar', length: 200 })
  businessName!: string;

  @Column({ name: 'Logo', type: 'nvarchar', length: 500, nullable: true })
  logo?: string;

  @Column({ name: 'Address', type: 'nvarchar', length: 300, nullable: true })
  address?: string;

  @Column({ name: 'Phone', type: 'nvarchar', length: 50, nullable: true })
  phone?: string;

  @Column({ name: 'Email', type: 'nvarchar', length: 150, nullable: true })
  email?: string;

  @Column({ name: 'TIN', type: 'nvarchar', length: 50, nullable: true })
  tin?: string;

  @Column({ name: 'Status', type: 'nvarchar', length: 30, default: BusinessStatus.ACTIVE })
  status!: BusinessStatus;

  @Column({ name: 'ActiveSubscriptionId', type: 'uniqueidentifier', nullable: true })
  activeSubscriptionId?: string;

  @Column({ name: 'SubscriptionProofPath', type: 'nvarchar', length: 500, nullable: true })
  subscriptionProofPath?: string;

  @OneToOne(() => BusinessSubscription, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ActiveSubscriptionId' })
  activeSubscription?: BusinessSubscription;

  @OneToMany(() => User, (user) => user.business)
  users?: User[];

  @OneToMany(() => ProductCategory, (category) => category.business)
  categories?: ProductCategory[];

  @OneToMany(() => Product, (product) => product.business)
  products?: Product[];

  @OneToMany(() => Customer, (customer) => customer.business)
  customers?: Customer[];

  @OneToMany(() => Vendor, (vendor) => vendor.business)
  vendors?: Vendor[];

  @OneToMany(() => SalesInvoice, (invoice) => invoice.business)
  invoices?: SalesInvoice[];

  @OneToMany(() => BusinessSubscription, (subscription) => subscription.business)
  subscriptions?: BusinessSubscription[];

  @OneToMany(() => SubscriptionPayment, (payment) => payment.business)
  subscriptionPayments?: SubscriptionPayment[];

  @OneToMany(() => InventoryTransaction, (transaction) => transaction.business)
  inventoryTransactions?: InventoryTransaction[];

  @OneToMany(() => SystemSetting, (setting) => setting.business)
  settings?: SystemSetting[];
}
