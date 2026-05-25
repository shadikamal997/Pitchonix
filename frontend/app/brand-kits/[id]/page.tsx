'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Palette, Type, ImageIcon, BarChart3, MessageSquare,
  Files, Shield, Layout, Loader2,
} from 'lucide-react';
import { useBrandKit, importBrandKit } from '@/features/brand-kits/useBrandKits';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmDialog';
import { BrandPreviewPanel } from '@/features/brand-kits/BrandPreviewPanel';
import { BrandAuditPanel } from '@/features/brand-kits/BrandAuditPanel';
import { Download, Upload as UploadIcon, Share2, Archive, PackageOpen } from 'lucide-react';
import api from '@/lib/api';
import type { BrandAssetKind } from '@/types/brand-kit';

// =============================================================================
//  Phase 37Q — Brand Kit Dashboard
//
//  /brand-kits/[id] — 8 tabs as per spec: Overview, Logos, Colors,
//  Typography, Charts, Voice, Assets, Audit. Each tab edits the relevant
//  JSON slot on the kit and writes via PATCH /brand-kits/:id.
// =============================================================================

type Tab = 'overview' | 'logos' | 'colors' | 'typography' | 'charts' | 'voice' | 'assets' | 'audit';

const TABS: { key: Tab; label: string; Icon: React.ComponentType<any> }[] = [
  { key: 'overview',   label: 'Overview',   Icon: Layout },
  { key: 'logos',      label: 'Logos',      Icon: ImageIcon },
  { key: 'colors',     label: 'Colors',     Icon: Palette },
  { key: 'typography', label: 'Typography', Icon: Type },
  { key: 'charts',     label: 'Charts',     Icon: BarChart3 },
  { key: 'voice',      label: 'Voice',      Icon: MessageSquare },
  { key: 'assets',     label: 'Assets',     Icon: Files },
  { key: 'audit',      label: 'Audit',      Icon: Shield },
];

