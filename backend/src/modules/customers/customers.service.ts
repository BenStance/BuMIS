import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity';
import { SalesInvoice } from '../../database/entities/sales-invoice.entity';
import { RecordStatus } from '../../common/enums/domain.enums';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

type CurrentUserContext = {
  businessId?: string | null;
  business?: { id?: string | null } | null;
};

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly customersRepository: Repository<Customer>,
    @InjectRepository(SalesInvoice) private readonly invoicesRepository: Repository<SalesInvoice>,
  ) {}

  async findAll(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser, filters.businessId as string | undefined);
    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 20), 1), 100);
    const search = String(filters.search ?? '').trim();
    const status = String(filters.status ?? '').trim() as RecordStatus | '';

    const query = this.customersRepository
      .createQueryBuilder('customer')
      .where('customer.businessId = :businessId', { businessId });

    if (search) {
      query.andWhere(
        '(customer.fullName LIKE :search OR customer.phone LIKE :search OR customer.email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      query.andWhere('customer.status = :status', { status });
    }

    const [items, total] = await query.orderBy('customer.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return {
      items: await Promise.all(items.map((customer) => this.enrichCustomer(customer))),
      page,
      limit,
      total,
    };
  }

  async findOne(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const customer = await this.customersRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    this.assertBusinessAccess(customer.businessId, currentUser);
    return this.enrichCustomer(customer);
  }

  async create(dto: CreateCustomerDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    if (dto.phone) {
      await this.ensurePhoneUnique(businessId, dto.phone);
    }
    const customer = (await this.customersRepository.save(
      this.customersRepository.create({
        businessId,
        ...dto,
        status: RecordStatus.ACTIVE,
      } as any),
    )) as unknown as Customer;
    return this.enrichCustomer(customer);
  }

  async update(id: string, dto: UpdateCustomerDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const customer = await this.customersRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    this.assertBusinessAccess(customer.businessId, currentUser);

    if (dto.phone && dto.phone !== customer.phone) {
      await this.ensurePhoneUnique(customer.businessId, dto.phone, customer.id);
    }

    Object.assign(customer, dto);
    const saved = (await this.customersRepository.save(customer)) as unknown as Customer;
    return this.enrichCustomer(saved);
  }

  async remove(id: string, currentUser: CurrentUserContext): Promise<Record<string, string>> {
    const customer = await this.customersRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    this.assertBusinessAccess(customer.businessId, currentUser);
    customer.status = RecordStatus.INACTIVE;
    await this.customersRepository.save(customer);
    return { message: 'Customer archived successfully' };
  }

  async profile(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const customer = await this.customersRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    this.assertBusinessAccess(customer.businessId, currentUser);

    const invoices = await this.invoicesRepository.find({
      where: { customerId: id },
      order: { invoiceDate: 'DESC' },
      take: 20,
    });
    const totalPurchases = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0);

    return {
      customer: await this.enrichCustomer(customer),
      totalPurchases,
      invoiceCount: invoices.length,
      lastPurchaseDate: invoices[0]?.invoiceDate ?? null,
      recentInvoices: invoices,
    };
  }

  async history(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const customer = await this.customersRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    this.assertBusinessAccess(customer.businessId, currentUser);

    const invoices = await this.invoicesRepository.find({
      where: { customerId: id },
      relations: ['items', 'items.product'],
      order: { invoiceDate: 'DESC' },
      take: 50,
    });

    return {
      customer: await this.enrichCustomer(customer),
      invoices,
    };
  }

  private async ensurePhoneUnique(businessId: string, phone: string, ignoreCustomerId?: string): Promise<void> {
    const duplicate = await this.customersRepository.findOne({
      where: {
        businessId,
        phone,
      },
    });
    if (duplicate && duplicate.id !== ignoreCustomerId) {
      throw new BadRequestException('Customer phone already exists');
    }
  }

  private async enrichCustomer(customer: Customer): Promise<Record<string, unknown>> {
    const invoices = await this.invoicesRepository.find({
      where: { customerId: customer.id },
      order: { invoiceDate: 'DESC' },
    });
    const totalPurchases = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0);
    return {
      id: customer.id,
      businessId: customer.businessId,
      fullName: customer.fullName,
      contactPerson: customer.contactPerson,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      tin: customer.tin,
      notes: customer.notes,
      balance: customer.balance,
      outstandingBalance: customer.balance,
      totalPurchases,
      invoiceCount: invoices.length,
      lastPurchaseDate: invoices[0]?.invoiceDate ?? null,
      status: customer.status,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  private resolveBusinessId(currentUser: CurrentUserContext, explicitBusinessId?: string): string | undefined {
    return explicitBusinessId ?? currentUser.businessId ?? currentUser.business?.id ?? undefined;
  }

  private requireBusinessId(currentUser: CurrentUserContext, explicitBusinessId?: string): string {
    const businessId = this.resolveBusinessId(currentUser, explicitBusinessId);
    if (!businessId) {
      throw new BadRequestException('Business context is required');
    }
    return businessId;
  }

  private assertBusinessAccess(recordBusinessId: string, currentUser: CurrentUserContext): void {
    const businessId = this.resolveBusinessId(currentUser);
    if (businessId && businessId !== recordBusinessId) {
      throw new BadRequestException('You cannot access records from another business');
    }
  }
}
