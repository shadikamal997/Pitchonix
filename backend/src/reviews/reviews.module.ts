import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewEventBus } from './review-event-bus';
import { VersionHistoryModule } from '../version-history/version-history.module';

@Module({
  imports:     [VersionHistoryModule], // Phase 36.1C — snapshots on transitions
  controllers: [ReviewsController],
  providers:   [ReviewsService, ReviewEventBus],
  // Exported so CommentsModule can emit events on the same bus.
  exports:     [ReviewsService, ReviewEventBus],
})
export class ReviewsModule {}
