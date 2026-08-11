import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { SalesInvoice } from '../../database/entities/sales-invoice.entity';
import { SalesInvoiceItem } from '../../database/entities/sales-invoice-item.entity';
import { Product } from '../../database/entities/product.entity';
import { Customer } from '../../database/entities/customer.entity';
import { InventoryTransaction } from '../../database/entities/inventory-transaction.entity';
import { InvoiceStatus, InventoryTransactionType } from '../../common/enums/domain.enums';

type CurrentUserContext = {
  businessId?: string | null;
  business?: { id?: string | null } | null;
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(SalesInvoice) private readonly invoicesRepository: Repository<SalesInvoice>,
    @InjectRepository(SalesInvoiceItem) private readonly invoiceItemsRepository: Repository<SalesInvoiceItem>,
    @InjectRepository(Product) private readonly productsRepository: Repository<Product>,
    @InjectRepository(Customer) private readonly customersRepository: Repository<Customer>,
    @InjectRepository(InventoryTransaction) private readonly inventoryTransactionsRepository: Repository<InventoryTransaction>,
  ) {}

  async dailySales(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    const date = filters.date ? new Date(String(filters.date)) : new Date();
    const { start, end } = this.dayRange(date);
    const invoices = await this.completedInvoices(businessId, start, end);
    return this.salesSummary(invoices);
  }

  async monthlySales(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    const year = Number(filters.year ?? new Date().getFullYear());
    const month = filters.month ? Number(filters.month) - 1 : new Date().getMonth();
    const { start, end } = this.monthRange(year, month);
    const invoices = await this.completedInvoices(businessId, start, end);
    return {
      ...this.salesSummary(invoices),
      year,
      month: month + 1,
    };
  }

  async annualSales(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    const year = Number(filters.year ?? new Date().getFullYear());
    const { start, end } = this.yearRange(year);
    const invoices = await this.completedInvoices(businessId, start, end);
    return {
      ...this.salesSummary(invoices),
      year,
    };
  }

  async customerReports(currentUser: CurrentUserContext, customerId: string): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    const customer = await this.customersRepository.findOne({ where: { id: customerId, businessId } });
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }
    const invoices = await this.invoicesRepository.find({
      where: { customerId, businessId },
      order: { invoiceDate: 'DESC' },
      relations: ['items'],
    });
    return {
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        balance: Number(customer.balance ?? 0),
        status: customer.status,
      },
      purchaseHistory: invoices,
      totalPurchases: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0),
      lastPurchaseDate: invoices[0]?.invoiceDate ?? null,
      outstandingBalance: Number(customer.balance ?? 0),
    };
  }

  async productReports(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    const items = await this.invoiceItemsRepository
      .createQueryBuilder('item')
      .innerJoin('item.invoice', 'invoice')
      .innerJoin('item.product', 'product')
      .select('product.id', 'productId')
      .addSelect('product.productName', 'productName')
      .addSelect('product.sku', 'sku')
      .addSelect('SUM(item.quantity)', 'quantitySold')
      .addSelect('SUM(item.total)', 'revenue')
      .where('invoice.businessId = :businessId', { businessId })
      .andWhere('invoice.status != :status', { status: InvoiceStatus.CANCELLED })
      .groupBy('product.id')
      .addGroupBy('product.productName')
      .addGroupBy('product.sku')
      .orderBy('SUM(item.quantity)', 'DESC')
      .getRawMany<{ productId: string; productName: string; sku: string; quantitySold: string; revenue: string }>();

    return {
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantitySold: Number(item.quantitySold),
        revenue: Number(item.revenue),
      })),
    };
  }

  async inventoryReports(currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    const transactions = await this.inventoryTransactionsRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      take: 100,
      relations: ['product', 'createdBy'],
    });
    const products = await this.productsRepository.find({ where: { businessId } });
    return {
      currentStockLevels: products.map((product) => ({
        id: product.id,
        productName: product.productName,
        sku: product.sku,
        currentStock: Number(product.currentStock ?? 0),
        minimumStock: Number(product.minimumStock ?? 0),
      })),
      lowStockItems: products
        .filter((product) => Number(product.currentStock ?? 0) <= Number(product.minimumStock ?? 0))
        .map((product) => ({
          id: product.id,
          productName: product.productName,
          sku: product.sku,
          currentStock: Number(product.currentStock ?? 0),
          minimumStock: Number(product.minimumStock ?? 0),
        })),
      inventoryMovements: transactions,
      stockAdjustmentHistory: transactions.filter((transaction) => transaction.transactionType === InventoryTransactionType.ADJUSTMENT),
    };
  }

  async invoiceReports(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    const query = this.invoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.createdBy', 'createdBy')
      .where('invoice.businessId = :businessId', { businessId });

    if (filters.status) {
      query.andWhere('invoice.status = :status', { status: String(filters.status) });
    }
    if (filters.paymentMethod) {
      query.andWhere('invoice.paymentMethod = :paymentMethod', { paymentMethod: String(filters.paymentMethod) });
    }
    if (filters.customerId) {
      query.andWhere('invoice.customerId = :customerId', { customerId: String(filters.customerId) });
    }
    if (filters.salespersonId) {
      query.andWhere('invoice.createdByUserId = :salespersonId', { salespersonId: String(filters.salespersonId) });
    }
    if (filters.dateFrom) {
      query.andWhere('invoice.invoiceDate >= :dateFrom', { dateFrom: new Date(String(filters.dateFrom)) });
    }
    if (filters.dateTo) {
      const upperBound = new Date(String(filters.dateTo));
      upperBound.setDate(upperBound.getDate() + 1);
      query.andWhere('invoice.invoiceDate < :dateTo', { dateTo: upperBound });
    }

    const [items, total] = await query.orderBy('invoice.invoiceDate', 'DESC').take(100).getManyAndCount();
    return {
      items: items.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.customer?.fullName ?? 'Walk-in Customer',
        salesperson: invoice.createdBy?.fullName ?? null,
        paymentMethod: invoice.paymentMethod ?? null,
        status: invoice.status,
        amount: Number(invoice.totalAmount ?? 0),
        date: invoice.invoiceDate,
      })),
      total,
    };
  }

  async salesTrends(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    const from = filters.dateFrom ? new Date(String(filters.dateFrom)) : new Date(new Date().getFullYear(), 0, 1);
    const to = filters.dateTo ? new Date(String(filters.dateTo)) : new Date();
    const invoices = await this.completedInvoices(businessId, from, to);
    const byMonth = new Map<string, { label: string; revenue: number; count: number }>();
    for (const invoice of invoices) {
      const date = new Date(invoice.invoiceDate);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const label = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      const existing = byMonth.get(key) ?? { label, revenue: 0, count: 0 };
      existing.revenue += Number(invoice.totalAmount ?? 0);
      existing.count += 1;
      byMonth.set(key, existing);
    }
    return { items: Array.from(byMonth.values()) };
  }

  private async completedInvoices(businessId: string, start: Date, end: Date): Promise<SalesInvoice[]> {
    return this.invoicesRepository.find({
      where: {
        businessId,
        status: In([InvoiceStatus.PAID, InvoiceStatus.POSTED, InvoiceStatus.PARTIALLY_PAID]),
        invoiceDate: Between(start, end),
      },
      order: { invoiceDate: 'ASC' },
      relations: ['items'],
    });
  }

  private salesSummary(invoices: SalesInvoice[]): Record<string, unknown> {
    const revenue = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0);
    const discounts = invoices.reduce((sum, invoice) => sum + Number(invoice.discountTotal ?? 0), 0);
    const tax = invoices.reduce((sum, invoice) => sum + Number(invoice.taxTotal ?? 0), 0);
    return {
      count: invoices.length,
      revenue,
      discounts,
      tax,
      netSales: revenue,
    };
  }

  private dayRange(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private monthRange(year: number, month: number): { start: Date; end: Date } {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  private yearRange(year: number): { start: Date; end: Date } {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);
    return { start, end };
  }

  private requireBusinessId(currentUser: CurrentUserContext): string {
    const businessId = currentUser.businessId ?? currentUser.business?.id ?? undefined;
    if (!businessId) {
      throw new BadRequestException('Business context is required');
    }
    return businessId;
  }
}
