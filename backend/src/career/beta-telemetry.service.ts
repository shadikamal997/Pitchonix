import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase Ω.4 — BetaTelemetryService.
//
//  Fire-and-forget structured event tracking for the public beta.
//  All calls are non-blocking (void return, errors swallowed) so a telemetry
//  failure never impacts the user request.
//
//  Events tracked:
//    upload_start / upload_done / upload_fail
//    export_start / export_done / export_fail
//    ats_analyze  / ats_fail
//    job_match    / job_match_fail
//    template_switch
//    ocr_start / ocr_done / ocr_fail
// =============================================================================

export type TelemetryEvent =
  | 'upload_start' | 'upload_done' | 'upload_fail'
  | 'export_start' | 'export_done' | 'export_fail'
  | 'ats_analyze'  | 'ats_fail'
  | 'job_match'    | 'job_match_fail'
  | 'template_switch'
  | 'profile_repair'
  | 'ocr_start'    | 'ocr_done'    | 'ocr_fail';

export interface TelemetryPayload {
  userId?:     string;
  durationMs?: number;
  success?:    boolean;
  meta?:       Record<string, any>;
}

@Injectable()
export class BetaTelemetryService {
  private readonly logger = new Logger(BetaTelemetryService.name);

  constructor(private readonly prisma: PrismaService) {}

  track(event: TelemetryEvent, payload: TelemetryPayload = {}): void {
    const { userId, durationMs, success = true, meta } = payload;
    // Fire-and-forget: never await, never throw
    this.prisma.betaTelemetry.create({
      data: { event, userId: userId ?? null, durationMs: durationMs ?? null, success, meta: meta ?? null },
    }).catch((e) => {
      this.logger.warn(`[TELEMETRY] failed to record "${event}": ${e?.message}`);
    });
  }

  // ---------------------------------------------------------------------------
  //  Admin aggregation (last N days, grouped by event)
  // ---------------------------------------------------------------------------

  async summary(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60_000);
    const rows = await this.prisma.betaTelemetry.findMany({
      where: { createdAt: { gte: since } },
      select: { event: true, success: true, durationMs: true, createdAt: true },
    });

    const byEvent: Record<string, { total: number; failed: number; avgMs: number | null; p95Ms: number | null }> = {};
    const grouped: Record<string, { durations: number[]; total: number; failed: number }> = {};

    for (const r of rows) {
      if (!grouped[r.event]) grouped[r.event] = { durations: [], total: 0, failed: 0 };
      grouped[r.event].total++;
      if (!r.success) grouped[r.event].failed++;
      if (r.durationMs != null) grouped[r.event].durations.push(r.durationMs);
    }

    for (const [ev, g] of Object.entries(grouped)) {
      const sorted = [...g.durations].sort((a, b) => a - b);
      byEvent[ev] = {
        total:   g.total,
        failed:  g.failed,
        avgMs:   sorted.length ? Math.round(sorted.reduce((s, n) => s + n, 0) / sorted.length) : null,
        p95Ms:   sorted.length ? sorted[Math.floor(sorted.length * 0.95)] ?? null : null,
      };
    }

    // Daily totals for the sparkline
    const dailyMap: Record<string, number> = {};
    for (const r of rows) {
      const day = r.createdAt.toISOString().slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    }
    const daily = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).map(([day, n]) => ({ day, n }));

    return { since: since.toISOString(), total: rows.length, byEvent, daily };
  }

  async slowRequests(thresholdMs = 3000, limit = 50) {
    return this.prisma.betaTelemetry.findMany({
      where: { durationMs: { gte: thresholdMs } },
      orderBy: { durationMs: 'desc' },
      take: limit,
      select: { id: true, event: true, userId: true, durationMs: true, success: true, meta: true, createdAt: true },
    });
  }

  async failures(limit = 100) {
    return this.prisma.betaTelemetry.findMany({
      where: { success: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, event: true, userId: true, durationMs: true, meta: true, createdAt: true },
    });
  }
}
