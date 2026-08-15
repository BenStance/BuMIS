import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export abstract class BaseUuidEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'Id' })
  id!: string;

  @CreateDateColumn({ name: 'CreatedAt', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'timestamp' })
  updatedAt!: Date;
}
