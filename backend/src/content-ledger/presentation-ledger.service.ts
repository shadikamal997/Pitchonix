import { Injectable, Logger } from '@nestjs/common';
import AdmZip = require('adm-zip');
import { PrismaService } from '../prisma/prisma.service';
import { ContentLedgerService } from './content-ledger.service';
import { ReopenResultUpdate } from './content-ledger.types';
import { norm, chunk, segmentsOf, phrasePresent, isPlaceholderTitle } from './content-match';

const { PDFParse } = require('pdf-parse');

interface DeckNode {
  key: string;
  type: string;
  content: string;
  destination: string; // slide_N | appendix_slide_N | continuation_slide_N | speaker_notes | overflow_materialization
  metadata: any;
  needles: string[];
}

const arr = (x: any): any[] => (Array.isArray(x) ? x : []);

/**
 * Phase Ω.CONTENT.2D — Presentations ↔ Universal Content Ledger bridge.
 *
 * Extracts a content node for every deck entity (slide titles/subtitles, KPIs,
 * metrics, charts, problem/solution points, market drivers, competition rows,
 * pricing tiers, roadmap milestones, risks, funding allocations, team members +
 * bios, strategy points, speaker notes, appendix / continuation / overflow
 * nodes) and drives import → render → export → reopen. Reopen re-parses the
 * ACTUAL exported PPTX (OOXML slide + notes text) or PDF text.
 */
@Injectable()
export class PresentationLedgerService {
  private readonly logger = new Logger(PresentationLedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: ContentLedgerService,
  ) {}

  // ── Extraction ──────────────────────────────────────────────────────────────
  //
  // The ledger tracks what is ACTUALLY exported, so extraction reads the
  // authoritative SlideElement rows (what the PPTX/PDF exporter renders), plus
  // each slide's title/subtitle/speaker notes. Structured `content` JSON is used
  // as a fallback for decks not yet migrated to elements. Nodes are de-duplicated
  // per slide by normalized content so the two sources never double-count.

  /** Map a slide type to the dominant body-node type for its bullet content. */
  private bodyTypeForSlide(slideType: string): string {
    const t = String(slideType || '');
    if (/risk/.test(t)) return 'risk';
    if (/market/.test(t)) return 'marketDriver';
    if (/problem/.test(t)) return 'problemPoint';
    if (/solution|product|feature/.test(t)) return 'solutionFeature';
    if (/fund|use_of_funds|invest/.test(t)) return 'fundingAllocation';
    if (/compet/.test(t)) return 'competitionRow';
    if (/roadmap|timeline/.test(t)) return 'roadmapMilestone';
    if (/pricing/.test(t)) return 'pricingTier';
    if (/team/.test(t)) return 'teamMember';
    if (/traction|metric|kpi/.test(t)) return 'kpi';
    if (t === 'appendix') return 'appendixNode';
    return 'strategyPoint';
  }

