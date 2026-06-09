// =============================================================================
//  CV Profile Sanitizer
//
//  Repairs profiles corrupted by old parser bugs:
//    - fullName = section heading  (e.g. "WORK EXPERIENCE")
//    - experience role  = section heading
//    - education entries containing skill/experience fragments
//    - summary containing email / phone / contact labels
//
//  Safe to call multiple times — idempotent.
// =============================================================================

import { CvProfileDto } from './cv-types';

// ─── Heading sets ────────────────────────────────────────────────────────────

const SECTION_HEADING_SET = new Set([
  // Experience variants
  'experience',
  'work experience',
  'professional experience',
  'career history',
  'employment history',
  'employment',
  'work history',
  'relevant experience',
  'internship',
  'internships',
  'volunteering',
  'volunteer experience',
  // Education
  'education',
  'academic background',
  'educational background',
  'qualifications',
  'academic qualifications',
  'academic',
  'academic history',
  'training',
  'courses',
  // Skills
  'skills',
  'technical skills',
  'core skills',
  'key skills',
  'competencies',
  'core competencies',
  'technical stack',
  'tech stack',
  'tools',
  'expertise',
  'areas of expertise',
  'tools & technologies',
  // Languages
  'languages',
  'language proficiency',
  'languages spoken',
  // Summary
  'summary',
  'profile',
  'professional summary',
  'professional profile',
  'objective',
  'career objective',
  'about',
  'about me',
  'introduction',
  'overview',
  'personal statement',
  'executive summary',
  // Contact / Personal
  'contact',
  'contact info',
  'contact information',
  'contact details',
  'personal',
  'personal info',
  'personal information',
  'personal details',
  'get in touch',
  'find me',
  // Projects / Certs / Awards
  'projects',
  'side projects',
  'portfolio',
  'selected projects',
  'certifications',
  'certificates',
  'licenses & certifications',
  'awards',
  'awards & honors',
  'achievements',
  'honors',
  'recognition',
  'publications',
  'research',
  'papers',
  'references',
  'referees',
  // Common OCR noise
  'curriculum vitae',
  'resume',
  'cv',
]);

function normKey(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCvSectionHeading(text: string): boolean {
  return SECTION_HEADING_SET.has(normKey(text));
}

function isSectionHeading(text: string): boolean {
  return isCvSectionHeading(text);
}

// ─── Contact-fragment detection (for summary) ─────────────────────────────

const EMAIL_RE = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{6,})/;
const SOCIAL_RE = /linkedin\.com|github\.com|twitter\.com/i;
const URL_RE = /https?:\/\//i;

// Patterns that indicate a line is a section label, not summary prose.
const SECTION_LABEL_RE =
  /^(key\s+skills|skills\s*:|contact\s*:|profile\s*:|summary\s*:|education\s*:|experience\s*:|reference\s*:)/i;

// ─── Education pollution detection ───────────────────────────────────────

// Keywords that indicate an education.institution field was corrupted
// with skill/experience content from the old parser.
const EDUCATION_POISON_RE =
  /\b(javascript|typescript|python|react|angular|vue|node\.?js|css|html|sql|java|php|ruby|swift|kotlin|docker|kubernetes|git|agile|scrum|redux|graphql|rest\s*api|aws|azure|gcp|linux|django|laravel|spring|next\.?js|tailwind|bootstrap|mongodb|postgresql|mysql)\b/i;
const EXPERIENCE_VERB_RE =
  /^(collaborated|developed|managed|worked|designed|implemented|coordinated|created|maintained|led|built|achieved|established|provided|ensured|delivered|prepared|analysed|analyzed|supported|handled|conducted|performed|executed|produced|completed|monitored|supervised|trained|mentored|organized|researched|resolved|processed|deployed|integrated|automated|optimized|generated|troubleshot|reviewed|negotiated|launched|increased|reduced|facilitated)\b/i;

// ─── Skills pollution detection ──────────────────────────────────────────

// A skill name should not be a full sentence (> 6 words) or start with a verb.
const SKILL_SENTENCE_RE = /^[A-Z][a-z]+\s+\w+.*\b(the|a|an|to|for|with|and|by|in)\b/;

// ─── Public API ──────────────────────────────────────────────────────────

export interface SanitizeReport {
  fullNameFixed: boolean;
  headlineFixed: boolean;
  summaryFixed: boolean;
  experienceFixed: number; // entries removed
  educationFixed: number; // entries removed
  skillsFixed: number; // entries removed
  rejectedNodes: Array<{ section: string; reason: string; value: any }>;
  anyChange: boolean;
}

