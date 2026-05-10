/**
 * Test Script: Verify Production-Quality Composition System
 * 
 * This script tests the new composition pipeline by:
 * 1. Creating a test document
 * 2. Checking logs for composition metrics
 * 3. Verifying composition data in database
 */

const testContent = `
# Executive Summary

This is a comprehensive annual report for 2026. Our company has achieved remarkable growth across all key metrics, demonstrating strong market performance and strategic execution.

## Financial Highlights

Revenue increased by 45% year-over-year, reaching $10.5 million in total annual revenue. Our gross margin improved to 72%, reflecting operational excellence and cost optimization initiatives.

### Key Performance Indicators

- Customer acquisition cost decreased by 30%
- Customer lifetime value increased by 55%
- Monthly recurring revenue grew to $875,000
- Net revenue retention rate: 125%

## Market Analysis

The market for our products continues to expand rapidly. Industry forecasts predict 40% annual growth over the next five years, driven by digital transformation initiatives across enterprise segments.

### Competitive Positioning

We have established ourselves as a market leader in the mid-market segment, with strong brand recognition and a proven track record of customer success.

## Strategic Initiatives

Looking forward to 2027, we are focused on three key strategic initiatives:

1. **Product Innovation** - Launching next-generation features based on customer feedback
2. **Market Expansion** - Entering three new geographic regions
3. **Operational Excellence** - Scaling infrastructure to support 10x growth

## Conclusion

We are well-positioned for continued success. Our strong financial performance, combined with clear strategic direction, sets the foundation for exceptional growth in the coming years.
`;

const generateDocument = async () => {
  try {
    console.log('🧪 Testing Production-Quality Composition System');
    console.log('=' .repeat(60));
    console.log('');

    console.log('📝 Generating test document...');
    const response = await fetch('http://localhost:3001/api/pdf-studio/smart-builder/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you'd need a valid auth token
        // For this test, we'll use the Public decorator on the endpoint
      },
      body: JSON.stringify({
        rawContent: testContent,
        documentType: 'business_report',
        config: {
          title: 'Annual Report 2026',
          documentGoal: 'Present comprehensive annual performance',
          targetAudience: 'executives',
          tone: 'professional',
          includeCoverPage: true,
          includeTableOfContents: true,
          designStyle: 'executive',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Generation failed:', error);
      return;
    }

    const result = await response.json();
    console.log('✅ Document generated successfully!');
    console.log('');

    // Display results
    console.log('📊 Generation Results:');
    console.log('-'.repeat(60));
    console.log(`Document ID: ${result.data.documentId}`);
    console.log(`Project ID: ${result.data.projectId}`);
    console.log(`Total Pages: ${result.data.totalPages}`);
    console.log(`Processing Time: ${result.data.processingTimeMs}ms`);
    console.log('');

    if (result.data.metadata) {
      console.log('🎨 Composition Metrics:');
      console.log('-'.repeat(60));
      console.log(`Composition Quality: ${result.data.metadata.compositionQuality?.toFixed(1) || 'N/A'}/100`);
      console.log(`Generated Sections: ${result.data.metadata.generatedSections || 'N/A'}`);
      console.log('');

      if (result.data.metadata.sections) {
        console.log('📑 Document Sections:');
        result.data.metadata.sections.forEach((section: any) => {
          console.log(`  • ${section.title} (Pages ${section.pageRange})`);
        });
        console.log('');
      }

      if (result.data.metadata.tableOfContents) {
        console.log('📖 Table of Contents:');
        result.data.metadata.tableOfContents.forEach((entry: any) => {
          console.log(`  ${entry.pageRange.padStart(5)} - ${entry.title}`);
        });
        console.log('');
      }
    }

    // Check backend logs
    console.log('💡 Check backend logs for composition pipeline output:');
    console.log('   Look for:');
    console.log('   ✓ Composed X pages with visual hierarchy');
    console.log('   ✓ Balanced density: X → Y pages');
    console.log('   ✓ Added semantic continuations: Z sections');
    console.log('   📊 Composition quality: XX.X/100');
    console.log('');

    console.log('🗄️  Database Queries to Run:');
    console.log('-'.repeat(60));
    console.log('-- Check composition quality:');
    console.log(`SELECT id, title, metadata->'compositionQuality' as quality`);
    console.log(`FROM pdf_documents WHERE id = '${result.data.documentId}';`);
    console.log('');
    console.log('-- Check page composition data:');
    console.log(`SELECT "order", title,`);
    console.log(`  content->'composition'->'metrics'->>'overallQuality' as quality,`);
    console.log(`  content->'composition'->>'density' as density`);
    console.log(`FROM pdf_pages WHERE "documentId" = '${result.data.documentId}'`);
    console.log(`ORDER BY "order";`);
    console.log('');

    console.log('✨ Test Complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

// Run the test
generateDocument();
