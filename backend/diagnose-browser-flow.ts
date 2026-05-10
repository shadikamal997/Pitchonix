import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_CONTENT = `Pitchonix - AI-Powered Document Creation Platform

Executive Summary
Pitchonix revolutionizes professional document creation by combining advanced AI analysis with intelligent design automation. Our platform enables professionals to transform raw content into polished, presentation-ready documents 10x faster than traditional methods.

The Problem
Creating professional business documents typically requires 5-10 hours of work, including writing, formatting, design, and multiple rounds of revisions. Most professionals lack advanced design skills, yet they need documents that communicate credibility and professionalism.

Our Solution
Pitchonix analyzes your raw content using NLP, automatically structures it into logical sections, suggests improvements, and generates beautifully formatted documents using intelligent templates. What used to take hours now takes minutes.

Key Features
- Smart Content Analysis: NLP-powered analysis detects document type, extracts key themes, and suggests optimal structure
- Intelligent Templates: 50+ professionally designed templates that adapt to your content
- Multi-Format Export: Generate PDFs, PowerPoints, and Word documents from a single source
- Real-Time Preview: See changes instantly with live preview rendering
- Enhancement Tools: AI-powered writing improvements, grammar fixes, and content optimization

Target Market
Our primary market includes consulting firms, startups, sales teams, and independent professionals who regularly create business documents. The total addressable market exceeds $2B annually in the document automation space.

Business Model
We operate on a freemium SaaS model with tiered subscriptions:
- Free: 5 documents/month with watermark
- Professional ($29/mo): Unlimited documents, all templates, priority support
- Team ($99/mo): Everything in Pro plus collaboration features and brand kits
- Enterprise (custom): White-label, API access, dedicated support

Technology Stack
Built on modern, scalable architecture using NestJS backend, Next.js frontend, PostgreSQL database, and integration with leading AI models. Our infrastructure can handle 10,000+ concurrent users with sub-second response times.

Competitive Advantage
Unlike generic document tools, we specialize in business documents with industry-specific templates and content intelligence. Our AI goes beyond simple formatting to actually improve your content's clarity and impact.

Traction
- Beta users: 2,500+
- Monthly active users: 800+
- Documents created: 15,000+
- Average user rating: 4.8/5
- Month-over-month growth: 35%

Team
Founded by former product designers and engineers from leading tech companies. Combined experience includes AI/ML, design systems, and enterprise SaaS platforms.

Financial Projections
Year 1: $250K ARR with 5,000 users
Year 2: $1.2M ARR with 25,000 users  
Year 3: $4.5M ARR with 100,000 users

Funding Ask
Seeking $1.5M seed round to accelerate product development, expand marketing, and scale operations. Funds will be allocated: 40% engineering, 35% marketing/sales, 25% operations.`;

