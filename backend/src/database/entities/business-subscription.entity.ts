import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Business } from './business.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { SubscriptionStatus } from '../../common/enums/domain.enums';
import { SubscriptionPayment } from './subscription-payment.entity';
import { OneToMany } from 'typeorm';

@Entity({ name: 'BusinessSubscriptions' })
export class BusinessSubscription extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uuid' })
  businessId!: string;

  @Index()
  @Column({ name: 'PlanId', type: 'uuid' })
  planId!: string;

  @Column({ name: 'StartDate', type: 'date' })
  startDate!: Date;

  @Column({ name: 'EndDate', type: 'date' })
  endDate!: Date;

  @Column({ name: 'GracePeriodDays', type: 'int', default: 0 })
  gracePeriodDays!: number;

  @Column({ name: 'Status', type: 'varchar', length: 30, default: SubscriptionStatus.PENDING })
  status!: SubscriptionStatus;

  @Column({ name: 'AutoRenew', type: 'boolean', default: false })
  autoRenew!: boolean;

  @Column({ name: 'Notes', type: 'varchar', length: 255, nullable: true })
  notes?: string;

  @ManyToOne(() => Business, (business) => business.subscriptions, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'BusinessId' })
  business?: Business;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.businessSubscriptions, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'PlanId' })
  plan?: SubscriptionPlan;

  @OneToMany(() => SubscriptionPayment, (payment) => payment.subscription)
  payments?: SubscriptionPayment[];
}
