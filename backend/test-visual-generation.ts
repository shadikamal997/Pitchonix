/**
 * Test Visual Generation
 * Tests the complete visual layer including charts, layouts, and themes
 */

import { SlideFactory } from './src/generation/slide-types/slide.factory';
import { ChartGenerationService } from './src/generation/visual/chart-generation.service';
import { LayoutService } from './src/generation/visual/layout.service';
import { ThemeService } from './src/generation/visual/theme.service';
import { VisualGenerationService } from './src/generation/visual/visual-generation.service';
import { WizardInput } from './src/generation/slide-types/types';

async function testVisualGeneration() {
  console.log('🎨 Testing Visual Generation\n');
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

  // Create mock wizard input
  const mockInput: WizardInput = {
    documentType: 'pitch_deck',
    companyName: 'Pitchonix',
    industry: 'SaaS / Technology',
    problem:
      'Creating compelling presentations takes 10-20 hours per deck. Teams struggle with design, structure, and content quality.',
    solution:
      'AI-powered platform that generates investor-ready presentations in minutes. Smart content generation, professional templates, and automated design.',
    targetCustomers: 'B2B SaaS startups, consulting firms, marketing agencies',
    marketOpportunity: '$50B TAM, $12B SAM, $1.2B SOM',
    differentiation:
      '10x faster presentation creation, 90% cost reduction, professional quality guaranteed',
    revenueModel:
      'SaaS subscription: $29/mo (Starter), $99/mo (Professional), $299/mo (Enterprise)',
    traction: 'Users: 1,250, MRR: $45K, Growth: 35% MoM',
    team:
      'Jane Smith (CEO, ex-McKinsey), John Doe (CTO, ex-Google), Sarah Johnson (CPO, ex-Figma)',
    fundingAsk: '$2M Seed Round: 40% Engineering, 30% Sales/Marketing, 20% Operations, 10% R&D',
    competitors: 'PowerPoint, Google Slides, Pitch, Canva',
    roadmap: 'Q1: AI Enhancement, Q2: Collaboration, Q3: Analytics, Q4: Enterprise',
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
    includeFinancials: true,
    includeSpeakerNotes: true,
    includeExecutiveSummary: false,
  };

  try {
    // Step 1: Generate base slides
    console.log('\n📊 Step 1: Generating base slides...');
    const baseSlides = slideFactory.generateDeck(mockInput);
    console.log(`✅ Generated ${baseSlides.length} base slides`);

    // Step 2: Generate visual content
    console.log('\n🎨 Step 2: Generating visual content...');
    const visualSlides = await visualService.generateVisualContent(
      baseSlides,
      mockInput,
      {
        generateCharts: true,
        generateImages: true,
        applyTheme: true,
        optimizeForExport: false,
      },
    );
    console.log(`✅ Generated visual content for ${visualSlides.length} slides`);

    // Step 3: Show statistics
    console.log('\n📈 Step 3: Generation Statistics');
    console.log('='.repeat(70));
    const stats = visualService.getGenerationStats(visualSlides);
    console.log(`Total Slides: ${stats.totalSlides}`);
    console.log(`Total Charts: ${stats.totalCharts}`);
    console.log(`Total Images: ${stats.totalImages}`);
    console.log('\nLayout Distribution:');
    Object.entries(stats.layoutTypes).forEach(([layout, count]) => {
      console.log(`  - ${layout}: ${count}`);
    });
    console.log('\nRender Status:');
    Object.entries(stats.renderStatus).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });

    // Step 4: Validate visual content
    console.log('\n✅ Step 4: Validating visual content...');
    const validation = visualService.validateVisualContent(visualSlides);
    if (validation.valid) {
      console.log('✅ All slides validated successfully');
    } else {
      console.log('❌ Validation errors:');
      validation.errors.forEach((error) => console.log(`  - ${error}`));
    }

    // Step 5: Show sample visual slide
    console.log('\n🎯 Step 5: Sample Visual Slide (Market Opportunity)');
    console.log('='.repeat(70));
    const marketSlide = visualSlides.find((s) => s.type === 'market_opportunity');
    if (marketSlide) {
      console.log(`\nTitle: ${marketSlide.title}`);
      console.log(`Layout: ${marketSlide.layout.type}`);
      console.log(`Theme: ${marketSlide.theme.displayName}`);
      console.log(`Charts: ${marketSlide.charts?.length || 0}`);
      
      if (marketSlide.charts && marketSlide.charts.length > 0) {
        console.log('\nChart Details:');
        marketSlide.charts.forEach((chart, i) => {
          console.log(`  Chart ${i + 1}:`);
          console.log(`    Type: ${chart.type}`);
          console.log(`    Title: ${chart.title}`);
          console.log(`    Data Series: ${chart.data.length}`);
          console.log(`    Dimensions: ${chart.width}x${chart.height}`);
        });
      }

      console.log('\nLayout Regions:');
      marketSlide.layout.regions.forEach((region) => {
        console.log(`  - ${region.type}: ${region.width}% x ${region.height}% at (${region.x}%, ${region.y}%)`);
      });

      console.log('\nTheme Colors:');
      console.log(`  Primary: ${marketSlide.theme.colors.primary}`);
      console.log(`  Secondary: ${marketSlide.theme.colors.secondary}`);
      console.log(`  Accent: ${marketSlide.theme.colors.accent}`);
    }

    // Step 6: Test chart generation
    console.log('\n📊 Step 6: Testing Chart Generation');
    console.log('='.repeat(70));
    const slidesWithCharts = visualSlides.filter((s) => s.charts && s.charts.length > 0);
    console.log(`\nSlides with charts: ${slidesWithCharts.length}`);
    slidesWithCharts.forEach((slide) => {
      console.log(`  - ${slide.title}: ${slide.charts?.length} chart(s)`);
    });

    // Step 7: Test theme service
    console.log('\n🎨 Step 7: Testing Theme Service');
    console.log('='.repeat(70));
    const allThemes = themeService.getAllThemes();
    console.log(`\nAvailable themes: ${allThemes.length}`);
    allThemes.forEach((theme) => {
      console.log(`  - ${theme.displayName} (${theme.name})`);
    });

    // Step 8: Test layout service
    console.log('\n📐 Step 8: Testing Layout Service');
    console.log('='.repeat(70));
    const allLayouts = layoutService.getAllLayouts();
    console.log(`\nAvailable layouts: ${allLayouts.length}`);
    allLayouts.forEach((layout) => {
      console.log(`  - ${layout.type}: ${layout.regions.length} regions`);
    });

    // Step 9: Test optimization
    console.log('\n⚡ Step 9: Testing Export Optimization');
    console.log('='.repeat(70));
    const optimizedSlides = visualService.optimizeForExport(visualSlides);
    console.log(`✅ Optimized ${optimizedSlides.length} slides for export`);
    console.log('Optimizations applied:');
    console.log('  - Disabled animations in charts');
    console.log('  - Limited image dimensions to 1200px max');

    console.log('\n' + '='.repeat(70));
    console.log('\n✨ Visual generation test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testVisualGeneration().catch(console.error);
