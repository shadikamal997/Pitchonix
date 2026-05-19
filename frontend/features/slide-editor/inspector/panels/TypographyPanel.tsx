'use client';

import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Strikethrough } from 'lucide-react';
import type { SlideElementDTO, ElementStyle } from '@/types/slide-element';
import { PanelSection, Row, NumberField, ColorField, SliderField, SelectField, SegmentedControl } from '../Primitives';

interface Props {
  element: SlideElementDTO;
  onStyle: (patch: Partial<ElementStyle>) => void;
}

const FONT_FAMILIES: Array<{ value: string; label: string }> = [
  { value: '',                                  label: 'Default (Inter)' },
  { value: 'Inter, system-ui, sans-serif',      label: 'Inter' },
  { value: '"Playfair Display", serif',         label: 'Playfair Display' },
  { value: 'Lora, serif',                       label: 'Lora' },
  { value: '"Cormorant Garamond", serif',       label: 'Cormorant Garamond' },
  { value: 'Manrope, sans-serif',               label: 'Manrope' },
  { value: '"Space Grotesk", sans-serif',       label: 'Space Grotesk' },
  { value: '"DM Sans", sans-serif',             label: 'DM Sans' },
  { value: 'Syne, sans-serif',                  label: 'Syne' },
  { value: 'Outfit, sans-serif',                label: 'Outfit' },
  { value: '"IBM Plex Sans", sans-serif',       label: 'IBM Plex Sans' },
  { value: 'Nunito, sans-serif',                label: 'Nunito' },
];

const WEIGHTS: Array<{ value: string; label: string }> = [
  { value: '300', label: 'Light 300' },
  { value: '400', label: 'Regular 400' },
  { value: '500', label: 'Medium 500' },
  { value: '600', label: 'Semibold 600' },
  { value: '700', label: 'Bold 700' },
  { value: '800', label: 'Extrabold 800' },
  { value: '900', label: 'Black 900' },
];

const TEXT_ELEMENT_TYPES = new Set([
  'heading', 'subheading', 'paragraph', 'quote', 'caption', 'label', 'cta', 'footer',
  'bulletList', 'numberedList',
]);

export function isTextElement(type: string): boolean { return TEXT_ELEMENT_TYPES.has(type); }

export const TypographyPanel: React.FC<Props> = ({ element, onStyle }) => {
  const s = (element.style || {}) as ElementStyle;

  return (
    <>
      <PanelSection title="Typography">
        <Row label="Family">
          <SelectField
            value={s.fontFamily ?? ''}
            onChange={(v) => onStyle({ fontFamily: v || undefined })}
            options={FONT_FAMILIES}
          />
        </Row>
        <Row label="Weight">
          <SelectField
            value={String(s.fontWeight ?? '400')}
            onChange={(v) => onStyle({ fontWeight: Number(v) })}
            options={WEIGHTS}
          />
        </Row>
        <Row label="Size">
          <NumberField value={typeof s.fontSize === 'number' ? s.fontSize : undefined}
                       onChange={(v) => onStyle({ fontSize: v })} suffix="px" min={6} max={200} />
        </Row>
        <Row label="Color">
          <ColorField value={s.color ?? '#111827'} onChange={(v) => onStyle({ color: v })} />
        </Row>
        <Row label="Line H.">
          <SliderField value={s.lineHeight ?? 1.4} min={0.8} max={2.5} step={0.05}
                       onChange={(v) => onStyle({ lineHeight: v })} />
        </Row>
        <Row label="Letter">
          <SliderField value={s.letterSpacing ?? 0} min={-2} max={10} step={0.1} suffix="px"
                       onChange={(v) => onStyle({ letterSpacing: v })} />
        </Row>
      </PanelSection>

      <PanelSection title="Style">
        <Row label="Align">
          <SegmentedControl
            value={s.textAlign ?? 'left'}
            onChange={(v) => onStyle({ textAlign: v as any })}
            options={[
              { value: 'left',    icon: <AlignLeft className="w-3.5 h-3.5" />,    title: 'Left' },
              { value: 'center',  icon: <AlignCenter className="w-3.5 h-3.5" />,  title: 'Center' },
              { value: 'right',   icon: <AlignRight className="w-3.5 h-3.5" />,   title: 'Right' },
              { value: 'justify', icon: <AlignJustify className="w-3.5 h-3.5" />, title: 'Justify' },
            ]}
          />
        </Row>
        <Row label="Decor">
          <SegmentedControl
            value={s.textDecoration ?? 'none'}
            onChange={(v) => onStyle({ textDecoration: v as any })}
            options={[
              { value: 'none',         label: '—',  title: 'None' },
              { value: 'underline',    icon: <Underline className="w-3.5 h-3.5" />, title: 'Underline' },
              { value: 'line-through', icon: <Strikethrough className="w-3.5 h-3.5" />, title: 'Strikethrough' },
            ]}
          />
        </Row>
        <Row label="Case">
          <SegmentedControl
            value={s.textTransform ?? 'none'}
            onChange={(v) => onStyle({ textTransform: v as any })}
            options={[
              { value: 'none',       label: 'aA' },
              { value: 'uppercase',  label: 'AA' },
              { value: 'lowercase',  label: 'aa' },
              { value: 'capitalize', label: 'Aa' },
            ]}
          />
        </Row>
      </PanelSection>
    </>
  );
};
