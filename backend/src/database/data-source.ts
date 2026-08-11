import 'dotenv/config';
import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { databaseConfig } from '../config/database.config';

export default new DataSource({
  ...databaseConfig(),
  migrationsRun: false,
  synchronize: false,
} as DataSourceOptions);
