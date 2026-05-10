import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// EXACTLY 418 words
const content = Array(418).fill('word').join(' ');

async function test() {
  console.log(`Testing with EXACTLY ${content.split(/\s+/).length} words\n`);
  
  const response = await fetch('http://localhost:3001/api/pdf-studio/smart-builder/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rawContent: content,
      config: {
        documentType: 'business_plan',
        includeCoverPage: false,
        includeTableOfContents: false,
        generateIntro: false,
        generateSummary: false,
        generateConclusion: false,
      }
    })
  });
  
  const result = await response.json();
  
  if (result.success && result.data.document) {
    const doc = await prisma.pdfDocument.findUnique({
      where: { id: result.data.document.id },
      include: { pages: { orderBy: { order: 'asc' } } }
    });
    
    console.log(`Pages: ${doc.pages.length}`);
    doc.pages.forEach((p: any, i: number) => {
      const contentText = typeof p.content === 'object' ? (p.content as any).text || '' : String(p.content || '');
      const words = contentText.split(/\s+/).filter((w: string) => w).length;
      console.log(`  Page ${i+1}: ${p.title} - ${words} words`);
    });
    
    console.log(`\n${doc.pages.length > 1 ? '✅ SPLIT INTO MULTIPLE PAGES' : '❌ STILL 1 PAGE'}`);
  } else {
    console.log('Error:', result.message);
  }
  
  await prisma.$disconnect();
}

test();
