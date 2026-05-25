'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Palette, Plus, Trash2 } from 'lucide-react';
import { useThemes, ThemeDTO } from '@/features/pptx-editing/hooks';
import { useConfirm } from '@/components/ConfirmDialog';

// =============================================================================
//  Phase 38C — Theme Builder
//
//  Workspace-scoped theme library. Each theme stores:
//    { colors, fonts, spacing, borders, shadows }
//  Live preview on the right; "Save" persists via /themes endpoints.
// =============================================================================

const DEFAULT_TOKENS = {
  colors: { primary: '#2563EB', secondary: '#64748B', accent: '#16A34A', text: '#1F2937', background: '#FFFFFF' },
  fonts:  { heading: 'Inter', body: 'Inter' },
  spacing:{ base: 8 },
  borders:{ radius: 8 },
  shadows:{ md: '0 4px 8px rgba(0,0,0,0.08)' },
};

export default function ThemesPage() {
  const { items, create, update, remove } = useThemes({});
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected: ThemeDTO | null = items.find((t) => t.id === selectedId) || null;

  return (
    <div className="min-h-screen bg-[#EDEBE6]">
      <header className="bg-white border-b border-[#E3E1DA] px-6 h-14 flex items-center gap-3">
        <Link href="/dashboard" className="text-xs text-[#9A9A9A] hover:text-[#111111] flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="h-5 w-px bg-[#E3E1DA]" />
        <h1 className="text-base font-bold text-[#111111] flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#9A9A9A]" /> Theme Builder
        </h1>
        <button
          onClick={() => create({ name: 'New theme', tokens: DEFAULT_TOKENS, isWorkspace: true })}
          className="ml-auto h-7 px-2 text-xs font-semibold bg-[#4F7563] text-white rounded inline-flex items-center gap-1 hover:bg-[#355846]"
        >
          <Plus className="w-3 h-3" /> New theme
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-[240px_1fr_320px] gap-6">
        {/* Theme list */}
        <nav className="space-y-1">
          {items.length === 0 && <div className="text-xs text-[#9A9A9A] italic">No themes yet.</div>}
          {items.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold transition-colors ${
                selectedId === t.id ? 'bg-[#EEF5F1] text-[#263F34]' : 'text-[#6B6B6B] hover:bg-[#F1F0EC] hover:text-[#111111]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded" style={{ background: (t.tokens?.colors?.primary) || '#94A3B8' }} />
                <span className="truncate">{t.name}</span>
                <button
                  onClick={async (e) => { e.stopPropagation(); if (await confirm({ title: 'Delete theme?', message: `"${t.name}" will be removed.`, confirmLabel: 'Delete', tone: 'danger' })) remove(t.id); }}
                  className="ml-auto p-0.5 text-[#9a3737] hover:bg-[#FCF1F1] rounded"
                ><Trash2 className="w-3 h-3" /></button>
              </div>
            </button>
          ))}
        </nav>

        {/* Editor */}
        <main className="bg-white border border-[#E3E1DA] rounded-lg p-6">
          {!selected ? (
            <div className="text-sm text-[#9A9A9A] italic">Select a theme to edit, or create a new one.</div>
          ) : (
            <ThemeEditor key={selected.id} theme={selected} onChange={(patch) => update(selected.id, patch)} />
          )}
        </main>

        {/* Preview */}
        <aside className="bg-white border border-[#E3E1DA] rounded-lg p-4 sticky top-6 self-start">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-2">Preview</div>
          <ThemePreview tokens={selected?.tokens || DEFAULT_TOKENS} />
        </aside>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

const ThemeEditor: React.FC<{ theme: ThemeDTO; onChange: (patch: Partial<ThemeDTO>) => void }> = ({ theme, onChange }) => {
  const [name, setName] = useState(theme.name);
  const [tokens, setTokens] = useState<any>(theme.tokens || DEFAULT_TOKENS);

  const set = (path: string[], v: any) => {
    setTokens((t: any) => {
      const next = JSON.parse(JSON.stringify(t));
      let cur = next;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]] ??= {};
      cur[path[path.length - 1]] = v;
      return next;
    });
  };

  const save = () => onChange({ name, tokens });

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <label className="block text-xs font-semibold text-[#111111] mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-8 px-2 text-sm border border-[#C9C6BD] rounded" />
      </div>
      <Section title="Colors">
        {['primary', 'secondary', 'accent', 'text', 'background'].map((k) => (
          <ColorRow key={k} label={k} value={tokens.colors?.[k] ?? '#000000'} onChange={(v) => set(['colors', k], v)} />
        ))}
      </Section>
      <Section title="Fonts">
        <TextRow label="Heading" value={tokens.fonts?.heading ?? ''} onChange={(v) => set(['fonts', 'heading'], v)} />
        <TextRow label="Body"    value={tokens.fonts?.body    ?? ''} onChange={(v) => set(['fonts', 'body'], v)} />
      </Section>
      <Section title="Spacing & shape">
        <NumberRow label="Base spacing" value={tokens.spacing?.base ?? 8} onChange={(v) => set(['spacing', 'base'], v)} suffix="px" />
        <NumberRow label="Border radius" value={tokens.borders?.radius ?? 8} onChange={(v) => set(['borders', 'radius'], v)} suffix="px" />
      </Section>
      <Section title="Shadows">
        <TextRow label="md shadow" value={tokens.shadows?.md ?? ''} onChange={(v) => set(['shadows', 'md'], v)} />
      </Section>
      <button onClick={save} className="px-3 py-1.5 text-xs font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded">
        Save theme
      </button>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-2">{title}</h3>
    <div className="space-y-2">{children}</div>
  </section>
);

