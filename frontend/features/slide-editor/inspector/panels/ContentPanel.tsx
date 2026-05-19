'use client';

import React from 'react';
import { Plus, X, ChevronUp, ChevronDown, Image as ImageIcon, ExternalLink } from 'lucide-react';
import type { SlideElementDTO } from '@/types/slide-element';
import { PanelSection, Row, TextField, TextArea, NumberField, ColorField, SelectField, SegmentedControl } from '../Primitives';

interface Props {
  element: SlideElementDTO;
  onPatch: (patch: Partial<SlideElementDTO>) => void;
}

// =============================================================================
//  ContentPanel
//
//  Top-level dispatch by element.type → the matching sub-panel.
//  Element types whose dedicated editor lands in a later phase (chart/table/
//  team/pricing/swot/etc.) fall through to the JsonPreviewPanel so the user
//  can still see what's in the element and rename it.
// =============================================================================

export const ContentPanel: React.FC<Props> = ({ element, onPatch }) => {
  const t = element.type;

  return (
    <>
      {/* Universal "name" field (purely for the user — labels in the layers panel later) */}
      <PanelSection>
        <Row label="Name">
          <TextField value={element.name ?? ''} onChange={(v) => onPatch({ name: v || null })}
                     placeholder={`Unnamed ${t}`} />
        </Row>
      </PanelSection>

      {t === 'heading' || t === 'subheading' || t === 'paragraph' || t === 'quote' || t === 'caption' || t === 'label' || t === 'footer' || t === 'cta' ? (
        <TextContentEdit element={element} onPatch={onPatch} />
      ) : t === 'bulletList' || t === 'numberedList' ? (
        <ListContentEdit element={element} onPatch={onPatch} />
      ) : t === 'metric' || t === 'kpi' ? (
        <MetricContentEdit element={element} onPatch={onPatch} />
      ) : t === 'image' ? (
        <ImageContentEdit element={element} onPatch={onPatch} />
      ) : t === 'shape' ? (
        <ShapeContentEdit element={element} onPatch={onPatch} />
      ) : t === 'icon' ? (
        <IconContentEdit element={element} onPatch={onPatch} />
      ) : t === 'logo' ? (
        <LogoContentEdit element={element} onPatch={onPatch} />
      ) : t === 'divider' || t === 'line' ? (
        <LineContentEdit element={element} onPatch={onPatch} />
      ) : t === 'pageNumber' ? (
        <PageNumberContentEdit element={element} onPatch={onPatch} />
      ) : (
        <JsonPreviewPanel element={element} />
      )}

      {/* Accessibility — always shown */}
      <AccessibilityPanel element={element} onPatch={onPatch} />
    </>
  );
};

// =============================================================================
//  Text-block content (heading / subheading / paragraph / quote / cta / etc.)
// =============================================================================

const TextContentEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  const isQuote = element.type === 'quote';
  const isCTA   = element.type === 'cta';

  return (
    <PanelSection title="Content">
      <TextArea
        value={c.text ?? ''}
        onChange={(text) => onPatch({ content: { ...c, text, html: undefined } })}
        placeholder={placeholderFor(element.type)}
        rows={element.type === 'paragraph' || isQuote ? 5 : 2}
      />
      <p className="text-[10px] text-slate-400 leading-snug">
        Tip: <span className="font-semibold">double-click</span> on the canvas to edit inline with formatting.
      </p>

      {isQuote && (
        <>
          <Row label="Attrib">
            <TextField value={c.attribution} onChange={(v) => onPatch({ content: { ...c, attribution: v } })} placeholder="Author name" />
          </Row>
          <Row label="Role">
            <TextField value={c.role} onChange={(v) => onPatch({ content: { ...c, role: v } })} placeholder="Optional role" />
          </Row>
        </>
      )}

      {isCTA && (
        <>
          <Row label="Link">
            <TextField value={c.href} onChange={(v) => onPatch({ content: { ...c, href: v } })} placeholder="https://…" />
          </Row>
          <Row label="Variant">
            <SegmentedControl
              value={c.variant ?? 'primary'}
              onChange={(v) => onPatch({ content: { ...c, variant: v } })}
              options={[
                { value: 'primary',   label: 'Primary' },
                { value: 'secondary', label: 'Secondary' },
                { value: 'outline',   label: 'Outline' },
              ]}
            />
          </Row>
        </>
      )}
    </PanelSection>
  );
};

