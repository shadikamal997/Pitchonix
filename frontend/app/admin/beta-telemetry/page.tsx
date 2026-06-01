'use client';

/**
 * Phase Ω.4 — Admin Beta Telemetry Dashboard
 *
 * Route: /admin/beta-telemetry
 *
 * Displays:
 *  - Event summary table (total, failed, avg/p95 ms per event type)
 *  - Daily activity sparkline
 *  - Failure log (last 100 failures with context)
 *  - Slow requests (>3s, sorted by duration)
 *  - Beta feedback submissions
 *
 * Auth: admin-only (backend enforces via isPlatformAdmin check)
 */

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, Zap, BarChart3, MessageSquarePlus, Loader2,
} from 'lucide-react';
import api from '@/lib/api';

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

interface EventStat {
  total: number;
  failed: number;
  avgMs: number | null;
  p95Ms: number | null;
}

interface TelemetrySummary {
  since: string;
  total: number;
  byEvent: Record<string, EventStat>;
  daily: { day: string; n: number }[];
}

interface FailureRow {
  id: string;
  event: string;
  userId: string | null;
  durationMs: number | null;
  meta: any;
  createdAt: string;
}

interface FeedbackRow {
  id: string;
  userId: string;
  type: string;
  message: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function fmtMs(ms: number | null): string {
  if (ms == null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function successRate(stat: EventStat): string {
  if (!stat.total) return '—';
  return `${Math.round(((stat.total - stat.failed) / stat.total) * 100)}%`;
}

function eventBadge(event: string): string {
  if (event.includes('fail')) return 'bg-red-100 text-red-700';
  if (event.includes('start')) return 'bg-blue-100 text-blue-700';
  if (event.includes('done')) return 'bg-emerald-100 text-emerald-700';
  return 'bg-gray-100 text-gray-600';
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

export default function BetaTelemetryDashboard() {
  const [days,     setDays]     = useState(7);
  const [summary,  setSummary]  = useState<TelemetrySummary | null>(null);
  const [failures, setFailures] = useState<FailureRow[]>([]);
  const [slow,     setSlow]     = useState<FailureRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, f, sl, fb] = await Promise.all([
        api.get(`/career/admin/telemetry?days=${days}`),
        api.get('/career/admin/telemetry/failures'),
        api.get('/career/admin/telemetry/slow?threshold=2000'),
        api.get('/career/feedback'),
      ]);
      setSummary(s.data);
      setFailures(f.data);
      setSlow(sl.data);
      setFeedback(fb.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load telemetry');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const maxDaily = summary ? Math.max(...summary.daily.map(d => d.n), 1) : 1;

  return (
    <div className="min-h-screen bg-[#EDEBE6]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#D1CFC8]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/diagnostics" className="p-2 hover:bg-[#F1F0EC] rounded-lg">
              <ArrowLeft size={18} className="text-[#4A4A4A]" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[#1A1A1A]">Beta Telemetry</h1>
              <p className="text-xs text-[#6B6B6B]">Upload · Export · ATS · Job match events</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="text-sm border border-[#D1CFC8] rounded-lg px-3 py-1.5 bg-white text-[#1A1A1A]"
            >
              <option value={1}>Last 24h</option>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-[#3D6B4F] text-white rounded-lg hover:bg-[#2e5440] disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading && !summary && (
          <div className="flex items-center justify-center py-24 text-[#6B6B6B]">
            <Loader2 size={24} className="animate-spin mr-2" /> Loading telemetry…
          </div>
        )}

        {summary && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total events', value: summary.total, icon: <BarChart3 size={18} className="text-blue-600" /> },
                { label: 'Event types', value: Object.keys(summary.byEvent).length, icon: <TrendingUp size={18} className="text-purple-600" /> },
                { label: 'Failures', value: failures.length, icon: <AlertTriangle size={18} className="text-red-500" /> },
                { label: 'Slow requests', value: slow.length, icon: <Clock size={18} className="text-orange-500" /> },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-2xl p-5 border border-[#E3E1DA] shadow-sm">
                  <div className="flex items-center gap-2 mb-1">{card.icon}<span className="text-xs text-[#6B6B6B]">{card.label}</span></div>
                  <div className="text-3xl font-bold text-[#1A1A1A]">{card.value}</div>
                </div>
              ))}
            </div>

            {/* Daily sparkline */}
            {summary.daily.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E3E1DA] p-6">
                <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4">Daily activity ({days}d)</h2>
                <div className="flex items-end gap-1 h-20">
                  {summary.daily.map((d) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full bg-[#3D6B4F] rounded-sm opacity-80 hover:opacity-100 transition-opacity"
                        style={{ height: `${Math.round((d.n / maxDaily) * 100)}%`, minHeight: d.n ? 4 : 0 }}
                        title={`${d.day}: ${d.n} events`}
                      />
                      <span className="text-[9px] text-[#9A9A9A] hidden group-hover:block absolute -bottom-5 whitespace-nowrap">{d.day.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event breakdown table */}
            <div className="bg-white rounded-2xl border border-[#E3E1DA] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F1F0EC]">
                <h2 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
                  <Zap size={16} className="text-[#3D6B4F]" /> Event breakdown
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#F1F0EC] text-left text-xs text-[#6B6B6B]">
                      <th className="px-6 py-3">Event</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Failed</th>
                      <th className="px-4 py-3 text-right">Success %</th>
                      <th className="px-4 py-3 text-right">Avg</th>
                      <th className="px-4 py-3 text-right">p95</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.byEvent).sort(([, a], [, b]) => b.total - a.total).map(([event, stat]) => (
                      <tr key={event} className="border-b border-[#F7F6F2] hover:bg-[#FAFAF8]">
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono ${eventBadge(event)}`}>{event}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{stat.total}</td>
                        <td className="px-4 py-3 text-right text-red-600">{stat.failed || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={stat.failed ? 'text-orange-600' : 'text-emerald-600'}>{successRate(stat)}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-[#6B6B6B]">{fmtMs(stat.avgMs)}</td>
                        <td className="px-4 py-3 text-right text-[#6B6B6B]">{fmtMs(stat.p95Ms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Failures */}
        {failures.length > 0 && (
          <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F1F0EC] flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <h2 className="text-sm font-semibold text-[#1A1A1A]">Recent failures ({failures.length})</h2>
            </div>
            <div className="divide-y divide-[#F7F6F2]">
              {failures.slice(0, 20).map((f) => (
                <div key={f.id} className="px-6 py-3 flex items-start gap-3">
                  <span className={`mt-0.5 inline-flex px-2 py-0.5 rounded-full text-xs font-mono ${eventBadge(f.event)}`}>{f.event}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6B6B6B] truncate">{f.meta?.error || '—'}</p>
                    <p className="text-[10px] text-[#9A9A9A] mt-0.5">{new Date(f.createdAt).toLocaleString()} · user: {f.userId?.slice(0,8) ?? '—'}</p>
                  </div>
                  {f.durationMs != null && <span className="text-xs text-[#9A9A9A] shrink-0">{fmtMs(f.durationMs)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slow requests */}
        {slow.length > 0 && (
          <div className="bg-white rounded-2xl border border-orange-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F1F0EC] flex items-center gap-2">
              <Clock size={16} className="text-orange-500" />
              <h2 className="text-sm font-semibold text-[#1A1A1A]">Slow requests &gt;2s ({slow.length})</h2>
            </div>
            <div className="divide-y divide-[#F7F6F2]">
              {slow.slice(0, 20).map((s) => (
                <div key={s.id} className="px-6 py-3 flex items-center gap-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-mono ${eventBadge(s.event)}`}>{s.event}</span>
                  <span className="flex-1 text-xs text-[#6B6B6B]">{s.meta?.fmt ?? s.meta?.file ?? '—'}</span>
                  <span className="text-sm font-semibold text-orange-600">{fmtMs(s.durationMs)}</span>
                  <span className="text-[10px] text-[#9A9A9A]">{new Date(s.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Beta feedback */}
        {feedback.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E3E1DA] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F1F0EC] flex items-center gap-2">
              <MessageSquarePlus size={16} className="text-[#3D6B4F]" />
              <h2 className="text-sm font-semibold text-[#1A1A1A]">Beta feedback ({feedback.length})</h2>
            </div>
            <div className="divide-y divide-[#F7F6F2]">
              {feedback.slice(0, 30).map((f) => (
                <div key={f.id} className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[#EBF2EE] text-[#3D6B4F] font-medium">{f.type}</span>
                    <span className="text-[10px] text-[#9A9A9A]">{new Date(f.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-[#1A1A1A]">{f.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary && failures.length === 0 && slow.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <CheckCircle2 size={32} className="text-emerald-500" />
            <p className="text-sm font-medium text-[#1A1A1A]">No failures or slow requests in the last {days} days</p>
            <p className="text-xs text-[#6B6B6B]">All systems running smoothly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
