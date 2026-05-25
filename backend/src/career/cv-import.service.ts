import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PptxImportService } from '../pptx-import/pptx-import.service';
import { UniversalConversionService } from '../universal-conversion/universal-conversion.service';
import { CvProfilesService } from './cv-profiles.service';
import { CvProfileDto } from './cv-types';

// =============================================================================
//  Phase 42L + 42M + 42.6 — CV import.
//
//  Three input flavours:
//
//    1. DOCX / PDF / HTML / MD — route through UniversalConversionService to
//       get a UniversalDocument; then walk pages for section-anchored blocks.
//       Section anchors come from either real heading nodes OR paragraph
//       nodes whose text matches a known section name (bold-but-not-h1
//       styling is common in PDF exports).
//
//    2. LinkedIn export JSON — accept the same JSON shape LinkedIn provides
//       (or a curated subset like { profile, positions, education, skills }),
//       map onto our CvProfile section arrays.
//
//  Phase 42.6 hardening:
//    - heading detection works on paragraph nodes too (PDF / fancy DOCX
//      often emit paragraph + bold, not real H1/H2)
//    - normalises trailing punctuation, ALL-CAPS, leading/trailing space
//    - expanded alias table (Work History, Professional Background,
//      Technical Stack, Tools, Training, Courses, Profile, Objective, …)
//    - if zero sections found, runs a fallback pass that detects experience
//      blocks by date patterns, education by degree keywords, skills by
//      comma/pipe clusters
//    - returns `debug` payload in dev mode for the frontend to surface
// =============================================================================

const SECTION_HEADINGS: Record<string, keyof CvProfileDto> = {
  // Experience
  'experience':              'experience',
  'work experience':         'experience',
  'professional experience': 'experience',
  'employment':              'experience',
  'employment history':      'experience',
  'work history':            'experience',
  'professional background': 'experience',
  'career':                  'experience',
  'career history':          'experience',
  'positions':               'experience',
  'roles':                   'experience',
  'volunteer experience':    'experience',

  // Education
  'education':               'education',
  'academic background':     'education',
  'academic':                'education',
  'academic history':        'education',
  'qualifications':          'certifications',
  'training':                'certifications',
  'courses':                 'certifications',

  // Skills
  'skills':                  'skills',
  'technical skills':        'skills',
  'core skills':             'skills',
  'core competencies':       'skills',
  'competencies':            'skills',
  'technical stack':         'skills',
  'tech stack':              'skills',
  'tools':                   'skills',
  'tools & technologies':    'skills',
  'expertise':               'skills',
  'key skills':              'skills',
  'areas of expertise':      'skills',

  // Languages
  'languages':               'languages',
  'languages spoken':        'languages',
  'language proficiency':    'languages',

  // Projects
  'projects':                'projects',
  'side projects':           'projects',
  'portfolio':               'projects',
  'selected projects':       'projects',
  'notable projects':        'projects',
  'key projects':            'projects',

  // Certifications
  'certifications':          'certifications',
  'certificates':            'certifications',
  'licenses & certifications': 'certifications',
  'professional certifications': 'certifications',

  // Awards / Publications / References
  'awards':                  'awards',
  'awards & honors':         'awards',
  'awards & honours':        'awards',
  'achievements':            'awards',
  'honors':                  'awards',
  'recognition':             'awards',
  'publications':            'publications',
  'research':                'publications',
  'papers':                  'publications',
  'references':              'references',
  'referees':                'references',
};

// Summary-only headings (mapped to personal.summary, not a section array).
const SUMMARY_HEADINGS = new Set([
  'summary', 'profile', 'professional summary', 'professional profile',
  'objective', 'career objective', 'about', 'about me', 'introduction',
  'overview', 'personal statement', 'executive summary',
]);

@Injectable()
export class CvImportService {
  private readonly logger = new Logger(CvImportService.name);

  constructor(
    private readonly conversion: UniversalConversionService,
    private readonly profiles:   CvProfilesService,
    private readonly pptx:       PptxImportService,
  ) {}

  // ---------------------------------------------------------------------------
  //  DOCX / PDF / HTML / MD → CvProfile
  // ---------------------------------------------------------------------------

