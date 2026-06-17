const BIDI_CONTROL_CHARS = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

const GENERIC_TITLES = new Set([
  'cover',
  'content',
  'continued',
  'introduction',
  'introduction (continued)',
  'table of contents',
  'toc',
]);

const COVER_PLACEHOLDER_LABELS = new Set([
  'confidential',
  'draft',
  'private',
  'metadata',
  'table of contents',
  'toc',
  'signatures',
  'signature',
  'التوقيعات',
  'التوقيع',
]);

function cleanLine(value: string): string {
  return String(value || '')
    .replace(BIDI_CONTROL_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isBareHashLine(line: string): boolean {
  return /^#{1,6}\s*$/.test(line.trim());
}

function hasArabic(value: string): boolean {
  return /[\u0600-\u06ff]/.test(value);
}

function truncateAtBoundary(value: string, maxLength: number): string {
  const normalized = cleanLine(value);
  if (normalized.length <= maxLength) return normalized;

  const slice = normalized.slice(0, maxLength);
  const boundary = Math.max(
    slice.lastIndexOf('.'),
    slice.lastIndexOf('،'),
    slice.lastIndexOf(';'),
    slice.lastIndexOf(':'),
    slice.lastIndexOf(' '),
  );
  const trimmed = slice.slice(0, boundary > maxLength * 0.6 ? boundary : maxLength).trim();
  return `${trimmed.replace(/[.,;:،]+$/, '')}...`;
}

function isSignatureHeading(line: string): boolean {
  const normalized = cleanLine(line).replace(/^#{1,6}\s+/, '');
  return /^(التوقيعات|التوقيع|signatures?)$/i.test(normalized);
}

function isArabicLegalSectionHeading(line: string): boolean {
  const normalized = cleanLine(line).replace(/^#{1,6}\s+/, '');
  if (!normalized || normalized.length > 160 || !hasArabic(normalized)) return false;
  if (!/[：:]/.test(normalized)) return false;

  const beforeColon = normalized.split(/[：:]/)[0];
  return /(?:أول|اول|ثاني|ثالث|رابع|خامس|سادس|سابع|ثامن|تاسع|عاشر|عشر|الحادي|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع)/.test(
    beforeColon,
  );
}

export function isRenderablePdfPage(page: any): boolean {
  const pageType = page?.pageType || 'content';
  if (pageType === 'cover' || pageType === 'toc') return true;

  const text = stripBareHashLines(String(page?.content?.text || '')).trim();
  const html = String(page?.content?.html || '').trim();
  const hasVisual = !!(
    page?.content?.charts?.length ||
    page?.content?.heroImage ||
    page?.content?.image ||
    page?.content?.placedImages?.length
  );
  if (hasVisual) return true;
  if (html.length > 10) return true;
  if (!text) return false;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 3 && /^(confidential|draft|private|metadata)$/i.test(text)) {
    return false;
  }

  return text.length > 3;
}

export function stripBareHashLines(text: string): string {
  return String(text || '')
    .split('\n')
    .filter((line) => !isBareHashLine(line))
    .join('\n');
}

export function normalizePdfTextForRendering(text: string): string {
  return stripBareHashLines(text)
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (/^#{1,6}\s+/.test(trimmed)) return line;
      if (isArabicLegalSectionHeading(trimmed) || isSignatureHeading(trimmed)) {
        return `${line.match(/^\s*/)?.[0] || ''}## ${trimmed}`;
      }
      return line;
    })
    .join('\n');
}

export function firstMeaningfulLine(text: string): string {
  return (
    stripBareHashLines(text)
      .split('\n')
      .map(cleanLine)
      .find(Boolean) || ''
  );
}

export function extractFirstRenderedHeading(normalizedText: string): string {
  const heading = normalizedText.match(/^#{1,3}\s+(.+)$/m)?.[1];
  return cleanLine(heading || '');
}

export function isGenericPdfTitle(title: string): boolean {
  const normalized = cleanLine(title).toLowerCase();
  if (!normalized) return true;
  if (GENERIC_TITLES.has(normalized)) return true;
  if (/^page\s+\d+$/i.test(normalized)) return true;
  return false;
}

export function buildTitleFrequency(pages: any[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const page of pages) {
    const key = cleanLine(page?.title || '').toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export function resolvePdfPageDisplayTitle(
  page: any,
  normalizedText: string,
  titleFrequency: Map<string, number>,
): string {
  const contentHeading = extractFirstRenderedHeading(normalizedText);
  if (contentHeading) return contentHeading;

  const storedTitle = cleanLine(page?.title || '');
  if (isGenericPdfTitle(storedTitle)) return '';

  const titleKey = storedTitle.toLowerCase();
  if ((titleFrequency.get(titleKey) || 0) > 2) return '';

  const firstLine = firstMeaningfulLine(normalizedText);
  if (firstLine && firstLine.toLowerCase() === storedTitle.toLowerCase()) return '';

  return storedTitle;
}

export function hasSignatureContent(text: string): boolean {
  return /_{4,}|الطرف\s+(الأول|الثاني|الثالث|الرابع)|التوقيع|signature/i.test(
    String(text || ''),
  );
}

export function hasRtlPdfContent(pages: any[]): boolean {
  return pages.some((page: any) => {
    const text = [page?.title, page?.content?.text, page?.content?.html].filter(Boolean).join(' ');
    return hasArabic(text);
  });
}

export function normalizeCoverDescription(value: string): string {
  return truncateAtBoundary(value, 420);
}

export function normalizeCoverOverview(items: unknown): string[] {
  if (!Array.isArray(items)) return [];

  const seen = new Set<string>();
  return items
    .map((item) => cleanLine(String(item || '')))
    .filter((item) => {
      if (!item) return false;
      const key = item.toLowerCase();
      if (COVER_PLACEHOLDER_LABELS.has(key)) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}
