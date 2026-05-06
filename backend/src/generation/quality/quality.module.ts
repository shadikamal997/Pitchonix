import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { ValidationService } from './validation.service';
import { MonitoringService } from './monitoring.service';
import { QualityControlService } from './quality-control.service';

/**
 * Quality Control Module
 * Provides quality scoring, validation, and monitoring services
 */
@Module({
  providers: [
    ScoringService,
    ValidationService,
    MonitoringService,
    QualityControlService,
  ],
  exports: [
    ScoringService,
    ValidationService,
    MonitoringService,
    QualityControlService,
  ],
})
export class QualityModule {}
