'use client';

import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type {
  StructuredWizardData,
  StructuredSectionKey,
  KPIEntry,
  PricingTierEntry,
  RoadmapPhaseEntry,
  TeamMemberEntry,
  CompetitorEntry,
  FundingAllocationEntry,
  MarketSizingEntry,
  SWOTEntry,
  FundingDataEntry,
} from '@/lib/wizard-structured';
import { getSectionsFor, emptyStructuredWizardData } from '@/lib/wizard-structured';

interface Props {
  documentType: string;
  structured:   StructuredWizardData;
  onUpdate:     (next: StructuredWizardData) => void;
}

export default function StructuredDataStep({ documentType, structured, onUpdate }: Props) {
  const sections = getSectionsFor(documentType);
  const data = { ...emptyStructuredWizardData, ...structured };
  const patch = (p: Partial<StructuredWizardData>) => onUpdate({ ...data, ...p });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#111111]">Business data</h2>
        <p className="text-sm text-[#6B6B6B] mt-1">
          Structured entries unlock visual blocks (KPI cards, pricing cards, timelines…).
          Every field is optional but completing them dramatically improves your deck.
        </p>
      </div>

      {sections.includes('kpis')        && <KPISection        kpis={data.kpis ?? []}             onChange={(kpis)        => patch({ kpis })} />}
      {sections.includes('market')      && <MarketSection     market={data.marketSizing ?? {}}    onChange={(marketSizing)=> patch({ marketSizing })} />}
      {sections.includes('pricing')     && <PricingSection    tiers={data.pricingTiers ?? []}     onChange={(pricingTiers)=> patch({ pricingTiers })} />}
      {sections.includes('roadmap')     && <RoadmapSection    phases={data.roadmapPhases ?? []}   onChange={(roadmapPhases)=>patch({ roadmapPhases })} />}
      {sections.includes('team')        && <TeamSection       members={data.teamMembers ?? []}    onChange={(teamMembers)  =>patch({ teamMembers })} />}
      {sections.includes('competitors') && <CompetitorSection comps={data.competitors ?? []}      onChange={(competitors)  =>patch({ competitors })} />}
      {sections.includes('funding')     && <FundingSection    funding={data.funding ?? { allocations: [] }} onChange={(funding)=>patch({ funding })} />}
      {sections.includes('swot')        && <SWOTSection       swot={data.swot ?? { strengths: [], weaknesses: [], opportunities: [], threats: [] }} onChange={(swot)=>patch({ swot })} />}
    </div>
  );
}

// =============================================================================
//  Section wrapper
// =============================================================================

function Section({ title, hint, count, children }: { title: string; hint?: string; count?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-[#E3E1DA] bg-white shadow-sm">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-[#EDEBE6]">
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="w-4 h-4 text-[#9A9A9A]" /> : <ChevronRight className="w-4 h-4 text-[#9A9A9A]" />}
          <h3 className="font-semibold text-[#111111]">{title}</h3>
          {count !== undefined && count > 0 && (
            <span className="text-xs font-semibold rounded-full bg-[#DDE8E1] text-[#355846] px-2 py-0.5">
              {count}
            </span>
          )}
        </div>
        {hint && <span className="text-xs text-[#9A9A9A] hidden sm:block">{hint}</span>}
      </button>
      {open && <div className="px-5 pb-5 space-y-3">{children}</div>}
    </div>
  );
}

// =============================================================================
//  KPI section
// =============================================================================

