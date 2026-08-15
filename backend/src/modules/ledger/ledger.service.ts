import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { LedgerAccount } from '../../database/entities/ledger-account.entity';
import { LedgerEntry } from '../../database/entities/ledger-entry.entity';
import { SalesInvoice } from '../../database/entities/sales-invoice.entity';
import { PaymentMethod, LedgerEntrySourceType, LedgerAccountType } from '../../common/enums/domain.enums';
import { SalesReceipt } from '../../database/entities/sales-receipt.entity';
import { PurchaseInvoice } from '../../database/entities/purchase-invoice.entity';
import { PaymentVoucher } from '../../database/entities/payment-voucher.entity';

type CurrentUserContext = {
  sub?: string;
  businessId?: string | null;
  business?: { id?: string | null } | null;
  role?: { name?: string | null } | null;
};

type SystemAccounts = {
  cash: LedgerAccount;
  receivable: LedgerAccount;
  salesRevenue: LedgerAccount;
  discounts: LedgerAccount;
  taxPayable: LedgerAccount;
  inventory: LedgerAccount;
  purchases: LedgerAccount;
  inputTaxReceivable: LedgerAccount;
  accountsPayable: LedgerAccount;
};

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerAccount) private readonly ledgerAccountsRepository: Repository<LedgerAccount>,
    @InjectRepository(LedgerEntry) private readonly ledgerEntriesRepository: Repository<LedgerEntry>,
  ) {}

  async findAccounts(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    await this.ensureSystemAccounts();
    const businessId = this.requireBusinessId(currentUser, filters.businessId as string | undefined);
    const accountType = String(filters.accountType ?? '').trim();
    const accounts = await this.ledgerAccountsRepository.find({
      where: [{ businessId }, { businessId: IsNull() }],
      order: { code: 'ASC' },
    });
    const balances = await this.getFilteredAccountBalances(currentUser, filters);
    return accounts
      .filter((account) => !accountType || account.accountType === accountType)
      .map((account) => {
      const balance = balances.get(account.id) ?? { debit: 0, credit: 0, entryCount: 0 };
      return {
        ...account,
        filteredDebit: Number(balance.debit ?? 0),
        filteredCredit: Number(balance.credit ?? 0),
        filteredAmount: Number(balance.debit ?? 0) - Number(balance.credit ?? 0),
        filteredEntryCount: Number(balance.entryCount ?? 0),
      };
      });
  }

  async findEntries(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 20), 1), 100);
    const businessId = this.requireBusinessId(currentUser, filters.businessId as string | undefined);
    const invoiceNumber = String(filters.invoiceNumber ?? '').trim();
    const customer = String(filters.customer ?? '').trim();
    const transactionType = String(filters.transactionType ?? '').trim();
    const accountType = String(filters.accountType ?? '').trim();
    const search = String(filters.search ?? '').trim();
    const query = this.ledgerEntriesRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.account', 'account')
      .leftJoinAndSelect('entry.invoice', 'invoice')
      .leftJoinAndSelect('invoice.customer', 'customerRecord')
      .leftJoinAndSelect('entry.createdBy', 'createdBy');

    query.andWhere('entry.businessId = :businessId', { businessId });
    if (invoiceNumber) {
      query.andWhere('invoice.invoiceNumber LIKE :invoiceNumber', { invoiceNumber: `%${invoiceNumber}%` });
    }
    if (transactionType) {
      query.andWhere('entry.sourceType = :transactionType', { transactionType });
    }
    if (accountType) {
      query.andWhere('account.accountType = :accountType', { accountType });
    }
    if (customer) {
      query.andWhere('customerRecord.fullName LIKE :customer', { customer: `%${customer}%` });
    }
    if (search) {
      query.andWhere(
        '(entry.reference LIKE :search OR entry.description LIKE :search OR account.code LIKE :search OR account.name LIKE :search OR invoice.invoiceNumber LIKE :search OR customerRecord.fullName LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await query.orderBy('entry.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { items, page, limit, total };
  }

  private async getFilteredAccountBalances(
    currentUser: CurrentUserContext,
    filters: Record<string, unknown>,
  ): Promise<Map<string, { debit: number; credit: number; entryCount: number }>> {
    const businessId = this.requireBusinessId(currentUser, filters.businessId as string | undefined);
    const invoiceNumber = String(filters.invoiceNumber ?? '').trim();
    const customer = String(filters.customer ?? '').trim();
    const transactionType = String(filters.transactionType ?? '').trim();
    const accountType = String(filters.accountType ?? '').trim();
    const search = String(filters.search ?? '').trim();

    const query = this.ledgerEntriesRepository
      .createQueryBuilder('entry')
      .leftJoin('entry.account', 'account')
      .leftJoin('entry.invoice', 'invoice')
      .leftJoin('invoice.customer', 'customerRecord')
      .where('entry.businessId = :businessId', { businessId });

    if (invoiceNumber) {
      query.andWhere('invoice.invoiceNumber LIKE :invoiceNumber', { invoiceNumber: `%${invoiceNumber}%` });
    }
    if (customer) {
      query.andWhere('customerRecord.fullName LIKE :customer', { customer: `%${customer}%` });
    }
    if (transactionType) {
      query.andWhere('entry.sourceType = :transactionType', { transactionType });
    }
    if (search) {
      query.andWhere(
        '(entry.reference LIKE :search OR entry.description LIKE :search OR account.code LIKE :search OR account.name LIKE :search OR invoice.invoiceNumber LIKE :search OR customerRecord.fullName LIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (accountType) {
      const accountIds = (
        await this.ledgerAccountsRepository.find({
          where: [{ businessId }, { businessId: IsNull() }],
        })
      )
        .filter((account) => account.accountType === accountType)
        .map((account) => account.id);
      if (!accountIds.length) {
        query.andWhere('1 = 0');
      } else {
        query.andWhere('entry.accountId IN (:...accountIds)', { accountIds });
      }
    }

    const raw = await query
      .select('entry.accountId', 'accountId')
      .addSelect('SUM(entry.debit)', 'debit')
      .addSelect('SUM(entry.credit)', 'credit')
      .addSelect('COUNT(entry.id)', 'entryCount')
      .groupBy('entry.accountId')
      .getRawMany<{ accountId: string; debit: string; credit: string; entryCount: string }>();

    return new Map(
      raw.map((item) => [
        item.accountId,
        {
          debit: Number(item.debit ?? 0),
          credit: Number(item.credit ?? 0),
          entryCount: Number(item.entryCount ?? 0),
        },
      ]),
    );
  }

  async ensureSystemAccounts(): Promise<SystemAccounts> {
    const accounts = await this.ledgerAccountsRepository.find({ where: { businessId: IsNull() } });
    const byCode = new Map(accounts.map((account) => [account.code, account]));

    const ensure = async (code: string, name: string, accountType: LedgerAccountType, normalBalance?: string) => {
      const existing = byCode.get(code);
      if (existing) {
        return existing;
      }
      // Multiple dashboard requests can initialize the chart of accounts concurrently.
      // Let PostgreSQL arbitrate that race, then load the single canonical row.
      await this.ledgerAccountsRepository
        .createQueryBuilder()
        .insert()
        .into(LedgerAccount)
        .values({
          businessId: null,
          code,
          name,
          accountType,
          normalBalance,
          isSystem: true,
        } as any)
        .orIgnore()
        .execute();
      const account = await this.ledgerAccountsRepository.findOne({ where: { code } });
      if (!account) {
        throw new BadRequestException(`Unable to initialize ledger account ${code}`);
      }
      byCode.set(code, account);
      return account;
    };

    const cash = await ensure('SYS-CASH', 'Cash', LedgerAccountType.ASSET, 'debit');
    const receivable = await ensure('SYS-AR', 'Accounts Receivable', LedgerAccountType.ASSET, 'debit');
    const salesRevenue = await ensure('SYS-SALES-REV', 'Sales Revenue', LedgerAccountType.REVENUE, 'credit');
    const discounts = await ensure('SYS-DISCOUNTS', 'Discounts', LedgerAccountType.EXPENSE, 'debit');
    const taxPayable = await ensure('SYS-TAX-PAYABLE', 'Tax Payable', LedgerAccountType.LIABILITY, 'credit');
    const inventory = await ensure('SYS-INVENTORY', 'Inventory', LedgerAccountType.ASSET, 'debit');
    const purchases = await ensure('SYS-PURCHASES', 'Purchases', LedgerAccountType.EXPENSE, 'debit');
    const inputTaxReceivable = await ensure('SYS-INPUT-TAX', 'Input Tax Receivable', LedgerAccountType.ASSET, 'debit');
    const accountsPayable = await ensure('SYS-AP', 'Accounts Payable', LedgerAccountType.LIABILITY, 'credit');

    return { cash, receivable, salesRevenue, discounts, taxPayable, inventory, purchases, inputTaxReceivable, accountsPayable };
  }

  async postInvoiceEntries(
    manager: EntityManager,
    invoice: SalesInvoice,
    currentUser: CurrentUserContext,
  ): Promise<LedgerEntry[]> {
    const accounts = await this.ensureSystemAccounts();
    const ledgerEntriesRepository = manager.getRepository(LedgerEntry);
    const invoiceAmount = Number(invoice.totalAmount ?? 0);
    const subtotal = Number(invoice.subtotal ?? 0);
    const discountTotal = Number(invoice.discountTotal ?? 0);
    const taxTotal = Number(invoice.taxTotal ?? 0);

    const entries: LedgerEntry[] = [];

    entries.push(
      ({
        businessId: invoice.businessId,
        accountId: accounts.receivable.id,
        invoiceId: invoice.id,
        sourceId: invoice.id,
        sourceNumber: invoice.invoiceNumber,
        createdByUserId: currentUser.sub,
        sourceType: LedgerEntrySourceType.INVOICE,
        reference: invoice.invoiceNumber,
        description: `Invoice ${invoice.invoiceNumber} sale`,
        debit: invoiceAmount,
        credit: 0,
        postingDate: new Date(),
        isReversal: false,
      } as LedgerEntry),
    );

    if (discountTotal > 0) {
      entries.push(
        ({
          businessId: invoice.businessId,
          accountId: accounts.discounts.id,
          invoiceId: invoice.id,
          sourceId: invoice.id,
          sourceNumber: invoice.invoiceNumber,
          createdByUserId: currentUser.sub,
          sourceType: LedgerEntrySourceType.INVOICE,
          reference: invoice.invoiceNumber,
          description: `Invoice ${invoice.invoiceNumber} discount`,
          debit: discountTotal,
          credit: 0,
          postingDate: new Date(),
          isReversal: false,
        } as LedgerEntry),
      );
    }

    entries.push(
      ({
        businessId: invoice.businessId,
        accountId: accounts.salesRevenue.id,
        invoiceId: invoice.id,
        sourceId: invoice.id,
        sourceNumber: invoice.invoiceNumber,
        createdByUserId: currentUser.sub,
        sourceType: LedgerEntrySourceType.INVOICE,
        reference: invoice.invoiceNumber,
        description: `Invoice ${invoice.invoiceNumber} sales revenue`,
        debit: 0,
        credit: subtotal,
        postingDate: new Date(),
        isReversal: false,
      } as LedgerEntry),
    );

    if (taxTotal > 0) {
      entries.push(
        ({
          businessId: invoice.businessId,
          accountId: accounts.taxPayable.id,
          invoiceId: invoice.id,
          sourceId: invoice.id,
          sourceNumber: invoice.invoiceNumber,
          createdByUserId: currentUser.sub,
          sourceType: LedgerEntrySourceType.INVOICE,
          reference: invoice.invoiceNumber,
          description: `Invoice ${invoice.invoiceNumber} tax payable`,
          debit: 0,
          credit: taxTotal,
          postingDate: new Date(),
          isReversal: false,
        } as LedgerEntry),
      );
    }

    return ledgerEntriesRepository.save(entries as LedgerEntry[]);
  }

  async postSalesReceiptEntries(
    manager: EntityManager,
    receipt: SalesReceipt,
    currentUser: CurrentUserContext,
  ): Promise<LedgerEntry[]> {
    const accounts = await this.ensureSystemAccounts();
    const ledgerEntriesRepository = manager.getRepository(LedgerEntry);
    const amount = Number(receipt.amount ?? 0);
    const entries = [
      {
        businessId: receipt.businessId,
        accountId: accounts.cash.id,
        invoiceId: receipt.allocations?.[0]?.salesInvoiceId ?? undefined,
        sourceId: receipt.id,
        sourceNumber: receipt.receiptNumber,
        createdByUserId: currentUser.sub,
        sourceType: LedgerEntrySourceType.SALES_RECEIPT,
        reference: receipt.receiptNumber,
        description: `Receipt ${receipt.receiptNumber} customer payment`,
        debit: amount,
        credit: 0,
        postingDate: new Date(),
        isReversal: false,
      },
      {
        businessId: receipt.businessId,
        accountId: accounts.receivable.id,
        invoiceId: receipt.allocations?.[0]?.salesInvoiceId ?? undefined,
        sourceId: receipt.id,
        sourceNumber: receipt.receiptNumber,
        createdByUserId: currentUser.sub,
        sourceType: LedgerEntrySourceType.SALES_RECEIPT,
        reference: receipt.receiptNumber,
        description: `Receipt ${receipt.receiptNumber} accounts receivable settlement`,
        debit: 0,
        credit: amount,
        postingDate: new Date(),
        isReversal: false,
      },
    ] as LedgerEntry[];
    return ledgerEntriesRepository.save(entries);
  }

  async postPurchaseInvoiceEntries(
    manager: EntityManager,
    invoice: PurchaseInvoice,
    currentUser: CurrentUserContext,
  ): Promise<LedgerEntry[]> {
    const accounts = await this.ensureSystemAccounts();
    const ledgerEntriesRepository = manager.getRepository(LedgerEntry);
    const total = Number(invoice.totalAmount ?? 0);
    const subtotal = Number(invoice.subtotal ?? 0);
    const discountTotal = Number(invoice.discountTotal ?? 0);
    const taxTotal = Number(invoice.taxTotal ?? 0);
    const inventoryNet = Math.max(subtotal - discountTotal, 0);

    const entries: LedgerEntry[] = [
      {
        businessId: invoice.businessId,
        accountId: accounts.inventory.id,
        sourceId: invoice.id,
        sourceNumber: invoice.purchaseInvoiceNumber,
        createdByUserId: currentUser.sub,
        sourceType: LedgerEntrySourceType.PURCHASE_INVOICE,
        reference: invoice.purchaseInvoiceNumber,
        description: `Purchase invoice ${invoice.purchaseInvoiceNumber} inventory`,
        debit: inventoryNet,
        credit: 0,
        postingDate: new Date(),
        isReversal: false,
      } as LedgerEntry,
      {
        businessId: invoice.businessId,
        accountId: accounts.inputTaxReceivable.id,
        sourceId: invoice.id,
        sourceNumber: invoice.purchaseInvoiceNumber,
        createdByUserId: currentUser.sub,
        sourceType: LedgerEntrySourceType.PURCHASE_INVOICE,
        reference: invoice.purchaseInvoiceNumber,
        description: `Purchase invoice ${invoice.purchaseInvoiceNumber} input tax`,
        debit: taxTotal,
        credit: 0,
        postingDate: new Date(),
        isReversal: false,
      } as LedgerEntry,
      {
        businessId: invoice.businessId,
        accountId: accounts.accountsPayable.id,
        sourceId: invoice.id,
        sourceNumber: invoice.purchaseInvoiceNumber,
        createdByUserId: currentUser.sub,
        sourceType: LedgerEntrySourceType.PURCHASE_INVOICE,
        reference: invoice.purchaseInvoiceNumber,
        description: `Purchase invoice ${invoice.purchaseInvoiceNumber} accounts payable`,
        debit: 0,
        credit: total,
        postingDate: new Date(),
        isReversal: false,
      } as LedgerEntry,
    ];
    return ledgerEntriesRepository.save(entries);
  }

  async postPaymentVoucherEntries(
    manager: EntityManager,
    voucher: PaymentVoucher,
    currentUser: CurrentUserContext,
  ): Promise<LedgerEntry[]> {
    const accounts = await this.ensureSystemAccounts();
    const ledgerEntriesRepository = manager.getRepository(LedgerEntry);
    const amount = Number(voucher.amount ?? 0);
    return ledgerEntriesRepository.save([
      {
        businessId: voucher.businessId,
        accountId: accounts.accountsPayable.id,
        sourceId: voucher.id,
        sourceNumber: voucher.voucherNumber,
        createdByUserId: currentUser.sub,
        sourceType: LedgerEntrySourceType.PAYMENT_VOUCHER,
        reference: voucher.voucherNumber,
        description: `Voucher ${voucher.voucherNumber} accounts payable settlement`,
        debit: amount,
        credit: 0,
        postingDate: new Date(),
        isReversal: false,
      } as LedgerEntry,
      {
        businessId: voucher.businessId,
        accountId: accounts.cash.id,
        sourceId: voucher.id,
        sourceNumber: voucher.voucherNumber,
        createdByUserId: currentUser.sub,
        sourceType: LedgerEntrySourceType.PAYMENT_VOUCHER,
        reference: voucher.voucherNumber,
        description: `Voucher ${voucher.voucherNumber} cash payment`,
        debit: 0,
        credit: amount,
        postingDate: new Date(),
        isReversal: false,
      } as LedgerEntry,
    ]);
  }

  async reverseInvoiceEntries(
    manager: EntityManager,
    invoice: SalesInvoice,
    currentUser: CurrentUserContext,
  ): Promise<LedgerEntry[]> {
    const existingEntries = await manager.getRepository(LedgerEntry).find({
      where: { invoiceId: invoice.id },
      relations: ['account'],
    });
    const ledgerEntriesRepository = manager.getRepository(LedgerEntry);
    if (!existingEntries.length) {
      return [];
    }

    const reversed = existingEntries.map((entry) =>
      ({
        businessId: entry.businessId,
        accountId: entry.accountId,
        invoiceId: invoice.id,
        createdByUserId: currentUser.sub,
        sourceType: LedgerEntrySourceType.INVOICE,
        reference: `${entry.reference ?? invoice.invoiceNumber}-REV`,
        description: `Reversal of ${entry.description ?? invoice.invoiceNumber}`,
        debit: Number(entry.credit ?? 0),
        credit: Number(entry.debit ?? 0),
      } as LedgerEntry),
    );

    return ledgerEntriesRepository.save(reversed as LedgerEntry[]);
  }

  async reverseEntriesBySource(
    manager: EntityManager,
    sourceId: string,
    reference: string,
    currentUser: CurrentUserContext,
    sourceType: LedgerEntrySourceType,
  ): Promise<LedgerEntry[]> {
    const existingEntries = await manager.getRepository(LedgerEntry).find({
      where: { sourceId },
      relations: ['account'],
    });
    if (!existingEntries.length) {
      return [];
    }
    const ledgerEntriesRepository = manager.getRepository(LedgerEntry);
    const reversed = existingEntries.map((entry) =>
      ({
        businessId: entry.businessId,
        accountId: entry.accountId,
        invoiceId: entry.invoiceId,
        sourceId,
        sourceNumber: reference,
        createdByUserId: currentUser.sub,
        sourceType,
        reference: `${entry.reference ?? reference}-REV`,
        description: `Reversal of ${entry.description ?? reference}`,
        debit: Number(entry.credit ?? 0),
        credit: Number(entry.debit ?? 0),
        postingDate: new Date(),
        isReversal: true,
        reversalOfEntryId: entry.id,
      } as LedgerEntry),
    );
    return ledgerEntriesRepository.save(reversed as LedgerEntry[]);
  }

  async getAccountByCode(code: string): Promise<LedgerAccount> {
    await this.ensureSystemAccounts();
    const account = await this.ledgerAccountsRepository.findOne({ where: { code } });
    if (!account) {
      throw new NotFoundException('Ledger account not found');
    }
    return account;
  }

  private requireBusinessId(currentUser: CurrentUserContext, explicitBusinessId?: string): string {
    const businessId = explicitBusinessId?.trim() || currentUser.businessId?.trim() || currentUser.business?.id?.trim() || '';
    if (!businessId) {
      throw new BadRequestException('Business context is required');
    }
    return businessId;
  }
}
