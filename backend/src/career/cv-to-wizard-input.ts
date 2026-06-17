/**
 * Phase 17 — CV → WizardInput converter
 *
 * Maps a CvProfileDto (from CV import / manual editing) into a WizardInput
 * suitable for presentation generation. Enables portfolio decks, personal pitch
 * decks, and executive bio presentations driven by CV data.
 *
 * Usage:
 *   const wizardInput = cvToWizardInput(profile, { documentType: 'company_profile' });
 */

import type { CvProfileDto, CvExperience, CvSkill } from './cv-types';
import type { WizardInput } from '../generation/slide-types/types';

export interface CvToWizardOptions {
  /** Target document type. Defaults to 'company_profile'. */
  documentType?: string;
  /** Override the theme family. */
  theme?: string;
  /** Deprecated: all experience entries are preserved. */
  maxExperience?: number;
}

/**
 * Convert a CV profile into a WizardInput for deck generation.
 *
 * Mappings:
 *   personal.fullName    → companyName (the presenter)
 *   personal.headline    → shortDescription
 *   personal.summary     → problem (framed as "the challenge I solve")
 *   experience           → team (current/recent role)
 *   skills               → productService (core competencies)
 *   projects             → solution / differentiation
 *   metrics from bullets → traction
 */
export function cvToWizardInput(
  profile: CvProfileDto,
  options: CvToWizardOptions = {},
): Partial<WizardInput> {
  const {
    documentType = 'company_profile',
    theme = 'investor-minimal',
  } = options;

  const p = profile.personal || {};
  const name = p.fullName || 'Professional';

  // ---- Short description (headline) ----------------------------------------
  const shortDescription =
    p.headline ||
    (profile.experience[0]
      ? `${profile.experience[0].role} at ${profile.experience[0].company}`
      : 'Experienced professional');

  // ---- Problem — framed as "the challenge this professional solves" ----------
  const problemText = p.summary || buildSummaryFromExperience(profile.experience);

  // ---- Solution — top projects / core wins ----------------------------------
  const solutionParts: string[] = [];
  for (const proj of profile.projects || []) {
    const line = [proj.name, proj.description].filter(Boolean).join(': ');
    if (line) solutionParts.push(line);
  }
  // If no projects, use top experience bullets
  if (!solutionParts.length) {
    for (const exp of profile.experience) {
      for (const b of exp.bullets || []) {
        solutionParts.push(b);
      }
    }
  }
  const solution = solutionParts.join('\n') || shortDescription;

  // ---- Team — structured teamMembers from experience -----------------------
  const teamMembers = profile.experience
    .map((exp: CvExperience, i: number) => ({
      name: i === 0 ? name : exp.company,
      role: exp.role,
      experience: buildRoleSummary(exp),
      responsibilities: (exp.bullets || []).join('; ') || undefined,
    }));

  // ---- Skills → productService / differentiation ---------------------------
  const techSkills = profile.skills
    .filter((s: CvSkill) => ['technical', 'tool'].includes(s.category))
    .map((s: CvSkill) => s.name);
  const softSkills = profile.skills
    .filter((s: CvSkill) => ['business', 'soft'].includes(s.category))
    .map((s: CvSkill) => s.name);
  const productService = techSkills.join(', ') || shortDescription;
  const differentiation = softSkills.join(', ') || 'Domain expertise, execution track record';

  // ---- Traction — extract metrics from experience bullets ------------------
  const metricLines = extractMetrics(profile.experience);
  const traction = metricLines.join('\n') || buildTractionSummary(profile);

  // ---- Education → roadmap -------------------------------------------------
  const roadmap =
    profile.education
      .map((ed) => {
        const period = [ed.start, ed.end].filter(Boolean).join('–') || '';
        const degree = [ed.degree, ed.field].filter(Boolean).join(' in ') || 'Degree';
        return `${ed.institution}: ${degree}${period ? ` (${period})` : ''}`;
      })
      .join('\n') || '';

  // ---- Certifications → awards section text --------------------------------
  const certText = (profile.certifications || [])
    .map((c) => `${c.name} — ${c.issuer}${c.date ? ` (${c.date})` : ''}`)
    .join('\n');

  return {
    documentType,
    slideCount: 8,
    contentDepth: 'balanced',
    includeCharts: false,
    includeFinancials: false,
    includeSpeakerNotes: false,
    includeExecutiveSummary: true,

    companyName: name,
    shortDescription,
    productService,
    industry: inferIndustry(profile),
    country: p.location?.split(',').pop()?.trim() || '',
    businessStage: 'established',
    website: p.website || p.linkedin || '',
    logo: p.photoUrl || undefined,

    problem: problemText,
    solution,
    differentiation,
    traction,
    team: name,
    roadmap: roadmap || certText,
    fundingAsk: '',
    revenueModel: '',

    tone: 'professional',
    theme,
    brandColors: { primary: '#1e3a5f', secondary: '#06b6d4', accent: '#0284c7' },
    fontStyle: 'modern',
    visualStyle: 'minimal',

    structured: {
      teamMembers,
      kpis: extractKpiMetrics(profile),
    },
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function buildSummaryFromExperience(experience: CvExperience[]): string {
  if (!experience.length) return 'Results-driven professional with cross-functional expertise.';
  const roles = experience
    .map((e) => `${e.role} at ${e.company}`)
    .join(', ');
  return `Experienced professional with roles including ${roles}. Focused on delivering measurable results.`;
}

function buildRoleSummary(exp: CvExperience): string {
  const period = [exp.start, exp.end || 'Present'].join('–');
  return `${exp.company} (${period}): ${(exp.bullets || []).join('; ')}`;
}

function extractMetrics(experience: CvExperience[]): string[] {
  const METRIC_RE =
    /(?:\d+[%xX×]|\$[\d.]+[KMB]?|\d+[KMB]\+?|[\d,]+\+?\s+(?:users|customers|deals|leads|revenue|growth|ARR|MRR))/i;
  const found: string[] = [];
  for (const exp of experience) {
    for (const b of exp.bullets || []) {
      if (METRIC_RE.test(b)) {
        found.push(b);
      }
    }
    for (const m of exp.metrics || []) {
      found.push(m);
    }
  }
  return found;
}

function extractKpiMetrics(profile: CvProfileDto) {
  const metrics = extractMetrics(profile.experience);
  if (!metrics.length) return [];
  return metrics.map((m, i) => {
    const val = m.match(/(?:\$[\d.]+[KMB]?|\d+[%xX×]|\d+[KMB]\+?)/)?.[0] || `Metric ${i + 1}`;
    const label =
      m
        .replace(val, '')
        .replace(/[,.:;]+/g, ' ')
        .trim() || 'Achievement';
    return { label, value: val, trend: undefined };
  });
}

function buildTractionSummary(profile: CvProfileDto): string {
  const certs = (profile.certifications || []).length;
  const projs = (profile.projects || []).length;
  const pubs = (profile.publications || []).length;
  const parts: string[] = [];
  if (certs > 0) parts.push(`${certs} professional certification${certs > 1 ? 's' : ''}`);
  if (projs > 0) parts.push(`${projs} featured project${projs > 1 ? 's' : ''}`);
  if (pubs > 0) parts.push(`${pubs} publication${pubs > 1 ? 's' : ''}`);
  return parts.join(', ') || 'Consistent track record across roles';
}

function inferIndustry(profile: CvProfileDto): string {
  const companies = profile.experience.map((e) => e.company.toLowerCase()).join(' ');
  const skills = profile.skills.map((s) => s.name.toLowerCase()).join(' ');
  const combined = `${companies} ${skills}`;
  if (/finance|bank|invest|fund|capital|fintech/.test(combined)) return 'Finance / FinTech';
  if (/health|med|pharma|bio|clinic|hospital/.test(combined)) return 'Healthcare / Life Sciences';
  if (/software|tech|engineering|devops|cloud|saas/.test(combined)) return 'Technology / SaaS';
  if (/market|growth|brand|content|seo|ads/.test(combined)) return 'Marketing / Growth';
  if (/design|ux|ui|product|creative/.test(combined)) return 'Design / Product';
  if (/law|legal|compliance|counsel/.test(combined)) return 'Legal';
  return 'Professional Services';
}
