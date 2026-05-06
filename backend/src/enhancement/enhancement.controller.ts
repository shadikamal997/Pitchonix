import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnhancementService } from './enhancement.service';

@ApiTags('Enhancement')
@Controller('enhance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EnhancementController {
  constructor(private enhancementService: EnhancementService) {}

  @Post('improve/:slideId')
  @ApiOperation({ summary: 'Improve slide content using AI' })
  async improveSlide(@Param('slideId') slideId: string) {
    return this.enhancementService.improveSlide(slideId);
  }

  @Post('shorten/:slideId')
  @ApiOperation({ summary: 'Shorten slide content' })
  async shortenSlide(@Param('slideId') slideId: string) {
    return this.enhancementService.shortenSlide(slideId);
  }

  @Post('expand/:slideId')
  @ApiOperation({ summary: 'Expand slide content with more detail' })
  async expandSlide(@Param('slideId') slideId: string) {
    return this.enhancementService.expandSlide(slideId);
  }

  @Post('professional/:slideId')
  @ApiOperation({ summary: 'Make slide content more professional' })
  async makeProfessional(@Param('slideId') slideId: string) {
    return this.enhancementService.makeProfessional(slideId);
  }

  @Post('investor/:slideId')
  @ApiOperation({ summary: 'Optimize slide for investor audience' })
  async makeInvestorReady(@Param('slideId') slideId: string) {
    return this.enhancementService.makeInvestorReady(slideId);
  }

  @Post('regenerate/:slideId')
  @ApiOperation({ summary: 'Regenerate slide from scratch' })
  async regenerateSlide(
    @Param('slideId') slideId: string,
    @Body() input?: any,
  ) {
    return this.enhancementService.regenerateSlide(slideId, input || {});
  }

  @Post('fix-structure/:deckId')
  @ApiOperation({ summary: 'Fix deck structure and ordering' })
  async fixStructure(@Param('deckId') deckId: string) {
    return this.enhancementService.fixStructure(deckId);
  }

  @Post('fix-all/:deckId')
  @ApiOperation({ summary: 'Fix all issues in deck automatically' })
  async fixAllIssues(@Param('deckId') deckId: string) {
    return this.enhancementService.fixAllIssues(deckId);
  }
}