export default function BrandKitDashboardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const detail = useBrandKit(id);
  const [tab, setTab] = useState<Tab>('overview');
  const [auditDeckId, setAuditDeckId] = useState<string>('');

  if (detail.loading && !detail.kit) {
    return <div className="p-8 text-sm text-[#9A9A9A] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading brand kit…</div>;
  }
  if (detail.error)  return <div className="p-8 text-sm text-[#9a3737]">{detail.error}</div>;
  if (!detail.kit)   return <div className="p-8 text-sm text-[#9A9A9A]">Brand kit not found.</div>;

  const kit = detail.kit;

  return (
    <div className="min-h-full bg-[#EDEBE6]">
      <header className="bg-white border-b border-[#E3E1DA] px-6 h-14 flex items-center gap-3">
        <Link href="/brand-kits" className="text-xs text-[#9A9A9A] hover:text-[#111111] flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Brand kits
        </Link>
        <div className="h-5 w-px bg-[#E3E1DA]" />
        <h1 className="text-base font-bold text-[#111111] flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#9A9A9A]" />
          {kit.name}
          {kit.isDefault && (
            <span
              className="text-[9px] uppercase tracking-wide bg-[#DDE8E1] text-[#263F34] px-1.5 py-0.5 rounded cursor-help"
              title="Default only marks this kit as preferred. It will NOT be applied automatically. Choose it manually when creating or editing documents."
            >Default</span>
          )}
        </h1>
        {/* Phase 37.1E/F + 37.2C — Export / Import / ZIP / Apply-batch actions */}
        <div className="ml-auto flex items-center gap-2">
          <ExportButton    detail={detail} />
          <ImportButton    />
          <ExportZipButton kitId={kit.id} kitName={kit.name} />
          <ImportZipButton />
          <BatchApplyButton detail={detail} workspaceId={kit.workspaceId} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-[200px_1fr] gap-6">
        {/* Sidebar tabs */}
        <nav className="space-y-1">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded transition-colors ${
                tab === key ? 'bg-[#EEF5F1] text-[#263F34]' : 'text-[#6B6B6B] hover:bg-[#F1F0EC] hover:text-[#111111]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <main className="bg-white border border-[#E3E1DA] rounded-lg p-6">
          {tab === 'overview' && (
            <OverviewTab detail={detail} />
          )}
          {tab === 'logos' && (
            <LogosTab detail={detail} />
          )}
          {tab === 'colors' && (
            <ColorsTab detail={detail} />
          )}
          {tab === 'typography' && (
            <TypographyTab detail={detail} />
          )}
          {tab === 'charts' && (
            <ChartsTab detail={detail} />
          )}
          {tab === 'voice' && (
            <VoiceTab detail={detail} />
          )}
          {tab === 'assets' && (
            <AssetsTab detail={detail} />
          )}
          {tab === 'audit' && (
            <section>
              <h2 className="text-sm font-bold text-[#111111] mb-3">Brand audit</h2>
              <p className="text-xs text-[#9A9A9A] mb-3">
                Enter a deck id to audit its brand compliance against this kit.
              </p>
              <input
                value={auditDeckId}
                onChange={(e) => setAuditDeckId(e.target.value)}
                placeholder="deck-uuid"
                className="w-full h-8 px-2 mb-4 text-sm border border-[#C9C6BD] rounded font-mono"
              />
              <BrandAuditPanel deckId={auditDeckId || null} brandKitId={kit.id} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

// =============================================================================
//  Tab content components
// =============================================================================

const OverviewTab: React.FC<{ detail: ReturnType<typeof useBrandKit> }> = ({ detail }) => {
  const kit = detail.kit!;
  const [name, setName] = React.useState(kit.name);
  const [description, setDescription] = React.useState(kit.description || '');
  React.useEffect(() => { setName(kit.name); setDescription(kit.description || ''); }, [kit.id]);
  const dirty = name !== kit.name || description !== (kit.description || '');
  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-sm font-bold text-[#111111] mb-2">Overview</h2>
        <BrandPreviewPanel kit={kit} />
      </section>
      <section className="space-y-3 max-w-lg">
        <div>
          <label className="block text-xs font-semibold text-[#111111] mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-8 px-2 text-sm border border-[#C9C6BD] rounded" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#111111] mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-2 py-1.5 text-sm border border-[#C9C6BD] rounded resize-none" />
        </div>
        <button
          onClick={() => detail.update({ name: name.trim() || kit.name, description })}
          disabled={!dirty}
          className="px-3 py-1.5 text-xs font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save changes
        </button>
      </section>
    </div>
  );
};

const LogosTab: React.FC<{ detail: ReturnType<typeof useBrandKit> }> = ({ detail }) => {
  const kit = detail.kit!;
  const [logoUrl, setLogoUrl] = React.useState(kit.logo || '');
  const logos = (kit.assets || []).filter((a) => a.kind.startsWith('logo'));
  return (
    <div className="space-y-5">
      <section>
        <h2 className="text-sm font-bold text-[#111111] mb-3">Primary logo</h2>
        <div className="flex items-start gap-4">
          {(logoUrl || kit.logo) && (
            <img src={logoUrl || kit.logo!} alt="" className="w-20 h-20 object-contain bg-[#EDEBE6] border border-[#E3E1DA] rounded" />
          )}
          <div className="flex-1 max-w-lg">
            <label className="block text-xs font-semibold text-[#111111] mb-1">Logo URL</label>
            <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" className="w-full h-8 px-2 text-sm border border-[#C9C6BD] rounded font-mono" />
            <p className="text-[10px] text-[#9A9A9A] mt-1">Paste a URL or use the asset upload below.</p>
            <button
              onClick={() => detail.update({ logo: logoUrl })}
              disabled={logoUrl === (kit.logo || '')}
              className="mt-2 px-3 py-1.5 text-xs font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Update primary logo
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-[#111111] mb-2">Upload a logo variant</h2>
        <p className="text-[10px] text-[#9A9A9A] mb-2">
          Phase 37.1C — native upload. Pick a slot and choose the file.
        </p>
        <LogoUploadRow detail={detail} />
      </section>

      <section>
        <h2 className="text-sm font-bold text-[#111111] mb-2">All logo variants</h2>
        <p className="text-[10px] text-[#9A9A9A] mb-2">
          Phase 37B supports primary / secondary / monochrome / dark / light / icon mark / favicon.
        </p>
        {logos.length === 0 ? (
          <div className="text-xs text-[#9A9A9A] italic">No logo assets attached yet.</div>
        ) : (
          <ul className="space-y-1">
            {logos.map((l) => (
              <li key={l.id} className="flex items-center gap-2 text-xs">
                <img src={l.url} alt="" className="w-10 h-10 object-contain border border-[#E3E1DA] rounded" />
                <span className="font-mono uppercase text-[10px] text-[#9A9A9A]">{l.kind}</span>
                <span className="flex-1 truncate text-[#111111]">{l.url}</span>
                <button onClick={() => detail.removeAsset(l.id)} className="text-[10px] text-[#9a3737] hover:bg-[#FCF1F1] px-1.5 py-0.5 rounded">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

// Phase 37.1C — file-upload row for any logo variant.
const LogoUploadRow: React.FC<{ detail: ReturnType<typeof useBrandKit> }> = ({ detail }) => {
  const [kind, setKind] = React.useState<BrandAssetKind>('logo_primary');
  const [busy, setBusy] = React.useState(false);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try { await detail.uploadAsset(file, kind); }
    finally { setBusy(false); }
  };
  return (
    <div className="flex items-center gap-2">
      <select value={kind} onChange={(e) => setKind(e.target.value as BrandAssetKind)} className="h-8 px-2 text-xs border border-[#C9C6BD] rounded">
        <option value="logo_primary">logo_primary</option>
        <option value="logo_secondary">logo_secondary</option>
        <option value="logo_mono">logo_mono</option>
        <option value="logo_dark">logo_dark</option>
        <option value="logo_light">logo_light</option>
        <option value="icon_mark">icon_mark</option>
        <option value="favicon">favicon</option>
      </select>
      <label className="flex-1 inline-flex items-center gap-2 px-2 py-1.5 border border-[#C9C6BD] rounded cursor-pointer hover:bg-[#EDEBE6] text-xs">
        <UploadIcon className="w-3 h-3 text-[#9A9A9A]" />
        {busy ? 'Uploading…' : 'Choose a file'}
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => onFile(e.target.files?.[0])}
          className="hidden"
        />
      </label>
    </div>
  );
};

const ColorsTab: React.FC<{ detail: ReturnType<typeof useBrandKit> }> = ({ detail }) => {
  const kit = detail.kit!;
  const tokens = kit.tokens || {};
  const colors = tokens.colors || {};
  const initial = {
    primary:   colors.primary   ?? kit.primaryColor   ?? '#2563EB',
    secondary: colors.secondary ?? kit.secondaryColor ?? '#64748B',
    accent:    colors.accent    ?? '#16A34A',
    success:   colors.success   ?? '#16A34A',
    warning:   colors.warning   ?? '#D97706',
    danger:    colors.danger    ?? '#DC2626',
    neutral:   colors.neutral   ?? '#94A3B8',
  };
  const [state, setState] = React.useState(initial);
  React.useEffect(() => { setState(initial); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [kit.id]);
  const save = () => {
    detail.update({
      primaryColor: state.primary, secondaryColor: state.secondary,
      tokens: { ...tokens, colors: state },
    });
  };
  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-bold text-[#111111]">Brand colors</h2>
      {(Object.keys(initial) as Array<keyof typeof initial>).map((k) => (
        <div key={k} className="flex items-center gap-3">
          <label className="w-24 text-xs font-semibold text-[#111111] capitalize">{k}</label>
          <input
            type="color"
            value={state[k]}
            onChange={(e) => setState((s) => ({ ...s, [k]: e.target.value }))}
            className="w-10 h-8 border border-[#C9C6BD] rounded cursor-pointer"
          />
          <input
            value={state[k]}
            onChange={(e) => setState((s) => ({ ...s, [k]: e.target.value }))}
            className="flex-1 h-8 px-2 text-xs font-mono border border-[#C9C6BD] rounded"
          />
        </div>
      ))}
      <button onClick={save} className="px-3 py-1.5 text-xs font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded">
        Save colors
      </button>
    </div>
  );
};

const TypographyTab: React.FC<{ detail: ReturnType<typeof useBrandKit> }> = ({ detail }) => {
  const kit = detail.kit!;
  const tokens = kit.tokens || {};
  const typo = tokens.typography || {};
  const [heading, setHeading] = React.useState(typo.heading?.family ?? kit.fontFamily ?? 'Inter');
  const [body,    setBody]    = React.useState(typo.body?.family    ?? kit.fontFamily ?? 'Inter');
  const [caption, setCaption] = React.useState(typo.caption?.family ?? kit.fontFamily ?? 'Inter');
  const save = () => {
    detail.update({
      fontFamily: body,
      tokens: { ...tokens, typography: {
        heading: { family: heading, weight: typo.heading?.weight ?? 700 },
        body:    { family: body,    weight: typo.body?.weight    ?? 400 },
        caption: { family: caption, weight: typo.caption?.weight ?? 400 },
      } },
    });
  };
  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-bold text-[#111111]">Typography</h2>
      {([['Heading', heading, setHeading], ['Body', body, setBody], ['Caption', caption, setCaption]] as const).map(([label, value, set]) => (
        <div key={label}>
          <label className="block text-xs font-semibold text-[#111111] mb-1">{label} font</label>
          <input
            value={value}
            onChange={(e) => set(e.target.value)}
            placeholder="Inter, Roboto, Helvetica…"
            className="w-full h-8 px-2 text-sm border border-[#C9C6BD] rounded"
          />
          <div className="mt-1 text-sm" style={{ fontFamily: value }}>The quick brown fox jumps over the lazy dog.</div>
        </div>
      ))}
      <button onClick={save} className="px-3 py-1.5 text-xs font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded">
        Save typography
      </button>
    </div>
  );
};

const ChartsTab: React.FC<{ detail: ReturnType<typeof useBrandKit> }> = ({ detail }) => {
  const kit = detail.kit!;
  const tokens = kit.tokens || {};
  const palette = (tokens.chart?.palette || [
    tokens.colors?.primary, tokens.colors?.secondary, tokens.colors?.accent,
    tokens.colors?.warning, tokens.colors?.danger,
  ].filter(Boolean)) as string[];
  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-bold text-[#111111]">Chart palette</h2>
      <p className="text-xs text-[#9A9A9A]">
        Used as the default series colors when generating charts. Override per chart in the editor.
      </p>
      <div className="flex flex-wrap gap-2">
        {palette.length === 0 ? (
          <div className="text-xs text-[#9A9A9A] italic">No palette defined — defaults to primary/secondary/accent.</div>
        ) : palette.map((c, i) => (
          <div key={i} className="flex items-center gap-1 px-2 py-1 border border-[#E3E1DA] rounded">
            <span className="w-4 h-4 rounded" style={{ background: c }} />
            <span className="text-[10px] font-mono">{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const VoiceTab: React.FC<{ detail: ReturnType<typeof useBrandKit> }> = ({ detail }) => {
  const kit = detail.kit!;
  const v = kit.voice || {};
  const [tone, setTone]   = React.useState(v.tone || '');
  const [voice, setVoice] = React.useState(v.voice || '');
  const [rules, setRules] = React.useState((v.rules || []).join('\n'));
  const save = () => detail.update({ voice: { tone, voice, rules: rules.split('\n').map((r) => r.trim()).filter(Boolean) } });
  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-bold text-[#111111]">Brand voice</h2>
      <p className="text-xs text-[#9A9A9A]">
        Drives the generation pipeline's writing style. Set the tone (professional, friendly, executive, etc.) and any house rules.
      </p>
      <div>
        <label className="block text-xs font-semibold text-[#111111] mb-1">Tone</label>
        <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="professional" className="w-full h-8 px-2 text-sm border border-[#C9C6BD] rounded" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#111111] mb-1">Voice</label>
        <input value={voice} onChange={(e) => setVoice(e.target.value)} placeholder="executive, friendly, technical…" className="w-full h-8 px-2 text-sm border border-[#C9C6BD] rounded" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#111111] mb-1">House rules (one per line)</label>
        <textarea value={rules} onChange={(e) => setRules(e.target.value)} rows={5} className="w-full px-2 py-1.5 text-sm border border-[#C9C6BD] rounded resize-none font-mono text-xs" />
      </div>
      <button onClick={save} className="px-3 py-1.5 text-xs font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded">
        Save voice
      </button>
    </div>
  );
};

const AssetsTab: React.FC<{ detail: ReturnType<typeof useBrandKit> }> = ({ detail }) => {
  const kit = detail.kit!;
  const [kind, setKind] = React.useState<BrandAssetKind>('image');
  const [busy, setBusy] = React.useState(false);

  // Phase 37.1C — native file upload (no manual URL pasting).
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try { await detail.uploadAsset(file, kind); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-bold text-[#111111]">Assets</h2>
      <p className="text-xs text-[#9A9A9A]">Phase 37.1C — drop a file or click Browse to upload. The asset is stored automatically.</p>
      <div className="flex items-center gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as BrandAssetKind)} className="h-8 px-2 text-xs border border-[#C9C6BD] rounded">
          <option value="image">image</option>
          <option value="icon_mark">icon_mark</option>
          <option value="favicon">favicon</option>
        </select>
        <label className="flex-1 inline-flex items-center gap-2 px-2 py-1.5 border border-[#C9C6BD] rounded cursor-pointer hover:bg-[#EDEBE6] text-xs">
          <UploadIcon className="w-3 h-3 text-[#9A9A9A]" />
          {busy ? 'Uploading…' : 'Choose a file or drop here'}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])}
            className="hidden"
          />
        </label>
      </div>
      {kit.assets.length === 0 ? (
        <div className="text-xs text-[#9A9A9A] italic">No assets yet.</div>
      ) : (
        <ul className="space-y-1">
          {kit.assets.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-xs">
              <img src={a.url} alt={a.alt || ''} className="w-8 h-8 object-contain border border-[#E3E1DA] rounded bg-[#EDEBE6]" />
              <span className="font-mono text-[10px] uppercase text-[#9A9A9A]">{a.kind}</span>
              <span className="flex-1 truncate text-[#111111]">{a.url}</span>
              <button onClick={() => detail.removeAsset(a.id)} className="text-[10px] text-[#9a3737] hover:bg-[#FCF1F1] px-1.5 py-0.5 rounded">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// =============================================================================
//  Phase 37.1E — Export button (downloads brand-kit.json)
// =============================================================================
const ExportButton: React.FC<{ detail: ReturnType<typeof useBrandKit> }> = ({ detail }) => {
  const onClick = async () => {
    const payload = await detail.exportKit();
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${detail.kit?.name?.toLowerCase().replace(/\s+/g, '-') || 'brand-kit'}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      onClick={onClick}
      title="Download brand-kit.json"
      className="h-7 px-2 text-xs font-semibold border border-[#C9C6BD] hover:bg-[#EDEBE6] text-[#111111] rounded inline-flex items-center gap-1"
    >
      <Download className="w-3 h-3" /> Export
    </button>
  );
};

// =============================================================================
//  Phase 37.1E — Import button (uploads brand-kit.json → POST /brand-kits/import)
// =============================================================================
const ImportButton: React.FC = () => {
  const toast = useToast();
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const created = await importBrandKit(payload);
      window.location.href = `/brand-kits/${created.id}`;
    } catch (e: any) {
      toast.error(`Import failed: ${e?.message || e}`);
    }
  };
  return (
    <label
      title="Import a brand-kit.json file"
      className="h-7 px-2 text-xs font-semibold border border-[#C9C6BD] hover:bg-[#EDEBE6] text-[#111111] rounded inline-flex items-center gap-1 cursor-pointer"
    >
      <UploadIcon className="w-3 h-3" /> Import
      <input
        type="file"
        accept="application/json"
        onChange={(e) => onFile(e.target.files?.[0])}
        className="hidden"
      />
    </label>
  );
};

// =============================================================================
//  Phase 37.2C — Portable ZIP export (binaries + JSON)
// =============================================================================
const ExportZipButton: React.FC<{ kitId: string; kitName: string }> = ({ kitId, kitName }) => {
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();
  const onClick = async () => {
    setBusy(true);
    try {
      const res = await api.get(`/brand-kits/${kitId}/export-zip`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(kitName || 'brand-kit').toLowerCase().replace(/\s+/g, '-')}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(`Export ZIP failed: ${e?.response?.data?.message || e?.message || e}`);
    } finally { setBusy(false); }
  };
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title="Download brand-kit.zip (assets embedded)"
      className="h-7 px-2 text-xs font-semibold border border-[#C9C6BD] hover:bg-[#EDEBE6] text-[#111111] rounded inline-flex items-center gap-1 disabled:opacity-50"
    >
      <Archive className="w-3 h-3" /> {busy ? 'Zipping…' : 'Export ZIP'}
    </button>
  );
};

// =============================================================================
//  Phase 37.2C — Portable ZIP import
// =============================================================================
const ImportZipButton: React.FC = () => {
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/brand-kits/import-zip', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data?.id) window.location.href = `/brand-kits/${data.id}`;
    } catch (e: any) {
      toast.error(`Import ZIP failed: ${e?.response?.data?.message || e?.message || e}`);
    } finally { setBusy(false); }
  };
  return (
    <label
      title="Import a brand-kit.zip file"
      className={`h-7 px-2 text-xs font-semibold border border-[#C9C6BD] hover:bg-[#EDEBE6] text-[#111111] rounded inline-flex items-center gap-1 cursor-pointer ${busy ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <PackageOpen className="w-3 h-3" /> {busy ? 'Importing…' : 'Import ZIP'}
      <input
        type="file"
        accept="application/zip,.zip"
        onChange={(e) => onFile(e.target.files?.[0])}
        className="hidden"
      />
    </label>
  );
};

// =============================================================================
//  Phase 37.1F — Apply this brand kit to every deck in the workspace
// =============================================================================
const BatchApplyButton: React.FC<{
  detail: ReturnType<typeof useBrandKit>;
  workspaceId: string | null;
}> = ({ detail, workspaceId }) => {
  const [busy, setBusy] = React.useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  if (!workspaceId) return null;
  const onClick = async () => {
    if (!(await confirm({ title: 'Apply to every deck?', message: 'This brand kit\'s tokens will overwrite every deck in the workspace.', confirmLabel: 'Apply to all', tone: 'warning' }))) return;
    setBusy(true);
    try {
      const res = await detail.applyToMany({ workspaceId });
      if (res) toast.success(`Applied to ${res.applied} deck${res.applied === 1 ? '' : 's'}.`);
    } finally { setBusy(false); }
  };
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title="Apply to every deck in this workspace"
      className="h-7 px-2 text-xs font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded inline-flex items-center gap-1 disabled:opacity-50"
    >
      <Share2 className="w-3 h-3" /> {busy ? 'Applying…' : 'Apply to workspace'}
    </button>
  );
};
