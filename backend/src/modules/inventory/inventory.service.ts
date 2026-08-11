import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { InventoryTransaction } from '../../database/entities/inventory-transaction.entity';
import { Product } from '../../database/entities/product.entity';
import { Vendor } from '../../database/entities/vendor.entity';
import { InventoryTransactionType, RecordStatus } from '../../common/enums/domain.enums';
import { StockInDto } from './dto/stock-in.dto';
import { StockOutDto } from './dto/stock-out.dto';
import { StockAdjustmentDto, StockAdjustmentDirection } from './dto/stock-adjustment.dto';

type CurrentUserContext = {
  sub?: string;
  businessId?: string | null;
  business?: { id?: string | null } | null;
};

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryTransaction)
    private readonly inventoryTransactionsRepository: Repository<InventoryTransaction>,
    @InjectRepository(Product) private readonly productsRepository: Repository<Product>,
    @InjectRepository(Vendor) private readonly vendorsRepository: Repository<Vendor>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser, filters.businessId as string | undefined);
    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 20), 1), 100);
    const productId = String(filters.productId ?? '').trim();
    const transactionType = String(filters.transactionType ?? '').trim();
    const referenceNumber = String(filters.referenceNumber ?? '').trim();
    const search = String(filters.search ?? '').trim();

    const query = this.inventoryTransactionsRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.product', 'product')
      .leftJoinAndSelect('transaction.vendor', 'vendor')
      .leftJoinAndSelect('transaction.createdBy', 'createdBy')
      .where('transaction.businessId = :businessId', { businessId });

    if (productId) {
      query.andWhere('transaction.productId = :productId', { productId });
    }
    if (transactionType) {
      query.andWhere('transaction.transactionType = :transactionType', { transactionType });
    }
    if (referenceNumber) {
      query.andWhere('transaction.reference LIKE :referenceNumber', { referenceNumber: `%${referenceNumber}%` });
    }
    if (search) {
      query.andWhere(
        '(transaction.transactionNumber LIKE :search OR product.productName LIKE :search OR product.sku LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await query.orderBy('transaction.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { items, page, limit, total };
  }

  async stockIn(dto: StockInDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const businessId = this.requireBusinessId(currentUser);
      const productsRepository = manager.getRepository(Product);
      const transactionsRepository = manager.getRepository(InventoryTransaction);
      const product = await productsRepository.findOne({ where: { id: dto.productId } });
      if (!product || product.businessId !== businessId) {
        throw new NotFoundException('Product not found');
      }
      if (product.status !== RecordStatus.ACTIVE) {
        throw new BadRequestException('Product is inactive');
      }

      if (dto.vendorId) {
        const vendor = await this.vendorsRepository.findOne({ where: { id: dto.vendorId } });
        if (!vendor || vendor.businessId !== businessId) {
          throw new BadRequestException('Vendor not found');
        }
      }

      const previousStock = Number(product.currentStock ?? 0);
      const quantity = Number(dto.quantity);
      const newStock = previousStock + quantity;
      product.currentStock = newStock;
      product.lastStockMovementAt = dto.stockInDate ? new Date(dto.stockInDate) : new Date();
      await productsRepository.save(product);

      const transaction = await transactionsRepository.save(
        transactionsRepository.create({
          businessId,
          transactionNumber: this.generateTransactionNumber(),
          productId: product.id,
          vendorId: dto.vendorId,
          transactionType: InventoryTransactionType.STOCK_IN,
          quantity,
          previousStock,
          newStock,
          unitCost: dto.unitCost,
          reference: dto.referenceNumber,
          reason: 'Stock in',
          notes: dto.remarks,
          createdByUserId: currentUser.sub ?? undefined,
        } as any),
      );

      return { transaction, product };
    });
  }

  async stockOut(dto: StockOutDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const businessId = this.requireBusinessId(currentUser);
      const productsRepository = manager.getRepository(Product);
      const transactionsRepository = manager.getRepository(InventoryTransaction);
      const product = await productsRepository.findOne({ where: { id: dto.productId } });
      if (!product || product.businessId !== businessId) {
        throw new NotFoundException('Product not found');
      }
      if (product.status !== RecordStatus.ACTIVE) {
        throw new BadRequestException('Product is inactive');
      }
      const previousStock = Number(product.currentStock ?? 0);
      const quantity = Number(dto.quantity);
      if (quantity > previousStock) {
        throw new BadRequestException('Quantity cannot exceed available stock');
      }

      const newStock = previousStock - quantity;
      product.currentStock = newStock;
      product.lastStockMovementAt = new Date();
      await productsRepository.save(product);

      const transaction = await transactionsRepository.save(
        transactionsRepository.create({
          businessId,
          transactionNumber: this.generateTransactionNumber(),
          productId: product.id,
          transactionType: InventoryTransactionType.STOCK_OUT,
          quantity,
          previousStock,
          newStock,
          reference: dto.referenceNumber,
          reason: dto.reason,
          notes: dto.remarks,
          createdByUserId: currentUser.sub ?? undefined,
        } as any),
      );

      return { transaction, product };
    });
  }

  async adjustment(dto: StockAdjustmentDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const businessId = this.requireBusinessId(currentUser);
      const productsRepository = manager.getRepository(Product);
      const transactionsRepository = manager.getRepository(InventoryTransaction);
      const product = await productsRepository.findOne({ where: { id: dto.productId } });
      if (!product || product.businessId !== businessId) {
        throw new NotFoundException('Product not found');
      }
      if (product.status !== RecordStatus.ACTIVE) {
        throw new BadRequestException('Product is inactive');
      }

      const previousStock = Number(product.currentStock ?? 0);
      const quantity = Number(dto.quantity);
      const newStock =
        dto.adjustmentType === StockAdjustmentDirection.INCREASE ? previousStock + quantity : previousStock - quantity;
      if (newStock < 0) {
        throw new BadRequestException('Adjustment cannot reduce stock below zero');
      }

      product.currentStock = newStock;
      product.lastStockMovementAt = new Date();
      await productsRepository.save(product);

      const transaction = await transactionsRepository.save(
        transactionsRepository.create({
          businessId,
          transactionNumber: this.generateTransactionNumber(),
          productId: product.id,
          transactionType: InventoryTransactionType.ADJUSTMENT,
          quantity,
          previousStock,
          newStock,
          reference: dto.referenceNumber,
          reason: dto.reason,
          notes: dto.remarks,
          createdByUserId: dto.approvedByUserId ?? currentUser.sub ?? undefined,
        } as any),
      );

      return { transaction, product };
    });
  }

  async productStock(productId: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const product = await this.productsRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    this.assertBusinessAccess(product.businessId, currentUser);

    const lastTransaction = await this.inventoryTransactionsRepository.findOne({
      where: { productId },
      order: { createdAt: 'DESC' },
      relations: ['createdBy'],
    });

    return {
      productId: product.id,
      productName: product.productName,
      currentStock: product.currentStock,
      availableStock: product.currentStock,
      minimumStock: product.minimumStock,
      lastUpdatedAt: product.lastStockMovementAt ?? product.updatedAt,
      lastTransaction,
      lowStock: Number(product.currentStock) <= Number(product.minimumStock),
    };
  }

  async lowStock(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser, filters.businessId as string | undefined);
    const products = await this.productsRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
    return {
      items: products
        .filter((product) => Number(product.currentStock) <= Number(product.minimumStock))
        .map((product) => ({
          id: product.id,
          productName: product.productName,
          sku: product.sku,
          currentStock: product.currentStock,
          minimumStock: product.minimumStock,
          lastStockMovementAt: product.lastStockMovementAt ?? product.updatedAt,
        })),
    };
  }

  private generateTransactionNumber(): string {
    return `INV-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
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
