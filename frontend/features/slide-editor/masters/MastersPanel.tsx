'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import {
  PanelSection, Row, TextField, NumberField, ColorField,
} from '../inspector/Primitives';
import { useDeckMasters } from './useDeckMasters';
import type {
  MasterElementDTO, MasterElementType, DeckMasterSettings,
} from '@/types/master-element';

// =============================================================================
//  MastersPanel — Phase 32.75
//
//  Sidebar pane for managing the deck-wide master elements. Mirrors the
//  inspector aesthetic (PanelSection + Row + dense inputs).
//
//  Layout:
//    1. Global toggles  — show/hide an entire master family deck-wide
//    2. Master list     — one row per master with quick visibility + delete
//    3. Add menu        — pick a family to add (auto-positions to a sensible
//                         default geometry from `useDeckMasters`)
//    4. Inspector       — when a master is selected, edit its fields
// =============================================================================

const CORE_TYPES: { type: MasterElementType; label: string }[] = [
  { type: 'logo',          label: 'Logo' },
  { type: 'companyName',   label: 'Company name' },
  { type: 'header',        label: 'Header' },
  { type: 'footer',        label: 'Footer' },
  { type: 'pageNumber',    label: 'Page number' },
  { type: 'date',          label: 'Date' },
  { type: 'copyright',     label: 'Copyright' },
  { type: 'watermark',     label: 'Watermark' },
  { type: 'confidential',  label: 'Confidential' },
  { type: 'brandBanner',   label: 'Brand banner' },
  { type: 'contact',       label: 'Contact' },
  { type: 'backgroundShape', label: 'Background shape' },
  { type: 'backgroundImage', label: 'Background image' },
  { type: 'custom',        label: 'Custom' },
];

const SETTING_TOGGLES: { key: keyof DeckMasterSettings; label: string }[] = [
  { key: 'showLogo',        label: 'Logos' },
  { key: 'showHeader',      label: 'Headers' },
  { key: 'showFooter',      label: 'Footers' },
  { key: 'showPageNumbers', label: 'Page numbers' },
  { key: 'showDate',        label: 'Dates' },
  { key: 'showWatermark',   label: 'Watermarks' },
];

interface Props {
  deckId: string;
}

