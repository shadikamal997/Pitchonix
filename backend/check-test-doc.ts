import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const doc = await prisma.pdfDocument.findUnique({
    where: { id: '3b163b78-cadd-4c6c-b64b-2455d7e4c52f' },
    include: { pages: { orderBy: { order: 'asc' } } }
  });
  
  if (doc) {
    console.log('\n📄 Test Document Created!\n');
    console.log(`   Total Pages: ${doc.pages.length}\n`);
    
    let totalWords = 0;
    doc.pages.forEach((p, i) => {
      const content = typeof p.content === 'object' ? (p.content as any).text || '' : String(p.content || '');
      const words = content.split(/\s+/).filter((w: string) => w.trim()).length;
      totalWords += words;
      console.log(`   Page ${i+1}: "${p.title}" - ${words} words`);
    });
    
    console.log(`\n   Total words: ${totalWords}`);
    console.log(`\n${doc.pages.length > 1 ? '✅ SUCCESS - MULTIPLE PAGES!' : '❌ FAILED - STILL 1 PAGE'}`);
    
    if (doc.pages.length > 1) {
      console.log(`\n🔗 View it at: http://localhost:3002/pdf-studio/editor/${doc.id}`);
    }
  }
  
  await prisma.$disconnect();
}

check();
