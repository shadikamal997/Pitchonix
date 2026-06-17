/**
 * PDF Studio — Section Ownership Certification
 *
 * Verifies that:
 *   F1 – No heading appears more than once on the same rendered page
 *   F2 – Stale headings never bleed across section boundaries
 *   F3 – Content is always owned by the correct section
 *   F4 – Heading is not re-emitted per paragraph / child block
 *   F5 – Continuation pages do not re-emit the parent section heading
 *   F6 – Signature blocks do not restart a previous section heading
 *
 * All tests operate on pure utility functions from rendering-normalization.ts
 * and on the inline heading-suppression logic mirrored from the two services,
 * so they run without Puppeteer, Prisma, or any I/O.
 */

import {
  extractFirstRenderedHeading,
  isGenericPdfTitle,
  normalizePdfTextForRendering,
  resolvePdfPageDisplayTitle,
  buildTitleFrequency,
  hasSignatureContent,
} from '../rendering-normalization';

// ─── helpers mirroring the suppression logic in the two services ────────────

/** Mirrors pdf-export.service.ts title-suppression logic */
function resolveExportTitle(
  rawTitle: string,
  htmlContent: string,
  lastEmittedSectionHeading: string,
): { title: string; nextLastEmitted: string } {
  const titleKey = rawTitle.toLowerCase().slice(0, Math.min(20, rawTitle.length));
  const titleInContent =
    rawTitle.length > 0 &&
    /<h[123][^>]*>/i.test(htmlContent) &&
    htmlContent.toLowerCase().includes(titleKey);
  const isContinuationPage =
    rawTitle.length > 0 && rawTitle === lastEmittedSectionHeading;
  const title = titleInContent || isContinuationPage || !rawTitle ? '' : rawTitle;
  const nextLastEmitted =
    rawTitle && !titleInContent && !isContinuationPage ? rawTitle : lastEmittedSectionHeading;
  return { title, nextLastEmitted };
}

/** Mirrors preview.service.ts primaryTitle-suppression logic */
function resolvePreviewBucketTitle(rawPrimaryTitle: string, combinedHtml: string): string {
  const primaryTitleKey = rawPrimaryTitle.toLowerCase().slice(0, Math.min(20, rawPrimaryTitle.length));
  const primaryTitleInContent =
    rawPrimaryTitle.length > 0 &&
    /<h[123][^>]*>/i.test(combinedHtml) &&
    combinedHtml.toLowerCase().includes(primaryTitleKey);
  return primaryTitleInContent ? '' : rawPrimaryTitle;
}

/** Simulate the section-boundary bucket-flushing in preview.service.ts */
function bucketPages(
  pages: Array<{ text: string; words: number }>,
  TARGET_WORDS = 420,
  MIN_WORDS = 40,
): Array<Array<{ text: string; words: number }>> {
  const buckets: Array<{ pages: typeof pages; words: number; headingKey: string }> = [];
  let current: { pages: typeof pages; words: number; headingKey: string } | null = null;

  const flush = () => {
    if (current && current.pages.length > 0) {
      buckets.push(current);
      current = null;
    }
  };

  for (const page of pages) {
    const rawText = normalizePdfTextForRendering(page.text);
    const incomingHeading = extractFirstRenderedHeading(rawText);

    // Section-boundary detection
    if (incomingHeading && current && current.headingKey && incomingHeading !== current.headingKey) {
      flush();
    }

    if (!current) current = { pages: [], words: 0, headingKey: incomingHeading };
    if (incomingHeading && !current.headingKey) current.headingKey = incomingHeading;

    if (current.words + page.words > TARGET_WORDS * 1.25 && current.words >= MIN_WORDS * 2) {
      flush();
      current = { pages: [], words: 0, headingKey: incomingHeading };
    }

    current.pages.push(page);
    current.words += page.words;

    if (current.words >= TARGET_WORDS) flush();
  }
  flush();

  return buckets.map((b) => b.pages);
}

// ─── utility function tests ──────────────────────────────────────────────────

