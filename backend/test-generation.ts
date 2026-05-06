/**
 * Test script for slide generation
 * Run with: ts-node test-generation.ts
 */

import { SlideFactory } from './src/generation/slide-types/slide.factory';
import { WizardInput, SlideType } from './src/generation/slide-types/types';

// Sample wizard input data
const mockInput: WizardInput = {
  // Document settings
  documentType: 'pitch_deck',
  slideCount: 10,
  contentDepth: 'balanced',
  includeCharts: true,
  includeFinancials: false,
  includeExecutiveSummary: true,

  // Company info
  companyName: 'Pitchonix',
  shortDescription: 'AI-powered presentation generation platform',
  productService: 'Pitchonix Platform',
  industry: 'SaaS / Business Software',
  country: 'United States',
  website: 'https://pitchonix.com',
  businessStage: 'seed',

  // Core content
  problem: 'Creating compelling presentations takes 10-20 hours per deck. Teams struggle with design, structure, and content quality. Most tools are either too basic or require design expertise.',
  solution: 'Pitchonix uses AI to generate complete, professional presentations in minutes. Our platform analyzes your business data, creates structured narratives, and applies beautiful designs automatically. Features include: intelligent content generation, 50+ professional templates, real-time collaboration, and export to PowerPoint/PDF.',
  differentiation: '10x faster than traditional methods, AI-powered content generation, no design skills needed',

  // Market & business
  marketOpportunity: 'The global presentation software market is $3.2B and growing at 8% CAGR. TAM: $3.2B, SAM: $800M (B2B SaaS focus), SOM: $80M (startups and SMBs). Key trends: AI adoption, remote work, content automation.',
  targetCustomers: 'B2B SaaS startups, consulting firms, marketing agencies',
  competitors: 'PowerPoint, Google Slides, Canva, Beautiful.ai, Gamma',
  revenueModel: 'Subscription-based SaaS. Starter: $99/mo, Professional: $299/mo, Enterprise: Custom pricing. LTV: $12,000, CAC: $1,200, 10:1 ratio.',
  pricing: 'Starter $99/mo: 10 decks/month, basic templates. Pro $299/mo: unlimited decks, AI features, priority support. Enterprise: custom pricing, white-label, dedicated support.',

  // Traction & team
  traction: '500 active users, $25K MRR, 150% monthly growth. Launched 3 months ago. 85 NPS score. Featured on Product Hunt (#3 product of the day).',
  team: 'John Smith (CEO): Former VP Product at Salesforce, 15 years in SaaS. Jane Doe (CTO): Ex-Google engineer, ML specialist. Mike Johnson (VP Product): Product leader from Atlassian.',
  roadmap: 'Q1 2025: AI presenter notes, video export. Q2 2025: Team collaboration, version control. Q3 2025: Enterprise features, SSO, API access. Q4 2025: Mobile apps, advanced analytics.',

  // Ask
  fundingAsk: 'Raising $2M seed round to accelerate growth. 50% engineering ($1M), 30% sales & marketing ($600K), 20% operations ($400K). Target: 10K users, $500K ARR by end of year.',
  desiredAction: 'Join us in transforming how teams create presentations',

  // Preferences
  tone: 'professional',
  audience: 'investors',
  visualStyle: 'modern',
  theme: 'default',
  fontStyle: 'sans-serif',
  includeSpeakerNotes: true,
  brandColors: {
    primary: '#4F46E5',
    secondary: '#10B981',
    accent: '#F59E0B',
  },
};

async function testGeneration() {
  console.log('🧪 Testing Slide Generation\n');
  console.log('='.repeat(60));

  try {
    const factory = new SlideFactory();
    console.log('✅ SlideFactory initialized');

    // Get available slide types
    const availableTypes = factory.getAvailableSlideTypes();
    console.log(`\n📊 Available slide types: ${availableTypes.length}`);
    console.log(availableTypes.join(', '));

    // Generate deck
    console.log('\n🚀 Generating deck...\n');
    const slides = factory.generateDeck(mockInput);

    console.log(`✅ Generated ${slides.length} slides:\n`);
    
    slides.forEach((slide) => {
      console.log(`${slide.order}. [${slide.type}] ${slide.title}`);
      if (slide.subtitle) {
        console.log(`   Subtitle: ${slide.subtitle}`);
      }
      console.log(`   Quality Score: ${slide.qualityScore}/100`);
      console.log(`   Layout: ${slide.layoutKey} | Theme: ${slide.themeKey}`);
      console.log('');
    });

    // Validate content structure
    console.log('='.repeat(60));
    console.log('\n🔍 Validation Results:\n');

    const validations = {
      'All slides have type': slides.every(s => !!s.type),
      'All slides have title': slides.every(s => !!s.title),
      'All slides have content': slides.every(s => !!s.content),
      'All slides have order': slides.every(s => s.order > 0),
      'All slides have quality score': slides.every(s => s.qualityScore !== undefined),
      'Slides are ordered correctly': slides.every((s, i) => s.order === i + 1),
      'Cover is first': slides[0].type === SlideType.COVER,
    };

    Object.entries(validations).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
    });

    // Show sample content from a few slides
    console.log('\n='.repeat(60));
    console.log('\n📄 Sample Slide Content:\n');

    // Problem slide
    const problemSlide = slides.find(s => s.type === SlideType.PROBLEM);
    if (problemSlide) {
      console.log('Problem Slide Content:');
      console.log(JSON.stringify(problemSlide.content, null, 2));
      console.log('');
    }

    // Solution slide
    const solutionSlide = slides.find(s => s.type === SlideType.SOLUTION);
    if (solutionSlide) {
      console.log('Solution Slide Content:');
      console.log(JSON.stringify(solutionSlide.content, null, 2));
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('\n✨ Test completed successfully!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testGeneration();
