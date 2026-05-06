/**
 * Test script for AI-enhanced slide generation
 * Run with: ts-node test-ai-enhancement.ts
 * 
 * NOTE: Requires valid OPENAI_API_KEY in .env
 */

import { AIEnhancementService } from './src/generation/ai-enhancement.service';
import { SlideFactory } from './src/generation/slide-types/slide.factory';
import { WizardInput, SlideType } from './src/generation/slide-types/types';

// Sample wizard input
const mockInput: WizardInput = {
  documentType: 'pitch_deck',
  slideCount: 10,
  contentDepth: 'balanced',
  includeCharts: true,
  includeFinancials: false,
  includeExecutiveSummary: true,

  companyName: 'Pitchonix',
  shortDescription: 'AI-powered presentation generation platform',
  productService: 'Pitchonix Platform',
  industry: 'SaaS / Business Software',
  country: 'United States',
  website: 'https://pitchonix.com',
  businessStage: 'seed',

  problem: 'Creating compelling presentations takes 10-20 hours per deck. Teams struggle with design, structure, and content quality.',
  solution: 'Pitchonix uses AI to generate complete, professional presentations in minutes. Features include intelligent content generation, 50+ templates, real-time collaboration.',
  differentiation: '10x faster, AI-powered, no design skills needed',

  marketOpportunity: 'The global presentation software market is $3.2B and growing at 8% CAGR. TAM: $3.2B, SAM: $800M, SOM: $80M.',
  targetCustomers: 'B2B SaaS startups, consulting firms, marketing agencies',
  competitors: 'PowerPoint, Google Slides, Canva, Beautiful.ai',
  revenueModel: 'Subscription SaaS. Starter: $99/mo, Pro: $299/mo, Enterprise: Custom.',
  pricing: 'Starter $99/mo, Pro $299/mo, Enterprise custom',

  traction: '500 active users, $25K MRR, 150% monthly growth. Launched 3 months ago.',
  team: 'John Smith (CEO): Ex-Salesforce VP. Jane Doe (CTO): Ex-Google ML engineer.',
  roadmap: 'Q1 2025: AI presenter notes. Q2 2025: Team collaboration. Q3 2025: Enterprise features.',
  fundingAsk: 'Raising $2M seed. 50% engineering, 30% marketing, 20% operations.',
  desiredAction: 'Join us in transforming how teams create presentations',

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

async function testAIEnhancement() {
  console.log('🧪 Testing AI-Enhanced Slide Generation\n');
  console.log('='.repeat(70));

  // Initialize services
  const aiService = new AIEnhancementService();
  const factory = new SlideFactory();

  // Check if AI is available
  console.log(`\n🤖 AI Enhancement: ${aiService.isAvailable() ? '✅ Available' : '❌ Not available'}`);
  
  if (!aiService.isAvailable()) {
    console.log('\n⚠️  OpenAI API key not configured. Set OPENAI_API_KEY in .env to test AI features.\n');
    console.log('Testing will continue with base generation only...\n');
  }

  // Generate base slides
  console.log('📊 Generating base slides...\n');
  const baseSlides = factory.generateDeck(mockInput);
  console.log(`✅ Generated ${baseSlides.length} base slides`);

  // Show a sample slide before enhancement
  const problemSlide = baseSlides.find(s => s.type === SlideType.PROBLEM);
  if (problemSlide) {
    console.log('\n' + '='.repeat(70));
    console.log('\n📄 BEFORE AI Enhancement - Problem Slide:\n');
    console.log(`Title: ${problemSlide.title}`);
    console.log(`Subtitle: ${problemSlide.subtitle}`);
    console.log('\nContent:');
    console.log(JSON.stringify(problemSlide.content, null, 2));
    console.log('\nSpeaker Notes:');
    console.log(problemSlide.speakerNotes);
  }

  // Test AI enhancement if available
  if (aiService.isAvailable()) {
    console.log('\n' + '='.repeat(70));
    console.log('\n🚀 Testing AI Enhancement...\n');

    try {
      // Test single slide enhancement
      console.log('Enhancing Problem slide with AI...');
      const enhancedSlide = await aiService.enhanceSlide(
        problemSlide!,
        mockInput,
        {
          enhanceContent: true,
          enhanceSpeakerNotes: true,
          improveClarity: true,
        },
      );

      console.log('\n✅ Enhancement complete!\n');
      console.log('='.repeat(70));
      console.log('\n📄 AFTER AI Enhancement - Problem Slide:\n');
      console.log(`Title: ${enhancedSlide.title}`);
      console.log(`Subtitle: ${enhancedSlide.subtitle}`);
      console.log('\nEnhanced Content:');
      console.log(JSON.stringify(enhancedSlide.content, null, 2));
      console.log('\nEnhanced Speaker Notes:');
      console.log(enhancedSlide.speakerNotes);

      // Test full deck enhancement
      console.log('\n' + '='.repeat(70));
      console.log('\n🎨 Testing Full Deck Enhancement...\n');
      console.log('This may take 30-60 seconds...\n');

      const enhancedDeck = await aiService.enhanceDeck(
        baseSlides.slice(0, 3), // Enhance first 3 slides only for testing
        mockInput,
      );

      console.log(`✅ Enhanced ${enhancedDeck.length} slides\n`);

      enhancedDeck.forEach((slide, i) => {
        console.log(`${i + 1}. [${slide.type}] ${slide.title}`);
        console.log(`   Quality: ${slide.qualityScore}/100`);
      });

      // Test executive summary generation
      console.log('\n' + '='.repeat(70));
      console.log('\n📝 Testing Executive Summary Generation...\n');

      const execSummary = await aiService.generateExecutiveSummary(mockInput);
      console.log('Generated Summary:');
      console.log(execSummary);

      // Test bullet point improvement
      console.log('\n' + '='.repeat(70));
      console.log('\n📌 Testing Bullet Point Improvement...\n');

      const originalBullets = [
        'We have a good product',
        'It works well',
        'Customers like it',
      ];

      console.log('Original bullets:');
      originalBullets.forEach((b, i) => console.log(`${i + 1}. ${b}`));

      const improvedBullets = await aiService.improveBulletPoints(
        originalBullets,
        'Product features for a SaaS platform',
        mockInput,
      );

      console.log('\nImproved bullets:');
      improvedBullets.forEach((b, i) => console.log(`${i + 1}. ${b}`));

    } catch (error) {
      console.error('\n❌ AI Enhancement failed:', error.message);
      if (error.response) {
        console.error('API Error:', error.response.data);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n✨ Test completed!\n');
}

// Run the test
testAIEnhancement().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
