import { Module } from '@nestjs/common';
import { SlideTransitionsController } from './slide-transitions.controller';
import { SlideTransitionsService } from './slide-transitions.service';

@Module({
  controllers: [SlideTransitionsController],
  providers:   [SlideTransitionsService],
  exports:     [SlideTransitionsService],
})
export class SlideTransitionsModule {}
