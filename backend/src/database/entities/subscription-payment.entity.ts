import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Business } from './business.entity';
import { BusinessSubscription } from './business-subscription.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { SubscriptionPaymentStatus } from '../../common/enums/domain.enums';
import { User } from './user.entity';

@Entity({ name: 'SubscriptionPayments' })
export class SubscriptionPayment extends BaseUuidEntity {
  @Index()
  @Column({ name: 'SubscriptionId', type: 'uniqueidentifier' })
  subscriptionId!: string;

  @Index()
  @Column({ name: 'BusinessId', type: 'uniqueidentifier' })
  businessId!: string;

  @Index()
  @Column({ name: 'PlanId', type: 'uniqueidentifier' })
  planId!: string;

  @Column({ name: 'Amount', type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount!: number;

  @Column({ name: 'PaymentMethod', type: 'nvarchar', length: 100, nullable: true })
  paymentMethod?: string;

  @Column({ name: 'TransactionReference', type: 'nvarchar', length: 150, nullable: true })
  transactionReference?: string;

  @Column({ name: 'ProofPath', type: 'nvarchar', length: 500, nullable: true })
  proofPath?: string;

  @Column({ name: 'Status', type: 'nvarchar', length: 30, default: SubscriptionPaymentStatus.PENDING })
  status!: SubscriptionPaymentStatus;

  @Column({ name: 'ReviewedBy', type: 'uniqueidentifier', nullable: true })
  reviewedById?: string;

  @Column({ name: 'ReviewedAt', type: 'datetime2', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'RejectionReason', type: 'nvarchar', length: 500, nullable: true })
  rejectionReason?: string;

  @ManyToOne(() => BusinessSubscription, (subscription) => subscription.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'SubscriptionId' })
  subscription?: BusinessSubscription;

  @ManyToOne(() => Business, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'BusinessId' })
  business?: Business;

  @ManyToOne(() => SubscriptionPlan, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'PlanId' })
  plan?: SubscriptionPlan;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'ReviewedBy' })
  reviewedBy?: User;
}
