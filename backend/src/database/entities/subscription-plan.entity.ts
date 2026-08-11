import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { BusinessSubscription } from './business-subscription.entity';

@Entity({ name: 'SubscriptionPlans' })
export class SubscriptionPlan extends BaseUuidEntity {
  @Index({ unique: true })
  @Column({ name: 'Name', type: 'nvarchar', length: 100 })
  name!: string;

  @Column({ name: 'BillingCycle', type: 'nvarchar', length: 30 })
  billingCycle!: string;

  @Column({ name: 'Price', type: 'decimal', precision: 18, scale: 2, default: 0 })
  price!: number;

  @Column({ name: 'AnnualPrice', type: 'decimal', precision: 18, scale: 2, default: 0 })
  annualPrice!: number;

  @Column({ name: 'DurationDays', type: 'int' })
  durationDays!: number;

  @Column({ name: 'IsActive', type: 'bit', default: true })
  isActive!: boolean;

  @Column({ name: 'Features', type: 'nvarchar', length: 'max', nullable: true })
  features?: string;

  @OneToMany(() => BusinessSubscription, (subscription) => subscription.plan)
  businessSubscriptions?: BusinessSubscription[];
}
