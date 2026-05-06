import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { DecksModule } from './decks/decks.module';
import { SlidesModule } from './slides/slides.module';
import { GenerationModule } from './generation/generation.module';
import { ExportModule } from './export/export.module';
import { QualityControlModule } from './quality-control/quality-control.module';
import { PdfDocumentsModule } from './pdf-documents/pdf-documents.module';
import { PdfPagesModule } from './pdf-pages/pdf-pages.module';
import { PdfGenerationModule } from './pdf-generation/pdf-generation.module';
import { BrandKitsModule } from './brand-kits/brand-kits.module';
import { EnhancementModule } from './enhancement/enhancement.module';
import { UploadModule } from './upload/upload.module';
import { DocumentParserModule } from './document-parser/document-parser.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { PdfStudioModule } from './pdf-studio/pdf-studio.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Scheduled Tasks (Cron Jobs)
    ScheduleModule.forRoot(),
    // Cache Management for Performance
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 minutes default
      max: 100, // max items in cache
    }),
    // Rate Limiting - Protect against abuse
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    DecksModule,
    SlidesModule,
    GenerationModule,
    ExportModule,
    QualityControlModule,
    PdfDocumentsModule,
    PdfPagesModule,
    PdfGenerationModule,
    BrandKitsModule,
    EnhancementModule,
    UploadModule,
    DocumentParserModule,
    IntelligenceModule,
    PdfStudioModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
