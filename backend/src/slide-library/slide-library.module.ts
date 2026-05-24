import { Module } from '@nestjs/common';
import { SlideLibraryController } from './slide-library.controller';
import { SlideLibraryService } from './slide-library.service';

@Module({
  controllers: [SlideLibraryController],
  providers:   [SlideLibraryService],
  exports:     [SlideLibraryService],
})
export class SlideLibraryModule {}
