import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseUuidEntity } from './base.entity';
import { Business } from './business.entity';

@Entity({ name: 'SystemSettings' })
@Unique('UQ_SystemSettings_BusinessId_Key', ['businessId', 'key'])
export class SystemSetting extends BaseUuidEntity {
  @Index()
  @Column({ name: 'BusinessId', type: 'uuid', nullable: true })
  businessId?: string;

  @Column({ name: 'SettingKey', type: 'varchar', length: 150 })
  key!: string;

  @Column({ name: 'SettingValue', type: 'text', nullable: true })
  value?: string;

  @Column({ name: 'Category', type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({ name: 'Description', type: 'varchar', length: 255, nullable: true })
  description?: string;

  @ManyToOne(() => Business, (business) => business.settings, { onDelete: 'NO ACTION', nullable: true })
  @JoinColumn({ name: 'BusinessId' })
  business?: Business;
}
