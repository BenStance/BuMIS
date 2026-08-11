import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export abstract class BaseUuidEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'Id' })
  id!: string;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime2' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt!: Date;
}
