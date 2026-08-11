import { registerAs } from '@nestjs/config';
import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { jwtConfig } from './jwt.config';
import { smtpConfig } from './smtp.config';

export default registerAs('configuration', () => ({
  app: appConfig(),
  database: databaseConfig(),
  jwt: jwtConfig(),
  smtp: smtpConfig(),
}));
