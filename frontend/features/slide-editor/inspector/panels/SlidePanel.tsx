'use client';

import React from 'react';
import { PanelSection, Row, TextField, TextArea, ColorField, SelectField, NumberField, SegmentedControl } from '../Primitives';

// =============================================================================
//  SlidePanel — shown in the inspector when no element is selected.
//  Edits slide-level fields: title (read-only here, edit via canvas), background,
//  theme tokens, speaker notes.
// =============================================================================

interface SlideSummary {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  speakerNotes: string | null;
  background?: any;
  themeTokens?: any;
}

interface Props {
  slide:    SlideSummary;
  onPatch:  (patch: Partial<SlideSummary>) => void;
}

export const SlidePanel: React.FC<Props> = ({ slide, onPatch }) => {
  const bg = (slide.background || { type: 'solid', color: '#ffffff' }) as any;
  const setBg = (patch: any) => onPatch({ background: { ...bg, ...patch } });

  const tokens = (slide.themeTokens || {}) as any;
  const setTokens = (patch: any) => onPatch({ themeTokens: { ...tokens, ...patch } });

  return (
    <>
      <PanelSection title="Slide">
        <Row label="Title">
          <TextField value={slide.title} onChange={(v) => onPatch({ title: v })} placeholder="Slide title" />
        </Row>
        <Row label="Subtitle">
          <TextField value={slide.subtitle ?? ''} onChange={(v) => onPatch({ subtitle: v })} placeholder="Optional" />
        </Row>
        <Row label="Type">
          <input
            value={slide.type}
            disabled
            className="flex-1 h-7 bg-slate-100 border border-slate-200 rounded px-2 text-xs text-slate-500"
          />
        </Row>
      </PanelSection>

      <PanelSection title="Background">
        <Row label="Type">
          <SegmentedControl
            value={bg.type ?? 'solid'}
            onChange={(v) => setBg({ type: v })}
            options={[
              { value: 'solid',    label: 'Solid' },
              { value: 'gradient', label: 'Gradient' },
              { value: 'image',    label: 'Image' },
            ]}
          />
        </Row>
        {bg.type === 'solid' && (
          <Row label="Color">
            <ColorField value={bg.color ?? '#ffffff'} onChange={(v) => setBg({ color: v })} />
          </Row>
        )}
        {bg.type === 'gradient' && (
          <>
            <Row label="From">
              <ColorField value={bg.gradient?.stops?.[0]?.color ?? '#16a34a'}
                onChange={(c) => setBg({ gradient: { ...(bg.gradient || { kind: 'linear', angle: 180, stops: [{ color: c, offset: 0 }, { color: '#0ea5e9', offset: 1 }] }), stops: [{ color: c, offset: 0 }, bg.gradient?.stops?.[1] || { color: '#0ea5e9', offset: 1 }] } })}
              />
            </Row>
            <Row label="To">
              <ColorField value={bg.gradient?.stops?.[1]?.color ?? '#0ea5e9'}
                onChange={(c) => setBg({ gradient: { ...(bg.gradient || { kind: 'linear', angle: 180, stops: [{ color: '#16a34a', offset: 0 }, { color: c, offset: 1 }] }), stops: [bg.gradient?.stops?.[0] || { color: '#16a34a', offset: 0 }, { color: c, offset: 1 }] } })}
              />
            </Row>
            <Row label="Angle">
              <NumberField value={bg.gradient?.angle ?? 180} min={0} max={360} suffix="°"
                onChange={(v) => setBg({ gradient: { ...(bg.gradient || {}), angle: v } })}
              />
            </Row>
          </>
        )}
        {bg.type === 'image' && (
          <Row label="URL">
            <TextField value={bg.image?.src ?? ''}
              onChange={(v) => setBg({ image: { ...(bg.image || {}), src: v } })}
              placeholder="https://…" />
          </Row>
        )}
      </PanelSection>

      <PanelSection title="Theme tokens (overrides)">
        <Row label="Primary">
          <ColorField value={tokens.primary ?? ''} onChange={(v) => setTokens({ primary: v || undefined })} />
        </Row>
        <Row label="Accent">
          <ColorField value={tokens.accent ?? ''}  onChange={(v) => setTokens({ accent: v || undefined })}  />
        </Row>
        <Row label="Text">
          <ColorField value={tokens.text ?? ''}    onChange={(v) => setTokens({ text: v || undefined })}    />
        </Row>
        <Row label="Heading font">
          <TextField value={tokens.fontHeading} onChange={(v) => setTokens({ fontHeading: v || undefined })}
                     placeholder="Inter / Playfair / …" />
        </Row>
        <Row label="Body font">
          <TextField value={tokens.fontBody} onChange={(v) => setTokens({ fontBody: v || undefined })}
                     placeholder="Inter / Lora / …" />
        </Row>
      </PanelSection>

      <PanelSection title="Speaker notes">
        <TextArea
          value={slide.speakerNotes ?? ''}
          onChange={(v) => onPatch({ speakerNotes: v })}
          placeholder="Talking points for the presenter…"
          rows={5}
        />
      </PanelSection>
    </>
  );
};
