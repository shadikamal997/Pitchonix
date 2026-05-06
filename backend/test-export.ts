/**
 * Test Export Functionality
 * Tests PowerPoint, PDF, and HTML export
 */

import { SlideFactory } from './src/generation/slide-types/slide.factory';
import { VisualGenerationService } from './src/generation/visual/visual-generation.service';
import { ChartGenerationService } from './src/generation/visual/chart-generation.service';
import { LayoutService } from './src/generation/visual/layout.service';
import { ThemeService } from './src/generation/visual/theme.service';
import { ExportService, ExportFormat } from './src/generation/export/export.service';
import { ChartRenderingService } from './src/generation/export/chart-rendering.service';
import { PowerPointExportService } from './src/generation/export/powerpoint-export.service';
import { PDFExportService } from './src/generation/export/pdf-export.service';
import { HTMLPreviewService } from './src/generation/export/html-preview.service';
import { WizardInput } from './src/generation/slide-types/types';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testExport() {
  console.log('📦 Testing Export Functionality\n');
  console.log('='.repeat(70));

  // Initialize services
  const chartService = new ChartGenerationService();
  const layoutService = new LayoutService();
  const themeService = new ThemeService();
  const visualService = new VisualGenerationService(
    chartService,
    layoutService,
    themeService,
  );
  const slideFactory = new SlideFactory();

  const chartRenderingService = new ChartRenderingService();
  const htmlPreviewService = new HTMLPreviewService(chartRenderingService);
  const powerPointExportService = new PowerPointExportService(
    chartRenderingService,
  );
  const pdfExportService = new PDFExportService(htmlPreviewService);
  const exportService = new ExportService(
    powerPointExportService,
    pdfExportService,
    htmlPreviewService,
  );

  // Create mock wizard input
  const mockInput: WizardInput = {
    documentType: 'pitch_deck',
    companyName: 'Pitchonix',
    industry: 'SaaS / Technology',
    problem:
      'Creating compelling presentations takes 10-20 hours per deck. Teams struggle with design, structure, and content quality.',
    solution:
      'AI-powered platform that generates investor-ready presentations in minutes.',
    targetCustomers: 'B2B SaaS startups, consulting firms, marketing agencies',
    marketOpportunity: '$50B TAM, $12B SAM, $1.2B SOM',
    differentiation: '10x faster, AI-powered, professional quality guaranteed',
    revenueModel: 'SaaS subscription',
    traction: 'Users: 1,250, MRR: $45K, Growth: 35% MoM',
    team: 'Jane Smith (CEO), John Doe (CTO), Sarah Johnson (CPO)',
    fundingAsk: '$2M Seed Round',
    competitors: 'PowerPoint, Google Slides, Pitch',
    roadmap: 'Q1: AI Enhancement, Q2: Collaboration, Q3: Analytics',
    audience: 'investors',
    tone: 'professional',
    theme: 'modern',
    brandColors: {
      primary: '#4F46E5',
      secondary: '#10B981',
      accent: '#F59E0B',
    },
    fontStyle: 'sans-serif',
    visualStyle: 'professional',
    slideCount: 10,
    contentDepth: 'balanced',
    includeCharts: true,
    includeFinancials: false,
    includeSpeakerNotes: true,
    includeExecutiveSummary: false,
  };

  try {
    // Step 1: Generate presentation
    console.log('\n📊 Step 1: Generating Presentation');
    console.log('='.repeat(70));
    const baseSlides = slideFactory.generateDeck(mockInput);
    console.log(`✅ Generated ${baseSlides.length} base slides`);

    const visualSlides = await visualService.generateVisualContent(
      baseSlides,
      mockInput,
      {
        generateCharts: true,
        generateImages: false, // Disable for export test
        applyTheme: true,
      },
    );
    console.log(`✅ Generated visual content`);

    // Create exports directory
    const exportsDir = path.join(process.cwd(), 'exports');
    await fs.mkdir(exportsDir, { recursive: true });

    // Step 2: Export info
    console.log('\n📈 Step 2: Export Info');
    console.log('='.repeat(70));
    const exportInfo = exportService.getExportInfo(visualSlides);
    console.log(`Slide Count: ${exportInfo.slideCount}`);
    console.log(`Charts: ${exportInfo.chartsCount}`);
    console.log(`Images: ${exportInfo.imagesCount}`);
    console.log('\nEstimated Sizes:');
    console.log(`  PowerPoint: ${exportInfo.estimatedSizes.pptx}`);
    console.log(`  PDF: ${exportInfo.estimatedSizes.pdf}`);
    console.log(`  HTML: ${exportInfo.estimatedSizes.html}`);

    // Step 3: Export to PowerPoint
    console.log('\n📄 Step 3: Exporting to PowerPoint');
    console.log('='.repeat(70));
    const pptxResult = await exportService.export(visualSlides, {
      format: ExportFormat.PPTX,
      title: 'Pitchonix Pitch Deck',
      author: 'Pitchonix',
      company: 'Pitchonix Inc.',
      fileName: 'pitch-deck.pptx',
    });
    await fs.writeFile(
      path.join(exportsDir, pptxResult.fileName),
      pptxResult.buffer,
    );
    console.log(`✅ PowerPoint export complete`);
    console.log(`   File: ${pptxResult.fileName}`);
    console.log(`   Size: ${formatBytes(pptxResult.size)}`);
    console.log(`   Slides: ${pptxResult.slideCount}`);

    // Step 4: Export to HTML
    console.log('\n🌐 Step 4: Exporting to HTML');
    console.log('='.repeat(70));
    const htmlResult = await exportService.export(visualSlides, {
      format: ExportFormat.HTML,
      title: 'Pitchonix Pitch Deck',
      includeControls: true,
      fileName: 'pitch-deck.html',
    });
    await fs.writeFile(
      path.join(exportsDir, htmlResult.fileName),
      htmlResult.buffer,
    );
    console.log(`✅ HTML export complete`);
    console.log(`   File: ${htmlResult.fileName}`);
    console.log(`   Size: ${formatBytes(htmlResult.size)}`);
    console.log(`   Slides: ${htmlResult.slideCount}`);

    // Step 5: Export to PDF (may take longer)
    console.log('\n📑 Step 5: Exporting to PDF');
    console.log('='.repeat(70));
    console.log('⏳ Launching headless browser...');
    const pdfResult = await exportService.export(visualSlides, {
      format: ExportFormat.PDF,
      title: 'Pitchonix Pitch Deck',
      landscape: true,
      pageSize: 'A4',
      fileName: 'pitch-deck.pdf',
    });
    await fs.writeFile(
      path.join(exportsDir, pdfResult.fileName),
      pdfResult.buffer,
    );
    console.log(`✅ PDF export complete`);
    console.log(`   File: ${pdfResult.fileName}`);
    console.log(`   Size: ${formatBytes(pdfResult.size)}`);
    console.log(`   Slides: ${pdfResult.slideCount}`);

    // Step 6: Multiple formats at once
    console.log('\n📦 Step 6: Batch Export (All Formats)');
    console.log('='.repeat(70));
    const batchResults = await exportService.exportMultiple(
      visualSlides,
      [ExportFormat.PPTX, ExportFormat.PDF, ExportFormat.HTML],
      {
        title: 'Pitchonix Deck - Batch Export',
        author: 'Pitchonix',
      },
    );
    console.log(`✅ Batch export complete: ${batchResults.length} formats`);
    batchResults.forEach((result, i) => {
      console.log(
        `   ${i + 1}. ${result.format.toUpperCase()}: ${formatBytes(result.size)}`,
      );
    });

    // Step 7: Summary
    console.log('\n📊 Step 7: Export Summary');
    console.log('='.repeat(70));
    const files = await fs.readdir(exportsDir);
    console.log(`\nExported files in ./exports/:`);
    for (const file of files) {
      const stats = await fs.stat(path.join(exportsDir, file));
      console.log(`  - ${file} (${formatBytes(stats.size)})`);
    }

    console.log('\n💡 Tips:');
    console.log('  • Open pitch-deck.pptx in PowerPoint or Google Slides');
    console.log('  • Open pitch-deck.html in your browser for preview');
    console.log('  • pitch-deck.pdf is ready for sharing');

    // Cleanup
    await exportService.cleanup();
    console.log('\n✅ Cleanup complete');

    console.log('\n' + '='.repeat(70));
    console.log('\n✨ All export tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Run the test
testExport().catch(console.error);
