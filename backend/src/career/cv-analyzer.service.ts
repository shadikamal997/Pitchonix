import { Injectable } from '@nestjs/common';
import type {
  CvPersonal, CvExperience, CvEducation, CvSkill, CvLanguage,
  CvProject, CvCertification,
} from './cv-types';

// =============================================================================
//  Phase 42.3 — CV Intelligence Studio core analyzer.
//
//  All checks here are pure-rule, no LLM, no network. Reproducible scoring
//  matters more than "smart" suggestions; an LLM-augmented pass can be
//  layered on later (Phase 42.4) without changing the report contract.
//
//  Architecture:
//
//    CvProfileSnapshot ──► analyze() ──► CvQualityReport
//                       │              │
//                       ├─► applyFix(issueId) ──► CvProfileSnapshot (mutated)
//                       │
//                       └─► recommendTemplates(report) ──► template ids
//                       │
//                       └─► matchJob(jd)              ──► CvJobMatchReport
// =============================================================================

export interface CvProfileSnapshot {
  personal?:       CvPersonal;
  experience?:     CvExperience[];
  education?:      CvEducation[];
  skills?:         CvSkill[];
  languages?:      CvLanguage[];
  projects?:       CvProject[];
  certifications?: CvCertification[];
}

export type Severity = 'critical' | 'major' | 'minor' | 'info';
export type IssueCategory =
  | 'contact' | 'summary' | 'experience' | 'education' | 'skills'
  | 'structure' | 'ats' | 'readability' | 'length' | 'design';

export interface CvIssue {
  id:        string;
  category:  IssueCategory;
  severity:  Severity;
  section:   string;
  title:     string;
  detail:    string;
  why:       string;
  suggestion: string;
  autoFixAvailable: boolean;
  // For fixes that need user input, optional patch hint the UI can render.
  fixHint?:  { kind: 'text' | 'list' | 'date'; current?: any; example?: any };
  // Target element (for per-bullet fixes, etc.) — used by applyFix.
  target?:   { kind: 'bullet' | 'section' | 'personal'; id?: string; index?: number; field?: string };
}

export interface CvSubscores {
  structure:     number;
  content:       number;
  impact:        number;
  ats:           number;
  readability:   number;
  design:        number;
  completeness:  number;
}

export interface CvQualityReport {
  overall:      number;
  subscores:    CvSubscores;
  issues:       CvIssue[];
  detectedType: 'developer' | 'designer' | 'executive' | 'academic' | 'healthcare'
              | 'finance' | 'sales' | 'marketing' | 'student' | 'general';
  atsScore:     number;
  warnings:     string[];
  metrics: {
    bulletCount:    number;
    avgBulletWords: number;
    actionVerbRatio: number;
    measurableRatio: number;
    estimatedPages: number;
    yearsExperience: number;
    sectionsPresent: string[];
    sectionsMissing: string[];
  };
}

export interface CvJobMatchReport {
  alignment:      number;       // 0..100
  missingSkills:  string[];
  presentSkills:  string[];
  keywordsToAdd:  string[];
  prioritySections: string[];
  recommendations: string[];
}

// =============================================================================
//  Rule sets
// =============================================================================

const ACTION_VERBS = new Set([
  'led','built','launched','shipped','designed','architected','engineered','developed',
  'created','delivered','optimized','reduced','increased','boosted','improved','scaled',
  'grew','drove','managed','owned','orchestrated','automated','migrated','refactored',
  'spearheaded','pioneered','transformed','negotiated','closed','won','generated',
  'mentored','coached','hired','recruited','trained','published','presented','authored',
  'implemented','deployed','integrated','streamlined','accelerated','founded','raised',
  'secured','executed','launched','rolled','released','introduced',
]);

const WEAK_VERBS  = new Set([
  'responsible','duties','tasks','helped','worked','did','handled','involved','assisted',
  'participated','contributed','was','were','am','have','had','various','etc',
]);

const PASSIVE_PATTERNS = [
  /\bwas\s+\w+ed\b/i, /\bwere\s+\w+ed\b/i, /\bbeing\s+\w+ed\b/i, /\bbeen\s+\w+ed\b/i,
];

const ATS_UNSAFE_GLYPHS = ['•', '●', '◆', '■', '▶', '★', '✓', '✔', '➤', '➡', '✦', '✱'];

