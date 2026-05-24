import { Module } from '@nestjs/common';
import { LayoutTemplatesController } from './layout-templates.controller';
import { LayoutTemplatesService } from './layout-templates.service';

@Module({
  controllers: [LayoutTemplatesController],
  providers:   [LayoutTemplatesService],
  exports:     [LayoutTemplatesService],
})
export class LayoutTemplatesModule {}
