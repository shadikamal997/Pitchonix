import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function watchForNewDoc() {
  console.log('\n👀 Watching for new documents...\n');
  console.log('Click "Generate Document" in your browser NOW!\n');
  
  let lastCheck = new Date();
  
  // Poll every 2 seconds for 60 seconds
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newDocs = await prisma.pdfDocument.findMany({
      where: { createdAt: { gte: lastCheck } },
      include: { 
        pages: { orderBy: { order: 'asc' } },
        smartBuilderConfig: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (newDocs.length > 0) {
      const doc = newDocs[0];
      console.log(`\n✅ NEW DOCUMENT CREATED!\n`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📄 "${doc.title}"`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Type: ${doc.documentType}`);
      console.log(`   Created: ${doc.createdAt.toLocaleTimeString()}`);
      console.log(`\n   📊 PAGES: ${doc.pages.length}\n`);
      
      let totalWords = 0;
      doc.pages.forEach((p, i) => {
        const content = typeof p.content === 'object' ? (p.content as any).text || '' : String(p.content || '');
        const words = content.split(/\s+/).filter((w: string) => w.trim()).length;
        totalWords += words;
        console.log(`   Page ${i+1}: "${p.title}" (${p.pageType})`);
        console.log(`      Words: ${words}`);
        console.log(`      Preview: ${content.substring(0, 70).replace(/\n/g, ' ')}...`);
        console.log();
      });
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`\n📈 SUMMARY:`);
      console.log(`   Total Pages: ${doc.pages.length}`);
      console.log(`   Total Words: ${totalWords}`);
      console.log(`   Avg Words/Page: ${Math.round(totalWords / doc.pages.length)}`);
      
      if (doc.pages.length > 1) {
        console.log(`\n✅ SUCCESS! Content split into ${doc.pages.length} pages!`);
      } else {
        console.log(`\n❌ WARNING: Still only ${doc.pages.length} page`);
      }
      
      console.log(`\n🔗 View in browser:`);
      console.log(`   http://localhost:3002/pdf-studio/editor/${doc.id}\n`);
      
      await prisma.$disconnect();
      process.exit(0);
    }
    
    process.stdout.write(`.`);
  }
  
  console.log(`\n\n⏱️ Timeout - no document created in 60 seconds`);
  await prisma.$disconnect();
}

watchForNewDoc();
