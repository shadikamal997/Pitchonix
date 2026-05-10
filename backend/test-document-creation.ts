import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDocuments() {
  console.log('\n=== Checking Recent Documents ===\n');
  
  const documents = await prisma.pdfDocument.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      pages: {
        orderBy: { order: 'asc' },
      },
    },
  });

  documents.forEach((doc, index) => {
    console.log(`\n[${index + 1}] Document: ${doc.title}`);
    console.log(`    ID: ${doc.id}`);
    console.log(`    Created: ${doc.createdAt}`);
    console.log(`    Pages: ${doc.pages.length}`);
    
    doc.pages.forEach((page, pi) => {
      const content = page.content as any;
      const wordCount = content?.text ? content.text.split(/\s+/).length : 0;
      console.log(`    Page ${pi + 1}: "${page.title}" (${wordCount} words)`);
    });
  });
  
  console.log('\n');
  await prisma.$disconnect();
}

checkDocuments().catch(console.error);
