import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TemplatesService, VisualTemplate } from './templates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * Get all templates
   * GET /api/templates
   */
  @Get()
  findAll(): VisualTemplate[] {
    return this.templatesService.findAll();
  }

  /**
   * Get templates by category
   * GET /api/templates/category/:category
   */
  @Get('category/:category')
  findByCategory(@Param('category') category: string): VisualTemplate[] {
    return this.templatesService.findByCategory(category);
  }

  /**
   * Get popular templates
   * GET /api/templates/popular
   */
  @Get('popular')
  findPopular(): VisualTemplate[] {
    return this.templatesService.findPopular();
  }

  /**
   * Search templates
   * GET /api/templates/search?q=query
   */
  @Get('search')
  search(@Query('q') query: string): VisualTemplate[] {
    return this.templatesService.search(query || '');
  }

  /**
   * Get template by ID
   * GET /api/templates/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string): VisualTemplate | undefined {
    return this.templatesService.findOne(id);
  }
}
