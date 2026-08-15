import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';
import { Permission } from '../../database/entities/permission.entity';
import { UserPermission } from '../../database/entities/user-permission.entity';
import { MailerService } from '../../common/services/mailer.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserStatus } from '../../common/enums/domain.enums';

type CurrentUserContext = {
  sub?: string;
  businessId?: string | null;
  business?: { id?: string | null } | null;
  role?: { id?: string | null; name?: string | null } | null;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(UserPermission) private readonly userPermissionsRepository: Repository<UserPermission>,
    private readonly mailerService: MailerService,
  ) {}

  async findAll(currentUser: CurrentUserContext, businessId?: string): Promise<User[]> {
    const scopedBusinessId = this.resolveBusinessScope(currentUser, businessId);
    if (!this.isPlatformAdmin(currentUser)) {
      if (!scopedBusinessId) {
        throw new ForbiddenException('Business context is required');
      }
      return this.usersRepository.find({
        where: { businessId: scopedBusinessId },
        relations: ['role', 'business'],
        order: { createdAt: 'DESC' },
      });
    }

    return this.usersRepository.find({
      where: scopedBusinessId ? { businessId: scopedBusinessId } : {},
      relations: ['role', 'business'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, currentUser: CurrentUserContext): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role', 'business', 'permissions', 'permissions.permission'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    this.assertUserAccess(user, currentUser);
    return user;
  }

  async create(dto: CreateUserDto, currentUser: CurrentUserContext): Promise<User> {
    const role = await this.resolveRoleForCreate(dto.roleId, currentUser);
    if (!role) {
      throw new BadRequestException('Role not found');
    }
    this.assertRoleAssignableByCurrentUser(currentUser, role);
    const existing = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('Email already exists');
    }
    const businessId = this.resolveCreateBusinessId(currentUser, dto.businessId);
    const user = (await this.usersRepository.save(
      this.usersRepository.create({
        businessId,
        roleId: dto.roleId,
        fullName: dto.fullName,
        email: dto.email,
        status: UserStatus.ACTIVE,
        passwordHash: dto.password ? await bcrypt.hash(dto.password, 12) : undefined,
      } as any),
    )) as unknown as User;

    await this.mailerService.sendAccountCreated(user.email, { name: user.fullName, roleName: role.name });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, currentUser: CurrentUserContext): Promise<User> {
    const user = await this.findOne(id, currentUser);
    if (dto.roleId) {
      const role = await this.rolesRepository.findOne({ where: { id: dto.roleId } });
      if (!role) {
        throw new BadRequestException('Role not found');
      }
      this.assertRoleAssignableByCurrentUser(currentUser, role);
    }
    Object.assign(user, dto);
    if (!this.isPlatformAdmin(currentUser) && currentUser.businessId) {
      user.businessId = currentUser.businessId;
    }
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 12);
    }
    return (await this.usersRepository.save(user)) as unknown as User;
  }

  async remove(id: string, currentUser: CurrentUserContext): Promise<Record<string, string>> {
    await this.findOne(id, currentUser);
    await this.usersRepository.delete(id);
    await this.userPermissionsRepository.delete({ userId: id });
    return { message: 'User deleted' };
  }

  async activate(id: string, currentUser: CurrentUserContext): Promise<User> {
    const user = await this.findOne(id, currentUser);
    user.status = UserStatus.ACTIVE;
    return (await this.usersRepository.save(user)) as unknown as User;
  }

  async deactivate(id: string, currentUser: CurrentUserContext): Promise<User> {
    const user = await this.findOne(id, currentUser);
    user.status = UserStatus.INACTIVE;
    return (await this.usersRepository.save(user)) as unknown as User;
  }

  async assignRole(id: string, roleId: string, currentUser: CurrentUserContext): Promise<User> {
    const role = await this.rolesRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new BadRequestException('Role not found');
    }
    this.assertRoleAssignableByCurrentUser(currentUser, role);
    const user = await this.findOne(id, currentUser);
    user.roleId = roleId;
    return this.usersRepository.save(user);
  }

  async assignPermissions(id: string, permissionIds: string[], currentUser: CurrentUserContext): Promise<Record<string, string>> {
    await this.findOne(id, currentUser);
    const permissions = await this.permissionsRepository.find({ where: { id: In(permissionIds) } });
    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permissions do not exist');
    }
    await this.userPermissionsRepository.delete({ userId: id });
    await this.userPermissionsRepository.save(
      permissionIds.map((permissionId) =>
        this.userPermissionsRepository.create({ userId: id, permissionId }),
      ),
    );
    return { message: 'Permissions assigned to user' };
  }

  async profile(id: string, currentUser: CurrentUserContext): Promise<Record<string, unknown>> {
    const user = await this.findOne(id, currentUser);
    return {
      ...user,
      permissions: user.permissions?.map((permission) => permission.permission?.code).filter(Boolean),
    };
  }

  private isPlatformAdmin(currentUser: CurrentUserContext): boolean {
    return this.isRoleName(currentUser?.role?.name, [
      'platform administrator',
      'platform admin',
      'platform-admin',
      'admin',
      'administrator',
    ]);
  }

  private isBusinessOwnerRole(role: Role | null | undefined): boolean {
    return this.isRoleName(role?.name, ['business owner', 'owner']);
  }

  private isStaffRole(role: Role | null | undefined): boolean {
    return this.isRoleName(role?.name, ['staff', 'staff user']);
  }

  private async resolveRoleForCreate(roleId: string | undefined, currentUser: CurrentUserContext): Promise<Role> {
    if (roleId) {
      const role = await this.rolesRepository.findOne({ where: { id: roleId } });
      if (!role) {
        throw new BadRequestException('Role not found');
      }
      return role;
    }

    if (this.isPlatformAdmin(currentUser)) {
      throw new BadRequestException('Role is required');
    }

    const staffRole = await this.rolesRepository.findOne({
      where: [
        { name: 'Staff' },
        { name: 'Staff User' },
      ],
    });
    if (!staffRole) {
      throw new BadRequestException('Staff role is not ready yet');
    }
    return staffRole;
  }

  private isRoleName(value: string | null | undefined, aliases: string[]): boolean {
    const normalized = String(value ?? '').trim().toLowerCase();
    return aliases.includes(normalized);
  }

  private assertRoleAssignableByCurrentUser(
    currentUser: CurrentUserContext,
    role: Role,
  ): void {
    if (this.isPlatformAdmin(currentUser)) {
      return;
    }

    if (!this.isBusinessOwnerRole(currentUser?.role as Role | null | undefined)) {
      throw new ForbiddenException('You are not allowed to manage user roles');
    }

    if (!this.isStaffRole(role)) {
      throw new ForbiddenException('Business owners can only create or assign staff users');
    }
  }

  private resolveBusinessScope(currentUser: CurrentUserContext, requestedBusinessId?: string): string | undefined {
    if (this.isPlatformAdmin(currentUser)) {
      return requestedBusinessId?.trim() || undefined;
    }
    return currentUser.businessId?.trim() || currentUser.business?.id?.trim() || undefined;
  }

  private resolveCreateBusinessId(currentUser: CurrentUserContext, requestedBusinessId?: string): string {
    const scopedBusinessId = this.resolveBusinessScope(currentUser, requestedBusinessId);
    if (!scopedBusinessId) {
      throw new BadRequestException('Business context is required');
    }
    return scopedBusinessId;
  }

  private assertUserAccess(record: User, currentUser: CurrentUserContext): void {
    if (this.isPlatformAdmin(currentUser)) {
      return;
    }

    const scope = this.resolveBusinessScope(currentUser);
    if (!scope) {
      throw new ForbiddenException('Business context is required');
    }

    if (scope !== record.businessId) {
      throw new ForbiddenException('You cannot manage users from another business');
    }
  }
}
