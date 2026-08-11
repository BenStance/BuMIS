import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { LedgerAccountType } from '../../common/enums/domain.enums';
import { LedgerEntry } from './ledger-entry.entity';

@Entity({ name: 'LedgerAccounts' })
export class LedgerAccount extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uniqueidentifier', nullable: true })
  businessId?: string;

  @Index({ unique: true })
  @Column({ name: 'Code', type: 'nvarchar', length: 50 })
  code!: string;

  @Column({ name: 'Name', type: 'nvarchar', length: 150 })
  name!: string;

  @Column({ name: 'AccountType', type: 'nvarchar', length: 30 })
  accountType!: LedgerAccountType;

  @Column({ name: 'NormalBalance', type: 'nvarchar', length: 10, nullable: true })
  normalBalance?: string;

  @Column({ name: 'IsSystem', type: 'bit', default: false })
  isSystem!: boolean;

  @OneToMany(() => LedgerEntry, (entry) => entry.account)
  ledgerEntries?: LedgerEntry[];
}
