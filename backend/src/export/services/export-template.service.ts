import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExportTemplate } from '@prisma/client';

export interface CreateTemplateDto {
  name: string;
  description?: string;
  format: 'pptx' | 'pdf' | 'html';
  config: Record<string, any>;
  logoUrl?: string;
  watermark?: string;
  colors?: Record<string, string>;
  fonts?: Record<string, any>;
  isPublic?: boolean;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  config?: Record<string, any>;
  logoUrl?: string;
  watermark?: string;
  colors?: Record<string, string>;
  fonts?: Record<string, any>;
  isPublic?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class ExportTemplateService {
  private readonly logger = new Logger(ExportTemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new custom template
   */
  async create(data: CreateTemplateDto, userId: string): Promise<ExportTemplate> {
    // Validate template configuration
    const validation = await this.validateTemplate(data.config);
    if (!validation.valid) {
      throw new Error(`Invalid template configuration: ${validation.errors.join(', ')}`);
    }

    return this.prisma.exportTemplate.create({
      data: {
        ...data,
        type: 'custom',
        userId,
        isDefault: false,
      },
    });
  }

  /**
   * Find all templates (system + user's custom templates)
   */
  async findAll(userId?: string): Promise<ExportTemplate[]> {
    const where = userId
      ? {
          OR: [
            { type: 'system' },
            { userId, type: 'custom' },
            { isPublic: true, type: 'custom' },
          ],
        }
      : { type: 'system' };

    return this.prisma.exportTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { type: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Find template by ID
   */
  async findById(id: string, userId?: string): Promise<ExportTemplate> {
    const template = await this.prisma.exportTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check access permissions
    if (template.type === 'custom' && !template.isPublic && template.userId !== userId) {
      throw new ForbiddenException('You do not have access to this template');
    }

    return template;
  }

  /**
   * Update a custom template
   */
  async update(id: string, data: UpdateTemplateDto, userId: string): Promise<ExportTemplate> {
    const template = await this.findById(id, userId);

    // Only owner can update custom templates
    if (template.type === 'custom' && template.userId !== userId) {
      throw new ForbiddenException('You can only update your own templates');
    }

    // Cannot update system templates
    if (template.type === 'system') {
      throw new ForbiddenException('Cannot update system templates');
    }

    // Validate config if provided
    if (data.config) {
      const validation = await this.validateTemplate(data.config);
      if (!validation.valid) {
        throw new Error(`Invalid template configuration: ${validation.errors.join(', ')}`);
      }
    }

    return this.prisma.exportTemplate.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a custom template
   */
  async delete(id: string, userId: string): Promise<void> {
    const template = await this.findById(id, userId);

    // Only owner can delete custom templates
    if (template.type === 'custom' && template.userId !== userId) {
      throw new ForbiddenException('You can only delete your own templates');
    }

    // Cannot delete system templates
    if (template.type === 'system') {
      throw new ForbiddenException('Cannot delete system templates');
    }

    await this.prisma.exportTemplate.delete({
      where: { id },
    });
  }

  /**
   * Get all system templates
   */
  async getSystemTemplates(): Promise<ExportTemplate[]> {
    return this.prisma.exportTemplate.findMany({
      where: { type: 'system' },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get user's custom templates
   */
  async getUserTemplates(userId: string): Promise<ExportTemplate[]> {
    return this.prisma.exportTemplate.findMany({
      where: { userId, type: 'custom' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get default template for a format
   */
  async getDefaultTemplate(format: string): Promise<ExportTemplate> {
    const template = await this.prisma.exportTemplate.findFirst({
      where: {
        format,
        type: 'system',
        isDefault: true,
      },
    });

    if (!template) {
      throw new NotFoundException(`No default template found for format: ${format}`);
    }

    return template;
  }

  /**
   * Validate template configuration
   */
  async validateTemplate(config: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];

    // Basic validation
    if (!config || typeof config !== 'object') {
      errors.push('Config must be an object');
      return { valid: false, errors };
    }

    // Check required fields based on type
    // For now, accept any valid JSON object
    // Add more specific validation as needed

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Seed system templates (run on app startup)
   */
  async seedSystemTemplates(): Promise<void> {
    const existingTemplates = await this.prisma.exportTemplate.count({
      where: { type: 'system' },
    });

    // Only seed if no system templates exist
    if (existingTemplates > 0) {
      return;
    }

    const systemTemplates = [
      // Professional Template
      {
        name: 'Professional',
        description: 'Clean, corporate style perfect for business presentations',
        type: 'system' as const,
        format: 'pptx',
        isDefault: true,
        isPublic: true,
        config: {
          layout: 'clean',
          style: 'corporate',
        },
        colors: {
          primary: '#1e3a8a', // Navy blue
          secondary: '#64748b', // Gray
          accent: '#3b82f6', // Blue
          background: '#ffffff',
          text: '#0f172a',
        },
        fonts: {
          heading: 'Arial',
          body: 'Arial',
          sizes: {
            title: 44,
            heading: 32,
            body: 18,
          },
        },
      },
      // Creative Template
      {
        name: 'Creative',
        description: 'Bold colors and modern design for creative presentations',
        type: 'system' as const,
        format: 'pptx',
        isDefault: false,
        isPublic: true,
        config: {
          layout: 'dynamic',
          style: 'modern',
        },
        colors: {
          primary: '#ec4899', // Pink
          secondary: '#8b5cf6', // Purple
          accent: '#f59e0b', // Amber
          background: '#ffffff',
          text: '#1f2937',
        },
        fonts: {
          heading: 'Montserrat',
          body: 'Open Sans',
          sizes: {
            title: 48,
            heading: 36,
            body: 20,
          },
        },
      },
      // Minimal Template
      {
        name: 'Minimal',
        description: 'Simple and elegant with lots of whitespace',
        type: 'system' as const,
        format: 'pptx',
        isDefault: false,
        isPublic: true,
        config: {
          layout: 'spacious',
          style: 'minimal',
        },
        colors: {
          primary: '#000000',
          secondary: '#6b7280',
          accent: '#3b82f6',
          background: '#ffffff',
          text: '#111827',
        },
        fonts: {
          heading: 'Helvetica',
          body: 'Helvetica',
          sizes: {
            title: 42,
            heading: 30,
            body: 16,
          },
        },
      },
      // Academic Template
      {
        name: 'Academic',
        description: 'Formal and structured for educational presentations',
        type: 'system' as const,
        format: 'pptx',
        isDefault: false,
        isPublic: true,
        config: {
          layout: 'structured',
          style: 'formal',
        },
        colors: {
          primary: '#991b1b', // Dark red
          secondary: '#78716c', // Stone
          accent: '#dc2626', // Red
          background: '#ffffff',
          text: '#1c1917',
        },
        fonts: {
          heading: 'Times New Roman',
          body: 'Georgia',
          sizes: {
            title: 40,
            heading: 28,
            body: 16,
          },
        },
      },
      // Startup Template
      {
        name: 'Startup',
        description: 'Dynamic and energetic for pitch decks and startups',
        type: 'system' as const,
        format: 'pptx',
        isDefault: false,
        isPublic: true,
        config: {
          layout: 'energetic',
          style: 'modern',
        },
        colors: {
          primary: '#10b981', // Green
          secondary: '#06b6d4', // Cyan
          accent: '#f59e0b', // Amber
          background: '#ffffff',
          text: '#111827',
        },
        fonts: {
          heading: 'Poppins',
          body: 'Inter',
          sizes: {
            title: 46,
            heading: 34,
            body: 18,
          },
        },
      },
    ];

    // Create all system templates
    await Promise.all(
      systemTemplates.map((template) =>
        this.prisma.exportTemplate.create({ data: template })
      )
    );

    this.logger.log('✅ System templates seeded successfully');
  }
}
