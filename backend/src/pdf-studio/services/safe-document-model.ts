import {
  buildTitleFrequency,
  isRenderablePdfPage,
  normalizeCoverDescription,
  normalizeCoverOverview,
  normalizePdfTextForRendering,
  resolvePdfPageDisplayTitle,
} from './rendering-normalization';

export interface SafePdfStudioPage {
  source: any;
  pageType: string;
  pageNumber: number;
  displayTitle: string;
  normalizedText: string;
  html: string;
  cover?: {
    title: string;
    subtitle: string;
    description: string;
    overview: string[];
    date: string;
  };
}

export interface SafePdfStudioDocument {
  source: any;
  title: string;
  pages: SafePdfStudioPage[];
  totalPages: number;
}

export function buildSafePdfStudioDocument(document: any): SafePdfStudioDocument {
  const sourcePages = Array.isArray(document?.pages) ? document.pages : [];
  const renderablePages = sourcePages.filter(isRenderablePdfPage);
  const titleFrequency = buildTitleFrequency(renderablePages);

  const pages = renderablePages.map((page: any, index: number): SafePdfStudioPage => {
    const pageType = page?.pageType || 'content';

    if (pageType === 'cover') {
      const coverData = parseCoverData(page, document);
      const normalizedText = [
        coverData.title,
        coverData.subtitle,
        coverData.description,
        ...coverData.overview,
        coverData.date,
      ]
        .filter(Boolean)
        .join('\n\n');

      return {
        source: page,
        pageType,
        pageNumber: index + 1,
        displayTitle: coverData.title,
        normalizedText,
        html: String(page?.content?.html || ''),
        cover: coverData,
      };
    }

    const normalizedText = normalizePdfTextForRendering(String(page?.content?.text || ''));
    return {
      source: page,
      pageType,
      pageNumber: index + 1,
      displayTitle: resolvePdfPageDisplayTitle(page, normalizedText, titleFrequency),
      normalizedText,
      html: String(page?.content?.html || ''),
    };
  });

  return {
    source: document,
    title: String(document?.title || 'Untitled Document'),
    pages,
    totalPages: pages.length,
  };
}

function parseCoverData(page: any, document: any): SafePdfStudioPage['cover'] {
  let parsed: any = {};
  try {
    parsed = JSON.parse(page?.content?.text || '{}');
  } catch {
    parsed = {};
  }

  return {
    title: String(document?.title || parsed.title || page?.title || ''),
    subtitle: String(parsed.subtitle || document?.outline?.detectedType || ''),
    description: normalizeCoverDescription(parsed.description || parsed.summary || ''),
    overview: normalizeCoverOverview(parsed.overview),
    date: String(
      parsed.date ||
        new Date(document?.createdAt || Date.now()).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
    ),
  };
}
