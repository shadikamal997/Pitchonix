import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IntelligenceService } from './intelligence.service';
import { AnalyzeContentDto, ContentAnalysisDto, AnalysisType } from './dto/analyze-content.dto';

@ApiTags('Intelligence')
@Controller('intelligence')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntelligenceController {
  constructor(private intelligenceService: IntelligenceService) {}

  @Post('analyze')
  @ApiOperation({
    summary: 'Analyze content and get improvement suggestions',
    description: 'Provides scores, suggestions, and enhanced content for any type of business content',
  })
  async analyzeContent(@Body() dto: AnalyzeContentDto): Promise<ContentAnalysisDto> {
    return this.intelligenceService.analyzeContent(dto.content, dto.type, dto.context);
  }

  @Post('quick-check')
  @ApiOperation({
    summary: 'Quick content quality check',
    description: 'Fast analysis without AI (checks length, jargon, weak words)',
  })
  async quickCheck(@Body() body: { content: string }): Promise<{ score: number; issues: string[] }> {
    return this.intelligenceService.quickCheck(body.content);
  }

  @Post('enhance')
  @ApiOperation({
    summary: 'Enhance content with AI',
    description: 'Returns an improved version of the content',
  })
  async enhanceContent(
    @Body() body: { content: string; type: AnalysisType },
  ): Promise<{ enhanced: string }> {
    const enhanced = await this.intelligenceService.enhanceContent(body.content, body.type);
    return { enhanced };
  }
}
