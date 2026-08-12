import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseUuidEntity } from './base.entity';

@Entity({ name: 'DocumentCounters' })
@Unique('UQ_DocumentCounters_BusinessId_DocumentType', ['businessId', 'documentType'])
export class DocumentCounter extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uniqueidentifier', nullable: true })
  businessId?: string;

  @Index()
  @Column({ name: 'DocumentType', type: 'nvarchar', length: 50 })
  documentType!: string;

  @Column({ name: 'Prefix', type: 'nvarchar', length: 50 })
  prefix!: string;

  @Column({ name: 'NextSequence', type: 'int', default: 1 })
  nextSequence!: number;

  @Column({ name: 'IncludeYear', type: 'bit', default: true })
  includeYear!: boolean;

  @Column({ name: 'Padding', type: 'int', default: 6 })
  padding!: number;
}
