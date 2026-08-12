import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { PurchaseInvoice } from '../../database/entities/purchase-invoice.entity';
import { PurchaseInvoiceItem } from '../../database/entities/purchase-invoice-item.entity';
import { Product } from '../../database/entities/product.entity';
import { Vendor } from '../../database/entities/vendor.entity';
import { Business } from '../../database/entities/business.entity';
import { SystemSetting } from '../../database/entities/system-setting.entity';
import { InventoryTransaction } from '../../database/entities/inventory-transaction.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { User } from '../../database/entities/user.entity';
import { DocumentStatus, InventoryTransactionType, PaymentStatus, RecordStatus } from '../../common/enums/domain.enums';
import { AuditAction, LedgerEntrySourceType } from '../../common/enums/domain.enums';
import { LedgerService } from '../ledger/ledger.service';
import { DocumentNumberingService } from '../document-numbering/document-numbering.service';
import { CreatePurchaseInvoiceDto, CreatePurchaseInvoiceItemDto } from './dto/create-purchase-invoice.dto';
import { ReversePurchaseInvoiceDto } from './dto/reverse-purchase-invoice.dto';

type CurrentUserContext = {
  sub?: string;
  businessId?: string | null;
  business?: { id?: string | null } | null;
};

type PurchaseSettings = {
  prefix: string;
  includeYear: boolean;
  padding: number;
};

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    @InjectRepository(PurchaseInvoice) private readonly purchaseInvoicesRepository: Repository<PurchaseInvoice>,
    @InjectRepository(PurchaseInvoiceItem) private readonly purchaseInvoiceItemsRepository: Repository<PurchaseInvoiceItem>,
    @InjectRepository(Product) private readonly productsRepository: Repository<Product>,
    @InjectRepository(Vendor) private readonly vendorsRepository: Repository<Vendor>,
    @InjectRepository(Business) private readonly businessesRepository: Repository<Business>,
    @InjectRepository(SystemSetting) private readonly systemSettingsRepository: Repository<SystemSetting>,
    @InjectRepository(InventoryTransaction) private readonly inventoryTransactionsRepository: Repository<InventoryTransaction>,
    @InjectRepository(AuditLog) private readonly auditLogsRepository: Repository<AuditLog>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
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
    const documentStatus = this.normalizeFilterValue(filters.documentStatus);
    const paymentStatus = this.normalizeFilterValue(filters.paymentStatus);

    const query = this.purchaseInvoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.vendor', 'vendor')
      .leftJoinAndSelect('invoice.createdBy', 'createdBy')
      .where('invoice.businessId = :businessId', { businessId });

    if (search) {
      query.andWhere(
        '(invoice.purchaseInvoiceNumber LIKE :search OR invoice.vendorInvoiceNumber LIKE :search OR vendor.name LIKE :search OR invoice.remarks LIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (vendorId) {
      query.andWhere('invoice.vendorId = :vendorId', { vendorId });
    }
    if (documentStatus) {
      query.andWhere('invoice.documentStatus = :documentStatus', { documentStatus });
    }
    if (paymentStatus) {
      query.andWhere('invoice.paymentStatus = :paymentStatus', { paymentStatus });
    }

    const [items, total] = await query.orderBy('invoice.invoiceDate', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { items: items.map((invoice) => this.shapeSummary(invoice)), page, limit, total };
  }

  async findOne(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const invoice = await this.purchaseInvoicesRepository.findOne({
      where: { id },
      relations: ['vendor', 'createdBy', 'postedBy', 'cancelledBy', 'reversedBy', 'items', 'items.product'],
    });
    if (!invoice) {
      throw new NotFoundException('Purchase invoice not found');
    }
    this.assertBusinessAccess(invoice.businessId, currentUser);
    return this.shapeDetail(invoice);
  }

  async create(dto: CreatePurchaseInvoiceDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const businessId = this.requireBusinessId(currentUser);
      const vendor = await this.resolveVendor(manager, businessId, dto.vendorId);
      const items = this.normalizeItems(dto.items);
      const products = await this.loadProducts(manager, businessId, items.map((item) => item.productId).filter(Boolean) as string[]);
      const settings = await this.loadSettings(businessId, manager);
      const invoiceNumber = await this.documentNumberingService.generate({
        businessId,
        documentType: 'purchase_invoice',
        prefix: settings.prefix,
        includeYear: settings.includeYear,
        padding: settings.padding,
      }, manager);

      const calculations = this.calculateTotals(items, products);
      const invoiceRepository = manager.getRepository(PurchaseInvoice);
      const invoice = await invoiceRepository.save(
        invoiceRepository.create({
          businessId,
          vendorId: vendor.id,
          createdById: currentUser.sub as string,
          purchaseInvoiceNumber: invoiceNumber,
          vendorInvoiceNumber: dto.vendorInvoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          currencyCode: dto.currencyCode?.trim() || 'TZS',
          exchangeRate: dto.exchangeRate ?? 1,
          subtotal: calculations.subtotal,
          discountTotal: calculations.discountTotal,
          taxTotal: calculations.taxTotal,
          totalAmount: calculations.totalAmount,
          amountPaid: 0,
          balance: calculations.totalAmount,
          documentStatus: DocumentStatus.DRAFT,
          paymentStatus: PaymentStatus.UNPAID,
          remarks: dto.remarks,
        } as PurchaseInvoice),
      );

      const itemRepository = manager.getRepository(PurchaseInvoiceItem);
      const savedItems = items.map((item) =>
        itemRepository.create({
          purchaseInvoiceId: invoice.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitCost: item.unitCost,
          discountAmount: item.discountAmount,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          lineSubtotal: item.lineSubtotal,
          lineTotal: item.lineTotal,
          isInventoryItem: item.isInventoryItem,
        } as PurchaseInvoiceItem),
      );
      await itemRepository.save(savedItems);

      if (!dto.isDraft) {
        await this.postWithManager(manager, invoice.id, currentUser);
      }

      const saved = await invoiceRepository.findOne({
        where: { id: invoice.id },
        relations: ['vendor', 'createdBy', 'postedBy', 'cancelledBy', 'reversedBy', 'items', 'items.product'],
      });
      if (!saved) {
        throw new NotFoundException('Purchase invoice could not be reloaded');
      }
      return this.shapeDetail(saved);
    });
  }

  async post(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => this.postWithManager(manager, id, currentUser));
  }

  async reverse(id: string, dto: ReversePurchaseInvoiceDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const invoice = await manager.getRepository(PurchaseInvoice).findOne({
        where: { id },
        relations: ['vendor', 'items', 'items.product'],
      });
      if (!invoice) {
        throw new NotFoundException('Purchase invoice not found');
      }
      this.assertBusinessAccess(invoice.businessId, currentUser);
      if (invoice.documentStatus !== DocumentStatus.POSTED) {
        throw new BadRequestException('Only posted purchase invoices can be reversed');
      }
      if (invoice.paymentStatus !== PaymentStatus.UNPAID) {
        throw new BadRequestException('Purchase invoice has posted payments. Void the payment voucher before reversal.');
      }

      for (const item of invoice.items ?? []) {
        if (!item.productId) {
          continue;
        }
        const product = await manager.getRepository(Product).findOne({ where: { id: item.productId } });
        if (!product) {
          continue;
        }
        if (Number(product.currentStock ?? 0) < Number(item.quantity ?? 0)) {
          throw new BadRequestException(
            `Purchase invoice cannot be reversed because product ${product.productName} has only ${Number(product.currentStock ?? 0)} units available, while ${Number(item.quantity ?? 0)} units must be reversed.`,
          );
        }
      }

      const reversedEntries = await this.ledgerService.reverseEntriesBySource(
        manager,
        invoice.id,
        invoice.purchaseInvoiceNumber,
        currentUser as never,
        LedgerEntrySourceType.PURCHASE_INVOICE_REVERSAL,
      );

      for (const item of invoice.items ?? []) {
        if (!item.productId || !item.isInventoryItem) {
          continue;
        }
        const product = await manager.getRepository(Product).findOne({ where: { id: item.productId } });
        if (!product) {
          continue;
        }
        const previousStock = Number(product.currentStock ?? 0);
        const newStock = previousStock - Number(item.quantity ?? 0);
        product.currentStock = newStock;
        product.lastStockMovementAt = new Date();
        await manager.getRepository(Product).save(product);

        await manager.getRepository(InventoryTransaction).save(
          manager.getRepository(InventoryTransaction).create({
            businessId: invoice.businessId,
            transactionNumber: `PRV-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
            productId: product.id,
            sourceId: invoice.id,
            sourceNumber: invoice.purchaseInvoiceNumber,
            createdByUserId: currentUser.sub,
            transactionType: InventoryTransactionType.PURCHASE_INVOICE_REVERSAL,
            quantity: item.quantity,
            previousStock,
            newStock,
            reference: invoice.purchaseInvoiceNumber,
            reason: 'Purchase invoice reversal',
            notes: dto.reason,
            isReversal: true,
            reversalOfTransactionId: undefined,
            reversalBatchId: `PUR-${invoice.id}`,
          } as InventoryTransaction),
        );
      }

      const vendor = await manager.getRepository(Vendor).findOne({ where: { id: invoice.vendorId } });
      if (vendor) {
        vendor.balance = Number(vendor.balance ?? 0) - Number(invoice.totalAmount ?? 0);
        await manager.getRepository(Vendor).save(vendor);
      }

      invoice.documentStatus = DocumentStatus.REVERSED;
      invoice.paymentStatus = PaymentStatus.UNPAID;
      invoice.reversedAt = new Date();
      invoice.reversalDate = new Date();
      invoice.reversedById = currentUser.sub;
      invoice.reversalReason = dto.reason;
      invoice.reversalNumber = `PREV-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
      await manager.getRepository(PurchaseInvoice).save(invoice);

      await manager.getRepository(AuditLog).save(
        manager.getRepository(AuditLog).create({
          businessId: invoice.businessId,
          userId: currentUser.sub,
          action: AuditAction.UPDATE,
          entityName: 'PurchaseInvoice',
          entityId: invoice.id,
          metadata: JSON.stringify({ reversalReason: dto.reason, reversedEntries: reversedEntries.length }),
        } as AuditLog),
      );

      const saved = await manager.getRepository(PurchaseInvoice).findOne({
        where: { id: invoice.id },
        relations: ['vendor', 'createdBy', 'postedBy', 'cancelledBy', 'reversedBy', 'items', 'items.product'],
      });
      if (!saved) {
        throw new NotFoundException('Purchase invoice could not be reloaded');
      }
      return this.shapeDetail(saved);
    });
  }

  private async postWithManager(manager: EntityManager, id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const invoiceRepository = manager.getRepository(PurchaseInvoice);
    const invoice = await invoiceRepository.findOne({
      where: { id },
      relations: ['vendor', 'createdBy', 'postedBy', 'cancelledBy', 'reversedBy', 'items', 'items.product'],
    });
    if (!invoice) {
      throw new NotFoundException('Purchase invoice not found');
    }
    this.assertBusinessAccess(invoice.businessId, currentUser);
    if (invoice.documentStatus !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase invoices can be posted');
    }

    const products = await this.loadProducts(manager, invoice.businessId, (invoice.items ?? []).map((item) => item.productId).filter(Boolean) as string[]);
    const calculations = this.calculateTotalsFromStoredItems(invoice.items ?? [], products);
    invoice.subtotal = calculations.subtotal;
    invoice.discountTotal = calculations.discountTotal;
    invoice.taxTotal = calculations.taxTotal;
    invoice.totalAmount = calculations.totalAmount;
    invoice.balance = calculations.totalAmount;
    invoice.amountPaid = 0;
    invoice.documentStatus = DocumentStatus.POSTED;
    invoice.paymentStatus = PaymentStatus.UNPAID;
    invoice.postedAt = new Date();
    invoice.postingDate = new Date();
    invoice.postedById = currentUser.sub;
    await invoiceRepository.save(invoice);

    for (const item of invoice.items ?? []) {
      if (!item.productId || !item.isInventoryItem) {
        continue;
      }
      const product = products.get(item.productId);
      if (!product) {
        throw new BadRequestException('Product not found');
      }
      const previousStock = Number(product.currentStock ?? 0);
      const newStock = previousStock + Number(item.quantity ?? 0);
      product.currentStock = newStock;
      product.buyingPrice = Number(item.unitCost ?? product.buyingPrice ?? 0);
      product.lastStockMovementAt = new Date();
      await manager.getRepository(Product).save(product);

      await manager.getRepository(InventoryTransaction).save(
        manager.getRepository(InventoryTransaction).create({
          businessId: invoice.businessId,
          transactionNumber: `PINV-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
          productId: product.id,
          vendorId: invoice.vendorId,
          sourceId: invoice.id,
          sourceNumber: invoice.purchaseInvoiceNumber,
          createdByUserId: currentUser.sub,
          transactionType: InventoryTransactionType.STOCK_IN,
          quantity: item.quantity,
          previousStock,
          newStock,
          unitCost: item.unitCost,
          reference: invoice.purchaseInvoiceNumber,
          reason: 'Purchase invoice',
          notes: invoice.remarks,
          isReversal: false,
        } as InventoryTransaction),
      );
    }

    await this.ledgerService.postPurchaseInvoiceEntries(manager, invoice, currentUser as never);

    const vendor = await manager.getRepository(Vendor).findOne({ where: { id: invoice.vendorId } });
    if (vendor) {
      vendor.balance = Number(vendor.balance ?? 0) + Number(invoice.totalAmount ?? 0);
      await manager.getRepository(Vendor).save(vendor);
    }

    await manager.getRepository(AuditLog).save(
      manager.getRepository(AuditLog).create({
          businessId: invoice.businessId,
          userId: currentUser.sub,
          action: AuditAction.UPDATE,
          entityName: 'PurchaseInvoice',
        entityId: invoice.id,
        metadata: JSON.stringify({
          purchaseInvoiceNumber: invoice.purchaseInvoiceNumber,
          status: invoice.documentStatus,
          paymentStatus: invoice.paymentStatus,
          totalAmount: invoice.totalAmount,
        }),
      } as AuditLog),
    );

    const saved = await invoiceRepository.findOne({
      where: { id: invoice.id },
      relations: ['vendor', 'createdBy', 'postedBy', 'cancelledBy', 'reversedBy', 'items', 'items.product'],
    });
    if (!saved) {
      throw new NotFoundException('Purchase invoice could not be reloaded');
    }
    return this.shapeDetail(saved);
  }

  private normalizeItems(items: CreatePurchaseInvoiceDto['items']): Array<CreatePurchaseInvoiceItemDto & { lineSubtotal: number; taxAmount: number; lineTotal: number; discountAmount: number; description?: string; isInventoryItem: boolean }> {
    return items.map((item) => {
      const quantity = Number(item.quantity);
      const unitCost = Number(item.unitCost);
      const gross = quantity * unitCost;
      const discountAmount = Number(item.discountAmount ?? 0);
      const taxableAmount = Math.max(gross - discountAmount, 0);
      const taxRate = Number(item.taxRate ?? 0);
      const taxAmount = taxRate ? (taxableAmount * taxRate) / 100 : 0;
      return {
        ...item,
        quantity,
        unitCost,
        discountAmount,
        taxRate,
        taxAmount,
        lineSubtotal: gross - discountAmount,
        lineTotal: taxableAmount + taxAmount,
        isInventoryItem: item.isInventoryItem ?? true,
      };
    });
  }

  private calculateTotals(items: Array<{ quantity: number; unitCost: number; discountAmount: number; taxAmount: number }>, products: Map<string, Product>) {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    for (const item of items) {
      const gross = Number(item.quantity) * Number(item.unitCost);
      subtotal += gross;
      discountTotal += Number(item.discountAmount ?? 0);
      taxTotal += Number(item.taxAmount ?? 0);
    }
    const totalAmount = subtotal - discountTotal + taxTotal;
    return { subtotal, discountTotal, taxTotal, totalAmount };
  }

  private calculateTotalsFromStoredItems(items: PurchaseInvoiceItem[], products: Map<string, Product>) {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    for (const item of items) {
      if (item.productId && !products.has(item.productId)) {
        throw new BadRequestException('One or more products are invalid');
      }
      subtotal += Number(item.lineSubtotal ?? 0) + Number(item.discountAmount ?? 0);
      discountTotal += Number(item.discountAmount ?? 0);
      taxTotal += Number(item.taxAmount ?? 0);
    }
    const totalAmount = subtotal - discountTotal + taxTotal;
    return { subtotal, discountTotal, taxTotal, totalAmount };
  }

  private async loadProducts(manager: EntityManager, businessId: string, productIds: string[]): Promise<Map<string, Product>> {
    if (!productIds.length) {
      return new Map();
    }
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

  private async loadSettings(businessId: string, manager?: EntityManager): Promise<PurchaseSettings & Record<string, string | number | boolean>> {
    const repository = manager ? manager.getRepository(SystemSetting) : this.systemSettingsRepository;
    const settings = await repository.find({ where: [{ businessId }, { businessId: IsNull() }] });
    const values = Object.fromEntries(settings.map((setting) => [setting.key, setting.value ?? '']));
    return {
      ...values,
      prefix: values['purchase.number_prefix'] || 'PINV',
      includeYear: (values['purchase.number_include_year'] ?? 'true') !== 'false',
      padding: Number(values['purchase.number_padding'] ?? 6) || 6,
    };
  }

  private shapeSummary(invoice: PurchaseInvoice): Record<string, unknown> {
    return {
      id: invoice.id,
      purchaseInvoiceNumber: invoice.purchaseInvoiceNumber,
      vendorInvoiceNumber: invoice.vendorInvoiceNumber ?? null,
      invoiceDate: invoice.invoiceDate,
      vendor: invoice.vendor ? { id: invoice.vendor.id, name: invoice.vendor.name } : null,
      subtotal: Number(invoice.subtotal ?? 0),
      discountTotal: Number(invoice.discountTotal ?? 0),
      taxTotal: Number(invoice.taxTotal ?? 0),
      totalAmount: Number(invoice.totalAmount ?? 0),
      amountPaid: Number(invoice.amountPaid ?? 0),
      balance: Number(invoice.balance ?? 0),
      documentStatus: invoice.documentStatus,
      paymentStatus: invoice.paymentStatus,
      createdAt: invoice.createdAt,
    };
  }

  private shapeDetail(invoice: PurchaseInvoice): Record<string, unknown> {
    return {
      ...this.shapeSummary(invoice),
      remarks: invoice.remarks ?? null,
      dueDate: invoice.dueDate ?? null,
      postedAt: invoice.postedAt ?? null,
      reversedAt: invoice.reversedAt ?? null,
      reversalReason: invoice.reversalReason ?? null,
      reversalNumber: invoice.reversalNumber ?? null,
      items: (invoice.items ?? []).map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.productName ?? null,
        sku: item.product?.sku ?? null,
        description: item.description ?? null,
        quantity: Number(item.quantity ?? 0),
        unitCost: Number(item.unitCost ?? 0),
        discountAmount: Number(item.discountAmount ?? 0),
        taxRate: Number(item.taxRate ?? 0),
        taxAmount: Number(item.taxAmount ?? 0),
        lineSubtotal: Number(item.lineSubtotal ?? 0),
        lineTotal: Number(item.lineTotal ?? 0),
        isInventoryItem: item.isInventoryItem,
      })),
      vendor: invoice.vendor ? { id: invoice.vendor.id, name: invoice.vendor.name, phone: invoice.vendor.phone, email: invoice.vendor.email } : null,
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
}
