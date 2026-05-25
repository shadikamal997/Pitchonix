// =============================================================================
//  Phase 42.8 — CV Import Final Polish helpers.
//
//  Adds three orthogonal concerns on top of Phase 42.7:
//
//    ImportProgressTracker      in-memory job-id → progress state
//    detectOcrLanguages()       cheap language sniff for tesseract pack pick
//    ImportEvent                shape persisted into CvAnalysisSnapshot
//                               (kind='import') for analytics + history
// =============================================================================

import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';

// -----------------------------------------------------------------------------
//  Progress state — shape returned by GET /career/profile/.../import/progress
// -----------------------------------------------------------------------------
export interface ImportProgress {
  jobId:         string;
  phase:         'queued' | 'extracting' | 'rendering' | 'ocr-page' | 'classifying' | 'persisting' | 'done' | 'failed' | 'cancelled';
  message:       string;
  percent:       number;        // 0..100
  page?:         number;        // current OCR page
  pagesTotal?:   number;
  startedAt:     number;
  updatedAt:     number;
  cancelled:     boolean;
  // Populated when phase === 'done'.
  result?:       any;
  error?:        string;
}

@Injectable()
export class ImportProgressTracker {
  private jobs = new Map<string, ImportProgress>();
  // Optional callback fired on every update (used by tests).
  newJob(clientId?: string): ImportProgress {
    const id = clientId || randomUUID();
    // If the client supplied an id we already have, just return the existing
    // entry (avoids clobbering the progress state on a retry).
    const existing = this.jobs.get(id);
    if (existing) return existing;
    const j: ImportProgress = {
      jobId:     id,
      phase:     'queued',
      message:   'Queued',
      percent:   0,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      cancelled: false,
    };
    this.jobs.set(j.jobId, j);
    // Self-evict after 30 minutes to bound memory.
    setTimeout(() => this.jobs.delete(j.jobId), 30 * 60_000);
    return j;
  }
  update(jobId: string, patch: Partial<ImportProgress>): void {
    const cur = this.jobs.get(jobId); if (!cur) return;
    Object.assign(cur, patch, { updatedAt: Date.now() });
  }
  get(jobId: string): ImportProgress | null { return this.jobs.get(jobId) || null; }
  cancel(jobId: string): boolean {
    const cur = this.jobs.get(jobId); if (!cur) return false;
    cur.cancelled = true;
    cur.phase = 'cancelled';
    cur.message = 'Cancelled by user';
    cur.updatedAt = Date.now();
    return true;
  }
  isCancelled(jobId: string): boolean {
    return !!this.jobs.get(jobId)?.cancelled;
  }
}

// -----------------------------------------------------------------------------
//  42.8B — Language detection for OCR pack picking.
//
//  Pure rule-based — no external API. Looks at the extracted (or partially-
//  extracted) text and counts code-point ranges. Returns an ordered list of
//  tesseract language codes the OCR call should load. Always falls back to
//  English when no signal is strong enough.
// -----------------------------------------------------------------------------
export function detectOcrLanguages(sample: string): string[] {
  if (!sample) return ['eng'];
  const s = sample.slice(0, 5000);  // cap the work
  const len = s.length;
  if (len === 0) return ['eng'];

  let arabic = 0, accented = 0, ascii = 0;
  for (let i = 0; i < len; i++) {
    const c = s.charCodeAt(i);
    if      (c >= 0x0600 && c <= 0x06FF) arabic++;       // Arabic block
    else if (c >= 0x00C0 && c <= 0x024F) accented++;     // Latin Extended A/B
    else if (c >= 0x0041 && c <= 0x007A) ascii++;        // ASCII letters
  }
  // Arabic dominates.
  if (arabic / len > 0.10) return ['ara', 'eng'];

  // Try to disambiguate Latin languages by stop-word presence.
  const t = s.toLowerCase();
  const sw = {
    fra: /\b(le|la|les|une?|des|du|et|pour|dans|avec|sur|avoir|être|de)\b/g,
    deu: /\b(der|die|das|und|für|mit|auf|von|nicht|sein|werden|ein)\b/g,
    spa: /\b(el|la|los|las|y|para|con|en|de|por|una?|que)\b/g,
    ron: /\b(și|sau|pentru|cu|de|în|pe|este|sunt|am|ai|are)\b/g,
    ita: /\b(il|la|gli|le|e|per|con|in|di|da|che|sono)\b/g,
    nld: /\b(de|het|en|voor|met|op|van|zijn|hebben|niet|een)\b/g,
    por: /\b(o|a|os|as|e|para|com|em|de|que|é|são)\b/g,
    eng: /\b(the|and|of|to|in|for|on|with|is|are|be)\b/g,
  };
  const scores: Array<[string, number]> = Object.entries(sw).map(([lang, re]) => {
    const m = t.match(re);
    return [lang, m ? m.length : 0];
  });
  scores.sort((a, b) => b[1] - a[1]);
  const top = scores[0][1];
  if (top < 3) return ['eng'];
  // Always include 'eng' as a safety fallback (numbers, brand names, etc.)
  const picked = [scores[0][0]];
  if (!picked.includes('eng')) picked.push('eng');
  return picked;
}

// -----------------------------------------------------------------------------
//  42.8C + 42.8G — analytics / history event shape.
//
//  Persisted as CvAnalysisSnapshot.analysisJson with kind='import'. The
//  admin dashboard aggregates over these rows.
// -----------------------------------------------------------------------------
export interface ImportEvent {
  filename:           string;
  mimetype?:          string;
  bytes:              number;
  durationMs:         number;
  ocrUsed:            boolean;
  ocrLangsUsed?:      string[];
  ocrAvgConfidence?:  number | null;
  confidenceOverall:  number;
  confidenceBand:     string;
  detected:           string[];
  missing:            string[];
  counts:             Record<string, number>;
  unknownHeadings:    string[];
  duplicatesCount:    { skills: number; experience: number };
  warnings:           string[];
  appliedAutoMappings: string[];   // sourceHeading keys auto-applied this run
  failed:             boolean;
}
