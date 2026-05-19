import { Test, TestingModule } from '@nestjs/testing';
import { ContentEnhancementService } from './content-enhancement.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Tests for the SafeContentEnhancementService.
 *
 * These tests verify:
 *   1. Safe grammar fixes work
 *   2. Structure is preserved (no paragraph → bullet conversion)
 *   3. URLs / abbreviations / decimals are protected
 *   4. Pipeline is idempotent (running twice == running once)
 *   5. Tone modes are explicit and validated
 *   6. Destructive legacy flags are ignored without throwing
 *   7. HTML input round-trips with tags intact
 */
describe('ContentEnhancementService (safe pipeline)', () => {
  let service: ContentEnhancementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentEnhancementService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<ContentEnhancementService>(ContentEnhancementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Grammar fixes ─────────────────────────────────────────────────────────
  describe('grammar fixes', () => {
    it('fixes their/there confusion', async () => {
      const r = await service.enhanceContent('their is a problem here', { fixGrammar: true });
      expect(r.enhancedContent).toContain('there is');
    });

    it('fixes your → you\'re in clear verb contexts', async () => {
      const r = await service.enhanceContent('your going to like this', { fixGrammar: true });
      expect(r.enhancedContent).toContain("you're going");
    });

    it('fixes could of → could have', async () => {
      const r = await service.enhanceContent('I could of done better', { fixGrammar: true });
      expect(r.enhancedContent).toContain('could have');
    });

    it('capitalizes standalone "i"', async () => {
      const r = await service.enhanceContent('i went to the store', { fixGrammar: true });
      expect(r.enhancedContent).toContain('I went');
    });

    it('does not capitalize "i" inside other words', async () => {
      const r = await service.enhanceContent('This is irrigation', { fixGrammar: true });
      expect(r.enhancedContent).toContain('irrigation');
    });

    it('fixes a/an before vowel/consonant sounds', async () => {
      const r = await service.enhanceContent('a hour, an user', { fixGrammar: true });
      expect(r.enhancedContent).toContain('an hour');
      expect(r.enhancedContent).toContain('a user');
    });
  });

  // ── Redundancy fixes ──────────────────────────────────────────────────────
  describe('redundancy fixes', () => {
    it('removes redundant modifiers when clarity is enabled', async () => {
      const r = await service.enhanceContent(
        'past history, free gift, end result',
        { improveClarity: true },
      );
      expect(r.enhancedContent).not.toContain('past history');
      expect(r.enhancedContent).not.toContain('free gift');
      expect(r.enhancedContent).not.toContain('end result');
    });
  });

  // ── Structure preservation ────────────────────────────────────────────────
  describe('structure preservation', () => {
    it('does NOT convert paragraphs to bullet lists', async () => {
      const longParagraph =
        'Artificial Intelligence has become important. It has changed how we work. ' +
        'It has changed how we communicate. It will continue to evolve. ' +
        'New applications appear every day.';
      const r = await service.enhanceContent(longParagraph, {
        fixGrammar: true, improveClarity: true,
      });
      expect(r.enhancedContent).not.toMatch(/^\s*-\s/m);
    });

    it('preserves HTML structure (h1, p, ul, li)', async () => {
      const html =
        '<h1>Title</h1>' +
        '<p>This is a paragraph. It has multiple sentences. ' +
        'It should stay as a paragraph.</p>' +
        '<ul><li>First item</li><li>Second item</li></ul>';
      const r = await service.enhanceContent(html, { fixGrammar: true, improveClarity: true });
      expect(r.enhancedContent).toContain('<h1>');
      expect(r.enhancedContent).toContain('</h1>');
      expect(r.enhancedContent).toContain('<p>');
      expect(r.enhancedContent).toContain('<ul>');
      expect(r.enhancedContent).toContain('<li>');
      expect(r.inputFormat).toBe('html');
    });

    it('preserves the same number of paragraphs', async () => {
      const html =
        '<p>their is one problem.</p>' +
        '<p>their is another problem.</p>' +
        '<p>their is yet another problem.</p>';
      const r = await service.enhanceContent(html, { fixGrammar: true });
      const before = (html.match(/<p>/g) || []).length;
      const after = (r.enhancedContent.match(/<p>/g) || []).length;
      expect(after).toBe(before);
    });
  });

  // ── Token protection ──────────────────────────────────────────────────────
  describe('protected tokens', () => {
    it('does not break URLs', async () => {
      const text = 'Visit https://example.com/page for details. This is great.';
      const r = await service.enhanceContent(text, { fixGrammar: true, improveClarity: true });
      expect(r.enhancedContent).toContain('https://example.com/page');
    });

    it('does not break file names', async () => {
      const text = 'Open report.pdf and review.docx for details.';
      const r = await service.enhanceContent(text, { fixGrammar: true });
      expect(r.enhancedContent).toContain('report.pdf');
      expect(r.enhancedContent).toContain('review.docx');
    });

    it('does not break version numbers and decimals', async () => {
      const text = 'Released v1.2.3 with 3.14 accuracy and 99.9% reliability.';
      const r = await service.enhanceContent(text, { fixGrammar: true });
      expect(r.enhancedContent).toContain('v1.2.3');
      expect(r.enhancedContent).toContain('3.14');
      expect(r.enhancedContent).toContain('99.9%');
    });

    it('does not break common abbreviations', async () => {
      const text = 'Dr. Smith from Acme Inc. visited the U.S. last year.';
      const r = await service.enhanceContent(text, { fixGrammar: true });
      expect(r.enhancedContent).toContain('Dr. Smith');
      expect(r.enhancedContent).toContain('Acme Inc.');
      expect(r.enhancedContent).toContain('U.S.');
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────
  describe('idempotency', () => {
    it('produces the same result when run twice', async () => {
      const input =
        '<h1>Test</h1><p>their is alot of issues. ' +
        'i could of done better. seperate the items.</p>';
      const first = await service.enhanceContent(input, { fixGrammar: true, improveClarity: true });
      const second = await service.enhanceContent(first.enhancedContent, { fixGrammar: true, improveClarity: true });
      expect(second.enhancedContent).toBe(first.enhancedContent);
    });

    it('produces the same result when run three times', async () => {
      const input = 'could of, alot, their is, recieve, definately.';
      const first = await service.enhanceContent(input, { fixGrammar: true });
      const second = await service.enhanceContent(first.enhancedContent, { fixGrammar: true });
      const third = await service.enhanceContent(second.enhancedContent, { fixGrammar: true });
      expect(third.enhancedContent).toBe(first.enhancedContent);
    });
  });

  // ── Tone modes ────────────────────────────────────────────────────────────
  describe('tone modes', () => {
    it('expands contractions in formal tone', async () => {
      const r = await service.enhanceContent("I can't do that. I don't want to.", { tone: 'formal' });
      expect(r.enhancedContent).toContain('cannot');
      expect(r.enhancedContent).toContain('do not');
    });

    it('expands gonna/kinda when grammar fixes are on', async () => {
      const r = await service.enhanceContent('gonna make this work, kinda important', {
        fixGrammar: true, tone: 'formal',
      });
      expect(r.enhancedContent).not.toContain('gonna');
      expect(r.enhancedContent).not.toContain('kinda');
    });

    it('treats unknown tone as neutral (no-op for tone)', async () => {
      const r = await service.enhanceContent("I can't do that.", { tone: 'professional' as any });
      // 'professional' is not valid → falls back to neutral, so contraction stays
      expect(r.enhancedContent).toContain("can't");
    });

    it('does nothing when no flags are enabled', async () => {
      const r = await service.enhanceContent('their is alot of issues here', {});
      expect(r.enhancedContent).toBe('their is alot of issues here');
      expect(r.changes.length).toBe(0);
    });
  });

  // ── Legacy destructive flags ──────────────────────────────────────────────
  describe('legacy destructive flags', () => {
    it('ignores restructure flag', async () => {
      const paragraph = 'One. Two. Three. Four. Five sentences here.';
      const r = await service.enhanceContent(paragraph, { restructure: true } as any);
      expect(r.enhancedContent).toBe(paragraph);
    });

    it('ignores expand / shorten / professionalize / makeEngaging', async () => {
      const r = await service.enhanceContent('plain text', {
        expand: true, shorten: true, professionalize: true, makeEngaging: true,
      } as any);
      expect(r.enhancedContent).toBe('plain text');
    });
  });

  // ── Quality scoring ───────────────────────────────────────────────────────
  describe('quality scoring', () => {
    it('returns a quality score in range 0-100', async () => {
      const r = await service.enhanceContent('Hello world. This is a test.', {});
      expect(r.qualityBefore).toBeGreaterThanOrEqual(0);
      expect(r.qualityBefore).toBeLessThanOrEqual(100);
      expect(r.qualityAfter).toBeGreaterThanOrEqual(0);
      expect(r.qualityAfter).toBeLessThanOrEqual(100);
    });

    it('shows improvement when fixing real grammar issues', async () => {
      const r = await service.enhanceContent(
        'their is alot of issues here. i think we could of done better. ' +
        'recieve the seperate items definately by tomorrow.',
        { fixGrammar: true },
      );
      expect(r.qualityAfter).toBeGreaterThanOrEqual(r.qualityBefore);
    });
  });

  // ── Semantic drift rollback ───────────────────────────────────────────────
  describe('semantic integrity', () => {
    it('preserves the HTML tag count after enhancement', async () => {
      const html =
        '<h1>Title</h1>' +
        '<p>their is a problem.</p>' +
        '<ul><li>Item one</li><li>Item two</li></ul>';
      const r = await service.enhanceContent(html, { fixGrammar: true, improveClarity: true });
      expect((r.enhancedContent.match(/<p>/g) || []).length).toBe(1);
      expect((r.enhancedContent.match(/<li>/g) || []).length).toBe(2);
      expect((r.enhancedContent.match(/<h1>/g) || []).length).toBe(1);
      expect(r.rolledBack).toBe(false);
    });
  });
});
