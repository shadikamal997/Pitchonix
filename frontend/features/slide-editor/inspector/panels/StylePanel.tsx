'use client';

import React from 'react';
import type { SlideElementDTO, ElementStyle, GradientStyle } from '@/types/slide-element';
import { PanelSection, Row, NumberField, ColorField, SliderField, SelectField } from '../Primitives';

interface Props {
  element: SlideElementDTO;
  onStyle: (patch: Partial<ElementStyle>) => void;
}

const SHADOW_PRESETS: Array<{ value: string; label: string }> = [
  { value: '',                                              label: 'None' },
  { value: '0 1px 2px rgba(0,0,0,0.1)',                     label: 'Subtle' },
  { value: '0 4px 8px rgba(0,0,0,0.12)',                    label: 'Soft' },
  { value: '0 10px 25px rgba(0,0,0,0.18)',                  label: 'Medium' },
  { value: '0 25px 50px rgba(0,0,0,0.25)',                  label: 'Strong' },
];

export const StylePanel: React.FC<Props> = ({ element, onStyle }) => {
  const s = (element.style || {}) as ElementStyle;

  return (
    <>
      <PanelSection title="Fill">
        <Row label="Color">
          <ColorField value={s.fill ?? 'transparent'} onChange={(v) => onStyle({ fill: v })} allowTransparent />
        </Row>
        <Row label="Opacity">
          <SliderField value={s.opacity ?? 1} min={0} max={1} step={0.05} suffix=""
                       onChange={(v) => onStyle({ opacity: v })} />
        </Row>
      </PanelSection>

      <PanelSection title="Gradient">
        <GradientRow gradient={s.gradient} onChange={(g) => onStyle({ gradient: g })} />
      </PanelSection>

      <PanelSection title="Stroke">
        <Row label="Color">
          <ColorField value={s.stroke ?? ''} onChange={(v) => onStyle({ stroke: v || undefined })} allowTransparent />
        </Row>
        <Row label="Width">
          <NumberField value={s.strokeWidth ?? 0} min={0} max={20} step={0.5} suffix="px"
                       onChange={(v) => onStyle({ strokeWidth: v })} />
        </Row>
      </PanelSection>

      <PanelSection title="Box">
        <Row label="Radius">
          <NumberField value={s.borderRadius ?? 0} min={0} max={200} step={1} suffix="px"
                       onChange={(v) => onStyle({ borderRadius: v })} />
        </Row>
        <Row label="Shadow">
          <SelectField value={s.shadow ?? ''} onChange={(v) => onStyle({ shadow: v || undefined })} options={SHADOW_PRESETS} />
        </Row>
      </PanelSection>

      <PanelSection title="Padding">
        <Row label="T / R">
          <NumberField value={s.paddingTop    ?? 0} onChange={(v) => onStyle({ paddingTop:    v })} suffix="px" />
          <NumberField value={s.paddingRight  ?? 0} onChange={(v) => onStyle({ paddingRight:  v })} suffix="px" />
        </Row>
        <Row label="B / L">
          <NumberField value={s.paddingBottom ?? 0} onChange={(v) => onStyle({ paddingBottom: v })} suffix="px" />
          <NumberField value={s.paddingLeft   ?? 0} onChange={(v) => onStyle({ paddingLeft:   v })} suffix="px" />
        </Row>
      </PanelSection>
    </>
  );
};

const GradientRow: React.FC<{
  gradient: GradientStyle | undefined;
  onChange: (g: GradientStyle | undefined) => void;
}> = ({ gradient, onChange }) => {
  const g = gradient;
  if (!g) {
    return (
      <button
        type="button"
        onClick={() => onChange({ kind: 'linear', angle: 180, stops: [{ color: '#22c55e', offset: 0 }, { color: '#16a34a', offset: 1 }] })}
        className="w-full h-7 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
      >
        Add gradient
      </button>
    );
  }
  const updateStop = (i: number, patch: { color?: string; offset?: number }) => {
    const stops = [...g.stops];
    stops[i] = { ...stops[i], ...patch };
    onChange({ ...g, stops });
  };
  return (
    <>
      <Row label="Kind">
        <SelectField
          value={g.kind}
          onChange={(v) => onChange({ ...g, kind: v as 'linear' | 'radial' })}
          options={[{ value: 'linear', label: 'Linear' }, { value: 'radial', label: 'Radial' }]}
        />
        {g.kind === 'linear' && (
          <NumberField value={g.angle ?? 180} min={0} max={360} step={1} suffix="°"
                       onChange={(v) => onChange({ ...g, angle: v })} />
        )}
      </Row>
      {g.stops.map((stop, i) => (
        <Row key={i} label={i === 0 ? 'From' : i === g.stops.length - 1 ? 'To' : `Stop ${i + 1}`}>
          <ColorField value={stop.color} onChange={(c) => updateStop(i, { color: c })} />
        </Row>
      ))}
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className="text-[10px] font-semibold text-red-600 hover:text-red-800"
      >
        Remove gradient
      </button>
    </>
  );
};
