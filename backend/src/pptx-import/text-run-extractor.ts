import { asArray } from './ooxml-parser';

// =============================================================================
//  Phase 38.5F — Text run formatting extractor.
//
//  PowerPoint stores per-run formatting (bold, italic, color, size,
//  underline, fontFace) inside <a:r><a:rPr/></a:r>. The MVP importer
//  flattened everything to plain `{ text }` content — this module
//  preserves the run structure so the export pipeline can emit
//  back-formatted text and the editor can render rich text accurately.
//
//  Output shape (compatible with Pitchonix's TipTap-leaning model):
//    {
//      text:  string,                  // flat concatenation for legacy callers
//      runs:  Array<{
//        text:  string,
//        bold?, italic?, underline?,
//        size?: number,                // points
//        color?: string,               // #RRGGBB
//        font?:  string,
//      }>,
//    }
//
//  Multiple <a:p> paragraphs become a single content blob with `\n`-joined
//  text; richer per-paragraph capture lives in `text-style-inheritance.ts`
//  for the list inheritance case.
// =============================================================================

export interface TextRun {
  text:       string;
  bold?:      boolean;
  italic?:    boolean;
  underline?: boolean;
  size?:      number;
  color?:     string;
  font?:      string;
}

export interface RichText {
  text: string;
  runs: TextRun[];
}

/** Walk a <p:txBody> (or any node containing <a:p>) → RichText. */
export function extractRichText(txBody: any): RichText {
  if (!txBody) return { text: '', runs: [] };
  const runs: TextRun[] = [];
  const ps = asArray(txBody['a:p']);

  ps.forEach((p, pi) => {
    const rs = asArray(p['a:r']);
    rs.forEach((r) => {
      const t = r['a:t'];
      const text = typeof t === 'string' ? t : (t?.['#text'] || '');
      if (!text) return;
      runs.push(buildRun(text, r['a:rPr']));
    });
    // Hard line breaks: <a:br/> within a paragraph.
    if (p['a:br'] !== undefined) {
      runs.push({ text: '\n' });
    }
    // Paragraph separator (newline) — but not after the last paragraph.
    if (pi < ps.length - 1 && runs.length > 0) {
      runs.push({ text: '\n' });
    }
  });

  const text = runs.map((r) => r.text).join('');
  return { text, runs };
}

function buildRun(text: string, rPr: any): TextRun {
  if (!rPr) return { text };
  const run: TextRun = { text };

  if (rPr['@b'] === '1' || rPr['@b'] === 'true') run.bold = true;
  if (rPr['@i'] === '1' || rPr['@i'] === 'true') run.italic = true;
  if (rPr['@u'] && rPr['@u'] !== 'none') run.underline = true;

  // @sz is in hundredths of a point (sz="1800" = 18pt).
  if (rPr['@sz']) {
    const n = Number(rPr['@sz']);
    if (Number.isFinite(n)) run.size = n / 100;
  }

  // Colour — solidFill > srgbClr / schemeClr.
  const srgb   = rPr['a:solidFill']?.['a:srgbClr']?.['@val'];
  const scheme = rPr['a:solidFill']?.['a:schemeClr']?.['@val'];
  if (srgb)        run.color = `#${String(srgb).toUpperCase()}`;
  else if (scheme) run.color = `scheme:${scheme}`;

  const face = rPr['a:latin']?.['@typeface'] || rPr['a:ea']?.['@typeface'];
  if (face) run.font = face;

  return run;
}
