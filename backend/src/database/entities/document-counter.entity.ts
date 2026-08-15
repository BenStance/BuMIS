import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseUuidEntity } from './base.entity';

@Entity({ name: 'DocumentCounters' })
@Unique('UQ_DocumentCounters_BusinessId_DocumentType', ['businessId', 'documentType'])
export class DocumentCounter extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uuid', nullable: true })
  businessId?: string;

  @Index()
  @Column({ name: 'DocumentType', type: 'varchar', length: 50 })
  documentType!: string;

  @Column({ name: 'Prefix', type: 'varchar', length: 50 })
  prefix!: string;

  @Column({ name: 'NextSequence', type: 'int', default: 1 })
  nextSequence!: number;

  @Column({ name: 'IncludeYear', type: 'boolean', default: true })
  includeYear!: boolean;

  @Column({ name: 'Padding', type: 'int', default: 6 })
  padding!: number;
}
