import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { SalesReceipt } from '../../database/entities/sales-receipt.entity';
import { SalesReceiptAllocation } from '../../database/entities/sales-receipt-allocation.entity';
import { SalesInvoice } from '../../database/entities/sales-invoice.entity';
import { Customer } from '../../database/entities/customer.entity';
import { SystemSetting } from '../../database/entities/system-setting.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { AuditAction, PaymentStatus, PaymentDocumentStatus, RecordStatus, LedgerEntrySourceType } from '../../common/enums/domain.enums';
import { LedgerService } from '../ledger/ledger.service';
import { DocumentNumberingService } from '../document-numbering/document-numbering.service';
import { CreateSalesReceiptDto, CreateSalesReceiptAllocationDto } from './dto/create-sales-receipt.dto';
import { VoidSalesReceiptDto } from './dto/void-sales-receipt.dto';

type CurrentUserContext = {
  sub?: string;
  businessId?: string | null;
  business?: { id?: string | null } | null;
};

type ReceiptSettings = {
  prefix: string;
  includeYear: boolean;
  padding: number;
};

@Injectable()
export class SalesReceiptsService {
  constructor(
    @InjectRepository(SalesReceipt) private readonly receiptsRepository: Repository<SalesReceipt>,
    @InjectRepository(SalesReceiptAllocation) private readonly allocationsRepository: Repository<SalesReceiptAllocation>,
    @InjectRepository(SalesInvoice) private readonly invoicesRepository: Repository<SalesInvoice>,
    @InjectRepository(Customer) private readonly customersRepository: Repository<Customer>,
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
    const customerId = this.normalizeFilterValue(filters.customerId);
    const status = this.normalizeFilterValue(filters.status);

    const query = this.receiptsRepository
      .createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.customer', 'customer')
      .leftJoinAndSelect('receipt.createdBy', 'createdBy')
      .where('receipt.businessId = :businessId', { businessId });

    if (search) {
      query.andWhere('(receipt.receiptNumber LIKE :search OR receipt.referenceNumber LIKE :search OR customer.fullName LIKE :search)', { search: `%${search}%` });
    }
    if (customerId) {
      query.andWhere('receipt.customerId = :customerId', { customerId });
    }
    if (status) {
      query.andWhere('receipt.status = :status', { status });
    }

    const [items, total] = await query.orderBy('receipt.receiptDate', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { items: items.map((item) => this.shapeSummary(item)), page, limit, total };
  }

  async findOne(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const receipt = await this.receiptsRepository.findOne({
      where: { id },
      relations: ['customer', 'createdBy', 'postedBy', 'voidedBy', 'allocations', 'allocations.salesInvoice'],
    });
    if (!receipt) {
      throw new NotFoundException('Sales receipt not found');
    }
    this.assertBusinessAccess(receipt.businessId, currentUser);
    return this.shapeDetail(receipt);
  }

  async create(dto: CreateSalesReceiptDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const businessId = this.requireBusinessId(currentUser);
      const customer = await this.resolveCustomer(manager, businessId, dto.customerId);
      const allocations = await this.normalizeAllocations(manager, businessId, customer.id, dto.allocations);
      const totalAllocated = allocations.reduce((sum, item) => sum + Number(item.allocatedAmount ?? 0), 0);
      if (Number(dto.amount) !== totalAllocated) {
        throw new BadRequestException('Receipt amount must equal total allocated amount');
      }
      const settings = await this.loadSettings(businessId, manager);
      const receiptNumber = await this.documentNumberingService.generate(
        {
          businessId,
          documentType: 'sales_receipt',
          prefix: settings.prefix,
          includeYear: settings.includeYear,
          padding: settings.padding,
        },
        manager,
      );

      const receiptRepository = manager.getRepository(SalesReceipt);
      const receipt = await receiptRepository.save(
        receiptRepository.create({
          businessId,
          customerId: customer.id,
          createdById: currentUser.sub as string,
          receiptNumber,
          receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : new Date(),
          paymentMethod: dto.paymentMethod?.trim() || 'cash',
          cashOrBankAccountId: this.normalizeNullableValue(dto.cashOrBankAccountId),
          amount: totalAllocated,
          referenceNumber: dto.referenceNumber,
          remarks: dto.remarks,
          status: PaymentDocumentStatus.DRAFT,
          isAutomatic: dto.isAutomatic ?? false,
        } as SalesReceipt),
      );

      const allocationRepository = manager.getRepository(SalesReceiptAllocation);
      await allocationRepository.save(
        allocations.map((allocation) =>
          allocationRepository.create({
            salesReceiptId: receipt.id,
            salesInvoiceId: allocation.salesInvoiceId,
            allocatedAmount: allocation.allocatedAmount,
          } as SalesReceiptAllocation),
        ),
      );

      if (!dto.isDraft) {
        await this.postWithManager(manager, receipt.id, currentUser);
      }

      const saved = await receiptRepository.findOne({
        where: { id: receipt.id },
        relations: ['customer', 'createdBy', 'postedBy', 'voidedBy', 'allocations', 'allocations.salesInvoice'],
      });
      if (!saved) {
        throw new NotFoundException('Sales receipt could not be reloaded');
      }
      return this.shapeDetail(saved);
    });
  }

  async post(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => this.postWithManager(manager, id, currentUser));
  }

  async void(id: string, dto: VoidSalesReceiptDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const receipt = await manager.getRepository(SalesReceipt).findOne({
        where: { id },
        relations: ['customer', 'allocations', 'allocations.salesInvoice'],
      });
      if (!receipt) {
        throw new NotFoundException('Sales receipt not found');
      }
      this.assertBusinessAccess(receipt.businessId, currentUser);
      if (receipt.status !== PaymentDocumentStatus.POSTED) {
        throw new BadRequestException('Only posted receipts can be voided');
      }

      await this.ledgerService.reverseEntriesBySource(
        manager,
        receipt.id,
        receipt.receiptNumber,
        currentUser as never,
        LedgerEntrySourceType.RECEIPT_REVERSAL,
      );

      for (const allocation of receipt.allocations ?? []) {
        const invoice = await manager.getRepository(SalesInvoice).findOne({ where: { id: allocation.salesInvoiceId } });
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
        await manager.getRepository(SalesInvoice).save(invoice);
      }

      receipt.status = PaymentDocumentStatus.VOIDED;
      receipt.voidedAt = new Date();
      receipt.voidedById = currentUser.sub;
      receipt.voidReason = dto.reason;
      await manager.getRepository(SalesReceipt).save(receipt);

      await manager.getRepository(AuditLog).save(
        manager.getRepository(AuditLog).create({
          businessId: receipt.businessId,
          userId: currentUser.sub,
          action: AuditAction.UPDATE,
          entityName: 'SalesReceipt',
          entityId: receipt.id,
          metadata: JSON.stringify({ reason: dto.reason }),
        } as AuditLog),
      );

      const saved = await manager.getRepository(SalesReceipt).findOne({
        where: { id: receipt.id },
        relations: ['customer', 'createdBy', 'postedBy', 'voidedBy', 'allocations', 'allocations.salesInvoice'],
      });
      if (!saved) {
        throw new NotFoundException('Sales receipt could not be reloaded');
      }
      return this.shapeDetail(saved);
    });
  }

  private async postWithManager(manager: EntityManager, id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const receipt = await manager.getRepository(SalesReceipt).findOne({
      where: { id },
      relations: ['customer', 'allocations', 'allocations.salesInvoice'],
    });
    if (!receipt) {
      throw new NotFoundException('Sales receipt not found');
    }
    this.assertBusinessAccess(receipt.businessId, currentUser);
    if (receipt.status !== PaymentDocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft receipts can be posted');
    }

    const totalAllocated = receipt.allocations?.reduce((sum, item) => sum + Number(item.allocatedAmount ?? 0), 0) ?? 0;
    if (totalAllocated <= 0) {
      throw new BadRequestException('Receipt must allocate a positive amount');
    }
    if (Number(receipt.amount ?? 0) !== totalAllocated) {
      throw new BadRequestException('Receipt amount must equal total allocated amount');
    }

    for (const allocation of receipt.allocations ?? []) {
      const invoice = await manager.getRepository(SalesInvoice).findOne({
        where: { id: allocation.salesInvoiceId },
        relations: ['customer'],
      });
      if (!invoice) {
        throw new NotFoundException('Sales invoice not found');
      }
      this.assertBusinessAccess(invoice.businessId, currentUser);
      if (invoice.customerId !== receipt.customerId) {
        throw new BadRequestException('The selected invoices belong to different customers.');
      }
      const outstanding = Number(invoice.balance ?? 0);
      if (Number(allocation.allocatedAmount ?? 0) > outstanding) {
        throw new BadRequestException('Receipt allocation exceeds the invoice balance.');
      }
    }

    receipt.status = PaymentDocumentStatus.POSTED;
    receipt.postedAt = new Date();
    receipt.postingDate = new Date();
    receipt.postedById = currentUser.sub;
    receipt.amount = totalAllocated;
    await manager.getRepository(SalesReceipt).save(receipt);

    for (const allocation of receipt.allocations ?? []) {
      const invoice = await manager.getRepository(SalesInvoice).findOne({ where: { id: allocation.salesInvoiceId } });
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
      await manager.getRepository(SalesInvoice).save(invoice);
    }

    await this.ledgerService.postSalesReceiptEntries(manager, receipt, currentUser as never);

    await manager.getRepository(AuditLog).save(
      manager.getRepository(AuditLog).create({
        businessId: receipt.businessId,
        userId: currentUser.sub,
        action: AuditAction.UPDATE,
        entityName: 'SalesReceipt',
        entityId: receipt.id,
        metadata: JSON.stringify({
          receiptNumber: receipt.receiptNumber,
          status: receipt.status,
          amount: receipt.amount,
        }),
      } as AuditLog),
    );

    const saved = await manager.getRepository(SalesReceipt).findOne({
      where: { id: receipt.id },
      relations: ['customer', 'createdBy', 'postedBy', 'voidedBy', 'allocations', 'allocations.salesInvoice'],
    });
    if (!saved) {
      throw new NotFoundException('Sales receipt could not be reloaded');
    }
    return this.shapeDetail(saved);
  }

  private async normalizeAllocations(
    manager: EntityManager,
    businessId: string,
    customerId: string,
    allocations: CreateSalesReceiptAllocationDto[],
  ): Promise<CreateSalesReceiptAllocationDto[]> {
    const normalized: CreateSalesReceiptAllocationDto[] = [];
    for (const allocation of allocations) {
      const invoice = await manager.getRepository(SalesInvoice).findOne({ where: { id: allocation.salesInvoiceId } });
      if (!invoice || invoice.businessId !== businessId) {
        throw new NotFoundException('Sales invoice not found');
      }
      if (invoice.customerId !== customerId) {
        throw new BadRequestException('The selected invoices belong to different customers.');
      }
      normalized.push({
        salesInvoiceId: allocation.salesInvoiceId,
        allocatedAmount: Number(allocation.allocatedAmount ?? 0),
      });
    }
    return normalized;
  }

  private async resolveCustomer(manager: EntityManager, businessId: string, customerId: string): Promise<Customer> {
    const customer = await manager.getRepository(Customer).findOne({ where: { id: customerId, businessId } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    if (customer.status !== RecordStatus.ACTIVE) {
      throw new BadRequestException('Customer is inactive');
    }
    return customer;
  }

  private async loadSettings(businessId: string, manager?: EntityManager): Promise<ReceiptSettings & Record<string, string | number | boolean>> {
    const repository = manager ? manager.getRepository(SystemSetting) : this.systemSettingsRepository;
    const settings = await repository.find({ where: [{ businessId }, { businessId: IsNull() }] });
    const values = Object.fromEntries(settings.map((setting) => [setting.key, setting.value ?? '']));
    return {
      ...values,
      prefix: values['sales_receipt.number_prefix'] || 'RCT',
      includeYear: (values['sales_receipt.number_include_year'] ?? 'true') !== 'false',
      padding: Number(values['sales_receipt.number_padding'] ?? 6) || 6,
    };
  }

  private shapeSummary(receipt: SalesReceipt): Record<string, unknown> {
    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      receiptDate: receipt.receiptDate,
      customer: receipt.customer ? { id: receipt.customer.id, fullName: receipt.customer.fullName } : null,
      amount: Number(receipt.amount ?? 0),
      status: receipt.status,
      paymentMethod: receipt.paymentMethod ?? null,
      referenceNumber: receipt.referenceNumber ?? null,
      createdAt: receipt.createdAt,
    };
  }

  private shapeDetail(receipt: SalesReceipt): Record<string, unknown> {
    return {
      ...this.shapeSummary(receipt),
      remarks: receipt.remarks ?? null,
      postedAt: receipt.postedAt ?? null,
      voidedAt: receipt.voidedAt ?? null,
      voidReason: receipt.voidReason ?? null,
      allocations: (receipt.allocations ?? []).map((allocation) => ({
        id: allocation.id,
        salesInvoiceId: allocation.salesInvoiceId,
        salesInvoiceNumber: allocation.salesInvoice?.invoiceNumber ?? null,
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