// =============================================================================
//  Bullet / numbered list — per-item editing with add/remove/reorder
// =============================================================================

const ListContentEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  const items: Array<{ id: string; text: string; html?: string }> = c.items || [];
  const ordered = element.type === 'numberedList';

  const updateItem = (i: number, text: string) => {
    const next = [...items];
    next[i] = { ...next[i], text, html: undefined };
    onPatch({ content: { ...c, items: next } });
  };
  const removeItem = (i: number) => {
    const next = items.filter((_, j) => j !== i);
    if (next.length === 0) next.push({ id: `item-${Date.now()}`, text: '' });
    onPatch({ content: { ...c, items: next } });
  };
  const moveItem = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onPatch({ content: { ...c, items: next } });
  };
  const addItem = () => {
    const next = [...items, { id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: '' }];
    onPatch({ content: { ...c, items: next } });
  };

  return (
    <PanelSection title={`${ordered ? 'Numbered' : 'Bullet'} list (${items.length} items)`}>
      {items.map((item, i) => (
        <div key={item.id} className="flex items-start gap-1.5">
          <span className="text-[10px] font-mono text-slate-400 w-4 text-right pt-1.5">{i + 1}</span>
          <TextField value={item.text} onChange={(v) => updateItem(i, v)} placeholder="(empty)" />
          <div className="flex flex-col gap-0.5 mt-0.5">
            <button onClick={() => moveItem(i, -1)} disabled={i === 0}
              className="w-5 h-3 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30">
              <ChevronUp className="w-3 h-3" />
            </button>
            <button onClick={() => moveItem(i, +1)} disabled={i === items.length - 1}
              className="w-5 h-3 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30">
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          <button onClick={() => removeItem(i)} className="w-5 h-5 mt-0.5 flex items-center justify-center text-slate-400 hover:text-red-600"
                  title="Remove item">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="w-full h-7 flex items-center justify-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded mt-1"
      >
        <Plus className="w-3 h-3" /> Add item
      </button>

      {ordered && (
        <Row label="Start at">
          <NumberField value={c.start ?? 1} min={1} onChange={(v) => onPatch({ content: { ...c, start: Math.round(v) } })} />
        </Row>
      )}
    </PanelSection>
  );
};

// =============================================================================
//  Metric / KPI content
// =============================================================================

const MetricContentEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  return (
    <PanelSection title="Metric">
      <Row label="Value">
        <TextField value={c.value} onChange={(v) => onPatch({ content: { ...c, value: v } })} placeholder="$10M" />
      </Row>
      <Row label="Unit">
        <TextField value={c.unit} onChange={(v) => onPatch({ content: { ...c, unit: v } })} placeholder="optional" />
      </Row>
      <Row label="Label">
        <TextField value={c.label} onChange={(v) => onPatch({ content: { ...c, label: v } })} placeholder="Annual revenue" />
      </Row>
      <Row label="Delta">
        <TextField value={c.delta} onChange={(v) => onPatch({ content: { ...c, delta: v } })} placeholder="+12%" />
        <SelectField
          value={c.deltaDirection ?? 'flat'}
          onChange={(v) => onPatch({ content: { ...c, deltaDirection: v } })}
          options={[
            { value: 'up',   label: '↑ Up' },
            { value: 'down', label: '↓ Down' },
            { value: 'flat', label: '— Flat' },
          ]}
        />
      </Row>
    </PanelSection>
  );
};

// =============================================================================
//  Image content
// =============================================================================

const ImageContentEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  return (
    <PanelSection title="Image">
      <Row label="URL">
        <TextField value={c.src} onChange={(v) => onPatch({ content: { ...c, src: v } })} placeholder="https://…" />
      </Row>
      {c.src && (
        <div className="relative w-full h-24 rounded border border-slate-200 overflow-hidden bg-slate-50">
          <img src={c.src} alt={c.alt || ''} className="w-full h-full"
               style={{ objectFit: c.fit || 'cover', borderRadius: c.borderRadius }} />
        </div>
      )}
      <Row label="Alt">
        <TextField value={c.alt} onChange={(v) => onPatch({ content: { ...c, alt: v } })} placeholder="Describe for accessibility" />
      </Row>
      <Row label="Fit">
        <SegmentedControl
          value={c.fit || 'cover'}
          onChange={(v) => onPatch({ content: { ...c, fit: v } })}
          options={[
            { value: 'cover',   label: 'Cover' },
            { value: 'contain', label: 'Contain' },
            { value: 'fill',    label: 'Fill' },
            { value: 'none',    label: 'None' },
          ]}
        />
      </Row>
      <Row label="Focal X">
        <NumberField value={c.focalX} onChange={(v) => onPatch({ content: { ...c, focalX: v } })} min={0} max={1} step={0.05} />
        <NumberField value={c.focalY} onChange={(v) => onPatch({ content: { ...c, focalY: v } })} min={0} max={1} step={0.05} />
      </Row>
      <Row label="Radius">
        <NumberField value={c.borderRadius ?? 0} min={0} max={500} onChange={(v) => onPatch({ content: { ...c, borderRadius: v } })} suffix="px" />
      </Row>
      <p className="text-[10px] text-slate-400 leading-snug">
        Upload + crop UI lands in Phase 8. Paste an image URL for now.
      </p>
    </PanelSection>
  );
};

