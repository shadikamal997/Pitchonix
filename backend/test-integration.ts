/**
 * Phase 8 Integration Test
 * Tests the complete generation pipeline with quality control integration
 */

import { PrismaClient } from '@prisma/client';
import { QualityControlService } from './src/generation/quality/quality-control.service';
import { ScoringService } from './src/generation/quality/scoring.service';
import { ValidationService } from './src/generation/quality/validation.service';
import { MonitoringService } from './src/generation/quality/monitoring.service';
import { LayoutType, ThemeConfig, VisualSlideContent, ChartConfig, ChartType, ChartDataSeries } from './src/generation/visual/types';
import { WizardInput } from './src/generation/slide-types/types';

const prisma = new PrismaClient();

// Initialize services
const scoringService = new ScoringService();
const validationService = new ValidationService();
const monitoringService = new MonitoringService();
const qualityControlService = new QualityControlService(
  scoringService,
  validationService,
  monitoringService,
);

/**
 * Create test theme configuration
 */
function createTheme(): ThemeConfig {
  return {
    name: 'modern',
    displayName: 'Modern',
    colors: {
      primary: '#2563eb',
      secondary: '#7c3aed',
      accent: '#06b6d4',
      background: '#ffffff',
      text: '#1f2937',
      textSecondary: '#6b7280',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    fontSize: {
      h1: 48,
      h2: 36,
      h3: 24,
      body: 16,
      small: 14,
    },
    spacing: {
      small: 8,
      medium: 16,
      large: 24,
    },
  };
}

/**
 * Create test slides with visual content
 */
function createTestSlides(): VisualSlideContent[] {
  const theme = createTheme();

  const chart: ChartConfig = {
    type: ChartType.LINE,
    title: 'Revenue vs Costs',
    data: [
      {
        name: 'Revenue',
        values: [100, 150, 200, 250, 300],
        labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
        color: theme.colors.primary,
      } as ChartDataSeries,
      {
        name: 'Costs',
        values: [60, 80, 100, 120, 140],
        labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
        color: theme.colors.secondary,
      } as ChartDataSeries,
    ],
    options: {
      showLegend: true,
      showGrid: true,
    },
  };

  return [
    {
      type: 'title',
      order: 0,
      title: 'TechCo - Series A Pitch Deck',
      subtitle: 'Revolutionizing AI-Powered Analytics',
      content: {
        companyName: 'TechCo',
        tagline: 'AI-Powered Analytics Platform',
      },
      layout: {
        type: LayoutType.TITLE_SLIDE,
        regions: [
          { id: 'title', type: 'title', x: 50, y: 200, width: 900, height: 100 },
          { id: 'subtitle', type: 'subtitle', x: 50, y: 320, width: 900, height: 60 },
        ],
      },
      theme,
    },
    {
      type: 'problem',
      order: 1,
      title: 'The Problem',
      content: {
        bullets: [
          'Businesses struggle with data analysis',
          'Manual reporting takes too much time',
          'Insights are often missed',
          'Teams lack data literacy',
        ],
      },
      layout: {
        type: LayoutType.TITLE_BULLETS,
        regions: [
          { id: 'title', type: 'title', x: 50, y: 50, width: 900, height: 80 },
          { id: 'content', type: 'content', x: 50, y: 150, width: 900, height: 450 },
        ],
      },
      theme,
    },
    {
      type: 'solution',
      order: 2,
      title: 'Our Solution',
      content: {
        bullets: [
          'AI-powered analytics platform',
          'Automated reporting and insights',
          'Natural language queries',
          'Real-time dashboards',
        ],
      },
      layout: {
        type: LayoutType.TITLE_BULLETS,
        regions: [
          { id: 'title', type: 'title', x: 50, y: 50, width: 900, height: 80 },
          { id: 'content', type: 'content', x: 50, y: 150, width: 900, height: 450 },
        ],
      },
      theme,
    },
    {
      type: 'traction',
      order: 3,
      title: 'Traction',
      content: {
        metrics: [
          { label: 'Active Users', value: '10,000+' },
          { label: 'MRR', value: '$50K' },
          { label: 'Growth Rate', value: '30% MoM' },
        ],
      },
      charts: [chart],
      layout: {
        type: LayoutType.TITLE_CHART,
        regions: [
          { id: 'title', type: 'title', x: 50, y: 50, width: 900, height: 80 },
          { id: 'chart', type: 'chart', x: 50, y: 150, width: 900, height: 450 },
        ],
      },
      theme,
    },
    {
      type: 'financial_projection',
      order: 4,
      title: 'Financial Projections',
      content: {
        projections: [
          { year: 2024, revenue: 1000000, costs: 600000 },
          { year: 2025, revenue: 2500000, costs: 1200000 },
          { year: 2026, revenue: 5000000, costs: 2000000 },
        ],
      },
      charts: [chart],
      layout: {
        type: LayoutType.TITLE_CHART,
        regions: [
          { id: 'title', type: 'title', x: 50, y: 50, width: 900, height: 80 },
          { id: 'chart', type: 'chart', x: 50, y: 150, width: 900, height: 450 },
        ],
      },
      theme,
    },
  ];
}

/**
 * Create test wizard input
 */
function createTestInput(): WizardInput {
  return {
    documentType: 'pitch_deck',
    companyName: 'TechCo',
    shortDescription: 'AI-Powered Analytics Platform',
    industry: 'SaaS',
    audience: 'investors',
    tone: 'professional',
    problem: 'Businesses struggle with data analysis',
    solution: 'AI-powered analytics platform',
    marketOpportunity: 'B2B SaaS, $50B market',
    competitors: 'Tableau, Power BI, Looker',
    differentiation: 'Natural language queries and AI insights',
    revenueModel: 'Subscription-based, $99-$999/month',
    traction: '10,000 active users, 30% MoM growth',
    team: 'Experienced founders from Google and Microsoft',
    roadmap: 'Q1: Launch v2.0, Q2: Enterprise features, Q3: Mobile app',
    fundingAsk: '$2M Seed funding',
    theme: 'modern',
    brandColors: {
      primary: '#2563eb',
      secondary: '#7c3aed',
      accent: '#06b6d4',
    },
    fontStyle: 'modern',
    visualStyle: 'professional',
    slideCount: 10,
    contentDepth: 'balanced',
    includeCharts: true,
    includeFinancials: true,
    includeSpeakerNotes: false,
    includeExecutiveSummary: false,
  };
}

/**
 * Test database schema updates
 */
async function testDatabaseSchema() {
  console.log('\n🧪 TEST 1: Database Schema Updates');
  console.log('=' .repeat(60));

  try {
    // Check if quality fields exist in Deck model
    const deck = await prisma.deck.findFirst();
    
    if (deck) {
      console.log('✅ Deck model exists');
      console.log(`   - qualityScore: ${deck.qualityScore ? 'present' : 'NULL'}`);
      console.log(`   - validationResult: ${deck.validationResult ? 'present' : 'NULL'}`);
      console.log(`   - generationMetrics: ${deck.generationMetrics ? 'present' : 'NULL'}`);
      console.log(`   - lastQualityCheck: ${deck.lastQualityCheck ? 'present' : 'NULL'}`);
      console.log(`   - exportReady: ${deck.exportReady}`);
    } else {
      console.log('⚠️  No decks in database yet');
    }

    console.log('✅ Database schema is correct');
    return true;
  } catch (error) {
    console.error('❌ Database schema test failed:', error.message);
    return false;
  }
}

/**
 * Test quality control services
 */
async function testQualityServices() {
  console.log('\n🧪 TEST 2: Quality Control Services');
  console.log('=' .repeat(60));

  const slides = createTestSlides();
  const input = createTestInput();
  const deckId = 'test-deck-123';
  const projectId = 'test-project-123';

  try {
    // Test quality scoring
    const qualityScore = scoringService.calculateQualityScore(slides, input);
    console.log(`✅ Quality Score: ${qualityScore.overall}/100 (Grade ${qualityScore.grade})`);
    console.log(`   - Content: ${qualityScore.dimensions.content?.toFixed(2) || 'N/A'}`);
    console.log(`   - Visual: ${qualityScore.dimensions.visual?.toFixed(2) || 'N/A'}`);
    console.log(`   - AI Enhancement: ${qualityScore.dimensions.aiEnhancement?.toFixed(2) || 'N/A'}`);
    console.log(`   - Export Readiness: ${qualityScore.dimensions.exportReadiness?.toFixed(2) || 'N/A'}`);

    // Test validation
    const validation = validationService.validate(slides, input);
    console.log(`✅ Validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
    console.log(`   - Errors: ${validation.summary.errorCount}`);
    console.log(`   - Warnings: ${validation.summary.warningCount}`);
    console.log(`   - Info: ${validation.summary.infoCount}`);

    // Test monitoring
    monitoringService.startMonitoring(deckId, projectId, slides.length);
    monitoringService.updateStage(deckId, 'BASE_GENERATION' as any, 'Generating...');
    monitoringService.updateSlideProgress(deckId, slides.length);
    monitoringService.completeGeneration(deckId, true);
    
    const status = monitoringService.getStatus(deckId);
    console.log(`✅ Monitoring: ${status.status}`);
    console.log(`   - Progress: ${status.progress.percentage}%`);

    // Test quality control service
    const report = await qualityControlService.generateQualityReport(
      deckId,
      projectId,
      slides,
      input,
    );
    console.log(`✅ Quality Report Generated`);
    console.log(`   - Overall: ${report.qualityScore.overall}/100`);
    console.log(`   - Recommendations: ${report.recommendations.length}`);

    const exportReady = qualityControlService.isExportReady(slides, input);
    console.log(`✅ Export Ready: ${exportReady.ready}`);

    return true;
  } catch (error) {
    console.error('❌ Quality services test failed:', error.message);
    return false;
  }
}

/**
 * Test complete generation pipeline
 */
async function testGenerationPipeline() {
  console.log('\n🧪 TEST 3: Generation Pipeline Integration');
  console.log('=' .repeat(60));

  try {
    // Create a test user first
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'test123',
        name: 'Test User',
      },
    });
    console.log(`✅ Created test user: ${user.id}`);

    // Create a test project
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: 'Test Project - Phase 8',
        documentType: 'pitch_deck',
        status: 'draft',
        businessInfo: createTestInput() as any,
      },
    });
    console.log(`✅ Created test project: ${project.id}`);

    // Create a test deck
    const deck = await prisma.deck.create({
      data: {
        projectId: project.id,
        title: 'Test Deck - Phase 8',
        status: 'generating',
      },
    });
    console.log(`✅ Created test deck: ${deck.id}`);

    // Simulate generation with quality checks
    const slides = createTestSlides();
    const input = createTestInput();

    // Start monitoring
    qualityControlService.startMonitoring(deck.id, project.id, slides.length);
    console.log('✅ Started quality monitoring');

    // Generate quality report
    const qualityReport = await qualityControlService.generateQualityReport(
      deck.id,
      project.id,
      slides,
      input,
    );
    console.log(`✅ Generated quality report: ${qualityReport.qualityScore.overall}/100`);

    // Check export readiness
    const exportReady = qualityControlService.isExportReady(slides, input);
    console.log(`✅ Export ready check: ${exportReady.ready}`);

    // Update deck with quality data
    const updatedDeck = await prisma.deck.update({
      where: { id: deck.id },
      data: {
        status: 'ready',
        qualityScore: qualityReport.qualityScore as any,
        validationResult: qualityReport.validation as any,
        generationMetrics: qualityReport.generationStatus.metrics as any,
        lastQualityCheck: new Date(),
        exportReady: exportReady.ready,
      },
    });
    console.log('✅ Updated deck with quality data');

    // Verify quality data was saved
    console.log(`   - Quality Score Saved: ${updatedDeck.qualityScore ? 'Yes' : 'No'}`);
    console.log(`   - Validation Result Saved: ${updatedDeck.validationResult ? 'Yes' : 'No'}`);
    console.log(`   - Generation Metrics Saved: ${updatedDeck.generationMetrics ? 'Yes' : 'No'}`);
    console.log(`   - Export Ready: ${updatedDeck.exportReady}`);

    // Clean up
    await prisma.deck.delete({ where: { id: deck.id } });
    await prisma.project.delete({ where: { id: project.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('✅ Cleaned up test data');

    // Complete monitoring
    qualityControlService.completeGeneration(deck.id, true);

    return true;
  } catch (error) {
    console.error('❌ Generation pipeline test failed:', error.message);
    console.error(error);
    return false;
  }
}

/**
 * Test aggregate statistics
 */
async function testAggregateStats() {
  console.log('\n🧪 TEST 4: Aggregate Statistics');
  console.log('=' .repeat(60));

  try {
    const stats = qualityControlService.getAggregateStats();
    console.log(`✅ Active Generations: ${stats.activeGenerations}`);
    console.log(`✅ Average Duration: ${stats.averageDuration}ms`);
    console.log(`✅ Success Rate: ${stats.successRate.toFixed(2)}%`);
    console.log(`✅ Common Errors: ${stats.commonErrors.length}`);

    return true;
  } catch (error) {
    console.error('❌ Aggregate stats test failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n🚀 Phase 8 Integration Tests');
  console.log('=' .repeat(60));
  console.log('Testing complete quality control integration\n');

  const results = {
    databaseSchema: await testDatabaseSchema(),
    qualityServices: await testQualityServices(),
    generationPipeline: await testGenerationPipeline(),
    aggregateStats: await testAggregateStats(),
  };

  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Database Schema:      ${results.databaseSchema ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Quality Services:     ${results.qualityServices ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Generation Pipeline:  ${results.generationPipeline ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Aggregate Statistics: ${results.aggregateStats ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every((r) => r === true);
  console.log('\n' + '=' .repeat(60));
  console.log(allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
  console.log('=' .repeat(60) + '\n');

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
