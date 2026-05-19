import React from 'react';
import { Check } from 'lucide-react';
import { TemplateDefinition } from '../registry/templateRegistry';

function MiniPagePreview({ template }: { template: TemplateDefinition }) {
  const { colors, headerStyle } = template;
  const headerH = headerStyle === 'gradient' ? 32 : headerStyle === 'solid' ? 26 : 20;
  const isMinimal = headerStyle === 'minimal';

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 88, background: colors.bg }}
    >
      {/* Header bar */}
      {isMinimal ? (
        <div
          className="absolute left-0 top-0 right-0 flex items-center px-3"
          style={{ height: headerH, borderBottom: `2px solid ${colors.accent}` }}
        >
          <div className="h-2 w-16 rounded-sm" style={{ background: colors.header }} />
        </div>
      ) : (
        <div
          className="absolute left-0 top-0 right-0 flex items-end px-3 pb-1.5"
          style={{
            height: headerH,
            background: headerStyle === 'gradient'
              ? `linear-gradient(135deg, ${colors.header} 0%, ${colors.accent} 100%)`
              : colors.header,
          }}
        >
          <div className="h-1.5 w-14 rounded-sm bg-white/80" />
        </div>
      )}

      {/* Content lines */}
      <div className="absolute left-3 right-3 flex flex-col gap-1" style={{ top: headerH + 8 }}>
        <div className="h-1.5 w-full rounded-sm" style={{ background: colors.line }} />
        <div className="h-1.5 w-4/5 rounded-sm" style={{ background: colors.line }} />
        <div className="flex gap-1.5 mt-1">
          <div className="h-6 flex-1 rounded" style={{ background: colors.accent + '33' }} />
          <div className="h-6 flex-1 rounded" style={{ background: colors.accent + '33' }} />
        </div>
        <div className="h-1.5 w-3/5 rounded-sm" style={{ background: colors.line }} />
      </div>

      {/* Accent bottom strip */}
      <div
        className="absolute bottom-0 left-0 right-0 flex"
        style={{ height: 3 }}
      >
        <div className="flex-1" style={{ background: colors.accent }} />
        <div className="flex-1" style={{ background: colors.header }} />
        <div className="flex-1" style={{ background: colors.line }} />
      </div>
    </div>
  );
}

export function TemplatePreviewCard({
  template,
  selected,
  onSelect,
}: {
  template: TemplateDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group w-full overflow-hidden rounded-lg border bg-white text-left transition-all duration-150 ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-100'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
    >
      {/* Visual preview */}
      <div className="relative overflow-hidden">
        <MiniPagePreview template={template} />
        {selected && (
          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
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
              selected ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white group-hover:bg-blue-600'
            }`}
          >
            {selected ? 'Active' : 'Apply'}
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
          {/* Color dot row */}
          <div className="flex gap-0.5">
            <div className="h-2 w-2 rounded-full" style={{ background: template.colors.header }} />
            <div className="h-2 w-2 rounded-full" style={{ background: template.colors.accent }} />
            <div className="h-2 w-2 rounded-full" style={{ background: template.colors.line }} />
          </div>
        </div>
      </div>
    </button>
  );
}