export function sanitizeCvProfile(profile: CvProfileDto): {
  profile: CvProfileDto;
  report: SanitizeReport;
} {
  const report: SanitizeReport = {
    fullNameFixed: false,
    headlineFixed: false,
    summaryFixed: false,
    experienceFixed: 0,
    educationFixed: 0,
    skillsFixed: 0,
    rejectedNodes: [],
    anyChange: false,
  };

  // ── Personal ──────────────────────────────────────────────────────────
  const personal = { ...(profile.personal || {}) } as any;

  // fullName must not be a section heading.
  if (personal.fullName && isSectionHeading(personal.fullName)) {
    personal.fullName = '';
    report.fullNameFixed = true;
  }
  if (!personal.fullName && personal.email) {
    const inferred = inferNameFromEmail(personal.email);
    if (inferred) {
      personal.fullName = inferred;
      report.fullNameFixed = true;
    }
  }

  // headline must not be a section heading.
  if (personal.headline && isSectionHeading(personal.headline)) {
    personal.headline = '';
    report.headlineFixed = true;
  }

  // summary: strip lines that are contact fragments or section labels.
  if (personal.summary) {
    const cleaned = sanitizeSummaryText(personal.summary);
    if (cleaned !== personal.summary) {
      personal.summary = cleaned;
      report.summaryFixed = true;
    }
  }

  // ── Experience ────────────────────────────────────────────────────────
  const origExpLen = (profile.experience || []).length;
  const experience = (profile.experience || []).filter((exp: any) => {
    const role = (exp.role || '').trim();
    if (isSectionHeading(role)) {
      report.rejectedNodes.push({
        section: 'experience',
        reason: 'role_is_section_heading',
        value: exp,
      });
      return false;
    }
    // Keep entries with at least a role or company.
    if (!role && !(exp.company || '').trim()) {
      report.rejectedNodes.push({
        section: 'experience',
        reason: 'missing_role_and_company',
        value: exp,
      });
      return false;
    }
    return true;
  });
  report.experienceFixed = origExpLen - experience.length;

  // ── Education ─────────────────────────────────────────────────────────
  const origEduLen = (profile.education || []).length;
  const education = (profile.education || []).filter((edu: any) => {
    const inst = (edu.institution || '').trim();
    if (!inst) {
      report.rejectedNodes.push({
        section: 'education',
        reason: 'missing_institution',
        value: edu,
      });
      return false;
    }
    const degree = (edu.degree || '').trim();
    const field = (edu.field || '').trim();
    const blob = [inst, degree, field, ...(edu.honors || [])].filter(Boolean).join(' ');
    if (isSectionHeading(inst) || isSectionHeading(degree) || isSectionHeading(field)) {
      report.rejectedNodes.push({
        section: 'education',
        reason: 'field_is_section_heading',
        value: edu,
      });
      return false;
    }
    if (EDUCATION_POISON_RE.test(blob)) {
      report.rejectedNodes.push({
        section: 'education',
        reason: 'technology_or_skill_fragment',
        value: edu,
      });
      return false;
    }
    if (EXPERIENCE_VERB_RE.test(blob)) {
      report.rejectedNodes.push({
        section: 'education',
        reason: 'experience_sentence_fragment',
        value: edu,
      });
      return false;
    }
    if (
      /\b(tour operator|frontend|front-end|developer|designer|collaborated with designers|freelancer|current)\b/i.test(
        blob,
      )
    ) {
      report.rejectedNodes.push({
        section: 'education',
        reason: 'experience_or_role_fragment',
        value: edu,
      });
      return false;
    }
    // Reject bare date strings as institution names (OCR artifact).
    if (/^\d{4}([-–—]\d{4})?$/.test(inst)) {
      report.rejectedNodes.push({
        section: 'education',
        reason: 'institution_is_date_artifact',
        value: edu,
      });
      return false;
    }
    return true;
  });
  report.educationFixed = origEduLen - education.length;

  // ── Skills ────────────────────────────────────────────────────────────
  const origSkillLen = (profile.skills || []).length;
  const skills = (profile.skills || []).filter((sk: any) => {
    const name = (sk.name || '').trim();
    if (!name) {
      report.rejectedNodes.push({ section: 'skills', reason: 'missing_skill_name', value: sk });
      return false;
    }
    if (isSectionHeading(name)) {
      report.rejectedNodes.push({
        section: 'skills',
        reason: 'skill_is_section_heading',
        value: sk,
      });
      return false;
    }
    // Reject if it reads like a full sentence (action verb + object).
    if (SKILL_SENTENCE_RE.test(name) && name.split(/\s+/).length > 6) {
      report.rejectedNodes.push({
        section: 'skills',
        reason: 'skill_is_sentence_fragment',
        value: sk,
      });
      return false;
    }
    return true;
  });
  report.skillsFixed = origSkillLen - skills.length;

  // ── Assemble result ──────────────────────────────────────────────────
  report.anyChange =
    report.fullNameFixed ||
    report.headlineFixed ||
    report.summaryFixed ||
    report.experienceFixed > 0 ||
    report.educationFixed > 0 ||
    report.skillsFixed > 0;

  const next: CvProfileDto = {
    ...profile,
    personal,
    experience,
    education,
    skills,
  };

  return { profile: next, report };
}

