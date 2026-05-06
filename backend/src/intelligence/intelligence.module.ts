import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IntelligenceService } from './intelligence.service';
import { IntelligenceController } from './intelligence.controller';
import { StorytellingService } from './storytelling.service';
import { StorytellingController } from './storytelling.controller';
import { VisualIntelligenceService } from './visual-intelligence.service';
import { VisualIntelligenceController } from './visual-intelligence.controller';

@Module({
  imports: [ConfigModule],
  providers: [IntelligenceService, StorytellingService, VisualIntelligenceService],
  controllers: [IntelligenceController, StorytellingController, VisualIntelligenceController],
  exports: [IntelligenceService, StorytellingService, VisualIntelligenceService],
})
export class IntelligenceModule {}
