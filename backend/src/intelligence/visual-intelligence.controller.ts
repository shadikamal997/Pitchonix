import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VisualIntelligenceService } from './visual-intelligence.service';
import {
  AnalyzeSlideContentRequest,
  GenerateChartDataRequest,
} from './dto/visual-intelligence.dto';

@Controller('api/visual-intelligence')
@UseGuards(JwtAuthGuard)
export class VisualIntelligenceController {
  constructor(private readonly visualIntelligenceService: VisualIntelligenceService) {}

  @Post('analyze')
  async analyzeSlideContent(@Body() dto: AnalyzeSlideContentRequest) {
    return this.visualIntelligenceService.analyzeSlideContent(dto);
  }

  @Post('generate-chart')
  async generateChartData(@Body() dto: GenerateChartDataRequest) {
    return this.visualIntelligenceService.generateChartData(dto);
  }
}
