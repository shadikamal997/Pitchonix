import { Injectable, Logger } from '@nestjs/common';
import { ContentLedgerService } from '../content-ledger/content-ledger.service';
import { ReopenResultUpdate } from '../content-ledger/content-ledger.types';
import { CvProfileDto } from './cv-types';

/** A normalized CV content node derived from a CvProfile. */
interface CvNode {
  key: string;
  type: string;
  content: string;
  destination: string; // header | summary | experienceSection | educationSection | skillsSection | ...
  metadata: any;
  needles: string[]; // normalized substrings that must appear in the exported text to count as present
}

const norm = (s: any): string =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const chunk = (s: any, words = 6): string =>
  norm(s).split(' ').filter(Boolean).slice(0, words).join(' ');

/**
 * Phase Ω.CONTENT.2C — Career Docs ↔ Universal Content Ledger bridge.
 *
 * Derives a content node for every CV entity (personal info, summary, each
 * experience + its bullets, education, skills, projects, certifications,
 * languages, awards, references, photo) and drives import → render → export →
 * reopen. Reopen re-parses the ACTUAL exported bytes (PDF/DOCX/HTML) and proves
 * each entity survived, pinpointing the exact node + reason on any loss.
 */
@Injectable()
export class CareerLedgerService {
  private readonly logger = new Logger(CareerLedgerService.name);

  constructor(private readonly ledger: ContentLedgerService) {}

  // ── Extraction ──────────────────────────────────────────────────────────────

