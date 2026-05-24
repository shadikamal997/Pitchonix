import { Module } from '@nestjs/common';
import { SlideAnimationsController } from './slide-animations.controller';
import { SlideAnimationsService } from './slide-animations.service';

@Module({
  controllers: [SlideAnimationsController],
  providers:   [SlideAnimationsService],
  exports:     [SlideAnimationsService],
})
export class SlideAnimationsModule {}
