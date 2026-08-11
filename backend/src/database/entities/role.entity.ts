import { Column, Entity, OneToMany, Index } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { User } from './user.entity';
import { RolePermission } from './role-permission.entity';

@Entity({ name: 'Roles' })
export class Role extends BaseUuidEntity {
  @Index({ unique: true })
  @Column({ name: 'Name', type: 'nvarchar', length: 100 })
  name!: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 255, nullable: true })
  description?: string;

  @OneToMany(() => User, (user) => user.role)
  users?: User[];

  @OneToMany(() => RolePermission, (permission) => permission.role)
  permissions?: RolePermission[];
}
