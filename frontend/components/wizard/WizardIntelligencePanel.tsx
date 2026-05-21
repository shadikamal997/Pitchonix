'use client';

import React, { useMemo, useState } from 'react';
import { Check, X, AlertTriangle, ChevronDown, ChevronUp, Sparkles, Target, Layers } from 'lucide-react';
import {
  computeCompleteness,
  detectOpportunities,
  runReadinessChecks,
  predictDocumentQuality,
  type WizardCompleteness,
} from '@/lib/wizard-intelligence';

interface Props {
  data: WizardCompleteness;
}

/**
 * Phase 28F + 28G + 28H + 28I
 *
 * Live floating panel attached to the wizard. Shows:
 *   - Completeness score (28F)
 *   - Opportunities (28G)
 *   - Predicted scores (28H)
 *   - Readiness warnings (28I)
 *
 * Purely client-side. No network, no AI.
 */
export default function WizardIntelligencePanel({ data }: Props) {
  const completeness = useMemo(() => computeCompleteness(data), [data]);
  const opportunities = useMemo(() => detectOpportunities(data), [data]);
  const readiness    = useMemo(() => runReadinessChecks(data), [data]);
  const prediction   = useMemo(() => predictDocumentQuality(data), [data]);

  const [collapsed, setCollapsed] = useState(false);

  const availableOpps   = opportunities.filter((o) => o.available);
  const unavailableOpps = opportunities.filter((o) => !o.available);

  const scoreColor =
    completeness.total >= 80 ? 'text-green-700 bg-green-50 border-green-200' :
    completeness.total >= 60 ? 'text-amber-700 bg-amber-50 border-amber-200' :
    'text-red-700 bg-red-50 border-red-200';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button onClick={() => setCollapsed((c) => !c)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl border px-3 py-1 text-sm font-bold ${scoreColor}`}>
            {completeness.total}<span className="text-xs font-medium opacity-70">/100</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Business Information Completeness</div>
            <div className="text-xs text-slate-500">{availableOpps.length} visual blocks available · {prediction.band}</div>
          </div>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />}
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          {/* Sub-scores */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <ScoreCell label="Required"   value={completeness.required} />
            <ScoreCell label="Structured" value={completeness.structured} />
            <ScoreCell label="Total"      value={completeness.total} />
          </div>

          {/* Predicted downstream scores */}
          <div className="rounded-lg bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-3">
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-green-600" /> Predicted deck quality
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-500">Structure Score</div>
                <div className="text-lg font-bold text-slate-900">{prediction.expectedStructureScore.toFixed(0)} / 100</div>
              </div>
              <div>
                <div className="text-slate-500">Narrative Score</div>
                <div className="text-lg font-bold text-slate-900">{prediction.expectedNarrativeScore.toFixed(0)} / 100</div>
              </div>
            </div>
            {prediction.notes.length > 0 && (
              <ul className="text-xs text-slate-600 mt-2 list-disc pl-4 space-y-0.5">
                {prediction.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            )}
          </div>

          {/* Opportunities */}
          <div>
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-2">
              <Layers className="w-3.5 h-3.5 text-green-600" /> We can generate ({availableOpps.length})
            </div>
            <ul className="space-y-1">
              {availableOpps.map((o) => (
                <li key={o.kind} className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium text-slate-900">{o.label}</span>
                    {o.source && <span className="text-slate-500"> · {o.source}</span>}
                  </span>
                </li>
              ))}
              {unavailableOpps.slice(0, 4).map((o) => (
                <li key={o.kind} className="flex items-start gap-2 text-xs text-slate-400">
                  <X className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium">{o.label}</span>
                    {o.source && <span className="text-slate-400"> · {o.source}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Readiness warnings */}
          {readiness.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-2">
                <Target className="w-3.5 h-3.5 text-amber-600" /> Before you generate
              </div>
              <ul className="space-y-1">
                {readiness.map((iss, i) => (
                  <li key={i} className={`flex items-start gap-2 text-xs ${
                    iss.severity === 'error' ? 'text-red-700' :
                    iss.severity === 'warn'  ? 'text-amber-700' : 'text-slate-600'
                  }`}>
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="font-medium">{iss.message}</span>
                      {iss.hint && <span className="text-slate-500"> — {iss.hint}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 80 ? 'bg-green-50 border-green-200 text-green-700' :
    value >= 60 ? 'bg-amber-50 border-amber-200 text-amber-700' :
    'bg-red-50 border-red-200 text-red-700';
  return (
    <div className={`rounded-lg border px-3 py-2 ${tone}`}>
      <div className="text-[10px] font-semibold opacity-70 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold leading-none mt-1">{value}<span className="text-xs font-medium opacity-70">/100</span></div>
    </div>
  );
}
