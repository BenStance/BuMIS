import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Permission } from './permission.entity';
import { Role } from './role.entity';

@Entity({ name: 'RolePermissions' })
@Unique('UQ_RolePermissions_RoleId_PermissionId', ['roleId', 'permissionId'])
export class RolePermission extends BaseUuidEntity {
  @Index()
  @Column({ name: 'RoleId', type: 'uniqueidentifier' })
  roleId!: string;

  @Index()
  @Column({ name: 'PermissionId', type: 'uniqueidentifier' })
  permissionId!: string;

  @ManyToOne(() => Role, (role) => role.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'RoleId' })
  role?: Role;

  @ManyToOne(() => Permission, (permission) => permission.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'PermissionId' })
  permission?: Permission;
}
