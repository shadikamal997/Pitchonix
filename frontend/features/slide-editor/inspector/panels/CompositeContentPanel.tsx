'use client';

import React from 'react';
import { Plus, Trash2, MoveUp, MoveDown, Star } from 'lucide-react';
import { PanelSection, Row, TextField, NumberField } from '../Primitives';
import type { SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  CompositeContentPanel — inline editors for the 9 composite element types
//  (testimonial, teamCard, pricingCard, comparison, swot, featureGrid,
//  processSteps, timeline, roadmap) plus the two media placeholders.
//
//  Each editor mutates content directly and calls onPatch({ content }).
// =============================================================================

interface Props {
  element: SlideElementDTO;
  onPatch: (patch: Partial<SlideElementDTO>) => void;
}

export const CompositeContentPanel: React.FC<Props> = ({ element, onPatch }) => {
  switch (element.type) {
    case 'testimonial':              return <TestimonialEdit element={element} onPatch={onPatch} />;
    case 'teamCard':                 return <TeamEdit element={element} onPatch={onPatch} />;
    case 'pricingCard':              return <PricingEdit element={element} onPatch={onPatch} />;
    case 'comparison':               return <ComparisonEdit element={element} onPatch={onPatch} />;
    case 'swot':                     return <SwotEdit element={element} onPatch={onPatch} />;
    case 'featureGrid':              return <FeatureGridEdit element={element} onPatch={onPatch} />;
    case 'processSteps':             return <ProcessStepsEdit element={element} onPatch={onPatch} />;
    case 'timeline':                 return <TimelineEdit element={element} onPatch={onPatch} />;
    case 'roadmap':                  return <RoadmapEdit element={element} onPatch={onPatch} />;
    case 'videoPlaceholder':         return <VideoPlaceholderEdit element={element} onPatch={onPatch} />;
    case 'embeddedMediaPlaceholder': return <EmbedPlaceholderEdit element={element} onPatch={onPatch} />;
    default:                         return null;
  }
};

// =============================================================================
//  Generic list helpers
// =============================================================================

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const SmallIconButton: React.FC<React.PropsWithChildren<{ onClick: () => void; title: string; disabled?: boolean; danger?: boolean }>> = ({ onClick, title, children, disabled, danger }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`w-6 h-6 flex items-center justify-center rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
      danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
    }`}
  >
    {children}
  </button>
);

const ItemHeader: React.FC<{
  index: number;
  total: number;
  label: string;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}> = ({ index, total, label, onUp, onDown, onRemove }) => (
  <div className="flex items-center justify-between mb-1.5">
    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{label} {index + 1}</span>
    <div className="flex items-center gap-0.5">
      <SmallIconButton title="Move up"   onClick={onUp}   disabled={index === 0}><MoveUp className="w-3 h-3" /></SmallIconButton>
      <SmallIconButton title="Move down" onClick={onDown} disabled={index === total - 1}><MoveDown className="w-3 h-3" /></SmallIconButton>
      <SmallIconButton title="Remove"    onClick={onRemove} danger><Trash2 className="w-3 h-3" /></SmallIconButton>
    </div>
  </div>
);

const AddButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full h-7 mt-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-dashed border-green-300 rounded"
  >
    <Plus className="w-3 h-3" />
    {label}
  </button>
);

// =============================================================================
//  Testimonial
// =============================================================================

const TestimonialEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  const set = (patch: any) => onPatch({ content: { ...c, ...patch } });
  return (
    <PanelSection title="Testimonial">
      <Row label="Quote">
        <textarea
          value={c.quote || ''}
          onChange={(e) => set({ quote: e.target.value })}
          rows={4}
          placeholder="What your customer said…"
          className="flex-1 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:bg-white resize-none"
        />
      </Row>
      <Row label="Author"><TextField value={c.author} onChange={(v) => set({ author: v })} placeholder="Name" /></Row>
      <Row label="Role">  <TextField value={c.role}   onChange={(v) => set({ role: v })}   placeholder="Title" /></Row>
      <Row label="Company"><TextField value={c.company} onChange={(v) => set({ company: v })} placeholder="Company" /></Row>
      <Row label="Avatar"><TextField value={c.avatarUrl} onChange={(v) => set({ avatarUrl: v })} placeholder="https://…" /></Row>
    </PanelSection>
  );
};

// =============================================================================
//  Team card
// =============================================================================

const TeamEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  const members: any[] = c.members || [];
  const setMembers = (next: any[]) => onPatch({ content: { ...c, members: next } });
  return (
    <PanelSection title={`Team · ${members.length}`}>
      {members.map((m, i) => (
        <div key={m.id || i} className="rounded border border-slate-200 bg-white p-2 space-y-1">
          <ItemHeader
            index={i} total={members.length} label="Member"
            onUp={() => setMembers(arrayMove(members, i, i - 1))}
            onDown={() => setMembers(arrayMove(members, i, i + 1))}
            onRemove={() => setMembers(members.filter((_, j) => j !== i))}
          />
          <Row label="Name"> <TextField value={m.name}     onChange={(v) => setMembers(members.map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="Full name" /></Row>
          <Row label="Role"> <TextField value={m.role}     onChange={(v) => setMembers(members.map((x, j) => j === i ? { ...x, role: v } : x))} placeholder="Title" /></Row>
          <Row label="Photo"><TextField value={m.photoUrl} onChange={(v) => setMembers(members.map((x, j) => j === i ? { ...x, photoUrl: v } : x))} placeholder="https://…" /></Row>
          <Row label="Bio">
            <textarea
              value={m.bio || ''}
              onChange={(e) => setMembers(members.map((x, j) => j === i ? { ...x, bio: e.target.value } : x))}
              rows={2}
              className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:bg-white resize-none"
            />
          </Row>
        </div>
      ))}
      <AddButton onClick={() => setMembers([...members, { id: `m_${Date.now()}`, name: 'New Member', role: '' }])} label="Add member" />
    </PanelSection>
  );
};

// =============================================================================
//  Pricing
// =============================================================================

const PricingEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  const tiers: any[] = c.tiers || [];
  const setTiers = (next: any[]) => onPatch({ content: { ...c, tiers: next } });
  return (
    <PanelSection title={`Pricing · ${tiers.length}`}>
      {tiers.map((t, i) => (
        <div key={t.id || i} className="rounded border border-slate-200 bg-white p-2 space-y-1">
          <ItemHeader
            index={i} total={tiers.length} label="Tier"
            onUp={() => setTiers(arrayMove(tiers, i, i - 1))}
            onDown={() => setTiers(arrayMove(tiers, i, i + 1))}
            onRemove={() => setTiers(tiers.filter((_, j) => j !== i))}
          />
          <Row label="Name">   <TextField value={t.name}   onChange={(v) => setTiers(tiers.map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="Starter / Pro / Enterprise" /></Row>
          <Row label="Price">  <TextField value={t.price}  onChange={(v) => setTiers(tiers.map((x, j) => j === i ? { ...x, price: v } : x))} placeholder="$29" /></Row>
          <Row label="Period"> <TextField value={t.period} onChange={(v) => setTiers(tiers.map((x, j) => j === i ? { ...x, period: v } : x))} placeholder="month" /></Row>
          <Row label="Features">
            <textarea
              value={(t.features || []).join('\n')}
              onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, features: e.target.value.split('\n').filter(Boolean) } : x))}
              rows={4}
              placeholder="One feature per line…"
              className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:bg-white resize-none"
            />
          </Row>
          <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={!!t.highlight}
              onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, highlight: e.target.checked } : x))}
            />
            <Star className="w-3 h-3 text-amber-500" />
            Highlight as recommended
          </label>
        </div>
      ))}
      <AddButton onClick={() => setTiers([...tiers, { id: `t_${Date.now()}`, name: 'New Tier', price: '$0', period: 'month', features: [] }])} label="Add tier" />
    </PanelSection>
  );
};

// =============================================================================
//  Comparison
// =============================================================================

const ComparisonEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  const cols: string[] = c.columns || [];
  const rows: any[]    = c.rows || [];
  const setAll = (next: any) => onPatch({ content: { ...c, ...next } });

  return (
    <PanelSection title="Comparison">
      <Row label="Columns">
        <textarea
          value={cols.join('\n')}
          onChange={(e) => setAll({ columns: e.target.value.split('\n').filter(Boolean) })}
          rows={3}
          placeholder="One column header per line…"
          className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:bg-white resize-none"
        />
      </Row>
      <Row label="Highlight">
        <NumberField
          value={c.highlightColumn ?? undefined as any}
          onChange={(v) => setAll({ highlightColumn: Math.max(0, Math.min(cols.length - 1, Math.floor(v))) })}
          min={0} max={Math.max(0, cols.length - 1)} suffix="col"
        />
      </Row>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="rounded border border-slate-200 bg-white p-2 space-y-1">
            <ItemHeader
              index={i} total={rows.length} label="Row"
              onUp={() => setAll({ rows: arrayMove(rows, i, i - 1) })}
              onDown={() => setAll({ rows: arrayMove(rows, i, i + 1) })}
              onRemove={() => setAll({ rows: rows.filter((_, j) => j !== i) })}
            />
            <Row label="Feature"><TextField value={r.feature} onChange={(v) => setAll({ rows: rows.map((x, j) => j === i ? { ...x, feature: v } : x) })} placeholder="Feature name" /></Row>
            <Row label="Values">
              <textarea
                value={(r.values || []).join('\n')}
                onChange={(e) => setAll({ rows: rows.map((x, j) => j === i ? { ...x, values: e.target.value.split('\n') } : x) })}
                rows={Math.max(2, cols.length)}
                placeholder="One value per column…"
                className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:bg-white resize-none"
              />
            </Row>
          </div>
        ))}
      </div>
      <AddButton onClick={() => setAll({ rows: [...rows, { feature: 'New feature', values: cols.map(() => '') }] })} label="Add comparison row" />
    </PanelSection>
  );
};

