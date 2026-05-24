import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  // Phase 36.1M — ReviewsModule exports ReviewEventBus (and ReviewsService),
  // which CommentsService uses to emit comment.* lifecycle events.
  imports:     [ReviewsModule],
  controllers: [CommentsController],
  providers:   [CommentsService],
  exports:     [CommentsService],
})
export class CommentsModule {}
