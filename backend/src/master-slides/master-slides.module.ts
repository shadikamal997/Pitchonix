import { Module } from '@nestjs/common';
import { MasterSlidesController } from './master-slides.controller';
import { MasterSlidesService } from './master-slides.service';

@Module({
  controllers: [MasterSlidesController],
  providers:   [MasterSlidesService],
  exports:     [MasterSlidesService],
})
export class MasterSlidesModule {}
