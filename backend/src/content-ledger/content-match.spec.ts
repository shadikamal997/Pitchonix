import { phrasePresent, isPlaceholderTitle, segmentsOf, PLACEHOLDER_TITLE } from './content-match';

/** Phase Ω.CONTENT.3B — matcher + placeholder policy unit tests. */

describe('content-match — Phase Ω.CONTENT.3B', () => {
  describe('isPlaceholderTitle', () => {
    it.each(['Slide 1', 'Slide 12', 'slide 7', '  Slide 20  '])(
      'treats %p as a placeholder',
      (t) => {
        expect(isPlaceholderTitle(t)).toBe(true);
      },
    );
    it.each(['Slide Title Number 1', 'Q1 Revenue', 'Executive Summary', 'Slide deck overview', ''])(
      'treats %p as authored',
      (t) => {
        expect(isPlaceholderTitle(t)).toBe(false);
      },
    );
  });

  describe('phrasePresent — precise matching (fixes substring false positives)', () => {
    // The exact Ω.CONTENT.3A false positive: "slide 2" must NOT match inside "Cost slide 2".
    it('rejects a short needle that is only a suffix of a longer segment', () => {
      const segs = segmentsOf(
        'Cost slide 2\nRevenue slide 2\nSubtitle descriptor for slide 2 overview',
      );
      const hay = segs.join(' ');
      expect(phrasePresent('slide 2', hay, segs)).toBe(false);
    });

    it('matches a short needle that IS a whole segment', () => {
      const segs = segmentsOf('Slide 2\nCost overview');
      expect(phrasePresent('slide 2', segs.join(' '), segs)).toBe(true);
    });

    it('matches a short needle that is a left-anchored leading phrase', () => {
      const segs = segmentsOf('Slide 2 of 20\nbody');
      expect(phrasePresent('slide 2', segs.join(' '), segs)).toBe(true);
    });

    it('matches a multi-run table row spanning consecutive cell runs', () => {
      // Table row "Metric | Q1 | Q2" renders as separate cell runs.
      const segs = segmentsOf('Metric\nQ1\nQ2\nRevenue');
      expect(phrasePresent('metric q1 q2', segs.join(' '), segs)).toBe(true);
    });

    it('does not match a multi-token needle whose first token is mid-run', () => {
      const segs = segmentsOf('Cost metric\nQ1\nQ2');
      expect(phrasePresent('metric q1 q2', segs.join(' '), segs)).toBe(false);
    });

    it('matches content-rich needles via substring (authored titles survive)', () => {
      const segs = segmentsOf('Slide Title Number 2\nbody text here');
      expect(phrasePresent('slide title number 2', segs.join(' '), segs)).toBe(true);
    });

    it('reports a genuinely absent needle as not present', () => {
      const segs = segmentsOf('Slide Title Number 1\nCost slide 1');
      expect(phrasePresent('slide title number 9', segs.join(' '), segs)).toBe(false);
    });

    it('empty needle is vacuously present', () => {
      expect(phrasePresent('', 'anything', ['anything'])).toBe(true);
    });
  });

  it('PLACEHOLDER_TITLE pattern is anchored (no false matches on real titles)', () => {
    expect(PLACEHOLDER_TITLE.test('Roadmap slide 3 details')).toBe(false);
  });
});
