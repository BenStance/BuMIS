import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { LedgerAccountType } from '../../common/enums/domain.enums';
import { LedgerEntry } from './ledger-entry.entity';

@Entity({ name: 'LedgerAccounts' })
export class LedgerAccount extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uuid', nullable: true })
  businessId?: string;

  @Index({ unique: true })
  @Column({ name: 'Code', type: 'varchar', length: 50 })
  code!: string;

  @Column({ name: 'Name', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'AccountType', type: 'varchar', length: 30 })
  accountType!: LedgerAccountType;

  @Column({ name: 'NormalBalance', type: 'varchar', length: 10, nullable: true })
  normalBalance?: string;

  @Column({ name: 'IsSystem', type: 'boolean', default: false })
  isSystem!: boolean;

  @OneToMany(() => LedgerEntry, (entry) => entry.account)
  ledgerEntries?: LedgerEntry[];
}
