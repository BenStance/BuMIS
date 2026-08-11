import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { SalesInvoice } from '../../database/entities/sales-invoice.entity';
import { SalesInvoiceItem } from '../../database/entities/sales-invoice-item.entity';
import { Product } from '../../database/entities/product.entity';
import { Customer } from '../../database/entities/customer.entity';
import { InventoryTransaction } from '../../database/entities/inventory-transaction.entity';
import { Business } from '../../database/entities/business.entity';
import { SystemSetting } from '../../database/entities/system-setting.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { User } from '../../database/entities/user.entity';
import {
  AuditAction,
  InvoiceStatus,
  InventoryTransactionType,
  PaymentMethod,
  RecordStatus,
} from '../../common/enums/domain.enums';
import { LedgerService } from '../ledger/ledger.service';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { CreateInvoiceDto, CreateInvoiceItemDto, DiscountType } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

type CurrentUserContext = {
  sub?: string;
  email?: string;
  businessId?: string | null;
  business?: { id?: string | null; businessName?: string | null } | null;
};

type InvoiceSettings = {
  prefix: string;
  includeYear: boolean;
  padding: number;
  taxEnabled: boolean;
  taxRate: number;
  defaultCustomerName: string;
};

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(SalesInvoice) private readonly invoicesRepository: Repository<SalesInvoice>,
    @InjectRepository(SalesInvoiceItem) private readonly invoiceItemsRepository: Repository<SalesInvoiceItem>,
    @InjectRepository(Product) private readonly productsRepository: Repository<Product>,
    @InjectRepository(Customer) private readonly customersRepository: Repository<Customer>,
    @InjectRepository(InventoryTransaction) private readonly inventoryTransactionsRepository: Repository<InventoryTransaction>,
    @InjectRepository(Business) private readonly businessesRepository: Repository<Business>,
    @InjectRepository(SystemSetting) private readonly systemSettingsRepository: Repository<SystemSetting>,
    @InjectRepository(AuditLog) private readonly auditLogsRepository: Repository<AuditLog>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
  ) {}

  async findAll(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser, filters.businessId as string | undefined);
    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 20), 1), 100);
    const search = String(filters.search ?? '').trim();
    const status = String(filters.status ?? '').trim() as InvoiceStatus | '';
    const paymentMethod = String(filters.paymentMethod ?? '').trim() as PaymentMethod | '';
    const customerId = String(filters.customerId ?? '').trim();
    const salespersonId = String(filters.salespersonId ?? '').trim();
    const dateFrom = String(filters.dateFrom ?? '').trim();
    const dateTo = String(filters.dateTo ?? '').trim();

    const query = this.invoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.createdBy', 'createdBy')
      .leftJoinAndSelect('invoice.cancelledBy', 'cancelledBy')
      .where('invoice.businessId = :businessId', { businessId });

    if (search) {
      query.andWhere(
        '(invoice.invoiceNumber LIKE :search OR customer.fullName LIKE :search OR createdBy.fullName LIKE :search OR invoice.notes LIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) {
      query.andWhere('invoice.status = :status', { status });
    }
    if (paymentMethod) {
      query.andWhere('invoice.paymentMethod = :paymentMethod', { paymentMethod });
    }
    if (customerId) {
      query.andWhere('invoice.customerId = :customerId', { customerId });
    }
    if (salespersonId) {
      query.andWhere('invoice.createdByUserId = :salespersonId', { salespersonId });
    }
    if (dateFrom) {
      query.andWhere('invoice.invoiceDate >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }
    if (dateTo) {
      const upperBound = new Date(dateTo);
      upperBound.setDate(upperBound.getDate() + 1);
      query.andWhere('invoice.invoiceDate < :dateTo', { dateTo: upperBound });
    }

    const [items, total] = await query.orderBy('invoice.invoiceDate', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return {
      items: items.map((invoice) => this.shapeInvoiceSummary(invoice)),
      page,
      limit,
      total,
    };
  }

  async search(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.findAll(currentUser, filters);
  }

  async findOne(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id },
      relations: ['business', 'customer', 'createdBy', 'cancelledBy', 'items', 'items.product'],
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    this.assertBusinessAccess(invoice.businessId, currentUser);
    return this.shapeInvoiceDetail(invoice);
  }

  async printData(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id },
      relations: ['business', 'customer', 'createdBy', 'cancelledBy', 'items', 'items.product'],
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    this.assertBusinessAccess(invoice.businessId, currentUser);
    const settings = await this.loadSettings(invoice.businessId);
    return {
      ...this.shapeInvoiceDetail(invoice),
      business: this.shapeBusiness(invoice.business),
      printConfig: {
        layout: settings['invoice.print_layout'] ?? 'standard',
        footer: settings['invoice.footer_notes'] ?? 'Thank you for your business.',
      },
    };
  }

  async create(dto: CreateInvoiceDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const businessId = this.requireBusinessId(currentUser);
      const business = await this.getBusiness(manager, businessId);
      const settings = await this.loadSettings(businessId, manager);
      const customer = await this.resolveCustomer(manager, businessId, dto.customerId, settings.defaultCustomerName);
      const mergedItems = this.mergeItems(dto.items);
      const products = await this.loadProducts(manager, businessId, mergedItems.map((item) => item.productId));

      if (!dto.isDraft) {
        this.validateStock(products, mergedItems);
      }

      const calculations = this.calculateInvoiceTotals(products, mergedItems, dto, settings);
      const invoiceNumber = await this.generateInvoiceNumber(manager, businessId, settings);
      const status = dto.isDraft
        ? InvoiceStatus.DRAFT
        : dto.paymentMethod === PaymentMethod.CASH
          ? InvoiceStatus.PAID
          : InvoiceStatus.POSTED;
      const amountPaid = dto.isDraft ? 0 : dto.paymentMethod === PaymentMethod.CASH ? calculations.totalAmount : 0;

      const invoiceRepository = manager.getRepository(SalesInvoice);
      const invoice = (await invoiceRepository.save(
        invoiceRepository.create({
          businessId,
          customerId: customer?.id ?? undefined,
          createdByUserId: currentUser.sub as string,
          invoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          paymentMethod: dto.paymentMethod,
          subtotal: calculations.subtotal,
          discountTotal: calculations.discountTotal,
          taxTotal: calculations.taxTotal,
          totalAmount: calculations.totalAmount,
          amountPaid,
          balance: calculations.totalAmount - amountPaid,
          status,
          notes: dto.notes,
        } as any),
      )) as unknown as SalesInvoice;

      const invoiceItemRepository = manager.getRepository(SalesInvoiceItem);
      const invoiceItems = mergedItems.map((item) => {
        const product = products.get(item.productId);
        const unitPrice = item.unitPrice ?? Number(product?.sellingPrice ?? 0);
        const gross = unitPrice * Number(item.quantity);
        const discount = this.calculateDiscount(gross, item.discount, item.discountType);
        const netAfterDiscount = gross - discount;
        const tax = this.calculateTax(netAfterDiscount, item.tax, settings, dto);
        return {
          invoiceId: invoice.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          discount,
          tax,
          total: netAfterDiscount + tax,
        } as SalesInvoiceItem;
      });
      await invoiceItemRepository.save(invoiceItems);

      if (!dto.isDraft) {
        await this.applyStockMovements(manager, businessId, invoice, mergedItems, products, currentUser);
        await this.ledgerService.postInvoiceEntries(manager, invoice, currentUser);
      }

      await manager.getRepository(AuditLog).save(
        manager.getRepository(AuditLog).create({
          businessId,
          userId: currentUser.sub,
          action: AuditAction.INVOICE_CREATED,
          entityName: 'SalesInvoice',
          entityId: invoice.id,
          metadata: JSON.stringify({
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            paymentMethod: invoice.paymentMethod,
            totalAmount: invoice.totalAmount,
          }),
        } as any),
      );

      const savedInvoice = await invoiceRepository.findOne({
        where: { id: invoice.id },
        relations: ['business', 'customer', 'createdBy', 'cancelledBy', 'items', 'items.product'],
      });
      if (!savedInvoice) {
        throw new NotFoundException('Invoice could not be reloaded');
      }
      return this.shapeInvoiceDetail(savedInvoice);
    });
  }

  async updateDraft(id: string, dto: UpdateInvoiceDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const invoice = await manager.getRepository(SalesInvoice).findOne({
        where: { id },
        relations: ['items', 'items.product'],
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      this.assertBusinessAccess(invoice.businessId, currentUser);
      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new BadRequestException('Only draft invoices can be updated');
      }

      if (dto.paymentMethod) {
        invoice.paymentMethod = dto.paymentMethod;
      }
      if (dto.customerId) {
        invoice.customerId = dto.customerId;
      }
      if (dto.invoiceDate) {
        invoice.invoiceDate = new Date(dto.invoiceDate);
      }
      if (dto.dueDate) {
        invoice.dueDate = new Date(dto.dueDate);
      }
      if (dto.notes !== undefined) {
        invoice.notes = dto.notes;
      }

      const settings = await this.loadSettings(invoice.businessId, manager);
      const customer = await this.resolveCustomer(manager, invoice.businessId, invoice.customerId, settings.defaultCustomerName);
      const mergedItems = dto.items ? this.mergeItems(dto.items) : invoice.items?.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        discountType: DiscountType.FIXED,
        tax: Number(item.tax),
      })) ?? [];
      if (!mergedItems.length) {
        throw new BadRequestException('Draft invoice must contain at least one item');
      }
      const products = await this.loadProducts(manager, invoice.businessId, mergedItems.map((item) => item.productId));
      const calculations = this.calculateInvoiceTotals(products, mergedItems, dto as CreateInvoiceDto, settings);

      invoice.customerId = customer?.id ?? invoice.customerId;
      invoice.subtotal = calculations.subtotal;
      invoice.discountTotal = calculations.discountTotal;
      invoice.taxTotal = calculations.taxTotal;
      invoice.totalAmount = calculations.totalAmount;
      invoice.amountPaid = 0;
      invoice.balance = calculations.totalAmount;

      const invoiceItemRepository = manager.getRepository(SalesInvoiceItem);
      await invoiceItemRepository.delete({ invoiceId: invoice.id });
      const itemsToSave = mergedItems.map((item) => {
        const product = products.get(item.productId);
        const unitPrice = item.unitPrice ?? Number(product?.sellingPrice ?? 0);
        const gross = unitPrice * Number(item.quantity);
        const discount = this.calculateDiscount(gross, item.discount, item.discountType);
        const netAfterDiscount = gross - discount;
        const tax = this.calculateTax(netAfterDiscount, item.tax, settings, dto as CreateInvoiceDto);
        return {
          invoiceId: invoice.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          discount,
          tax,
          total: netAfterDiscount + tax,
        } as SalesInvoiceItem;
      });
      await invoiceItemRepository.save(itemsToSave);
      await manager.getRepository(SalesInvoice).save(invoice as SalesInvoice);

      const saved = await manager.getRepository(SalesInvoice).findOne({
        where: { id: invoice.id },
        relations: ['business', 'customer', 'createdBy', 'cancelledBy', 'items', 'items.product'],
      });
      if (!saved) {
        throw new NotFoundException('Invoice could not be reloaded');
      }
      return this.shapeInvoiceDetail(saved);
    });
  }

  async cancel(id: string, dto: CancelInvoiceDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const invoice = await manager.getRepository(SalesInvoice).findOne({
        where: { id },
        relations: ['items', 'items.product', 'customer'],
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      this.assertBusinessAccess(invoice.businessId, currentUser);
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException('Invoice is already cancelled');
      }

      if (invoice.status !== InvoiceStatus.DRAFT) {
        await this.restoreInventory(manager, invoice, currentUser);
        await this.ledgerService.reverseInvoiceEntries(manager, invoice, currentUser);
      }

      invoice.status = InvoiceStatus.CANCELLED;
      invoice.cancelledAt = new Date();
      invoice.cancelledByUserId = currentUser.sub;
      invoice.cancellationReason = dto.reason;
      await manager.getRepository(SalesInvoice).save(invoice);

      await manager.getRepository(AuditLog).save(
        manager.getRepository(AuditLog).create({
          businessId: invoice.businessId,
          userId: currentUser.sub,
          action: AuditAction.INVOICE_CANCELLED,
          entityName: 'SalesInvoice',
          entityId: invoice.id,
          metadata: JSON.stringify({
            invoiceNumber: invoice.invoiceNumber,
            reason: dto.reason,
          }),
        } as any),
      );

      const saved = await manager.getRepository(SalesInvoice).findOne({
        where: { id: invoice.id },
        relations: ['business', 'customer', 'createdBy', 'cancelledBy', 'items', 'items.product'],
      });
      if (!saved) {
        throw new NotFoundException('Invoice could not be reloaded');
      }
      return this.shapeInvoiceDetail(saved);
    });
  }

  private async applyStockMovements(
    manager: EntityManager,
    businessId: string,
    invoice: SalesInvoice,
    items: Array<CreateInvoiceItemDto>,
    products: Map<string, Product>,
    currentUser: CurrentUserContext,
  ): Promise<void> {
    const productRepository = manager.getRepository(Product);
    const inventoryTransactionsRepository = manager.getRepository(InventoryTransaction);
    for (const item of items) {
      const product = products.get(item.productId);
      if (!product) {
        throw new NotFoundException('Product not found');
      }
      const previousStock = Number(product.currentStock ?? 0);
      const newStock = previousStock - Number(item.quantity);
      product.currentStock = newStock;
      product.lastStockMovementAt = new Date();
      await productRepository.save(product);

      await inventoryTransactionsRepository.save(
        inventoryTransactionsRepository.create({
          businessId,
          transactionNumber: `SO-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
          productId: product.id,
          invoiceId: invoice.id,
          createdByUserId: currentUser.sub,
          transactionType: InventoryTransactionType.STOCK_OUT,
          quantity: item.quantity,
          previousStock,
          newStock,
          reference: invoice.invoiceNumber,
          reason: 'Sales invoice',
          notes: invoice.notes,
        } as any),
      );
    }
  }

  private async restoreInventory(
    manager: EntityManager,
    invoice: SalesInvoice,
    currentUser: CurrentUserContext,
  ): Promise<void> {
    const productRepository = manager.getRepository(Product);
    const inventoryTransactionsRepository = manager.getRepository(InventoryTransaction);
    for (const item of invoice.items ?? []) {
      const product = await productRepository.findOne({ where: { id: item.productId } });
      if (!product) {
        continue;
      }
      const previousStock = Number(product.currentStock ?? 0);
      const restoredStock = previousStock + Number(item.quantity);
      product.currentStock = restoredStock;
      product.lastStockMovementAt = new Date();
      await productRepository.save(product);

      await inventoryTransactionsRepository.save(
        inventoryTransactionsRepository.create({
          businessId: invoice.businessId,
          transactionNumber: `CR-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
          productId: product.id,
          invoiceId: invoice.id,
          createdByUserId: currentUser.sub,
          transactionType: InventoryTransactionType.ADJUSTMENT,
          quantity: item.quantity,
          previousStock,
          newStock: restoredStock,
          reference: invoice.invoiceNumber,
          reason: 'Invoice cancellation',
          notes: invoice.cancellationReason ?? invoice.notes,
        } as any),
      );
    }
  }

  private calculateInvoiceTotals(
    products: Map<string, Product>,
    items: Array<CreateInvoiceItemDto>,
    dto: Pick<CreateInvoiceDto, 'invoiceDiscount' | 'invoiceDiscountType' | 'taxRate' | 'isDraft'>,
    settings: InvoiceSettings,
  ): { subtotal: number; discountTotal: number; taxTotal: number; totalAmount: number } {
    let subtotal = 0;
    let itemDiscountTotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      const product = products.get(item.productId);
      if (!product) {
        throw new NotFoundException('Product not found');
      }
      const unitPrice = item.unitPrice ?? Number(product.sellingPrice ?? 0);
      const gross = unitPrice * Number(item.quantity);
      const discount = this.calculateDiscount(gross, item.discount, item.discountType);
      const netAfterDiscount = gross - discount;
      const tax = this.calculateTax(netAfterDiscount, item.tax, settings, dto);
      subtotal += gross;
      itemDiscountTotal += discount;
      taxTotal += tax;
    }

    const invoiceDiscount = this.calculateDiscount(subtotal - itemDiscountTotal, dto.invoiceDiscount, dto.invoiceDiscountType);
    const discountTotal = itemDiscountTotal + invoiceDiscount;
    const totalAmount = subtotal - discountTotal + taxTotal;
    return { subtotal, discountTotal, taxTotal, totalAmount };
  }

  private calculateDiscount(amount: number, discount?: number, type?: DiscountType): number {
    if (!discount) {
      return 0;
    }
    if (type === DiscountType.PERCENTAGE) {
      return (amount * discount) / 100;
    }
    return Math.min(discount, amount);
  }

  private calculateTax(
    taxableAmount: number,
    explicitTax: number | undefined,
    settings: InvoiceSettings,
    dto: Pick<CreateInvoiceDto, 'taxRate'>,
  ): number {
    if (explicitTax !== undefined) {
      return explicitTax;
    }
    if (!settings.taxEnabled) {
      return 0;
    }
    const rate = Number(dto.taxRate ?? settings.taxRate ?? 0);
    if (!rate) {
      return 0;
    }
    return (taxableAmount * rate) / 100;
  }

  private mergeItems(items: CreateInvoiceDto['items']): CreateInvoiceItemDto[] {
    const merged = new Map<string, CreateInvoiceItemDto>();
    for (const item of items) {
      const key = [
        item.productId,
        item.unitPrice ?? '',
        item.discount ?? '',
        item.discountType ?? '',
        item.tax ?? '',
      ].join('|');
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += Number(item.quantity);
      } else {
        merged.set(key, {
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: item.unitPrice,
          discount: item.discount,
          discountType: item.discountType,
          tax: item.tax,
        });
      }
    }
    return Array.from(merged.values());
  }

  private async loadProducts(manager: EntityManager, businessId: string, productIds: string[]): Promise<Map<string, Product>> {
    const products = await manager.getRepository(Product).find({
      where: { id: In(productIds), businessId },
    });
    if (products.length !== new Set(productIds).size) {
      throw new BadRequestException('One or more products are invalid');
    }
    for (const product of products) {
      if (product.status !== RecordStatus.ACTIVE) {
        throw new BadRequestException(`Product ${product.productName} is inactive`);
      }
    }
    return new Map(products.map((product) => [product.id, product]));
  }

  private validateStock(products: Map<string, Product>, items: Array<CreateInvoiceItemDto>): void {
    for (const item of items) {
      const product = products.get(item.productId);
      if (!product) {
        throw new BadRequestException('One or more products are invalid');
      }
      if (Number(item.quantity) > Number(product.currentStock ?? 0)) {
        throw new BadRequestException(`Insufficient stock for ${product.productName}`);
      }
    }
  }

  private async resolveCustomer(
    manager: EntityManager,
    businessId: string,
    customerId: string | undefined,
    walkInCustomerName: string,
  ): Promise<Customer | null> {
    if (customerId) {
      const customer = await manager.getRepository(Customer).findOne({ where: { id: customerId, businessId } });
      if (!customer) {
        throw new BadRequestException('Customer not found');
      }
      if (customer.status !== RecordStatus.ACTIVE) {
        throw new BadRequestException('Customer is inactive');
      }
      return customer;
    }

    const existing = await manager.getRepository(Customer).findOne({
      where: { businessId, fullName: walkInCustomerName },
    });
    if (existing) {
      return existing;
    }

    const customerRepository = manager.getRepository(Customer);
    return (await customerRepository.save(
      customerRepository.create({
        businessId,
        fullName: walkInCustomerName,
        status: RecordStatus.ACTIVE,
      } as any),
    )) as unknown as Customer;
  }

  private async loadSettings(
    businessId: string,
    manager?: EntityManager,
  ): Promise<InvoiceSettings & Record<string, string | number | boolean>> {
    const repository = manager ? manager.getRepository(SystemSetting) : this.systemSettingsRepository;
    const settings = await repository.find({ where: [{ businessId }, { businessId: IsNull() }] });
    const values = Object.fromEntries(settings.map((setting) => [setting.key, setting.value ?? '']));
    return {
      ...values,
      prefix: values['invoice.number_prefix'] || 'INV',
      includeYear: (values['invoice.number_include_year'] ?? 'true') !== 'false',
      padding: Number(values['invoice.number_padding'] ?? 6) || 6,
      taxEnabled: (values['invoice.tax_enabled'] ?? 'false') === 'true',
      taxRate: Number(values['invoice.tax_rate'] ?? 0) || 0,
      defaultCustomerName: values['invoice.walk_in_customer_name'] || 'Walk-in Customer',
    };
  }

  private async generateInvoiceNumber(
    manager: EntityManager,
    businessId: string,
    settings: InvoiceSettings,
  ): Promise<string> {
    const invoiceNumbers = await manager.getRepository(SalesInvoice).find({
      where: { businessId },
      select: { invoiceNumber: true },
    });
    const maxSequence = invoiceNumbers.reduce((max, invoice) => {
      const match = /(\d+)$/.exec(invoice.invoiceNumber);
      const sequence = match ? Number(match[1]) : 0;
      return Number.isFinite(sequence) && sequence > max ? sequence : max;
    }, 0);
    const nextSequence = String(maxSequence + 1).padStart(settings.padding, '0');
    const yearPrefix = settings.includeYear ? `${new Date().getFullYear()}-` : '';
    return `${settings.prefix}-${yearPrefix}${nextSequence}`;
  }

  private async getBusiness(manager: EntityManager, businessId: string): Promise<Business> {
    const business = await manager.getRepository(Business).findOne({
      where: { id: businessId },
      relations: ['activeSubscription'],
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business;
  }

  private shapeInvoiceSummary(invoice: SalesInvoice): Record<string, unknown> {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customer: invoice.customer ? { id: invoice.customer.id, fullName: invoice.customer.fullName } : null,
      createdBy: invoice.createdBy ? { id: invoice.createdBy.id, fullName: invoice.createdBy.fullName } : null,
      paymentMethod: invoice.paymentMethod ?? null,
      subtotal: Number(invoice.subtotal ?? 0),
      discountTotal: Number(invoice.discountTotal ?? 0),
      taxTotal: Number(invoice.taxTotal ?? 0),
      totalAmount: Number(invoice.totalAmount ?? 0),
      amountPaid: Number(invoice.amountPaid ?? 0),
      balance: Number(invoice.balance ?? 0),
      status: invoice.status,
      createdAt: invoice.createdAt,
    };
  }

  private shapeInvoiceDetail(invoice: SalesInvoice): Record<string, unknown> {
    return {
      ...this.shapeInvoiceSummary(invoice),
      business: this.shapeBusiness(invoice.business),
      customer: invoice.customer
        ? {
            id: invoice.customer.id,
            fullName: invoice.customer.fullName,
            contactPerson: invoice.customer.contactPerson,
            email: invoice.customer.email,
            phone: invoice.customer.phone,
            address: invoice.customer.address,
            tin: invoice.customer.tin,
            balance: Number(invoice.customer.balance ?? 0),
            status: invoice.customer.status,
          }
        : null,
      createdBy: invoice.createdBy
        ? {
            id: invoice.createdBy.id,
            fullName: invoice.createdBy.fullName,
            email: invoice.createdBy.email,
          }
        : null,
      cancelledBy: invoice.cancelledBy
        ? {
            id: invoice.cancelledBy.id,
            fullName: invoice.cancelledBy.fullName,
            email: invoice.cancelledBy.email,
          }
        : null,
      items: (invoice.items ?? []).map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.productName ?? null,
        sku: item.product?.sku ?? null,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        tax: Number(item.tax),
        total: Number(item.total),
      })),
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate ?? null,
      notes: invoice.notes ?? null,
      pdfUrl: invoice.pdfUrl ?? null,
      cancelledAt: invoice.cancelledAt ?? null,
      cancellationReason: invoice.cancellationReason ?? null,
      paymentMethod: invoice.paymentMethod ?? null,
    };
  }

  private shapeBusiness(business?: Business | null): Record<string, unknown> | null {
    if (!business) {
      return null;
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
}
