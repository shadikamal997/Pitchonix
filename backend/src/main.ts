import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PrismaService } from './prisma/prisma.service';
import { createFileAuthGate } from './files/file-security';
import { join } from 'path';
import * as fs from 'fs';

const LOCAL_DEV_JWT_SECRET = 'pitchonix-local-development-only-secret';

// Phase 43.0A — process-level resilience.
//
// Tesseract.js / pdf2pic / playwright run in worker threads that can throw
// errors *outside* our try/catch boundaries (e.g. libpng CRC failures bubble
// via Worker.emit('error') → process.nextTick(throw)). Without these
// handlers, a single corrupt image kills the entire backend. Log and keep
// the server alive instead.
const bootstrapLogger = new Logger('Process');
process.on('uncaughtException', (err) => {
  bootstrapLogger.error(`[uncaughtException] ${err?.message || err}`, (err as any)?.stack);
});
process.on('unhandledRejection', (reason: any) => {
  bootstrapLogger.error(`[unhandledRejection] ${reason?.message || reason}`, reason?.stack);
});

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
    logger.warn(
      '⚠️  JWT_SECRET is not set. Using an insecure default. Set JWT_SECRET in your .env file before deploying.',
    );
  }

  // Disable Nest's built-in body parser so we can register our own with a
  // raised limit. NestFactory otherwise registers a default 100kb json parser
  // at creation time that runs BEFORE any app.use(express.json(...)) we add
  // afterwards — so the larger limit never takes effect and large documents
  // are rejected with "request entity too large". Disabling it here and using
  // useBodyParser() makes the 10mb limit the one that's actually applied.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // Increase body size limit for large document content (default Express limit is 100kb)
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  const isProduction = process.env.NODE_ENV === 'production';

  // Phase Ω.1 — security headers (CSP, X-Content-Type-Options, X-Frame-Options,
  // Strict-Transport-Security, etc.). Local preview/editor tooling still allows
  // inline-heavy rendering, but production receives an explicit CSP.
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            useDefaults: true,
            directives: {
              'default-src': ["'self'"],
              'base-uri': ["'self'"],
              'object-src': ["'none'"],
              'frame-ancestors': ["'self'"],
              'img-src': ["'self'", 'data:', 'blob:', 'https:'],
              'font-src': ["'self'", 'data:', 'https:'],
              'style-src': ["'self'", "'unsafe-inline'", 'https:'],
              'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
              'connect-src': ["'self'", 'https:', 'wss:'],
              'worker-src': ["'self'", 'blob:'],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Enable CORS — support comma-separated FRONTEND_URL list for multi-origin setups
  const allowedOrigins = Array.from(
    new Set(
      (process.env.FRONTEND_URL || 'http://localhost:3000')
        .split(',')
        .map((o) => o.trim())
        .concat(['http://localhost:3200', 'http://localhost:3002'])
        .filter(Boolean),
    ),
  );
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  });

  // Phase Ω.1B — secure static file access.
  // `/exports` (private documents) and `/uploads` (user images/assets) are NO
  // LONGER publicly browsable. Each is served behind an auth-gate that accepts
  // a signed token, the `pitchonix-auth` cookie, or a Bearer JWT, and (for
  // exports) enforces per-record ownership. See files/file-security.ts.
  const expressLib = require('express');
  const jwtSecret = process.env.JWT_SECRET || LOCAL_DEV_JWT_SECRET;
  const prismaForFiles = app.get(PrismaService);

  // Ownership resolver for exports: map a stored fileUrl → owning user. Returns
  // null when no record matches (legacy/unrecorded exports) → allow any authed
  // user rather than break a legitimate download.
  const resolveExportOwner = async (storedUrl: string, userId: string): Promise<boolean | null> => {
    const ex = await prismaForFiles.export.findFirst({
      where: { fileUrl: storedUrl },
      select: { deck: { select: { project: { select: { userId: true } } } } },
    });
    if (ex?.deck?.project?.userId) return ex.deck.project.userId === userId;
    const pex = await prismaForFiles.pdfExport.findFirst({
      where: { fileUrl: storedUrl },
      select: { document: { select: { project: { select: { userId: true } } } } },
    });
    if (pex?.document?.project?.userId) return pex.document.project.userId === userId;
    return null;
  };

  // Serve exported files — authenticated + ownership-checked.
  const exportsDir = join(process.cwd(), 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
  app.use(
    '/exports',
    createFileAuthGate({
      jwtSecret,
      mountPrefix: '/exports',
      baseDir: exportsDir,
      resolveOwner: resolveExportOwner,
    }),
    expressLib.static(exportsDir),
  );

  // Serve uploaded files — OWNERSHIP-gated (Phase Ω.1D). A request passes only
  // with a valid signed token, OR when the UploadedAsset row says the caller
  // owns the file (or its parent project), OR — for files with no row yet
  // (legacy/un-backfilled) — any authenticated user, unless strict mode is on.
  const { UploadedAssetService } = await import('./files/uploaded-asset.service');
  const uploadedAssetService = app.get(UploadedAssetService);
  const strictUploads =
    process.env.UPLOADS_STRICT_OWNERSHIP === '1' || process.env.UPLOADS_STRICT_OWNERSHIP === 'true';
  const resolveUploadOwner = async (storedUrl: string, userId: string): Promise<boolean | null> => {
    const decision = await uploadedAssetService.authorize(storedUrl, userId); // true | false | null
    if (decision === null && strictUploads) return false; // no record → deny under strict mode
    return decision;
  };

  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use(
    '/uploads',
    createFileAuthGate({
      jwtSecret,
      mountPrefix: '/uploads',
      baseDir: uploadsDir,
      resolveOwner: resolveUploadOwner,
    }),
    expressLib.static(uploadsDir),
  );

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
        return new BadRequestException({
          message: 'Validation failed',
          error: 'ValidationError',
          details: formattedErrors,
        });
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
