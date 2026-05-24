'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Palette, Check, Loader2, X, Plus, Eye, Sparkles, Trash2,
  ChevronDown, ExternalLink,
} from 'lucide-react';
import { useMyBrandKits } from './useBrandKits';
import api from '@/lib/api';

// =============================================================================
//  Phase 37.3A — BrandKitPicker (canonical)
//
//  The single reusable Brand Kit chooser. Two layouts share one core:
//
//    variant="dropdown"  → compact trigger button + popover (toolbar usage)
//    variant="grid"      → inline card grid (wizard steps, modal bodies)
//
//  Two operating modes (independent of layout):
//
//    mode="select"  → fires onSelect(id, kit). Caller persists/exports.
//    mode="apply"   → calls POST /brand-kits/:kitId/apply/:deckId then
//                      fires onApplied. Used by deck-bound surfaces.
//
//  Each kit card renders: logo, name, default badge, primary+secondary
//  swatches, heading-font sample ("Aa"), body-font sample, typography
//  preview line. Click → highlights (preview). Apply confirms.
//  "Clear brand kit" asks before stripping a previously-applied kit.
// =============================================================================

export type BrandKitPickerVariant = 'dropdown' | 'grid';
export type BrandKitPickerMode    = 'select' | 'apply';

interface CommonProps {
  /** Currently-applied / currently-selected brand kit id (null = none). */
  value:    string | null;
  /** Compact label shown when no kit is chosen. */
  emptyLabel?: string;
  /** Renders the trigger smaller (for tight toolbars). */
  compact?: boolean;
  className?: string;
}

interface SelectModeProps extends CommonProps {
  mode:    'select';
  onSelect: (kitId: string | null, kit: BrandKitLite | null) => void | Promise<void>;
}

interface ApplyModeProps extends CommonProps {
  mode:    'apply';
  deckId:  string;
  onApplied?: (kitId: string | null, kit: BrandKitLite | null) => void | Promise<void>;
}

export interface BrandKitLite {
  id: string;
  name: string;
  primaryColor?:   string | null;
  secondaryColor?: string | null;
  logo?:           string | null;
  fontFamily?:     string | null;
  isDefault?:      boolean;
  // `tokens` is `Record<string, any> | null` in the DTO; we don't care about
  // the shape past colors/typography.
  tokens?:         any | null;
}

type Props = (SelectModeProps | ApplyModeProps) & { variant?: BrandKitPickerVariant };

// =============================================================================
//  Dropdown shell
// =============================================================================
export const BrandKitPicker: React.FC<Props> = (props) => {
  const variant = props.variant || 'dropdown';
  return variant === 'grid'
    ? <BrandKitPickerGrid {...props} />
    : <BrandKitPickerDropdown {...props} />;
};

