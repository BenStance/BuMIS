import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { User } from './user.entity';
import { OtpPurpose } from '../../common/enums/domain.enums';

@Entity({ name: 'EmailOtps' })
export class EmailOtp extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uniqueidentifier', nullable: true })
  businessId?: string;

  @Index()
  @Column({ name: 'UserId', type: 'uniqueidentifier', nullable: true })
  userId?: string;

  @Index()
  @Column({ name: 'Email', type: 'nvarchar', length: 150 })
  email!: string;

  @Column({ name: 'Purpose', type: 'nvarchar', length: 30 })
  purpose!: OtpPurpose;

  @Column({ name: 'OtpHash', type: 'nvarchar', length: 255 })
  otpHash!: string;

  @Column({ name: 'ExpiresAt', type: 'datetime2' })
  expiresAt!: Date;

  @Column({ name: 'UsedAt', type: 'datetime2', nullable: true })
  usedAt?: Date;

  @Column({ name: 'Attempts', type: 'int', default: 0 })
  attempts!: number;

  @ManyToOne(() => User, (user) => user.emailOtps, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'UserId' })
  user?: User;
}
