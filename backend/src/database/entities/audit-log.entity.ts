import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { User } from './user.entity';
import { AuditAction } from '../../common/enums/domain.enums';

@Entity({ name: 'AuditLogs' })
export class AuditLog extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uniqueidentifier', nullable: true })
  businessId?: string;

  @Index()
  @Column({ name: 'UserId', type: 'uniqueidentifier', nullable: true })
  userId?: string;

  @Column({ name: 'Action', type: 'nvarchar', length: 50 })
  action!: AuditAction | string;

  @Column({ name: 'EntityName', type: 'nvarchar', length: 100, nullable: true })
  entityName?: string;

  @Column({ name: 'EntityId', type: 'nvarchar', length: 100, nullable: true })
  entityId?: string;

  @Column({ name: 'IpAddress', type: 'nvarchar', length: 100, nullable: true })
  ipAddress?: string;

  @Column({ name: 'UserAgent', type: 'nvarchar', length: 500, nullable: true })
  userAgent?: string;

  @Column({ name: 'Metadata', type: 'nvarchar', length: 'max', nullable: true })
  metadata?: string;

  @ManyToOne(() => User, (user) => user.auditLogs, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'UserId' })
  user?: User;
}
