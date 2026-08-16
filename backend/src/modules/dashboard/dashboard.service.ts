import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { SalesInvoice } from '../../database/entities/sales-invoice.entity';
import { SalesInvoiceItem } from '../../database/entities/sales-invoice-item.entity';
import { Product } from '../../database/entities/product.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Vendor } from '../../database/entities/vendor.entity';
import { User } from '../../database/entities/user.entity';
import { Business } from '../../database/entities/business.entity';
import { BusinessSubscription } from '../../database/entities/business-subscription.entity';
import { InventoryTransaction } from '../../database/entities/inventory-transaction.entity';
import { InvoiceStatus, SubscriptionStatus, UserStatus } from '../../common/enums/domain.enums';

type CurrentUserContext = {
  businessId?: string | null;
  business?: { id?: string | null } | null;
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(SalesInvoice) private readonly invoicesRepository: Repository<SalesInvoice>,
    @InjectRepository(SalesInvoiceItem) private readonly invoiceItemsRepository: Repository<SalesInvoiceItem>,
    @InjectRepository(Product) private readonly productsRepository: Repository<Product>,
    @InjectRepository(Customer) private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Vendor) private readonly vendorsRepository: Repository<Vendor>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Business) private readonly businessesRepository: Repository<Business>,
    @InjectRepository(BusinessSubscription) private readonly subscriptionsRepository: Repository<BusinessSubscription>,
    @InjectRepository(InventoryTransaction) private readonly inventoryTransactionsRepository: Repository<InventoryTransaction>,
  ) {}

  async summary(currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    return {
      todaySales: await this.loadTodaySales(businessId),
      monthlySales: await this.loadMonthlySales(businessId),
      salesSummary: await this.loadSalesSummary(businessId),
      recentInvoices: await this.loadRecentInvoices(businessId),
      lowStock: await this.loadLowStock(businessId),
      bestSellingProducts: await this.loadBestSellingProducts(businessId),
      businessStatistics: await this.businessStatistics(businessId),
    };
  }

  async todaySales(currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    return this.loadTodaySales(businessId);
  }

  async recentInvoices(currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    return { items: await this.loadRecentInvoices(businessId) };
  }

  async lowStock(currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    return { items: await this.loadLowStock(businessId) };
  }

  async bestSellingProducts(currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    return { items: await this.loadBestSellingProducts(businessId) };
  }

  private async loadTodaySales(businessId: string): Promise<Record<string, unknown>> {
    const { start, end } = this.todayRange();
    const invoices = await this.invoicesRepository.find({
      where: {
        businessId,
        status: In([InvoiceStatus.PAID, InvoiceStatus.POSTED, InvoiceStatus.PARTIALLY_PAID]),
        invoiceDate: Between(start, end),
      },
    });
    const revenue = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0);
    return {
      count: invoices.length,
      revenue,
      averageSaleValue: invoices.length ? revenue / invoices.length : 0,
    };
  }

  private async loadMonthlySales(businessId: string): Promise<Record<string, unknown>> {
    const { start, end } = this.monthRange();
    const invoices = await this.invoicesRepository.find({
      where: {
        businessId,
        status: In([InvoiceStatus.PAID, InvoiceStatus.POSTED, InvoiceStatus.PARTIALLY_PAID]),
        invoiceDate: Between(start, end),
      },
    });
    const revenue = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0);
    return {
      revenue,
      invoiceCount: invoices.length,
      averageDailySales: revenue / Math.max(new Date().getDate(), 1),
    };
  }

  private async loadSalesSummary(businessId: string): Promise<Record<string, unknown>> {
    const today = await this.loadTodaySales(businessId);
    const week = await this.periodSales(businessId, 7);
    const month = await this.loadMonthlySales(businessId);
    const year = await this.periodSales(businessId, 365);
    return { today, week, month, year };
  }

  private async loadRecentInvoices(businessId: string): Promise<Array<Record<string, unknown>>> {
    const invoices = await this.invoicesRepository.find({
      where: { businessId },
      relations: ['customer', 'createdBy'],
      order: { invoiceDate: 'DESC' },
      take: 10,
    });
    return invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer?.fullName ?? 'Walk-in Customer',
      amount: Number(invoice.totalAmount ?? 0),
      status: invoice.status,
      date: invoice.invoiceDate,
    }));
  }

  private async loadLowStock(businessId: string): Promise<Array<Record<string, unknown>>> {
    const products = await this.productsRepository.find({ where: { businessId }, order: { updatedAt: 'DESC' } });
    return products
      .filter((product) => Number(product.currentStock ?? 0) <= Number(product.minimumStock ?? 0))
      .slice(0, 10)
      .map((product) => ({
        id: product.id,
        productName: product.productName,
        sku: product.sku,
        currentStock: Number(product.currentStock ?? 0),
        minimumStock: Number(product.minimumStock ?? 0),
      }));
  }

  private async loadBestSellingProducts(businessId: string): Promise<Array<Record<string, unknown>>> {
    const items = await this.invoiceItemsRepository
      .createQueryBuilder('item')
      .innerJoin('item.invoice', 'invoice')
      .innerJoin('item.product', 'product')
      .select('product.id', 'productId')
      .addSelect('product.productName', 'productName')
      .addSelect('SUM(item.quantity)', 'quantitySold')
      .addSelect('SUM(item.total)', 'revenueGenerated')
      .where('invoice.businessId = :businessId', { businessId })
      .andWhere('invoice.status != :status', { status: InvoiceStatus.CANCELLED })
      .groupBy('product.id')
      .addGroupBy('product.productName')
      .orderBy('SUM(item.quantity)', 'DESC')
      .take(10)
      .getRawMany<{ productId: string; productName: string; quantitySold: string; revenueGenerated: string }>();

    return items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantitySold: Number(item.quantitySold),
      revenueGenerated: Number(item.revenueGenerated),
    }));
  }

  private async businessStatistics(businessId: string): Promise<Record<string, unknown>> {
    const [products, customers, vendors, userCounts, business, inventoryValue] = await Promise.all([
      this.productsRepository.count({ where: { businessId } }),
      this.customersRepository.count({ where: { businessId } }),
      this.vendorsRepository.count({ where: { businessId } }),
      this.usersRepository
        .createQueryBuilder('user')
        .select('COUNT(user.id)', 'totalUsers')
        .addSelect('COUNT(user.id) FILTER (WHERE user.status = :activeStatus)', 'activeUsers')
        .where('user.businessId = :businessId', { businessId })
        .setParameter('activeStatus', UserStatus.ACTIVE)
        .getRawOne<{ totalUsers: string; activeUsers: string }>(),
      this.businessesRepository.findOne({
        where: { id: businessId },
        relations: ['activeSubscription', 'activeSubscription.plan'],
      }),
      this.inventoryValue(businessId),
    ]);

    const totalUsers = Number(userCounts?.totalUsers ?? 0);
    const activeUsers = Number(userCounts?.activeUsers ?? 0);

    return {
      products,
      customers,
      vendors,
      totalUsers,
      activeUsers,
      inactiveUsers: Math.max(totalUsers - activeUsers, 0),
      activeUserPercentage: totalUsers > 0 ? Number(((activeUsers / totalUsers) * 100).toFixed(2)) : 0,
      inventoryValue,
      activeSubscriptionStatus: business?.activeSubscription?.status ?? SubscriptionStatus.CANCELLED,
    };
  }

  private async inventoryValue(businessId: string): Promise<number> {
    const products = await this.productsRepository.find({ where: { businessId } });
    return products.reduce((sum, product) => sum + Number(product.currentStock ?? 0) * Number(product.buyingPrice ?? 0), 0);
  }

  private async periodSales(businessId: string, days: number): Promise<Record<string, unknown>> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const invoices = await this.invoicesRepository.find({
      where: {
        businessId,
        status: In([InvoiceStatus.PAID, InvoiceStatus.POSTED, InvoiceStatus.PARTIALLY_PAID]),
        invoiceDate: Between(start, end),
      },
    });
    const revenue = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0);
    return { count: invoices.length, revenue };
  }

  private todayRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private monthRange(): { start: Date; end: Date } {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
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
