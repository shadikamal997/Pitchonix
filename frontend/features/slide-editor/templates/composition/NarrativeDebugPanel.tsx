'use client';

import React, { useState } from 'react';
import type { DeckPlan, DeckSlideContext } from './deck-context';

// =============================================================================
//  Phase 26.5 — Narrative Debug Panel
//
//  Dev-only collapsible overlay that surfaces what the deck-level analyzers
//  decided for the current slide.
//
//  Shows:
//    - Narrative score 0–100
//    - Narrative type + story structure
//    - Current slide role + pacing beat + chosen intent
//    - Fatigue / density warnings
//    - Validation issues
//
//  Hidden in production builds.
// =============================================================================

interface Props {
  plan:            DeckPlan;
  currentContext?: DeckSlideContext;
  /** Layout intent the scorer actually chose for the current slide. Optional;
   *  if omitted we fall back to the content-recommended intent. */
  chosenIntent?:   string;
  /** Phase 26.6 — false until every slide's elements are loaded. When false,
   *  the panel shows "loading" instead of misleading partial scores. */
  ready?:          boolean;
}

export const NarrativeDebugPanel: React.FC<Props> = ({ plan, currentContext, chosenIntent, ready = true }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (process.env.NODE_ENV === 'production') return null;
  if (plan.slides.length === 0) return null;

  if (!ready) {
    return (
      <div
        style={{
          position: 'fixed', bottom: 12, right: 12, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.96)', color: '#cbd5e1',
          borderRadius: 8, padding: '6px 10px',
          fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11,
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 99, background: '#64748b', marginRight: 8 }} />
        Narrative · loading deck…
      </div>
    );
  }

  const score = plan.quality.total;
  const scoreColor =
    score >= 80 ? '#16a34a' :
    score >= 60 ? '#ca8a04' :
    score >= 40 ? '#ea580c' :
    '#dc2626';

  return (
    <div
      style={{
        position:     'fixed',
        bottom:       12,
        right:        12,
        zIndex:       9999,
        background:   'rgba(15, 23, 42, 0.96)',
        color:        '#f1f5f9',
        borderRadius: 8,
        padding:      collapsed ? '6px 10px' : 12,
        fontFamily:   'ui-monospace, Menlo, monospace',
        fontSize:     11,
        lineHeight:   1.5,
        maxWidth:     360,
        boxShadow:    '0 10px 30px rgba(0,0,0,0.35)',
        border:       '1px solid rgba(255,255,255,0.12)',
        pointerEvents:'auto',
      }}
    >
      <div
        onClick={() => setCollapsed((c) => !c)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 700,
          letterSpacing: 1,
          fontSize: 10,
          textTransform: 'uppercase',
          color: '#cbd5e1',
        }}
      >
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 99, background: scoreColor }} />
        Narrative · {score.toFixed(0)} / 100
        <span style={{ marginLeft: 'auto', opacity: 0.6 }}>{collapsed ? '▸' : '▾'}</span>
      </div>

      {!collapsed && (
        <div style={{ marginTop: 8 }}>
          <Row label="Type"      value={plan.profile.narrativeType} />
          <Row label="Structure" value={plan.profile.storyStructure} />
          <Row label="Slides"    value={String(plan.profile.nodes.length)} />
          <Row label="Family"    value={plan.familyStyle.voice} />

          {currentContext && (
            <>
              <Divider />
              <Row label="Current"  value={`#${currentContext.index + 1} · ${currentContext.node.role}`} />
              <Row label="Beat"     value={currentContext.pacing.beat} />
              <Row label="Intent"   value={chosenIntent || currentContext.node.profile.recommendedLayoutIntent} />
              <Row label="Density"  value={`${currentContext.node.density.toFixed(0)} (${currentContext.density.targetTier})`} />
              <Row label="Fatigue"  value={`${currentContext.fatigue.fatigueScore.toFixed(0)}`} />
              {currentContext.transition.isSectionBoundary && (
                <Row label="Transition" value={currentContext.transition.recommendedStyle} />
              )}
              {currentContext.fatigue.reasons.length > 0 && (
                <div style={{ marginTop: 4, color: '#fbbf24' }}>
                  ⚠ {currentContext.fatigue.reasons.join(' · ')}
                </div>
              )}
              {currentContext.pacing.reason && (
                <div style={{ marginTop: 4, color: '#a78bfa' }}>
                  ↻ {currentContext.pacing.reason}
                </div>
              )}
            </>
          )}

          <Divider />
          <Row label="Pacing"     value={plan.quality.pacingScore.toFixed(0)} />
          <Row label="Density"    value={plan.quality.densityBalanceScore.toFixed(0)} />
          <Row label="Diversity"  value={plan.quality.visualDiversityScore.toFixed(0)} />
          <Row label="Progress"   value={plan.quality.progressionScore.toFixed(0)} />
          <Row label="Repetition" value={plan.quality.repetitionScore.toFixed(0)} />
          <Row label="Flow"       value={plan.quality.informationFlowScore.toFixed(0)} />
          <Row label="Investor"   value={plan.quality.investorReadinessScore.toFixed(0)} />

          {plan.validation.summary.error + plan.validation.summary.warn > 0 && (
            <>
              <Divider />
              <div style={{ color: '#fca5a5', fontWeight: 700, marginBottom: 4 }}>
                Issues · {plan.validation.summary.error}✕ {plan.validation.summary.warn}⚠
              </div>
              <div style={{ maxHeight: 100, overflowY: 'auto' }}>
                {plan.validation.issues.slice(0, 8).map((iss, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 10,
                      color: iss.severity === 'error' ? '#fca5a5' :
                             iss.severity === 'warn'  ? '#fbbf24' : '#94a3b8',
                      marginBottom: 2,
                    }}
                  >
                    {iss.severity === 'error' ? '✕' : iss.severity === 'warn' ? '⚠' : 'ℹ'} {iss.message}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 8 }}>
    <span style={{ color: '#94a3b8', minWidth: 80 }}>{label}</span>
    <span style={{ color: '#f1f5f9' }}>{value}</span>
  </div>
);

const Divider: React.FC = () => (
  <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />
);
