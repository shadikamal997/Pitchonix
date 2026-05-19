import { Module } from '@nestjs/common';
import { SlidesService } from './slides.service';
import { SlidesController } from './slides.controller';
import { SlideElementsService } from './slide-elements.service';
import { SlideElementsController } from './slide-elements.controller';
import { SlideElementsMigrationService } from './slide-elements-migration.service';

@Module({
  controllers: [SlidesController, SlideElementsController],
  providers:   [SlidesService, SlideElementsService, SlideElementsMigrationService],
  exports:     [SlidesService, SlideElementsService, SlideElementsMigrationService],
})
export class SlidesModule {}
