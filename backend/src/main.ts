import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  try {
    const logger = new Logger('Bootstrap');
    if (process.env.NODE_ENV === 'production') {
      const insecureSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter((key) => {
        const value = process.env[key] ?? '';
        return value.length < 32 || value.startsWith('change-me');
      });
      if (insecureSecrets.length) {
        throw new Error(`Secure production secrets are required: ${insecureSecrets.join(', ')}`);
      }
    }
    const allowedOrigins = (process.env.APP_CORS_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    logger.log('Creating Nest application...');
    const app = await NestFactory.create(AppModule, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      },
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

    const authAttempts = new Map<string, { count: number; resetAt: number }>();
    app.use((req: any, res: any, next: any) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

      const sensitiveAuthRoute = req.method === 'POST' && /^\/api\/auth\/(login|forgot-password|reset-password|register-business|verify-business-registration)$/.test(req.path);
      if (sensitiveAuthRoute) {
        const now = Date.now();
        const key = `${req.ip}:${req.path}`;
        const attempt = authAttempts.get(key);
        if (!attempt || attempt.resetAt <= now) {
          authAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
        } else if (attempt.count >= 15) {
          res.setHeader('Retry-After', String(Math.ceil((attempt.resetAt - now) / 1000)));
          return res.status(429).json({ statusCode: 429, message: 'Too many authentication attempts. Please try again later.' });
        } else {
          attempt.count += 1;
        }
        if (authAttempts.size > 10_000) {
          for (const [attemptKey, value] of authAttempts) {
            if (value.resetAt <= now) authAttempts.delete(attemptKey);
          }
        }
      }

      const startedAt = Date.now();
      const method = req.method || 'GET';
      const url = req.path || '/';
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
