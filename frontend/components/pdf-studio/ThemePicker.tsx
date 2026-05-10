'use client';

import React, { useState } from 'react';
import { Check, Palette, X } from 'lucide-react';

export interface PdfTheme {
  id: string;
  name: string;
  category: string;
  primary: string;
  secondary: string;
  accent: string;
  description: string;
}

export const PDF_THEMES: PdfTheme[] = [
  {
    id: 'blue',
    name: 'Ocean Blue',
    category: 'Classic',
    primary: '#2563EB',
    secondary: '#1D4ED8',
    accent: '#60A5FA',
    description: 'Clean, trustworthy, and professional',
  },
  {
    id: 'navy',
    name: 'Midnight Navy',
    category: 'Classic',
    primary: '#1E40AF',
    secondary: '#1E3A8A',
    accent: '#3B82F6',
    description: 'Deep, authoritative, and sophisticated',
  },
  {
    id: 'slate',
    name: 'Corporate Slate',
    category: 'Classic',
    primary: '#475569',
    secondary: '#334155',
    accent: '#94A3B8',
    description: 'Neutral, refined, and timeless',
  },
  {
    id: 'gray',
    name: 'Executive Gray',
    category: 'Classic',
    primary: '#4B5563',
    secondary: '#374151',
    accent: '#6B7280',
    description: 'Minimal and understated elegance',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    category: 'Bold',
    primary: '#7C3AED',
    secondary: '#6D28D9',
    accent: '#A78BFA',
    description: 'Creative, bold, and distinctive',
  },
  {
    id: 'indigo',
    name: 'Deep Indigo',
    category: 'Bold',
    primary: '#4F46E5',
    secondary: '#4338CA',
    accent: '#818CF8',
    description: 'Modern, digital, and cutting-edge',
  },
  {
    id: 'red',
    name: 'Corporate Red',
    category: 'Bold',
    primary: '#DC2626',
    secondary: '#B91C1C',
    accent: '#F87171',
    description: 'Energetic, confident, and impactful',
  },
  {
    id: 'dark',
    name: 'Dark Executive',
    category: 'Bold',
    primary: '#1F2937',
    secondary: '#111827',
    accent: '#6B7280',
    description: 'Premium, high-contrast, and dramatic',
  },
  {
    id: 'teal',
    name: 'Ocean Teal',
    category: 'Nature',
    primary: '#0D9488',
    secondary: '#0F766E',
    accent: '#2DD4BF',
    description: 'Fresh, innovative, and calming',
  },
  {
    id: 'green',
    name: 'Forest Green',
    category: 'Nature',
    primary: '#059669',
    secondary: '#047857',
    accent: '#34D399',
    description: 'Growth, sustainability, and balance',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    category: 'Nature',
    primary: '#10B981',
    secondary: '#059669',
    accent: '#6EE7B7',
    description: 'Vibrant, natural, and prosperous',
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    category: 'Warm',
    primary: '#D97706',
    secondary: '#B45309',
    accent: '#FBBF24',
    description: 'Warm, premium, and luxurious',
  },
  {
    id: 'orange',
    name: 'Sunset Orange',
    category: 'Warm',
    primary: '#EA580C',
    secondary: '#C2410C',
    accent: '#FB923C',
    description: 'Energetic, creative, and bold',
  },
  {
    id: 'rose',
    name: 'Rose Pink',
    category: 'Warm',
    primary: '#F43F5E',
    secondary: '#E11D48',
    accent: '#FB7185',
    description: 'Vibrant, passionate, and memorable',
  },
];

const CATEGORIES = ['Classic', 'Bold', 'Nature', 'Warm'];

interface ThemePickerProps {
  selectedTheme: string;
  onThemeChange: (themeId: string) => void;
  onClose?: () => void;
}

export default function ThemePicker({ selectedTheme, onThemeChange, onClose }: ThemePickerProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? PDF_THEMES.filter((t) => t.category === activeCategory)
    : PDF_THEMES;

  const selected = PDF_THEMES.find((t) => t.id === selectedTheme) || PDF_THEMES[0];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full ring-2 ring-white ring-offset-1 ring-offset-gray-100 shadow"
            style={{ background: `linear-gradient(135deg, ${selected.primary}, ${selected.secondary})` }}
          />
          <span className="text-sm font-semibold text-gray-900">Theme</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
            style={{ background: selected.primary }}
          >
            {selected.name}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-1 px-3 pt-3 pb-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
            activeCategory === null
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
              activeCategory === cat
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Theme grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => onThemeChange(theme.id)}
                className={`relative group text-left rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                  isSelected
                    ? 'border-gray-900 shadow-md scale-[1.02]'
                    : 'border-transparent hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                {/* Color preview bar */}
                <div
                  className="h-10 w-full"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 60%, ${theme.accent} 100%)`,
                  }}
                >
                  {/* Mini document layout preview */}
                  <div className="h-full flex items-end px-2 pb-1 gap-1">
                    <div className="w-1/3 h-1.5 rounded-full bg-white/60" />
                    <div className="w-1/2 h-1 rounded-full bg-white/40" />
                  </div>
                </div>

                {/* Theme info */}
                <div className="p-2 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-900 truncate pr-1">
                      {theme.name}
                    </span>
                    {isSelected && (
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ background: theme.primary }}
                      >
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 leading-tight block mt-0.5">
                    {theme.category}
                  </span>
                </div>

                {/* Hover tooltip */}
                <div className="absolute inset-x-0 bottom-full mb-1 hidden group-hover:flex justify-center pointer-events-none z-10">
                  <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap shadow-xl">
                    {theme.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer: color swatches for selected */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wide">
          Selected palette
        </p>
        <div className="flex items-center gap-2">
          {[selected.primary, selected.secondary, selected.accent].map((color, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full shadow-sm ring-1 ring-black/10"
              style={{ background: color }}
              title={color}
            />
          ))}
          <span className="text-xs text-gray-500 ml-1">{selected.name}</span>
        </div>
      </div>
    </div>
  );
}
