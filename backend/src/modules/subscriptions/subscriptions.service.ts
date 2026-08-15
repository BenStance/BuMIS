import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { chmod, readFile, unlink } from 'fs/promises';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';
import { BusinessSubscription } from '../../database/entities/business-subscription.entity';
import { Business } from '../../database/entities/business.entity';
import { SubscriptionPayment } from '../../database/entities/subscription-payment.entity';
import { User } from '../../database/entities/user.entity';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { RequestSubscriptionDto } from './dto/request-subscription.dto';
import { SubscribeBusinessDto } from './dto/subscribe-business.dto';
import {
  AuditAction,
  BusinessStatus,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
  UserStatus,
} from '../../common/enums/domain.enums';
import { AuditService } from '../audit/audit.service';
import { MailerService } from '../../common/services/mailer.service';

type CurrentUserContext = {
  sub?: string;
  email?: string;
  role?: { name?: string };
  businessId?: string | null;
  business?: { id?: string | null } | null;
};

type SubscriptionSnapshot = {
  subscription: BusinessSubscription | null;
  latestPayment: SubscriptionPayment | null;
  status: SubscriptionStatus | null;
  needsSubscription: boolean;
  redirect: '/subscription-control';
};

const BILLING_CYCLE_DURATIONS: Record<'monthly' | 'yearly', number> = {
  monthly: 30,
  yearly: 365,
};

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  constructor(
    @InjectRepository(SubscriptionPlan) private readonly plansRepository: Repository<SubscriptionPlan>,
    @InjectRepository(BusinessSubscription) private readonly subscriptionsRepository: Repository<BusinessSubscription>,
    @InjectRepository(Business) private readonly businessesRepository: Repository<Business>,
    @InjectRepository(SubscriptionPayment) private readonly subscriptionPaymentsRepository: Repository<SubscriptionPayment>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly auditService: AuditService,
    private readonly mailerService: MailerService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultPlans().catch((error: unknown) => {
      // Keep startup resilient even if seeding fails.
      console.error('Failed to seed subscription plans:', error);
    });
  }

  findPlans(): Promise<SubscriptionPlan[]> {
    return this.plansRepository.find({ where: { isActive: true }, order: { durationDays: 'ASC' } });
  }

  async createPlan(dto: CreateSubscriptionPlanDto, currentUser?: CurrentUserContext): Promise<SubscriptionPlan> {
    const plan = await this.plansRepository.save(this.plansRepository.create(dto));
    void this.auditService.record({
      userId: currentUser?.sub,
      action: AuditAction.CREATE,
      entityName: 'SubscriptionPlan',
      entityId: plan.id,
      metadata: dto as unknown as Record<string, unknown>,
    });
    return plan;
  }

  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto, currentUser?: CurrentUserContext): Promise<SubscriptionPlan> {
    const plan = await this.plansRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    const previous = { ...plan };
    Object.assign(plan, dto);
    const saved = await this.plansRepository.save(plan);
    void this.auditService.record({
      userId: currentUser?.sub,
      action: AuditAction.UPDATE,
      entityName: 'SubscriptionPlan',
      entityId: plan.id,
      metadata: { previous, next: saved },
    });
    return saved;
  }

  async deletePlan(id: string, currentUser?: CurrentUserContext): Promise<Record<string, string>> {
    await this.plansRepository.delete(id);
    void this.auditService.record({
      userId: currentUser?.sub,
      action: AuditAction.DELETE,
      entityName: 'SubscriptionPlan',
      entityId: id,
    });
    return { message: 'Plan deleted' };
  }

  async subscribe(dto: SubscribeBusinessDto, currentUser?: CurrentUserContext): Promise<BusinessSubscription> {
    const business = await this.businessesRepository.findOne({ where: { id: dto.businessId } });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    const plan = await this.plansRepository.findOne({ where: { id: dto.planId } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const subscription = await this.subscriptionsRepository.save(
      this.subscriptionsRepository.create({
        businessId: dto.businessId,
        planId: dto.planId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        gracePeriodDays: dto.gracePeriodDays ?? 7,
        status: SubscriptionStatus.ACTIVE,
      }),
    );

    await this.businessesRepository.update(dto.businessId, { activeSubscriptionId: subscription.id, status: BusinessStatus.ACTIVE });

    void this.auditService.record({
      businessId: dto.businessId,
      userId: currentUser?.sub,
      action: AuditAction.SUBSCRIPTION_UPDATED,
      entityName: 'BusinessSubscription',
      entityId: subscription.id,
      metadata: { action: 'subscribe', dto },
    });

    return subscription;
  }

  async requestSubscription(
    dto: RequestSubscriptionDto,
    proof: Express.Multer.File | undefined,
    currentUser?: CurrentUserContext,
  ): Promise<Record<string, unknown>> {
    const businessId = currentUser?.businessId ?? currentUser?.business?.id;
    if (!businessId) {
      throw new BadRequestException('Business context is required');
    }
    if (!proof?.filename) {
      throw new BadRequestException('Payment proof is required');
    }
    const proofPath = `uploads/subscriptions/${proof.filename}`;
    const isValidProof = await this.isValidPaymentProof(proof);
    if (!isValidProof) {
      await unlink(proof.path).catch(() => undefined);
      throw new BadRequestException('Payment proof content must be a valid PDF, JPEG, or PNG file');
    }
    await chmod(proof.path, 0o600);

    const business = await this.businessesRepository.findOne({
      where: { id: businessId },
      relations: ['users', 'activeSubscription', 'activeSubscription.plan'],
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const plan = await this.plansRepository.findOne({ where: { id: dto.planId } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const billingCycle = String(dto.billingCycle || plan.billingCycle || 'monthly').toLowerCase() as 'monthly' | 'yearly';
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      throw new BadRequestException('Billing cycle must be monthly or yearly');
    }

    const amount = billingCycle === 'yearly' && Number(plan.annualPrice ?? 0) > 0 ? Number(plan.annualPrice) : Number(plan.price);
    const durationDays = dto.endDate ? undefined : BILLING_CYCLE_DURATIONS[billingCycle];

    const existingSubscription = await this.subscriptionsRepository.findOne({
      where: { businessId },
      relations: ['plan', 'payments'],
      order: { createdAt: 'DESC' },
    });
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : new Date(startDate.getTime() + (durationDays ?? plan.durationDays) * 24 * 60 * 60 * 1000);
    const paymentMethod = dto.paymentMethod?.trim() || 'bank transfer';
    const transactionReference = dto.transactionReference?.trim() || randomUUID();

    const subscription =
      existingSubscription &&
      [SubscriptionStatus.PENDING, SubscriptionStatus.PENDING_APPROVAL, SubscriptionStatus.REJECTED].includes(existingSubscription.status) &&
      existingSubscription.planId === plan.id
        ? existingSubscription
        : this.subscriptionsRepository.create({
            businessId,
            planId: plan.id,
            startDate,
            endDate,
            gracePeriodDays: dto.gracePeriodDays ?? 7,
            status: SubscriptionStatus.PENDING_APPROVAL,
            autoRenew: false,
          });

    if (!subscription.id) {
      subscription.status = SubscriptionStatus.PENDING_APPROVAL;
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.gracePeriodDays = dto.gracePeriodDays ?? 7;
    } else {
      subscription.planId = plan.id;
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.gracePeriodDays = dto.gracePeriodDays ?? subscription.gracePeriodDays;
      subscription.status = SubscriptionStatus.PENDING_APPROVAL;
    }

    const savedSubscription = await this.subscriptionsRepository.save(subscription);
    const payment = await this.subscriptionPaymentsRepository.save(
      this.subscriptionPaymentsRepository.create({
        subscriptionId: savedSubscription.id,
        businessId,
        planId: plan.id,
        amount,
        paymentMethod,
        transactionReference,
        proofPath,
        status: SubscriptionPaymentStatus.PENDING,
      }),
    );

    await this.businessesRepository.update(businessId, {
      subscriptionProofPath: proofPath,
      status: BusinessStatus.ACTIVE,
    });

    void this.auditService.record({
      businessId,
      userId: currentUser?.sub,
      action: AuditAction.SUBSCRIPTION_UPDATED,
      entityName: 'SubscriptionPayment',
      entityId: payment.id,
      metadata: {
        planId: plan.id,
        paymentMethod,
        transactionReference,
        proofPath,
        amount,
        billingCycle,
      },
    });

    await this.notifySubscriptionSubmitted(business, savedSubscription, payment, plan.name, billingCycle, currentUser);

    const snapshot = await this.getSubscriptionSnapshot(businessId);
    return {
      businessId,
      subscription: this.serializeSubscription(snapshot.subscription),
    latestPayment: this.serializePayment(snapshot.latestPayment),
    needsSubscription: snapshot.needsSubscription,
    redirect: snapshot.redirect,
    billingCycle,
    message: 'Subscription request submitted',
  };
  }

  private async isValidPaymentProof(file: Express.Multer.File): Promise<boolean> {
    const buffer = await readFile(file.path);
    if (file.mimetype === 'application/pdf') {
      return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    }
    if (file.mimetype === 'image/png') {
      return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    return file.mimetype === 'image/jpeg' && buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  async getMySubscription(currentUser?: CurrentUserContext): Promise<Record<string, unknown>> {
    const businessId = currentUser?.businessId ?? currentUser?.business?.id;
    if (!businessId) {
      throw new BadRequestException('Business context is required');
    }

    const snapshot = await this.getSubscriptionSnapshot(businessId);
    const plans = await this.findPlans();

    return {
      businessId,
      subscription: this.serializeSubscription(snapshot.subscription),
      latestPayment: this.serializePayment(snapshot.latestPayment),
      status: snapshot.status,
      needsSubscription: snapshot.needsSubscription,
      redirect: snapshot.redirect,
      plans,
    };
  }

  async renew(
    id: string,
    dto: Pick<SubscribeBusinessDto, 'startDate' | 'endDate' | 'gracePeriodDays'>,
    currentUser?: CurrentUserContext,
  ): Promise<BusinessSubscription> {
    const subscription = await this.subscriptionsRepository.findOne({ where: { id } });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.startDate = new Date(dto.startDate);
    subscription.endDate = new Date(dto.endDate);
    subscription.gracePeriodDays = dto.gracePeriodDays ?? subscription.gracePeriodDays;
    subscription.status = SubscriptionStatus.ACTIVE;
    const saved = await this.subscriptionsRepository.save(subscription);

    await this.businessesRepository.update(subscription.businessId, { activeSubscriptionId: subscription.id, status: BusinessStatus.ACTIVE });

    void this.auditService.record({
      businessId: subscription.businessId,
      userId: currentUser?.sub,
      action: AuditAction.SUBSCRIPTION_UPDATED,
      entityName: 'BusinessSubscription',
      entityId: subscription.id,
      metadata: { action: 'renew', dto },
    });
    return saved;
  }

  async listBusinessSubscriptions(businessId: string): Promise<Record<string, unknown>[]> {
    const subscriptions = await this.subscriptionsRepository.find({
      where: { businessId },
      relations: ['plan', 'payments', 'payments.reviewedBy'],
      order: { createdAt: 'DESC' },
    });

    return subscriptions.map((subscription) => ({
      ...this.serializeSubscription(subscription),
      payments: (subscription.payments ?? [])
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((payment) => this.serializePayment(payment)),
    }));
  }

  async getSubscriptionSnapshot(businessId: string): Promise<SubscriptionSnapshot> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { businessId },
      relations: ['plan', 'payments', 'payments.reviewedBy'],
      order: { createdAt: 'DESC' },
    });

    const latestPayment = subscription
      ? this.pickLatestPayment(subscription.payments ?? [])
      : null;
    const normalized = subscription ? await this.normalizeSubscriptionStatus(subscription) : null;
    const status = normalized?.status ?? null;
    const needsSubscription = !normalized || normalized.status !== SubscriptionStatus.ACTIVE;

    return {
      subscription: normalized,
      latestPayment,
      status,
      needsSubscription,
      redirect: '/subscription-control',
    };
  }

  private async normalizeSubscriptionStatus(subscription: BusinessSubscription): Promise<BusinessSubscription> {
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const shouldExpire =
      [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE].includes(subscription.status) && endDate.getTime() < now.getTime();

    if (shouldExpire) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionsRepository.save(subscription);
    }

    return subscription;
  }

  private pickLatestPayment(payments: SubscriptionPayment[]): SubscriptionPayment | null {
    if (!payments.length) {
      return null;
    }

    return [...payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
  }

  private serializeSubscription(subscription: BusinessSubscription | null): Record<string, unknown> | null {
    if (!subscription) {
      return null;
    }

    const latestPayment = this.pickLatestPayment(subscription.payments ?? []);
    return {
      id: subscription.id,
      businessId: subscription.businessId,
      planId: subscription.planId,
      plan: subscription.plan
        ? {
            id: subscription.plan.id,
            name: subscription.plan.name,
            billingCycle: subscription.plan.billingCycle,
            price: Number(subscription.plan.price),
            annualPrice: Number(subscription.plan.annualPrice ?? 0),
            durationDays: subscription.plan.durationDays,
            features: subscription.plan.features ?? null,
          }
        : null,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      gracePeriodDays: subscription.gracePeriodDays,
      status: subscription.status,
      autoRenew: subscription.autoRenew,
      notes: subscription.notes ?? null,
      latestPayment: this.serializePayment(latestPayment),
    };
  }

  private serializePayment(payment: SubscriptionPayment | null): Record<string, unknown> | null {
    if (!payment) {
      return null;
    }

    return {
      id: payment.id,
      subscriptionId: payment.subscriptionId,
      businessId: payment.businessId,
      planId: payment.planId,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod ?? null,
      transactionReference: payment.transactionReference ?? null,
      proofPath: payment.proofPath ?? null,
      status: payment.status,
      reviewedBy: payment.reviewedBy
        ? {
            id: payment.reviewedBy.id,
            fullName: payment.reviewedBy.fullName,
            email: payment.reviewedBy.email,
          }
        : null,
      reviewedAt: payment.reviewedAt ?? null,
      rejectionReason: payment.rejectionReason ?? null,
      createdAt: payment.createdAt,
    };
  }

  private async notifySubscriptionSubmitted(
    business: Business,
    subscription: BusinessSubscription,
    payment: SubscriptionPayment,
    planName: string,
    billingCycle: 'monthly' | 'yearly',
    currentUser?: CurrentUserContext,
  ): Promise<void> {
    const admins = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('LOWER(role.name) = :roleName', { roleName: 'platform administrator' })
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
      .getMany();

    const owner = business.users?.find((user) => user.status === UserStatus.ACTIVE) ?? null;
    const submittedBy = currentUser?.email ?? owner?.email ?? business.email ?? 'Unknown';

    await Promise.allSettled([
      ...(admins
        .filter((admin) => admin.email)
        .map((admin) =>
          this.mailerService.sendSubscriptionSubmitted(admin.email, {
            recipientName: admin.fullName,
            audience: 'admin',
            businessName: business.businessName,
            planName,
            billingCycle,
            amount: payment.amount,
            reference: payment.transactionReference,
            submittedBy,
          }),
        ) ?? []),
      ...(owner?.email
        ? [
            this.mailerService.sendSubscriptionSubmitted(owner.email, {
              recipientName: owner.fullName,
              audience: 'owner',
              businessName: business.businessName,
              planName,
              billingCycle,
              amount: payment.amount,
              reference: payment.transactionReference,
              submittedBy,
            }),
          ]
        : []),
    ]);
  }

  private async seedDefaultPlans(): Promise<void> {
    const canonicalPlans = [
      {
        name: 'Starter',
        billingCycle: 'monthly',
        price: 25000,
        annualPrice: 250000,
        durationDays: 30,
        features: [
          '1 Branch',
          '2 Users',
          'Unlimited Customers',
          'Unlimited Products',
          'Unlimited Invoices',
          'Sales Reports',
          'PDF Invoice Printing',
          'Basic Dashboard',
          'Email Support',
        ].join(', '),
      },
      {
        name: 'Business',
        billingCycle: 'monthly',
        price: 60000,
        annualPrice: 600000,
        durationDays: 30,
        features: [
          'Everything in Starter plus',
          '3 Branches',
          '8 Users',
          'Stock Management',
          'Purchase Management',
          'Supplier Management',
          'Expense Tracking',
          'Customer Statements',
          'Profit Reports',
          'Barcode Support',
          'Priority Email Support',
        ].join(', '),
      },
      {
        name: 'Professional',
        billingCycle: 'monthly',
        price: 120000,
        annualPrice: 1200000,
        durationDays: 30,
        features: [
          'Everything in Business plus',
          '10 Branches',
          '30 Users',
          'Role & Permission Management',
          'Multi-Store Inventory',
          'Stock Transfers',
          'Purchase Orders',
          'GRN Management',
          'Advanced Reports',
          'Dashboard Analytics',
          'Data Export',
          'WhatsApp Invoice Sharing',
          'Priority Support',
        ].join(', '),
      },
      {
        name: 'Enterprise',
        billingCycle: 'monthly',
        price: 250000,
        annualPrice: 2500000,
        durationDays: 30,
        features: [
          'Everything in Professional plus',
          'Unlimited Branches',
          'Unlimited Users',
          'API Access',
          'Custom Integrations',
          'Dedicated Account Manager',
          'Custom Reports',
          'White Label Option',
          'Priority Infrastructure',
          'Backup & Recovery',
          'SLA Support',
          'Early Access to New Features',
          'Dedicated Training',
        ].join(', '),
      },
    ] as const;

    const allPlans = await this.plansRepository.find();
    const canonicalNames = new Set<string>(canonicalPlans.map((plan) => plan.name));
    const starterPlan = allPlans.find((plan) => plan.name === 'Starter');
    const legacyStarter = allPlans.find((plan) => plan.name.toLowerCase() === 'monthly');

    if (legacyStarter) {
      if (!starterPlan) {
        legacyStarter.name = 'Starter';
        legacyStarter.billingCycle = 'monthly';
        legacyStarter.price = 25000;
        legacyStarter.annualPrice = 250000;
        legacyStarter.durationDays = 30;
        legacyStarter.isActive = true;
        legacyStarter.features = canonicalPlans[0].features;
        await this.plansRepository.save(legacyStarter);
      } else {
        const usageCount = await Promise.all([
          this.subscriptionsRepository.count({ where: { planId: legacyStarter.id } }),
          this.subscriptionPaymentsRepository.count({ where: { planId: legacyStarter.id } }),
        ]).then(([subscriptionsCount, paymentsCount]) => subscriptionsCount + paymentsCount);

        if (usageCount > 0) {
          await Promise.all([
            this.subscriptionsRepository.update({ planId: legacyStarter.id }, { planId: starterPlan.id }),
            this.subscriptionPaymentsRepository.update({ planId: legacyStarter.id }, { planId: starterPlan.id }),
          ]);
        }

        await this.plansRepository.delete(legacyStarter.id);
      }
    }

    for (const planSeed of canonicalPlans) {
      const existing = await this.plansRepository.findOne({ where: { name: planSeed.name } });
      if (existing) {
          existing.billingCycle = planSeed.billingCycle;
          existing.price = planSeed.price;
          existing.annualPrice = planSeed.annualPrice;
          existing.durationDays = planSeed.durationDays;
          existing.isActive = true;
        existing.features = planSeed.features;
        await this.plansRepository.save(existing);
      } else {
        await this.plansRepository.save(this.plansRepository.create({ ...planSeed, isActive: true }));
      }
    }

    const refreshedPlans = await this.plansRepository.find();
    const legacyPlans = refreshedPlans.filter((plan) => !canonicalNames.has(plan.name));
    for (const legacyPlan of legacyPlans) {
      const usageCount = await Promise.all([
        this.subscriptionsRepository.count({ where: { planId: legacyPlan.id } }),
        this.subscriptionPaymentsRepository.count({ where: { planId: legacyPlan.id } }),
      ]).then(([subscriptionsCount, paymentsCount]) => subscriptionsCount + paymentsCount);

      if (usageCount === 0) {
        await this.plansRepository.delete(legacyPlan.id);
      }
    }
  }
}
