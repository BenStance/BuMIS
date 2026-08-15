import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { User } from './user.entity';
import { AuditLog } from './audit-log.entity';

@Entity({ name: 'NotificationReads' })
@Unique('UQ_NotificationReads_User_Notification', ['userId', 'notificationId'])
export class NotificationRead extends BaseUuidEntity {
  @Index()
  @Column({ name: 'UserId', type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ name: 'NotificationId', type: 'uuid' })
  notificationId!: string;

  @Column({ name: 'ReadAt', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  readAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'UserId' })
  user?: User;

  @ManyToOne(() => AuditLog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'NotificationId' })
  notification?: AuditLog;
}
