import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 38.2I — Export Compatibility Report
//
//  Pre-export pass that scans a deck and flags anything PowerPoint won't
//  fully support after we emit OOXML. Surfaces the user-facing version of
//  the "this will be flattened" / "this won't render" callouts.
//
//  Categories:
//    - motionPath           → exported as native OOXML <p:animMotion>, but
//                              PowerPoint < 2016 falls back to entry effect
//    - paragraphAnimation   → exported via <p:pRg>; some renderers ignore
//    - smartArt (flat)      → we exported as grouped shapes, not live SmartArt
//    - oleObjects           → exported as image placeholders, not OLE
//    - chart kinds (waterfall/funnel) → exported as bar (downgraded)
//    - >12 animations/slide → PowerPoint UI struggles past ~12 per slide
//    - inline media         → audio/video sources need to be re-uploaded
// =============================================================================

export interface ExportCompatIssue {
  severity:   'info' | 'warning' | 'error';
  category:   string;
  slideId:    string;
  slideTitle: string;
  message:    string;
}

export interface ExportCompatReport {
  issues:        ExportCompatIssue[];
  summary:       Record<string, number>;
  /** Coarse 0..100 readiness score. */
  readiness:     number;
  /** Suggested action ("ready" / "review" / "remediate"). */
  recommendation: 'ready' | 'review' | 'remediate';
}

@Injectable()
export class ExportCompatReportService {
  constructor(private prisma: PrismaService) {}

  async run(deckId: string): Promise<ExportCompatReport> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: { slides: { include: { elements: true } } },
    });
    if (!deck) return emptyReport();

    const issues: ExportCompatIssue[] = [];

    for (const slide of deck.slides) {
      const title = slide.title || '(untitled)';
      const animTotal = (slide.elements || []).reduce(
        (n, el) => n + (Array.isArray(el.animations as any) ? (el.animations as any).length : 0),
        0,
      );
      if (animTotal > 12) {
        issues.push({
          severity: 'warning', category: 'animationDensity',
          slideId: slide.id, slideTitle: title,
          message: `${animTotal} animations on this slide may be hard to manage in PowerPoint UI.`,
        });
      }

      for (const el of slide.elements || []) {
        // motion path
        const list = (el.animations as any[]) || [];
        for (const a of list) {
          if (a?.class === 'path' && a?.motionPath) {
            issues.push({
              severity: 'info', category: 'motionPath',
              slideId: slide.id, slideTitle: title,
              message: 'Motion path will render natively in PowerPoint 2016+; older versions fall back to fade.',
            });
            break;
          }
        }

        // smartArt (flat)
        if (el.type === 'smartArt') {
          issues.push({
            severity: 'warning', category: 'smartArt',
            slideId: slide.id, slideTitle: title,
            message: 'SmartArt was imported as flat shapes — exported deck will look the same but not be live-editable as SmartArt.',
          });
        }
        // OLE objects
        if (el.type === 'oleObject') {
          issues.push({
            severity: 'warning', category: 'oleObject',
            slideId: slide.id, slideTitle: title,
            message: 'Embedded OLE object will be exported as a placeholder image — the original file stays in attachments.',
          });
        }
        // Chart kind downgrades
        if (el.type === 'chart') {
          const k = ((el.content as any)?.type || '').toLowerCase();
          if (k === 'waterfall' || k === 'funnel') {
            issues.push({
              severity: 'info', category: 'chartKind',
              slideId: slide.id, slideTitle: title,
              message: `Chart kind "${k}" will be exported as bar (PowerPoint OOXML has no native ${k}).`,
            });
          }
        }
        // Media src missing
        if ((el.type === 'videoPlaceholder' || el.type === 'embeddedMediaPlaceholder') && !(el.content as any)?.src) {
          issues.push({
            severity: 'info', category: 'media',
            slideId: slide.id, slideTitle: title,
            message: 'Video placeholder has no source set — will export as a static poster.',
          });
        }
      }
    }

    // Summary + readiness.
    const summary: Record<string, number> = {};
    for (const i of issues) summary[i.category] = (summary[i.category] || 0) + 1;
    const errorN = issues.filter((i) => i.severity === 'error').length;
    const warnN  = issues.filter((i) => i.severity === 'warning').length;
    const readiness = Math.max(0, 100 - errorN * 12 - warnN * 4 - issues.length * 0.5);

    const recommendation: ExportCompatReport['recommendation'] =
      errorN > 0           ? 'remediate' :
      readiness < 80       ? 'review'    :
                             'ready';

    return { issues, summary, readiness: Math.round(readiness), recommendation };
  }
}

function emptyReport(): ExportCompatReport {
  return { issues: [], summary: {}, readiness: 100, recommendation: 'ready' };
}