function KPISection({ kpis, onChange }: { kpis: KPIEntry[]; onChange: (v: KPIEntry[]) => void }) {
  return (
    <Section title="KPIs & Metrics" hint="Each KPI becomes a metric card" count={kpis.length}>
      {kpis.map((k, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
          <input className={inputCls + ' sm:col-span-3'} placeholder="Label (e.g. MRR)"
            value={k.label} onChange={(e) => onChange(replace(kpis, i, { ...k, label: e.target.value }))} />
          <input className={inputCls + ' sm:col-span-3'} placeholder="Value (e.g. $50K)"
            value={k.value} onChange={(e) => onChange(replace(kpis, i, { ...k, value: e.target.value }))} />
          <input className={inputCls + ' sm:col-span-3'} placeholder="Trend (e.g. +150% YoY)"
            value={k.trend ?? ''} onChange={(e) => onChange(replace(kpis, i, { ...k, trend: e.target.value }))} />
          <select className={inputCls + ' sm:col-span-2'}
            value={k.trendDirection ?? ''} onChange={(e) => onChange(replace(kpis, i, { ...k, trendDirection: (e.target.value || undefined) as any }))}>
            <option value="">—</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
            <option value="flat">Flat</option>
          </select>
          <button className={delCls + ' sm:col-span-1'} onClick={() => onChange(remove(kpis, i))}><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <button className={addCls} onClick={() => onChange([...kpis, { label: '', value: '' }])}>
        <Plus className="w-4 h-4 mr-1" /> Add KPI
      </button>
    </Section>
  );
}

// =============================================================================
//  Market section
// =============================================================================

function MarketSection({ market, onChange }: { market: MarketSizingEntry; onChange: (v: MarketSizingEntry) => void }) {
  const drivers = market.drivers ?? [];
  return (
    <Section title="Market Opportunity (TAM/SAM/SOM)" hint="Generates market sizing block">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <LabeledInput label="TAM"          value={market.tam        ?? ''} onChange={(v) => onChange({ ...market, tam: v })}        placeholder="$185B" />
        <LabeledInput label="SAM"          value={market.sam        ?? ''} onChange={(v) => onChange({ ...market, sam: v })}        placeholder="$12B" />
        <LabeledInput label="SOM"          value={market.som        ?? ''} onChange={(v) => onChange({ ...market, som: v })}        placeholder="$850M" />
        <LabeledInput label="Growth rate"  value={market.growthRate ?? ''} onChange={(v) => onChange({ ...market, growthRate: v })} placeholder="25% CAGR" />
        <LabeledInput label="Region"       value={market.region     ?? ''} onChange={(v) => onChange({ ...market, region: v })}     placeholder="Global / US / EU" />
      </div>
      <div>
        <div className="text-xs font-medium text-[#111111] mb-1">Market drivers (one per line)</div>
        <textarea className={inputCls + ' min-h-[60px]'} placeholder="Driver 1&#10;Driver 2"
          value={drivers.join('\n')}
          onChange={(e) => onChange({ ...market, drivers: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} />
      </div>
    </Section>
  );
}

// =============================================================================
//  Pricing section
// =============================================================================

function PricingSection({ tiers, onChange }: { tiers: PricingTierEntry[]; onChange: (v: PricingTierEntry[]) => void }) {
  return (
    <Section title="Pricing tiers" hint="Each tier renders as a pricing card" count={tiers.length}>
      {tiers.map((t, i) => (
        <div key={i} className="rounded-lg border border-[#E3E1DA] bg-[#EDEBE6] p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input className={inputCls + ' sm:col-span-4'} placeholder="Tier name (Starter / Pro / Enterprise)"
              value={t.name} onChange={(e) => onChange(replace(tiers, i, { ...t, name: e.target.value }))} />
            <input className={inputCls + ' sm:col-span-3'} placeholder="Price ($9/mo)"
              value={t.price} onChange={(e) => onChange(replace(tiers, i, { ...t, price: e.target.value }))} />
            <input className={inputCls + ' sm:col-span-4'} placeholder="Target customer (optional)"
              value={t.target ?? ''} onChange={(e) => onChange(replace(tiers, i, { ...t, target: e.target.value }))} />
            <button className={delCls + ' sm:col-span-1'} onClick={() => onChange(remove(tiers, i))}><Trash2 className="w-4 h-4" /></button>
          </div>
          <textarea className={inputCls + ' min-h-[60px]'} placeholder="Features (one per line)"
            value={t.features.join('\n')}
            onChange={(e) => onChange(replace(tiers, i, { ...t, features: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }))} />
        </div>
      ))}
      <button className={addCls} onClick={() => onChange([...tiers, { name: '', price: '', features: [] }])}>
        <Plus className="w-4 h-4 mr-1" /> Add pricing tier
      </button>
    </Section>
  );
}

// =============================================================================
//  Roadmap section
// =============================================================================

function RoadmapSection({ phases, onChange }: { phases: RoadmapPhaseEntry[]; onChange: (v: RoadmapPhaseEntry[]) => void }) {
  return (
    <Section title="Roadmap phases" hint="Renders as timeline + roadmap blocks" count={phases.length}>
      {phases.map((p, i) => (
        <div key={i} className="rounded-lg border border-[#E3E1DA] bg-[#EDEBE6] p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input className={inputCls + ' sm:col-span-5'} placeholder="Phase title (e.g. Launch in 3 cities)"
              value={p.phase} onChange={(e) => onChange(replace(phases, i, { ...p, phase: e.target.value }))} />
            <input className={inputCls + ' sm:col-span-3'} placeholder="Period (Q1 2026)"
              value={p.period ?? ''} onChange={(e) => onChange(replace(phases, i, { ...p, period: e.target.value }))} />
            <button className={delCls + ' sm:col-span-1 sm:col-start-12'} onClick={() => onChange(remove(phases, i))}><Trash2 className="w-4 h-4" /></button>
          </div>
          <textarea className={inputCls + ' min-h-[60px]'} placeholder="Milestones (one per line)"
            value={p.milestones.join('\n')}
            onChange={(e) => onChange(replace(phases, i, { ...p, milestones: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }))} />
        </div>
      ))}
      <button className={addCls} onClick={() => onChange([...phases, { phase: '', milestones: [] }])}>
        <Plus className="w-4 h-4 mr-1" /> Add phase
      </button>
    </Section>
  );
}

// =============================================================================
//  Team section
// =============================================================================

function TeamSection({ members, onChange }: { members: TeamMemberEntry[]; onChange: (v: TeamMemberEntry[]) => void }) {
  return (
    <Section title="Team members" hint="Generates team cards" count={members.length}>
      {members.map((m, i) => (
        <div key={i} className="rounded-lg border border-[#E3E1DA] bg-[#EDEBE6] p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input className={inputCls + ' sm:col-span-4'} placeholder="Name"
              value={m.name} onChange={(e) => onChange(replace(members, i, { ...m, name: e.target.value }))} />
            <input className={inputCls + ' sm:col-span-4'} placeholder="Role (CEO / CTO)"
              value={m.role} onChange={(e) => onChange(replace(members, i, { ...m, role: e.target.value }))} />
            <input className={inputCls + ' sm:col-span-3'} placeholder="Experience (ex-Google)"
              value={m.experience ?? ''} onChange={(e) => onChange(replace(members, i, { ...m, experience: e.target.value }))} />
            <button className={delCls + ' sm:col-span-1'} onClick={() => onChange(remove(members, i))}><Trash2 className="w-4 h-4" /></button>
          </div>
          <textarea className={inputCls + ' min-h-[40px]'} placeholder="Responsibilities (optional)"
            value={m.responsibilities ?? ''}
            onChange={(e) => onChange(replace(members, i, { ...m, responsibilities: e.target.value }))} />
        </div>
      ))}
      <button className={addCls} onClick={() => onChange([...members, { name: '', role: '' }])}>
        <Plus className="w-4 h-4 mr-1" /> Add team member
      </button>
    </Section>
  );
}

// =============================================================================
//  Competitor section
// =============================================================================

function CompetitorSection({ comps, onChange }: { comps: CompetitorEntry[]; onChange: (v: CompetitorEntry[]) => void }) {
  return (
    <Section title="Competitors" hint="Generates comparison matrix" count={comps.length}>
      {comps.map((c, i) => (
        <div key={i} className="rounded-lg border border-[#E3E1DA] bg-[#EDEBE6] p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input className={inputCls + ' sm:col-span-11'} placeholder="Competitor name"
              value={c.name} onChange={(e) => onChange(replace(comps, i, { ...c, name: e.target.value }))} />
            <button className={delCls + ' sm:col-span-1'} onClick={() => onChange(remove(comps, i))}><Trash2 className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <textarea className={inputCls + ' min-h-[48px]'} placeholder="Strengths"
              value={c.strengths ?? ''} onChange={(e) => onChange(replace(comps, i, { ...c, strengths: e.target.value }))} />
            <textarea className={inputCls + ' min-h-[48px]'} placeholder="Weaknesses"
              value={c.weaknesses ?? ''} onChange={(e) => onChange(replace(comps, i, { ...c, weaknesses: e.target.value }))} />
          </div>
        </div>
      ))}
      <button className={addCls} onClick={() => onChange([...comps, { name: '' }])}>
        <Plus className="w-4 h-4 mr-1" /> Add competitor
      </button>
    </Section>
  );
}

// =============================================================================
//  Funding section
// =============================================================================

function FundingSection({ funding, onChange }: { funding: FundingDataEntry; onChange: (v: FundingDataEntry) => void }) {
  const allocs = funding.allocations ?? [];
  return (
    <Section title="Funding ask" hint="Generates funding allocation block">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <LabeledInput label="Amount"     value={funding.amount    ?? ''} onChange={(v) => onChange({ ...funding, amount: v })}    placeholder="$2M" />
        <LabeledInput label="Round type" value={funding.roundType ?? ''} onChange={(v) => onChange({ ...funding, roundType: v })} placeholder="Seed" />
        <LabeledInput label="Runway"     value={funding.runway    ?? ''} onChange={(v) => onChange({ ...funding, runway: v })}    placeholder="18 months" />
      </div>
      <div className="space-y-2">
        <div className="text-xs font-medium text-[#111111]">Use of funds</div>
        {allocs.map((a: FundingAllocationEntry, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input className={inputCls + ' sm:col-span-6'} placeholder="Category (Engineering / Marketing)"
              value={a.category}
              onChange={(e) => onChange({ ...funding, allocations: replace(allocs, i, { ...a, category: e.target.value }) })} />
            <input className={inputCls + ' sm:col-span-2'} placeholder="% (50)" type="number"
              value={a.percentage ?? ''}
              onChange={(e) => onChange({ ...funding, allocations: replace(allocs, i, { ...a, percentage: e.target.value ? Number(e.target.value) : undefined }) })} />
            <input className={inputCls + ' sm:col-span-3'} placeholder="Amount ($1M)"
              value={a.amount ?? ''}
              onChange={(e) => onChange({ ...funding, allocations: replace(allocs, i, { ...a, amount: e.target.value }) })} />
            <button className={delCls + ' sm:col-span-1'}
              onClick={() => onChange({ ...funding, allocations: remove(allocs, i) })}><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <button className={addCls} onClick={() => onChange({ ...funding, allocations: [...allocs, { category: '' }] })}>
          <Plus className="w-4 h-4 mr-1" /> Add allocation
        </button>
      </div>
    </Section>
  );
}

// =============================================================================
//  SWOT section
// =============================================================================

function SWOTSection({ swot, onChange }: { swot: SWOTEntry; onChange: (v: SWOTEntry) => void }) {
  const list = (label: keyof SWOTEntry, placeholder: string) => (
    <div>
      <div className="text-xs font-medium text-[#111111] mb-1 capitalize">{label}</div>
      <textarea className={inputCls + ' min-h-[80px]'} placeholder={`${placeholder} (one per line)`}
        value={(swot[label] || []).join('\n')}
        onChange={(e) => onChange({ ...swot, [label]: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} />
    </div>
  );
  return (
    <Section title="SWOT analysis" hint="Renders as a 4-quadrant block">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {list('strengths',     'Strengths')}
        {list('weaknesses',    'Weaknesses')}
        {list('opportunities', 'Opportunities')}
        {list('threats',       'Threats')}
      </div>
    </Section>
  );
}

// =============================================================================
//  Generic helpers
// =============================================================================

const inputCls = 'rounded-lg border border-[#C9C6BD] bg-white px-3 py-2 text-sm text-[#111111] placeholder:text-[#C9C6BD] focus:outline-none focus:border-[#4F7563] focus:ring-2 focus:ring-green-100';
const addCls   = 'inline-flex items-center text-sm font-medium text-[#355846] hover:text-green-800 px-2 py-1 rounded-md hover:bg-[#EEF5F1]';
const delCls   = 'inline-flex items-center justify-center text-[#9A9A9A] hover:text-[#9a3737] rounded-lg border border-[#E3E1DA] hover:border-[#F7E3E3] hover:bg-[#FCF1F1] px-2 py-1';

function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-[#111111] mb-1">{label}</div>
      <input className={inputCls + ' w-full'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function replace<T>(arr: T[], idx: number, item: T): T[] {
  return arr.map((x, i) => (i === idx ? item : x));
}
function remove<T>(arr: T[], idx: number): T[] {
  return arr.filter((_, i) => i !== idx);
}