// =============================================================================
//  SWOT
// =============================================================================

const SwotEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  const set = (key: 'strengths' | 'weaknesses' | 'opportunities' | 'threats', lines: string[]) =>
    onPatch({ content: { ...c, [key]: lines } });
  const block = (label: string, key: 'strengths' | 'weaknesses' | 'opportunities' | 'threats') => (
    <Row label={label}>
      <textarea
        value={(c[key] || []).join('\n')}
        onChange={(e) => set(key, e.target.value.split('\n').filter(Boolean))}
        rows={3}
        placeholder="One item per line…"
        className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:bg-white resize-none"
      />
    </Row>
  );
  return (
    <PanelSection title="SWOT">
      {block('Strengths',     'strengths')}
      {block('Weaknesses',    'weaknesses')}
      {block('Opps.',         'opportunities')}
      {block('Threats',       'threats')}
    </PanelSection>
  );
};

// =============================================================================
//  Feature grid
// =============================================================================

const FeatureGridEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  const items: any[] = c.items || [];
  const setItems = (next: any[]) => onPatch({ content: { ...c, items: next } });
  return (
    <PanelSection title={`Features · ${items.length}`}>
      <Row label="Columns">
        <NumberField value={c.columns ?? 3} onChange={(v) => onPatch({ content: { ...c, columns: Math.max(1, Math.min(4, Math.floor(v))) } })} min={1} max={4} suffix="cols" />
      </Row>
      {items.map((it, i) => (
        <div key={it.id || i} className="rounded border border-slate-200 bg-white p-2 space-y-1">
          <ItemHeader
            index={i} total={items.length} label="Feature"
            onUp={() => setItems(arrayMove(items, i, i - 1))}
            onDown={() => setItems(arrayMove(items, i, i + 1))}
            onRemove={() => setItems(items.filter((_, j) => j !== i))}
          />
          <Row label="Title"><TextField value={it.title} onChange={(v) => setItems(items.map((x, j) => j === i ? { ...x, title: v } : x))} placeholder="Feature name" /></Row>
          <Row label="Desc">
            <textarea
              value={it.description || ''}
              onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
              rows={2}
              className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:bg-white resize-none"
            />
          </Row>
        </div>
      ))}
      <AddButton onClick={() => setItems([...items, { id: `f_${Date.now()}`, title: 'New feature' }])} label="Add feature" />
    </PanelSection>
  );
};

// =============================================================================
//  Process steps
// =============================================================================

const ProcessStepsEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  const steps: any[] = c.steps || [];
  const setSteps = (next: any[]) => onPatch({ content: { ...c, steps: next } });
  return (
    <PanelSection title={`Process · ${steps.length}`}>
      {steps.map((s, i) => (
        <div key={s.id || i} className="rounded border border-slate-200 bg-white p-2 space-y-1">
          <ItemHeader
            index={i} total={steps.length} label="Step"
            onUp={() => setSteps(arrayMove(steps, i, i - 1))}
            onDown={() => setSteps(arrayMove(steps, i, i + 1))}
            onRemove={() => setSteps(steps.filter((_, j) => j !== i))}
          />
          <Row label="Title"><TextField value={s.title} onChange={(v) => setSteps(steps.map((x, j) => j === i ? { ...x, title: v } : x))} placeholder="Step name" /></Row>
          <Row label="Desc">
            <textarea
              value={s.description || ''}
              onChange={(e) => setSteps(steps.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
              rows={2}
              className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:bg-white resize-none"
            />
          </Row>
        </div>
      ))}
      <AddButton onClick={() => setSteps([...steps, { id: `s_${Date.now()}`, title: 'New step' }])} label="Add step" />
    </PanelSection>
  );
};

// =============================================================================
//  Timeline
// =============================================================================

const TimelineEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  const items: any[] = c.items || [];
  const setItems = (next: any[]) => onPatch({ content: { ...c, items: next } });
  return (
    <PanelSection title={`Timeline · ${items.length}`}>
      {items.map((it, i) => (
        <div key={it.id || i} className="rounded border border-slate-200 bg-white p-2 space-y-1">
          <ItemHeader
            index={i} total={items.length} label="Event"
            onUp={() => setItems(arrayMove(items, i, i - 1))}
            onDown={() => setItems(arrayMove(items, i, i + 1))}
            onRemove={() => setItems(items.filter((_, j) => j !== i))}
          />
          <Row label="Date"> <TextField value={it.date}  onChange={(v) => setItems(items.map((x, j) => j === i ? { ...x, date: v } : x))} placeholder="Q1 2026" /></Row>
          <Row label="Title"><TextField value={it.title} onChange={(v) => setItems(items.map((x, j) => j === i ? { ...x, title: v } : x))} placeholder="Milestone" /></Row>
          <Row label="Desc">
            <textarea
              value={it.description || ''}
              onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
              rows={2}
              className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:bg-white resize-none"
            />
          </Row>
        </div>
      ))}
      <AddButton onClick={() => setItems([...items, { id: `t_${Date.now()}`, title: 'New event' }])} label="Add event" />
    </PanelSection>
  );
};

// =============================================================================
//  Roadmap
// =============================================================================

const RoadmapEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  const phases: any[] = c.phases || [];
  const setPhases = (next: any[]) => onPatch({ content: { ...c, phases: next } });
  return (
    <PanelSection title={`Roadmap · ${phases.length}`}>
      {phases.map((p, i) => (
        <div key={p.id || i} className="rounded border border-slate-200 bg-white p-2 space-y-1">
          <ItemHeader
            index={i} total={phases.length} label="Phase"
            onUp={() => setPhases(arrayMove(phases, i, i - 1))}
            onDown={() => setPhases(arrayMove(phases, i, i + 1))}
            onRemove={() => setPhases(phases.filter((_, j) => j !== i))}
          />
          <Row label="Period"><TextField value={p.period} onChange={(v) => setPhases(phases.map((x, j) => j === i ? { ...x, period: v } : x))} placeholder="Q1 2026" /></Row>
          <Row label="Phase"> <TextField value={p.phase}  onChange={(v) => setPhases(phases.map((x, j) => j === i ? { ...x, phase: v } : x))} placeholder="Phase name" /></Row>
          <Row label="Items">
            <textarea
              value={(p.bullets || []).join('\n')}
              onChange={(e) => setPhases(phases.map((x, j) => j === i ? { ...x, bullets: e.target.value.split('\n').filter(Boolean) } : x))}
              rows={4}
              placeholder="One bullet per line…"
              className="flex-1 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:bg-white resize-none"
            />
          </Row>
        </div>
      ))}
      <AddButton onClick={() => setPhases([...phases, { id: `p_${Date.now()}`, phase: 'New phase', bullets: [] }])} label="Add phase" />
    </PanelSection>
  );
};

// =============================================================================
//  Video placeholder
// =============================================================================

const VideoPlaceholderEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  const set = (patch: any) => onPatch({ content: { ...c, ...patch } });
  return (
    <PanelSection title="Video">
      <Row label="Poster"> <TextField value={c.posterUrl} onChange={(v) => set({ posterUrl: v })} placeholder="https://… (image URL)" /></Row>
      <Row label="Caption"><TextField value={c.caption}   onChange={(v) => set({ caption: v })}   placeholder="Optional caption" /></Row>
      <Row label="Length"> <TextField value={c.durationLabel} onChange={(v) => set({ durationLabel: v })} placeholder="2:34" /></Row>
    </PanelSection>
  );
};

// =============================================================================
//  Embed placeholder
// =============================================================================

const EmbedPlaceholderEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  const set = (patch: any) => onPatch({ content: { ...c, ...patch } });
  return (
    <PanelSection title="Embed">
      <Row label="Provider"><TextField value={c.providerLabel} onChange={(v) => set({ providerLabel: v })} placeholder="YouTube / Figma / Loom…" /></Row>
      <Row label="Caption"> <TextField value={c.caption}        onChange={(v) => set({ caption: v })} placeholder="Optional caption" /></Row>
    </PanelSection>
  );
};
