import { Module } from '@nestjs/common';
import { EnhancementService } from './enhancement.service';
import { EnhancementController } from './enhancement.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GenerationModule } from '../generation/generation.module';
import { SlidesModule } from '../slides/slides.module';
import { QualityModule } from '../generation/quality/quality.module';

@Module({
  imports: [
    PrismaModule,
    GenerationModule,
    SlidesModule,
    QualityModule,
  ],
  providers: [EnhancementService],
  controllers: [EnhancementController],
  exports: [EnhancementService],
})
export class EnhancementModule {}