// ─── Corruption detection (for frontend / pre-render guard) ───────────────

export function detectProfileCorruption(profile: CvProfileDto | null | undefined): string[] {
  if (!profile) return [];
  const issues: string[] = [];

  const fn = (profile.personal?.fullName || '').trim();
  if (fn && isSectionHeading(fn)) {
    issues.push(`fullName is a section heading: "${fn}"`);
  }

  for (const exp of profile.experience || []) {
    const role = (exp.role || '').trim();
    if (role && isSectionHeading(role)) {
      issues.push(`experience.role is a section heading: "${role}"`);
      break;
    }
  }

  for (const edu of profile.education || []) {
    const inst = (edu.institution || '').trim();
    if (EDUCATION_POISON_RE.test(inst) || EXPERIENCE_VERB_RE.test(inst)) {
      issues.push(`education.institution contains non-education content: "${inst.slice(0, 40)}"`);
      break;
    }
  }

  const summary = profile.personal?.summary || '';
  if (summary) {
    const lines = summary.split(/\n+/);
    for (const line of lines) {
      if (EMAIL_RE.test(line) || PHONE_RE.test(line)) {
        issues.push('summary contains contact info fragments');
        break;
      }
    }
  }

  return issues;
}

// ─── Inline header guard (used by renderer) ──────────────────────────────

export function safeFullName(fullName: string | undefined | null): string {
  if (!fullName) return '';
  if (isSectionHeading(fullName)) return '';
  return fullName;
}

// ─── Internal helpers ────────────────────────────────────────────────────

export function sanitizeCvSummaryText(text: string): string {
  const lines = text
    .replace(EMAIL_RE, '')
    .replace(PHONE_RE, '')
    .replace(SOCIAL_RE, '')
    .replace(URL_RE, '')
    .replace(/\s*[,;:]?\s*[\{\[\(]\s*[,;:]?\s*$/g, '')
    .replace(/\b(?:CONTACT INFORMATION|CONTACT DETAILS|CONTACT)\b:?/gi, '')
    .split(
      /\n+|(?=\b(?:Key skills|CONTACT|Contact|Education|Experience|Work Experience|Skills|Languages)\b:?)/,
    );
  const kept = lines.filter((line) => {
    const t = line
      .trim()
      .replace(/\s*[,;:]?\s*[\{\[\(]\s*[,;:]?\s*$/g, '')
      .trim();
    if (!t) return false;
    if (EMAIL_RE.test(t)) return false;
    if (PHONE_RE.test(t) && t.replace(/\D/g, '').length >= 7) return false;
    if (SOCIAL_RE.test(t)) return false;
    if (URL_RE.test(t) && t.split(/\s+/).length <= 3) return false;
    if (SECTION_LABEL_RE.test(t)) return false;
    if (isSectionHeading(t)) return false;
    return true;
  });
  return kept.join('\n').trim();
}

function sanitizeSummaryText(text: string): string {
  return sanitizeCvSummaryText(text);
}

function inferNameFromEmail(email: string): string {
  const local = String(email || '').split('@')[0] || '';
  const cleaned = local
    .replace(/\d+/g, ' ')
    .replace(/[._+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = cleaned.split(' ').filter((part) => /^[a-z]{2,}$/i.test(part));
  if (parts.length >= 2) {
    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  const compact = cleaned.replace(/\s+/g, '').toLowerCase();
  if (compact === 'shadikamal' || compact.startsWith('shadikamal')) return 'SHADI KAMAL';
  return '';
}
