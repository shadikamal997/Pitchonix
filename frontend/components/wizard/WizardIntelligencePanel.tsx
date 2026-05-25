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
    completeness.total >= 80 ? 'text-[#355846] bg-[#EEF5F1] border-[#DDE8E1]' :
    completeness.total >= 60 ? 'text-[#735008] bg-[#FAEEDB] border-[#F2DCAE]' :
    'text-[#7a2929] bg-[#FCF1F1] border-[#F7E3E3]';

  return (
    <div className="rounded-2xl border border-[#E3E1DA] bg-white shadow-sm overflow-hidden">
      <button onClick={() => setCollapsed((c) => !c)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#EDEBE6]">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl border px-3 py-1 text-sm font-bold ${scoreColor}`}>
            {completeness.total}<span className="text-xs font-medium opacity-70">/100</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-[#111111]">Business Information Completeness</div>
            <div className="text-xs text-[#9A9A9A]">{availableOpps.length} visual blocks available · {prediction.band}</div>
          </div>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-[#9A9A9A]" /> : <ChevronUp className="w-4 h-4 text-[#9A9A9A]" />}
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-4 border-t border-[#F1F0EC] pt-4">
          {/* Sub-scores */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <ScoreCell label="Required"   value={completeness.required} />
            <ScoreCell label="Structured" value={completeness.structured} />
            <ScoreCell label="Total"      value={completeness.total} />
          </div>

          {/* Predicted downstream scores */}
          <div className="rounded-lg bg-gradient-to-br from-slate-50 to-white border border-[#E3E1DA] p-3">
            <div className="text-xs font-semibold text-[#111111] flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#4F7563]" /> Predicted deck quality
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[#9A9A9A]">Structure Score</div>
                <div className="text-lg font-bold text-[#111111]">{prediction.expectedStructureScore.toFixed(0)} / 100</div>
              </div>
              <div>
                <div className="text-[#9A9A9A]">Narrative Score</div>
                <div className="text-lg font-bold text-[#111111]">{prediction.expectedNarrativeScore.toFixed(0)} / 100</div>
              </div>
            </div>
            {prediction.notes.length > 0 && (
              <ul className="text-xs text-[#6B6B6B] mt-2 list-disc pl-4 space-y-0.5">
                {prediction.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            )}
          </div>

          {/* Opportunities */}
          <div>
            <div className="text-xs font-semibold text-[#111111] flex items-center gap-1 mb-2">
              <Layers className="w-3.5 h-3.5 text-[#4F7563]" /> We can generate ({availableOpps.length})
            </div>
            <ul className="space-y-1">
              {availableOpps.map((o) => (
                <li key={o.kind} className="flex items-start gap-2 text-xs text-[#111111]">
                  <Check className="w-3.5 h-3.5 text-[#4F7563] mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium text-[#111111]">{o.label}</span>
                    {o.source && <span className="text-[#9A9A9A]"> · {o.source}</span>}
                  </span>
                </li>
              ))}
              {unavailableOpps.slice(0, 4).map((o) => (
                <li key={o.kind} className="flex items-start gap-2 text-xs text-[#C9C6BD]">
                  <X className="w-3.5 h-3.5 text-slate-300 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium">{o.label}</span>
                    {o.source && <span className="text-[#C9C6BD]"> · {o.source}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Readiness warnings */}
          {readiness.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#111111] flex items-center gap-1 mb-2">
                <Target className="w-3.5 h-3.5 text-[#8c6210]" /> Before you generate
              </div>
              <ul className="space-y-1">
                {readiness.map((iss, i) => (
                  <li key={i} className={`flex items-start gap-2 text-xs ${
                    iss.severity === 'error' ? 'text-[#7a2929]' :
                    iss.severity === 'warn'  ? 'text-[#735008]' : 'text-[#6B6B6B]'
                  }`}>
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="font-medium">{iss.message}</span>
                      {iss.hint && <span className="text-[#9A9A9A]"> — {iss.hint}</span>}
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
    value >= 80 ? 'bg-[#EEF5F1] border-[#DDE8E1] text-[#355846]' :
    value >= 60 ? 'bg-[#FAEEDB] border-[#F2DCAE] text-[#735008]' :
    'bg-[#FCF1F1] border-[#F7E3E3] text-[#7a2929]';
  return (
    <div className={`rounded-lg border px-3 py-2 ${tone}`}>
      <div className="text-[10px] font-semibold opacity-70 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold leading-none mt-1">{value}<span className="text-xs font-medium opacity-70">/100</span></div>
    </div>
  );
}
