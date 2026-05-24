'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, AlertTriangle, AlertCircle, Info, Loader2, RefreshCw,
  CheckCircle2, Wand2, ExternalLink,
} from 'lucide-react';
import api from '@/lib/api';
import { useBrandAudit } from './useBrandKits';
import type { AuditCategory, AuditIssue, AuditSeverity } from '@/types/brand-kit';

// =============================================================================
//  Phase 37O/P + 37.2D/E — BrandAuditPanel
//
//  Renders the brand compliance score + per-category breakdown + issues list,
//  with two new affordances delivered in Phase 37.2:
//    - 37.2D: click an issue to open the slide editor focused on that element
//             (`/editor/{slideId}?focus={elementId}`)
//    - 37.2E: a per-issue "Fix" button that calls the brand auto-fix endpoint
//             (`POST /brand-kits/{kitId}/autofix/{elementId}` with {category})
// =============================================================================

interface Props {
  deckId: string | null | undefined;
  /** Optional brand kit ID to scope auto-fix calls; falls back to report.brandKitId. */
  brandKitId?: string | null;
  /** When true, hides the run button + auto-runs on mount. */
  autoRun?: boolean;
}

const CATEGORY_LABEL: Record<AuditCategory, string> = {
  colors:     'Colors',
  typography: 'Typography',
  logos:      'Logos',
  charts:     'Charts',
  components: 'Components',
};

export const BrandAuditPanel: React.FC<Props> = ({ deckId, brandKitId, autoRun }) => {
  const { report, loading, error, refresh } = useBrandAudit(deckId);
  const router = useRouter();
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);

  const effectiveKitId = brandKitId ?? report?.brandKitId ?? null;

  const handleNavigate = (issue: AuditIssue) => {
    if (!deckId) return;
    const params = new URLSearchParams();
    if (issue.slideId)   params.set('slide', issue.slideId);
    if (issue.elementId) params.set('focus', issue.elementId);
    const qs = params.toString();
    router.push(qs ? `/editor/${deckId}?${qs}` : `/editor/${deckId}`);
  };

  const handleFix = async (issue: AuditIssue, key: string) => {
    if (!effectiveKitId || !issue.elementId) return;
    setFixingId(key);
    setFixError(null);
    try {
      await api.post(`/brand-kits/${effectiveKitId}/autofix/${issue.elementId}`, {
        category: issue.category,
      });
      await refresh();
    } catch (e: any) {
      setFixError(e?.response?.data?.message || e?.message || 'Auto-fix failed');
    } finally {
      setFixingId(null);
    }
  };

  if (!deckId) return <div className="text-xs text-slate-500 italic">No deck selected.</div>;
  if (loading && !report) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running brand audit…
      </div>
    );
  }
  if (error) return <div className="text-xs text-red-600">{error}</div>;
  if (!report) return null;

  return (
    <div className="space-y-4">
      {/* Score + run button */}
      <div className="flex items-center gap-3">
        <ScoreBadge score={report.score} />
        <div className="flex-1">
          <div className="text-xs font-bold text-slate-900">Brand compliance</div>
          <div className="text-[10px] text-slate-500">
            Generated {new Date(report.generatedAt).toLocaleTimeString()}
            {report.brandKitId ? ' · kit attached' : ' · no kit attached'}
          </div>
        </div>
        {!autoRun && (
          <button
            onClick={refresh}
            className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 rounded inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Re-run
          </button>
        )}
      </div>

      {/* Category bars */}
      <section className="space-y-1.5">
        {(Object.keys(report.categories) as AuditCategory[]).map((cat) => {
          const score = report.categories[cat];
          return (
            <div key={cat} className="flex items-center gap-2 text-xs">
              <div className="w-24 text-slate-600">{CATEGORY_LABEL[cat]}</div>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    score >= 80 ? 'bg-green-500' :
                    score >= 60 ? 'bg-amber-500' :
                                  'bg-red-500'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="w-10 text-right text-[11px] font-mono text-slate-700">{score}</div>
            </div>
          );
        })}
      </section>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <section>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Recommendations</div>
          <ul className="space-y-1">
            {report.recommendations.map((r, i) => (
              <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Issues */}
      <section>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          Issues ({report.issues.length})
        </div>
        {fixError && (
          <div className="text-[10px] text-red-600 mb-1">{fixError}</div>
        )}
        {report.issues.length === 0 ? (
          <div className="text-xs text-green-700 italic flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> No issues found.
          </div>
        ) : (
          <ul className="space-y-1 max-h-80 overflow-auto">
            {report.issues.slice(0, 50).map((it, i) => {
              const key = `${it.slideId || 'na'}-${it.elementId || 'na'}-${i}`;
              return (
                <IssueRow
                  key={key}
                  issue={it}
                  fixing={fixingId === key}
                  canFix={!!effectiveKitId && !!it.elementId && it.category !== 'components'}
                  canNavigate={!!it.slideId}
                  onFix={() => handleFix(it, key)}
                  onNavigate={() => handleNavigate(it)}
                />
              );
            })}
            {report.issues.length > 50 && (
              <li className="text-[10px] text-slate-400 italic">
                + {report.issues.length - 50} more
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
};

// =============================================================================
//  Helpers
// =============================================================================

const ScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  const cls = score >= 80
    ? 'bg-green-100 text-green-800 ring-green-300'
    : score >= 60
      ? 'bg-amber-100 text-amber-800 ring-amber-300'
      : 'bg-red-100 text-red-800 ring-red-300';
  return (
    <div className={`relative w-14 h-14 flex items-center justify-center rounded-full ring-2 ${cls}`}>
      <Shield className="absolute w-12 h-12 opacity-20" />
      <span className="text-base font-bold relative z-10">{score}</span>
    </div>
  );
};

const SEV_META: Record<AuditSeverity, { Icon: React.ComponentType<any>; cls: string }> = {
  info:    { Icon: Info,         cls: 'text-blue-600'  },
  warning: { Icon: AlertTriangle, cls: 'text-amber-600' },
  error:   { Icon: AlertCircle,  cls: 'text-red-600'   },
};

interface IssueRowProps {
  issue:       AuditIssue;
  fixing:      boolean;
  canFix:      boolean;
  canNavigate: boolean;
  onFix:       () => void;
  onNavigate:  () => void;
}

const IssueRow: React.FC<IssueRowProps> = ({ issue, fixing, canFix, canNavigate, onFix, onNavigate }) => {
  const { Icon, cls } = SEV_META[issue.severity];
  return (
    <li className="text-xs flex items-start gap-1.5 py-1 border-b border-slate-100 last:border-0">
      <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${cls}`} />
      <div className="flex-1 min-w-0">
        <div className="text-slate-800">{issue.message}</div>
        {issue.fixHint && <div className="text-[10px] text-slate-500 italic">→ {issue.fixHint}</div>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {canFix && (
          <button
            onClick={onFix}
            disabled={fixing}
            title="Auto-fix this issue"
            className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 inline-flex items-center gap-0.5"
          >
            {fixing
              ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
              : <Wand2 className="w-2.5 h-2.5" />}
            Fix
          </button>
        )}
        {canNavigate && (
          <button
            onClick={onNavigate}
            title="Open slide"
            className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center gap-0.5"
          >
            <ExternalLink className="w-2.5 h-2.5" /> Open
          </button>
        )}
      </div>
    </li>
  );
};
