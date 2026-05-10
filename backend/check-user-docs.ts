import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserDocs() {
  try {
    // Get all non-test documents
    const docs = await prisma.pdfDocument.findMany({
      where: {
        title: { not: 'Introduction to Cloud Computing' }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        pages: {
          orderBy: { order: 'asc' }
        },
        project: {
          include: {
            user: true
          }
        }
      }
    });
    
    console.log(`\n📋 Found ${docs.length} recent user documents:\n`);
    
    for (const doc of docs) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📄 "${doc.title}"`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   User: ${doc.project.user.email}`);
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

checkUserDocs();