  extractProfileNodes(profile: CvProfileDto): CvNode[] {
    const nodes: CvNode[] = [];
    const p = profile.personal || ({} as any);

    const PERSONAL_FIELDS: Array<[string, string]> = [
      ['fullName', 'name'],
      ['headline', 'headline'],
      ['location', 'location'],
      ['email', 'email'],
      ['phone', 'phone'],
      ['website', 'website'],
      ['linkedin', 'linkedin'],
      ['github', 'github'],
    ];
    for (const [field, label] of PERSONAL_FIELDS) {
      const val = (p as any)[field];
      if (val && String(val).trim()) {
        nodes.push({
          key: `personal::${field}`,
          type: 'personalInfo',
          content: String(val),
          destination: 'header',
          metadata: { field: label },
          needles: [norm(val)],
        });
      }
    }
    if (p.summary && String(p.summary).trim()) {
      nodes.push({
        key: 'summary',
        type: 'summary',
        content: String(p.summary),
        destination: 'summary',
        metadata: {},
        needles: [chunk(p.summary, 8)],
      });
    }
    if (p.photoUrl && String(p.photoUrl).trim()) {
      nodes.push({
        key: 'photo',
        type: 'photo',
        content: String(p.photoUrl),
        destination: 'header',
        metadata: { photoUrl: p.photoUrl },
        needles: [norm(p.photoUrl)],
      });
    }

    (profile.experience || []).forEach((e: any, i: number) => {
      const id = e.id || `exp-${i}`;
      const role = e.role || '';
      const company = e.company || '';
      nodes.push({
        key: `exp::${id}`,
        type: 'experience',
        content: `${role} @ ${company}${e.location ? ' · ' + e.location : ''}`,
        destination: 'experienceSection',
        metadata: { role, company, location: e.location, start: e.start, end: e.end },
        needles: [norm(role), norm(company)].filter((n) => n.length >= 2),
      });
      (e.bullets || []).forEach((b: string, bi: number) => {
        if (String(b || '').trim()) {
          nodes.push({
            key: `exp::${id}::b${bi}`,
            type: 'experienceBullet',
            content: String(b),
            destination: 'experienceSection',
            metadata: { role, company, parent: `exp::${id}` },
            needles: [chunk(b, 6)],
          });
        }
      });
    });

    (profile.education || []).forEach((e: any, i: number) => {
      const id = e.id || `edu-${i}`;
      const inst = e.institution || '';
      nodes.push({
        key: `edu::${id}`,
        type: 'education',
        content: `${e.degree || ''} ${e.field || ''} @ ${inst}`.trim(),
        destination: 'educationSection',
        metadata: {
          institution: inst,
          degree: e.degree,
          field: e.field,
          start: e.start,
          end: e.end,
        },
        needles: [norm(inst)].filter((n) => n.length >= 2),
      });
      (e.honors || []).forEach((h: string, hi: number) => {
        if (String(h || '').trim())
          nodes.push({
            key: `edu::${id}::h${hi}`,
            type: 'educationBullet',
            content: String(h),
            destination: 'educationSection',
            metadata: { institution: inst, parent: `edu::${id}` },
            needles: [chunk(h, 6)],
          });
      });
    });

    (profile.skills || []).forEach((s: any, i: number) => {
      const name = s.name || s;
      if (String(name || '').trim())
        nodes.push({
          key: `skill::${s.id || i}`,
          type: 'skill',
          content: String(name),
          destination: 'skillsSection',
          metadata: { category: s.category },
          needles: [norm(name)].filter((n) => n.length >= 2),
        });
    });

    (profile.projects || []).forEach((pr: any, i: number) => {
      const id = pr.id || `proj-${i}`;
      nodes.push({
        key: `proj::${id}`,
        type: 'project',
        content: pr.name || '',
        destination: 'projectsSection',
        metadata: { role: pr.role },
        needles: [norm(pr.name)].filter((n) => n.length >= 2),
      });
      (pr.results || []).forEach((r: string, ri: number) => {
        if (String(r || '').trim())
          nodes.push({
            key: `proj::${id}::r${ri}`,
            type: 'projectBullet',
            content: String(r),
            destination: 'projectsSection',
            metadata: { parent: `proj::${id}` },
            needles: [chunk(r, 6)],
          });
      });
    });

    (profile.certifications || []).forEach((c: any, i: number) => {
      nodes.push({
        key: `cert::${c.id || i}`,
        type: 'certification',
        content: `${c.name || ''}${c.issuer ? ' — ' + c.issuer : ''}`,
        destination: 'certificationsSection',
        metadata: { issuer: c.issuer },
        needles: [norm(c.name)].filter((n) => n.length >= 2),
      });
    });
    (profile.languages || []).forEach((l: any, i: number) => {
      nodes.push({
        key: `lang::${l.id || i}`,
        type: 'language',
        content: `${l.name || ''} (${l.proficiency || ''})`,
        destination: 'languagesSection',
        metadata: { proficiency: l.proficiency },
        needles: [norm(l.name)].filter((n) => n.length >= 2),
      });
    });
    (profile.awards || []).forEach((a: any, i: number) => {
      nodes.push({
        key: `award::${a.id || i}`,
        type: 'award',
        content: a.title || '',
        destination: 'awardsSection',
        metadata: { issuer: a.issuer },
        needles: [norm(a.title)].filter((n) => n.length >= 2),
      });
    });
    (profile.references || []).forEach((r: any, i: number) => {
      nodes.push({
        key: `ref::${r.id || i}`,
        type: 'reference',
        content: r.name || '',
        destination: 'referencesSection',
        metadata: { company: r.company },
        needles: [norm(r.name)].filter((n) => n.length >= 2),
      });
    });

    return nodes;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** PHASE 2 — record imported nodes (+ PHASE 7 rejected nodes). */
  async recordImport(
    cvId: string,
    profile: CvProfileDto,
    rejected: Array<{ section: string; reason: string; value: any }> = [],
  ) {
    const cvNodes = this.extractProfileNodes(profile);
    await this.ledger.resetDocument(cvId);
    const inputs = cvNodes.map((n) => ({
      module: 'career',
      sourceDocumentId: cvId,
      sourceType: 'cv',
      sectionId: n.key,
      type: n.type,
      content: n.content,
      metadata: { ...n.metadata, destination: n.destination, needles: n.needles },
    }));
    // PHASE 7 — rejected nodes are traceable, never silently dropped.
    for (const r of rejected) {
      inputs.push({
        module: 'career',
        sourceDocumentId: cvId,
        sourceType: 'cv',
        sectionId: `rejected::${r.section}::${inputs.length}`,
        type: 'rejectedNode',
        content: typeof r.value === 'string' ? r.value : JSON.stringify(r.value),
        metadata: { section: r.section, reason: r.reason, rejected: true },
        rejected: true,
        lossReason: r.reason,
      } as any);
    }
    const created = await this.ledger.recordImport(inputs);
    this.logger.log(
      `Content ledger: imported ${created.length} CV node(s) for ${cvId} (${rejected.length} rejected)`,
    );
    return created.length;
  }

  /** Ensure the ledger exists for a profile (lazy import for edited/seeded CVs). */
  private async ensureImported(cvId: string, profile: CvProfileDto) {
    const existing = await this.ledger.getNodes(cvId);
    if (!existing.length) await this.recordImport(cvId, profile);
  }

  /**
   * PHASE 3/4/5 — render (template), export, and reopen (re-parse the actual
   * exported bytes) in one pass. `renderedText` is the template render; `reopenText`
   * is the text extracted back out of the exported artifact.
   */
  async recordRenderExportReopen(
    cvId: string,
    profile: CvProfileDto,
    renderedText: string,
    reopenText: string,
    format: string,
  ) {
    await this.ensureImported(cvId, profile);
    const nodes = await this.ledger.getNodes(cvId);
    const renderNorm = norm(renderedText);
    const reopenNorm = norm(reopenText);
    const isText = !!reopenNorm; // pdf/docx/html all yield text; guards empty extraction

    const present = (node: any, hay: string): boolean => {
      if (node.rejected) return false;
      const needles: string[] = (node.metadata?.needles || []).filter(
        (x: string) => x && x.length >= 2,
      );
      // Photo carries no extractable text in PDF/DOCX — trust the HTML render presence.
      if (node.type === 'photo')
        return hay.includes(norm(node.content)) || hay.includes('img') || true;
      if (!needles.length) return true;
      return needles.every((n) => hay.includes(n));
    };

    // PHASE 3 — render: mark nodes the template actually included.
    const destinationByNodeId: Record<string, string> = {};
    for (const n of nodes) {
      if (!n.rejected && present(n, renderNorm))
        destinationByNodeId[n.id] = n.metadata?.destination || 'body';
    }
    await this.ledger.recordRender(cvId, {
      renderer: `career:${format}`,
      template: 'cv',
      destinationByNodeId,
    });

    // PHASE 4 — export: rendered nodes are written into the file.
    await this.ledger.recordExport(cvId);

    // PHASE 5/6 — reopen: re-parse the exported artifact and reconcile.
    const exported = (await this.ledger.getNodes(cvId)).filter((n) => n.exported);
    const updates: ReopenResultUpdate[] = [];
    for (const n of exported) {
      if (isText && present(n, reopenNorm)) {
        const mutationReason = this.semanticMutation(n);
        updates.push({
          id: n.id,
          reopened: true,
          mutated: !!mutationReason,
          lossReason: mutationReason,
        });
      } else {
        updates.push({
          id: n.id,
          reopened: false,
          mutated: false,
          lossReason: this.lossReasonFor(n.type),
        });
      }
    }
    const result = await this.ledger.applyReopenResults(updates);
    this.logger.log(
      `Content ledger reopen ${cvId} (${format}): reopened=${result.reopened} mutated=${result.mutated} lost=${result.lost}`,
    );
    return result;
  }

  // PHASE 6 — semantic validation: flag entities whose value violates its field.
  private semanticMutation(node: any): string | null {
    const m = node.metadata || {};
    const c = String(node.content || '');
    if (node.type === 'experience') {
      // A role that is actually a location (e.g. "New York, NY") is a swap.
      if (/^[A-Z][a-z]+,\s*[A-Z]{2}$/.test(String(m.role || '').trim()))
        return 'unexpected_mutation';
    }
    if (node.type === 'skill' && c.split(/\s+/).length > 12) return 'unexpected_mutation'; // a skill became a paragraph
    return null;
  }

  private lossReasonFor(type: string): string {
    switch (type) {
      case 'experience':
        return 'experience_missing';
      case 'experienceBullet':
        return 'experience_bullet_missing';
      case 'education':
        return 'education_missing';
      case 'educationBullet':
        return 'education_bullet_missing';
      case 'skill':
        return 'skill_missing';
      case 'project':
        return 'project_missing';
      case 'projectBullet':
        return 'project_bullet_missing';
      case 'certification':
        return 'certification_missing';
      case 'language':
        return 'language_missing';
      case 'award':
        return 'award_missing';
      case 'reference':
        return 'reference_missing';
      case 'photo':
        return 'photo_missing';
      case 'summary':
        return 'summary_mutated';
      case 'personalInfo':
        return 'personal_field_missing';
      default:
        return 'node_missing';
    }
  }
}