// =============================================================================
//  Shape content
// =============================================================================

const ShapeContentEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  return (
    <PanelSection title="Shape">
      <Row label="Kind">
        <SelectField
          value={c.kind || 'rect'}
          onChange={(v) => onPatch({ content: { ...c, kind: v } })}
          options={[
            { value: 'rect',         label: 'Rectangle' },
            { value: 'roundedRect',  label: 'Rounded rect' },
            { value: 'circle',       label: 'Circle' },
            { value: 'ellipse',      label: 'Ellipse' },
            { value: 'triangle',     label: 'Triangle' },
            { value: 'arrow',        label: 'Arrow' },
            { value: 'star',         label: 'Star' },
          ]}
        />
      </Row>
      <Row label="Fill">
        <ColorField value={c.fill ?? '#16a34a'} onChange={(v) => onPatch({ content: { ...c, fill: v } })} allowTransparent />
      </Row>
      <Row label="Stroke">
        <ColorField value={c.stroke ?? ''} onChange={(v) => onPatch({ content: { ...c, stroke: v || undefined } })} allowTransparent />
      </Row>
      <Row label="Stroke W">
        <NumberField value={c.strokeWidth ?? 0} min={0} max={20} step={0.5} suffix="px"
                     onChange={(v) => onPatch({ content: { ...c, strokeWidth: v } })} />
      </Row>
    </PanelSection>
  );
};

// =============================================================================
//  Icon / Logo / Line / PageNumber content
// =============================================================================

const IconContentEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  return (
    <PanelSection title="Icon">
      <Row label="Name">
        <TextField value={c.name} onChange={(v) => onPatch({ content: { ...c, name: v } })} placeholder="lucide icon name" />
      </Row>
      <Row label="Color">
        <ColorField value={c.color ?? '#16a34a'} onChange={(v) => onPatch({ content: { ...c, color: v } })} />
      </Row>
      <Row label="Stroke">
        <NumberField value={c.strokeWidth ?? 2} min={0.5} max={4} step={0.5} suffix="px"
                     onChange={(v) => onPatch({ content: { ...c, strokeWidth: v } })} />
      </Row>
      <p className="text-[10px] text-slate-400 leading-snug">
        Icon picker UI lands in Phase 8.
      </p>
    </PanelSection>
  );
};

const LogoContentEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  return (
    <PanelSection title="Logo">
      <Row label="URL">
        <TextField value={c.src} onChange={(v) => onPatch({ content: { ...c, src: v } })} placeholder="https://…" />
      </Row>
      <Row label="Name">
        <TextField value={c.name} onChange={(v) => onPatch({ content: { ...c, name: v } })} placeholder="Acme Inc." />
      </Row>
    </PanelSection>
  );
};

const LineContentEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  return (
    <PanelSection title={element.type === 'line' ? 'Line' : 'Divider'}>
      <Row label="Color">
        <ColorField value={c.stroke ?? '#94a3b8'} onChange={(v) => onPatch({ content: { ...c, stroke: v } })} />
      </Row>
      <Row label="Width">
        <NumberField value={c.strokeWidth ?? 1} min={0.5} max={20} step={0.5} suffix="px"
                     onChange={(v) => onPatch({ content: { ...c, strokeWidth: v } })} />
      </Row>
      {element.type === 'divider' && (
        <Row label="Label">
          <TextField value={c.label} onChange={(v) => onPatch({ content: { ...c, label: v } })} placeholder="Optional label" />
        </Row>
      )}
    </PanelSection>
  );
};

const PageNumberContentEdit: React.FC<Props> = ({ element, onPatch }) => {
  const c = (element.content || {}) as any;
  return (
    <PanelSection title="Page number">
      <Row label="Format">
        <SegmentedControl
          value={c.format ?? 'numeric'}
          onChange={(v) => onPatch({ content: { ...c, format: v } })}
          options={[
            { value: 'numeric',     label: '1' },
            { value: 'pageOfTotal', label: '1 / N' },
          ]}
        />
      </Row>
    </PanelSection>
  );
};

// =============================================================================
//  Placeholder for complex types — read-only preview + name editing
// =============================================================================

const JsonPreviewPanel: React.FC<{ element: SlideElementDTO }> = ({ element }) => (
  <PanelSection title={`${element.type} (read-only preview)`}>
    <p className="text-[11px] text-slate-500 leading-relaxed">
      Detailed editor for <span className="font-semibold">{element.type}</span> elements lands in a later phase
      (chart→Phase 6, table→Phase 7, image→Phase 8, etc.). You can still move, resize, duplicate, and style this element today.
    </p>
    <details>
      <summary className="text-[10px] font-semibold text-slate-500 cursor-pointer hover:text-slate-900">View raw data</summary>
      <pre className="mt-2 text-[10px] bg-slate-50 border border-slate-200 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap break-all">
        {JSON.stringify(element.content || {}, null, 2)}
      </pre>
    </details>
  </PanelSection>
);

// =============================================================================
//  Accessibility — universal
// =============================================================================

const AccessibilityPanel: React.FC<Props> = ({ element, onPatch }) => {
  const a = (element.accessibility || {}) as any;
  return (
    <PanelSection title="Accessibility">
      <Row label="Alt">
        <TextField value={a.altText} onChange={(v) => onPatch({ accessibility: { ...a, altText: v } as any })}
                   placeholder="Describe the element" />
      </Row>
      <Row label="Role">
        <TextField value={a.role} onChange={(v) => onPatch({ accessibility: { ...a, role: v } as any })}
                   placeholder="e.g. heading, button" />
      </Row>
      <Row label="ARIA">
        <TextField value={a.ariaLabel} onChange={(v) => onPatch({ accessibility: { ...a, ariaLabel: v } as any })}
                   placeholder="aria-label" />
      </Row>
    </PanelSection>
  );
};

// =============================================================================
//  Helpers
// =============================================================================

function placeholderFor(t: string): string {
  switch (t) {
    case 'heading':    return 'Enter heading text…';
    case 'subheading': return 'Enter subheading…';
    case 'paragraph':  return 'Type your paragraph here…';
    case 'quote':      return 'Enter a quote…';
    case 'caption':    return 'Image caption / fine print';
    case 'label':      return 'Short label';
    case 'footer':     return 'Footer text';
    case 'cta':        return 'Get started';
    default:           return '';
  }
}
