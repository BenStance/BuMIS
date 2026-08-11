import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Business } from './business.entity';
import { RecordStatus } from '../../common/enums/domain.enums';
import { SalesInvoice } from './sales-invoice.entity';

@Entity({ name: 'Customers' })
export class Customer extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uniqueidentifier' })
  businessId!: string;

  @Index()
  @Column({ name: 'FullName', type: 'nvarchar', length: 200 })
  fullName!: string;

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

  @Column({ name: 'Balance', type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance!: number;

  @Column({ name: 'Status', type: 'nvarchar', length: 30, default: RecordStatus.ACTIVE })
  status!: RecordStatus;

  @ManyToOne(() => Business, (business) => business.customers, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'BusinessId' })
  business?: Business;

  @OneToMany(() => SalesInvoice, (invoice) => invoice.customer)
  invoices?: SalesInvoice[];
}
