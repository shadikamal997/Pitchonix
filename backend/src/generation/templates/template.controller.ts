import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Public } from '../../auth/public.decorator';
import { TemplateService, IndustryTemplate } from './template.service';

@ApiTags('Templates')
@Controller('templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TemplateController {
  constructor(private templateService: TemplateService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all templates' })
  getAllTemplates(): IndustryTemplate[] {
    return this.templateService.getAllTemplates();
  }

  @Public()
  @Get('popular')
  @ApiOperation({ summary: 'Get popular templates' })
  getPopularTemplates(): IndustryTemplate[] {
    return this.templateService.getPopularTemplates();
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search templates' })
  @ApiQuery({ name: 'q', required: true })
  searchTemplates(@Query('q') query: string): IndustryTemplate[] {
    return this.templateService.searchTemplates(query);
  }

  @Public()
  @Get('category/:category')
  @ApiOperation({ summary: 'Get templates by category' })
  getTemplatesByCategory(@Param('category') category: string): IndustryTemplate[] {
    return this.templateService.getTemplatesByCategory(category);
  }

  @Public()
  @Get('industry/:industry')
  @ApiOperation({ summary: 'Get templates by industry' })
  getTemplatesByIndustry(@Param('industry') industry: string): IndustryTemplate[] {
    return this.templateService.getTemplatesByIndustry(industry);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  getTemplateById(@Param('id') id: string): IndustryTemplate | null {
    return this.templateService.getTemplateById(id);
  }
}
