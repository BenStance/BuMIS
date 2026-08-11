import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { ProductCategory } from '../../database/entities/product-category.entity';
import { Product } from '../../database/entities/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RecordStatus } from '../../common/enums/domain.enums';

type CurrentUserContext = {
  businessId?: string | null;
  business?: { id?: string | null } | null;
};

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(ProductCategory)
    private readonly categoriesRepository: Repository<ProductCategory>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async findAll(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.resolveBusinessId(currentUser, filters.businessId as string | undefined);
    if (!businessId) {
      throw new BadRequestException('Business context is required');
    }

    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 20), 1), 100);
    const search = String(filters.search ?? '').trim();
    const status = String(filters.status ?? '').trim() as RecordStatus | '';

    const query = this.categoriesRepository
      .createQueryBuilder('category')
      .where('category.businessId = :businessId', { businessId })
      .andWhere('category.deletedAt IS NULL');

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('category.name LIKE :search', { search: `%${search}%` }).orWhere(
            'category.code LIKE :search',
            { search: `%${search}%` },
          );
        }),
      );
    }

    if (status) {
      query.andWhere('category.status = :status', { status });
    }

    const [items, total] = await query.orderBy('category.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();

    return {
      items: await Promise.all(items.map((category) => this.enrichCategory(category))),
      page,
      limit,
      total,
    };
  }

  async findOne(id: string, currentUser?: CurrentUserContext): Promise<Record<string, unknown>> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['business'],
    });
    if (!category || category.deletedAt) {
      throw new NotFoundException('Category not found');
    }
    this.assertBusinessAccess(category.businessId, currentUser);
    return this.enrichCategory(category);
  }

  async create(dto: CreateCategoryDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser);
    const existing = await this.categoriesRepository.findOne({
      where: { businessId, name: dto.name, deletedAt: null as any },
    });
    if (existing) {
      throw new BadRequestException('Category name already exists');
    }

    const category = (await this.categoriesRepository.save(
      this.categoriesRepository.create({
        businessId,
        ...dto,
        status: RecordStatus.ACTIVE,
      } as any),
    )) as unknown as ProductCategory;

    return this.enrichCategory(category);
  }

  async update(id: string, dto: UpdateCategoryDto, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category || category.deletedAt) {
      throw new NotFoundException('Category not found');
    }
    this.assertBusinessAccess(category.businessId, currentUser);

    if (dto.name && dto.name !== category.name) {
      const duplicate = await this.categoriesRepository.findOne({
        where: { businessId: category.businessId, name: dto.name, deletedAt: null as any },
      });
      if (duplicate) {
        throw new BadRequestException('Category name already exists');
      }
    }

    Object.assign(category, dto);
    const saved = (await this.categoriesRepository.save(category)) as unknown as ProductCategory;
    return this.enrichCategory(saved);
  }

  async remove(id: string, currentUser: CurrentUserContext): Promise<Record<string, string>> {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category || category.deletedAt) {
      throw new NotFoundException('Category not found');
    }
    this.assertBusinessAccess(category.businessId, currentUser);

    const activeProducts = await this.productsRepository.count({
      where: {
        categoryId: id,
        status: RecordStatus.ACTIVE,
      },
    });
    if (activeProducts > 0) {
      throw new BadRequestException('Category cannot be deleted while active products are assigned');
    }

    category.status = RecordStatus.INACTIVE;
    category.deletedAt = new Date();
    await this.categoriesRepository.save(category);
    return { message: 'Category archived successfully' };
  }

  private async enrichCategory(category: ProductCategory): Promise<Record<string, unknown>> {
    const productCount = await this.productsRepository.count({ where: { categoryId: category.id } });
    return {
      id: category.id,
      businessId: category.businessId,
      code: category.code,
      name: category.name,
      description: category.description,
      status: category.status,
      productCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: category.deletedAt ?? null,
    };
  }

  private resolveBusinessId(currentUser: CurrentUserContext, explicitBusinessId?: string): string | undefined {
    return explicitBusinessId ?? currentUser.businessId ?? currentUser.business?.id ?? undefined;
  }

  private requireBusinessId(currentUser: CurrentUserContext): string {
    const businessId = this.resolveBusinessId(currentUser);
    if (!businessId) {
      throw new BadRequestException('Business context is required');
    }
    return businessId;
  }

  private assertBusinessAccess(categoryBusinessId: string, currentUser?: CurrentUserContext): void {
    const businessId = this.resolveBusinessId(currentUser ?? {});
    if (businessId && businessId !== categoryBusinessId) {
      throw new BadRequestException('You cannot access records from another business');
    }
  }
}