const ATS_RISK_SECTIONS = ['photo','image','two-column','sidebar','header-with-photo'];

const MEASURABLE_REGEX = /\b\d+(\.\d+)?\s*(%|x|k|m|million|users?|customers?|reqs|requests?|qps|hours?|days?|years?|sales|leads?|deals?|points?)\b/i;

const SECTION_ALIASES: Record<string, string> = {
  'work history':            'experience',
  'professional background': 'experience',
  'professional experience': 'experience',
  'employment':              'experience',
  'employment history':      'experience',
  'career':                  'experience',
  'work experience':         'experience',
  'technical stack':         'skills',
  'technical skills':        'skills',
  'tools':                   'skills',
  'core competencies':       'skills',
  'expertise':               'skills',
  'training':                'certifications',
  'courses':                 'certifications',
  'qualifications':          'certifications',
  'profile':                 'summary',
  'objective':               'summary',
  'about me':                'summary',
  'introduction':            'summary',
  'languages spoken':        'languages',
  'volunteer':               'experience',
  'projects':                'projects',
  'side projects':           'projects',
  'publications':            'projects',
};

// =============================================================================
//  Service
// =============================================================================

@Injectable()
export class CvAnalyzerService {

  // ---------------------------------------------------------------------------
  //  42.3B — Section classifier. Maps a free-text heading to a canonical
  //  CvProfile section name.
  // ---------------------------------------------------------------------------
  classifyHeading(heading: string): string | null {
    if (!heading) return null;
    const norm = heading.toLowerCase().trim().replace(/[:.]+$/, '');
    if (SECTION_ALIASES[norm]) return SECTION_ALIASES[norm];
    // Substring fallback for messy headings ("My Work Experience").
    for (const [alias, canonical] of Object.entries(SECTION_ALIASES)) {
      if (norm.includes(alias)) return canonical;
    }
    if (['experience','education','skills','languages','projects','certifications','summary','awards','references'].includes(norm)) return norm;
    return null;
  }

