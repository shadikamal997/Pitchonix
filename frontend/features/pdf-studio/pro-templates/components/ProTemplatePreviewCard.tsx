import React from 'react';
import { Check, Layout } from 'lucide-react';
import { ProTemplateDefinition } from '../types';

function ColorPalettePreview({ template }: { template: ProTemplateDefinition }) {
  const c = template.tokens.colors;
  const display = template.tokens.typography?.display || 'Inter';
  const dark = c.paper === '#11100E' || c.paper === '#070707' || c.paper === '#0A0A0A';

  return (
    <div
      className="relative flex h-[88px] w-full flex-col overflow-hidden"
      style={{ background: c.paper }}
    >
      {/* Accent top bar */}
      <div className="h-1 w-full shrink-0" style={{ background: c.accent }} />

      {/* Main content area */}
      <div className="flex flex-1 items-center gap-3 px-3 py-2">
        {/* Template name preview */}
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-[13px] font-black leading-tight"
            style={{ color: dark ? '#ffffff' : c.charcoal, fontFamily: `"${display}", Inter, sans-serif` }}
          >
            {template.name}
          </div>
          <div
            className="mt-1 text-[10px] font-medium"
            style={{ color: dark ? 'rgba(255,255,255,0.5)' : c.muted }}
          >
            {template.category}
          </div>
        </div>

        {/* Color swatches */}
        <div className="flex shrink-0 flex-col gap-1">
          <div className="flex gap-1">
            <div className="h-4 w-4 rounded-full border border-white/20 shadow-sm" style={{ background: c.accent }} />
            <div className="h-4 w-4 rounded-full border border-white/20 shadow-sm" style={{ background: c.charcoal }} />
            <div className="h-4 w-4 rounded-full border border-white/20 shadow-sm" style={{ background: c.accentSoft }} />
          </div>
          {/* Mini page lines */}
          <div
            className="rounded p-1.5"
            style={{ background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }}
          >
            <div className="mb-0.5 h-1 w-10 rounded-full" style={{ background: dark ? 'rgba(255,255,255,0.3)' : c.line }} />
            <div className="h-1 w-7 rounded-full" style={{ background: dark ? 'rgba(255,255,255,0.15)' : c.line }} />
          </div>
        </div>
      </div>

      {/* Bottom color strip */}
      <div className="flex h-1.5 w-full shrink-0">
        <div className="flex-1" style={{ background: c.accent }} />
        <div className="flex-1" style={{ background: c.charcoal }} />
        <div className="flex-1" style={{ background: c.accentSoft }} />
        <div className="flex-1" style={{ background: c.line }} />
      </div>
    </div>
  );
}

export function ProTemplatePreviewCard({
  template,
  selected,
  onSelect,
}: {
  template: ProTemplateDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group w-full overflow-hidden rounded-lg border bg-white text-left transition-all duration-150 ${
        selected
          ? 'border-teal-500 ring-2 ring-teal-100'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
    >
      {/* Color preview */}
      <div className="relative overflow-hidden">
        <ColorPalettePreview template={template} />
        {selected && (
          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm">
            <Check className="h-3 w-3 stroke-[3]" />
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="px-2.5 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold leading-tight text-gray-900">
              {template.name}
            </div>
            <div className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-gray-500">
              {template.description}
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold transition-colors ${
              selected ? 'bg-teal-600 text-white' : 'bg-gray-900 text-white group-hover:bg-teal-600'
            }`}
          >
            {selected ? 'Applied' : 'Apply'}
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[9px] text-gray-400">
            <Layout className="h-2.5 w-2.5" />
            {template.archetypes.length}
          </div>
        </div>
      </div>
    </button>
  );
}