  async importFromFile(profileId: string, buffer: Buffer, filename: string, mimetype?: string): Promise<{ profile: CvProfileDto; warnings: string[]; debug?: any }> {
    if (!buffer?.length) throw new BadRequestException('Empty file buffer');
    const result = await this.conversion.convert({
      buffer, filename, mimetype, targetFormat: 'html',
    });
    const udm = result.document;
    const warnings: string[] = [];

    // -----------------------------------------------------------------------
    //  Phase 42.6 — promote heading-like paragraphs to "synthetic" headings.
    //
    //  Many PDF/DOCX exports emit section markers ("EXPERIENCE", "Skills:",
    //  "Work History") as paragraph nodes with bold runs, NOT as h1/h2.
    //  We re-walk the tree once and tag those as type='heading' before the
    //  main extractor runs.
    // -----------------------------------------------------------------------
    const allLines: string[] = [];
    for (const page of udm.pages) {
      for (const node of page.nodes) {
        const t = (node as any).text || '';
        if (t) allLines.push(t);
        if (node.type === 'paragraph' && looksLikeHeading(t)) {
          (node as any).type = 'heading';
        }
      }
    }

    // Walk pages → collect section blocks anchored on heading text.
    const sections: Partial<Record<keyof CvProfileDto, string[]>> = {};
    const detectedHeadings: string[] = [];
    const unknownHeadings:  string[] = [];
    let currentSection: keyof CvProfileDto | null = null;
    const personal: any = {};
    let summaryParts: string[] = [];
    let inSummary = false;

    for (const page of udm.pages) {
      for (const node of page.nodes) {
        if (node.type === 'heading') {
          const raw  = (node.text || '').trim();
          const norm = normaliseHeading(raw);
          detectedHeadings.push(raw);
          const key = SECTION_HEADINGS[norm];
          if (key) {
            currentSection = key;
            sections[currentSection] = sections[currentSection] || [];
            inSummary = false;
          } else if (SUMMARY_HEADINGS.has(norm)) {
            currentSection = null;
            inSummary = true;
          } else {
            // Try substring fallback ("My Work Experience" → experience).
            const sub = matchHeadingBySubstring(norm);
            if (sub) {
              currentSection = sub;
              sections[currentSection] = sections[currentSection] || [];
              inSummary = false;
            } else {
              currentSection = null;
              inSummary = false;
              if (norm && norm.length < 40) unknownHeadings.push(raw);
            }
          }
          continue;
        }
        if (inSummary && (node.type === 'paragraph')) {
          summaryParts.push(node.text || '');
          continue;
        }
        if (currentSection) {
          const text = textFor(node);
          if (text) sections[currentSection]!.push(text);
        } else {
          // Top-of-document text → personal/contact heuristics.
          collectPersonal(personal, (node as any).text || '');
        }
      }
    }
    if (summaryParts.length > 0) personal.summary = summaryParts.join(' ');

    // -----------------------------------------------------------------------
    //  Phase 42.6 — fallback heuristics. If no real headings matched,
    //  scan every line for date / degree / skill-cluster signals.
    // -----------------------------------------------------------------------
    let usedFallback = false;
    if (Object.keys(sections).length === 0) {
      usedFallback = true;
      const fb = fallbackExtract(allLines);
      if (fb.experience.length)     sections.experience     = fb.experience;
      if (fb.education.length)      sections.education      = fb.education;
      if (fb.skills.length)         sections.skills         = fb.skills;
      if (fb.certifications.length) sections.certifications = fb.certifications;
      if (!personal.summary && fb.summary) personal.summary = fb.summary;
    }

    // Also do a full-text personal pass — names + contacts often live in
    // mid-document blocks too (e.g. address blocks).
    for (const line of allLines) collectPersonal(personal, line);

    const payload: Partial<CvProfileDto> = { personal };
    for (const key of Object.keys(sections) as (keyof CvProfileDto)[]) {
      const lines = sections[key] || [];
      payload[key] = mapLinesToSection(key, lines) as any;
    }

    // Build warnings + debug payload.
    const extractedCounts: Record<string, number> = {};
    for (const k of Object.keys(sections) as (keyof CvProfileDto)[]) {
      extractedCounts[k] = (payload[k] as any[])?.length || 0;
    }

    if (Object.keys(sections).length === 0) {
      warnings.push('No section headings or date patterns recognised — only personal info was extracted. Try "Analyze this CV" for a stronger pass, or paste the text manually.');
    } else if (usedFallback) {
      warnings.push('No standard headings detected — sections inferred from date / degree / skill-cluster patterns. Review carefully before saving.');
    }
    if (unknownHeadings.length > 0) {
      warnings.push(`Unrecognised section headings: ${unknownHeadings.slice(0, 5).join(', ')}${unknownHeadings.length > 5 ? ' (+ more)' : ''}.`);
    }

    const profile = await this.profiles.replaceFromImport(profileId, fileSourceFor(filename), payload);

    // Phase 42.6 — dev-mode debug payload, surfaced by the frontend warning card.
    const debug = process.env.NODE_ENV !== 'production' ? {
      rawTextPreview:    allLines.join('\n').slice(0, 1000),
      detectedHeadings:  detectedHeadings.slice(0, 30),
      unknownHeadings:   unknownHeadings.slice(0, 30),
      mappedSections:    extractedCounts,
      usedFallback,
      totalLines:        allLines.length,
    } : undefined;

    if (debug) this.logger.log(`CV import: ${allLines.length} lines, ${detectedHeadings.length} headings, mapped=${JSON.stringify(extractedCounts)}`);

    return { profile, warnings, debug };
  }

