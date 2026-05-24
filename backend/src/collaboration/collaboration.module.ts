import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationBroadcaster } from './collaboration-broadcaster';
import { CollaborationMetricsController } from './collaboration-metrics.controller';
import { YDocStore } from './ydoc-store';
import { YDocSyncBus } from './ydoc-sync-bus';
import { ReviewsModule } from '../reviews/reviews.module';

// Phase 34A — CollaborationModule
//
// Made @Global so other modules (slides, comments, decks, version-history)
// can inject CollaborationBroadcaster to push events into the room without
// importing the module each time.
//
// Imports ReviewsModule so the gateway can subscribe to the existing
// ReviewEventBus and forward comment/review/version events as live socket
// emissions (Phase 34L/M/N).
@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    }),
    ReviewsModule,
  ],
  controllers: [CollaborationMetricsController],
  providers:   [CollaborationGateway, CollaborationBroadcaster, YDocStore, YDocSyncBus],
  exports:     [CollaborationBroadcaster, YDocStore],
})
export class CollaborationModule {}
