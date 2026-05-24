import { Module } from '@nestjs/common';
import { MasterElementsController } from './master-elements.controller';
import { MasterElementsService } from './master-elements.service';

@Module({
  controllers: [MasterElementsController],
  providers:   [MasterElementsService],
  exports:     [MasterElementsService],
})
export class MasterElementsModule {}
