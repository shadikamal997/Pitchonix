import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectDocument() {
  const documentId = process.argv[2] || '78117686-a1f4-45c9-8c3c-d47c3a384a8e';
  
  console.log('\n📋 DOCUMENT INSPECTION\n');
  console.log('═══════════════════════════════════════\n');
  
  const pages = await prisma.pdfPage.findMany({
    where: { documentId },
    orderBy: { order: 'asc' },
  });
  
  console.log(`Found ${pages.length} pages:\n`);
  
  pages.forEach((page, idx) => {
    console.log(`\n--- PAGE ${idx + 1} (${page.pageType}) ---`);
    console.log(`Order: ${page.order}, PageNumber: ${page.pageNumber}`);
    console.log(`Title: ${page.title}`);
    
    const content = page.content as any;
    if (typeof content === 'object' && content.text) {
      const text = typeof content.text === 'string' ? content.text : JSON.stringify(content.text);
      console.log(`\nContent (${text.length} chars):`);
      console.log(text.substring(0, 500));
      if (text.length > 500) console.log('...(truncated)');
      
      // Check for headings
      const lines = text.split('\n');
      const headingLines = lines.filter(l => l.trim().startsWith('##'));
      console.log(`\nHeadings found: ${headingLines.length}`);
      headingLines.forEach(h => console.log(`  - ${h.trim()}`));
    } else {
      console.log(`Content type: ${typeof content}`);
      console.log(JSON.stringify(content).substring(0, 300));
    }
  });
  
  await prisma.$disconnect();
}

inspectDocument().catch(console.error);
