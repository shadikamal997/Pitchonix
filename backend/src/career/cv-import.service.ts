import { Injectable, BadRequestException } from '@nestjs/common';
import { PptxImportService } from '../pptx-import/pptx-import.service';
import { UniversalConversionService } from '../universal-conversion/universal-conversion.service';
import { CvProfilesService } from './cv-profiles.service';
import { CvProfileDto } from './cv-types';

// =============================================================================
//  Phase 42L + 42M — CV import.
//
//  Three input flavours:
//
//    1. DOCX / PDF / HTML / MD — route through UniversalConversionService to
//       get a UniversalDocument; then walk pages for heading-anchored sections
//       (Experience, Education, Skills, …) and bulk-replace the profile.
//
//    2. LinkedIn export JSON — accept the same JSON shape LinkedIn provides
//       (or a curated subset like { profile, positions, education, skills }),
//       map onto our CvProfile section arrays.
//
//  Mapping is intentionally permissive: missing fields default to undefined,
//  unrecognised keys are ignored. The importer never throws on malformed
//  data — it returns whatever it could recover + a warnings array.
// =============================================================================

const SECTION_HEADINGS: Record<string, keyof CvProfileDto> = {
  experience:      'experience',
  'work experience': 'experience',
  'professional experience': 'experience',
  employment:      'experience',
  education:       'education',
  skills:          'skills',
  languages:       'languages',
  projects:        'projects',
  certifications:  'certifications',
  certificates:    'certifications',
  awards:          'awards',
  publications:    'publications',
  references:      'references',
};

@Injectable()
export class CvImportService {
  constructor(
    private readonly conversion: UniversalConversionService,
    private readonly profiles:   CvProfilesService,
    private readonly pptx:       PptxImportService,
  ) {}

  // ---------------------------------------------------------------------------
  //  DOCX / PDF / HTML / MD → CvProfile
  // ---------------------------------------------------------------------------

  async importFromFile(profileId: string, buffer: Buffer, filename: string, mimetype?: string): Promise<{ profile: CvProfileDto; warnings: string[] }> {
    if (!buffer?.length) throw new BadRequestException('Empty file buffer');
    const result = await this.conversion.convert({
      buffer, filename, mimetype, targetFormat: 'html',
    });
    const udm = result.document;
    const warnings: string[] = [];

    // Walk pages → collect section blocks anchored on H1/H2 text.
    const sections: Partial<Record<keyof CvProfileDto, string[]>> = {};
    let currentSection: keyof CvProfileDto | null = null;
    const personal: any = {};
    let summaryParts: string[] = [];
    let inSummary = false;

    for (const page of udm.pages) {
      for (const node of page.nodes) {
        if (node.type === 'heading') {
          const key = SECTION_HEADINGS[(node.text || '').toLowerCase().trim()];
          if (key) {
            currentSection = key;
            sections[currentSection] = sections[currentSection] || [];
            inSummary = false;
          } else if (/summary|profile|about/i.test(node.text || '')) {
            currentSection = null;
            inSummary = true;
          } else {
            currentSection = null;
            inSummary = false;
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
          const text = (node.text || '').trim();
          if (!text) continue;
          if (!personal.fullName && /^[A-Z][A-Za-z\s.'-]+$/.test(text) && text.length < 60) {
            personal.fullName = text;
            continue;
          }
          if (!personal.email && /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text)) {
            personal.email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0];
          }
          if (!personal.phone && /(\+?\d[\d\s().-]{6,})/.test(text)) {
            personal.phone = text.match(/(\+?\d[\d\s().-]{6,})/)?.[0];
          }
          if (!personal.linkedin && /linkedin\.com\/in\/[\w-]+/i.test(text)) {
            personal.linkedin = text.match(/linkedin\.com\/in\/[\w-]+/i)?.[0];
          }
          if (!personal.github && /github\.com\/[\w-]+/i.test(text)) {
            personal.github = text.match(/github\.com\/[\w-]+/i)?.[0];
          }
        }
      }
    }
    if (summaryParts.length > 0) personal.summary = summaryParts.join(' ');

    const payload: Partial<CvProfileDto> = { personal };
    for (const key of Object.keys(sections) as (keyof CvProfileDto)[]) {
      const lines = sections[key] || [];
      payload[key] = mapLinesToSection(key, lines) as any;
    }
    if (Object.keys(sections).length === 0) warnings.push('No recognisable section headings found; only personal info was extracted.');

    const profile = await this.profiles.replaceFromImport(profileId, fileSourceFor(filename), payload);
    return { profile, warnings };
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
//  Helpers
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
    case 'experience':
      return lines.map((l, i) => {
        // Heuristic: "Role — Company (2021 – 2024)" or similar
        const m = l.match(/^(.+?)\s+[—\-]\s+(.+?)(?:\s*\((.+?)\))?$/);
        if (m) return { id: `exp-${i}`, role: m[1].trim(), company: m[2].trim(), start: m[3]?.split(/[-–]/)?.[0]?.trim() || '', end: m[3]?.split(/[-–]/)?.[1]?.trim() || '', bullets: [] };
        return { id: `exp-${i}`, role: l, company: '', start: '', bullets: [] };
      });
    case 'education':
      return lines.map((l, i) => ({ id: `edu-${i}`, institution: l, start: '', end: '', honors: [] }));
    case 'skills':
      return lines.flatMap((l) => l.split(/[,;•·|]/).map((s) => s.trim()).filter(Boolean))
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
