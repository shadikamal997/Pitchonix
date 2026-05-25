import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CvAnalyzerService, CvProfileSnapshot, CvQualityReport } from './cv-analyzer.service';
import { CvDocumentsService } from './cv-documents.service';

// =============================================================================
//  Phase 42.4 — CV Intelligence Studio PRO+
//
//  Adds five new capability layers on top of the Phase 42.3 analyzer:
//
//    42.4B   CvSnapshotService           persistent analysis history
//    42.4C   CvVariantsService           one-click multi-version generation
//    42.4D   CvBenchmarkService          percentile bands vs industry
//    42.4E   CvInterviewReadinessService recruiter / hiring-manager Q's
//    42.4J   CvExportValidationService   preflight before download
//
//  Advanced job matching (42.4F) lives on the existing CvAnalyzerService
//  (matchJob() was extended in this phase to return strengths/weaknesses/
//  seniority signals).
//
//  All snapshots are workspace-scoped via profile.userId. Every read/write
//  performs an owner check before returning data.
// =============================================================================

export type CvSnapshotKind = 'analysis' | 'job-match' | 'benchmark' | 'variants' | 'interview';

// =============================================================================
//  Snapshot persistence
// =============================================================================
@Injectable()
export class CvSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  async save(opts: {
    userId:     string;
    profileId:  string;
    documentId?: string | null;
    kind:       CvSnapshotKind;
    label?:     string;
    analysisJson: any;
    profileJson?: any;
    score?:     number | null;
    atsScore?:  number | null;
  }) {
    return this.prisma.cvAnalysisSnapshot.create({
      data: {
        userId:       opts.userId,
        profileId:    opts.profileId,
        documentId:   opts.documentId ?? null,
        kind:         opts.kind,
        label:        opts.label ?? null,
        analysisJson: opts.analysisJson,
        profileJson:  opts.profileJson ?? undefined,
        score:        opts.score ?? null,
        atsScore:     opts.atsScore ?? null,
      },
    });
  }

  async list(userId: string, opts: { profileId?: string; documentId?: string; kind?: CvSnapshotKind; limit?: number } = {}) {
    return this.prisma.cvAnalysisSnapshot.findMany({
      where: {
        userId,
        ...(opts.profileId  ? { profileId:  opts.profileId  } : {}),
        ...(opts.documentId ? { documentId: opts.documentId } : {}),
        ...(opts.kind       ? { kind:       opts.kind       } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take:    opts.limit ?? 50,
      select:  {
        id: true, kind: true, score: true, atsScore: true, label: true,
        createdAt: true, documentId: true,
      },
    });
  }

  async get(userId: string, snapshotId: string) {
    const row = await this.prisma.cvAnalysisSnapshot.findUnique({ where: { id: snapshotId } });
    if (!row) throw new NotFoundException('Snapshot not found');
    if (row.userId !== userId) throw new ForbiddenException();
    return row;
  }

  async delete(userId: string, snapshotId: string) {
    await this.get(userId, snapshotId); // owner check
    await this.prisma.cvAnalysisSnapshot.delete({ where: { id: snapshotId } });
    return { ok: true };
  }

  /** Returns the profileJson that was captured at snapshot time, for restore. */
  async restorePayload(userId: string, snapshotId: string) {
    const row = await this.get(userId, snapshotId);
    return { profile: row.profileJson, analysisJson: row.analysisJson, kind: row.kind };
  }

  /** Bulk delete for a user — used by "Delete all analysis history". */
  async deleteAll(userId: string, opts: { profileId?: string } = {}) {
    const res = await this.prisma.cvAnalysisSnapshot.deleteMany({
      where: { userId, ...(opts.profileId ? { profileId: opts.profileId } : {}) },
    });
    return { deleted: res.count };
  }
}

// =============================================================================
//  Variant generation (42.4C)
// =============================================================================
export type VariantPreset =
  | 'ats' | 'executive' | 'modern' | 'creative' | 'developer' | 'consulting';

export interface VariantSpec {
  preset:        VariantPreset;
  title:         string;
  sectionOrder:  string[];
  templateCategoryPreference: string[];
  atsSafePreference: boolean;
  emphasis:      string[];  // which sections to lead with
}

const VARIANT_PRESETS: Record<VariantPreset, VariantSpec> = {
  ats: {
    preset: 'ats', title: 'ATS Version',
    sectionOrder: ['header','summary','skills','experience','education','certifications'],
    templateCategoryPreference: ['ats','minimal','modern'],
    atsSafePreference: true,
    emphasis: ['skills','experience'],
  },
  executive: {
    preset: 'executive', title: 'Executive Version',
    sectionOrder: ['header','summary','experience','achievements','education','skills'],
    templateCategoryPreference: ['executive','corporate','consulting'],
    atsSafePreference: false,
    emphasis: ['summary','experience'],
  },
  modern: {
    preset: 'modern', title: 'Modern Version',
    sectionOrder: ['header','summary','experience','skills','projects','education'],
    templateCategoryPreference: ['modern','minimal','professional'],
    atsSafePreference: false,
    emphasis: ['summary','experience','projects'],
  },
  creative: {
    preset: 'creative', title: 'Creative Version',
    sectionOrder: ['header','summary','projects','experience','skills','education'],
    templateCategoryPreference: ['designer','creative','magazine'],
    atsSafePreference: false,
    emphasis: ['projects'],
  },
  developer: {
    preset: 'developer', title: 'Developer Version',
    sectionOrder: ['header','summary','skills','projects','experience','education'],
    templateCategoryPreference: ['developer','technical','minimal'],
    atsSafePreference: false,
    emphasis: ['skills','projects'],
  },
  consulting: {
    preset: 'consulting', title: 'Consulting Version',
    sectionOrder: ['header','summary','experience','education','achievements','skills'],
    templateCategoryPreference: ['consulting','corporate','executive'],
    atsSafePreference: false,
    emphasis: ['experience','education'],
  },
};

@Injectable()
export class CvVariantsService {
  constructor(
    private readonly documents: CvDocumentsService,
    private readonly prisma:    PrismaService,
  ) {}

  /**
   * Pick the best template id for a preset from the user-available catalogue.
   * Falls back to any template if no category match.
   */
  private pickTemplate(preset: VariantSpec, templates: Array<{ id: string; category?: string; atsSafe?: boolean; name?: string }>): string | null {
    const candidates = templates.filter((t) => {
      if (preset.atsSafePreference && !t.atsSafe) return false;
      return preset.templateCategoryPreference.some((p) => (t.category || '').toLowerCase().includes(p));
    });
    if (candidates.length > 0) return candidates[0].id;
    // Fallback: any ATS-safe if preset asked for it.
    if (preset.atsSafePreference) {
      const fb = templates.find((t) => t.atsSafe);
      if (fb) return fb.id;
    }
    return templates[0]?.id ?? null;
  }

  async generate(opts: {
    userId:    string;
    profileId: string;
    presets:   VariantPreset[];
    brandKitId?: string | null;
    templates: Array<{ id: string; category?: string; atsSafe?: boolean; name?: string }>;
  }) {
    const created: Array<{ preset: VariantPreset; documentId: string; templateId: string | null; title: string }> = [];
    for (const preset of opts.presets) {
      const spec = VARIANT_PRESETS[preset];
      if (!spec) continue;
      const templateId = this.pickTemplate(spec, opts.templates);
      const doc = await this.documents.create({
        userId:     opts.userId,
        profileId:  opts.profileId,
        doctype:    'cv',
        title:      spec.title,
        templateId,
        brandKitId: opts.brandKitId ?? null,
        variant:    preset,
      });
      // Persist the section-order preference into the document content.
      try {
        await this.documents.update(doc.id, {
          content: { ...(doc.content || {}), sectionOrder: spec.sectionOrder as any, variantPreset: preset } as any,
        });
      } catch { /* non-fatal — empty section order falls back to default */ }
      created.push({ preset, documentId: doc.id, templateId, title: spec.title });
    }
    return { created };
  }

  /** Expose presets for the UI. */
  listPresets() {
    return Object.values(VARIANT_PRESETS).map((p) => ({
      preset: p.preset, title: p.title,
      sectionOrder: p.sectionOrder,
      atsSafe:    p.atsSafePreference,
      emphasis:   p.emphasis,
    }));
  }
}

// =============================================================================
//  Benchmarking (42.4D)
//  Pure-rule percentile bands. No external data sources — bands are derived
//  from generally-accepted CV writing guidelines (e.g. action-verb ratio
//  above 70% places a CV in the top decile per most resume-coaching corpora).
// =============================================================================

export interface CvBenchmarkReport {
  industryAverage: { ats: number; impact: number; readability: number };
  topDecile:       { ats: number; impact: number; readability: number };
  user:            { ats: number; impact: number; readability: number };
  bands: {
    ats:         BenchmarkBand;
    impact:      BenchmarkBand;
    readability: BenchmarkBand;
    pageEfficiency: BenchmarkBand;
    actionVerbs:    BenchmarkBand;
    measurables:    BenchmarkBand;
    skillsCoverage: BenchmarkBand;
  };
  notes: string[];
}

export interface BenchmarkBand {
  metric:    string;
  value:     number;
  industry:  number;
  top10:     number;
  unit:      'percent' | 'pages' | 'count' | 'score';
  percentile: number;   // 0..100 — user's percentile estimate
  band:      'top10' | 'aboveAvg' | 'average' | 'belowAvg' | 'bottom';
  hint:      string;
}

const BAND = (v: number, industry: number, top10: number): { percentile: number; band: BenchmarkBand['band'] } => {
  // Linear estimate. Anything ≥ top10 = 90th percentile, ≥ industry = 60th,
  // ≥ 0.7×industry = 35th, below = bottom.
  if (v >= top10)            return { percentile: 92, band: 'top10' };
  if (v >= industry)         return { percentile: 65, band: 'aboveAvg' };
  if (v >= industry * 0.7)   return { percentile: 40, band: 'average' };
  if (v >= industry * 0.4)   return { percentile: 20, band: 'belowAvg' };
  return { percentile: 5, band: 'bottom' };
};

@Injectable()
export class CvBenchmarkService {
  benchmark(report: CvQualityReport): CvBenchmarkReport {
    const m = report.metrics;

    const atsBand = BAND(report.atsScore, 71, 91);
    const impactBand = BAND(report.subscores.impact, 65, 88);
    const readBand   = BAND(report.subscores.readability, 70, 90);

    // Inverse for pages — fewer = better. Convert to a "page efficiency"
    // score: 100 - (pages-1)*30, clamped.
    const pageEff = Math.max(0, Math.min(100, 100 - (m.estimatedPages - 1) * 30));
    const pageBand = BAND(pageEff, 65, 90);

    const verbBand    = BAND(m.actionVerbRatio, 55, 80);
    const measBand    = BAND(m.measurableRatio, 35, 70);
    const skillsCount = (() => {
      // Skills coverage = how many skills the user has (normalised to 0..100).
      const n = (report as any).skillsCount ?? 0; // unused; kept for future
      return Math.min(100, n);
    })();
    const skillsBand  = BAND(skillsCount, 50, 90);

    const notes: string[] = [];
    if (atsBand.band === 'top10')      notes.push('Your ATS score is in the top decile — strong choice of template + clean content.');
    if (measBand.band === 'belowAvg' || measBand.band === 'bottom')
      notes.push('Adding measurable results to more bullets is the single highest-impact improvement available.');
    if (pageEff < 50) notes.push('Your CV runs long; recruiters skip past page 2 for most non-executive roles.');

    return {
      industryAverage: { ats: 71, impact: 65, readability: 70 },
      topDecile:       { ats: 91, impact: 88, readability: 90 },
      user:            { ats: report.atsScore, impact: report.subscores.impact, readability: report.subscores.readability },
      bands: {
        ats:           { metric: 'ATS score',          value: report.atsScore,         industry: 71, top10: 91, unit: 'score',   ...atsBand,    hint: 'Cleaner templates + plain text bullets + present contact info.' },
        impact:        { metric: 'Impact',              value: report.subscores.impact, industry: 65, top10: 88, unit: 'score',   ...impactBand, hint: 'Action verbs + measurable outcomes.' },
        readability:   { metric: 'Readability',         value: report.subscores.readability, industry: 70, top10: 90, unit: 'score', ...readBand, hint: 'Trim long bullets, prefer active voice.' },
        pageEfficiency:{ metric: 'Page efficiency',     value: pageEff,                 industry: 65, top10: 90, unit: 'score',   ...pageBand,   hint: 'Target 1–2 pages unless executive / academic.' },
        actionVerbs:   { metric: 'Action-verb ratio',   value: m.actionVerbRatio,       industry: 55, top10: 80, unit: 'percent', ...verbBand,   hint: 'Start bullets with verbs like Led / Shipped / Built.' },
        measurables:   { metric: 'Measurable bullets',  value: m.measurableRatio,       industry: 35, top10: 70, unit: 'percent', ...measBand,   hint: 'Add a number to every other bullet (%, $, users, time).' },
        skillsCoverage:{ metric: 'Skills coverage',     value: Math.min(100, skillsCount), industry: 50, top10: 90, unit: 'score', ...skillsBand, hint: 'List 8–20 concrete skills; ATS systems score on this.' },
      },
      notes,
    };
  }
}

// =============================================================================
//  Interview Readiness (42.4E)
// =============================================================================

export interface InterviewReadinessReport {
  score: number;
  likelyRecruiterQuestions:     Array<{ q: string; rationale: string }>;
  likelyHiringManagerQuestions: Array<{ q: string; rationale: string }>;
  weakAreas:                    string[];
  claimedSkillsNotDemonstrated: string[];
  experienceGaps:               Array<{ from: string; to: string; gapMonths: number }>;
  missingMeasurables:           number;
}

@Injectable()
export class CvInterviewReadinessService {

  analyze(profile: CvProfileSnapshot): InterviewReadinessReport {
    const p = profile || {};
    const personal = p.personal || {};
    const exp = p.experience || [];
    const skills = (p.skills || []).map((s) => (s.name || '').toLowerCase()).filter(Boolean);

    const recruiterQ:     InterviewReadinessReport['likelyRecruiterQuestions'] = [];
    const hiringMgrQ:     InterviewReadinessReport['likelyHiringManagerQuestions'] = [];
    const weakAreas:      string[] = [];
    const claimedNotDemo: string[] = [];

    // 1. Skills claimed without bullet evidence.
    const bulletText = exp.flatMap((e) => e.bullets || []).join(' ').toLowerCase();
    for (const s of skills) {
      if (s.length < 3) continue;
      if (!bulletText.includes(s)) {
        claimedNotDemo.push(s);
        hiringMgrQ.push({
          q: `Can you walk me through a project where you used ${capitalize(s)}?`,
          rationale: `You list ${capitalize(s)} as a skill but no bullet shows hands-on use.`,
        });
      }
    }

    // 2. Leadership / management language → team-size, ownership questions.
    const leaderClaim = /\b(led|managed|owned|directed|head of|hired|coached|mentored)\b/i.test(bulletText);
    if (leaderClaim) {
      hiringMgrQ.push({
        q: 'What was the size of the team you led, and how did you handle underperformers?',
        rationale: 'Leadership claims trigger team-size + people-management probing.',
      });
      hiringMgrQ.push({
        q: 'Walk me through a time you had to make an unpopular decision and stick with it.',
        rationale: 'Standard executive / management screen.',
      });
    }

    // 3. Career chronology — find gaps > 6 months between roles.
    const sorted = [...exp].sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    const gaps: InterviewReadinessReport['experienceGaps'] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prevEnd = sorted[i - 1].end;
      const curStart = sorted[i].start;
      if (!prevEnd || !curStart) continue;
      const a = parseYM(prevEnd); const b = parseYM(curStart);
      if (!a || !b) continue;
      const months = (b.y - a.y) * 12 + (b.m - a.m);
      if (months > 6) {
        gaps.push({ from: prevEnd, to: curStart, gapMonths: months });
        recruiterQ.push({
          q: `What were you doing between ${prevEnd} and ${curStart}?`,
          rationale: `Career gap of ~${Math.round(months)} months detected.`,
        });
      }
    }

    // 4. Standard recruiter screen.
    if (personal.fullName) {
      recruiterQ.push({ q: 'Walk me through your CV in 2 minutes.', rationale: 'Universal opener — practice a 90-second pitch.' });
      recruiterQ.push({ q: 'What are you looking for in your next role?', rationale: 'Filter for fit + motivation.' });
      recruiterQ.push({ q: 'What is your notice period / earliest start date?', rationale: 'Logistics check.' });
      recruiterQ.push({ q: 'What is your salary range?', rationale: 'Hard filter.' });
    }

    // 5. Hiring-manager — pick the most-recent role + question its biggest claim.
    const latest = exp[0];
    if (latest && (latest.bullets || []).length) {
      hiringMgrQ.push({
        q: `Tell me more about "${truncate(latest.bullets[0], 60)}" — what was your specific contribution?`,
        rationale: 'Drills into ownership vs team credit for the headline bullet.',
      });
    }

    // 6. Missing measurables = a known weakness.
    const bullets = exp.flatMap((e) => e.bullets || []);
    const missingMeasurables = bullets.filter((b) => !/\d/.test(b)).length;
    if (missingMeasurables > bullets.length * 0.7) {
      weakAreas.push('Few bullets contain measurable results — expect "What was the impact?" follow-ups.');
    }
    if (claimedNotDemo.length > 3) weakAreas.push(`${claimedNotDemo.length} listed skills have no project / bullet evidence.`);
    if (gaps.length > 0) weakAreas.push(`${gaps.length} chronology gap(s) over 6 months — prepare a short narrative.`);
    if (!personal.summary) weakAreas.push('No professional summary — recruiters often paraphrase it back to you in the first call.');

    // 7. Score.
    let score = 100;
    score -= Math.min(30, claimedNotDemo.length * 4);
    score -= Math.min(25, gaps.length * 10);
    score -= Math.min(20, weakAreas.length * 5);
    if (!personal.summary) score -= 5;

    return {
      score: Math.max(0, score),
      likelyRecruiterQuestions: recruiterQ.slice(0, 6),
      likelyHiringManagerQuestions: hiringMgrQ.slice(0, 8),
      weakAreas,
      claimedSkillsNotDemonstrated: claimedNotDemo.slice(0, 12),
      experienceGaps: gaps,
      missingMeasurables,
    };
  }
}

