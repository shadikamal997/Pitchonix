import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SuggestionsService, SuggestionContext, Suggestion } from './suggestions.service';

@ApiTags('Suggestions')
@Controller('suggestions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SuggestionsController {
  constructor(private suggestionsService: SuggestionsService) {}

  @Post()
  @ApiOperation({ summary: 'Get intelligent suggestions for a field' })
  async getSuggestions(
    @Body() context: SuggestionContext,
  ): Promise<Suggestion[]> {
    return this.suggestionsService.getSuggestions(context);
  }
}
