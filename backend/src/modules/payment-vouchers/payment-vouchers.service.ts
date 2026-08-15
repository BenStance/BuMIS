import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { PaymentVoucher } from '../../database/entities/payment-voucher.entity';
import { PaymentVoucherAllocation } from '../../database/entities/payment-voucher-allocation.entity';
import { PurchaseInvoice } from '../../database/entities/purchase-invoice.entity';
import { Vendor } from '../../database/entities/vendor.entity';
import { SystemSetting } from '../../database/entities/system-setting.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { AuditAction, DocumentStatus, LedgerEntrySourceType, PaymentDocumentStatus, PaymentStatus, RecordStatus } from '../../common/enums/domain.enums';
import { LedgerService } from '../ledger/ledger.service';
import { DocumentNumberingService } from '../document-numbering/document-numbering.service';
import { CreatePaymentVoucherDto, CreatePaymentVoucherAllocationDto } from './dto/create-payment-voucher.dto';
import { VoidPaymentVoucherDto } from './dto/void-payment-voucher.dto';

type CurrentUserContext = {
  sub?: string;
  businessId?: string | null;
  business?: { id?: string | null } | null;
};

type VoucherSettings = {
  prefix: string;
  includeYear: boolean;
  padding: number;
};

@Injectable()
export class PaymentVouchersService {
  constructor(
    @InjectRepository(PaymentVoucher) private readonly vouchersRepository: Repository<PaymentVoucher>,
    @InjectRepository(PaymentVoucherAllocation) private readonly allocationsRepository: Repository<PaymentVoucherAllocation>,
    @InjectRepository(PurchaseInvoice) private readonly purchaseInvoicesRepository: Repository<PurchaseInvoice>,
    @InjectRepository(Vendor) private readonly vendorsRepository: Repository<Vendor>,
    @InjectRepository(SystemSetting) private readonly systemSettingsRepository: Repository<SystemSetting>,
    @InjectRepository(AuditLog) private readonly auditLogsRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
    private readonly documentNumberingService: DocumentNumberingService,
  ) {}

