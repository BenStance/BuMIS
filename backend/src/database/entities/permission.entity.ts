import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { RolePermission } from './role-permission.entity';
import { UserPermission } from './user-permission.entity';

@Entity({ name: 'Permissions' })
export class Permission extends BaseUuidEntity {
  @Index({ unique: true })
  @Column({ name: 'Code', type: 'nvarchar', length: 100 })
  code!: string;

  @Column({ name: 'Name', type: 'nvarchar', length: 150 })
  name!: string;

  @Column({ name: 'Module', type: 'nvarchar', length: 100, nullable: true })
  module?: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 255, nullable: true })
  description?: string;

  @OneToMany(() => UserPermission, (permission) => permission.permission)
  userPermissions?: UserPermission[];

  @OneToMany(() => RolePermission, (permission) => permission.permission)
  rolePermissions?: RolePermission[];
}
