import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Phase Ω.1 — JWT_SECRET enforcement.
  // In production (or any non-development NODE_ENV) we hard-fail rather
  // than fall back to an insecure default. In dev we keep the warning.
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
      logger.error('JWT_SECRET is not set. Refusing to start in non-development mode.');
      throw new Error('JWT_SECRET must be set when NODE_ENV is not "development".');
    }
    logger.warn('⚠️  JWT_SECRET is not set. Using an insecure default. Set JWT_SECRET in your .env file before deploying.');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Phase Ω.1 — security headers (CSP, X-Content-Type-Options, X-Frame-Options,
  // Strict-Transport-Security, etc.). `contentSecurityPolicy: false` because
  // Swagger/iframe previews need inline scripts; tighten in production-only.
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // Enable CORS — support comma-separated FRONTEND_URL list for multi-origin setups
  const allowedOrigins = Array.from(new Set((process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .concat(['http://localhost:3200', 'http://localhost:3002'])
    .filter(Boolean)));
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  });

  // Serve exported files as static assets
  const exportsDir = join(process.cwd(), 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
  app.useStaticAssets(exportsDir, { prefix: '/exports' });

  // Serve uploaded files as static assets
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // Serve public files (test pages, etc.)
  const publicDir = join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  app.useStaticAssets(publicDir);

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const formattedErrors: Record<string, string[]> = {};
        errors.forEach((error) => {
          if (error.constraints) {
            formattedErrors[error.property] = Object.values(error.constraints);
          }
        });
        return {
          statusCode: 400,
          message: 'Validation failed',
          error: 'ValidationError',
          details: formattedErrors,
        };
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Pitchonix API')
    .setDescription('API documentation for Pitchonix - AI-powered presentation generator')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);

  // PHASE 10: Seed system templates on startup
  try {
    const { ExportTemplateService } = await import('./export/services');
    const { PrismaService } = await import('./prisma/prisma.service');
    
    const prisma = app.get(PrismaService);
    const templateService = new ExportTemplateService(prisma);
    
    await templateService.seedSystemTemplates();
  } catch (error) {
    const logger = new Logger('Bootstrap');
    logger.error('⚠️  Failed to seed system templates:', error.message);
    // Don't fail app startup if seeding fails
  }
}

bootstrap();
