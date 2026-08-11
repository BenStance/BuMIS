import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../../database/entities/vendor.entity';
import { RecordStatus } from '../../common/enums/domain.enums';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

type CurrentUserContext = {
  businessId?: string | null;
  business?: { id?: string | null } | null;
};

@Injectable()
export class VendorsService {
  constructor(@InjectRepository(Vendor) private readonly vendorsRepository: Repository<Vendor>) {}

  async findAll(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessId = this.requireBusinessId(currentUser, filters.businessId as string | undefined);
    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 20), 1), 100);
    const search = String(filters.search ?? '').trim();
    const status = String(filters.status ?? '').trim() as RecordStatus | '';

    const query = this.vendorsRepository
      .createQueryBuilder('vendor')
      .where('vendor.businessId = :businessId', { businessId });

    if (search) {
      query.andWhere(
        '(vendor.name LIKE :search OR vendor.contactPerson LIKE :search OR vendor.phone LIKE :search OR vendor.email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      query.andWhere('vendor.status = :status', { status });
    }

    const [items, total] = await query.orderBy('vendor.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { items, page, limit, total };
  }

  async findOne(id: string, currentUser: CurrentUserContext): Promise<Vendor> {
    const vendor = await this.vendorsRepository.findOne({ where: { id } });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    this.assertBusinessAccess(vendor.businessId, currentUser);
    return vendor;
  }

  async create(dto: CreateVendorDto, currentUser: CurrentUserContext): Promise<Vendor> {
    const businessId = this.requireBusinessId(currentUser);
    if (dto.phone) {
      await this.ensurePhoneUnique(businessId, dto.phone);
    }
    return (await this.vendorsRepository.save(
      this.vendorsRepository.create({
        businessId,
        ...dto,
        status: RecordStatus.ACTIVE,
      } as any),
    )) as unknown as Vendor;
  }

  async update(id: string, dto: UpdateVendorDto, currentUser: CurrentUserContext): Promise<Vendor> {
    const vendor = await this.findOne(id, currentUser);
    if (dto.phone && dto.phone !== vendor.phone) {
      await this.ensurePhoneUnique(vendor.businessId, dto.phone, vendor.id);
    }
    Object.assign(vendor, dto);
    return (await this.vendorsRepository.save(vendor)) as unknown as Vendor;
  }

  async remove(id: string, currentUser: CurrentUserContext): Promise<Record<string, string>> {
    const vendor = await this.findOne(id, currentUser);
    vendor.status = RecordStatus.INACTIVE;
    await this.vendorsRepository.save(vendor);
    return { message: 'Vendor archived successfully' };
  }

  async profile(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const vendor = await this.findOne(id, currentUser);
    return {
      ...vendor,
      registrationDate: vendor.createdAt,
      purchaseHistory: [],
      totalPurchases: 0,
    };
  }

  private async ensurePhoneUnique(businessId: string, phone: string, ignoreVendorId?: string): Promise<void> {
    const duplicate = await this.vendorsRepository.findOne({
      where: { businessId, phone },
    });
    if (duplicate && duplicate.id !== ignoreVendorId) {
      throw new BadRequestException('Vendor phone already exists');
    }
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
