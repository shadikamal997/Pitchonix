import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkComposition() {
  try {
    // Get the most recent document
    const doc = await prisma.pdfDocument.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { pages: { orderBy: { order: 'asc' } } }
    });

    if (!doc) {
      console.log('❌ No documents found');
      return;
    }

    console.log('📄 Document:', doc.title);
    console.log('🎯 Composition Quality:', (doc.metadata as any)?.compositionQuality);
    console.log('📊 Generated Sections:', (doc.metadata as any)?.generatedSections);
    console.log('📖 Total Pages:', doc.pages.length);
    console.log('');

    console.log('📑 Table of Contents:');
    const toc = (doc.metadata as any)?.tableOfContents || [];
    toc.forEach((entry: any) => {
      console.log(`  ${entry.pageRange.padStart(5)} - ${entry.title}`);
    });
    console.log('');

    console.log('📄 Page Composition Details:');
    console.log(''.padEnd(80, '-'));
    
    for (const page of doc.pages) {
      const comp = (page.content as any)?.composition;
      if (comp) {
        console.log(`Page ${page.order}: ${page.pageType.toUpperCase()}`);
        console.log(`  Title: ${page.title || 'N/A'}`);
        console.log(`  Density: ${comp.density}`);
        console.log(`  Sections: ${comp.sections?.length || 0}`);
        console.log(`  Quality: ${comp.metrics?.overallQuality?.toFixed(1) || 'N/A'}/100`);
        console.log(`    - Density: ${comp.metrics?.densityScore?.toFixed(1) || 'N/A'}`);
        console.log(`    - Readability: ${comp.metrics?.readabilityScore?.toFixed(1) || 'N/A'}`);
        console.log(`    - Whitespace: ${comp.metrics?.whitespaceScore?.toFixed(1) || 'N/A'}`);
        console.log(`    - Visual Balance: ${comp.metrics?.visualBalanceScore?.toFixed(1) || 'N/A'}`);
        console.log('');
      }
    }

    console.log('✅ Composition data verified in database!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkComposition();
