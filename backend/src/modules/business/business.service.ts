import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../../database/entities/business.entity';
import { BusinessSubscription } from '../../database/entities/business-subscription.entity';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { BusinessStatus } from '../../common/enums/domain.enums';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Business) private readonly businessesRepository: Repository<Business>,
    @InjectRepository(BusinessSubscription)
    private readonly businessSubscriptionsRepository: Repository<BusinessSubscription>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
  ) {}

  findAll(): Promise<Business[]> {
    return this.businessesRepository.find({ relations: ['activeSubscription'] });
  }

  async findOne(id: string): Promise<Business> {
    const business = await this.businessesRepository.findOne({
      where: { id },
      relations: ['activeSubscription', 'users', 'products', 'customers', 'vendors'],
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business;
  }

  create(dto: CreateBusinessDto): Promise<Business> {
    return this.businessesRepository.save(
      this.businessesRepository.create({ ...dto, status: BusinessStatus.ACTIVE } as any),
    ) as unknown as Promise<Business>;
  }

  async update(id: string, dto: UpdateBusinessDto): Promise<Business> {
    const business = await this.findOne(id);
    Object.assign(business, dto);
    return this.businessesRepository.save(business);
  }

  async profile(id: string): Promise<Record<string, unknown>> {
    const business = await this.findOne(id);
    const users = await this.usersRepository.count({ where: { businessId: id } });
    const subscriptions = await this.businessSubscriptionsRepository.count({ where: { businessId: id } });
    return {
      ...business,
      usersCount: users,
      subscriptionsCount: subscriptions,
    };
  }
}
