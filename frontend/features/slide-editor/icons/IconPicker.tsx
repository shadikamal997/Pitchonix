'use client';

import React, { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Search } from 'lucide-react';

// =============================================================================
//  IconPicker — searchable grid of curated Lucide icons.
//
//  We don't expose the full ~1400 lucide registry — too overwhelming. Curated
//  list of ~140 commonly useful icons, grouped by intent.
// =============================================================================

const CURATED_ICONS: string[] = [
  // General
  'Star', 'Heart', 'Bookmark', 'Sparkles', 'Sun', 'Moon', 'Cloud', 'Flag',
  'Award', 'Trophy', 'Gem', 'Crown', 'Diamond', 'Gift', 'Tag', 'Hash',

  // Communication
  'Mail', 'MessageSquare', 'MessageCircle', 'Phone', 'Send', 'Bell', 'AtSign',
  'Inbox', 'Reply', 'Share', 'Share2', 'Megaphone', 'Mic', 'Volume2',

  // People / users
  'User', 'Users', 'UserPlus', 'UserCheck', 'UserCog', 'UserX', 'Contact',

  // Business
  'Briefcase', 'Building', 'Building2', 'Factory', 'Store', 'Banknote',
  'CreditCard', 'DollarSign', 'CircleDollarSign', 'TrendingUp', 'TrendingDown',
  'LineChart', 'BarChart', 'BarChart3', 'PieChart', 'Target', 'CrosshairIcon',

  // Files & docs
  'FileText', 'File', 'Files', 'Folder', 'FolderOpen', 'Archive', 'Download',
  'Upload', 'Save', 'Edit', 'Edit2', 'Edit3', 'Copy', 'Clipboard', 'Trash2',

  // UI controls
  'Settings', 'Settings2', 'Sliders', 'Search', 'Filter', 'X', 'Plus', 'Minus',
  'Check', 'CheckCircle', 'CheckCircle2', 'AlertCircle', 'AlertTriangle', 'Info',
  'HelpCircle', 'Eye', 'EyeOff', 'Lock', 'Unlock', 'Shield', 'ShieldCheck',

  // Arrows / nav
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ChevronUp', 'ChevronDown', 'ChevronLeft', 'ChevronRight',
  'CornerUpRight', 'CornerDownRight', 'Move', 'Maximize', 'Minimize',

  // Tech
  'Code', 'Code2', 'Terminal', 'Cpu', 'Database', 'Server', 'Cloud',
  'CloudUpload', 'CloudDownload', 'Wifi', 'Bluetooth', 'Globe', 'Globe2',

  // Time / calendar
  'Calendar', 'CalendarCheck', 'Clock', 'Timer', 'Hourglass', 'History',

  // Misc / process
  'Zap', 'Rocket', 'Lightbulb', 'Compass', 'Map', 'MapPin', 'Route',
  'Workflow', 'GitBranch', 'GitMerge', 'GitPullRequest', 'Layers', 'Layers2',
  'Package', 'Package2', 'Box', 'Boxes', 'Truck', 'ShoppingCart', 'Tag',

  // Media
  'Image', 'Camera', 'Video', 'Music', 'Play', 'Pause', 'Square', 'Circle',
  'Triangle',
];

// Dedup + drop unknown
const VALID_ICONS = Array.from(new Set(CURATED_ICONS))
  .filter((n) => typeof (Lucide as any)[n] !== 'undefined');

interface Props {
  /** Current icon name (lucide component name). */
  value:    string | undefined;
  onChange: (name: string) => void;
}

export const IconPicker: React.FC<Props> = ({ value, onChange }) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return VALID_ICONS;
    return VALID_ICONS.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons…"
          className="w-full h-7 pl-7 pr-2 text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30"
        />
      </div>

      <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto bg-slate-50 border border-slate-200 rounded p-1.5">
        {filtered.map((name) => {
          const I = (Lucide as any)[name] as LucideIcon;
          const isSel = value === name;
          return (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => onChange(name)}
              className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                isSel
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-green-50 hover:text-green-800 border border-transparent'
              }`}
            >
              <I className="w-4 h-4" />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-6 py-3 text-center text-[10px] text-slate-400">No icons match "{query}"</p>
        )}
      </div>

      <p className="text-[10px] text-slate-400">Selected: <span className="font-mono">{value || '(none)'}</span></p>
    </div>
  );
};

// =============================================================================
//  Dynamic icon component used by the renderer.
// =============================================================================

export function getLucideIcon(name: string | undefined): LucideIcon | null {
  if (!name) return null;
  const I = (Lucide as any)[name];
  return typeof I === 'undefined' ? null : (I as LucideIcon);
}
