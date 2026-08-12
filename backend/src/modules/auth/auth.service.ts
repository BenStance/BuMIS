import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'crypto';
import { User } from '../../database/entities/user.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { EmailOtp } from '../../database/entities/email-otp.entity';
import { OtpPurpose, SubscriptionStatus, UserStatus, BusinessStatus } from '../../common/enums/domain.enums';
import { MailerService } from '../../common/services/mailer.service';
import { Business } from '../../database/entities/business.entity';
import { BusinessSubscription } from '../../database/entities/business-subscription.entity';
import { Role } from '../../database/entities/role.entity';
import { Permission } from '../../database/entities/permission.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { UserPermission } from '../../database/entities/user-permission.entity';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../common/enums/domain.enums';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshTokensRepository: Repository<RefreshToken>,
    @InjectRepository(EmailOtp) private readonly emailOtpsRepository: Repository<EmailOtp>,
    @InjectRepository(Business) private readonly businessesRepository: Repository<Business>,
    @InjectRepository(BusinessSubscription)
    private readonly businessSubscriptionsRepository: Repository<BusinessSubscription>,
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(RolePermission) private readonly rolePermissionsRepository: Repository<RolePermission>,
    @InjectRepository(UserPermission) private readonly userPermissionsRepository: Repository<UserPermission>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    void this.seedCoreData().catch((error: unknown) =>
      this.logger.error('Background auth seed failed', error instanceof Error ? error.stack : String(error)),
    );
  }

  async registerBusiness(dto: RegisterBusinessDto): Promise<Record<string, unknown>> {
    const ownerRole = await this.rolesRepository.findOne({ where: { name: 'Business Owner' } });
    if (!ownerRole) {
      throw new BadRequestException('Business Owner role is not ready yet');
    }

    const existingBusiness = await this.businessesRepository.findOne({
      where: { businessName: dto.businessName },
    });
    if (existingBusiness) {
      throw new BadRequestException('Business name already exists');
    }

    const existingOwner = await this.usersRepository.findOne({
      where: { email: dto.ownerEmail },
    });
    if (existingOwner) {
      throw new BadRequestException('Owner email already exists');
    }

    const business = (await this.businessesRepository.save(
      this.businessesRepository.create({
        businessName: dto.businessName,
        email: dto.businessEmail,
        phone: dto.phone,
        address: dto.address,
        tin: dto.tin,
        status: BusinessStatus.ACTIVE,
        activeSubscriptionId: null,
      } as any),
    )) as unknown as Business;

    const owner = (await this.usersRepository.save(
      this.usersRepository.create({
        businessId: business.id,
        roleId: ownerRole.id,
        fullName: dto.ownerFullName,
        email: dto.ownerEmail,
        passwordHash: await bcrypt.hash(dto.ownerPassword, 12),
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      } as any),
    )) as unknown as User;

    await this.mailerService.sendMail(
      owner.email,
      'INVEXA Account Created',
      `Your INVEXA owner account has been created. Please log in using ${owner.email}.`,
      `<p>Your INVEXA owner account has been created. Please log in using <strong>${owner.email}</strong>.</p>`,
    );

    const defaultPermissions = await this.permissionsRepository.find();
    if (defaultPermissions.length) {
      await this.userPermissionsRepository.upsert(
        defaultPermissions.map((permission) => ({
          userId: owner.id,
          permissionId: permission.id,
        })),
        ['userId', 'permissionId'],
      );
    }

    return { business, owner, subscription: null };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<Record<string, unknown>> {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
      relations: ['business', 'role'],
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const session = await this.createSessionForUser(user, ipAddress, userAgent);
    void this.auditService.recordLoginAttempt({
      userId: user.id,
      businessId: user.businessId,
      email: user.email,
      success: true,
      ipAddress,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    });

    return {
      ...session,
      isReadOnly: Boolean(session.needsSubscription),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<Record<string, unknown>> {
    const tokens = await this.refreshTokensRepository.find({ relations: ['user'] });
    const tokenRecord = tokens.find((token) => bcrypt.compareSync(refreshToken, token.tokenHash));
    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = tokenRecord.user;
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = await this.createAccessToken(user.id, user.email, user.businessId, user.roleId);
    return { accessToken };
  }

  async logout(refreshToken: string): Promise<Record<string, string>> {
    const allTokens = await this.refreshTokensRepository.find({ relations: ['user'] });
    const tokenRecord = allTokens.find((token) => bcrypt.compareSync(refreshToken, token.tokenHash));
    if (tokenRecord) {
      tokenRecord.revokedAt = new Date();
      await this.refreshTokensRepository.save(tokenRecord);
    }
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<Record<string, string>> {
    const user = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      return { message: 'If the email exists, an OTP has been sent' };
    }

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    await this.emailOtpsRepository.save(
      this.emailOtpsRepository.create({
        businessId: user.businessId,
        userId: user.id,
        email: user.email,
        purpose: OtpPurpose.PASSWORD_RESET,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      }),
    );

    await this.mailerService.sendMail(
      user.email,
      'INVEXA Password Reset OTP',
      `Your password reset OTP is ${otp}. It expires in 10 minutes.`,
      `<p>Your password reset OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    );

    return { message: 'If the email exists, an OTP has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<Record<string, string>> {
    const user = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // find the latest unused OTP for this email
    const otpRecord = await this.emailOtpsRepository.findOne({
      where: { email: dto.email, purpose: OtpPurpose.PASSWORD_RESET, usedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      throw new BadRequestException('OTP is invalid or expired');
    }

    // check expiry (allow a fallback based on createdAt to tolerate timezone mismatches)
    const now = new Date();
    if (otpRecord.expiresAt < now) {
      const createdAt = new Date(otpRecord.createdAt as any);
      const ageMs = now.getTime() - createdAt.getTime();
      const fallbackWindowMs = 15 * 60 * 1000; // 15 minutes
      if (isNaN(createdAt.getTime()) || ageMs > fallbackWindowMs) {
        otpRecord.usedAt = new Date();
        await this.emailOtpsRepository.save(otpRecord);
        throw new BadRequestException('OTP is invalid or expired');
      }
      // else: tolerate expiry if created recently (fallback)
    }

    // ensure we compare string values
    const otpValue = String(dto.otp ?? '');
    const otpValid = await bcrypt.compare(otpValue, otpRecord.otpHash);
    if (!otpValid) {
      // increment attempts and block if too many
      otpRecord.attempts = (otpRecord.attempts ?? 0) + 1;
      if (otpRecord.attempts >= 5) {
        otpRecord.usedAt = new Date();
      }
      await this.emailOtpsRepository.save(otpRecord);
      throw new BadRequestException('OTP is invalid or expired');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersRepository.save(user);

    await this.mailerService.sendMail(
      user.email,
      'INVEXA Password Reset Successful',
      'Your INVEXA password has been reset successfully.',
      `<p>Your INVEXA password has been reset successfully.</p>`,
    );

    otpRecord.usedAt = new Date();
    await this.emailOtpsRepository.save(otpRecord);
    await this.refreshTokensRepository.update({ userId: user.id }, { revokedAt: new Date() });
    void this.auditService.record({
      businessId: user.businessId,
      userId: user.id,
      action: 'password_reset',
      entityName: 'User',
      entityId: user.id,
      metadata: { email: user.email },
    });

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<Record<string, string>> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new NotFoundException('User not found');
    }
    const passwordMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new BadRequestException('Current password is incorrect');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersRepository.save(user);

    await this.mailerService.sendMail(
      user.email,
      'INVEXA Password Changed',
      'Your INVEXA password has been changed successfully.',
      `<p>Your INVEXA password has been changed successfully.</p>`,
    );

    await this.refreshTokensRepository.update({ userId }, { revokedAt: new Date() });
    void this.auditService.record({
      businessId: user.businessId,
      userId: user.id,
      action: 'password_changed',
      entityName: 'User',
      entityId: user.id,
    });
    return { message: 'Password changed successfully' };
  }

  async me(userId: string): Promise<Record<string, unknown>> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['business', 'role', 'permissions', 'permissions.permission'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const current = await this.buildCurrentUser(user);
    const subscription = await this.resolveBusinessSubscription(user.businessId ?? undefined);
    return {
      ...current,
      subscription: this.serializeSubscriptionSnapshot(subscription),
      needsSubscription: !subscription || subscription.status !== SubscriptionStatus.ACTIVE,
    };
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async validateJwtUser(userId: string, businessIdOverride?: string | null): Promise<Record<string, unknown>> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['business', 'role', 'permissions', 'permissions.permission'],
    });
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }
    const currentUser: Record<string, unknown> = {
      sub: user.id,
      ...(await this.buildCurrentUser(user)),
    };
    if (businessIdOverride && businessIdOverride !== currentUser.businessId) {
      const business = await this.businessesRepository.findOne({ where: { id: businessIdOverride } });
      if (business) {
        currentUser.businessId = business.id;
        currentUser.business = { id: business.id, businessName: business.businessName, status: business.status };
      }
    }
    return currentUser;
  }

  async issueAccessToken(
    userId: string,
    email: string,
    businessId: string | null | undefined,
    roleId: string,
  ): Promise<string> {
    return this.createAccessToken(userId, email, businessId, roleId);
  }

  async createSessionForUser(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Record<string, unknown>> {
    const reloadedUser = user.passwordHash
      ? user
      : ((await this.usersRepository.findOne({
          where: { id: user.id },
          relations: ['business', 'role'],
        })) as User | null);

    if (!reloadedUser) {
      throw new NotFoundException('User not found');
    }

    const subscription = await this.resolveBusinessSubscription(reloadedUser.businessId ?? undefined);
    const accessToken = await this.createAccessToken(reloadedUser.id, reloadedUser.email, reloadedUser.businessId, reloadedUser.roleId);
    const refreshToken = await this.createRefreshToken(reloadedUser.id, ipAddress, userAgent);

    reloadedUser.lastLoginAt = new Date();
    await this.usersRepository.save(reloadedUser);

    return {
      accessToken,
      refreshToken,
      user: await this.buildCurrentUser(reloadedUser),
      subscription: this.serializeSubscriptionSnapshot(subscription),
      needsSubscription: !subscription || subscription.status !== SubscriptionStatus.ACTIVE,
    };
  }

  private async buildCurrentUser(user: User): Promise<Record<string, unknown>> {
    const directPermissions = await this.userPermissionsRepository.find({
      where: { userId: user.id },
      relations: ['permission'],
    });
    const rolePermissions = await this.userPermissionsRepository.manager
      .createQueryBuilder()
      .select('permission.Code', 'code')
      .from('RolePermissions', 'rp')
      .innerJoin('Permissions', 'permission', 'permission.Id = rp.PermissionId')
      .where('rp.RoleId = :roleId', { roleId: user.roleId })
      .getRawMany<{ code: string }>();

    const permissions = Array.from(
      new Set([
        ...directPermissions.map((item) => item.permission?.code).filter(Boolean),
        ...rolePermissions.map((item) => item.code).filter(Boolean),
      ]),
    );

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      businessId: user.businessId ?? null,
      status: user.status,
      role: user.role ? { id: user.role.id, name: user.role.name } : undefined,
      business: user.business
        ? { id: user.business.id, businessName: user.business.businessName, status: user.business.status }
        : undefined,
      permissions,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  private async createAccessToken(
    userId: string,
    email: string,
    businessId: string | null | undefined,
    roleId: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        email,
        businessId: businessId ?? null,
        roleId,
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as any,
      },
    );
  }

  private async createRefreshToken(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const refreshToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30m') as any,
      },
    );
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.refreshTokensRepository.save(
      this.refreshTokensRepository.create({
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        ipAddress,
        userAgent,
      }),
    );
    return refreshToken;
  }

  async resolveBusinessSubscription(businessId?: string): Promise<BusinessSubscription | null> {
    if (!businessId) {
      return null;
    }
    const subscription = await this.businessSubscriptionsRepository.findOne({
      where: { businessId },
      relations: ['plan', 'payments', 'payments.reviewedBy'],
      order: { createdAt: 'DESC' },
    });
    if (!subscription) {
      return null;
    }
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    if ([SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE].includes(subscription.status) && endDate.getTime() < now.getTime()) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.businessSubscriptionsRepository.save(subscription);
    }
    return subscription;
  }

  async getBusinessSubscriptionAccess(businessId?: string | null): Promise<{
    subscription: BusinessSubscription | null;
    needsSubscription: boolean;
    status: SubscriptionStatus | null;
  }> {
    const subscription = await this.resolveBusinessSubscription(businessId ?? undefined);
    return {
      subscription,
      needsSubscription: !subscription || subscription.status !== SubscriptionStatus.ACTIVE,
      status: subscription?.status ?? null,
    };
  }

  private generateOtp(): string {
    return `${randomInt(100000, 999999)}`;
  }

  private serializeSubscriptionSnapshot(subscription: BusinessSubscription | null): Record<string, unknown> | null {
    if (!subscription) {
      return null;
    }

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
      latestPayment: subscription.payments?.length ? {
        id: subscription.payments[0].id,
        status: subscription.payments[0].status,
        proofPath: subscription.payments[0].proofPath ?? null,
        transactionReference: subscription.payments[0].transactionReference ?? null,
        rejectionReason: subscription.payments[0].rejectionReason ?? null,
      } : null,
    };
  }

  async seedDefaultAccessControl(): Promise<void> {
    const permissionDefinitions = [
      ['business.create', 'Create business', 'business'],
      ['business.update', 'Update business', 'business'],
      ['user.create', 'Create user', 'users'],
      ['user.update', 'Update user', 'users'],
      ['user.delete', 'Delete user', 'users'],
      ['user.activate', 'Activate user', 'users'],
      ['user.deactivate', 'Deactivate user', 'users'],
      ['role.create', 'Create role', 'roles'],
      ['role.update', 'Update role', 'roles'],
      ['role.delete', 'Delete role', 'roles'],
      ['role.assign_permissions', 'Assign permissions to role', 'roles'],
      ['permission.create', 'Create permission', 'permissions'],
      ['permission.update', 'Update permission', 'permissions'],
      ['permission.delete', 'Delete permission', 'permissions'],
      ['category.create', 'Create category', 'categories'],
      ['category.update', 'Update category', 'categories'],
      ['category.delete', 'Delete category', 'categories'],
      ['category.view', 'View categories', 'categories'],
      ['product.create', 'Create product', 'products'],
      ['product.update', 'Update product', 'products'],
      ['product.delete', 'Delete product', 'products'],
      ['product.view', 'View products', 'products'],
      ['customer.create', 'Create customer', 'customers'],
      ['customer.update', 'Update customer', 'customers'],
      ['customer.delete', 'Delete customer', 'customers'],
      ['customer.view', 'View customers', 'customers'],
      ['vendor.create', 'Create vendor', 'vendors'],
      ['vendor.update', 'Update vendor', 'vendors'],
      ['vendor.delete', 'Delete vendor', 'vendors'],
      ['vendor.view', 'View vendors', 'vendors'],
      ['inventory.stock_in', 'Stock in inventory', 'inventory'],
      ['inventory.stock_out', 'Stock out inventory', 'inventory'],
      ['inventory.adjustment', 'Adjust inventory', 'inventory'],
      ['inventory.view', 'View inventory', 'inventory'],
      ['invoice.create', 'Create invoice', 'invoices'],
      ['invoice.update', 'Update draft invoice', 'invoices'],
      ['invoice.view', 'View invoices', 'invoices'],
      ['invoice.cancel', 'Cancel invoice', 'invoices'],
      ['sales_receipt.create', 'Create sales receipt', 'sales_receipts'],
      ['sales_receipt.post', 'Post sales receipt', 'sales_receipts'],
      ['sales_receipt.void', 'Void sales receipt', 'sales_receipts'],
      ['sales_receipt.view', 'View sales receipts', 'sales_receipts'],
      ['purchase_invoice.create', 'Create purchase invoice', 'purchase_invoices'],
      ['purchase_invoice.post', 'Post purchase invoice', 'purchase_invoices'],
      ['purchase_invoice.reverse', 'Reverse purchase invoice', 'purchase_invoices'],
      ['purchase_invoice.view', 'View purchase invoices', 'purchase_invoices'],
      ['payment_voucher.create', 'Create payment voucher', 'payment_vouchers'],
      ['payment_voucher.post', 'Post payment voucher', 'payment_vouchers'],
      ['payment_voucher.void', 'Void payment voucher', 'payment_vouchers'],
      ['payment_voucher.view', 'View payment vouchers', 'payment_vouchers'],
      ['ledger.view', 'View ledger', 'ledger'],
      ['dashboard.view', 'View dashboard', 'dashboard'],
      ['reports.view', 'View reports', 'reports'],
      ['audit.view', 'View audit logs', 'audit'],
      ['settings.view', 'View settings', 'settings'],
      ['settings.update', 'Update settings', 'settings'],
      ['admin.view', 'View admin dashboard', 'admin'],
      ['admin.impersonate', 'Login as business', 'admin'],
      ['subscription.manage', 'Manage subscriptions', 'subscriptions'],
      ['auth.change_password', 'Change password', 'auth'],
    ] as const;

    for (const [code, name, module] of permissionDefinitions) {
      const existing = await this.permissionsRepository.findOne({ where: { code } });
      if (!existing) {
        await this.permissionsRepository.save(this.permissionsRepository.create({ code, name, module }));
      }
    }

    const roles = ['Platform Administrator', 'Business Owner', 'Staff User'];
    for (const name of roles) {
      const existing = await this.rolesRepository.findOne({ where: { name } });
      if (!existing) {
        await this.rolesRepository.save(this.rolesRepository.create({ name, description: `${name} role` }));
      }
    }

    const allPermissions = await this.permissionsRepository.find();
    const adminRole = await this.rolesRepository.findOne({ where: { name: 'Platform Administrator' } });
    const ownerRole = await this.rolesRepository.findOne({ where: { name: 'Business Owner' } });
    const staffRole = await this.rolesRepository.findOne({ where: { name: 'Staff User' } });

    if (adminRole && allPermissions.length) {
      await this.rolePermissionsRepository.upsert(
        allPermissions.map((permission) =>
          ({
            roleId: adminRole.id,
            permissionId: permission.id,
          }),
        ),
        ['roleId', 'permissionId'],
      );
    }

    if (ownerRole && allPermissions.length) {
      await this.rolePermissionsRepository.upsert(
        allPermissions
          .filter((permission) => !['permissions', 'admin'].includes(permission.module ?? ''))
          .map((permission) =>
            ({
              roleId: ownerRole.id,
              permissionId: permission.id,
            }),
          ),
        ['roleId', 'permissionId'],
      );
    }

    if (staffRole && allPermissions.length) {
      await this.rolePermissionsRepository.upsert(
        allPermissions
          .filter((permission) => ['auth', 'business'].includes(permission.module ?? ''))
          .map((permission) =>
            ({
              roleId: staffRole.id,
              permissionId: permission.id,
            }),
          ),
        ['roleId', 'permissionId'],
      );
    }
  }

  private async seedCoreData(): Promise<void> {
    await this.seedDefaultAccessControl();
    await this.seedPlatformAdmin();
  }

  private async seedPlatformAdmin(): Promise<void> {
    const adminEmail = 'benedict@bumis.com';
    const legacyAdminEmail = 'benedict@bumis.co.tz';
    const adminPassword = '45653211';
    const adminRole = await this.rolesRepository.findOne({ where: { name: 'Platform Administrator' } });
    if (!adminRole) {
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const existingAdmin =
      (await this.usersRepository.findOne({ where: { email: adminEmail } })) ??
      (await this.usersRepository.findOne({ where: { email: legacyAdminEmail } }));
    if (!existingAdmin) {
      await this.usersRepository.save(
        this.usersRepository.create({
          roleId: adminRole.id,
          fullName: 'Platform Administrator',
          email: adminEmail,
          passwordHash,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        } as any),
      );
      return;
    }

    existingAdmin.email = adminEmail;
    existingAdmin.roleId = adminRole.id;
    existingAdmin.fullName = 'Platform Administrator';
    existingAdmin.passwordHash = passwordHash;
    existingAdmin.status = UserStatus.ACTIVE;
    existingAdmin.emailVerifiedAt = existingAdmin.emailVerifiedAt ?? new Date();
    await this.usersRepository.save(existingAdmin);
  }
}
