import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Business } from '../../database/entities/business.entity';
import { BusinessSubscription } from '../../database/entities/business-subscription.entity';
import { SubscriptionPlan } from '../../database/entities/subscription-plan.entity';
import { SubscriptionPayment } from '../../database/entities/subscription-payment.entity';
import { User } from '../../database/entities/user.entity';
import { SalesInvoice } from '../../database/entities/sales-invoice.entity';
import { BusinessStatus, RecordStatus, SubscriptionPaymentStatus, SubscriptionStatus, UserStatus } from '../../common/enums/domain.enums';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../common/enums/domain.enums';

type CurrentUserContext = {
  sub?: string;
  email?: string;
  role?: { name?: string };
  businessId?: string | null;
  business?: { id?: string | null } | null;
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Business) private readonly businessesRepository: Repository<Business>,
    @InjectRepository(BusinessSubscription)
    private readonly subscriptionsRepository: Repository<BusinessSubscription>,
    @InjectRepository(SubscriptionPlan) private readonly plansRepository: Repository<SubscriptionPlan>,
    @InjectRepository(SubscriptionPayment) private readonly subscriptionPaymentsRepository: Repository<SubscriptionPayment>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(SalesInvoice) private readonly invoicesRepository: Repository<SalesInvoice>,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  async dashboard(currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    this.assertPlatformAdmin(currentUser);
    const [businesses, activeBusinesses, expiredSubscriptions, activeUsers, invoices, subscriptions] = await Promise.all([
      this.businessesRepository.count(),
      this.businessesRepository.count({ where: { status: RecordStatus.ACTIVE } as any }),
      this.subscriptionsRepository.count({ where: { endDate: Between(new Date('2000-01-01'), new Date()) } as any }),
      this.usersRepository.count({ where: { status: UserStatus.ACTIVE } }),
      this.invoicesRepository.count(),
      this.subscriptionsRepository.find({ relations: ['plan'] }),
    ]);

    const platformRevenue = subscriptions.reduce((sum, sub) => sum + Number(sub.plan?.price ?? 0), 0);
    const newRegistrations = await this.businessesRepository.count({
      where: {
        createdAt: Between(this.monthStart(), new Date()),
      } as any,
    });

    return {
      totalBusinesses: businesses,
      activeBusinesses,
      expiredSubscriptions,
      activeUsers,
      totalSalesInvoicesGenerated: invoices,
      platformRevenue,
      newRegistrations,
      systemHealth: { status: 'ok' },
    };
  }

  async businesses(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.assertPlatformAdmin(currentUser);
    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 20), 1), 100);
    const search = String(filters.search ?? '').trim();
    const status = String(filters.status ?? '').trim() as RecordStatus | '';
    const query = this.businessesRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.activeSubscription', 'subscription')
      .leftJoinAndSelect('subscription.plan', 'plan');

    if (search) {
      query.andWhere('(business.businessName LIKE :search OR business.email LIKE :search OR business.phone LIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (status) {
      query.andWhere('business.status = :status', { status });
    }

    const [items, total] = await query.orderBy('business.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    const payload = await Promise.all(
      items.map(async (business) => ({
        id: business.id,
        businessName: business.businessName,
        ownerName: await this.resolveOwnerName(business.id),
        registrationDate: business.createdAt,
        subscriptionPlan: business.activeSubscription?.plan?.name ?? null,
        subscriptionStatus: business.activeSubscription?.status ?? null,
        activeUsers: await this.usersRepository.count({ where: { businessId: business.id, status: UserStatus.ACTIVE } }),
        currentStatus: business.status,
      })),
    );
    return { items: payload, page, limit, total };
  }

  async businessStatistics(currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    this.assertPlatformAdmin(currentUser);
    const [totalBusinesses, newBusinessesThisMonth, businesses, users] = await Promise.all([
      this.businessesRepository.count(),
      this.businessesRepository.count({ where: { createdAt: Between(this.monthStart(), new Date()) } as any }),
      this.businessesRepository.find({ relations: ['activeSubscription', 'activeSubscription.plan'] }),
      this.usersRepository.find(),
    ]);
    const bySubscriptionPlan = businesses.reduce<Record<string, number>>((acc, business) => {
      const plan = business.activeSubscription?.plan?.name ?? 'Unassigned';
      acc[plan] = (acc[plan] ?? 0) + 1;
      return acc;
    }, {});
    const byStatus = businesses.reduce<Record<string, number>>((acc, business) => {
      acc[business.status] = (acc[business.status] ?? 0) + 1;
      return acc;
    }, {});
    return {
      totalBusinesses,
      newBusinessesThisMonth,
      businessesBySubscriptionPlan: bySubscriptionPlan,
      businessesByStatus: byStatus,
      averageUsersPerBusiness: totalBusinesses ? users.length / totalBusinesses : 0,
    };
  }

  async activeUsers(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.assertPlatformAdmin(currentUser);
    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 20), 1), 100);
    const search = String(filters.search ?? '').trim();
    const businessId = String(filters.businessId ?? '').trim();
    const roleId = String(filters.roleId ?? '').trim();
    const query = this.usersRepository.createQueryBuilder('user').leftJoinAndSelect('user.business', 'business').leftJoinAndSelect('user.role', 'role').where('user.status = :status', {
      status: UserStatus.ACTIVE,
    });

    if (search) {
      query.andWhere('(user.fullName LIKE :search OR user.email LIKE :search OR business.businessName LIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (businessId) {
      query.andWhere('user.businessId = :businessId', { businessId });
    }
    if (roleId) {
      query.andWhere('user.roleId = :roleId', { roleId });
    }

    const [items, total] = await query.orderBy('user.lastLoginAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return {
      items: items.map((user) => ({
        id: user.id,
        userName: user.fullName,
        business: user.business?.businessName ?? null,
        role: user.role?.name ?? null,
        lastLogin: user.lastLoginAt ?? null,
        accountStatus: user.status,
      })),
      page,
      limit,
      total,
    };
  }

  async subscriptions(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.assertPlatformAdmin(currentUser);
    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 20), 1), 100);
    const businessId = String(filters.businessId ?? '').trim();
    const status = String(filters.status ?? '').trim() as SubscriptionStatus | '';
    const query = this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.business', 'business')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .leftJoinAndSelect('subscription.payments', 'payment')
      .leftJoinAndSelect('payment.reviewedBy', 'reviewedBy');

    if (businessId) {
      query.andWhere('subscription.businessId = :businessId', { businessId });
    }
    if (status) {
      query.andWhere('subscription.status = :status', { status });
    }

    const [items, total] = await query.orderBy('subscription.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return {
      items: items.map((subscription) => ({
        id: subscription.id,
        business: subscription.business?.businessName ?? null,
        plan: subscription.plan?.name ?? null,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        gracePeriodDays: subscription.gracePeriodDays,
        autoRenew: subscription.autoRenew,
        latestPayment: this.latestPayment(subscription.payments),
      })),
      page,
      limit,
      total,
    };
  }

  async revenueAnalytics(currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    this.assertPlatformAdmin(currentUser);
    const subscriptions = await this.subscriptionsRepository.find({ relations: ['plan'] });
    const monthlySubscriptionRevenue = subscriptions.reduce((sum, subscription) => sum + Number(subscription.plan?.price ?? 0), 0);
    const annualRevenue = monthlySubscriptionRevenue * 12;
    const revenueBySubscriptionPlan = subscriptions.reduce<Record<string, number>>((acc, subscription) => {
      const plan = subscription.plan?.name ?? 'Unassigned';
      acc[plan] = (acc[plan] ?? 0) + Number(subscription.plan?.price ?? 0);
      return acc;
    }, {});
    const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.ACTIVE).length;
    const expiredSubscriptions = subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.EXPIRED).length;

    return {
      monthlySubscriptionRevenue,
      annualRevenue,
      revenueBySubscriptionPlan,
      activeVsExpiredSubscriptions: {
        active: activeSubscriptions,
        expired: expiredSubscriptions,
      },
      subscriptionRenewalRate: subscriptions.length ? activeSubscriptions / subscriptions.length : 0,
    };
  }

  async loginAsBusiness(currentUser: CurrentUserContext, businessId: string): Promise<Record<string, unknown>> {
    this.assertPlatformAdmin(currentUser);
    const business = await this.businessesRepository.findOne({ where: { id: businessId }, relations: ['activeSubscription'] });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    const owner = await this.usersRepository.findOne({
      where: {
        businessId: business.id,
      },
      relations: ['business', 'role'],
      order: { createdAt: 'ASC' },
    });
    const impersonatedOwner = owner?.role?.name === 'Business Owner' ? owner : null;
    if (!impersonatedOwner) {
      throw new NotFoundException('Business owner not found');
    }

    const admin = await this.usersRepository.findOne({
      where: { id: currentUser.sub },
      relations: ['business', 'role'],
    });
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    const session = await this.authService.createSessionForUser(impersonatedOwner);
    await this.auditService.record({
      businessId: business.id,
      userId: currentUser.sub,
      action: AuditAction.ADMIN_IMPERSONATION,
      entityName: 'Business',
      entityId: business.id,
      metadata: { adminEmail: admin.email, businessName: business.businessName, ownerEmail: impersonatedOwner.email },
    });

    return {
      ...session,
      business: {
        id: business.id,
        businessName: business.businessName,
        status: business.status,
      },
      impersonatedOwner: {
        id: impersonatedOwner.id,
        email: impersonatedOwner.email,
        fullName: impersonatedOwner.fullName,
      },
    };
  }

  async getBusiness(currentUser: CurrentUserContext, businessId: string): Promise<Record<string, unknown>> {
    this.assertPlatformAdmin(currentUser);
    const business = await this.businessesRepository.findOne({
      where: { id: businessId },
      relations: ['activeSubscription', 'activeSubscription.plan', 'users'],
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return {
      id: business.id,
      businessName: business.businessName,
      logo: business.logo ?? null,
      address: business.address ?? null,
      phone: business.phone ?? null,
      email: business.email ?? null,
      tin: business.tin ?? null,
      status: business.status,
      activeSubscription: business.activeSubscription
        ? {
            id: business.activeSubscription.id,
            plan: business.activeSubscription.plan?.name ?? null,
            status: business.activeSubscription.status,
            startDate: business.activeSubscription.startDate,
            endDate: business.activeSubscription.endDate,
          }
        : null,
      activeUsers: business.users?.filter((user) => user.status === UserStatus.ACTIVE).length ?? 0,
    };
  }

  async renewSubscription(currentUser: CurrentUserContext, subscriptionId: string, dto: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.assertPlatformAdmin(currentUser);
    const subscription = await this.subscriptionsRepository.findOne({ where: { id: subscriptionId } });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    if (dto.startDate) {
      subscription.startDate = new Date(String(dto.startDate));
    }
    if (dto.endDate) {
      subscription.endDate = new Date(String(dto.endDate));
    }
    if (dto.gracePeriodDays !== undefined) {
      subscription.gracePeriodDays = Number(dto.gracePeriodDays);
    }
    if (dto.planId) {
      const plan = await this.plansRepository.findOne({ where: { id: String(dto.planId) } });
      if (!plan) {
        throw new NotFoundException('Plan not found');
      }
      subscription.planId = plan.id;
    }
    subscription.status = SubscriptionStatus.ACTIVE;
    await this.subscriptionsRepository.save(subscription);
    await this.businessesRepository.update(subscription.businessId, {
      activeSubscriptionId: subscription.id,
      status: BusinessStatus.ACTIVE,
    });
    await this.auditService.record({
      businessId: subscription.businessId,
      userId: currentUser.sub,
      action: AuditAction.SUBSCRIPTION_UPDATED,
      entityName: 'BusinessSubscription',
      entityId: subscription.id,
      metadata: dto,
    });
    return this.getBusiness(currentUser, subscription.businessId);
  }

  async updateSubscriptionStatus(
    currentUser: CurrentUserContext,
    subscriptionId: string,
    status: SubscriptionStatus,
    dto?: { rejectionReason?: string },
  ): Promise<Record<string, unknown>> {
    this.assertPlatformAdmin(currentUser);
    const subscription = await this.subscriptionsRepository.findOne({ where: { id: subscriptionId }, relations: ['payments'] });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    subscription.status = status;
    await this.subscriptionsRepository.save(subscription);

    const latestPayment = this.latestPaymentEntity(subscription.payments);
    if (latestPayment) {
      latestPayment.status = status === SubscriptionStatus.ACTIVE ? SubscriptionPaymentStatus.APPROVED : latestPayment.status;
      latestPayment.reviewedAt = new Date();
      latestPayment.reviewedById = currentUser.sub;
      if (status === SubscriptionStatus.REJECTED) {
        latestPayment.status = SubscriptionPaymentStatus.REJECTED;
        latestPayment.rejectionReason = dto?.rejectionReason ?? latestPayment.rejectionReason ?? null;
      }
      await this.subscriptionPaymentsRepository.save(latestPayment);
    }

    const businessUpdate: Record<string, unknown> = {
      activeSubscriptionId: status === SubscriptionStatus.ACTIVE ? subscription.id : null,
    };
    if (status === SubscriptionStatus.SUSPENDED) {
      businessUpdate.status = BusinessStatus.SUSPENDED;
    } else if (status === SubscriptionStatus.ACTIVE) {
      businessUpdate.status = BusinessStatus.ACTIVE;
    }
    await this.businessesRepository.update(subscription.businessId, businessUpdate as never);

    await this.auditService.record({
      businessId: subscription.businessId,
      userId: currentUser.sub,
      action: AuditAction.SUBSCRIPTION_UPDATED,
      entityName: 'BusinessSubscription',
      entityId: subscription.id,
      metadata: { status },
    });
    return this.getBusiness(currentUser, subscription.businessId);
  }

  private async resolveOwnerName(businessId: string): Promise<string | null> {
    const owner = await this.usersRepository.findOne({
      where: { businessId },
      relations: ['role'],
    });
    return owner?.fullName ?? null;
  }

  private latestPaymentEntity(payments?: any[] | null): any | null {
    if (!payments?.length) {
      return null;
    }

    return [...payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
  }

  private latestPayment(payments?: any[] | null): Record<string, unknown> | null {
    const payment = this.latestPaymentEntity(payments);
    if (!payment) {
      return null;
    }

    return {
      id: payment.id,
      status: payment.status,
      proofPath: payment.proofPath ?? null,
      transactionReference: payment.transactionReference ?? null,
      rejectionReason: payment.rejectionReason ?? null,
      reviewedAt: payment.reviewedAt ?? null,
      reviewedBy: payment.reviewedBy
        ? { id: payment.reviewedBy.id, fullName: payment.reviewedBy.fullName, email: payment.reviewedBy.email }
        : null,
    };
  }

  private monthStart(): Date {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  private assertPlatformAdmin(currentUser: CurrentUserContext): void {
    if (currentUser.role?.name !== 'Platform Administrator') {
      throw new ForbiddenException('Platform administrator access required');
    }
  }
}
