import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import { AllowedOriginsService } from './allowed-origins/allowed-origins.service';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const origins = app.get(AllowedOriginsService);
  if (config.get('trustProxy')) app.set('trust proxy', 1);
  app.enableShutdownHooks();
  await origins.invalidateCache();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  // Middleware específico para image-proxy: garante CORS/CORP antes do CORS global.
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (!request.path.startsWith('/api/image-proxy')) return next();
    const requestOrigin = request.headers.origin;
    response.setHeader(
      'Access-Control-Allow-Origin',
      requestOrigin ?? '*',
    );
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Internal-Token',
    );
    if (requestOrigin) response.setHeader('Vary', 'Origin');
    if (request.method === 'OPTIONS') {
      return response.status(204).end();
    }
    return next();
  });
  app.enableCors({
    origin: async (origin, callback) => {
      const allowed = await origins.isAllowed(origin ?? undefined);
      callback(
        allowed ? null : new Error('Origin not allowed by CORS'),
        allowed,
      );
    },
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Token'],
  });
  await app.listen(config.get('port'), config.get('host'));
}

void bootstrap();
