import { Module } from '@nestjs/common';
import { SmartArtController } from './smartart.controller';
import { SmartArtService } from './smartart.service';

@Module({
  controllers: [SmartArtController],
  providers:   [SmartArtService],
  exports:     [SmartArtService],
})
export class SmartArtModule {}
