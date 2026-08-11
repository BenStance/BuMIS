import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  try {
    const logger = new Logger('Bootstrap');
    logger.log('Creating Nest application...');
    const app = await NestFactory.create(AppModule, {
      cors: true,
    });
    logger.log('Nest application created.');

    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    app.use((req: any, res: any, next: any) => {
      const startedAt = Date.now();
      const method = req.method || 'GET';
      const url = req.originalUrl || req.url || '/';
      logger.log(`-> ${method} ${url}`);
      res.on('finish', () => {
        const duration = Date.now() - startedAt;
        const message = `<- ${method} ${url} ${res.statusCode} ${duration}ms`;
        if (res.statusCode >= 400) {
          logger.error(message);
        } else {
          logger.log(message);
        }
      });
      next();
    });

    const port = Number(process.env.APP_PORT ?? 3001);
    const host = 'localhost';
    logger.log(`Binding HTTP server on ${host}:${port}...`);
    await app.listen(port, host);
    const url = await app.getUrl();
    logger.log(`BuMIS backend listening on ${url}`);
  } catch (error) {
    console.error('Failed to start BuMIS backend:', error);
    process.exitCode = 1;
  }
}

void bootstrap();
