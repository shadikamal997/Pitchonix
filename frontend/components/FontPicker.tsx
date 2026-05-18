'use client';

import { fontOptions, getFontKeyFromStack, getFontStack } from '@/lib/fonts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useMemo, useState } from 'react';

const CATEGORY_LABELS = {
  sans: 'Sans Serif',
  serif: 'Serif',
  display: 'Display',
  script: 'Script',
  mono: 'Monospace',
} as const;

interface FontPickerProps {
  value?: string;
  onChange?: (font: string) => void;
  className?: string;
  returnValue?: 'key' | 'stack';
}

export function FontPicker({ value, onChange, className = '', returnValue = 'key' }: FontPickerProps) {
  const [selected, setSelected] = useState(getFontKeyFromStack(value));

  useEffect(() => {
    setSelected(getFontKeyFromStack(value));
  }, [value]);

  const groupedFonts = useMemo(() => {
    return (Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map(category => ({
      category,
      label: CATEGORY_LABELS[category],
      fonts: fontOptions.filter(font => font.category === category),
    }));
  }, []);

  const handleChange = (newValue: string) => {
    setSelected(newValue);
    onChange?.(returnValue === 'stack' ? getFontStack(newValue) : newValue);
  };

  return (
    <Select value={selected} onValueChange={handleChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Font family" />
      </SelectTrigger>
      <SelectContent className="max-h-96">
        {groupedFonts.map(category => (
          <div key={category.category}>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
              {category.label}
            </div>
            {category.fonts.map(font => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: getFontStack(font.value) }}>
                  {font.label}
                </span>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FontPreviewCard({ fontKey, fontName }: { fontKey: string; fontName: string }) {
  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <p style={{ fontFamily: getFontStack(fontKey) }} className="text-lg mb-1">
        Aa Bb Cc Dd
      </p>
      <p className="text-xs text-muted-foreground">{fontName}</p>
    </div>
  );
}

export function FontGrid() {
  const groupedFonts = (Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map(category => ({
    category,
    label: CATEGORY_LABELS[category],
    fonts: fontOptions.filter(font => font.category === category),
  }));

  return (
    <div className="space-y-6">
      {groupedFonts.map(category => (
        <div key={category.category}>
          <h3 className="text-lg font-semibold mb-4">{category.label} Fonts</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {category.fonts.map(font => (
              <FontPreviewCard
                key={font.value}
                fontKey={font.value}
                fontName={font.label}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
