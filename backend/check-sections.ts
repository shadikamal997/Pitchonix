import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSections() {
  const documentId = process.argv[2] || '14a917e5-13de-405f-bd1a-03e2bb3cac88';
  
  const sections = await prisma.pdfSection.findMany({
    where: { documentId },
    orderBy: { order: 'asc' },
  });
  
  console.log(`\nFound ${sections.length} sections for document ${documentId}:\n`);
  
  sections.forEach((section, idx) => {
    console.log(`${idx + 1}. ${section.title}`);
    console.log(`   Type: ${section.sectionType}, Pages: ${section.startPage}-${section.endPage}, Words: ${section.wordCount}`);
  });
  
  if (sections.length === 0) {
    console.log('❌ NO SECTIONS FOUND - Bug fix not working!');
    console.log('\nChecking all sections in database:');
    const allSections = await prisma.pdfSection.findMany();
    console.log(`Total sections across all documents: ${allSections.length}`);
  }
  
  await prisma.$disconnect();
}

checkSections().catch(console.error);
