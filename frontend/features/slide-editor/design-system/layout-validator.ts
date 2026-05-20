// =============================================================================
//  Runtime layout validator — checks at render time:
//    - elements within slide bounds
//    - no two SLOT-managed elements overlap (geometry check)
//    - elements respect safe area
//    - empty cards detected
//
//  This complements the static `composition/overlap-validator.ts` which checks
//  slot DEFINITIONS at module load. The runtime validator checks ACTUAL
//  positioned elements after slot matching (since elements can be free-positioned
//  too).
// =============================================================================

import type { SlideElementDTO } from '@/types/slide-element';
import { SAFE_AREA } from './tokens';

export interface ValidationIssue {
  kind:        'overlap' | 'out-of-bounds' | 'safe-area' | 'empty-card' | 'collision';
  elementId:   string;
  message:     string;
}

interface PositionedElement {
  id:    string;
  type:  string;
  x: number; y: number; w: number; h: number;
  content?: any;
}

export function validateSlideLayout(positioned: PositionedElement[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const el of positioned) {
    // Out-of-bounds
    if (el.x < 0 || el.y < 0 || el.x + el.w > 100 || el.y + el.h > 100) {
      issues.push({
        kind: 'out-of-bounds',
        elementId: el.id,
        message: `Element extends outside slide bounds (x:${el.x.toFixed(1)} y:${el.y.toFixed(1)} ${el.w.toFixed(1)}×${el.h.toFixed(1)})`,
      });
    }

    // Safe-area violation (only for content elements, not chrome)
    const isChrome = el.type === 'footer' || el.type === 'pageNumber' || el.type === 'logo';
    if (!isChrome) {
      if (el.y < SAFE_AREA.top - 0.5) {
        issues.push({
          kind: 'safe-area',
          elementId: el.id,
          message: `Content element above the top safe area (y:${el.y.toFixed(1)} < ${SAFE_AREA.top})`,
        });
      }
      if (el.y + el.h > 100 - SAFE_AREA.bottom + 0.5) {
        issues.push({
          kind: 'safe-area',
          elementId: el.id,
          message: `Content element below the bottom safe area (y+h:${(el.y + el.h).toFixed(1)} > ${100 - SAFE_AREA.bottom})`,
        });
      }
    }

    // Empty card detection — composite elements with empty content
    if (isEmptyComposite(el)) {
      issues.push({
        kind: 'empty-card',
        elementId: el.id,
        message: `${el.type} element has no content — would render as an empty card`,
      });
    }
  }

  // Pairwise overlap (with 0.5% margin)
  for (let i = 0; i < positioned.length; i++) {
    for (let j = i + 1; j < positioned.length; j++) {
      const a = positioned[i], b = positioned[j];
      // Allow decorative elements to overlap content
      const isDecorA = ['shape', 'line', 'divider'].includes(a.type);
      const isDecorB = ['shape', 'line', 'divider'].includes(b.type);
      if (isDecorA || isDecorB) continue;
      const margin = 0.5;
      const xOverlap = Math.max(0, Math.min(a.x + a.w + margin, b.x + b.w + margin) - Math.max(a.x - margin, b.x - margin));
      const yOverlap = Math.max(0, Math.min(a.y + a.h + margin, b.y + b.h + margin) - Math.max(a.y - margin, b.y - margin));
      if (xOverlap > 0 && yOverlap > 0) {
        const area = xOverlap * yOverlap;
        if (area > 1) { // ignore tiny touches
          issues.push({
            kind: 'overlap',
            elementId: a.id,
            message: `${a.type} overlaps ${b.type} (${area.toFixed(1)} % collision area)`,
          });
        }
      }
    }
  }

  return issues;
}

function isEmptyComposite(el: PositionedElement): boolean {
  const c = el.content || {};
  switch (el.type) {
    case 'teamCard':     return !Array.isArray(c.members)  || c.members.length === 0;
    case 'pricingCard':  return !Array.isArray(c.tiers)    || c.tiers.length === 0;
    case 'comparison':   return !Array.isArray(c.rows)     || c.rows.length === 0;
    case 'featureGrid':  return !Array.isArray(c.items)    || c.items.length === 0;
    case 'processSteps': return !Array.isArray(c.steps)    || c.steps.length === 0;
    case 'timeline':     return !Array.isArray(c.items)    || c.items.length === 0;
    case 'roadmap':      return !Array.isArray(c.phases)   || c.phases.length === 0;
    case 'swot':         return !(c.strengths?.length || c.weaknesses?.length || c.opportunities?.length || c.threats?.length);
    case 'chart':        return !Array.isArray(c.series)   || c.series.length === 0;
    case 'table':        return !Array.isArray(c.rows)     || c.rows.length === 0;
    case 'bulletList':
    case 'numberedList': return !Array.isArray(c.items)    || c.items.length === 0;
    default: return false;
  }
}
