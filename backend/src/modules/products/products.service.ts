import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Product } from '../../database/entities/product.entity';
import { ProductCategory } from '../../database/entities/product-category.entity';
import { InventoryTransaction } from '../../database/entities/inventory-transaction.entity';
import { RecordStatus, InventoryTransactionType } from '../../common/enums/domain.enums';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

type CurrentUserContext = {
  sub?: string;
  businessId?: string | null;
  business?: { id?: string | null } | null;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductCategory) private readonly categoriesRepository: Repository<ProductCategory>,
    @InjectRepository(InventoryTransaction)
    private readonly inventoryTransactionsRepository: Repository<InventoryTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser, filters.businessId as string | undefined);
    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 20), 1), 100);
    const search = String(filters.search ?? '').trim();
    const status = String(filters.status ?? '').trim() as RecordStatus | '';
    const categoryId = String(filters.categoryId ?? '').trim();
    const lowStock = String(filters.lowStock ?? '').trim() === 'true';

    const query = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.businessId = :businessId', { businessId });

    if (search) {
      query.andWhere(
        `(
          product.productName LIKE :search OR
          product.sku LIKE :search OR
          product.barcode LIKE :search
        )`,
        { search: `%${search}%` },
      );
    }

    if (status) {
      query.andWhere('product.status = :status', { status });
    }

    if (categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (lowStock) {
      query.andWhere('product.currentStock <= product.minimumStock');
    }

    const [items, total] = await query.orderBy('product.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();

    return {
      items: items.map((product) => this.enrichProduct(product)),
      page,
      limit,
      total,
    };
  }

  async findOne(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const product = await this.productsRepository.findOne({ where: { id }, relations: ['category', 'business'] });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    this.assertBusinessAccess(product.businessId, currentUser);
    return this.enrichProduct(product);
  }

  async create(dto: CreateProductDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    if (dto.sellingPrice <= 0) {
      throw new BadRequestException('Selling price must be greater than zero');
    }
    if (dto.buyingPrice > dto.sellingPrice) {
      throw new BadRequestException('Buying price cannot exceed selling price');
    }
    if (dto.initialStockQuantity < 0) {
      throw new BadRequestException('Initial stock quantity cannot be negative');
    }

    const duplicate = await this.productsRepository.findOne({ where: { businessId, sku: dto.sku } });
    if (duplicate) {
      throw new BadRequestException('Product SKU already exists');
    }

    if (dto.categoryId) {
      await this.assertCategory(dto.categoryId, businessId);
    }

    return this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);
      const transactionRepository = manager.getRepository(InventoryTransaction);
      const product = (await productRepository.save(
        productRepository.create({
          businessId,
          categoryId: dto.categoryId,
          productName: dto.productName,
          sku: dto.sku,
          barcode: dto.barcode,
          unit: dto.unit,
          description: dto.description,
          buyingPrice: dto.buyingPrice,
          sellingPrice: dto.sellingPrice,
          currentStock: dto.initialStockQuantity,
          minimumStock: dto.minimumStock,
          imageUrl: dto.imageUrl,
          status: RecordStatus.ACTIVE,
          lastStockMovementAt: dto.initialStockQuantity > 0 ? new Date() : undefined,
        } as any),
      )) as unknown as Product;

      if (dto.initialStockQuantity > 0) {
        await transactionRepository.save(
          transactionRepository.create({
            businessId,
            transactionNumber: this.generateTransactionNumber(),
            productId: product.id,
            transactionType: InventoryTransactionType.STOCK_IN,
            quantity: dto.initialStockQuantity,
            previousStock: 0,
            newStock: dto.initialStockQuantity,
            unitCost: dto.buyingPrice,
            reference: 'Initial stock',
            reason: 'Product creation',
            createdByUserId: currentUser.sub ?? undefined,
          } as any),
        );
      }

      return this.enrichProduct(product);
    });
  }

  async update(id: string, dto: UpdateProductDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const product = await this.productsRepository.findOne({ where: { id }, relations: ['category'] });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    this.assertBusinessAccess(product.businessId, currentUser);

    if (dto.sku && dto.sku !== product.sku) {
      const duplicate = await this.productsRepository.findOne({ where: { businessId: product.businessId, sku: dto.sku } });
      if (duplicate) {
        throw new BadRequestException('Product SKU already exists');
      }
    }

    if (dto.categoryId) {
      await this.assertCategory(dto.categoryId, product.businessId);
    }

    if (dto.buyingPrice !== undefined && dto.sellingPrice !== undefined && dto.buyingPrice > dto.sellingPrice) {
      throw new BadRequestException('Buying price cannot exceed selling price');
    }

    if (dto.sellingPrice !== undefined && dto.sellingPrice <= 0) {
      throw new BadRequestException('Selling price must be greater than zero');
    }

    if (dto.buyingPrice !== undefined && dto.sellingPrice === undefined && dto.buyingPrice > product.sellingPrice) {
      throw new BadRequestException('Buying price cannot exceed selling price');
    }

    Object.assign(product, dto);
    const saved = (await this.productsRepository.save(product)) as unknown as Product;
    return this.enrichProduct(saved);
  }

  async remove(id: string, currentUser: CurrentUserContext): Promise<Record<string, string>> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    this.assertBusinessAccess(product.businessId, currentUser);

    product.status = RecordStatus.INACTIVE;
    await this.productsRepository.save(product);
    return { message: 'Product archived successfully' };
  }

  async lowStock(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser, filters.businessId as string | undefined);
    const items = await this.productsRepository.find({
      where: { businessId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
    return {
      items: items
        .filter((product) => Number(product.currentStock) <= Number(product.minimumStock))
        .map((product) => this.enrichProduct(product)),
    };
  }

  async history(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    this.assertBusinessAccess(product.businessId, currentUser);

    const transactions = await this.inventoryTransactionsRepository.find({
      where: { productId: id },
      relations: ['createdBy', 'vendor'],
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      product: this.enrichProduct(product),
      transactions,
    };
  }

  private async assertCategory(categoryId: string, businessId: string): Promise<void> {
    const category = await this.categoriesRepository.findOne({ where: { id: categoryId, businessId } });
    if (!category || category.deletedAt) {
      throw new BadRequestException('Category not found');
    }
    if (category.status !== RecordStatus.ACTIVE) {
      throw new BadRequestException('Category is inactive');
    }
  }

  private enrichProduct(product: Product): Record<string, unknown> {
    const profitMargin = Number(product.sellingPrice) - Number(product.buyingPrice);
    const isLowStock = Number(product.currentStock) <= Number(product.minimumStock);
    return {
      id: product.id,
      businessId: product.businessId,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      productName: product.productName,
      sku: product.sku,
      barcode: product.barcode,
      unit: product.unit,
      description: product.description,
      buyingPrice: product.buyingPrice,
      sellingPrice: product.sellingPrice,
      profitMargin,
      currentStock: product.currentStock,
      availableStock: product.currentStock,
      minimumStock: product.minimumStock,
      imageUrl: product.imageUrl,
      status: product.status,
      stockStatus: product.status === RecordStatus.ACTIVE && Number(product.currentStock) > 0 ? (isLowStock ? 'low_stock' : 'in_stock') : 'inactive',
      lastStockMovementAt: product.lastStockMovementAt ?? product.updatedAt,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private generateTransactionNumber(): string {
    return `IT-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
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
