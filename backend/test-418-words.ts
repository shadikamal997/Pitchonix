import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate exactly 418 words in one continuous block (like the user's content)
const content418Words = `Pitchonix is revolutionizing the way businesses create professional documents and presentations. Our platform combines intelligent content analysis with beautiful design templates to help teams produce high-quality materials in minutes instead of hours. Whether you're building a pitch deck, business plan, marketing proposal, or technical documentation, Pitchonix provides the tools and automation you need to create compelling content that resonates with your audience. Our AI-powered content analysis engine understands the structure and intent of your writing, automatically suggesting improvements and organizing information in the most effective way. The system analyzes readability, clarity, tone, and structure to ensure your message comes across clearly and professionally. With advanced natural language processing, we can detect document types, extract key themes, identify important topics, and recommend optimal layouts. The template system offers dozens of professionally designed layouts optimized for different document types and industries. From minimalist designs for tech startups to formal layouts for corporate presentations, every template is carefully crafted to maximize visual impact while maintaining readability. Our brand kit integration ensures consistent styling across all your documents, applying your colors, fonts, and logo automatically. The visual composition engine handles complex layouts with multiple columns, image placement, chart integration, and typography management. Smart PDF Builder is our flagship feature that transforms raw text into beautifully formatted multi-page documents. Simply paste your content, and our system analyzes it, structures it into logical sections, applies appropriate styling, and generates a professional PDF ready for download or sharing. The content distribution algorithm intelligently splits long content across multiple pages, ensuring optimal word count per page and maintaining natural paragraph breaks. For teams collaborating on documents, we offer real-time editing, version control, and commenting features. Multiple team members can work simultaneously on different sections, with changes syncing instantly across all devices. The export system supports multiple formats including PDF, PowerPoint, Word, and HTML, with optimization for both digital viewing and print production.`.trim();

async function testWith418Words() {
  try {
    const wordCount = content418Words.split(/\s+/).length;
    console.log(`\n🧪 Testing with ${wordCount} words in continuous block...\n`);
    
    const response = await fetch('http://localhost:3001/api/pdf-studio/smart-builder/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawContent: content418Words,
        config: {
          documentType: 'business_plan',
          includeCoverPage: false,
          includeTableOfContents: false,
          generateIntro: false,
          generateSummary: false,
          generateConclusion: false,
          layoutType: 'single-column',
          visualStyle: 'professional',
        }
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.data.document) {
      const docId = result.data.document.id;
      console.log(`✅ Document created: ${docId}\n`);
      
      // Query database to see pages
      const doc = await prisma.pdfDocument.findUnique({
        where: { id: docId },
        include: {
          pages: {
            orderBy: { order: 'asc' }
          }
        }
      });
      
      if (doc) {
        console.log(`📄 Document: "${doc.title}"`);
        console.log(`   Total Pages: ${doc.pages.length}\n`);
        
        let totalWords = 0;
        doc.pages.forEach((page, idx) => {
          const content = typeof page.content === 'object' && page.content !== null 
            ? (page.content as any).text || ''
            : String(page.content);
          const words = content.split(/\s+/).filter((w: string) => w.trim()).length;
          totalWords += words;
          
          console.log(`   Page ${idx + 1}: "${page.title}" (${page.pageType})`);
          console.log(`      Words: ${words}`);
          console.log(`      Preview: ${content.substring(0, 80)}...\n`);
        });
        
        console.log(`\n📊 Result:`);
        console.log(`   Total pages: ${doc.pages.length}`);
        console.log(`   Total words: ${totalWords}`);
        console.log(`   Average words/page: ${Math.round(totalWords / doc.pages.length)}`);
        
        if (doc.pages.length > 1) {
          console.log(`\n✅ SUCCESS - Content split into multiple pages!`);
        } else {
          console.log(`\n❌ FAILED - Still only 1 content page`);
        }
      }
    } else {
      console.log('❌ Failed:', result.message || 'Unknown error');
      console.log('Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testWith418Words();
