import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorytellingService } from './storytelling.service';
import {
  TransformToStoryDto,
  GenerateMetaphorDto,
  CreateTensionDto,
} from './dto/storytelling.dto';

@Controller('api/storytelling')
@UseGuards(JwtAuthGuard)
export class StorytellingController {
  constructor(private readonly storytellingService: StorytellingService) {}

  @Post('transform')
  async transformToStory(@Body() dto: TransformToStoryDto) {
    return this.storytellingService.transformToStory(dto);
  }

  @Post('metaphors')
  async generateMetaphors(@Body() dto: GenerateMetaphorDto) {
    return this.storytellingService.generateMetaphors(dto);
  }

  @Post('tension')
  async createTension(@Body() dto: CreateTensionDto) {
    return this.storytellingService.createTension(dto);
  }
}