  // ---------------------------------------------------------------------------
  //  LinkedIn export JSON → CvProfile
  // ---------------------------------------------------------------------------

  async importFromLinkedIn(profileId: string, linkedin: any): Promise<{ profile: CvProfileDto; warnings: string[] }> {
    if (!linkedin || typeof linkedin !== 'object') throw new BadRequestException('LinkedIn payload missing or not an object');
    const warnings: string[] = [];

    const personal = {
      fullName: linkedin.firstName && linkedin.lastName ? `${linkedin.firstName} ${linkedin.lastName}` : linkedin.fullName,
      headline: linkedin.headline,
      location: typeof linkedin.location === 'string' ? linkedin.location : linkedin.location?.name,
      summary:  linkedin.summary,
      linkedin: linkedin.publicProfileUrl || linkedin.profileUrl,
      email:    linkedin.email,
      website:  linkedin.website,
    };

    const experience = (linkedin.positions || linkedin.experience || []).map((p: any, i: number) => ({
      id:       p.id || `exp-li-${i}`,
      company:  p.companyName || p.company || '',
      role:     p.title || p.role || '',
      location: typeof p.location === 'string' ? p.location : p.location?.name,
      start:    p.startDate?.year ? `${p.startDate.year}${p.startDate.month ? `-${String(p.startDate.month).padStart(2, '0')}` : ''}` : (p.start || ''),
      end:      p.endDate?.year   ? `${p.endDate.year}${p.endDate.month ? `-${String(p.endDate.month).padStart(2, '0')}` : ''}` : p.end,
      bullets:  Array.isArray(p.description) ? p.description : (p.description ? String(p.description).split('\n').filter(Boolean) : []),
    }));

    const education = (linkedin.educations || linkedin.education || []).map((e: any, i: number) => ({
      id:          e.id || `edu-li-${i}`,
      institution: e.schoolName || e.school || '',
      degree:      e.degree || e.degreeName,
      field:       e.fieldOfStudy || e.field,
      start:       e.startDate?.year ? String(e.startDate.year) : (e.start || ''),
      end:         e.endDate?.year   ? String(e.endDate.year)   : e.end,
      gpa:         e.grade,
      honors:      e.activities ? [String(e.activities)] : undefined,
    }));

    const skills = (linkedin.skills || []).map((s: any, i: number) => ({
      id:       `skill-li-${i}`,
      name:     typeof s === 'string' ? s : (s.name || s.skill || ''),
      category: 'technical' as const,
    })).filter((s: any) => s.name);

    const languages = (linkedin.languages || []).map((l: any, i: number) => ({
      id:          `lang-li-${i}`,
      name:        typeof l === 'string' ? l : l.language || l.name,
      proficiency: (l.proficiency || 'conversational').toLowerCase(),
    })).filter((l: any) => l.name);

    const certifications = (linkedin.certifications || []).map((c: any, i: number) => ({
      id:           c.id || `cert-li-${i}`,
      name:         c.name,
      issuer:       c.authority || c.issuer,
      date:         c.startDate?.year ? String(c.startDate.year) : c.date,
      url:          c.url,
      credentialId: c.licenseNumber,
    })).filter((c: any) => c.name);

    if (experience.length === 0 && education.length === 0) {
      warnings.push('LinkedIn payload had no positions or educations; profile may be sparse.');
    }

    const profile = await this.profiles.replaceFromImport(profileId, 'linkedin', {
      personal, experience, education, skills, languages, certifications,
    });
    return { profile, warnings };
  }
}

// =============================================================================
//  Heading + text helpers (Phase 42.6)
// =============================================================================

