import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDoc() {
  const doc = await prisma.pdfDocument.findUnique({
    where: { id: '7203e415-c93e-416a-93d5-7c4d7dd02e03' },
    include: { 
      pages: { orderBy: { order: 'asc' } },
      smartBuilderConfig: true
    }
  });
  
  if (!doc) {
    console.log('Document not found');
    await prisma.$disconnect();
    return;
  }
  
  console.log('\n=== Document Details ===');
  console.log('Title:', doc.title);
  console.log('Type:', doc.documentType);
  console.log('Has Smart Builder Config:', !!doc.smartBuilderConfig);
  console.log('Metadata:', JSON.stringify(doc.metadata, null, 2));
  console.log('\n=== Pages ===');
  
  doc.pages.forEach((p, i) => {
    const content = p.content as any;
    const text = content?.text || '';
    const wordCount = text.split(/\s+/).filter(w => w.trim()).length;
    
    console.log(`\n[${i+1}] ${p.title}`);
    console.log(`   Type: ${p.pageType}`);
    console.log(`   Words: ${wordCount}`);
    console.log(`   Text preview: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
  });
  
  console.log('\n');
  await prisma.$disconnect();
}

checkDoc().catch(console.error);
