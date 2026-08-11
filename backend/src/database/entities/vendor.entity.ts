import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Business } from './business.entity';
import { RecordStatus } from '../../common/enums/domain.enums';

@Entity({ name: 'Vendors' })
export class Vendor extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uniqueidentifier' })
  businessId!: string;

  @Index()
  @Column({ name: 'Name', type: 'nvarchar', length: 200 })
  name!: string;

  @Column({ name: 'ContactPerson', type: 'nvarchar', length: 200, nullable: true })
  contactPerson?: string;

  @Column({ name: 'Email', type: 'nvarchar', length: 150, nullable: true })
  email?: string;

  @Column({ name: 'Phone', type: 'nvarchar', length: 50, nullable: true })
  phone?: string;

  @Column({ name: 'Address', type: 'nvarchar', length: 300, nullable: true })
  address?: string;

  @Column({ name: 'TIN', type: 'nvarchar', length: 50, nullable: true })
  tin?: string;

  @Column({ name: 'Notes', type: 'nvarchar', length: 255, nullable: true })
  notes?: string;

  @Column({ name: 'Status', type: 'nvarchar', length: 30, default: RecordStatus.ACTIVE })
  status!: RecordStatus;

  @ManyToOne(() => Business, (business) => business.vendors, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'BusinessId' })
  business?: Business;
}