function normaliseHeading(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[:.\-–—\s]+$/, '')      // trailing punctuation / em-dashes / spaces
    .replace(/^[:.\-–—\s]+/, '')
    .replace(/[‘’]/g, "'")  // smart quotes
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function looksLikeHeading(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length === 0 || t.length > 50) return false;
  // Reject if ends with sentence punctuation (likely a real sentence).
  if (/[.!?]$/.test(t) && !t.endsWith('Inc.') && !t.endsWith('Ltd.')) return false;
  // Reject if contains digits (typical body content).
  if (/\d/.test(t)) return false;
  // Accept if ALL CAPS or Title Case + short.
  const isAllCaps = t === t.toUpperCase() && /[A-Z]/.test(t);
  const isTitleCase = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(t.replace(/[&,]/g, ' '));
  const isShortKnown = !!SECTION_HEADINGS[normaliseHeading(t)] || SUMMARY_HEADINGS.has(normaliseHeading(t));
  return isAllCaps || isTitleCase || isShortKnown;
}

function matchHeadingBySubstring(norm: string): keyof CvProfileDto | null {
  for (const [alias, key] of Object.entries(SECTION_HEADINGS)) {
    if (norm.includes(alias)) return key;
  }
  return null;
}

function collectPersonal(personal: any, text: string) {
  const t = (text || '').trim();
  if (!t) return;
  if (!personal.fullName && /^[A-Z][A-Za-z\s.'-]+$/.test(t) && t.length < 60 && !/\d/.test(t) && t.split(/\s+/).length >= 2 && t.split(/\s+/).length <= 5) {
    personal.fullName = t;
  }
  const emailMatch    = t.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  if (!personal.email && emailMatch) personal.email = emailMatch[0];
  const phoneMatch    = t.match(/(\+?\d[\d\s().-]{6,})/);
  if (!personal.phone && phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7) personal.phone = phoneMatch[0].trim();
  const linkedinMatch = t.match(/linkedin\.com\/in\/[\w-]+/i);
  if (!personal.linkedin && linkedinMatch) personal.linkedin = linkedinMatch[0];
  const githubMatch   = t.match(/github\.com\/[\w-]+/i);
  if (!personal.github && githubMatch) personal.github = githubMatch[0];
  const websiteMatch  = t.match(/\bhttps?:\/\/[^\s]+/i);
  if (!personal.website && websiteMatch && !/linkedin|github/i.test(websiteMatch[0])) personal.website = websiteMatch[0];
}

// =============================================================================
//  Phase 42.6 — fallback heuristics when no headings detected.
//
//  Scans every line for known patterns:
//    - lines with a "YYYY – YYYY" or "Month YYYY – Present" pattern → experience
//    - lines containing degree keywords (BSc / MSc / PhD / Bachelor / Master) → education
//    - lines with comma/pipe-separated tokens (≥ 3 tokens, each ≤ 25 chars) → skills
//    - lines with certification keywords (Certified, Certificate, License) → certifications
// =============================================================================

const DATE_RANGE_RE = /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}\s*[-–—to]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:\d{4}|Present|Current|Now)/i;
const DEGREE_RE     = /\b(B\.?Sc\.?|M\.?Sc\.?|Ph\.?D\.?|MBA|B\.?A\.?|M\.?A\.?|B\.?Eng\.?|M\.?Eng\.?|Bachelor(?:'s)?|Master(?:'s)?|Doctorate|Doctoral)\b/i;
const CERT_RE       = /\b(Certified|Certificate|Certification|License|Licensed|Accredit(?:ed|ation))\b/i;
const SKILL_CLUSTER_RE = /(?:[\w.+#-]{1,25}(?:\s*[,|·•]\s*)){2,}[\w.+#-]{1,25}/;
const BULLET_PREFIX_RE = /^\s*[•●◦▪‣–\-*]\s+/;

function fallbackExtract(lines: string[]) {
  const experience:     string[] = [];
  const education:      string[] = [];
  const skills:         string[] = [];
  const certifications: string[] = [];
  let   summary:        string   = '';

  for (let i = 0; i < lines.length; i++) {
    const raw = (lines[i] || '').trim();
    if (!raw) continue;
    const stripped = raw.replace(BULLET_PREFIX_RE, '').trim();

    if (DATE_RANGE_RE.test(stripped)) {
      experience.push(stripped);
      // Grab the next 1-3 bullet-like lines as bullets for this role.
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const next = (lines[j] || '').trim();
        if (!next) break;
        if (DATE_RANGE_RE.test(next)) break;     // next role
        if (BULLET_PREFIX_RE.test(next) || /^[A-Z]/.test(next)) {
          experience.push('  - ' + next.replace(BULLET_PREFIX_RE, '').trim());
        }
      }
      continue;
    }

    if (DEGREE_RE.test(stripped) && stripped.length < 200) {
      education.push(stripped);
      continue;
    }

    if (CERT_RE.test(stripped) && stripped.length < 160) {
      certifications.push(stripped);
      continue;
    }

    if (SKILL_CLUSTER_RE.test(stripped) && stripped.length < 300) {
      skills.push(stripped);
      continue;
    }
  }

  // Summary fallback — first long paragraph if nothing else picked it up.
  if (!summary) {
    for (const line of lines) {
      const t = line.trim();
      if (t.length > 120 && t.length < 600 && !DATE_RANGE_RE.test(t) && !DEGREE_RE.test(t)) {
        summary = t;
        break;
      }
    }
  }

  return { experience, education, skills, certifications, summary };
}

// =============================================================================
//  Existing helpers
// =============================================================================

function textFor(node: any): string {
  if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'quote') return node.text || '';
  if (node.type === 'list' && Array.isArray(node.items)) {
    return node.items.map((i: any) => typeof i === 'string' ? i : i.text).join('\n');
  }
  return '';
}

