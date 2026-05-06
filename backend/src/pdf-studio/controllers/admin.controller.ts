import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { TemplatePreviewGeneratorService } from '../services/template-preview-generator.service';

/**
 * Admin Controller for Template Management
 * Handles administrative tasks like generating template previews
 */
@Controller('api/pdf-studio/admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly templatePreviewGenerator: TemplatePreviewGeneratorService,
  ) {}

  /**
   * Generate previews for all templates
   * Should be protected with admin authentication in production
   */
  @Post('generate-template-previews')
  // @UseGuards(JwtAuthGuard, AdminGuard) // Uncomment in production
  async generateTemplatePreviews() {
    this.logger.log('Generating template previews...');

    try {
      await this.templatePreviewGenerator.generateAllPreviews();

      return {
        success: true,
        message: 'Template previews generated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to generate template previews', error);
      throw error;
    }
  }

  /**
   * Regenerate preview for a specific template
   */
  @Post('regenerate-template-preview')
  // @UseGuards(JwtAuthGuard, AdminGuard) // Uncomment in production
  async regenerateTemplatePreview(@Body('templateName') templateName: string) {
    if (!templateName) {
      throw new Error('Template name is required');
    }

    this.logger.log(`Regenerating preview for template: ${templateName}`);

    try {
      const result = await this.templatePreviewGenerator.generatePreview(
        templateName,
      );

      return {
        success: true,
        message: `Preview for ${templateName} regenerated successfully`,
        preview: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to regenerate preview for ${templateName}`,
        error,
      );
      throw error;
    }
  }
}
