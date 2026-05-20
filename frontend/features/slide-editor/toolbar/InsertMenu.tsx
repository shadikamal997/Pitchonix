'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Plus, ChevronDown, Type, Heading1, Heading2, AlignLeft, List, ListOrdered,
  Quote, BarChart3, Table as TableIcon, Image as ImgIcon, Star, Square, Circle,
  Triangle, MoveRight, Hash, Sparkles, MessageSquare, Tag, Layers, AlignCenter,
} from 'lucide-react';
import type { ElementType, SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  InsertMenu — top-toolbar dropdown that creates new elements on the slide.
//
//  Categories (each a section in the dropdown):
//    Text:        heading, subheading, paragraph, quote, caption
//    Lists:       bulletList, numberedList
//    Data:        metric, chart, table
//    Media:       image, icon, logo
//    Shapes:      shape (rect/circle/etc.)
//    Blocks:      cta, footer, divider
//
//  Each entry has a "default" content payload + a sensible starting box so the
//  inserted element appears centered and immediately useful.
// =============================================================================

interface InsertSpec {
  type:    ElementType;
  label:   string;
  icon:    React.ComponentType<any>;
  default: () => Partial<SlideElementDTO>;
}

const PALETTE: InsertSpec[] = [
  // ── Text ────────────────────────────────────────────────────────────────
  { type: 'heading',    label: 'Heading',    icon: Heading1,   default: () => textDefault('Heading',    'New heading',    { fontSize: 32, fontWeight: 700 }) },
  { type: 'subheading', label: 'Subheading', icon: Heading2,   default: () => textDefault('Subheading', 'New subheading', { fontSize: 18, fontWeight: 500 }) },
  { type: 'paragraph',  label: 'Paragraph',  icon: AlignLeft,  default: () => textDefault('Paragraph',  'Type your text…', { fontSize: 14, fontWeight: 400 }, 18) },
  { type: 'quote',      label: 'Quote',      icon: Quote,      default: () => ({ type: 'quote', name: 'Quote', ...box(35, 25), content: { text: 'A short quote', attribution: 'Author' } }) },
  { type: 'caption',    label: 'Caption',    icon: Type,       default: () => textDefault('Caption',    'caption text',   { fontSize: 11 }, 6) },

  // ── Lists ───────────────────────────────────────────────────────────────
  { type: 'bulletList',   label: 'Bullet list',   icon: List,        default: () => listDefault(false) },
  { type: 'numberedList', label: 'Numbered list', icon: ListOrdered, default: () => listDefault(true) },

  // ── Data ────────────────────────────────────────────────────────────────
  { type: 'metric', label: 'Metric',  icon: Hash,       default: () => ({ type: 'metric', name: 'Metric',  ...box(25, 14), content: { value: '99%', label: 'Reliability' } }) },
  { type: 'chart',  label: 'Chart',   icon: BarChart3,  default: () => ({ type: 'chart',  name: 'Chart',   ...box(55, 32), content: { type: 'bar', categories: ['Q1','Q2','Q3','Q4'], series: [{ name: 'Revenue', values: [10,20,30,40], color: '#16a34a' }], legend: { visible: true, position: 'bottom' } } }) },
  { type: 'table',  label: 'Table',   icon: TableIcon,  default: () => ({ type: 'table',  name: 'Table',   ...box(60, 22), content: { headers: [{ text: 'Col A', bold: true }, { text: 'Col B', bold: true }], rows: [[{ text: '' }, { text: '' }], [{ text: '' }, { text: '' }]], borders: { color: '#e5e7eb', width: 1, style: 'solid' } } }) },

  // ── Media ───────────────────────────────────────────────────────────────
  { type: 'image', label: 'Image', icon: ImgIcon,        default: () => ({ type: 'image', name: 'Image', ...box(40, 30), content: { src: '', alt: '', fit: 'cover', focalX: 0.5, focalY: 0.5 } }) },
  { type: 'icon',  label: 'Icon',  icon: Star,           default: () => ({ type: 'icon',  name: 'Icon',  ...box(8, 8, 46, 46),  content: { name: 'Star', library: 'lucide', color: '#16a34a', strokeWidth: 2 } }) },
  { type: 'logo',  label: 'Logo',  icon: Tag,            default: () => ({ type: 'logo',  name: 'Logo',  ...box(15, 8),  content: { name: 'Acme', height: 32 } }) },

  // ── Shapes ──────────────────────────────────────────────────────────────
  { type: 'shape', label: 'Rectangle', icon: Square,    default: () => shapeDefault('rect') },
  { type: 'shape', label: 'Circle',    icon: Circle,    default: () => shapeDefault('circle') },
  { type: 'shape', label: 'Triangle',  icon: Triangle,  default: () => shapeDefault('triangle') },
  { type: 'shape', label: 'Arrow',     icon: MoveRight, default: () => shapeDefault('arrow') },
  { type: 'shape', label: 'Star',      icon: Sparkles,  default: () => shapeDefault('star') },

  // ── Blocks ──────────────────────────────────────────────────────────────
  { type: 'cta',     label: 'CTA button', icon: AlignCenter, default: () => ({ type: 'cta',     name: 'CTA', ...box(20, 6), content: { text: 'Get started', variant: 'primary' } }) },
  { type: 'footer',  label: 'Footer',     icon: AlignCenter, default: () => ({ type: 'footer',  name: 'Footer', x: 6, y: 94, width: 70, height: 4, content: { text: '' } }) },
  { type: 'divider', label: 'Divider',    icon: Layers,      default: () => ({ type: 'divider', name: 'Divider', ...box(60, 2), content: { stroke: '#e5e7eb', strokeWidth: 1 } }) },

  // ── Composites ───────────────────────────────────────────────────────────
  { type: 'testimonial',  label: 'Testimonial', icon: MessageSquare, default: () => ({ type: 'testimonial', name: 'Testimonial', ...box(60, 30), content: { quote: '"This product changed how we work."', author: 'Jane Smith', role: 'CEO', company: 'Acme Inc.' } }) },
  { type: 'teamCard',     label: 'Team',        icon: MessageSquare, default: () => ({ type: 'teamCard', name: 'Team', ...box(80, 35), content: { members: [
    { id: 't1', name: 'Alex Kim', role: 'CEO' },
    { id: 't2', name: 'Maria Chen', role: 'CTO' },
    { id: 't3', name: 'Sam Park', role: 'Design' },
  ] } }) },
  { type: 'pricingCard',  label: 'Pricing',     icon: Tag,           default: () => ({ type: 'pricingCard', name: 'Pricing', ...box(80, 40), content: { tiers: [
    { id: 'p1', name: 'Starter',    price: '$9',  period: 'month', features: ['1 user', 'Basic'] },
    { id: 'p2', name: 'Pro',        price: '$29', period: 'month', features: ['10 users', 'All features'], highlight: true },
    { id: 'p3', name: 'Enterprise', price: 'Custom',                features: ['Unlimited', 'SLA'] },
  ] } }) },
  { type: 'comparison',   label: 'Comparison',  icon: TableIcon,     default: () => ({ type: 'comparison', name: 'Comparison', ...box(80, 35), content: {
    columns: ['Free', 'Pro', 'Enterprise'],
    rows: [
      { feature: 'Team size',    values: ['1', '10', 'Unlimited'] },
      { feature: 'Support',      values: ['Email', 'Priority', 'Dedicated'] },
      { feature: 'Integrations', values: ['Basic', 'All', 'Custom'] },
    ],
    highlightColumn: 1,
  } }) },
  { type: 'swot',         label: 'SWOT',        icon: Sparkles,      default: () => ({ type: 'swot', name: 'SWOT', ...box(70, 50), content: {
    strengths:     ['Strong brand', 'Loyal team'],
    weaknesses:    ['Limited reach'],
    opportunities: ['New markets', 'Partnerships'],
    threats:       ['New entrants'],
  } }) },
  { type: 'featureGrid',  label: 'Feature grid', icon: Sparkles,     default: () => ({ type: 'featureGrid', name: 'Features', ...box(80, 40), content: { columns: 3, items: [
    { id: 'f1', title: 'Fast',    description: 'Lightning quick' },
    { id: 'f2', title: 'Simple',  description: 'Easy to use' },
    { id: 'f3', title: 'Secure',  description: 'End-to-end encrypted' },
  ] } }) },
  { type: 'processSteps', label: 'Process',     icon: AlignLeft,     default: () => ({ type: 'processSteps', name: 'Process', ...box(80, 30), content: { steps: [
    { id: 's1', title: 'Discover', description: 'Understand the problem' },
    { id: 's2', title: 'Design',   description: 'Plan the solution' },
    { id: 's3', title: 'Build',    description: 'Ship & iterate' },
  ] } }) },
  { type: 'timeline',     label: 'Timeline',    icon: AlignLeft,     default: () => ({ type: 'timeline', name: 'Timeline', ...box(80, 25), content: { items: [
    { id: 'e1', date: 'Q1', title: 'Launch',    description: 'Initial release' },
    { id: 'e2', date: 'Q2', title: 'Expand',    description: 'New markets' },
    { id: 'e3', date: 'Q3', title: 'Scale',     description: 'Team & infrastructure' },
  ] } }) },
  { type: 'roadmap',      label: 'Roadmap',     icon: AlignLeft,     default: () => ({ type: 'roadmap', name: 'Roadmap', ...box(80, 35), content: { phases: [
    { id: 'r1', period: 'Q1 2026', phase: 'Foundation', bullets: ['Setup', 'Hire'] },
    { id: 'r2', period: 'Q2 2026', phase: 'Growth',     bullets: ['Marketing', 'Sales'] },
    { id: 'r3', period: 'Q3 2026', phase: 'Scale',      bullets: ['Series A', 'Hire 20'] },
  ] } }) },
];

function box(w: number, h: number, x?: number, y?: number) {
  return {
    x: x ?? Math.max(0, (100 - w) / 2),
    y: y ?? Math.max(0, (100 - h) / 2),
    width: w,
    height: h,
  };
}
function textDefault(label: string, text: string, style: Record<string, any>, h = 10) {
  return { type: label.toLowerCase() as ElementType, name: label, ...box(60, h), content: { text }, style };
}
function listDefault(numbered: boolean) {
  return {
    type: (numbered ? 'numberedList' : 'bulletList') as ElementType,
    name: numbered ? 'Numbered list' : 'Bullet list',
    ...box(60, 25),
    content: {
      items: [
        { id: `item-${Date.now()}-1`, text: 'First item' },
        { id: `item-${Date.now()}-2`, text: 'Second item' },
        { id: `item-${Date.now()}-3`, text: 'Third item' },
      ],
      ...(numbered ? { start: 1 } : {}),
    },
  };
}
function shapeDefault(kind: string) {
  return { type: 'shape' as ElementType, name: kind.charAt(0).toUpperCase() + kind.slice(1), ...box(15, 15), content: { kind, fill: '#16a34a' } };
}

const SECTIONS: Array<{ label: string; items: InsertSpec[] }> = [
  { label: 'Text',       items: PALETTE.slice(0,  5)  },
  { label: 'Lists',      items: PALETTE.slice(5,  7)  },
  { label: 'Data',       items: PALETTE.slice(7,  10) },
  { label: 'Media',      items: PALETTE.slice(10, 13) },
  { label: 'Shapes',     items: PALETTE.slice(13, 18) },
  { label: 'Blocks',     items: PALETTE.slice(18, 21) },
  { label: 'Composites', items: PALETTE.slice(21)     },
];

interface Props {
  onInsert: (def: Partial<SlideElementDTO>) => void;
}

export const InsertMenu: React.FC<Props> = ({ onInsert }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-7 px-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-xs font-semibold rounded shadow-md shadow-green-500/30 flex items-center gap-1.5 hover:from-green-700 hover:to-green-800"
        title="Insert element"
      >
        <Plus className="w-3.5 h-3.5" />
        Insert
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[260px] bg-white border border-slate-200 rounded-lg shadow-2xl z-50 max-h-[420px] overflow-y-auto">
          {SECTIONS.map((sec) => (
            <div key={sec.label} className="py-1.5 border-b border-slate-100 last:border-b-0">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{sec.label}</div>
              <div className="grid grid-cols-3 gap-0.5 px-1.5">
                {sec.items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <button
                      key={`${it.type}-${it.label}`}
                      type="button"
                      onClick={() => { onInsert(it.default()); setOpen(false); }}
                      className="flex flex-col items-center gap-1 py-2 rounded text-slate-700 hover:bg-green-50 hover:text-green-800 transition-colors"
                      title={it.label}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{it.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
