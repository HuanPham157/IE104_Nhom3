import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/http/api-exception.filter';
import { env } from './config/env';
import { loadEnvFile } from './config/load-env';

async function bootstrap() {
  loadEnvFile();
  const config = env();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableCors({
    origin: config.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  app.enableShutdownHooks();

  await app.listen(config.PORT);
  new Logger('Bootstrap').log(`Backend API chạy tại http://localhost:${config.PORT}/api`);
}

void bootstrap();
