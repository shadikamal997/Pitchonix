// Phase Ω.CONTENT.3B — shared reopen matching + placeholder policy.
//
// Fixes two detector defects found in Ω.CONTENT.3A:
//  • imprecise substring matching ("slide 2" matched inside "Cost slide 2"),
//  • synthetic placeholder slide titles ("Slide 12") counted as authored content.

export const norm = (s: any): string =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** First `words` normalized tokens of `s` — the stored needle. */
export const chunk = (s: any, words = 8): string =>
  norm(s).split(' ').filter(Boolean).slice(0, words).join(' ');

/**
 * A synthetic fallback title the importer/exporter fabricates for an UNTITLED
 * slide — "Slide 1", "Slide 12", "slide 7", etc. It is a structural placeholder,
 * NOT authored content, and must not count as real content loss.
 */
export const PLACEHOLDER_TITLE = /^slide\s+\d+$/i;
export const isPlaceholderTitle = (text: any): boolean =>
  PLACEHOLDER_TITLE.test(String(text ?? '').trim());

/**
 * Split re-parsed export text into normalized segments (one per text run / line).
 * Preserving run boundaries is what makes precise short-needle matching possible.
 */
export const segmentsOf = (rawText: any): string[] =>
  String(rawText ?? '')
    .split(/[\n\r]+/)
    .map(norm)
    .filter(Boolean);

/**
 * Is `needle` genuinely present in the re-parsed export?
 *
 *  • Content-rich needles (≥4 tokens or ≥24 chars) are unique enough that a
 *    substring match against the full haystack is safe.
 *  • Short needles ("slide 2", "metric q1 q2") use SEGMENT-BOUNDARY-ANCHORED
 *    matching: the needle must START at the beginning of an exported text run
 *    and END on a token boundary. It may span consecutive runs, so a multi-cell
 *    table row ("metric q1 q2", rendered as runs "Metric","Q1","Q2") still
 *    matches — while a suffix coincidence ("slide 2" inside "cost slide 2") does
 *    NOT, because no run starts with "slide".
 */
export function phrasePresent(needle: any, hay: string, segments: string[]): boolean {
  const nd = norm(needle);
  if (!nd) return true;
  const tokens = nd.split(' ').filter(Boolean);
  if (tokens.length >= 4 || nd.length >= 24) return hay.includes(nd);
  return anchoredMatch(nd, segments);
}

/** True when `needle` occurs in the run stream starting at a run boundary. */
function anchoredMatch(needle: string, segments: string[]): boolean {
  const joined = segments.join(' ');
  let offset = 0;
  for (let k = 0; k < segments.length; k++) {
    if (joined.startsWith(needle, offset)) {
      const end = offset + needle.length;
      if (end === joined.length || joined[end] === ' ') return true;
    }
    offset += segments[k].length + 1; // +1 for the joining space
  }
  return false;
}
