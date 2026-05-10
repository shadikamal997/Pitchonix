import React from 'react';
import { CheckCircle, Sparkles } from 'lucide-react';
import { ProTemplateDefinition } from '../types';

function BusinessFlyerMarketplacePreview() {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[#EEF4F3] p-3.5">
      <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#2CB6A3]/20" />
      <div className="absolute -bottom-14 left-16 h-36 w-36 rounded-full bg-[#1F2933]/10" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/70 to-transparent" />

      <div className="relative grid h-full grid-cols-[1fr_0.72fr] gap-3">
        <div className="relative overflow-hidden rounded-xl border border-white/80 bg-white p-3.5 shadow-lg">
          <div className="absolute right-0 top-0 h-14 w-14 rounded-bl-[2rem] bg-[#E7F7F4]" />
          <div className="flex items-center justify-between">
            <div className="h-2 w-14 rounded-full bg-[#2CB6A3]" />
            <div className="h-2 w-8 rounded-full bg-[#D7E3E0]" />
          </div>
          <div className="mt-6 text-[24px] font-black leading-[0.9] text-[#1F2933]">
            Modern<br />Business<br />Flyer
          </div>
          <div className="mt-4 h-1.5 w-20 rounded-full bg-[#2CB6A3]" />
          <div className="mt-3 space-y-1.5">
            <div className="h-1.5 w-28 rounded-full bg-[#CBD8D5]" />
            <div className="h-1.5 w-20 rounded-full bg-[#CBD8D5]" />
          </div>
          <div className="absolute bottom-3 left-3 text-[8px] font-bold uppercase tracking-[0.18em] text-[#6B7F7A]">
            Editorial PDF
          </div>
        </div>

        <div className="grid grid-rows-[0.78fr_1fr] gap-3">
          <div className="overflow-hidden rounded-[1.25rem] bg-[#1F2933] p-3 text-white shadow-lg">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2CB6A3]">01</div>
            <div className="mt-4 h-1.5 w-16 rounded-full bg-white/80" />
            <div className="mt-2 h-1.5 w-12 rounded-full bg-white/45" />
            <div className="mt-4 grid grid-cols-3 gap-1">
              <div className="h-5 rounded bg-white/10" />
              <div className="h-5 rounded bg-white/10" />
              <div className="h-5 rounded bg-[#2CB6A3]" />
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/80 bg-white p-3 shadow-lg">
            <div className="mb-3 flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-[#2CB6A3]" />
              <div className="h-1.5 w-16 rounded-full bg-[#1F2933]" />
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-[#D7E3E0]" />
              <div className="h-1.5 w-10/12 rounded-full bg-[#D7E3E0]" />
              <div className="h-1.5 w-8/12 rounded-full bg-[#D7E3E0]" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="h-8 rounded-lg bg-[#E7F7F4]" />
              <div className="h-8 rounded-lg bg-[#1F2933]" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-5 top-5 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-bold text-[#1F2933] shadow-sm backdrop-blur">
        Cover + inner pages
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
      className={`group w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all duration-200 ${
        selected
          ? 'border-teal-500 shadow-teal-100 ring-4 ring-teal-100'
          : 'border-gray-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-xl'
      }`}
    >
      <div className="relative p-2.5 pb-0">
        <BusinessFlyerMarketplacePreview />
        {selected && (
          <span className="absolute right-6 top-6 rounded-full bg-teal-600 p-1.5 text-white shadow-lg">
            <CheckCircle className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-black leading-tight text-gray-950">{template.name}</div>
            <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{template.description}</div>
          </div>
          <span className="shrink-0 rounded-full bg-gray-950 px-2.5 py-1 text-[10px] font-bold text-white">
            {template.category}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {template.tags.map(tag => (
            <span key={tag} className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-600">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" />
            {template.archetypes.length} page layouts
          </span>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
            selected ? 'bg-teal-600 text-white' : 'bg-gray-950 text-white group-hover:bg-teal-600'
          }`}>
            {selected ? 'Applied' : 'Apply Template'}
          </span>
        </div>
      </div>
    </button>
  );
}
