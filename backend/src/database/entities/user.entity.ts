import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Business } from './business.entity';
import { Role } from './role.entity';
import { UserStatus } from '../../common/enums/domain.enums';
import { RefreshToken } from './refresh-token.entity';
import { AuditLog } from './audit-log.entity';
import { SalesInvoice } from './sales-invoice.entity';
import { InventoryTransaction } from './inventory-transaction.entity';
import { LedgerEntry } from './ledger-entry.entity';
import { EmailOtp } from './email-otp.entity';
import { UserPermission } from './user-permission.entity';

@Entity({ name: 'Users' })
export class User extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uniqueidentifier', nullable: true })
  businessId?: string;

  @Index()
  @Column({ name: 'RoleId', type: 'uniqueidentifier' })
  roleId!: string;

  @Column({ name: 'FullName', type: 'nvarchar', length: 200 })
  fullName!: string;

  @Index({ unique: true })
  @Column({ name: 'Email', type: 'nvarchar', length: 150 })
  email!: string;

  @Column({ name: 'PasswordHash', type: 'nvarchar', length: 255, nullable: true })
  passwordHash?: string;

  @Column({ name: 'Status', type: 'nvarchar', length: 30, default: UserStatus.INACTIVE })
  status!: UserStatus;

  @Column({ name: 'LastLoginAt', type: 'datetime2', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'EmailVerifiedAt', type: 'datetime2', nullable: true })
  emailVerifiedAt?: Date;

  @ManyToOne(() => Business, (business) => business.users, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'BusinessId' })
  business?: Business;

  @ManyToOne(() => Role, (role) => role.users, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'RoleId' })
  role?: Role;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens?: RefreshToken[];

  @OneToMany(() => AuditLog, (log) => log.user)
  auditLogs?: AuditLog[];

  @OneToMany(() => SalesInvoice, (invoice) => invoice.createdBy)
  createdInvoices?: SalesInvoice[];

  @OneToMany(() => InventoryTransaction, (transaction) => transaction.createdBy)
  inventoryTransactions?: InventoryTransaction[];

  @OneToMany(() => LedgerEntry, (entry) => entry.createdBy)
  ledgerEntries?: LedgerEntry[];

  @OneToMany(() => EmailOtp, (otp) => otp.user)
  emailOtps?: EmailOtp[];

  @OneToMany(() => UserPermission, (permission) => permission.user)
  permissions?: UserPermission[];
}
