import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../../database/entities/business.entity';
import { SystemSetting } from '../../database/entities/system-setting.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../common/enums/domain.enums';

type CurrentUserContext = {
  sub?: string;
  businessId?: string | null;
  business?: { id?: string | null } | null;
  email?: string;
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Business) private readonly businessesRepository: Repository<Business>,
    @InjectRepository(SystemSetting) private readonly settingsRepository: Repository<SystemSetting>,
    private readonly auditService: AuditService,
  ) {}

  async getAll(currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    return this.buildSettingsResponse(businessId);
  }

  async updateBusiness(currentUser: CurrentUserContext, dto: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    const business = await this.businessesRepository.findOne({ where: { id: businessId } });
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const previous = this.buildBusinessProfile(business);
    if (dto.businessName !== undefined) {
      business.businessName = String(dto.businessName);
    }
    if (dto.logo !== undefined) {
      business.logo = dto.logo ? String(dto.logo) : undefined;
    }
    if (dto.address !== undefined) {
      business.address = dto.address ? String(dto.address) : undefined;
    }
    if (dto.phone !== undefined) {
      business.phone = dto.phone ? String(dto.phone) : undefined;
    }
    if (dto.email !== undefined) {
      business.email = dto.email ? String(dto.email) : undefined;
    }
    if (dto.tin !== undefined) {
      business.tin = dto.tin ? String(dto.tin) : undefined;
    }

    await this.businessesRepository.save(business);
    await this.upsertSetting(businessId, 'business.description', dto.description);
    await this.upsertSetting(businessId, 'business.website', dto.website);
    await this.auditService.record({
      businessId,
      userId: currentUser.sub,
      action: AuditAction.SETTINGS_UPDATED,
      entityName: 'Settings',
      entityId: 'business',
      metadata: { previous, next: this.buildBusinessProfile(business) },
    });
    return this.buildSettingsResponse(businessId);
  }

  async updateSmtp(currentUser: CurrentUserContext, dto: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    await this.upsertSetting(businessId, 'smtp.host', dto.host);
    await this.upsertSetting(businessId, 'smtp.port', dto.port);
    await this.upsertSetting(businessId, 'smtp.from_email', dto.fromEmail ?? dto.from);
    await this.upsertSetting(businessId, 'smtp.from_name', dto.fromName);
    await this.upsertSetting(businessId, 'smtp.username', dto.username);
    await this.upsertSetting(businessId, 'smtp.password', dto.password);
    await this.upsertSetting(businessId, 'smtp.encryption', dto.encryption);
    await this.auditService.record({
      businessId,
      userId: currentUser.sub,
      action: AuditAction.SETTINGS_UPDATED,
      entityName: 'Settings',
      entityId: 'smtp',
      metadata: { next: dto },
    });
    return this.loadCategory(businessId, 'smtp');
  }

  async updateInvoice(currentUser: CurrentUserContext, dto: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    await this.upsertSetting(businessId, 'invoice.number_prefix', dto.prefix);
    await this.upsertSetting(businessId, 'invoice.number_include_year', dto.includeYear);
    await this.upsertSetting(businessId, 'invoice.number_padding', dto.padding);
    await this.upsertSetting(businessId, 'invoice.walk_in_customer_name', dto.walkInCustomerName);
    await this.upsertSetting(businessId, 'invoice.print_layout', dto.printLayout);
    await this.upsertSetting(businessId, 'invoice.footer_notes', dto.footerNotes);
    await this.upsertSetting(businessId, 'invoice.payment_instructions', dto.paymentInstructions);
    await this.upsertSetting(businessId, 'invoice.signature_area', dto.signatureArea);
    await this.upsertSetting(businessId, 'invoice.auto_purchase_payment', dto.autoPurchasePayment);
    await this.upsertSetting(businessId, 'invoice.auto_sales_receipt', dto.autoSalesReceipt);
    await this.auditService.record({
      businessId,
      userId: currentUser.sub,
      action: AuditAction.SETTINGS_UPDATED,
      entityName: 'Settings',
      entityId: 'invoice',
      metadata: { next: dto },
    });
    return this.loadCategory(businessId, 'invoice');
  }

  async updateCurrency(currentUser: CurrentUserContext, dto: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    await this.upsertSetting(businessId, 'currency.name', dto.name);
    await this.upsertSetting(businessId, 'currency.symbol', dto.symbol);
    await this.upsertSetting(businessId, 'currency.decimal_precision', dto.decimalPrecision);
    await this.upsertSetting(businessId, 'currency.thousands_separator', dto.thousandsSeparator);
    await this.upsertSetting(businessId, 'currency.decimal_separator', dto.decimalSeparator);
    await this.auditService.record({
      businessId,
      userId: currentUser.sub,
      action: AuditAction.SETTINGS_UPDATED,
      entityName: 'Settings',
      entityId: 'currency',
      metadata: { next: dto },
    });
    return this.loadCategory(businessId, 'currency');
  }

  async updateTax(currentUser: CurrentUserContext, dto: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    await this.upsertSetting(businessId, 'tax.enabled', dto.enabled);
    await this.upsertSetting(businessId, 'tax.rate', dto.rate);
    await this.upsertSetting(businessId, 'tax.name', dto.name);
    await this.upsertSetting(businessId, 'tax.display', dto.display);
    await this.auditService.record({
      businessId,
      userId: currentUser.sub,
      action: AuditAction.SETTINGS_UPDATED,
      entityName: 'Settings',
      entityId: 'tax',
      metadata: { next: dto },
    });
    return this.loadCategory(businessId, 'tax');
  }

  async getCategory(currentUser: CurrentUserContext, category: string): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    return this.loadCategory(businessId, category);
  }

  private async loadCategory(businessId: string, category: string): Promise<Record<string, unknown>> {
    const settings = await this.settingsRepository.find({ where: { businessId, category } });
    return {
      category,
      settings: Object.fromEntries(settings.map((item) => [item.key, this.parseValue(item.value)])),
    };
  }

  private async buildSettingsResponse(businessId: string): Promise<Record<string, unknown>> {
    const [business, settings] = await Promise.all([
      this.businessesRepository.findOne({ where: { id: businessId } }),
      this.settingsRepository.find({ where: { businessId } }),
    ]);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const grouped = settings.reduce<Record<string, Record<string, unknown>>>((acc, setting) => {
      const category = setting.category ?? 'general';
      acc[category] ??= {};
      acc[category][setting.key] = this.parseValue(setting.value);
      return acc;
    }, {});

    return {
      business: this.buildBusinessProfile(business),
      settings: grouped,
    };
  }

  private buildBusinessProfile(business: Business): Record<string, unknown> {
    return {
      id: business.id,
      businessName: business.businessName,
      logo: business.logo ?? null,
      address: business.address ?? null,
      phone: business.phone ?? null,
      email: business.email ?? null,
      tin: business.tin ?? null,
      status: business.status,
    };
  }

  private async upsertSetting(businessId: string, key: string, value: unknown): Promise<void> {
    const existing = await this.settingsRepository.findOne({ where: { businessId, key } });
    const serialized = value === undefined || value === null ? null : String(value);
    if (existing) {
      existing.value = serialized ?? undefined;
      existing.category = this.resolveCategory(key);
      await this.settingsRepository.save(existing);
      return;
    }

    await this.settingsRepository.save(
      this.settingsRepository.create({
        businessId,
        key,
        value: serialized ?? undefined,
        category: this.resolveCategory(key),
      } as any),
    );
  }

  private resolveCategory(key: string): string {
    if (key.startsWith('smtp.')) {
      return 'smtp';
    }
    if (key.startsWith('invoice.')) {
      return 'invoice';
    }
    if (key.startsWith('currency.')) {
      return 'currency';
    }
    if (key.startsWith('tax.')) {
      return 'tax';
    }
    if (key.startsWith('business.')) {
      return 'business';
    }
    return 'general';
  }

  private parseValue(value?: string | null): string | number | boolean | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    const numeric = Number(value);
    return Number.isNaN(numeric) || value.trim() === '' ? value : numeric;
  }

  private requireBusinessId(currentUser: CurrentUserContext): string {
    const businessId = currentUser.businessId ?? currentUser.business?.id ?? undefined;
    if (!businessId) {
      throw new BadRequestException('Business context is required');
    }
    return businessId;
  }
}
