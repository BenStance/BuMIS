import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { User } from './user.entity';

@Entity({ name: 'RefreshTokens' })
export class RefreshToken extends BaseUuidEntity {
  @Index()
  @Column({ name: 'UserId', type: 'uuid' })
  userId!: string;

  @Index({ unique: true })
  @Column({ name: 'TokenHash', type: 'varchar', length: 255 })
  tokenHash!: string;

  @Column({ name: 'ExpiresAt', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'RevokedAt', type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ name: 'ReplacedByTokenId', type: 'uuid', nullable: true })
  replacedByTokenId?: string;

  @Column({ name: 'IpAddress', type: 'varchar', length: 100, nullable: true })
  ipAddress?: string;

  @Column({ name: 'UserAgent', type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'UserId' })
  user?: User;
}
