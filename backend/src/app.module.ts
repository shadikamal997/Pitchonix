import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { EmailModule } from './email/email.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ActivityModule } from './activity/activity.module';
import { TemplateFavouritesModule } from './template-favourites/template-favourites.module';
import { DocumentVersionsModule } from './document-versions/document-versions.module';
import { ProjectSharingModule } from './project-sharing/project-sharing.module';
import { CommentsModule } from './comments/comments.module';
import { PresenceModule } from './presence/presence.module';
import { UnsplashModule } from './integrations/unsplash/unsplash.module';
import { TemplatesModule } from './templates/templates.module';
import { SlideExportModule } from './slide-export/slide-export.module';
import { MasterElementsModule } from './master-elements/master-elements.module';
import { ComponentsModule } from './components/components.module';
import { VersionHistoryModule } from './version-history/version-history.module';
import { AdminModule }          from './admin/admin.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { SharingModule } from './sharing/sharing.module';
import { CollaborationModule } from './collaboration/collaboration.module';

// Phase 38 — Advanced PPTX Editing
import { MasterSlidesModule }       from './master-slides/master-slides.module';
import { LayoutTemplatesModule }    from './layout-templates/layout-templates.module';
import { ThemesModule }             from './themes/themes.module';
import { DeckSectionsModule }       from './deck-sections/deck-sections.module';
import { SlideAnimationsModule }    from './slide-animations/slide-animations.module';
import { SlideTransitionsModule }   from './slide-transitions/slide-transitions.module';
import { SlideLibraryModule }       from './slide-library/slide-library.module';
import { DeckTemplatesModule }      from './deck-templates/deck-templates.module';
import { PptxImportModule }         from './pptx-import/pptx-import.module';
import { SmartArtModule }           from './smartart/smartart.module';
import { OleWorkspaceModule }       from './ole-workspace/ole-workspace.module';
// Phase 41 — Universal Document Conversion
import { UniversalConversionModule } from './universal-conversion/universal-conversion.module';
// Phase 42 — Career documents (CV / Resume / Cover Letter / Portfolio)
import { CareerModule } from './career/career.module';

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
        port: parseInt(process.env.REDIS_PORT || '6379'),
        enableOfflineQueue: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.warn('Redis connection failed after 3 attempts. Job queue disabled.');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      },
    }),
    EmailModule,
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
    NotificationsModule,
    ActivityModule,
    TemplateFavouritesModule,
    DocumentVersionsModule,
    ProjectSharingModule,
    CommentsModule,
    PresenceModule,
    UnsplashModule,
    TemplatesModule,
    SlideExportModule,
    MasterElementsModule,
    ComponentsModule,
    VersionHistoryModule,
    AdminModule,
    ReviewsModule,
    WorkspacesModule,
    SharingModule,
    CollaborationModule,
    // Phase 38 — Advanced PPTX Editing
    MasterSlidesModule,
    LayoutTemplatesModule,
    ThemesModule,
    DeckSectionsModule,
    SlideAnimationsModule,
    SlideTransitionsModule,
    SlideLibraryModule,
    DeckTemplatesModule,
    PptxImportModule,
    // Phase 38.3 — enterprise PPTX
    SmartArtModule,
    OleWorkspaceModule,
    // Phase 41 — Universal Document Conversion
    UniversalConversionModule,
    // Phase 42 — Career documents
    CareerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Phase Ω.1 — apply the rate limiter globally. Without APP_GUARD the
    // ThrottlerModule limits are dormant. Buckets configured above:
    // 10/sec, 100/min, 1000/hr per IP.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