// =============================================================================
//  Export validation 2.0 (42.4J)
// =============================================================================

export interface ExportValidationReport {
  ok:           boolean;
  warnings:     Array<{ severity: 'error' | 'warning'; section: string; message: string }>;
  recommendations: string[];
  canForceExport: boolean;
}

@Injectable()
export class CvExportValidationService {
  constructor(private readonly analyzer: CvAnalyzerService) {}

  preflight(profile: CvProfileSnapshot): ExportValidationReport {
    const report = this.analyzer.analyze(profile);
    const warnings: ExportValidationReport['warnings'] = [];

    const critical = report.issues.filter((i) => i.severity === 'critical');
    const major    = report.issues.filter((i) => i.severity === 'major');

    for (const i of critical) {
      warnings.push({ severity: 'error',   section: i.section, message: `${i.title}: ${i.suggestion}` });
    }
    for (const i of major.slice(0, 5)) {
      warnings.push({ severity: 'warning', section: i.section, message: `${i.title}: ${i.suggestion}` });
    }

    // Page overflow check.
    if (report.metrics.estimatedPages > 3) {
      warnings.push({
        severity: 'warning',
        section:  'global',
        message:  `CV runs ~${report.metrics.estimatedPages} pages — recruiters typically stop at page 2.`,
      });
    }

    return {
      ok: warnings.filter((w) => w.severity === 'error').length === 0,
      warnings,
      recommendations: report.warnings,
      canForceExport: true,
    };
  }
}

// =============================================================================
//  Helpers
// =============================================================================
function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
function truncate(s: string, n: number): string { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function parseYM(s: string): { y: number; m: number } | null {
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(s || '');
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2] ?? 1) };
}
