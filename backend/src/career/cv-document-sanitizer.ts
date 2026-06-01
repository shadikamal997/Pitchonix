import {
  CvDocumentContent_CV,
  CvSectionKey,
  DEFAULT_CV_SECTION_ORDER,
  DEFAULT_RESUME_SECTION_ORDER,
} from './cv-types';
import { isCvSectionHeading, sanitizeCvSummaryText } from './cv-profile-sanitizer';

const VALID_SECTION_KEYS = new Set<CvSectionKey>([
  'header', 'summary', 'experience', 'education', 'skills', 'languages',
  'projects', 'certifications', 'awards', 'publications', 'references',
  'testimonials', 'caseStudies', 'achievements',
]);

const DEFAULT_BY_DOCTYPE: Record<string, CvSectionKey[]> = {
  cv: DEFAULT_CV_SECTION_ORDER,
  resume: DEFAULT_RESUME_SECTION_ORDER,
};

export interface CvDocumentContentSanitizeReport {
  sectionOrderFixed: boolean;
  summaryFixed: boolean;
  headerFixed: boolean;
  overridesFixed: boolean;
  anyChange: boolean;
  issues: string[];
}

export function rebuildCvContentFromProfile(doctype: string): CvDocumentContent_CV {
  return { sectionOrder: [...(DEFAULT_BY_DOCTYPE[doctype] || DEFAULT_CV_SECTION_ORDER)] };
}

export function sanitizeCvDocumentContent(
  content: any,
  doctype = 'cv',
): { content: CvDocumentContent_CV; report: CvDocumentContentSanitizeReport } {
  const report: CvDocumentContentSanitizeReport = {
    sectionOrderFixed: false,
    summaryFixed: false,
    headerFixed: false,
    overridesFixed: false,
    anyChange: false,
    issues: [],
  };

  const source = (content && typeof content === 'object') ? content : {};
  const next: any = { ...source };
  const defaults = DEFAULT_BY_DOCTYPE[doctype] || DEFAULT_CV_SECTION_ORDER;

  const rawOrder = Array.isArray(source.sectionOrder) ? source.sectionOrder : defaults;
  const seen = new Set<string>();
  const sectionOrder = rawOrder.filter((key: any) => {
    if (!VALID_SECTION_KEYS.has(key)) {
      report.issues.push(`Unknown section key removed: ${String(key)}`);
      return false;
    }
    if (seen.has(key)) {
      report.issues.push(`Duplicate section removed: ${String(key)}`);
      return false;
    }
    seen.add(key);
    return true;
  });
  const normalizedOrder = sectionOrder.length ? sectionOrder : defaults;
  if (JSON.stringify(rawOrder) !== JSON.stringify(normalizedOrder)) {
    next.sectionOrder = normalizedOrder;
    report.sectionOrderFixed = true;
  } else {
    next.sectionOrder = normalizedOrder;
  }

  for (const key of ['header', 'fullName', 'name']) {
    if (typeof next[key] === 'string' && isCvSectionHeading(next[key])) {
      delete next[key];
      report.headerFixed = true;
      report.issues.push(`Invalid ${key} removed from document content`);
    }
  }

  const overrides = { ...(source.sectionOverrides || {}) };
  if (typeof overrides.summary === 'string') {
    const cleaned = sanitizeCvSummaryText(overrides.summary);
    if (!cleaned || cleaned !== overrides.summary) {
      if (cleaned) overrides.summary = cleaned;
      else delete overrides.summary;
      report.summaryFixed = true;
      report.issues.push('Polluted document summary override repaired');
    }
  }
  for (const key of ['experienceIds', 'skillIds', 'projectIds']) {
    if (overrides[key] !== undefined && !Array.isArray(overrides[key])) {
      delete overrides[key];
      report.overridesFixed = true;
      report.issues.push(`Invalid ${key} override removed`);
    }
  }
  if (Object.keys(overrides).length) next.sectionOverrides = overrides;
  else if (next.sectionOverrides) {
    delete next.sectionOverrides;
    report.overridesFixed = true;
  }

  for (const legacyKey of ['summary', 'experience', 'education', 'skills', 'languages']) {
    if (legacyKey in next) {
      delete next[legacyKey];
      report.overridesFixed = true;
      report.issues.push(`Legacy ${legacyKey} document content removed`);
    }
  }

  report.anyChange = report.sectionOrderFixed || report.summaryFixed || report.headerFixed || report.overridesFixed;
  return { content: next as CvDocumentContent_CV, report };
}

export function detectCvDocumentContentCorruption(content: any, doctype = 'cv'): string[] {
  return sanitizeCvDocumentContent(content, doctype).report.issues;
}