  async findAll(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser, filters.businessId as string | undefined);
    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 20), 1), 100);
    const search = this.normalizeFilterValue(filters.search);
    const vendorId = this.normalizeFilterValue(filters.vendorId);
    const status = this.normalizeFilterValue(filters.status);

    const query = this.vouchersRepository
      .createQueryBuilder('voucher')
      .leftJoinAndSelect('voucher.vendor', 'vendor')
      .where('voucher.businessId = :businessId', { businessId });

    if (search) {
      query.andWhere('(voucher.voucherNumber LIKE :search OR voucher.referenceNumber LIKE :search OR vendor.name LIKE :search)', { search: `%${search}%` });
    }
    if (vendorId) {
      query.andWhere('voucher.vendorId = :vendorId', { vendorId });
    }
    if (status) {
      query.andWhere('voucher.status = :status', { status });
    }

    const [items, total] = await query.orderBy('voucher.paymentDate', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { items: items.map((item) => this.shapeSummary(item)), page, limit, total };
  }

  async findOne(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const voucher = await this.vouchersRepository.findOne({
      where: { id },
      relations: ['vendor', 'createdBy', 'postedBy', 'voidedBy', 'allocations', 'allocations.purchaseInvoice'],
    });
    if (!voucher) {
      throw new NotFoundException('Payment voucher not found');
    }
    this.assertBusinessAccess(voucher.businessId, currentUser);
    return this.shapeDetail(voucher);
  }

  async create(dto: CreatePaymentVoucherDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const businessId = this.requireBusinessId(currentUser);
      const vendor = await this.resolveVendor(manager, businessId, dto.vendorId);
      const allocations = await this.normalizeAllocations(manager, businessId, vendor.id, dto.allocations);
      const totalAllocated = allocations.reduce((sum, item) => sum + Number(item.allocatedAmount ?? 0), 0);
      if (Number(dto.amount) !== totalAllocated) {
        throw new BadRequestException('Voucher amount must equal total allocated amount');
      }
      const settings = await this.loadSettings(businessId, manager);
      const voucherNumber = await this.documentNumberingService.generate(
        {
          businessId,
          documentType: 'payment_voucher',
          prefix: settings.prefix,
          includeYear: settings.includeYear,
          padding: settings.padding,
        },
        manager,
      );

      const voucherRepository = manager.getRepository(PaymentVoucher);
      const voucher = await voucherRepository.save(
        voucherRepository.create({
          businessId,
          vendorId: vendor.id,
          createdById: currentUser.sub as string,
          voucherNumber,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          paymentMethod: dto.paymentMethod?.trim() || 'cash',
          cashOrBankAccountId: this.normalizeNullableValue(dto.cashOrBankAccountId),
          amount: totalAllocated,
          referenceNumber: dto.referenceNumber,
          remarks: dto.remarks,
          status: PaymentDocumentStatus.DRAFT,
          isAutomatic: dto.isAutomatic ?? false,
        } as PaymentVoucher),
      );

      const allocationRepository = manager.getRepository(PaymentVoucherAllocation);
      await allocationRepository.save(
        allocations.map((allocation) =>
          allocationRepository.create({
            paymentVoucherId: voucher.id,
            purchaseInvoiceId: allocation.purchaseInvoiceId,
            allocatedAmount: allocation.allocatedAmount,
          } as PaymentVoucherAllocation),
        ),
      );

      if (!dto.isDraft) {
        await this.postWithManager(manager, voucher.id, currentUser);
      }

      const saved = await voucherRepository.findOne({
        where: { id: voucher.id },
        relations: ['vendor', 'createdBy', 'postedBy', 'voidedBy', 'allocations', 'allocations.purchaseInvoice'],
      });
      if (!saved) {
        throw new NotFoundException('Payment voucher could not be reloaded');
      }
      return this.shapeDetail(saved);
    });
  }

  async post(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => this.postWithManager(manager, id, currentUser));
  }

  async createAutomaticForInvoice(
    manager: EntityManager,
    invoice: PurchaseInvoice,
    currentUser: CurrentUserContext,
  ): Promise<Record<string, unknown>> {
    const amount = Number(invoice.balance ?? invoice.totalAmount ?? 0);
    if (amount <= 0) {
      throw new BadRequestException('An automatic payment voucher requires a positive invoice balance');
    }
    const settings = await this.loadSettings(invoice.businessId, manager);
    const voucherNumber = await this.documentNumberingService.generate(
      {
        businessId: invoice.businessId,
        documentType: 'payment_voucher',
        prefix: settings.prefix,
        includeYear: settings.includeYear,
        padding: settings.padding,
      },
      manager,
    );
    const voucherRepository = manager.getRepository(PaymentVoucher);
    const voucher = await voucherRepository.save(voucherRepository.create({
      businessId: invoice.businessId,
      vendorId: invoice.vendorId,
      createdById: currentUser.sub as string,
      voucherNumber,
      paymentDate: new Date(),
      paymentMethod: 'cash',
      amount,
      referenceNumber: invoice.purchaseInvoiceNumber,
      remarks: `Automatically generated payment for purchase invoice ${invoice.purchaseInvoiceNumber}.`,
      status: PaymentDocumentStatus.DRAFT,
      isAutomatic: true,
    } as PaymentVoucher));
    const allocationRepository = manager.getRepository(PaymentVoucherAllocation);
    await allocationRepository.save(allocationRepository.create({
      paymentVoucherId: voucher.id,
      purchaseInvoiceId: invoice.id,
      allocatedAmount: amount,
    } as PaymentVoucherAllocation));
    return this.postWithManager(manager, voucher.id, currentUser);
  }

  async void(id: string, dto: VoidPaymentVoucherDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const voucher = await manager.getRepository(PaymentVoucher).findOne({
        where: { id },
        relations: ['vendor', 'allocations', 'allocations.purchaseInvoice'],
      });
      if (!voucher) {
        throw new NotFoundException('Payment voucher not found');
      }
      this.assertBusinessAccess(voucher.businessId, currentUser);
      if (voucher.status !== PaymentDocumentStatus.POSTED) {
        throw new BadRequestException('Only posted vouchers can be voided');
      }

      await this.ledgerService.reverseEntriesBySource(
        manager,
        voucher.id,
        voucher.voucherNumber,
        currentUser as never,
        LedgerEntrySourceType.VOUCHER_REVERSAL,
      );

      for (const allocation of voucher.allocations ?? []) {
        const invoice = await manager.getRepository(PurchaseInvoice).findOne({ where: { id: allocation.purchaseInvoiceId } });
        if (!invoice) {
          continue;
        }
        invoice.amountPaid = Math.max(Number(invoice.amountPaid ?? 0) - Number(allocation.allocatedAmount ?? 0), 0);
        invoice.balance = Math.max(Number(invoice.totalAmount ?? 0) - Number(invoice.amountPaid ?? 0), 0);
        invoice.paymentStatus =
          invoice.amountPaid <= 0
            ? PaymentStatus.UNPAID
            : invoice.amountPaid >= Number(invoice.totalAmount ?? 0)
              ? PaymentStatus.PAID
              : PaymentStatus.PARTIALLY_PAID;
        await manager.getRepository(PurchaseInvoice).save(invoice);
      }

      const vendor = await manager.getRepository(Vendor).findOne({ where: { id: voucher.vendorId } });
      if (vendor) {
        vendor.balance = Number(vendor.balance ?? 0) + Number(voucher.amount ?? 0);
        await manager.getRepository(Vendor).save(vendor);
      }

      voucher.status = PaymentDocumentStatus.VOIDED;
      voucher.voidedAt = new Date();
      voucher.voidedById = currentUser.sub;
      voucher.voidReason = dto.reason;
      await manager.getRepository(PaymentVoucher).save(voucher);

      await manager.getRepository(AuditLog).save(
        manager.getRepository(AuditLog).create({
          businessId: voucher.businessId,
          userId: currentUser.sub,
          action: AuditAction.UPDATE,
          entityName: 'PaymentVoucher',
          entityId: voucher.id,
          metadata: JSON.stringify({ reason: dto.reason }),
        } as AuditLog),
      );

      const saved = await manager.getRepository(PaymentVoucher).findOne({
        where: { id: voucher.id },
        relations: ['vendor', 'createdBy', 'postedBy', 'voidedBy', 'allocations', 'allocations.purchaseInvoice'],
      });
      if (!saved) {
        throw new NotFoundException('Payment voucher could not be reloaded');
      }
      return this.shapeDetail(saved);
    });
  }

  private async postWithManager(manager: EntityManager, id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const voucher = await manager.getRepository(PaymentVoucher).findOne({
      where: { id },
      relations: ['vendor', 'allocations', 'allocations.purchaseInvoice'],
    });
    if (!voucher) {
      throw new NotFoundException('Payment voucher not found');
    }
    this.assertBusinessAccess(voucher.businessId, currentUser);
    if (voucher.status !== PaymentDocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft vouchers can be posted');
    }

    const totalAllocated = voucher.allocations?.reduce((sum, item) => sum + Number(item.allocatedAmount ?? 0), 0) ?? 0;
    if (totalAllocated <= 0) {
      throw new BadRequestException('Voucher must allocate a positive amount');
    }
    if (Number(voucher.amount ?? 0) !== totalAllocated) {
      throw new BadRequestException('Voucher amount must equal total allocated amount');
    }

    for (const allocation of voucher.allocations ?? []) {
      const invoice = await manager.getRepository(PurchaseInvoice).findOne({
        where: { id: allocation.purchaseInvoiceId },
        relations: ['vendor'],
      });
      if (!invoice) {
        throw new NotFoundException('Purchase invoice not found');
      }
      this.assertBusinessAccess(invoice.businessId, currentUser);
      if (invoice.vendorId !== voucher.vendorId) {
        throw new BadRequestException('The selected purchase invoices belong to different vendors.');
      }
      const outstanding = Number(invoice.balance ?? 0);
      if (Number(allocation.allocatedAmount ?? 0) > outstanding) {
        throw new BadRequestException('Payment voucher allocation exceeds the invoice balance.');
      }
    }

    voucher.status = PaymentDocumentStatus.POSTED;
    voucher.postedAt = new Date();
    voucher.postingDate = new Date();
    voucher.postedById = currentUser.sub;
    voucher.amount = totalAllocated;
    await manager.getRepository(PaymentVoucher).save(voucher);

    for (const allocation of voucher.allocations ?? []) {
      const invoice = await manager.getRepository(PurchaseInvoice).findOne({ where: { id: allocation.purchaseInvoiceId } });
      if (!invoice) {
        continue;
      }
      invoice.amountPaid = Number(invoice.amountPaid ?? 0) + Number(allocation.allocatedAmount ?? 0);
      invoice.balance = Math.max(Number(invoice.totalAmount ?? 0) - Number(invoice.amountPaid ?? 0), 0);
      invoice.paymentStatus =
        invoice.amountPaid <= 0
          ? PaymentStatus.UNPAID
          : invoice.amountPaid >= Number(invoice.totalAmount ?? 0)
            ? PaymentStatus.PAID
            : PaymentStatus.PARTIALLY_PAID;
      await manager.getRepository(PurchaseInvoice).save(invoice);
    }

    await this.ledgerService.postPaymentVoucherEntries(manager, voucher, currentUser as never);

    const vendor = await manager.getRepository(Vendor).findOne({ where: { id: voucher.vendorId } });
    if (vendor) {
      vendor.balance = Math.max(Number(vendor.balance ?? 0) - totalAllocated, 0);
      await manager.getRepository(Vendor).save(vendor);
    }

    await manager.getRepository(AuditLog).save(
      manager.getRepository(AuditLog).create({
        businessId: voucher.businessId,
        userId: currentUser.sub,
        action: AuditAction.UPDATE,
        entityName: 'PaymentVoucher',
        entityId: voucher.id,
        metadata: JSON.stringify({
          voucherNumber: voucher.voucherNumber,
          status: voucher.status,
          amount: voucher.amount,
        }),
      } as AuditLog),
    );

    const saved = await manager.getRepository(PaymentVoucher).findOne({
      where: { id: voucher.id },
      relations: ['vendor', 'createdBy', 'postedBy', 'voidedBy', 'allocations', 'allocations.purchaseInvoice'],
    });
    if (!saved) {
      throw new NotFoundException('Payment voucher could not be reloaded');
    }
    return this.shapeDetail(saved);
  }

  private async normalizeAllocations(
    manager: EntityManager,
    businessId: string,
    vendorId: string,
    allocations: CreatePaymentVoucherAllocationDto[],
  ): Promise<CreatePaymentVoucherAllocationDto[]> {
    const normalized: CreatePaymentVoucherAllocationDto[] = [];
    for (const allocation of allocations) {
      const invoice = await manager.getRepository(PurchaseInvoice).findOne({ where: { id: allocation.purchaseInvoiceId } });
      if (!invoice || invoice.businessId !== businessId) {
        throw new NotFoundException('Purchase invoice not found');
      }
      if (invoice.vendorId !== vendorId) {
        throw new BadRequestException('The selected purchase invoices belong to different vendors.');
      }
      normalized.push({
        purchaseInvoiceId: allocation.purchaseInvoiceId,
        allocatedAmount: Number(allocation.allocatedAmount ?? 0),
      });
    }
    return normalized;
  }

  private async resolveVendor(manager: EntityManager, businessId: string, vendorId: string): Promise<Vendor> {
    const vendor = await manager.getRepository(Vendor).findOne({ where: { id: vendorId, businessId } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    if (vendor.status !== RecordStatus.ACTIVE) {
      throw new BadRequestException('Vendor is inactive');
    }
    return vendor;
  }

  private async loadSettings(businessId: string, manager?: EntityManager): Promise<VoucherSettings & Record<string, string | number | boolean>> {
    const repository = manager ? manager.getRepository(SystemSetting) : this.systemSettingsRepository;
    const settings = await repository.find({ where: [{ businessId }, { businessId: IsNull() }] });
    const values = Object.fromEntries(settings.map((setting) => [setting.key, setting.value ?? '']));
    return {
      ...values,
      prefix: values['payment_voucher.number_prefix'] || 'PV',
      includeYear: (values['payment_voucher.number_include_year'] ?? 'true') !== 'false',
      padding: Number(values['payment_voucher.number_padding'] ?? 6) || 6,
    };
  }

  private shapeSummary(voucher: PaymentVoucher): Record<string, unknown> {
    return {
      id: voucher.id,
      voucherNumber: voucher.voucherNumber,
      paymentDate: voucher.paymentDate,
      vendor: voucher.vendor ? { id: voucher.vendor.id, name: voucher.vendor.name } : null,
      amount: Number(voucher.amount ?? 0),
      status: voucher.status,
      paymentMethod: voucher.paymentMethod ?? null,
      referenceNumber: voucher.referenceNumber ?? null,
      createdAt: voucher.createdAt,
    };
  }

  private shapeDetail(voucher: PaymentVoucher): Record<string, unknown> {
    return {
      ...this.shapeSummary(voucher),
      vendor: voucher.vendor ? {
        id: voucher.vendor.id,
        name: voucher.vendor.name,
        contactPerson: voucher.vendor.contactPerson ?? null,
        email: voucher.vendor.email ?? null,
        phone: voucher.vendor.phone ?? null,
        address: voucher.vendor.address ?? null,
        tin: voucher.vendor.tin ?? null,
      } : null,
      remarks: voucher.remarks ?? null,
      isAutomatic: voucher.isAutomatic,
      paymentDate: voucher.paymentDate,
      postingDate: voucher.postingDate ?? null,
      paymentMethod: voucher.paymentMethod ?? null,
      referenceNumber: voucher.referenceNumber ?? null,
      postedAt: voucher.postedAt ?? null,
      voidedAt: voucher.voidedAt ?? null,
      voidReason: voucher.voidReason ?? null,
      allocations: (voucher.allocations ?? []).map((allocation) => ({
        id: allocation.id,
        purchaseInvoiceId: allocation.purchaseInvoiceId,
        purchaseInvoiceNumber: allocation.purchaseInvoice?.purchaseInvoiceNumber ?? null,
        allocatedAmount: Number(allocation.allocatedAmount ?? 0),
      })),
    };
  }

  private requireBusinessId(currentUser: CurrentUserContext, explicitBusinessId?: string): string {
    const businessId = explicitBusinessId ?? currentUser.businessId ?? currentUser.business?.id ?? undefined;
    if (!businessId) {
      throw new BadRequestException('Business context is required');
    }
    return businessId;
  }

  private assertBusinessAccess(recordBusinessId: string, currentUser: CurrentUserContext): void {
    const businessId = currentUser.businessId ?? currentUser.business?.id ?? undefined;
    if (businessId && businessId !== recordBusinessId) {
      throw new BadRequestException('You cannot access records from another business');
    }
  }

  private normalizeFilterValue(value: unknown): string {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized.toLowerCase() === 'undefined' || normalized.toLowerCase() === 'null') {
      return '';
    }
    return normalized;
  }

  private normalizeNullableValue(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized.toLowerCase() === 'undefined' || normalized.toLowerCase() === 'null') {
      return null;
    }
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(normalized)) {
      return null;
    }
    return normalized;
  }
}
