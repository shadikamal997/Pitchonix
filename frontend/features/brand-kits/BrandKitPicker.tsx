'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Palette, Check, Loader2, X, Plus, Eye, Sparkles, Trash2,
  ChevronDown, ExternalLink,
} from 'lucide-react';
import { useMyBrandKits } from './useBrandKits';
import api from '@/lib/api';
import { BrandPreviewWall } from './BrandPreviewWall';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmDialog';

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
  const toast = useToast();
  const onApplyError = (msg: string) => toast.error(msg);
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
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[95vw] bg-white border border-[#E3E1DA] rounded-xl shadow-2xl z-50 overflow-hidden">
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
              await handleApply(props, kit, onApplyError);
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
  const toast = useToast();
  const onApplyError = (msg: string) => toast.error(msg);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const current = previewId ?? props.value;

  return (
    <div className={`bg-white border border-[#E3E1DA] rounded-xl ${props.className || ''}`}>
      <PickerHeader currentKitName={items.find((k) => k.id === props.value)?.name || null} />
      <PickerBody
        items={items}
        loading={loading}
        previewId={current}
        onPreview={setPreviewId}
        onClear={() => handleClear(props)}
        onApply={(kit) => handleApply(props, kit, onApplyError)}
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
        className={`inline-flex items-center gap-2 ${compact ? 'h-7 px-2 text-xs' : 'h-9 px-3 text-sm'} border border-[#C9C6BD] hover:border-purple-400 hover:bg-[#EEF5F1]/40 bg-white text-[#111111] font-semibold rounded-lg`}
      >
        <span className="inline-flex items-center gap-1">
          <span
            className="w-3.5 h-3.5 rounded-sm border border-[#C9C6BD]"
            style={{ background: selected.primaryColor || selected.tokens?.colors?.primary || '#8B5CF6' }}
          />
          {selected.secondaryColor && (
            <span
              className="w-3.5 h-3.5 rounded-sm border border-[#C9C6BD] -ml-1"
              style={{ background: selected.secondaryColor }}
            />
          )}
        </span>
        <span className="truncate max-w-[140px]">Brand: {selected.name}</span>
        {selected.isDefault && (
          <span className="text-[9px] font-bold tracking-wide uppercase bg-[#DDE8E1] text-[#263F34] px-1 py-0.5 rounded">Default</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-[#9A9A9A] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title="Choose a brand kit to apply"
      className={`inline-flex items-center gap-1.5 ${compact ? 'h-7 px-2 text-xs' : 'h-9 px-3 text-sm'} bg-white border border-[#C9C6BD] hover:border-purple-400 hover:bg-[#EEF5F1] text-[#111111] font-semibold rounded-lg`}
    >
      <Palette className="w-3.5 h-3.5 text-[#4F7563]" />
      {emptyLabel}
      <ChevronDown className={`w-3.5 h-3.5 text-[#9A9A9A] transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
};

// =============================================================================
//  Picker header (used by both layouts)
// =============================================================================
const PickerHeader: React.FC<{ currentKitName: string | null; onClose?: () => void }> = ({ currentKitName, onClose }) => (
  <div className="px-4 py-2.5 border-b border-[#F1F0EC] bg-white">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Palette className="w-3.5 h-3.5 text-[#4F7563]" />
        <span className="text-xs font-bold text-[#111111]">Brand Kit</span>
        {currentKitName ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#EEF5F1] border border-[#DDE8E1] rounded text-[10px] font-semibold text-[#355846]">
            <Check className="w-2.5 h-2.5" /> {currentKitName}
          </span>
        ) : (
          <span className="text-[10px] text-[#C9C6BD]">None applied</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <a
          href="/brand-kits"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-[#4F7563] hover:underline inline-flex items-center gap-1"
        >
          Manage <ExternalLink className="w-3 h-3" />
        </a>
        {onClose && (
          <button onClick={onClose} className="text-[#C9C6BD] hover:text-[#111111]"><X className="w-4 h-4" /></button>
        )}
      </div>
    </div>
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
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [wallKit, setWallKit] = useState<BrandKitLite | null>(null);
  const selectedKit = items.find((k) => k.id === previewId) || null;

  if (loading) {
    return (
      <div className="px-4 py-8 text-xs text-[#9A9A9A] flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading brand kits…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <Palette className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <div className="text-sm font-semibold text-[#111111] mb-1">No brand kits yet</div>
        <p className="text-xs text-[#9A9A9A] mb-3">Create one to brand your decks, PDFs and CVs.</p>
        <a
          href="/brand-kits"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846]"
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
    if (!(await confirm({ title: 'Remove brand kit?', message: 'Existing styling stays in place but the kit will no longer be linked to this work.', confirmLabel: 'Remove', tone: 'warning' }))) return;
    setBusy(true);
    try { await onClear(); } finally { setBusy(false); }
  };

  return (
    <div>
      {/* No-kit row */}
      <button
        type="button"
        onClick={() => onPreview(null)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-[#F1F0EC] text-left transition-colors ${previewId === null ? 'bg-[#F1F0EC]' : 'hover:bg-[#F8F7F4]'}`}
      >
        <div className="w-9 h-9 rounded-lg border-2 border-dashed border-[#D4D2CB] flex items-center justify-center bg-white">
          <X className="w-3.5 h-3.5 text-[#C9C6BD]" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-[#111111]">No brand kit</div>
          <div className="text-[10px] text-[#9A9A9A]">Use built-in template styling</div>
        </div>
        {previewId === null && <Check className="w-4 h-4 text-[#4F7563]" />}
      </button>

      {/* Kit cards */}
      <div className="max-h-[360px] overflow-y-auto">
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
      <div className="px-3 py-2.5 border-t border-[#F1F0EC] bg-[#F8F7F4] flex items-center gap-2">
        {currentValue && (
          <button
            type="button"
            onClick={doClear}
            disabled={busy}
            className="h-7 px-2 text-[11px] font-semibold text-[#9a3737] hover:bg-[#FCF1F1] rounded inline-flex items-center gap-1 disabled:opacity-40"
          >
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        )}
        <div className="flex-1" />
        {selectedKit && (
          <button
            type="button"
            onClick={() => setWallKit(selectedKit)}
            className="h-7 px-2.5 text-[11px] font-semibold border border-[#D4D2CB] hover:border-[#9A9A9A] bg-white text-[#6B6B6B] hover:text-[#111111] rounded inline-flex items-center gap-1.5 transition-colors"
            title="See how this kit looks across all document types"
          >
            <Eye className="w-3 h-3" /> Preview
          </button>
        )}
        <button
          type="button"
          onClick={doApply}
          disabled={busy || (previewId === currentValue) || !selectedKit}
          className="h-7 px-3 text-[11px] font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846] inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors shadow-sm"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {mode === 'apply' ? 'Apply Kit' : 'Use kit'}
        </button>
      </div>
      {wallKit && (
        <BrandPreviewWall
          kit={wallKit}
          onCancel={() => setWallKit(null)}
          onConfirm={async () => { setWallKit(null); await doApply(); }}
        />
      )}
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
  const accent    = kit.tokens?.colors?.accent || null;
  const headingFont = kit.tokens?.typography?.heading?.family || kit.fontFamily || 'Inter';
  const bodyFont    = kit.tokens?.typography?.body?.family    || kit.fontFamily || 'Inter';
  const sameFonts   = headingFont === bodyFont;

  // Build palette strips — always show primary + secondary; add accent if distinct
  const paletteColors = [primary, secondary, ...(accent && accent !== primary && accent !== secondary ? [accent] : [])];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border-b border-[#F1F0EC] text-left transition-colors focus:outline-none ${
        isPreview
          ? 'bg-[#EEF5F1] ring-1 ring-inset ring-[#4F7563]/30'
          : 'hover:bg-[#F8F7F4]'
      }`}
    >
      {/* Full-width color palette strip */}
      <div className="flex h-[6px] w-full overflow-hidden">
        {paletteColors.map((c, i) => (
          <div
            key={i}
            style={{ background: c, flex: i === 0 ? 2 : 1 }}
          />
        ))}
      </div>

      {/* Card body */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Logo avatar */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg shadow-sm flex items-center justify-center overflow-hidden border border-black/10"
          style={{ background: primary }}
        >
          {kit.logo ? (
            <img src={kit.logo} alt="" className="max-w-[36px] max-h-[36px] object-contain" />
          ) : (
            <span className="text-white font-bold text-base select-none" style={{ fontFamily: headingFont }}>
              {kit.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + badges */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[13px] font-bold text-[#111111] truncate">{kit.name}</span>
            {kit.isDefault && (
              <span className="flex-shrink-0 text-[9px] font-bold tracking-wide uppercase bg-[#DDE8E1] text-[#263F34] px-1.5 py-0.5 rounded-full">
                Default
              </span>
            )}
            {isCurrent && (
              <span className="flex-shrink-0 text-[9px] font-bold uppercase bg-[#4F7563] text-white px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                <Check className="w-2 h-2" /> Applied
              </span>
            )}
          </div>

          {/* Row 2: color chips + hex */}
          <div className="flex items-center gap-1">
            {paletteColors.map((c, i) => (
              <span
                key={i}
                className="w-3.5 h-3.5 rounded-sm ring-1 ring-black/10 flex-shrink-0"
                style={{ background: c }}
                title={c}
              />
            ))}
            <span className="text-[10px] font-mono text-[#9A9A9A] ml-1 truncate">{primary}</span>
          </div>

          {/* Row 3: typography */}
          <div className="flex items-baseline gap-1.5 mt-1">
            <span
              className="text-[12px] font-bold text-[#111111] leading-none"
              style={{ fontFamily: headingFont }}
            >
              Aa
            </span>
            <span className="text-[10px] text-[#9A9A9A] truncate">
              {sameFonts ? headingFont : `${headingFont} / ${bodyFont}`}
            </span>
          </div>
        </div>

        {/* Selected indicator */}
        {isPreview && (
          <div className="flex-shrink-0">
            <div className="w-5 h-5 rounded-full bg-[#4F7563] flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

// =============================================================================
//  Shared apply/clear handlers
// =============================================================================
async function handleApply(props: Props, kit: BrandKitLite | null, onError?: (msg: string) => void) {
  if (props.mode === 'apply') {
    if (!kit) return;
    try {
      await api.post(`/brand-kits/${kit.id}/apply/${props.deckId}`);
      await props.onApplied?.(kit.id, kit);
    } catch (e: any) {
      // Phase Ω.3 — surface via inline toast (callback supplied by hook) instead of window.alert.
      onError?.(`Apply failed: ${e?.response?.data?.message || e?.message || e}`);
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
    <span className={`inline-flex items-center gap-1.5 ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'} bg-[#EEF5F1] border border-[#DDE8E1] text-purple-900 font-semibold rounded-full`}>
      <span className="w-2.5 h-2.5 rounded-sm border border-white shadow-sm" style={{ background: primary }} />
      Brand: {resolved.name}
      {onChange && (
        <button onClick={onChange} className="text-[#4F7563] hover:underline ml-0.5">change</button>
      )}
      {onRemove && (
        <button onClick={onRemove} className="text-[#9a3737] hover:underline">remove</button>
      )}
    </span>
  );
};
