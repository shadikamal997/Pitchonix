import { Module } from '@nestjs/common';
import { QualityControlService } from './quality-control.service';

@Module({
  providers: [QualityControlService],
  exports: [QualityControlService],
})
export class QualityControlModule {}
