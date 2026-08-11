import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../database/entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission) private readonly permissionsRepository: Repository<Permission>,
  ) {}

  findAll(): Promise<Permission[]> {
    return this.permissionsRepository.find({ order: { module: 'ASC', code: 'ASC' } });
  }

  async findOne(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({ where: { id } });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    return permission;
  }

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionsRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException('Permission code already exists');
    }
    return this.permissionsRepository.save(this.permissionsRepository.create(dto));
  }

  async update(id: string, dto: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.findOne(id);
    Object.assign(permission, dto);
    return this.permissionsRepository.save(permission);
  }

  async remove(id: string): Promise<Record<string, string>> {
    await this.permissionsRepository.delete(id);
    return { message: 'Permission deleted' };
  }
}
