import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import puppeteer from 'puppeteer';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Template Preview Generator Service
 * Generates preview images for all PDF templates
 */
@Injectable()
export class TemplatePreviewGeneratorService {
  private readonly logger = new Logger(TemplatePreviewGeneratorService.name);
  private readonly PREVIEW_DIR = path.join(process.cwd(), '../frontend/public/templates/previews');

  constructor(private prisma: PrismaService) {}

  /**
   * Generate previews for all templates
   * Runs on app startup and can be triggered manually
   */
  async generateAllPreviews(): Promise<void> {
    this.logger.log('Starting template preview generation...');

    // Ensure preview directory exists
    await fs.mkdir(this.PREVIEW_DIR, { recursive: true });

    const templates = [
      'modern',
      'classic',
      'minimal',
      'bold',
      'elegant',
      'tech',
      'corporate',
      'creative',
      'startup',
      'professional',
      'colorful',
      'monochrome',
      'gradient',
      'geometric',
      'abstract',
      'nature',
      'urban',
      'vintage',
      'futuristic',
      'clean',
    ];

    for (const template of templates) {
      try {
        await this.generatePreview(template);
        this.logger.log(`✓ Generated preview for ${template}`);
      } catch (error) {
        this.logger.error(`✗ Failed to generate preview for ${template}`, error);
      }
    }

    this.logger.log('Template preview generation complete!');
  }

  /**
   * Generate preview for a single template
   */
  /**
   * Generate preview for a specific template
   */
  async generatePreview(templateName: string): Promise<{
    fullPreview: string;
    thumbnail: string;
  }> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // Set viewport to A4 aspect ratio (210mm × 297mm = 0.707 ratio)
      await page.setViewport({
        width: 794,
        height: 1123,
        deviceScaleFactor: 2, // Retina display
      });

      // Sample content for preview
      const sampleContent = this.getSampleContent(templateName);

      // Generate HTML with template
      const html = this.generateTemplateHTML(templateName, sampleContent);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Take screenshot
      const screenshotPath = path.join(this.PREVIEW_DIR, `${templateName}.png`);
      await page.screenshot({
        path: screenshotPath,
        type: 'png',
        fullPage: false,
      });

      // Also generate thumbnail (smaller version)
      await page.setViewport({
        width: 400,
        height: 566,
        deviceScaleFactor: 2,
      });

      const thumbnailPath = path.join(this.PREVIEW_DIR, `${templateName}-thumb.png`);
      await page.screenshot({
        path: thumbnailPath,
        type: 'png',
        fullPage: false,
      });

      return {
        fullPreview: screenshotPath,
        thumbnail: thumbnailPath,
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Get sample content for template preview
   */
  private getSampleContent(templateName: string): any {
    return {
      title: 'Business Strategy 2026',
      subtitle: 'Annual Growth & Innovation Plan',
      sections: [
        {
          heading: 'Executive Summary',
          content:
            'Our strategic vision focuses on sustainable growth, market expansion, and technological innovation.',
        },
        {
          heading: 'Market Analysis',
          content:
            'Industry trends indicate strong growth potential in emerging markets with digital transformation.',
        },
        {
          heading: 'Key Objectives',
          bullets: [
            'Increase market share by 25%',
            'Launch 3 new product lines',
            'Expand into 5 new regions',
            'Achieve 40% revenue growth',
          ],
        },
      ],
    };
  }

  /**
   * Generate HTML for template (simplified version for previews)
   */
  private generateTemplateHTML(templateName: string, content: any): string {
    const colors = this.getTemplateColors(templateName);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              background: ${colors.background};
              color: ${colors.text};
              padding: 60px;
            }
            .header {
              border-bottom: 4px solid ${colors.primary};
              padding-bottom: 30px;
              margin-bottom: 40px;
            }
            h1 {
              font-size: 48px;
              font-weight: 800;
              color: ${colors.primary};
              margin-bottom: 10px;
            }
            .subtitle {
              font-size: 24px;
              color: ${colors.secondary};
              font-weight: 500;
            }
            .section {
              margin-bottom: 35px;
            }
            h2 {
              font-size: 28px;
              color: ${colors.primary};
              margin-bottom: 15px;
              font-weight: 700;
            }
            p {
              font-size: 16px;
              line-height: 1.8;
              color: ${colors.text};
            }
            ul {
              list-style: none;
              margin-top: 15px;
            }
            li {
              padding-left: 30px;
              position: relative;
              margin-bottom: 10px;
              font-size: 16px;
            }
            li:before {
              content: "●";
              color: ${colors.primary};
              font-size: 20px;
              position: absolute;
              left: 0;
            }
            .footer {
              position: fixed;
              bottom: 40px;
              left: 60px;
              right: 60px;
              padding-top: 20px;
              border-top: 2px solid ${colors.accent};
              font-size: 12px;
              color: ${colors.secondary};
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${content.title}</h1>
            <div class="subtitle">${content.subtitle}</div>
          </div>
          
          ${content.sections
            .map(
              (section: any) => `
            <div class="section">
              <h2>${section.heading}</h2>
              ${section.content ? `<p>${section.content}</p>` : ''}
              ${
                section.bullets
                  ? `
                <ul>
                  ${section.bullets.map((bullet: string) => `<li>${bullet}</li>`).join('')}
                </ul>
              `
                  : ''
              }
            </div>
          `,
            )
            .join('')}
          
          <div class="footer">
            ${templateName.charAt(0).toUpperCase() + templateName.slice(1)} Template • Generated by Pitchonix PDF Studio
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get color scheme for template
   */
  private getTemplateColors(templateName: string): any {
    const schemes: Record<string, any> = {
      modern: {
        primary: '#3B82F6',
        secondary: '#64748B',
        accent: '#06B6D4',
        text: '#1E293B',
        background: '#FFFFFF',
      },
      classic: {
        primary: '#1E40AF',
        secondary: '#475569',
        accent: '#7C3AED',
        text: '#0F172A',
        background: '#F8FAFC',
      },
      minimal: {
        primary: '#18181B',
        secondary: '#71717A',
        accent: '#A1A1AA',
        text: '#27272A',
        background: '#FFFFFF',
      },
      bold: {
        primary: '#DC2626',
        secondary: '#EA580C',
        accent: '#F59E0B',
        text: '#18181B',
        background: '#FFFFFF',
      },
      elegant: {
        primary: '#7C3AED',
        secondary: '#A855F7',
        accent: '#C084FC',
        text: '#1F2937',
        background: '#FAF5FF',
      },
      // Add more color schemes for other templates...
    };

    return (
      schemes[templateName] || {
        primary: '#3B82F6',
        secondary: '#64748B',
        accent: '#06B6D4',
        text: '#1E293B',
        background: '#FFFFFF',
      }
    );
  }

  /**
   * Cron job to regenerate previews weekly
   */
  @Cron(CronExpression.EVERY_WEEK)
  async regeneratePreviews(): Promise<void> {
    this.logger.log('Running scheduled template preview regeneration...');
    await this.generateAllPreviews();
  }
}