async function diagnose() {
  console.log('\n🔍 COMPREHENSIVE BROWSER FLOW DIAGNOSTIC\n');
  console.log('=' .repeat(60));
  
  // Test 1: Content Analysis
  console.log('\n📊 TEST 1: Content Analysis Endpoint');
  console.log('-'.repeat(60));
  try {
    const analyzeResponse = await fetch('http://localhost:3001/api/pdf-studio/smart-builder/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rawContent: TEST_CONTENT }),
    });
    
    const analyzeData = await analyzeResponse.json();
    
    if (analyzeData.success) {
      console.log('✅ Analysis successful');
      console.log(`   Word count: ${analyzeData.data.metrics.words}`);
      console.log(`   Document type: ${analyzeData.data.documentType}`);
      console.log(`   Suggested sections: ${analyzeData.data.suggestedStructure?.length || 0}`);
    } else {
      console.log('❌ Analysis failed:', analyzeData.message);
      return;
    }
  } catch (error: any) {
    console.log('❌ Analysis error:', error.message);
    return;
  }
  
  // Test 2: Document Generation
  console.log('\n📄 TEST 2: Document Generation Endpoint');
  console.log('-'.repeat(60));
  
  let documentId: string | null = null;
  
  try {
    const generateResponse = await fetch('http://localhost:3001/api/pdf-studio/smart-builder/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawContent: TEST_CONTENT,
        config: {
          title: 'Pitchonix - AI-Powered Document Creation',
          documentType: 'business_plan',
          templateType: 'modern_one_pager',
          includeCoverPage: true,
          includeTableOfContents: true,
          generateIntro: false,
          generateSummary: true,
          generateConclusion: false,
          layoutType: 'single-column',
          visualStyle: 'professional',
        },
      }),
    });
    
    const responseText = await generateResponse.text();
    console.log('Response status:', generateResponse.status);
    console.log('Response headers:', JSON.stringify(Object.fromEntries(generateResponse.headers.entries())));
    
    let generateData;
    try {
      generateData = JSON.parse(responseText);
    } catch {
      console.log('❌ Response is not valid JSON');
      console.log('Response text:', responseText.substring(0, 500));
      return;
    }
    
    if (generateData.success && generateData.data.document) {
      documentId = generateData.data.document.id;
      console.log('✅ Document generated successfully');
      console.log(`   Document ID: ${documentId}`);
      console.log(`   Title: ${generateData.data.document.title}`);
    } else if (generateData.data?.requiresAuth) {
      console.log('⚠️  Requires authentication (expected for demo users)');
    } else {
      console.log('❌ Generation failed:', generateData.message || 'Unknown error');
      console.log('Full response:', JSON.stringify(generateData, null, 2));
      return;
    }
  } catch (error: any) {
    console.log('❌ Generation error:', error.message);
    if (error.stack) {
      console.log('Stack:', error.stack);
    }
    return;
  }
  
  if (!documentId) {
    console.log('\n❌ No document ID returned, cannot continue with page verification');
    return;
  }
  
  // Test 3: Database Verification
  console.log('\n💾 TEST 3: Database Verification');
  console.log('-'.repeat(60));
  
  // Wait a moment for database write
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    const document = await prisma.pdfDocument.findUnique({
      where: { id: documentId },
      include: {
        pages: {
          orderBy: { order: 'asc' },
        },
      },
    });
    
    if (!document) {
      console.log('❌ Document not found in database');
      return;
    }
    
    console.log('✅ Document found in database');
    console.log(`   Title: ${document.title}`);
    console.log(`   Total Pages: ${document.pages.length}`);
    console.log('');
    
    document.pages.forEach((page, index) => {
      const content = typeof page.content === 'object' 
        ? (page.content as any).text || '' 
        : String(page.content || '');
      const wordCount = content.split(/\s+/).filter((w: string) => w.trim()).length;
      
      console.log(`   📄 Page ${index + 1}: "${page.title}"`);
      console.log(`      Type: ${page.pageType}`);
      console.log(`      Words: ${wordCount}`);
      console.log(`      Order: ${page.order}`);
    });
    
    if (document.pages.length > 1) {
      console.log('\n✅ SUCCESS: Multiple pages created!');
    } else {
      console.log('\n⚠️  WARNING: Only 1 page created (expected multiple)');
    }
  } catch (error: any) {
    console.log('❌ Database error:', error.message);
    return;
  }
  
  // Test 4: Preview Endpoint
  if (documentId) {
    console.log('\n🖼️  TEST 4: Preview Generation');
    console.log('-'.repeat(60));
    
    try {
      const previewResponse = await fetch(`http://localhost:3001/api/pdf-studio/export/preview/${documentId}`);
      
      if (previewResponse.ok) {
        const html = await previewResponse.text();
        console.log('✅ Preview generated successfully');
        console.log(`   HTML length: ${html.length} characters`);
        
        // Count page breaks
        const pageBreakCount = (html.match(/page-break/g) || []).length;
        console.log(`   Page breaks found: ${pageBreakCount}`);
        console.log(`   Expected pages in preview: ${pageBreakCount + 1}`);
      } else {
        console.log('❌ Preview failed with status:', previewResponse.status);
      }
    } catch (error: any) {
      console.log('❌ Preview error:', error.message);
    }
  }
  
  // Test 5: Frontend API Base URL Check
  console.log('\n🔗 TEST 5: Frontend Configuration Check');
  console.log('-'.repeat(60));
  console.log('Expected API URL: http://localhost:3001/api');
  console.log('Backend running on: http://localhost:3001');
  console.log('Frontend should be on: http://localhost:3002');
  console.log('');
  console.log('⚠️  Check .env.local in frontend:');
  console.log('   NEXT_PUBLIC_API_URL=http://localhost:3001/api');
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 DIAGNOSTIC COMPLETE');
  console.log('='.repeat(60) + '\n');
  
  if (documentId) {
    console.log(`✅ Test document: http://localhost:3002/pdf-studio/editor/${documentId}\n`);
  }
  
  await prisma.$disconnect();
}

diagnose().catch(console.error);
