import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecent() {
  try {
    // Get most recent 5 documents
    const docs = await prisma.pdfDocument.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        pages: {
          orderBy: { order: 'asc' }
        }
      }
    });
    
    console.log('\n📋 Recent Documents:\n');
    
    for (const doc of docs) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📄 "${doc.title}" (ID: ${doc.id.substring(0, 8)}...)`);
      console.log(`   Type: ${doc.documentType}`);
      console.log(`   Created: ${doc.createdAt.toLocaleString()}`);
      console.log(`   Pages: ${doc.pages.length}`);
      
      let totalWords = 0;
      doc.pages.forEach((page, idx) => {
        const content = typeof page.content === 'object' && page.content !== null 
          ? (page.content as any).text || ''
          : String(page.content || '');
        const words = content.split(/\s+/).filter((w: string) => w.trim()).length;
        totalWords += words;
        
        console.log(`   Page ${idx + 1}: "${page.title}" (${page.pageType}) - ${words} words`);
      });
      
      console.log(`   Total words: ${totalWords}`);
      console.log();
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecent();
