import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Permission } from './permission.entity';
import { User } from './user.entity';

@Entity({ name: 'UserPermissions' })
@Unique('UQ_UserPermissions_UserId_PermissionId', ['userId', 'permissionId'])
export class UserPermission extends BaseUuidEntity {
  @Index()
  @Column({ name: 'UserId', type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ name: 'PermissionId', type: 'uuid' })
  permissionId!: string;

  @Column({ name: 'GrantedByUserId', type: 'uuid', nullable: true })
  grantedByUserId?: string;

  @Column({ name: 'GrantedAt', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  grantedAt!: Date;

  @ManyToOne(() => User, (user) => user.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'UserId' })
  user?: User;

  @ManyToOne(() => Permission, (permission) => permission.userPermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'PermissionId' })
  permission?: Permission;
}
