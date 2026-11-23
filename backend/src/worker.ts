import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { env } from './config/env';
import { loadEnvFile } from './config/load-env';
import { WorkerModule } from './worker.module';

/** Entry của worker chấm điểm: `npm run worker:dev` (hoặc `npm run worker` sau khi build). */
async function bootstrap() {
  loadEnvFile();
  env();
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  new Logger('Worker').log('Worker chấm điểm đã khởi động');
}

void bootstrap();
