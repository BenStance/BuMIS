import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { User } from './user.entity';

@Entity({ name: 'RefreshTokens' })
export class RefreshToken extends BaseUuidEntity {
  @Index()
  @Column({ name: 'UserId', type: 'uniqueidentifier' })
  userId!: string;

  @Index({ unique: true })
  @Column({ name: 'TokenHash', type: 'nvarchar', length: 255 })
  tokenHash!: string;

  @Column({ name: 'ExpiresAt', type: 'datetime2' })
  expiresAt!: Date;

  @Column({ name: 'RevokedAt', type: 'datetime2', nullable: true })
  revokedAt?: Date;

  @Column({ name: 'ReplacedByTokenId', type: 'uniqueidentifier', nullable: true })
  replacedByTokenId?: string;

  @Column({ name: 'IpAddress', type: 'nvarchar', length: 100, nullable: true })
  ipAddress?: string;

  @Column({ name: 'UserAgent', type: 'nvarchar', length: 500, nullable: true })
  userAgent?: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'UserId' })
  user?: User;
}
