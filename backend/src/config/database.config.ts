import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'BuMIS',
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD,
  entities: [join(__dirname, '../database/entities/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../database/migrations/postgres/*{.ts,.js}')],
  migrationsRun: false,
  synchronize: false,
  logging: (process.env.DB_LOGGING ?? 'false') === 'true',
});
