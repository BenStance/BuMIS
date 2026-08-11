import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Business } from './business.entity';
import { Product } from './product.entity';
import { RecordStatus } from '../../common/enums/domain.enums';
import { JoinColumn, ManyToOne } from 'typeorm';

@Entity({ name: 'ProductCategories' })
export class ProductCategory extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uniqueidentifier' })
  businessId!: string;

  @Column({ name: 'Code', type: 'nvarchar', length: 50, nullable: true })
  code?: string;

  @Index()
  @Column({ name: 'Name', type: 'nvarchar', length: 150 })
  name!: string;

  @Column({ name: 'Description', type: 'nvarchar', length: 255, nullable: true })
  description?: string;

  @Column({ name: 'Status', type: 'nvarchar', length: 30, default: RecordStatus.ACTIVE })
  status!: RecordStatus;

  @Column({ name: 'DeletedAt', type: 'datetime2', nullable: true })
  deletedAt?: Date;

  @ManyToOne(() => Business, (business) => business.categories, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'BusinessId' })
  business?: Business;

  @OneToMany(() => Product, (product) => product.category)
  products?: Product[];
}