const ColorRow: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center gap-2">
    <label className="w-24 text-xs text-[#111111] capitalize">{label}</label>
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-9 h-7 border border-[#C9C6BD] rounded cursor-pointer" />
    <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 h-7 px-1.5 text-xs font-mono border border-[#C9C6BD] rounded" />
  </div>
);
const TextRow: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center gap-2">
    <label className="w-24 text-xs text-[#111111]">{label}</label>
    <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 h-7 px-1.5 text-xs border border-[#C9C6BD] rounded" />
  </div>
);
const NumberRow: React.FC<{ label: string; value: number; onChange: (v: number) => void; suffix?: string }> = ({ label, value, onChange, suffix }) => (
  <div className="flex items-center gap-2">
    <label className="w-24 text-xs text-[#111111]">{label}</label>
    <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="flex-1 h-7 px-1.5 text-xs font-mono border border-[#C9C6BD] rounded" />
    {suffix && <span className="text-[10px] text-[#C9C6BD]">{suffix}</span>}
  </div>
);

const ThemePreview: React.FC<{ tokens: any }> = ({ tokens }) => {
  const c = tokens?.colors || {};
  const f = tokens?.fonts  || {};
  return (
    <div className="space-y-2">
      <div className="rounded p-3" style={{ background: c.primary || '#2563EB' }}>
        <div className="text-white text-sm font-bold" style={{ fontFamily: f.heading }}>Heading</div>
        <div className="text-white/80 text-[11px]" style={{ fontFamily: f.body }}>Tagline text</div>
      </div>
      <div className="rounded p-3 border border-[#E3E1DA]" style={{ background: c.background || '#FFFFFF', color: c.text }}>
        <div className="text-sm font-bold" style={{ fontFamily: f.heading, color: c.primary }}>Section title</div>
        <div className="text-[11px] mt-1" style={{ fontFamily: f.body }}>Body copy renders in the theme's body font and text color for legibility.</div>
        <div className="mt-2 flex gap-1">
          {['primary', 'secondary', 'accent'].map((k) => (
            <span key={k} className="w-4 h-4 rounded" style={{ background: c[k] }} />
          ))}
        </div>
      </div>
    </div>
  );
};
