import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { User } from './user.entity';
import { AuditAction } from '../../common/enums/domain.enums';

@Entity({ name: 'AuditLogs' })
export class AuditLog extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uuid', nullable: true })
  businessId?: string;

  @Index()
  @Column({ name: 'UserId', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'Action', type: 'varchar', length: 50 })
  action!: AuditAction | string;

  @Column({ name: 'EntityName', type: 'varchar', length: 100, nullable: true })
  entityName?: string;

  @Column({ name: 'EntityId', type: 'varchar', length: 100, nullable: true })
  entityId?: string;

  @Column({ name: 'IpAddress', type: 'varchar', length: 100, nullable: true })
  ipAddress?: string;

  @Column({ name: 'UserAgent', type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @Column({ name: 'Metadata', type: 'text', nullable: true })
  metadata?: string;

  @ManyToOne(() => User, (user) => user.auditLogs, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'UserId' })
  user?: User;
}
