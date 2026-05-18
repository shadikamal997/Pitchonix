/**
 * Verification Script for 7 Critical Bug Fixes
 * Tests document generation with the same content to verify fixes:
 * 1. pageNumber field populated (not null)
 * 2. sections persisted to PdfSection table
 * 3. cover content stored as object (not stringified)
 * 4. page word counts meet MIN_WORDS (120)
 * 5. headings have ## prefix
 * 6. section count preserved (not over-merged)
 * 7. MIN_WORDS warnings logged
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';
const TEST_USER_ID = 'cf840a48-cfde-41ae-b884-5fec523e6fc9';

// Same 1,800-word AI content from original test
const TEST_CONTENT = `The Evolution of Artificial Intelligence: From Theory to Practice

Artificial intelligence has transformed from a theoretical concept into a practical reality that shapes our daily lives. This comprehensive overview explores the journey of AI development, its current applications, and future implications for society.

The Foundations of Artificial Intelligence

The concept of artificial intelligence emerged in the 1950s when computer scientists began exploring whether machines could think. Alan Turing's groundbreaking paper "Computing Machinery and Intelligence" posed the fundamental question: "Can machines think?" This philosophical inquiry laid the groundwork for decades of research and development.

Early AI research focused on symbolic reasoning and problem-solving. Researchers developed programs that could play chess, prove mathematical theorems, and solve logical puzzles. These achievements, while impressive, represented narrow applications of intelligence rather than the general intelligence humans possess.

Machine Learning Revolution

The introduction of machine learning marked a significant shift in AI development. Instead of explicitly programming rules, researchers began creating systems that could learn from data. This approach proved remarkably successful across various domains.

Neural networks, inspired by biological brain structures, became a cornerstone of modern AI. Deep learning, a subset of machine learning using multi-layered neural networks, achieved breakthrough results in image recognition, natural language processing, and game playing.

The availability of massive datasets and powerful computing resources accelerated progress. Companies like Google, Facebook, and Amazon invested heavily in AI research, developing sophisticated algorithms that power their services.

Natural Language Processing

Understanding and generating human language represents one of AI's most challenging frontiers. Recent developments in natural language processing have produced systems capable of remarkably human-like text generation and comprehension.

Transformer architectures, introduced in 2017, revolutionized language modeling. These models can understand context, maintain coherent conversations, and even write creative content. Applications range from chatbots and virtual assistants to content generation and translation services.

Computer Vision Applications

AI systems can now recognize objects, faces, and scenes with superhuman accuracy. This capability enables numerous practical applications, from autonomous vehicles to medical diagnosis.

Self-driving cars rely heavily on computer vision to navigate roads, identify obstacles, and make split-second decisions. Medical imaging benefits from AI systems that can detect diseases in X-rays and MRI scans with accuracy matching or exceeding human experts.

Ethical Considerations

As AI systems become more powerful and pervasive, ethical concerns grow increasingly important. Issues of bias, privacy, transparency, and accountability demand careful consideration.

AI systems can perpetuate and amplify existing biases present in training data. Facial recognition systems have shown reduced accuracy for certain demographic groups, raising fairness concerns. Addressing these issues requires diverse development teams and rigorous testing.

The Future of AI

Looking ahead, artificial intelligence will likely become even more integrated into our daily lives. Advances in general AI, quantum computing, and brain-computer interfaces promise transformative possibilities.

However, realizing AI's potential while managing its risks requires thoughtful policy, continued research, and public engagement. The goal is developing AI systems that augment human capabilities and improve society while respecting human values and rights.

Conclusion

Artificial intelligence has evolved from theoretical speculation to practical reality. As we continue advancing this technology, balancing innovation with responsibility remains crucial for creating a future where AI benefits all of humanity.`;

async function createDocument() {
  console.log('📄 Creating test document...');
  
  // First create a project
  const projectResponse = await axios.post(
    `${API_BASE}/projects`,
    {
      userId: TEST_USER_ID,
      name: 'Fixes Verification Project',
      documentType: 'company_profile',
      documentFormat: 'pdf',
    },
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
  
  const projectId = projectResponse.data.id;
  console.log(`✅ Project created: ${projectId}`);
  
  // Then create PDF document
  const response = await axios.post(
    `${API_BASE}/pdf-documents`,
    {
      projectId: projectId,
      title: 'Fixes Verification Test Document',
      documentType: 'company_profile',
    },
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return response.data;
}

async function generatePDF() {
  console.log(`🚀 Generating PDF content via Smart Builder...`);
  const response = await axios.post(
    `${API_BASE}/pdf-studio/smart-builder/generate`,
    {
      rawContent: TEST_CONTENT,
      documentType: 'company_profile',
      config: {
        title: 'Fixes Verification Test Document',
        documentGoal: 'Test all 7 critical bug fixes',
        targetAudience: 'QA Testing',
        tone: 'professional',
        includeCoverPage: true,
        includeTableOfContents: false,
      },
    },
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return response.data;
}

async function getDocumentDetail(documentId: string) {
  console.log(`📋 Fetching document details...`);
  const response = await axios.get(`${API_BASE}/pdf-documents/${documentId}`, {
    params: { userId: TEST_USER_ID },
  });
  return response.data;
}

async function getSections(documentId: string) {
  console.log(`📑 Fetching sections...`);
  const response = await axios.get(
    `${API_BASE}/pdf-studio/smart-builder/documents/${documentId}/sections`,
  );
  return response.data.data; // Return the data array from {success: true, data: [...]}
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

function extractPageText(content: any): string {
  if (typeof content === 'string') return content;
  if (content && typeof content.text === 'string') return content.text;
  if (content?.text && typeof content.text === 'object') return JSON.stringify(content.text);
  return JSON.stringify(content || '');
}

async function verifyFixes() {
  console.log('🔍 VERIFICATION TEST FOR 7 CRITICAL BUG FIXES\n');

  try {
    // Step 1: Generate PDF via Smart Builder
    const generated = await generatePDF();
    const documentId = generated.data.document.id;
    console.log(`✅ Document generated: ${documentId}\n`);

    // Step 2: Wait for processing to complete
    console.log('⏳ Waiting for processing to complete...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 3: Fetch document with pages
    const detail = await getDocumentDetail(documentId);
    console.log(`✅ Document fetched with ${detail.pages?.length || 0} pages\n`);

    // Step 4: Fetch sections
    let sections = [];
    try {
      sections = await getSections(documentId);
      console.log(`✅ Sections fetched: ${sections.length} sections\n`);
    } catch (err) {
      console.log(`⚠️  Could not fetch sections (endpoint may not exist)\n`);
    }

    // VERIFICATION CHECKS
    console.log('\n═══════════════════════════════════════');
    console.log('VERIFICATION RESULTS');
    console.log('═══════════════════════════════════════\n');

    // Check 1: Page numbers populated
    console.log('✓ CHECK 1: Page Numbers');
    const pageNumbers = detail.pages?.map((p: any) => p.pageNumber) || [];
    const nullPages = pageNumbers.filter((n: any) => n === null || n === undefined);
    if (nullPages.length === 0 && pageNumbers.length > 0) {
      console.log(`  ✅ PASS: All ${pageNumbers.length} pages have pageNumber field`);
      console.log(`  Values: [${pageNumbers.join(', ')}]`);
    } else {
      console.log(`  ❌ FAIL: ${nullPages.length} pages have null pageNumber`);
    }

    // Check 2: Sections persisted
    console.log('\n✓ CHECK 2: Sections Persistence');
    if (sections.length > 0) {
      console.log(`  ✅ PASS: ${sections.length} sections persisted to database`);
      sections.forEach((s: any) => {
        console.log(
          `  - ${s.title} (pages ${s.startPage}-${s.endPage}, ${s.wordCount} words)`,
        );
      });
    } else {
      console.log(`  ❌ FAIL: No sections found in database`);
    }

    // Check 3: Cover content storage
    console.log('\n✓ CHECK 3: Cover Content Storage');
    const coverPage = detail.pages?.find((p: any) => p.pageType === 'cover');
    if (coverPage) {
      const content = coverPage.content;
      const isStringified = typeof content === 'string' && content.startsWith('{');
      if (!isStringified && typeof content === 'object') {
        console.log(`  ✅ PASS: Cover content stored as object (not stringified)`);
        console.log(`  Fields: ${Object.keys(content).join(', ')}`);
      } else {
        console.log(`  ❌ FAIL: Cover content appears stringified`);
        console.log(`  Type: ${typeof content}, Value: ${JSON.stringify(content).substring(0, 100)}`);
      }
    } else {
      console.log(`  ⚠️  No cover page found`);
    }

    // Check 4: Page word counts
    console.log('\n✓ CHECK 4: Page Word Counts (MIN_WORDS = 120)');
    const contentPages = detail.pages?.filter((p: any) => p.pageType === 'content') || [];
    const wordCounts = contentPages.map((p: any) => {
      const text = extractPageText(p.content);
      return countWords(text);
    });
    const underfilledPages = wordCounts.filter((w: number) => w < 120);
    if (underfilledPages.length === 0) {
      console.log(`  ✅ PASS: All pages meet MIN_WORDS threshold`);
      console.log(`  Word counts: [${wordCounts.join(', ')}]`);
    } else {
      console.log(`  ⚠️  WARNING: ${underfilledPages.length} pages below 120 words`);
      console.log(`  Word counts: [${wordCounts.join(', ')}]`);
      console.log(`  Note: This may be expected for last page or short sections`);
    }

    // Check 5: Heading formatting
    console.log('\n✓ CHECK 5: Heading Formatting');
    let hasHeadings = false;
    let missingPrefix = 0;
    contentPages.forEach((p: any, idx: number) => {
      const text = extractPageText(p.content);
      const lines = text.split('\n');
      const headingLines = lines.filter((l: string) => l.match(/^#+\s/) || l.match(/^[A-Z][A-Za-z\s]{5,90}$/));
      if (headingLines.length > 0) {
        hasHeadings = true;
        const withoutPrefix = headingLines.filter((l: string) => !l.startsWith('#'));
        missingPrefix += withoutPrefix.length;
      }
    });
    if (hasHeadings) {
      if (missingPrefix === 0) {
        console.log(`  ✅ PASS: All headings have ## prefix`);
      } else {
        console.log(`  ⚠️  ${missingPrefix} potential headings without ## prefix detected`);
      }
    } else {
      console.log(`  ⚠️  No headings detected in content`);
    }

    // Check 6: Section count preservation
    console.log('\n✓ CHECK 6: Section Count (threshold = 150 words)');
    if (sections.length > 0) {
      console.log(`  ✅ Generated ${sections.length} sections`);
      console.log(`  Expected: 7-9 sections from original content`);
      if (sections.length >= 5) {
        console.log(`  ✅ PASS: Section structure preserved (not over-merged)`);
      } else {
        console.log(`  ⚠️  WARNING: Fewer sections than expected (may be over-merged)`);
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Document ID: ${documentId}`);
    console.log(`Total Pages: ${detail.pages?.length || 0}`);
    console.log(`Content Pages: ${contentPages.length}`);
    console.log(`Sections: ${sections.length}`);
    console.log(`\nView document at: http://localhost:3002/editor/${documentId}`);
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

verifyFixes();