  // ---------------------------------------------------------------------------
  //  42.3C + 42.3D — Quality engine: aggregate score + issue list.
  // ---------------------------------------------------------------------------
  analyze(profile: CvProfileSnapshot): CvQualityReport {
    const p = profile || {};
    const issues: CvIssue[] = [];

    const m = this.computeMetrics(p);
    const detectedType = this.detectType(p);

    // ---- Contact info checks ------------------------------------------------
    const personal = p.personal || {};
    if (!personal.email) issues.push(this.mkIssue({
      id: 'no-email', category: 'contact', severity: 'critical',
      section: 'personal', title: 'Missing email',
      detail: 'No email address found on the CV.',
      why: 'Recruiters need a direct contact channel; missing email guarantees you will be filtered out.',
      suggestion: 'Add your professional email to Personal info.',
      autoFixAvailable: false,
      fixHint: { kind: 'text', example: 'first.last@domain.com' },
      target: { kind: 'personal', field: 'email' },
    }));
    if (!personal.phone) issues.push(this.mkIssue({
      id: 'no-phone', category: 'contact', severity: 'major',
      section: 'personal', title: 'Missing phone number',
      why: 'Some recruiters prefer phone outreach for time-sensitive roles.',
      suggestion: 'Add a reachable phone number.',
      autoFixAvailable: false, target: { kind: 'personal', field: 'phone' },
    }));
    if (!personal.linkedin) issues.push(this.mkIssue({
      id: 'no-linkedin', category: 'contact', severity: 'minor',
      section: 'personal', title: 'No LinkedIn link',
      why: 'LinkedIn is the default verification surface for most roles.',
      suggestion: 'Add your LinkedIn URL.',
      autoFixAvailable: false, target: { kind: 'personal', field: 'linkedin' },
    }));
    if (!personal.location) issues.push(this.mkIssue({
      id: 'no-location', category: 'contact', severity: 'minor',
      section: 'personal', title: 'No location',
      why: 'Location helps recruiters filter for hybrid / on-site / time-zone roles.',
      suggestion: 'Add city + country (e.g. "Berlin, Germany" or "Remote · CET").',
      autoFixAvailable: false, target: { kind: 'personal', field: 'location' },
    }));

    // ---- Summary checks -----------------------------------------------------
    const summary = (personal.summary || '').trim();
    if (!summary) {
      issues.push(this.mkIssue({
        id: 'no-summary', category: 'summary', severity: 'major',
        section: 'personal', title: 'Missing professional summary',
        why: 'A strong 2-4 line summary frames everything below it — recruiters spend the first 6 seconds here.',
        suggestion: this.suggestSummary(p),
        autoFixAvailable: true, target: { kind: 'personal', field: 'summary' },
      }));
    } else if (summary.length < 80) {
      issues.push(this.mkIssue({
        id: 'weak-summary-short', category: 'summary', severity: 'minor',
        section: 'personal', title: 'Summary too short',
        detail: `${summary.length} characters; target 150–400.`,
        why: 'A one-line summary doesn\'t differentiate you from other applicants.',
        suggestion: 'Expand to cover (1) who you are, (2) what you do best, (3) where you have the most impact.',
        autoFixAvailable: false, target: { kind: 'personal', field: 'summary' },
      }));
    } else if (summary.length > 800) {
      issues.push(this.mkIssue({
        id: 'weak-summary-long', category: 'summary', severity: 'minor',
        section: 'personal', title: 'Summary too long',
        detail: `${summary.length} characters; target 150–400.`,
        why: 'Long summaries get skimmed past. Front-load impact.',
        suggestion: 'Trim to the strongest 2-3 sentences.',
        autoFixAvailable: false, target: { kind: 'personal', field: 'summary' },
      }));
    }

    // ---- Experience checks --------------------------------------------------
    const exp = p.experience || [];
    if (exp.length === 0) {
      issues.push(this.mkIssue({
        id: 'no-experience', category: 'experience', severity: 'critical',
        section: 'experience', title: 'No experience entries',
        why: 'A CV without work or project history will not pass even basic screening for most roles.',
        suggestion: 'Add at least one Experience entry — internships, freelance, OSS count.',
        autoFixAvailable: false,
      }));
    }

    for (const e of exp) {
      if (!e.role || !e.role.trim()) issues.push(this.mkIssue({
        id: `exp-no-role-${e.id}`, category: 'experience', severity: 'major',
        section: 'experience', title: 'Experience entry missing job title',
        why: 'Without a role title, ATS systems cannot index your seniority or function.',
        suggestion: 'Add the role title (e.g. "Senior Software Engineer").',
        autoFixAvailable: false, target: { kind: 'section', id: e.id, field: 'role' },
      }));
      if (!e.company || !e.company.trim()) issues.push(this.mkIssue({
        id: `exp-no-company-${e.id}`, category: 'experience', severity: 'major',
        section: 'experience', title: 'Experience entry missing company',
        why: 'Company name is the second filter recruiters apply.',
        suggestion: 'Add the company / organisation name.',
        autoFixAvailable: false, target: { kind: 'section', id: e.id, field: 'company' },
      }));

      const bullets = Array.isArray(e.bullets) ? e.bullets : [];
      if (bullets.length === 0) issues.push(this.mkIssue({
        id: `exp-no-bullets-${e.id}`, category: 'experience', severity: 'major',
        section: 'experience', title: `No bullets for "${e.role || e.company || 'role'}"`,
        why: 'Roles with no bullets give zero signal about what you actually did.',
        suggestion: 'Add 3–5 bullets describing achievements (not duties).',
        autoFixAvailable: false, target: { kind: 'section', id: e.id, field: 'bullets' },
      }));

      bullets.forEach((b, idx) => {
        const words = b.split(/\s+/).filter(Boolean);

        if (words.length > 35) issues.push(this.mkIssue({
          id: `bullet-long-${e.id}-${idx}`, category: 'experience', severity: 'minor',
          section: 'experience', title: 'Bullet too long',
          detail: `${words.length} words. Target 12–25.`,
          why: 'Long bullets get skimmed. Front-load the verb + result.',
          suggestion: 'Split into two bullets, or compress to the core achievement.',
          autoFixAvailable: false,
          target: { kind: 'bullet', id: e.id, index: idx },
        }));

        const first = (words[0] || '').toLowerCase().replace(/[.,;:]$/, '');
        if (WEAK_VERBS.has(first) || b.toLowerCase().startsWith('responsible for')) {
          issues.push(this.mkIssue({
            id: `bullet-weak-${e.id}-${idx}`, category: 'experience', severity: 'major',
            section: 'experience', title: 'Bullet describes a duty, not an achievement',
            detail: `"${this.truncate(b, 80)}"`,
            why: 'Recruiters score impact, not job descriptions. "Responsible for X" tells nothing about outcomes.',
            suggestion: this.suggestActionVerbRewrite(b),
            autoFixAvailable: true,
            target: { kind: 'bullet', id: e.id, index: idx },
            fixHint: { kind: 'text', current: b, example: this.suggestActionVerbRewrite(b) },
          }));
        }

        const isMeasurable = MEASURABLE_REGEX.test(b);
        if (!isMeasurable && words.length > 6) issues.push(this.mkIssue({
          id: `bullet-no-metric-${e.id}-${idx}`, category: 'experience', severity: 'minor',
          section: 'experience', title: 'Bullet has no measurable result',
          detail: `"${this.truncate(b, 80)}"`,
          why: 'Numbers signal accountability and credibility ("by 38%", "to 4M users", "in 6 weeks").',
          suggestion: 'Add a number: % uplift, $ generated, users reached, or time saved.',
          autoFixAvailable: false,
          target: { kind: 'bullet', id: e.id, index: idx },
        }));

        for (const re of PASSIVE_PATTERNS) {
          if (re.test(b)) {
            issues.push(this.mkIssue({
              id: `bullet-passive-${e.id}-${idx}`, category: 'readability', severity: 'minor',
              section: 'experience', title: 'Passive voice',
              detail: `"${this.truncate(b, 80)}"`,
              why: 'Passive voice hides ownership. Recruiters want to know what *you* did.',
              suggestion: 'Rewrite with an active verb ("Led", "Shipped", "Built").',
              autoFixAvailable: false,
              target: { kind: 'bullet', id: e.id, index: idx },
            }));
            break;
          }
        }
      });

      // Date format consistency.
      if (e.start && !/^\d{4}(-\d{2})?$/.test(e.start)) issues.push(this.mkIssue({
        id: `exp-date-${e.id}`, category: 'structure', severity: 'minor',
        section: 'experience', title: 'Inconsistent date format',
        detail: `start="${e.start}" — use YYYY or YYYY-MM.`,
        why: 'Inconsistent dates break ATS parsers and look unpolished.',
        suggestion: 'Use YYYY or YYYY-MM (e.g. "2022-04").',
        autoFixAvailable: false, target: { kind: 'section', id: e.id, field: 'start' },
      }));
    }

    // ---- Education checks ---------------------------------------------------
    const edu = p.education || [];
    if (edu.length === 0) issues.push(this.mkIssue({
      id: 'no-education', category: 'education', severity: 'minor',
      section: 'education', title: 'No education entries',
      why: 'Even bootcamps / self-study should be listed for completeness.',
      suggestion: 'Add at least one education entry.',
      autoFixAvailable: false,
    }));
    for (const ed of edu) {
      if (!ed.start && !ed.end) issues.push(this.mkIssue({
        id: `edu-no-dates-${ed.id}`, category: 'education', severity: 'minor',
        section: 'education', title: 'Education entry without dates',
        why: 'Reviewers look at recency; missing dates raises questions.',
        suggestion: 'Add at least an end year.',
        autoFixAvailable: false, target: { kind: 'section', id: ed.id, field: 'end' },
      }));
    }

    // ---- Skills checks ------------------------------------------------------
    const sk = p.skills || [];
    if (sk.length < 5) issues.push(this.mkIssue({
      id: 'few-skills', category: 'skills', severity: 'minor',
      section: 'skills', title: 'Skills section is thin',
      detail: `${sk.length} skills listed. Target 8–20.`,
      why: 'Skills are the primary ATS matching surface.',
      suggestion: 'Add the tools, languages, frameworks and methods you actually use.',
      autoFixAvailable: false,
    }));

    // Duplicate bullets across roles.
    const allBullets = exp.flatMap((e) => e.bullets || []);
    const seen = new Map<string, number>();
    for (const b of allBullets) {
      const key = b.toLowerCase().replace(/\s+/g, ' ').trim();
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    let duplicates = 0;
    seen.forEach((v) => { if (v > 1) duplicates++; });
    if (duplicates > 0) issues.push(this.mkIssue({
      id: 'duplicate-bullets', category: 'content', severity: 'minor' as any,
      section: 'experience', title: `${duplicates} duplicate bullet(s) across roles`,
      why: 'Duplicates pad the CV without adding signal.',
      suggestion: 'Either remove duplicates or differentiate (different context, different metric).',
      autoFixAvailable: false,
    } as any));

    // ---- ATS-unsafe glyphs --------------------------------------------------
    const haystack = [
      personal.summary || '',
      ...exp.flatMap((e) => [e.role, e.company, ...(e.bullets || [])].filter(Boolean)),
    ].join(' ');
    const unsafe = ATS_UNSAFE_GLYPHS.filter((g) => haystack.includes(g));
    if (unsafe.length > 0) issues.push(this.mkIssue({
      id: 'ats-glyphs', category: 'ats', severity: 'minor',
      section: 'global', title: 'ATS-unsafe characters detected',
      detail: `Found: ${unsafe.join(' ')}`,
      why: 'Decorative bullet glyphs / arrows break some ATS parsers.',
      suggestion: 'Use plain text bullets; the template adds visual markers automatically.',
      autoFixAvailable: true,
      target: { kind: 'section', field: 'bullets' },
    }));

    // ---- Length / pages -----------------------------------------------------
    if (m.estimatedPages > 3) issues.push(this.mkIssue({
      id: 'too-long', category: 'length', severity: 'major',
      section: 'global', title: `CV runs ~${m.estimatedPages} pages`,
      why: 'CVs >2 pages get skimmed; >3 pages are routinely rejected unless executive/academic.',
      suggestion: 'Cut older roles to 1–2 lines, drop pre-2010 detail, condense bullets.',
      autoFixAvailable: false,
    }));

    // ---- Subscores ----------------------------------------------------------
    const subscores = this.computeSubscores(p, issues, m);
    const overall  = this.weightedOverall(subscores);
    const atsScore = this.atsScoreOnly(p, issues, m);

    return {
      overall, subscores, issues,
      detectedType,
      atsScore,
      warnings: this.deriveWarnings(p, issues),
      metrics: m,
    };
  }

  // ---------------------------------------------------------------------------
  //  42.3F — Apply a single fix to a profile snapshot.
  //  Only handles autoFixAvailable issues; others require manual edit.
  // ---------------------------------------------------------------------------
  applyFix(profile: CvProfileSnapshot, issueId: string, userInput?: string): CvProfileSnapshot {
    const next: CvProfileSnapshot = JSON.parse(JSON.stringify(profile || {}));

    // ---- summary autofix ----
    if (issueId === 'no-summary') {
      const text = (userInput && userInput.trim()) || this.suggestSummary(next);
      next.personal = { ...(next.personal || {}), summary: text };
      return next;
    }

    // ---- bullet weak-verb rewrite ----
    const bulletMatch = /^bullet-weak-(.+)-(\d+)$/.exec(issueId);
    if (bulletMatch) {
      const [, expId, idxStr] = bulletMatch;
      const idx = Number(idxStr);
      const arr = next.experience || [];
      const e = arr.find((x) => x.id === expId);
      if (e?.bullets?.[idx] != null) {
        const cur = e.bullets[idx];
        const replacement = (userInput && userInput.trim()) || this.suggestActionVerbRewrite(cur);
        e.bullets[idx] = replacement;
      }
      next.experience = arr;
      return next;
    }

    // ---- ATS glyph strip ----
    if (issueId === 'ats-glyphs') {
      const strip = (s?: string) => {
        if (!s) return s;
        let out = s;
        for (const g of ATS_UNSAFE_GLYPHS) out = out.split(g).join('');
        return out.replace(/\s{2,}/g, ' ').trim();
      };
      next.personal = next.personal || {};
      next.personal.summary = strip(next.personal.summary);
      if (next.experience) {
        next.experience = next.experience.map((e) => ({
          ...e,
          bullets: (e.bullets || []).map((b) => strip(b) || ''),
        }));
      }
      return next;
    }

    return next;
  }

  // ---------------------------------------------------------------------------
  //  42.3H — Template recommendation engine.
  //  Given a quality report (detected type + ats score), score every
  //  candidate template and return ordered ids.
  // ---------------------------------------------------------------------------
  recommendTemplates(report: CvQualityReport, templates: Array<{ id: string; category?: string; atsSafe?: boolean; name?: string }>) {
    const scored = templates.map((t) => {
      let score = 0;
      const cat = (t.category || '').toLowerCase();
      // Type match
      if (cat.includes(report.detectedType)) score += 40;
      // ATS-aware
      if (t.atsSafe && report.atsScore < 70) score += 30;
      if (t.atsSafe) score += 10;
      // Generic boost for "modern" / "minimal" / "professional"
      if (/modern|minimal|professional|clean/i.test(t.name || '')) score += 5;
      return { id: t.id, score, name: t.name, atsSafe: !!t.atsSafe, category: t.category };
    });
    scored.sort((a, b) => b.score - a.score);
    return {
      bestOverall:   scored.slice(0, 5),
      bestForAts:    scored.filter((x) => x.atsSafe).slice(0, 3),
      bestForDesign: scored.filter((x) => /designer|creative|magazine/i.test(x.category || '') || /modern|design/i.test(x.name || '')).slice(0, 3),
      detectedType:  report.detectedType,
    };
  }

  // ---------------------------------------------------------------------------
  //  42.3I — Job target mode.
  //  Compares a CvProfile's skills + bullets against a free-text job
  //  description. Pure keyword + skill intersection; no LLM, no fake claims.
  // ---------------------------------------------------------------------------
  matchJob(profile: CvProfileSnapshot, jobDescription: string): CvJobMatchReport {
    const jd = (jobDescription || '').toLowerCase();
    const skills = (profile.skills || []).map((s) => (s.name || '').toLowerCase()).filter(Boolean);
    const skillSet = new Set(skills);

    // Heuristic skill extraction from JD — look for capitalised noun phrases
    // and common tech keywords. Also pull lines starting with "- " or "•".
    const candidates = new Set<string>();
    for (const line of jobDescription.split(/[\n\r]+/)) {
      const m = line.match(/[A-Z][A-Za-z0-9\.\+\#\-]{2,}/g);
      if (m) m.forEach((w) => candidates.add(w.toLowerCase()));
    }
    // Add common tech stack tokens explicitly.
    for (const tok of ['react','typescript','javascript','python','golang','rust','java','kotlin','swift','sql','postgres','mysql','aws','gcp','azure','docker','kubernetes','terraform','figma','sketch','seo','sem','crm','salesforce','tableau','excel','agile','scrum','jira']) {
      if (jd.includes(tok)) candidates.add(tok);
    }

    const present: string[] = [];
    const missing: string[] = [];
    candidates.forEach((c) => {
      if (skillSet.has(c) || (profile.experience || []).some((e) => (e.bullets || []).some((b) => b.toLowerCase().includes(c)))) present.push(c);
      else missing.push(c);
    });

    const alignment = Math.round(present.length / Math.max(1, present.length + missing.length) * 100);

    // Recommend priority sections based on what the JD emphasises.
    const prioritySections: string[] = [];
    if (jd.includes('leadership') || jd.includes('manage')) prioritySections.push('experience', 'summary');
    if (jd.includes('research') || jd.includes('publication')) prioritySections.push('education', 'projects');
    if (jd.includes('design') || jd.includes('portfolio')) prioritySections.push('projects');
    if (jd.includes('engineer') || jd.includes('developer')) prioritySections.push('skills', 'projects', 'experience');

    const recommendations: string[] = [];
    if (alignment < 60) recommendations.push('Add the missing skills above ONLY if you actually have experience with them — do not fabricate.');
    if (missing.includes('aws') || missing.includes('gcp')) recommendations.push('Cloud platforms are usually called out explicitly in the JD; list any cloud experience you have, including personal projects.');
    if (alignment >= 80) recommendations.push('Strong alignment — focus on rewriting bullets to use the exact terms from the JD where truthful.');

    return {
      alignment,
      missingSkills: missing.slice(0, 15),
      presentSkills: present.slice(0, 30),
      keywordsToAdd: missing.slice(0, 8),
      prioritySections: Array.from(new Set(prioritySections)),
      recommendations,
    };
  }

  // =========================================================================
  //  Internals
  // =========================================================================

  private mkIssue(i: Omit<CvIssue, 'detail'> & { detail?: string }): CvIssue {
    return { detail: '', ...i } as CvIssue;
  }

  private detectType(p: CvProfileSnapshot): CvQualityReport['detectedType'] {
    const haystack = (
      (p.personal?.headline || '') + ' ' + (p.personal?.summary || '') + ' ' +
      (p.experience || []).map((e) => `${e.role} ${e.company}`).join(' ') + ' ' +
      (p.skills || []).map((s) => s.name).join(' ')
    ).toLowerCase();

    if (/engineer|developer|programmer|swe|backend|frontend|devops|sre/.test(haystack)) return 'developer';
    if (/design|ux|ui|illustrat|brand|creative|figma|adobe/.test(haystack))            return 'designer';
    if (/cto|cfo|coo|ceo|chief|vp|head of|director|partner/.test(haystack))            return 'executive';
    if (/phd|professor|research|academic|publication|postdoc/.test(haystack))          return 'academic';
    if (/nurse|doctor|physician|clinic|patient|hospital|md\b/.test(haystack))          return 'healthcare';
    if (/finance|investment|portfolio|trader|analyst|banking|cfa/.test(haystack))      return 'finance';
    if (/sales|business development|account|quota|pipeline|crm/.test(haystack))        return 'sales';
    if (/marketing|seo|sem|growth|campaign|brand/.test(haystack))                      return 'marketing';
    if (/student|intern|undergraduate|graduating/.test(haystack))                      return 'student';
    return 'general';
  }

  private computeMetrics(p: CvProfileSnapshot) {
    const exp = p.experience || [];
    const bullets = exp.flatMap((e) => e.bullets || []);
    const totalWords = bullets.reduce((s, b) => s + b.split(/\s+/).filter(Boolean).length, 0);
    const actionVerbHits = bullets.filter((b) => {
      const w = (b.split(/\s+/)[0] || '').toLowerCase().replace(/[.,;:]$/, '');
      return ACTION_VERBS.has(w);
    }).length;
    const measurableHits = bullets.filter((b) => MEASURABLE_REGEX.test(b)).length;

    const summaryLen = (p.personal?.summary || '').length;
    const totalChars = totalWords * 6 + summaryLen
      + (p.education || []).length * 80
      + (p.skills || []).length * 12
      + (p.languages || []).length * 12;
    const estimatedPages = Math.max(1, Math.round((totalChars / 1800) * 10) / 10);

    const yearsExperience = this.calcYears(exp);

    const sectionsPresent: string[] = [];
    const sectionsMissing: string[] = [];
    const sectionCheck: Array<[string, boolean]> = [
      ['personal',       Object.keys(p.personal || {}).length > 0],
      ['summary',        !!(p.personal?.summary)],
      ['experience',     exp.length > 0],
      ['education',      (p.education || []).length > 0],
      ['skills',         (p.skills || []).length > 0],
      ['languages',      (p.languages || []).length > 0],
      ['projects',       (p.projects || []).length > 0],
      ['certifications', (p.certifications || []).length > 0],
    ];
    for (const [k, has] of sectionCheck) (has ? sectionsPresent : sectionsMissing).push(k);

    return {
      bulletCount:    bullets.length,
      avgBulletWords: bullets.length ? Math.round(totalWords / bullets.length) : 0,
      actionVerbRatio: bullets.length ? Math.round(actionVerbHits  / bullets.length * 100) : 0,
      measurableRatio: bullets.length ? Math.round(measurableHits  / bullets.length * 100) : 0,
      estimatedPages,
      yearsExperience,
      sectionsPresent,
      sectionsMissing,
    };
  }

  private calcYears(exp: CvExperience[]): number {
    let total = 0;
    for (const e of exp) {
      const s = this.parseYearMonth(e.start);
      const en = e.end ? this.parseYearMonth(e.end) : { y: new Date().getFullYear(), m: new Date().getMonth() + 1 };
      if (!s || !en) continue;
      total += Math.max(0, (en.y - s.y) + (en.m - s.m) / 12);
    }
    return Math.round(total * 10) / 10;
  }

  private parseYearMonth(s?: string): { y: number; m: number } | null {
    if (!s) return null;
    const m = /^(\d{4})(?:-(\d{2}))?$/.exec(s);
    if (!m) return null;
    return { y: Number(m[1]), m: Number(m[2] ?? 1) };
  }

  private computeSubscores(p: CvProfileSnapshot, issues: CvIssue[], m: ReturnType<CvAnalyzerService['computeMetrics']>): CvSubscores {
    const penalty = (cats: IssueCategory[], capPerSeverity = { critical: 30, major: 15, minor: 5, info: 1 }) => {
      let pen = 0;
      for (const i of issues) {
        if (!cats.includes(i.category)) continue;
        pen += capPerSeverity[i.severity] ?? 5;
      }
      return Math.min(80, pen);
    };

    const structureScore   = Math.max(0, 100 - penalty(['structure'])     - (m.sectionsMissing.length * 4));
    const contentScore     = Math.max(0, 100 - penalty(['experience','summary','skills']));
    const impactScore      = Math.max(0, Math.round(40 + m.actionVerbRatio * 0.3 + m.measurableRatio * 0.3));
    const atsScore         = Math.max(0, 100 - penalty(['ats']) - (m.estimatedPages > 2 ? 10 : 0));
    const readability      = Math.max(0, 100 - penalty(['readability']) - (m.avgBulletWords > 30 ? 10 : 0));
    const designScore      = Math.max(0, 100 - penalty(['design']));
    const completeness     = Math.max(0, Math.round((m.sectionsPresent.length / 8) * 100));

    return {
      structure: Math.round(structureScore),
      content:   Math.round(contentScore),
      impact:    Math.round(impactScore),
      ats:       Math.round(atsScore),
      readability: Math.round(readability),
      design:    Math.round(designScore),
      completeness: Math.round(completeness),
    };
  }

  private weightedOverall(s: CvSubscores): number {
    return Math.round(
      s.structure   * 0.20 +
      s.content     * 0.25 +
      s.impact      * 0.20 +
      s.ats         * 0.15 +
      s.readability * 0.10 +
      s.design      * 0.10
    );
  }

  private atsScoreOnly(p: CvProfileSnapshot, issues: CvIssue[], m: ReturnType<CvAnalyzerService['computeMetrics']>): number {
    let score = 100;
    for (const i of issues) {
      if (i.category === 'ats') score -= (i.severity === 'critical' ? 30 : i.severity === 'major' ? 15 : 8);
      if (i.category === 'contact' && i.severity === 'critical') score -= 20;
    }
    if (m.estimatedPages > 2) score -= 10;
    if ((p.skills || []).length < 5) score -= 5;
    return Math.max(0, Math.min(100, score));
  }

  private deriveWarnings(p: CvProfileSnapshot, issues: CvIssue[]): string[] {
    const out: string[] = [];
    if (issues.some((i) => i.severity === 'critical')) out.push('Critical issues block strong screening — fix these first.');
    if ((p.personal?.photoUrl) && this.detectType(p) === 'general') out.push('A photo may hurt your CV in regions where it is discouraged (US, UK, Canada, AU). Use a photo-free variant for those markets.');
    return out;
  }

  private suggestSummary(p: CvProfileSnapshot): string {
    const role = p.experience?.[0]?.role || p.personal?.headline || 'Professional';
    const years = this.calcYears(p.experience || []);
    const topSkills = (p.skills || []).slice(0, 3).map((s) => s.name).filter(Boolean).join(', ');
    return `${role} with ${years >= 1 ? `${Math.round(years)}+ years` : 'hands-on'} of experience${topSkills ? ` in ${topSkills}` : ''}. Looking for roles where I can [describe impact area]. Past wins include [add 1 measurable result].`;
  }

  private suggestActionVerbRewrite(bullet: string): string {
    // Strip "Responsible for", "Duties included", weak openings.
    let s = bullet.replace(/^\s*(responsible for|duties included|tasks included|helped (to )?|worked on |did )/i, '').trim();
    if (!s) return bullet;
    s = s.charAt(0).toUpperCase() + s.slice(1);
    // Prepend a strong verb if none.
    const first = (s.split(/\s+/)[0] || '').toLowerCase();
    if (!ACTION_VERBS.has(first)) s = `Delivered ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
    return s + (MEASURABLE_REGEX.test(s) ? '' : ' [add a measurable result]');
  }

  private truncate(s: string, n: number): string {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
}