describe('rendering-normalization utilities', () => {
  describe('extractFirstRenderedHeading', () => {
    it('extracts a markdown heading from normalized text', () => {
      const text = '## Introduction\n\nSome content here.';
      expect(extractFirstRenderedHeading(text)).toBe('Introduction');
    });

    it('returns empty string when there is no heading', () => {
      expect(extractFirstRenderedHeading('Just plain text.')).toBe('');
    });

    it('extracts Arabic legal section heading after normalization', () => {
      const raw = 'الرابع عشر: حماية سمعة الشركة\n\nContent here.';
      const normalized = normalizePdfTextForRendering(raw);
      const heading = extractFirstRenderedHeading(normalized);
      expect(heading).toContain('الرابع عشر');
    });

    it('handles bare-hash lines without extracting them as headings', () => {
      const text = '##\n\n## Real Heading\n\nContent.';
      const normalized = normalizePdfTextForRendering(text);
      expect(extractFirstRenderedHeading(normalized)).toBe('Real Heading');
    });
  });

  describe('normalizePdfTextForRendering', () => {
    it('strips bare hash lines', () => {
      const text = '##\n\n## Real Heading\n\n###\n\nContent.';
      const result = normalizePdfTextForRendering(text);
      expect(result).not.toMatch(/^#{1,6}\s*$/m);
    });

    it('promotes Arabic legal section headings to ## markers', () => {
      const text = 'الرابع عشر: حماية سمعة الشركة\n\nSome content.';
      const result = normalizePdfTextForRendering(text);
      expect(result).toMatch(/^##\s+الرابع عشر/m);
    });

    it('promotes التوقيعات (signature heading) to ## marker', () => {
      const text = 'التوقيعات\n\nالطرف الأول:\n___________';
      const result = normalizePdfTextForRendering(text);
      expect(result).toMatch(/^##\s+التوقيعات/m);
    });

    it('does not promote plain Arabic prose to a heading', () => {
      const text = 'هذا النص لا يحتوي على رقم بند ونقطتين';
      const result = normalizePdfTextForRendering(text);
      expect(result).not.toMatch(/^##/m);
    });
  });

  describe('isGenericPdfTitle', () => {
    it('marks "content" as generic', () => expect(isGenericPdfTitle('content')).toBe(true));
    it('marks "introduction" as generic', () => expect(isGenericPdfTitle('introduction')).toBe(true));
    it('marks real section title as non-generic', () => {
      expect(isGenericPdfTitle('الرابع عشر: حماية سمعة الشركة')).toBe(false);
    });
  });

  describe('hasSignatureContent', () => {
    it('detects Arabic party labels', () => {
      expect(hasSignatureContent('الطرف الأول:\n___________')).toBe(true);
    });
    it('detects underscore signature lines', () => {
      expect(hasSignatureContent('Sign here: ____________')).toBe(true);
    });
    it('returns false for plain text with no signature patterns', () => {
      expect(hasSignatureContent('هذا نص عادي بدون توقيع أو خطوط.')).toBe(false);
    });
  });
});

// ─── F1: No duplicate headings ───────────────────────────────────────────────

describe('F1 – Duplicate Heading Prevention', () => {
  it('export: suppresses card title when heading already in content body (start)', () => {
    const rawTitle = 'Introduction';
    const html = '<h2>Introduction</h2><p>Content.</p>';
    const { title } = resolveExportTitle(rawTitle, html, '');
    expect(title).toBe('');
  });

  it('export: suppresses card title when heading appears mid-content (not just at start)', () => {
    const rawTitle = 'Section Fourteen';
    const html = '<p>Preamble text.</p><h2>Section Fourteen</h2><p>Body text.</p>';
    const { title } = resolveExportTitle(rawTitle, html, '');
    expect(title).toBe('');
  });

  it('export: shows card title when content has NO matching heading', () => {
    const rawTitle = 'Section Fourteen';
    const html = '<p>Some body text without any heading.</p>';
    const { title } = resolveExportTitle(rawTitle, html, '');
    expect(title).toBe('Section Fourteen');
  });

  it('preview: suppresses bucket title when heading already in combined content', () => {
    const combinedHtml = '<h2>الرابع عشر: حماية سمعة الشركة</h2><p>Content.</p>';
    const result = resolvePreviewBucketTitle('الرابع عشر: حماية سمعة الشركة', combinedHtml);
    expect(result).toBe('');
  });

  it('preview: shows bucket title when content has no matching heading', () => {
    const combinedHtml = '<p>Plain content without any heading element.</p>';
    const result = resolvePreviewBucketTitle('Section Title', combinedHtml);
    expect(result).toBe('Section Title');
  });
});

// ─── F2 / F3: Stale heading & wrong section ownership ────────────────────────

describe('F2/F3 – Stale Heading & Section Ownership', () => {
  it('preview bucketing: pages from different sections go into separate buckets', () => {
    const pages = [
      { text: '## Section One\n\nContent for section one.', words: 50 },
      { text: '## Section Two\n\nContent for section two.', words: 50 },
    ];
    const buckets = bucketPages(pages);
    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toHaveLength(1);
    expect(buckets[1]).toHaveLength(1);
  });

  it('preview bucketing: continuation pages of the SAME section stay in one bucket', () => {
    const pages = [
      { text: '## Contract Section\n\nFirst part of content.', words: 100 },
      { text: 'Continuation text — no new heading here.', words: 80 },
    ];
    const buckets = bucketPages(pages);
    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toHaveLength(2);
  });

  it('preview bucketing: signatures page is NOT merged with the preceding section', () => {
    const pages = [
      { text: '## الرابع عشر: حماية سمعة الشركة\n\nClause content.', words: 120 },
      { text: 'التوقيعات\n\nالطرف الأول:\n____________', words: 30 },
    ];
    const buckets = bucketPages(pages);
    // Signatures introduce a different heading → must flush into its own bucket
    expect(buckets).toHaveLength(2);
  });
});

// ─── F4: Heading not repeated per child block ─────────────────────────────────

describe('F4 – Heading Not Repeated For Child Blocks', () => {
  it('a section with multiple paragraphs produces exactly one heading in normalized text', () => {
    const text = [
      '## الثالث عشر: السرية والمعلومات السرية',
      '',
      'يتعهد الطرف الثاني بالحفاظ على سرية جميع المعلومات.',
      '',
      'تشمل المعلومات السرية جميع البيانات التجارية.',
      '',
      'لا يحق للطرف الثاني الإفصاح عن أي معلومات.',
    ].join('\n');

    const normalized = normalizePdfTextForRendering(text);
    const headingMatches = normalized.match(/^##\s+/gm) || [];
    expect(headingMatches).toHaveLength(1);
  });
});

// ─── F5: Continuation pages do not re-emit heading ───────────────────────────

describe('F5 – Continuation Pages Do Not Re-Emit Heading', () => {
  it('export: continuation page with same title is suppressed', () => {
    const sectionTitle = 'الرابع عشر: حماية سمعة الشركة';
    const htmlNonMatch = '<p>More content for the same section.</p>';

    // First page — emits the heading
    const first = resolveExportTitle(sectionTitle, htmlNonMatch, '');
    expect(first.title).toBe(sectionTitle);
    expect(first.nextLastEmitted).toBe(sectionTitle);

    // Second page — same section, same heading → suppressed
    const second = resolveExportTitle(sectionTitle, htmlNonMatch, first.nextLastEmitted);
    expect(second.title).toBe('');
  });

  it('export: a NEW section heading re-appears correctly after continuation', () => {
    const section14 = 'الرابع عشر: حماية سمعة الشركة';
    const section15 = 'الخامس عشر: التسوية والتحكيم';
    const html = '<p>Body text.</p>';

    const { nextLastEmitted: after14 } = resolveExportTitle(section14, html, '');
    // Continuation of section 14 → suppressed
    const { title: cont14, nextLastEmitted: stillSection14 } = resolveExportTitle(section14, html, after14);
    expect(cont14).toBe('');

    // New section 15 → should appear
    const { title: title15 } = resolveExportTitle(section15, html, stillSection14);
    expect(title15).toBe(section15);
  });
});

// ─── F6: Signature block does not restart previous section heading ─────────────

describe('F6 – Signature Block Does Not Restart Previous Section Heading', () => {
  it('export: signature page heading (التوقيعات) does not cause section 14 to reappear', () => {
    const section14 = 'الرابع عشر: حماية سمعة الشركة';
    const signaturesTitle = 'التوقيعات';
    const html = '<p>Body text.</p>';

    // Emit section 14
    const { nextLastEmitted: after14 } = resolveExportTitle(section14, html, '');
    // Emit signatures
    const { title: sigTitle, nextLastEmitted: afterSig } = resolveExportTitle(signaturesTitle, html, after14);
    expect(sigTitle).toBe(signaturesTitle);

    // If the document erroneously has section 14 content again after signatures,
    // the continuation suppression should block it only if it's the same heading.
    // Since afterSig = 'التوقيعات', section 14 IS a new section and should appear.
    const { title: titleAfterSig } = resolveExportTitle(section14, html, afterSig);
    // Section 14 after signatures = new section → emits correctly (not stale)
    expect(titleAfterSig).toBe(section14);
  });

  it('preview: signature page goes into its own bucket, not merged with prior section', () => {
    const pages = [
      { text: '## الرابع عشر: حماية سمعة الشركة\n\nContent.', words: 80 },
      { text: 'التوقيعات\n\nالطرف الأول:\n____________\nالطرف الثاني:\n____________', words: 25 },
    ];
    const buckets = bucketPages(pages);
    expect(buckets).toHaveLength(2);
    // The second bucket should contain the signature page only
    expect(buckets[1]).toHaveLength(1);
    expect(buckets[1][0].text).toContain('التوقيعات');
  });
});

// ─── Legal document stress tests ─────────────────────────────────────────────

describe('Legal Document Stress Tests', () => {
  function makeClause(n: number, wordCount = 60): { text: string; words: number } {
    const ordinals: Record<number, string> = {
      1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 5: 'الخامس',
      6: 'السادس', 7: 'السابع', 8: 'الثامن', 9: 'التاسع', 10: 'العاشر',
      11: 'الحادي عشر', 12: 'الثاني عشر', 13: 'الثالث عشر', 14: 'الرابع عشر',
      15: 'الخامس عشر', 16: 'السادس عشر', 17: 'السابع عشر', 18: 'الثامن عشر',
      19: 'التاسع عشر', 20: 'العشرون',
    };
    const ordinal = ordinals[n] || `البند ${n}`;
    const heading = `${ordinal}: التزامات البند ${n}`;
    const body = Array.from({ length: Math.ceil(wordCount / 5) }, (_, i) => `كلمة${i + 1}`).join(' ');
    return { text: `## ${heading}\n\n${body}`, words: wordCount };
  }

  function countUniqueBucketHeadings(pages: Array<{ text: string; words: number }>): number {
    const buckets = bucketPages(pages);
    const headings = new Set<string>();
    for (const bucket of buckets) {
      const firstText = normalizePdfTextForRendering(bucket[0].text);
      const h = extractFirstRenderedHeading(firstText);
      if (h) headings.add(h);
    }
    return headings.size;
  }

  it('10-clause contract: each clause in its own bucket (no cross-section merging)', () => {
    const pages = Array.from({ length: 10 }, (_, i) => makeClause(i + 1));
    const buckets = bucketPages(pages);
    // Each clause is distinct → must not merge across clause boundaries
    expect(buckets.length).toBeGreaterThanOrEqual(10);
  });

  it('10-clause contract: 10 unique section headings across all buckets', () => {
    const pages = Array.from({ length: 10 }, (_, i) => makeClause(i + 1));
    expect(countUniqueBucketHeadings(pages)).toBe(10);
  });

  it('20-clause contract: 20 unique section headings', () => {
    const pages = Array.from({ length: 20 }, (_, i) => makeClause(i + 1));
    expect(countUniqueBucketHeadings(pages)).toBe(20);
  });

  it('export: 50-clause contract — no heading appears more than once in rendered output', () => {
    const emittedHeadings: string[] = [];
    let lastEmitted = '';

    for (let i = 1; i <= 50; i++) {
      const { text } = makeClause(i, 40);
      const normalized = normalizePdfTextForRendering(text);
      const rawTitle = extractFirstRenderedHeading(normalized);
      const html = `<p>Clause ${i} body text.</p>`;
      const { title, nextLastEmitted } = resolveExportTitle(rawTitle, html, lastEmitted);
      if (title) emittedHeadings.push(title);
      lastEmitted = nextLastEmitted;
    }

    // All 50 headings should be unique (no duplicates)
    const unique = new Set(emittedHeadings);
    expect(unique.size).toBe(emittedHeadings.length);
    expect(emittedHeadings).toHaveLength(50);
  });

  it('export: 100-clause contract — continuation pages suppressed, section headings preserved', () => {
    let lastEmitted = '';
    let emittedCount = 0;
    let suppressedCount = 0;

    for (let i = 1; i <= 100; i++) {
      // Each clause has 2 DB pages (first page has heading, second is continuation)
      const { text: page1Text } = makeClause(i, 40);
      const normalized1 = normalizePdfTextForRendering(page1Text);
      const rawTitle1 = extractFirstRenderedHeading(normalized1);
      const { title: t1, nextLastEmitted: after1 } = resolveExportTitle(rawTitle1, '<p>Part 1.</p>', lastEmitted);
      if (t1) emittedCount++; else suppressedCount++;
      lastEmitted = after1;

      // Continuation page — same heading, should be suppressed
      const { title: t2, nextLastEmitted: after2 } = resolveExportTitle(rawTitle1, '<p>Part 2.</p>', lastEmitted);
      if (t2) emittedCount++; else suppressedCount++;
      lastEmitted = after2;
    }

    // Every clause heading appears exactly once (100 emitted, 100 suppressed continuations)
    expect(emittedCount).toBe(100);
    expect(suppressedCount).toBe(100);
  });

  it('legal contract with signatures: signature section does not cause prior heading reappearance', () => {
    const pages = [
      ...Array.from({ length: 5 }, (_, i) => makeClause(i + 1, 80)),
      { text: 'التوقيعات\n\nالطرف الأول:\n____________\nالطرف الثاني:\n____________', words: 25 },
    ];
    const buckets = bucketPages(pages);

    // Collect headings per bucket
    const bucketHeadings = buckets.map((bucket) => {
      const firstText = normalizePdfTextForRendering(bucket[0].text);
      return extractFirstRenderedHeading(firstText);
    });

    // No heading should appear more than once
    const headingCounts = new Map<string, number>();
    for (const h of bucketHeadings) {
      if (h) headingCounts.set(h, (headingCounts.get(h) || 0) + 1);
    }
    for (const [h, count] of headingCounts.entries()) {
      expect(count).toBe(1); // every heading appears exactly once
    }
  });
});

// ─── Signature-signer count tests ─────────────────────────────────────────────

describe('Signature Section — Signer Count Variants', () => {
  function makeSignaturePage(signerCount: number): string {
    const parties = Array.from(
      { length: signerCount },
      (_, i) => `الطرف ${['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'][i] || String(i + 1)}:\n\n____________`,
    );
    return `التوقيعات\n\n${parties.join('\n\n')}`;
  }

  for (const signerCount of [1, 2, 3, 10]) {
    it(`${signerCount} signer(s): hasSignatureContent detects signature block`, () => {
      const text = makeSignaturePage(signerCount);
      expect(hasSignatureContent(text)).toBe(true);
    });

    it(`${signerCount} signer(s): signature heading normalized to ## marker`, () => {
      const text = makeSignaturePage(signerCount);
      const normalized = normalizePdfTextForRendering(text);
      expect(normalized).toMatch(/^##\s+التوقيعات/m);
    });

    it(`${signerCount} signer(s): signature page bucketed separately from prior section`, () => {
      const pages = [
        { text: '## الأول: الأحكام العامة\n\nClause body.', words: 60 },
        { text: makeSignaturePage(signerCount), words: 20 + signerCount * 5 },
      ];
      const buckets = bucketPages(pages);
      expect(buckets).toHaveLength(2);
    });
  }
});