// -----------------------------------------------------------------------------
//  Dropdown layout (for editor toolbars, deck cards, builder headers)
// -----------------------------------------------------------------------------
const BrandKitPickerDropdown: React.FC<Props> = (props) => {
  const { items, loading } = useMyBrandKits();
  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const selected = items.find((k) => k.id === props.value) || null;

  return (
    <div ref={ref} className={`relative ${props.className || ''}`}>
      <TriggerButton
        selected={selected}
        emptyLabel={props.emptyLabel || 'Choose Brand Kit'}
        compact={!!props.compact}
        open={open}
        onClick={() => setOpen((v) => !v)}
      />

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[420px] max-w-[95vw] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
          <PickerHeader
            currentKitName={selected?.name || null}
            onClose={() => setOpen(false)}
          />
          <PickerBody
            items={items}
            loading={loading}
            previewId={previewId ?? props.value}
            onPreview={setPreviewId}
            onClear={async () => {
              await handleClear(props);
              setOpen(false);
            }}
            onApply={async (kit) => {
              await handleApply(props, kit);
              setOpen(false);
            }}
            currentValue={props.value}
            mode={props.mode}
          />
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
//  Grid layout (for wizard steps, modal bodies, conversion options)
// -----------------------------------------------------------------------------
const BrandKitPickerGrid: React.FC<Props> = (props) => {
  const { items, loading } = useMyBrandKits();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const current = previewId ?? props.value;

  return (
    <div className={`bg-white border border-slate-200 rounded-xl ${props.className || ''}`}>
      <PickerHeader currentKitName={items.find((k) => k.id === props.value)?.name || null} />
      <PickerBody
        items={items}
        loading={loading}
        previewId={current}
        onPreview={setPreviewId}
        onClear={() => handleClear(props)}
        onApply={(kit) => handleApply(props, kit)}
        currentValue={props.value}
        mode={props.mode}
      />
    </div>
  );
};

// =============================================================================
//  Trigger button (used by dropdown)
// =============================================================================
const TriggerButton: React.FC<{
  selected:    BrandKitLite | null;
  emptyLabel:  string;
  compact:     boolean;
  open:        boolean;
  onClick:     () => void;
}> = ({ selected, emptyLabel, compact, open, onClick }) => {
  if (selected) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={`Brand Kit: ${selected.name} — click to change or clear`}
        className={`inline-flex items-center gap-2 ${compact ? 'h-7 px-2 text-xs' : 'h-9 px-3 text-sm'} border border-slate-300 hover:border-purple-400 hover:bg-purple-50/40 bg-white text-slate-800 font-semibold rounded-lg`}
      >
        <span className="inline-flex items-center gap-1">
          <span
            className="w-3.5 h-3.5 rounded-sm border border-slate-300"
            style={{ background: selected.primaryColor || selected.tokens?.colors?.primary || '#8B5CF6' }}
          />
          {selected.secondaryColor && (
            <span
              className="w-3.5 h-3.5 rounded-sm border border-slate-300 -ml-1"
              style={{ background: selected.secondaryColor }}
            />
          )}
        </span>
        <span className="truncate max-w-[140px]">Brand: {selected.name}</span>
        {selected.isDefault && (
          <span className="text-[9px] font-bold tracking-wide uppercase bg-blue-100 text-blue-800 px-1 py-0.5 rounded">Default</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title="Choose a brand kit to apply"
      className={`inline-flex items-center gap-1.5 ${compact ? 'h-7 px-2 text-xs' : 'h-9 px-3 text-sm'} bg-white border border-slate-300 hover:border-purple-400 hover:bg-purple-50 text-slate-700 font-semibold rounded-lg`}
    >
      <Palette className="w-3.5 h-3.5 text-purple-600" />
      {emptyLabel}
      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
};

// =============================================================================
//  Picker header (used by both layouts)
// =============================================================================
const PickerHeader: React.FC<{ currentKitName: string | null; onClose?: () => void }> = ({ currentKitName, onClose }) => (
  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-700">Brand Kit</div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          {currentKitName ? <>Currently applied: <strong className="text-slate-700">{currentKitName}</strong></> : 'No brand kit applied yet.'}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href="/brand-kits"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          Manage <ExternalLink className="w-3 h-3" />
        </a>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        )}
      </div>
    </div>
    {/* Phase Ω.2 — clarify the "Default" semantic. Users have been confused
        whether the default kit auto-applies; it does not, by design. */}
    <p className="text-[10px] text-slate-400 mt-1.5 italic">
      The <span className="font-semibold text-slate-500">Default</span> badge is a preference label only — kits are never applied automatically. Pick one explicitly to apply.
    </p>
  </div>
);

// =============================================================================
//  Picker body — kit cards + actions
// =============================================================================
const PickerBody: React.FC<{
  items:        BrandKitLite[];
  loading:      boolean;
  previewId:    string | null;
  currentValue: string | null;
  onPreview:    (id: string | null) => void;
  onClear:      () => void | Promise<void>;
  onApply:      (kit: BrandKitLite | null) => void | Promise<void>;
  mode:         BrandKitPickerMode;
}> = ({ items, loading, previewId, currentValue, onPreview, onClear, onApply, mode }) => {
  const [busy, setBusy] = useState(false);
  const selectedKit = items.find((k) => k.id === previewId) || null;

  if (loading) {
    return (
      <div className="px-4 py-8 text-xs text-slate-500 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading brand kits…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <Palette className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <div className="text-sm font-semibold text-slate-700 mb-1">No brand kits yet</div>
        <p className="text-xs text-slate-500 mb-3">Create one to brand your decks, PDFs and CVs.</p>
        <a
          href="/brand-kits"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-3 h-3" /> Create brand kit
        </a>
      </div>
    );
  }

  const doApply = async () => {
    if (!selectedKit) return;
    setBusy(true);
    try { await onApply(selectedKit); } finally { setBusy(false); }
  };

  const doClear = async () => {
    if (!currentValue) return;
    if (!window.confirm('Remove the brand kit from this work? Existing styling stays in place but the kit will no longer be linked.')) return;
    setBusy(true);
    try { await onClear(); } finally { setBusy(false); }
  };

  return (
    <div>
      {/* No-kit row */}
      <button
        type="button"
        onClick={() => onPreview(null)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 text-left hover:bg-slate-50 ${previewId === null ? 'bg-slate-50' : ''}`}
      >
        <div className="w-8 h-8 rounded border border-dashed border-slate-300 flex items-center justify-center">
          <X className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-slate-700">No brand kit</div>
          <div className="text-[10px] text-slate-500">Use built-in default styling.</div>
        </div>
        {previewId === null && <Check className="w-4 h-4 text-blue-600" />}
      </button>

      {/* Kit cards */}
      <div className="max-h-[320px] overflow-y-auto">
        {items.map((k) => (
          <BrandKitCard
            key={k.id}
            kit={k}
            isPreview={previewId === k.id}
            isCurrent={currentValue === k.id}
            onClick={() => onPreview(k.id)}
          />
        ))}
      </div>

      {/* Action bar */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2 bg-slate-50/60">
        {currentValue && (
          <button
            type="button"
            onClick={doClear}
            disabled={busy}
            className="h-8 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 rounded inline-flex items-center gap-1 disabled:opacity-40"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        )}
        <div className="flex-1" />
        <span className="text-[10px] text-slate-500 inline-flex items-center gap-1">
          <Eye className="w-3 h-3" /> {selectedKit ? selectedKit.name : 'None'} — preview
        </span>
        <button
          type="button"
          onClick={doApply}
          disabled={busy || (previewId === currentValue) || !selectedKit}
          className="h-8 px-3 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-1 disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {mode === 'apply' ? 'Apply Brand Kit' : 'Use this kit'}
        </button>
      </div>
    </div>
  );
};

// =============================================================================
//  Individual brand-kit card with preview
// =============================================================================
const BrandKitCard: React.FC<{
  kit:       BrandKitLite;
  isPreview: boolean;
  isCurrent: boolean;
  onClick:   () => void;
}> = ({ kit, isPreview, isCurrent, onClick }) => {
  const primary   = kit.primaryColor   || kit.tokens?.colors?.primary   || '#8B5CF6';
  const secondary = kit.secondaryColor || kit.tokens?.colors?.secondary || '#06B6D4';
  const headingFont = kit.tokens?.typography?.heading?.family || kit.fontFamily || 'Inter';
  const bodyFont    = kit.tokens?.typography?.body?.family    || kit.fontFamily || 'Inter';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-stretch gap-3 px-4 py-3 border-b border-slate-100 text-left hover:bg-slate-50 transition-colors ${isPreview ? 'bg-blue-50/40 ring-1 ring-inset ring-blue-200' : ''}`}
    >
      {/* Logo / color preview block */}
      <div className="flex-shrink-0 w-12 h-12 rounded-md border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center" style={{ background: primary }}>
        {kit.logo ? (
          <img src={kit.logo} alt="" className="max-w-[44px] max-h-[44px] object-contain" />
        ) : (
          <span className="text-white font-bold text-lg" style={{ fontFamily: headingFont }}>
            {kit.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-sm font-bold text-slate-900 truncate">{kit.name}</div>
          {kit.isDefault && (
            <span className="text-[9px] font-bold tracking-wide uppercase bg-blue-100 text-blue-800 px-1 py-0.5 rounded">Default</span>
          )}
          {isCurrent && (
            <span className="text-[9px] font-bold tracking-wide uppercase bg-green-100 text-green-800 px-1 py-0.5 rounded inline-flex items-center gap-0.5">
              <Check className="w-2.5 h-2.5" /> Applied
            </span>
          )}
        </div>
        {/* color row */}
        <div className="flex items-center gap-1 mb-1">
          <span className="w-4 h-4 rounded-sm border border-slate-300" style={{ background: primary }} title={`Primary ${primary}`} />
          <span className="w-4 h-4 rounded-sm border border-slate-300" style={{ background: secondary }} title={`Secondary ${secondary}`} />
          {kit.tokens?.colors?.accent && (
            <span className="w-4 h-4 rounded-sm border border-slate-300" style={{ background: kit.tokens.colors.accent }} title={`Accent ${kit.tokens.colors.accent}`} />
          )}
          <span className="text-[10px] font-mono text-slate-400 ml-1">{primary}</span>
        </div>
        {/* typography preview */}
        <div className="text-[11px] text-slate-600 truncate" style={{ fontFamily: bodyFont }}>
          <strong style={{ fontFamily: headingFont }}>Aa</strong> · {headingFont} / {bodyFont}
        </div>
      </div>

      {isPreview && (
        <div className="flex-shrink-0 flex items-center pr-1">
          <Eye className="w-4 h-4 text-blue-600" />
        </div>
      )}
    </button>
  );
};

// =============================================================================
//  Shared apply/clear handlers
// =============================================================================
async function handleApply(props: Props, kit: BrandKitLite | null) {
  if (props.mode === 'apply') {
    if (!kit) return;
    try {
      await api.post(`/brand-kits/${kit.id}/apply/${props.deckId}`);
      await props.onApplied?.(kit.id, kit);
    } catch (e: any) {
      window.alert(`Apply failed: ${e?.response?.data?.message || e?.message || e}`);
    }
  } else {
    await props.onSelect(kit?.id ?? null, kit);
  }
}

async function handleClear(props: Props) {
  if (props.mode === 'apply') {
    await props.onApplied?.(null, null);
  } else {
    await props.onSelect(null, null);
  }
}

// =============================================================================
//  Brand-Kit Badge — a small badge to display "Brand: <name>" anywhere.
//  Use on deck cards, doc headers, conversion jobs, export dialogs, etc.
// =============================================================================
export const BrandKitBadge: React.FC<{
  kit?:        BrandKitLite | null;
  kitId?:      string | null;
  onChange?:   () => void;
  onRemove?:   () => void;
  compact?:    boolean;
}> = ({ kit, kitId, onChange, onRemove, compact }) => {
  const { items } = useMyBrandKits();
  const resolved = kit || (kitId ? (items.find((k) => k.id === kitId) || null) : null);
  if (!resolved) return null;
  const primary = resolved.primaryColor || resolved.tokens?.colors?.primary || '#8B5CF6';
  return (
    <span className={`inline-flex items-center gap-1.5 ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'} bg-purple-50 border border-purple-200 text-purple-900 font-semibold rounded-full`}>
      <span className="w-2.5 h-2.5 rounded-sm border border-white shadow-sm" style={{ background: primary }} />
      Brand: {resolved.name}
      {onChange && (
        <button onClick={onChange} className="text-purple-600 hover:underline ml-0.5">change</button>
      )}
      {onRemove && (
        <button onClick={onRemove} className="text-red-600 hover:underline">remove</button>
      )}
    </span>
  );
};