export const MastersPanel: React.FC<Props> = ({ deckId }) => {
  const {
    masters, settings, loading, error,
    create, update, remove, setSettings,
  } = useDeckMasters(deckId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen]       = useState(false);

  const selected = masters.find((m) => m.id === selectedId) || null;

  return (
    <div className="text-xs">
      {error && (
        <div className="px-3 py-2 bg-[#FCF1F1] text-[#7a2929] border-b border-red-100 text-[11px]">{error}</div>
      )}

      <PanelSection title="Deck-wide visibility">
        {SETTING_TOGGLES.map(({ key, label }) => (
          <Row key={key} label={label}>
            <ToggleSwitch
              value={settings[key] !== false}
              onChange={(v) => setSettings({ [key]: v })}
            />
          </Row>
        ))}
      </PanelSection>

      <PanelSection title={`Masters (${masters.length})`}>
        {masters.length === 0 && !loading && (
          <div className="text-[11px] text-[#9A9A9A] italic">No master elements yet.</div>
        )}
        {masters.map((m) => (
          <MasterRow
            key={m.id}
            master={m}
            selected={m.id === selectedId}
            onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
            onToggleVisible={() => update(m.id, { visible: !m.visible })}
            onDelete={() => {
              if (confirm(`Delete master "${m.name || m.type}"?`)) {
                remove(m.id);
                if (selectedId === m.id) setSelectedId(null);
              }
            }}
          />
        ))}

        <div className="pt-2">
          {addOpen ? (
            <div className="space-y-1.5 bg-[#EDEBE6] border border-[#E3E1DA] rounded p-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A]">Add master</div>
              <div className="grid grid-cols-2 gap-1">
                {CORE_TYPES.map(({ type, label }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={async () => {
                      const created = await create(type);
                      setAddOpen(false);
                      if (created) setSelectedId(created.id);
                    }}
                    className="h-7 text-[11px] bg-white hover:bg-[#F1F0EC] border border-[#E3E1DA] rounded px-2 text-left text-[#111111] truncate"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="w-full h-7 text-[11px] text-[#9A9A9A] hover:text-[#111111]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 h-7 text-[11px] bg-[#EDEBE6] hover:bg-[#F1F0EC] border border-[#E3E1DA] rounded text-[#111111]"
            >
              <Plus className="w-3 h-3" />
              Add master
            </button>
          )}
        </div>
      </PanelSection>

      {selected && (
        <MasterInspector
          master={selected}
          onPatch={(patch) => update(selected.id, patch)}
        />
      )}
    </div>
  );
};

// =============================================================================
//  Sub-components
// =============================================================================

const MasterRow: React.FC<{
  master: MasterElementDTO;
  selected: boolean;
  onClick: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
}> = ({ master, selected, onClick, onToggleVisible, onDelete }) => (
  <div
    className={`flex items-center gap-1.5 h-7 px-1.5 rounded border ${
      selected ? 'bg-[#EEF5F1] border-[#A8B9AE]' : 'bg-white border-[#E3E1DA] hover:bg-[#EDEBE6]'
    }`}
  >
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
      className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C9C6BD] hover:text-[#111111]"
      title={master.visible ? 'Hide' : 'Show'}
    >
      {master.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
    </button>
    <button
      type="button"
      onClick={onClick}
      className="flex-1 text-left text-[11px] text-[#111111] truncate min-w-0"
    >
      <span className="font-medium">{labelFor(master.type)}</span>
      {master.name && <span className="text-[#9A9A9A]"> — {master.name}</span>}
    </button>
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onDelete(); }}
      className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C9C6BD] hover:text-[#9a3737]"
      title="Delete"
    >
      <Trash2 className="w-3 h-3" />
    </button>
  </div>
);

const MasterInspector: React.FC<{
  master:   MasterElementDTO;
  onPatch:  (patch: Partial<MasterElementDTO>) => void;
}> = ({ master, onPatch }) => {
  const data = master.elementData || {};
  const setData = (patch: any) => onPatch({ elementData: { ...data, ...patch } });
  const style = (master.style || {}) as any;
  const setStyle = (patch: any) => onPatch({ style: { ...style, ...patch } });

  return (
    <>
      <PanelSection title={`Edit · ${labelFor(master.type)}`}>
        <Row label="Name">
          <TextField
            value={master.name ?? ''}
            onChange={(v) => onPatch({ name: v || null })}
            placeholder="(optional label)"
          />
        </Row>

        {/* Type-specific fields */}
        {hasTextContent(master.type) && (
          <Row label="Text">
            <TextField
              value={data.text ?? ''}
              onChange={(v) => setData({ text: v })}
              placeholder={textPlaceholder(master.type)}
            />
          </Row>
        )}
        {master.type === 'logo' || master.type === 'backgroundImage' ? (
          <Row label="URL">
            <TextField
              value={data.src ?? ''}
              onChange={(v) => setData({ src: v })}
              placeholder="https://…"
            />
          </Row>
        ) : null}
        {master.type === 'pageNumber' && (
          <Row label="Format">
            <select
              value={data.format ?? 'pageOfTotal'}
              onChange={(e) => setData({ format: e.target.value })}
              className="flex-1 h-7 bg-[#EDEBE6] border border-[#E3E1DA] rounded px-2 text-xs"
            >
              <option value="pageOfTotal">N / total</option>
              <option value="page">N</option>
            </select>
          </Row>
        )}
        {master.type === 'watermark' && (
          <Row label="Opacity">
            <NumberField
              value={data.opacity ?? 0.08}
              min={0} max={1} step={0.01}
              onChange={(v) => setData({ opacity: v })}
            />
          </Row>
        )}
      </PanelSection>

      <PanelSection title="Position">
        <Row label="X / Y">
          <NumberField value={master.x} onChange={(v) => onPatch({ x: v })} min={0} max={100} suffix="%" />
          <NumberField value={master.y} onChange={(v) => onPatch({ y: v })} min={0} max={100} suffix="%" />
        </Row>
        <Row label="W / H">
          <NumberField value={master.width}  onChange={(v) => onPatch({ width: v })}  min={1} max={100} suffix="%" />
          <NumberField value={master.height} onChange={(v) => onPatch({ height: v })} min={1} max={100} suffix="%" />
        </Row>
        <Row label="Rotate">
          <NumberField value={master.rotation} onChange={(v) => onPatch({ rotation: v })} min={-180} max={180} suffix="°" />
        </Row>
        <Row label="Z-order">
          <ToggleSwitch
            value={master.sendToFront}
            onChange={(v) => onPatch({ sendToFront: v })}
          />
          <span className="text-[10px] text-[#9A9A9A]">{master.sendToFront ? 'On top of content' : 'Behind content'}</span>
        </Row>
      </PanelSection>

      <PanelSection title="Style">
        <Row label="Color">
          <ColorField value={style.color ?? ''} onChange={(v) => setStyle({ color: v })} />
        </Row>
        <Row label="Font size">
          <NumberField value={style.fontSize ?? 12} min={6} max={144} onChange={(v) => setStyle({ fontSize: v })} suffix="px" />
        </Row>
      </PanelSection>
    </>
  );
};

const ToggleSwitch: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full transition ${
      value ? 'bg-[#4F7563]' : 'bg-slate-300'
    }`}
  >
    <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition ${value ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
  </button>
);

// =============================================================================
//  Display helpers
// =============================================================================
function labelFor(type: MasterElementType): string {
  return CORE_TYPES.find((t) => t.type === type)?.label || type;
}

function hasTextContent(type: MasterElementType): boolean {
  return [
    'companyName', 'header', 'footer', 'date', 'copyright',
    'watermark', 'brandBanner', 'contact', 'confidential', 'custom',
  ].includes(type);
}

function textPlaceholder(type: MasterElementType): string {
  switch (type) {
    case 'footer':       return 'pitchonix.com  ·  {date}';
    case 'header':       return 'Series A · Confidential';
    case 'watermark':    return 'DRAFT';
    case 'confidential': return 'CONFIDENTIAL';
    case 'copyright':    return '© 2026';
    case 'companyName':  return 'Pitchonix';
    case 'contact':      return 'hello@pitchonix.com';
    case 'brandBanner':  return 'New series · Q4 2026';
    default:             return '';
  }
}
