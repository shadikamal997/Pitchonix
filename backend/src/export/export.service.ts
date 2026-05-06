import { Injectable, Logger } from '@nestjs/common';
import PptxGenJS from 'pptxgenjs';
import { PrismaService } from '../prisma/prisma.service';
import { join } from 'path';
import * as fs from 'fs';

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textLight: string;
  background: string;
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly defaultColors: BrandColors = {
    primary: '8B5CF6', // Violet
    secondary: '06B6D4', // Cyan
    accent: '10B981', // Emerald
    text: '1F2937', // Dark slate
    textLight: '6B7280', // Medium slate
    background: 'FFFFFF', // White
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Export deck to PPTX format
   */
  async exportToPptx(deckId: string): Promise<Buffer> {
    this.logger.log(`Exporting deck ${deckId} to PPTX`);

    // Fetch deck with slides
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        slides: {
          orderBy: { order: 'asc' },
        },
        template: true,
        brandKit: true,
      },
    });

    if (!deck) {
      throw new Error('Deck not found');
    }

    // Get brand colors
    const brandColors = this.getBrandColors(deck.brandKit);

    // Create presentation
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Pitchonix';
    pptx.title = deck.title;
    
    // Set default font
    pptx.defineSlideMaster({
      title: 'MASTER_SLIDE',
      background: { color: brandColors.background },
      objects: [
        {
          text: {
            text: 'Pitchonix',
            options: {
              x: 0.5,
              y: 0.2,
              w: 1,
              h: 0.3,
              fontSize: 10,
              color: brandColors.textLight,
            },
          },
        },
      ],
    });

    // Add slides
    for (const slide of deck.slides) {
      this.addSlideToPptx(pptx, slide, brandColors);
    }

    // Generate buffer
    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    return buffer as Buffer;
  }

  /**
   * Get brand colors from brand kit or use defaults
   */
  private getBrandColors(brandKit: any): BrandColors {
    if (!brandKit) {
      return this.defaultColors;
    }

    return {
      primary: brandKit.primaryColor?.replace('#', '') || this.defaultColors.primary,
      secondary: brandKit.secondaryColor?.replace('#', '') || this.defaultColors.secondary,
      accent: this.defaultColors.accent,
      text: this.defaultColors.text,
      textLight: this.defaultColors.textLight,
      background: this.defaultColors.background,
    };
  }

  /**
   * Add a slide to the presentation based on its type
   */
  private addSlideToPptx(pptx: PptxGenJS, slideData: any, brandColors: BrandColors) {
    const slide = pptx.addSlide();

    switch (slideData.type) {
      case 'cover':
        this.addCoverSlide(slide, slideData, brandColors);
        break;
      case 'problem':
      case 'solution':
        this.addContentSlide(slide, slideData, brandColors);
        break;
      case 'market':
        this.addMarketSlide(slide, slideData, brandColors);
        break;
      case 'business_model':
        this.addBusinessModelSlide(slide, slideData, brandColors);
        break;
      case 'traction':
        this.addTractionSlide(slide, slideData, brandColors);
        break;
      case 'roadmap':
        this.addRoadmapSlide(slide, slideData, brandColors);
        break;
      case 'ask':
        this.addAskSlide(slide, slideData, brandColors);
        break;
      case 'team':
        this.addTeamSlide(slide, slideData, brandColors);
        break;
      case 'financials':
        this.addFinancialsSlide(slide, slideData, brandColors);
        break;
      default:
        this.addDefaultSlide(slide, slideData, brandColors);
    }
  }

  private addCoverSlide(slide: any, data: any, colors: BrandColors) {
    // Gradient background using brand colors
    slide.background = { 
      fill: `LINEAR_GRADIENT(90, ${colors.primary}, ${colors.secondary})`
    };

    // Add decorative shape
    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: '100%',
      h: 0.3,
      fill: { color: 'FFFFFF', transparency: 90 },
    });

    // Company name/logo area
    slide.addText('Pitchonix', {
      x: 0.5,
      y: 0.3,
      w: 2,
      h: 0.5,
      fontSize: 18,
      bold: true,
      color: 'FFFFFF',
    });

    // Main title
    slide.addText(data.title, {
      x: 0.5,
      y: 2.5,
      w: '90%',
      h: 1.5,
      fontSize: 54,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      shadow: {
        type: 'outer',
        blur: 3,
        offset: 2,
        angle: 45,
        color: '000000',
        opacity: 0.3,
      },
    });

    if (data.subtitle) {
      slide.addText(data.subtitle, {
        x: 0.5,
        y: 4.2,
        w: '90%',
        h: 0.8,
        fontSize: 28,
        color: 'FFFFFF',
        align: 'center',
        transparency: 20,
      });
    }

    // Decorative bottom bar
    slide.addShape('rect', {
      x: 0,
      y: 5.3,
      w: '100%',
      h: 0.05,
      fill: { color: 'FFFFFF', transparency: 50 },
    });
  }

  private addContentSlide(slide: any, data: any, colors: BrandColors) {
    // Add header bar
    slide.addShape('rect', {
      x: 0,
      y: 0,
      w: '100%',
      h: 0.8,
      fill: { color: colors.primary, transparency: 10 },
    });

    // Title with brand color accent
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.6,
      fontSize: 40,
      bold: true,
      color: colors.primary,
    });

    if (data.subtitle) {
      slide.addText(data.subtitle, {
        x: 0.5,
        y: 1.1,
        w: '90%',
        h: 0.5,
        fontSize: 20,
        color: colors.textLight,
      });
    }

    // Add content description with better formatting
    if (data.content.description) {
      slide.addText(data.content.description, {
        x: 0.5,
        y: 1.9,
        w: '90%',
        h: 1.2,
        fontSize: 18,
        color: colors.text,
        lineSpacing: 28,
      });
    }

    // Add bullet points with brand color bullets
    if (data.content.painPoints || data.content.features) {
      const items = data.content.painPoints || data.content.features;
      const bulletPoints = items.map((item: string) => ({
        text: item,
        options: {
          bullet: { type: 'number', color: colors.primary },
          fontSize: 16,
          color: colors.text,
          paraSpaceBefore: 12,
        },
      }));

      slide.addText(bulletPoints, {
        x: 1,
        y: 3.3,
        w: '85%',
        h: 2.0,
      });
    }
  }

  private addMarketSlide(slide: any, data: any, colors: BrandColors) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.6,
      fontSize: 40,
      bold: true,
      color: colors.primary,
    });

    // Add TAM/SAM/SOM with visual cards
    const markets = [
      { data: data.content.tam, color: colors.primary, x: 0.5 },
      { data: data.content.sam, color: colors.secondary, x: 3.5 },
      { data: data.content.som, color: colors.accent, x: 6.5 },
    ];

    markets.forEach((market) => {
      if (market.data) {
        // Card background
        slide.addShape('roundRect', {
          x: market.x,
          y: 1.8,
          w: 2.5,
          h: 2.5,
          fill: { color: market.color, transparency: 10 },
          line: { color: market.color, width: 2 },
          rectRadius: 0.2,
        });

        // Value
        slide.addText(market.data.value, {
          x: market.x,
          y: 2.3,
          w: 2.5,
          h: 0.8,
          fontSize: 36,
          bold: true,
          color: market.color,
          align: 'center',
        });

        // Label
        slide.addText(market.data.label, {
          x: market.x,
          y: 3.2,
          w: 2.5,
          h: 0.5,
          fontSize: 16,
          color: colors.text,
          align: 'center',
        });
      }
    });
  }

  private addBusinessModelSlide(slide: any, data: any, colors: BrandColors) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.6,
      fontSize: 40,
      bold: true,
      color: colors.primary,
    });

    // Add pricing tiers with cards
    if (data.content.pricing) {
      const tierColors = [colors.primary, colors.secondary, colors.accent];
      let xPos = 1;
      
      data.content.pricing.forEach((tier: any, index: number) => {
        const tierColor = tierColors[index % tierColors.length];
        
        // Card background
        slide.addShape('roundRect', {
          x: xPos,
          y: 1.8,
          w: 2.5,
          h: 3,
          fill: { color: tierColor, transparency: 5 },
          line: { color: tierColor, width: 2 },
          rectRadius: 0.2,
        });

        // Tier name
        slide.addText(tier.tier, {
          x: xPos,
          y: 2.0,
          w: 2.5,
          h: 0.5,
          fontSize: 20,
          bold: true,
          color: colors.text,
          align: 'center',
        });

        // Price
        slide.addText(tier.price, {
          x: xPos,
          y: 2.6,
          w: 2.5,
          h: 0.8,
          fontSize: 32,
          bold: true,
          color: tierColor,
          align: 'center',
        });

        xPos += 3;
      });
    }
  }

  private addTractionSlide(slide: any, data: any, colors: BrandColors) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.6,
      fontSize: 40,
      bold: true,
      color: colors.primary,
    });

    // Add metrics in grid
    if (data.content.metrics) {
      const metricsPerRow = 3;
      const cardWidth = 2.8;
      const cardHeight = 1.8;
      const spacing = 0.3;
      const startX = 0.5;
      const startY = 1.8;

      data.content.metrics.forEach((metric: any, index: number) => {
        const row = Math.floor(index / metricsPerRow);
        const col = index % metricsPerRow;
        const xPos = startX + col * (cardWidth + spacing);
        const yPos = startY + row * (cardHeight + spacing);

        // Card with gradient
        slide.addShape('roundRect', {
          x: xPos,
          y: yPos,
          w: cardWidth,
          h: cardHeight,
          fill: { color: colors.accent, transparency: 10 },
          line: { color: colors.accent, width: 2 },
          rectRadius: 0.15,
        });

        // Metric value
        slide.addText(metric.value, {
          x: xPos,
          y: yPos + 0.4,
          w: cardWidth,
          h: 0.6,
          fontSize: 36,
          bold: true,
          color: colors.accent,
          align: 'center',
        });

        // Metric label
        slide.addText(metric.label, {
          x: xPos,
          y: yPos + 1.1,
          w: cardWidth,
          h: 0.5,
          fontSize: 14,
          color: colors.text,
          align: 'center',
        });
      });
    }
  }

  private addRoadmapSlide(slide: any, data: any, colors: BrandColors) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.6,
      fontSize: 40,
      bold: true,
      color: colors.primary,
    });

    // Add timeline with phases
    if (data.content.phases) {
      const phaseColors = [colors.primary, colors.secondary, colors.accent];
      let xPos = 0.5;
      
      data.content.phases.forEach((phase: any, index: number) => {
        const phaseColor = phaseColors[index % phaseColors.length];
        
        // Timeline circle
        slide.addShape('ellipse', {
          x: xPos + 1.0,
          y: 1.5,
          w: 0.3,
          h: 0.3,
          fill: { color: phaseColor },
        });

        // Timeline line (except for last)
        if (index < data.content.phases.length - 1) {
          slide.addShape('line', {
            x: xPos + 1.3,
            y: 1.65,
            w: 2.5,
            h: 0,
            line: { color: phaseColor, width: 2, dashType: 'dash' },
          });
        }

        // Phase card
        slide.addShape('roundRect', {
          x: xPos,
          y: 2.0,
          w: 2.8,
          h: 2.8,
          fill: { color: phaseColor, transparency: 5 },
          line: { color: phaseColor, width: 2 },
          rectRadius: 0.15,
        });

        // Quarter/period
        slide.addText(phase.quarter, {
          x: xPos,
          y: 2.2,
          w: 2.8,
          h: 0.5,
          fontSize: 20,
          bold: true,
          color: phaseColor,
          align: 'center',
        });

        // Items
        const items = phase.items.map((item: string) => ({
          text: item,
          options: { bullet: true, fontSize: 12, color: colors.text },
        }));
        
        slide.addText(items, {
          x: xPos + 0.2,
          y: 2.9,
          w: 2.4,
          h: 1.8,
        });

        xPos += 3.0;
      });
    }
  }

  private addAskSlide(slide: any, data: any, colors: BrandColors) {
    // Gradient background
    slide.background = { 
      fill: `LINEAR_GRADIENT(90, ${colors.primary}, ${colors.secondary})`
    };

    slide.addText(data.title, {
      x: 0.5,
      y: 1.8,
      w: '90%',
      h: 0.8,
      fontSize: 48,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
    });

    if (data.content.amount) {
      // Amount in large text with shadow
      slide.addText(data.content.amount, {
        x: 0.5,
        y: 2.8,
        w: '90%',
        h: 1.2,
        fontSize: 72,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        shadow: {
          type: 'outer',
          blur: 3,
          offset: 2,
          angle: 45,
          color: '000000',
          opacity: 0.3,
        },
      });
    }

    if (data.content.description) {
      slide.addText(data.content.description, {
        x: 0.5,
        y: 4.3,
        w: '90%',
        h: 0.6,
        fontSize: 22,
        color: 'FFFFFF',
        align: 'center',
        transparency: 20,
      });
    }
  }

  private addTeamSlide(slide: any, data: any, colors: BrandColors) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.6,
      fontSize: 40,
      bold: true,
      color: colors.primary,
    });

    if (data.content.members) {
      const membersPerRow = 3;
      const cardWidth = 2.8;
      const spacing = 0.3;
      const startX = 0.5;
      const startY = 1.5;

      data.content.members.forEach((member: any, index: number) => {
        const col = index % membersPerRow;
        const row = Math.floor(index / membersPerRow);
        const xPos = startX + col * (cardWidth + spacing);
        const yPos = startY + row * 2.2;

        // Member card
        slide.addShape('roundRect', {
          x: xPos,
          y: yPos,
          w: cardWidth,
          h: 1.8,
          fill: { color: colors.primary, transparency: 5 },
          line: { color: colors.primary, width: 1 },
          rectRadius: 0.15,
        });

        // Name
        slide.addText(member.name, {
          x: xPos,
          y: yPos + 0.3,
          w: cardWidth,
          h: 0.4,
          fontSize: 18,
          bold: true,
          color: colors.text,
          align: 'center',
        });

        // Role
        slide.addText(member.role, {
          x: xPos,
          y: yPos + 0.8,
          w: cardWidth,
          h: 0.3,
          fontSize: 14,
          color: colors.primary,
          align: 'center',
        });

        // Bio (if available)
        if (member.bio) {
          slide.addText(member.bio, {
            x: xPos + 0.2,
            y: yPos + 1.2,
            w: cardWidth - 0.4,
            h: 0.5,
            fontSize: 10,
            color: colors.textLight,
            align: 'center',
          });
        }
      });
    }
  }

  private addFinancialsSlide(slide: any, data: any, colors: BrandColors) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.6,
      fontSize: 40,
      bold: true,
      color: colors.primary,
    });

    // Add simple table for financials
    if (data.content.projections) {
      const rows = [];
      const headers = ['Year', 'Revenue', 'Expenses', 'Profit'];
      
      rows.push(headers.map(h => ({ text: h, options: { bold: true, fill: colors.primary, color: 'FFFFFF' } })));
      
      data.content.projections.forEach((proj: any) => {
        rows.push([
          { text: proj.year },
          { text: proj.revenue, options: { color: colors.accent } },
          { text: proj.expenses, options: { color: colors.textLight } },
          { text: proj.profit, options: { color: colors.primary, bold: true } },
        ]);
      });

      slide.addTable(rows, {
        x: 1,
        y: 1.5,
        w: 8,
        fontSize: 14,
        border: { color: colors.primary, pt: 1 },
      });
    }
  }

  private addDefaultSlide(slide: any, data: any, colors: BrandColors) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: '90%',
      h: 0.6,
      fontSize: 40,
      bold: true,
      color: colors.primary,
    });

    if (data.subtitle) {
      slide.addText(data.subtitle, {
        x: 0.5,
        y: 1.2,
        w: '90%',
        h: 0.5,
        fontSize: 20,
        color: colors.textLight,
      });
    }

    // Add content if available
    if (data.content && typeof data.content === 'object') {
      const contentText = JSON.stringify(data.content, null, 2);
      slide.addText(contentText, {
        x: 0.5,
        y: 2.0,
        w: '90%',
        h: 3.0,
        fontSize: 14,
        color: colors.text,
        fontFace: 'Courier New',
      });
    }
  }

  private getExportsDir(): string {
    const dir = join(process.cwd(), 'exports');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Export deck to PPTX (accepts Deck object for batch export) — saves to disk
   */
  async exportToPPTX(deck: any): Promise<string> {
    this.logger.log(`Exporting deck ${deck.id} to PPTX`);

    // Get brand colors
    const brandColors = this.getBrandColors(deck.brandKit);

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Pitchonix';
    pptx.title = deck.title;

    if (deck.brandKit?.fontFamily) {
      pptx.theme = {
        headFontFace: deck.brandKit.fontFamily,
        bodyFontFace: deck.brandKit.fontFamily,
      };
    }

    for (const slide of deck.slides) {
      this.addSlideToPptx(pptx, slide, brandColors);
    }

    const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
    const fileName = `${deck.id}_${Date.now()}.pptx`;
    const filePath = join(this.getExportsDir(), fileName);
    await fs.promises.writeFile(filePath, buffer);

    return `/exports/${fileName}`;
  }

  /**
   * Export deck to PDF using puppeteer
   */
  async exportToPDF(deck: any, options: any = {}): Promise<string> {
    this.logger.log(`Exporting deck ${deck.id} to PDF`);

    const html = this.generateDeckHTML(deck);

    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });

      const fileName = `${deck.id}_${Date.now()}.pdf`;
      const filePath = join(this.getExportsDir(), fileName);
      await fs.promises.writeFile(filePath, pdfBuffer);

      return `/exports/${fileName}`;
    } finally {
      await browser.close();
    }
  }

  private generateDeckHTML(deck: any): string {
    const slides = (deck.slides || [])
      .map((slide: any) => {
        const bg = slide.type === 'cover' ? '#1F2937' : slide.type === 'ask' ? '#3B82F6' : '#FFFFFF';
        const textColor = slide.type === 'cover' || slide.type === 'ask' ? '#FFFFFF' : '#1F2937';
        const subtitleColor = slide.type === 'cover' ? '#9CA3AF' : '#6B7280';

        const bullets = slide.content?.painPoints || slide.content?.features || [];
        const bulletHTML = bullets.length
          ? `<ul style="list-style:disc;padding-left:1.5rem;margin-top:1rem;font-size:1rem;color:#4B5563;">${bullets.map((b: string) => `<li>${b}</li>`).join('')}</ul>`
          : '';

        return `
        <div style="width:297mm;height:210mm;display:flex;flex-direction:column;justify-content:center;align-items:center;background:${bg};padding:3rem;page-break-after:always;">
          <h1 style="font-size:2.5rem;font-weight:bold;color:${textColor};text-align:center;margin-bottom:0.75rem;">${slide.title || ''}</h1>
          ${slide.subtitle ? `<h2 style="font-size:1.5rem;color:${subtitleColor};text-align:center;margin-bottom:1rem;">${slide.subtitle}</h2>` : ''}
          ${slide.content?.description ? `<p style="font-size:1.1rem;color:${slide.type === 'cover' ? '#D1D5DB' : '#374151'};text-align:center;max-width:700px;">${slide.content.description}</p>` : ''}
          ${slide.content?.amount ? `<p style="font-size:3rem;font-weight:bold;color:#FFFFFF;text-align:center;">${slide.content.amount}</p>` : ''}
          ${bulletHTML}
        </div>`;
      })
      .join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;}@page{size:A4 landscape;margin:0;}</style></head><body>${slides}</body></html>`;
  }

  /**
   * Create export record
   */
  async createExportRecord(deckId: string, format: string) {
    return this.prisma.export.create({
      data: {
        deckId,
        format,
        status: 'processing',
      },
    });
  }

  /**
   * Update export record with file URL
   */
  async updateExportRecord(id: string, fileUrl: string) {
    return this.prisma.export.update({
      where: { id },
      data: {
        status: 'completed',
        fileUrl,
      },
    });
  }
}
