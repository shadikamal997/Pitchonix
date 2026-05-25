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

  if (!deckId) return <div className="text-xs text-[#9A9A9A] italic">No deck selected.</div>;
  if (loading && !report) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#9A9A9A]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running brand audit…
      </div>
    );
  }
  if (error) return <div className="text-xs text-[#9a3737]">{error}</div>;
  if (!report) return null;

  return (
    <div className="space-y-4">
      {/* Score + run button */}
      <div className="flex items-center gap-3">
        <ScoreBadge score={report.score} />
        <div className="flex-1">
          <div className="text-xs font-bold text-[#111111]">Brand compliance</div>
          <div className="text-[10px] text-[#9A9A9A]">
            Generated {new Date(report.generatedAt).toLocaleTimeString()}
            {report.brandKitId ? ' · kit attached' : ' · no kit attached'}
          </div>
        </div>
        {!autoRun && (
          <button
            onClick={refresh}
            className="px-2 py-1 text-[11px] font-semibold bg-[#F1F0EC] hover:bg-[#E3E1DA] rounded inline-flex items-center gap-1"
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
              <div className="w-24 text-[#6B6B6B]">{CATEGORY_LABEL[cat]}</div>
              <div className="flex-1 h-2 bg-[#F1F0EC] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    score >= 80 ? 'bg-[#4F7563]' :
                    score >= 60 ? 'bg-[#D9A441]' :
                                  'bg-[#D96A6A]'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="w-10 text-right text-[11px] font-mono text-[#111111]">{score}</div>
            </div>
          );
        })}
      </section>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <section>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-1">Recommendations</div>
          <ul className="space-y-1">
            {report.recommendations.map((r, i) => (
              <li key={i} className="text-xs text-[#111111] flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-[#4F7563] mt-0.5 flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Issues */}
      <section>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-1">
          Issues ({report.issues.length})
        </div>
        {fixError && (
          <div className="text-[10px] text-[#9a3737] mb-1">{fixError}</div>
        )}
        {report.issues.length === 0 ? (
          <div className="text-xs text-[#355846] italic flex items-center gap-1.5">
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
              <li className="text-[10px] text-[#C9C6BD] italic">
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
    ? 'bg-[#DDE8E1] text-green-800 ring-green-300'
    : score >= 60
      ? 'bg-[#F5E1B7] text-[#735008] ring-amber-300'
      : 'bg-[#F7E3E3] text-[#7a2929] ring-red-300';
  return (
    <div className={`relative w-14 h-14 flex items-center justify-center rounded-full ring-2 ${cls}`}>
      <Shield className="absolute w-12 h-12 opacity-20" />
      <span className="text-base font-bold relative z-10">{score}</span>
    </div>
  );
};

const SEV_META: Record<AuditSeverity, { Icon: React.ComponentType<any>; cls: string }> = {
  info:    { Icon: Info,         cls: 'text-[#4F7563]'  },
  warning: { Icon: AlertTriangle, cls: 'text-[#8c6210]' },
  error:   { Icon: AlertCircle,  cls: 'text-[#9a3737]'   },
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
    <li className="text-xs flex items-start gap-1.5 py-1 border-b border-[#F1F0EC] last:border-0">
      <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${cls}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[#111111]">{issue.message}</div>
        {issue.fixHint && <div className="text-[10px] text-[#9A9A9A] italic">→ {issue.fixHint}</div>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {canFix && (
          <button
            onClick={onFix}
            disabled={fixing}
            title="Auto-fix this issue"
            className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#EEF5F1] text-[#355846] hover:bg-[#DDE8E1] disabled:opacity-50 inline-flex items-center gap-0.5"
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
            className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#F1F0EC] text-[#111111] hover:bg-[#E3E1DA] inline-flex items-center gap-0.5"
          >
            <ExternalLink className="w-2.5 h-2.5" /> Open
          </button>
        )}
      </div>
    </li>
  );
};
