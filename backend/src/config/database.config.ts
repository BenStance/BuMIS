import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const msnodesqlv8 = require('mssql/msnodesqlv8');

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'mssql',
  driver: msnodesqlv8,
  host: process.env.DB_HOST ?? 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  database: process.env.DB_NAME ?? 'BuMIS',
  extra: {
    connectionString: (() => {
      const host = process.env.DB_HOST ?? 'localhost';
      const instanceName = process.env.DB_INSTANCE?.trim() || '';
      const port = process.env.DB_PORT?.trim() || '';
      const username = process.env.DB_USERNAME?.trim() || '';
      const password = process.env.DB_PASSWORD?.trim() || '';
      const server = instanceName ? `${host}\\${instanceName}` : `${host}${port ? `,${port}` : ''}`;
      const trustServerCertificate =
        (process.env.DB_TRUST_SERVER_CERTIFICATE ?? 'true') === 'true' ? 'Yes' : 'No';
      const encrypt = (process.env.DB_ENCRYPT ?? 'false') === 'true' ? 'Yes' : 'No';
      const trustedConnectionSetting = process.env.DB_TRUSTED_CONNECTION?.trim().toLowerCase();
      const useTrustedConnection =
        trustedConnectionSetting === 'true' || (!trustedConnectionSetting && (!username || !password));
      const authSegment =
        useTrustedConnection || !username || !password ? 'Trusted_Connection=Yes;' : `UID=${username};PWD=${password};`;
      return `Driver={ODBC Driver 17 for SQL Server};Server=${server};Database=${
        process.env.DB_NAME ?? 'BuMIS'
      };${authSegment}TrustServerCertificate=${trustServerCertificate};Encrypt=${encrypt};`;
    })(),
  },
  options: {} as any,
  entities: [join(__dirname, '../database/entities/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../database/migrations/*{.ts,.js}')],
  migrationsRun: false,
  synchronize: false,
  logging: (process.env.DB_LOGGING ?? 'false') === 'true',
});