function fileSourceFor(filename: string): 'linkedin'|'docx'|'pdf' {
  const f = (filename || '').toLowerCase();
  if (f.endsWith('.pdf'))  return 'pdf';
  if (f.endsWith('.docx') || f.endsWith('.doc')) return 'docx';
  return 'docx';
}

function mapLinesToSection(key: keyof CvProfileDto, lines: string[]): any[] {
  switch (key) {
    case 'experience': {
      // Group "role line" + indented bullets the fallback produced ("  - …").
      const out: any[] = [];
      let cur: any = null;
      for (const l of lines) {
        if (l.startsWith('  - ')) {
          if (cur) cur.bullets.push(l.slice(4));
          continue;
        }
        // New role line. Parse "Role — Company (start – end)" or "Role @ Company".
        const m = l.match(/^(.+?)\s+[—\-@]\s+(.+?)(?:\s*\((.+?)\))?$/);
        cur = m
          ? { id: `exp-${out.length}`, role: m[1].trim(), company: m[2].trim(), start: m[3]?.split(/[-–]/)?.[0]?.trim() || '', end: m[3]?.split(/[-–]/)?.[1]?.trim() || '', bullets: [] }
          : { id: `exp-${out.length}`, role: l, company: '', start: '', end: '', bullets: [] };
        // Try to pull a date range out of the line itself.
        const dr = l.match(/(\d{4}|[A-Z][a-z]{2,8}\.?\s+\d{4})\s*[-–—to]+\s*(\d{4}|Present|Current|Now|[A-Z][a-z]{2,8}\.?\s+\d{4})/i);
        if (dr) {
          cur.start = cur.start || dr[1];
          cur.end   = cur.end   || (dr[2].match(/Present|Current|Now/i) ? '' : dr[2]);
        }
        out.push(cur);
      }
      return out;
    }
    case 'education':
      return lines.map((l, i) => {
        const dm = l.match(/(\d{4})\s*[-–—to]+\s*(\d{4}|Present)/i);
        return {
          id: `edu-${i}`, institution: l.replace(/\(.+?\)/g, '').trim(),
          start: dm?.[1] || '', end: dm?.[2] === 'Present' ? '' : (dm?.[2] || ''),
          honors: [],
        };
      });
    case 'skills':
      return lines.flatMap((l) => l.split(/[,;•·|]/).map((s) => s.trim()).filter(Boolean))
                  .filter((s) => s.length > 1 && s.length < 60)
                  .map((name, i) => ({ id: `skill-${i}`, name, category: 'technical' as const }));
    case 'languages':
      return lines.flatMap((l) => l.split(/[,;]/).map((s) => s.trim()).filter(Boolean))
                  .map((name, i) => ({ id: `lang-${i}`, name, proficiency: 'fluent' as const }));
    case 'projects':
      return lines.map((l, i) => ({ id: `proj-${i}`, name: l, description: '' }));
    case 'certifications':
      return lines.map((l, i) => ({ id: `cert-${i}`, name: l, issuer: '' }));
    case 'awards':
      return lines.map((l, i) => ({ id: `awd-${i}`, title: l }));
    case 'publications':
      return lines.map((l, i) => ({ id: `pub-${i}`, title: l }));
    case 'references':
      return lines.map((l, i) => ({ id: `ref-${i}`, name: l }));
    default:
      return [];
  }
}