  extractDeckNodes(slides: any[]): DeckNode[] {
    const nodes: DeckNode[] = [];
    const sorted = [...(slides || [])].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

    for (const slide of sorted) {
      const ord = Number(slide.order ?? 0) + 1;
      const isAppendix = slide.type === 'appendix';
      const isContinuation =
        slide.metadata?.kind === 'continuation' || slide.metadata?.continuation === true;
      const dest = isAppendix
        ? `appendix_slide_${ord}`
        : isContinuation
          ? `continuation_slide_${ord}`
          : `slide_${ord}`;
      const sid = slide.id || `slide-${ord}`;
      const seen = new Set<string>();
      const bodyType = this.bodyTypeForSlide(slide.type);
      const push = (
        type: string,
        key: string,
        content: string,
        extra: any = {},
        destination = dest,
      ) => {
        const text = String(content || '').trim();
        if (!text) return;
        const dk = norm(text);
        if (!dk || seen.has(dk)) return;
        seen.add(dk);
        nodes.push({
          key: `${sid}::${key}`,
          type,
          content: text,
          destination,
          metadata: { slideId: sid, slideType: slide.type, order: ord, ...extra },
          needles: [chunk(text, 6)],
        });
      };

      // Synthetic "Slide N" titles for untitled slides are structural placeholders,
      // not authored content (Ω.CONTENT.3B placeholder policy).
      if (slide.title)
        push(
          isAppendix ? 'appendixNode' : isContinuation ? 'continuationNode' : 'slideTitle',
          'title',
          slide.title,
          { placeholder: isPlaceholderTitle(slide.title) },
        );
      if (slide.subtitle) push('slideSubtitle', 'subtitle', slide.subtitle);

      // Authoritative: SlideElement rows (what the exporter renders).
      let bi = 0;
      for (const el of slide.elements || []) {
        const elType = String(el.type || '');
        if (
          [
            'pageNumber',
            'footer',
            'logo',
            'image',
            'icon',
            'shape',
            'line',
            'divider',
            'videoPlaceholder',
            'embeddedMediaPlaceholder',
            'heading',
            'subheading',
          ].includes(elType)
        )
          continue;
        const c = el.content && typeof el.content === 'object' ? el.content : {};
        const d = el.data && typeof el.data === 'object' ? el.data : {};
        if (elType === 'bulletList' || elType === 'numberedList') {
          for (const item of arr(c.items))
            push(
              isAppendix ? 'appendixNode' : isContinuation ? 'continuationNode' : bodyType,
              `b${bi++}`,
              typeof item === 'string' ? item : `${item.text ?? item.title ?? ''}`,
            );
        } else if (elType === 'kpi' || elType === 'metric') {
          push(elType, `b${bi++}`, c.text || `${d.label ?? ''}: ${d.value ?? ''}`.trim());
        } else if (elType === 'chart') {
          push('chart', `b${bi++}`, c.title || c.text || 'chart');
          arr(d.categories)
            .concat(arr(d.labels))
            .forEach((l: any, li: number) => push('chartLabel', `cl${bi}_${li}`, String(l)));
          arr(d.datasets)
            .concat(arr(d.series))
            .forEach((s: any, si: number) =>
              push('chartSeries', `cs${bi}_${si}`, String(s.label ?? s.name ?? `series ${si + 1}`)),
            );
        } else if (elType === 'table' || elType === 'comparison') {
          arr(d.rows).forEach((row: any, ri: number) =>
            push(
              'competitionRow',
              `row${ri}`,
              Array.isArray(row) ? row.join(' ') : `${row.name ?? row.text ?? ''}`,
            ),
          );
        } else if (elType === 'teamCard') {
          push('teamMember', `b${bi++}`, c.text || `${d.name ?? ''} — ${d.role ?? ''}`.trim());
          if (d.bio || d.experience) push('teamBio', `tb${bi}`, String(d.bio || d.experience));
        } else if (elType === 'pricingCard') {
          push('pricingTier', `b${bi++}`, c.text || `${d.name ?? ''} ${d.price ?? ''}`.trim());
        } else if (elType === 'timeline' || elType === 'roadmap') {
          arr(c.items)
            .concat(arr(d.items))
            .forEach((it: any, ii: number) =>
              push(
                'roadmapMilestone',
                `rm${ii}`,
                typeof it === 'string' ? it : `${it.title ?? it.text ?? it.milestone ?? ''}`,
              ),
            );
        } else if (c.text) {
          push(bodyType, `b${bi++}`, String(c.text));
        }
      }

      // Fallback: structured content JSON — ONLY when the slide has no body
      // elements (otherwise elements are authoritative and the content fallback
      // would invent nodes that never reached the exported file).
      const TEXT_BEARING = [
        'bulletList',
        'numberedList',
        'kpi',
        'metric',
        'chart',
        'table',
        'comparison',
        'teamCard',
        'pricingCard',
        'timeline',
        'roadmap',
        'paragraph',
        'quote',
        'testimonial',
      ];
      const hasBodyElements = (slide.elements || []).some((e: any) =>
        TEXT_BEARING.includes(String(e.type || '')),
      );
      const cc =
        !hasBodyElements && slide.content && typeof slide.content === 'object' ? slide.content : {};
      arr(cc.kpis).forEach((k: any, i: number) =>
        push('kpi', `kpi${i}`, `${k.label ?? k.name ?? ''}: ${k.value ?? ''}`.trim()),
      );
      arr(cc.teamMembers).forEach((t: any, i: number) => {
        push('teamMember', `team${i}`, `${t.name ?? ''} — ${t.role ?? ''}`.trim());
        if (t.experience || t.responsibilities || t.bio)
          push('teamBio', `tbio${i}`, String(t.experience || t.responsibilities || t.bio));
      });
      arr(cc.pricingTiers).forEach((t: any, i: number) =>
        push('pricingTier', `tier${i}`, `${t.name ?? ''} ${t.price ?? ''}`.trim()),
      );
      arr(cc.competitors).forEach((cp: any, i: number) =>
        push('competitionRow', `comp${i}`, typeof cp === 'string' ? cp : `${cp.name ?? ''}`.trim()),
      );
      arr(cc.roadmapPhases).forEach((p: any, pi: number) => {
        push('roadmapMilestone', `ph${pi}`, `${p.phase ?? ''}`.trim());
        arr(p.milestones).forEach((m: string, mi: number) =>
          push('roadmapMilestone', `ph${pi}m${mi}`, String(m)),
        );
      });
      arr(cc.risks)
        .concat(arr(cc.riskItems))
        .forEach((r: any, i: number) =>
          push('risk', `risk${i}`, typeof r === 'string' ? r : `${r.title ?? r.risk ?? ''}`.trim()),
        );
      arr(cc.problems)
        .concat(arr(cc.problemPoints))
        .forEach((p: any, i: number) =>
          push(
            'problemPoint',
            `prob${i}`,
            typeof p === 'string' ? p : `${p.title ?? p.text ?? ''}`,
          ),
        );
      arr(cc.solutions)
        .concat(arr(cc.solutionFeatures))
        .concat(arr(cc.features))
        .forEach((s: any, i: number) =>
          push(
            'solutionFeature',
            `sol${i}`,
            typeof s === 'string' ? s : `${s.title ?? s.text ?? s.name ?? ''}`,
          ),
        );
      arr(cc.marketDrivers)
        .concat(arr(cc.drivers))
        .concat(arr(cc.marketSizing?.drivers))
        .forEach((dd: any, i: number) =>
          push(
            'marketDriver',
            `drv${i}`,
            typeof dd === 'string' ? dd : `${dd.title ?? dd.text ?? ''}`,
          ),
        );
      arr(cc.funding?.allocations)
        .concat(arr(cc.allocations))
        .forEach((a: any, i: number) =>
          push(
            'fundingAllocation',
            `fund${i}`,
            typeof a === 'string'
              ? a
              : `${a.category ?? ''}: ${a.percentage ?? a.amount ?? ''}`.trim(),
          ),
        );
      arr(cc.items).forEach((it: any, i: number) => {
        if (isAppendix || isContinuation)
          push(
            isAppendix ? 'appendixNode' : 'continuationNode',
            `it${i}`,
            typeof it === 'string' ? it : `${it.text ?? it.title ?? ''}`,
          );
      });

      if (slide.speakerNotes && String(slide.speakerNotes).trim())
        push('speakerNote', 'notes', String(slide.speakerNotes), {}, 'speaker_notes');
    }
    return nodes;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** PHASE 2 (import) + PHASE 3/4 (render with destinations). */
  async recordImport(deckId: string): Promise<number> {
    const slides = await this.prisma.slide.findMany({
      where: { deckId },
      orderBy: { order: 'asc' },
      include: { elements: { orderBy: { order: 'asc' } } },
    });
    const deckNodes = this.extractDeckNodes(slides);
    await this.ledger.resetDocument(deckId);
    if (!deckNodes.length) return 0;
    const created = await this.ledger.recordImport(
      deckNodes.map((n) => ({
        module: 'presentation',
        sourceDocumentId: deckId,
        sourceType: 'deck',
        sectionId: n.key,
        type: n.type,
        content: n.content,
        metadata: { ...n.metadata, destination: n.destination, needles: n.needles },
      })),
    );
    // Content is materialized onto slides/notes → mark rendered to its destination.
    const destinationByNodeId: Record<string, string> = {};
    created.forEach((node, i) => {
      destinationByNodeId[node.id] = deckNodes[i].destination;
    });
    await this.ledger.recordRender(deckId, {
      renderer: 'presentation-designer',
      template: 'deck',
      destinationByNodeId,
    });
    this.logger.log(
      `Content ledger: imported+rendered ${created.length} deck node(s) for ${deckId}`,
    );
    return created.length;
  }

  private async ensureImported(deckId: string) {
    const existing = await this.ledger.getNodes(deckId);
    if (!existing.length) await this.recordImport(deckId);
  }

  /** PHASE 5/6 — export then reopen by re-parsing the actual exported bytes. */
  async recordExportReopen(deckId: string, buffer: Buffer, format: string) {
    await this.ensureImported(deckId);
    const reopenText = await this.extractExportedText(buffer, format);
    if (!reopenText) {
      this.logger.warn(
        `Content ledger reopen skipped for ${deckId}: no text extracted from ${format}`,
      );
      return null;
    }
    await this.ledger.recordExport(deckId);
    const hay = norm(reopenText);
    const segments = segmentsOf(reopenText);
    const exported = (await this.ledger.getNodes(deckId)).filter((n) => n.exported);
    const presence = exported.map((n) => {
      // Placeholder titles for untitled slides are structural — never counted as
      // lost when absent from the export (they aren't authored content). Detect by
      // the stored flag OR the content pattern so pre-policy records reconcile too.
      if (n.metadata?.placeholder || (n.type === 'slideTitle' && isPlaceholderTitle(n.content)))
        return { id: n.id, type: n.type, present: true };
      const needles: string[] = (n.metadata?.needles || []).filter(
        (x: string) => x && x.length >= 2,
      );
      return {
        id: n.id,
        type: n.type,
        present: !needles.length || needles.every((nd) => phrasePresent(nd, hay, segments)),
      };
    });

    // The slide PDF exporter renders each slide as an IMAGE — the PDF carries no
    // extractable text layer, so a text re-parse cannot verify content. Detect
    // that case and skip (don't falsely report loss); PPTX is the text-based
    // certification path.
    const matchRate = presence.length
      ? presence.filter((p) => p.present).length / presence.length
      : 1;
    if (format === 'pdf' && matchRate < 0.15) {
      this.logger.warn(
        `Content ledger: PDF for ${deckId} is image-based (no text layer) — reopen not text-verifiable; exported nodes left verified-by-PPTX.`,
      );
      return { reopened: 0, mutated: 0, lost: 0, skipped: 'pdf_image_based' } as any;
    }

    const updates: ReopenResultUpdate[] = presence.map((p) =>
      p.present
        ? { id: p.id, reopened: true, mutated: false, lossReason: null }
        : { id: p.id, reopened: false, mutated: false, lossReason: this.lossReasonFor(p.type) },
    );
    const result = await this.ledger.applyReopenResults(updates);
    this.logger.log(
      `Content ledger reopen ${deckId} (${format}): reopened=${result.reopened} lost=${result.lost}`,
    );
    return result;
  }

  /** Re-parse exported bytes → text. PPTX: OOXML slide + notes <a:t>. PDF: pdf-parse. */
  async extractExportedText(buffer: Buffer, format: string): Promise<string> {
    try {
      if (format === 'pptx') {
        const zip = new AdmZip(buffer);
        const parts: string[] = [];
        for (const entry of zip.getEntries()) {
          const name = entry.entryName;
          if (/ppt\/(slides|notesSlides)\/.*\.xml$/.test(name)) {
            const xml = entry.getData().toString('utf8');
            const matches = xml.match(/<a:t>([\s\S]*?)<\/a:t>/g) || [];
            for (const m of matches) parts.push(m.replace(/<\/?a:t>/g, ''));
          }
        }
        // newline-separated so reopen matching can see per-run phrase boundaries
        return parts.join('\n');
      }
      if (format === 'pdf') {
        const parser = new PDFParse({ data: buffer });
        const data = await parser.getText();
        return String(data?.text || '');
      }
    } catch (error: any) {
      this.logger.warn(
        `Presentation text extraction failed for ${format}: ${error?.message || error}`,
      );
    }
    return '';
  }

  private lossReasonFor(type: string): string {
    const map: Record<string, string> = {
      kpi: 'kpi_missing',
      metric: 'metric_missing',
      teamMember: 'team_member_missing',
      teamBio: 'team_bio_missing',
      marketDriver: 'market_driver_missing',
      roadmapMilestone: 'roadmap_milestone_missing',
      risk: 'risk_missing',
      pricingTier: 'pricing_tier_missing',
      competitionRow: 'competition_row_missing',
      fundingAllocation: 'funding_allocation_missing',
      problemPoint: 'problem_point_missing',
      solutionFeature: 'solution_feature_missing',
      strategyPoint: 'strategy_point_missing',
      chart: 'chart_missing',
      chartLabel: 'chart_label_missing',
      chartSeries: 'chart_series_missing',
      slideTitle: 'slide_title_missing',
      slideSubtitle: 'slide_subtitle_missing',
      speakerNote: 'speaker_note_missing',
      appendixNode: 'appendix_node_missing',
      continuationNode: 'continuation_node_missing',
      overflowNode: 'overflow_node_missing',
    };
    return map[type] || 'node_missing';
  }
}
