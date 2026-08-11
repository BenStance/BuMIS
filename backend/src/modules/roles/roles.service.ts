import { BadRequestException, Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../../database/entities/role.entity';
import { Permission } from '../../database/entities/permission.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { User } from '../../database/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(RolePermission) private readonly rolePermissionsRepository: Repository<RolePermission>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    void this.seedDefaultRoles().catch((error: unknown) =>
      this.logger.error('Background role seed failed', error instanceof Error ? error.stack : String(error)),
    );
  }

  async seedDefaultRoles(): Promise<void> {
    const roleNames = ['Platform Administrator', 'Business Owner', 'Staff User'];
    for (const name of roleNames) {
      const existing = await this.rolesRepository.findOne({ where: { name } });
      if (!existing) {
        await this.rolesRepository.save(this.rolesRepository.create({ name, description: `${name} role` }));
      }
    }
  }

  async findAll(): Promise<Array<Role & { assignedUsers: number; assignedPermissions: number }>> {
    const roles = await this.rolesRepository.find({ relations: ['users', 'permissions'] });
    return roles.map((role) => ({
      ...role,
      assignedUsers: role.users?.length ?? 0,
      assignedPermissions: role.permissions?.length ?? 0,
    }));
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({ where: { id }, relations: ['permissions', 'users'] });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.rolesRepository.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException('Role already exists');
    }
    return this.rolesRepository.save(this.rolesRepository.create(dto));
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);
    Object.assign(role, dto);
    return this.rolesRepository.save(role);
  }

  async remove(id: string): Promise<Record<string, string>> {
    const users = await this.usersRepository.count({ where: { roleId: id } });
    if (users > 0) {
      throw new BadRequestException('Role is assigned to users');
    }
    await this.rolesRepository.delete(id);
    await this.rolePermissionsRepository.delete({ roleId: id });
    return { message: 'Role deleted' };
  }

  async assignPermissions(roleId: string, permissionIds: string[]): Promise<Record<string, unknown>> {
    await this.findOne(roleId);
    const permissions = await this.permissionsRepository.find({ where: { id: In(permissionIds) } });
    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permissions do not exist');
    }

    await this.rolePermissionsRepository.delete({ roleId });
    await this.rolePermissionsRepository.save(
      permissionIds.map((permissionId) =>
        this.rolePermissionsRepository.create({ roleId, permissionId }),
      ),
    );
    return { message: 'Permissions assigned to role' };
  }
}
