'use client';

import React from 'react';

// =============================================================================
//  Form primitives — minimal, consistent styling for every inspector panel.
//  Inspector intentionally feels like Figma's right panel: dense, no chrome.
// =============================================================================

export const PanelSection: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="px-3 py-3 border-b border-slate-100 last:border-b-0">
    {title && (
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">{title}</div>
    )}
    <div className="space-y-2">{children}</div>
  </div>
);

export const Row: React.FC<{ label?: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <div className={`flex items-center gap-2 ${className || ''}`}>
    {label && <span className="text-[11px] font-medium text-slate-600 w-16 flex-shrink-0">{label}</span>}
    <div className="flex-1 flex items-center gap-1.5 min-w-0">{children}</div>
  </div>
);

// Numeric input
export const NumberField: React.FC<{
  value:    number | undefined;
  onChange: (v: number) => void;
  min?:     number;
  max?:     number;
  step?:    number;
  suffix?:  string;
  className?: string;
}> = ({ value, onChange, min, max, step = 1, suffix, className }) => (
  <div className={`flex items-center bg-slate-50 border border-slate-200 rounded h-7 px-1.5 flex-1 min-w-0 ${className || ''}`}>
    <input
      type="number"
      value={value === undefined || Number.isNaN(value) ? '' : Number(value.toFixed(2))}
      min={min} max={max} step={step}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) onChange(v);
      }}
      className="flex-1 bg-transparent text-xs text-slate-800 outline-none min-w-0"
    />
    {suffix && <span className="text-[10px] text-slate-400 flex-shrink-0">{suffix}</span>}
  </div>
);

// Text input
export const TextField: React.FC<{
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => (
  <input
    type="text"
    value={value ?? ''}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    className="flex-1 h-7 bg-slate-50 border border-slate-200 rounded px-2 text-xs text-slate-800 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 min-w-0"
  />
);

export const TextArea: React.FC<{
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}> = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea
    value={value ?? ''}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    rows={rows}
    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 resize-y leading-relaxed"
  />
);

// Color picker — small swatch + raw hex input
export const ColorField: React.FC<{
  value:    string | undefined;
  onChange: (v: string) => void;
  allowTransparent?: boolean;
}> = ({ value, onChange, allowTransparent }) => {
  const display = !value || value === 'transparent' ? '#ffffff' : value;
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <label className="relative w-7 h-7 rounded border border-slate-200 flex-shrink-0 overflow-hidden cursor-pointer" style={{ background: value || 'white' }}>
        <input
          type="color"
          value={display}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      <input
        type="text"
        value={value ?? ''}
        placeholder={allowTransparent ? 'transparent' : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 h-7 bg-slate-50 border border-slate-200 rounded px-2 text-xs font-mono text-slate-800 outline-none focus:border-green-500"
      />
      {allowTransparent && (
        <button
          type="button"
          onClick={() => onChange('transparent')}
          className="text-[10px] font-semibold text-slate-500 hover:text-slate-900 flex-shrink-0"
          title="Set to transparent"
        >
          ✕
        </button>
      )}
    </div>
  );
};

// Slider with optional numeric box
export const SliderField: React.FC<{
  value:    number;
  onChange: (v: number) => void;
  min:      number;
  max:      number;
  step?:    number;
  suffix?:  string;
}> = ({ value, onChange, min, max, step = 1, suffix }) => (
  <div className="flex items-center gap-2 flex-1 min-w-0">
    <input
      type="range"
      value={value} min={min} max={max} step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flex-1 min-w-0 accent-green-600"
    />
    <span className="text-[11px] font-mono text-slate-600 w-12 text-right flex-shrink-0">{value.toFixed(step < 1 ? 2 : 0)}{suffix || ''}</span>
  </div>
);

// Select (dropdown)
export const SelectField: React.FC<{
  value:    string | undefined;
  onChange: (v: string) => void;
  options:  Array<{ value: string; label: string }>;
}> = ({ value, onChange, options }) => (
  <select
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    className="flex-1 h-7 bg-slate-50 border border-slate-200 rounded px-1.5 text-xs text-slate-800 outline-none focus:border-green-500 min-w-0"
  >
    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

// Segmented control (icon buttons row)
export const SegmentedControl: React.FC<{
  value:    string;
  onChange: (v: string) => void;
  options:  Array<{ value: string; icon?: React.ReactNode; label?: string; title?: string }>;
}> = ({ value, onChange, options }) => (
  <div className="flex bg-slate-100 rounded p-0.5 gap-0.5 flex-1 min-w-0">
    {options.map((o) => {
      const active = value === o.value;
      return (
        <button
          key={o.value}
          type="button"
          title={o.title || o.label}
          onClick={() => onChange(o.value)}
          className={`flex-1 h-6 flex items-center justify-center rounded text-[11px] font-semibold transition-colors ${
            active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {o.icon || o.label}
        </button>
      );
    })}
  </div>
);

export const Toggle: React.FC<{
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}> = ({ value, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className="flex items-center justify-between w-full h-6 text-xs"
  >
    <span className="text-slate-700">{label}</span>
    <span className={`w-7 h-4 rounded-full relative transition-colors ${value ? 'bg-green-600' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${value ? 'left-3.5' : 'left-0.5'}`} />
    </span>
  </button>
);
