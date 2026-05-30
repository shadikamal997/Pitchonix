'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, ChevronDown, Type, Heading1, Heading2, AlignLeft, List, ListOrdered,
  Quote, BarChart3, Table as TableIcon, Image as ImgIcon, Star, Square, Circle,
  Triangle, MoveRight, Hash, Sparkles, MessageSquare, Tag, Layers, AlignCenter,
} from 'lucide-react';
import type { ElementType, SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  InsertMenu — top-toolbar dropdown that creates new elements on the slide.
// =============================================================================

interface InsertSpec {
  type:    ElementType;
  label:   string;
  desc:    string;
  icon:    React.ComponentType<any>;
  default: () => Partial<SlideElementDTO>;
}

const PALETTE: InsertSpec[] = [
  // ── Text ────────────────────────────────────────────────────────────────
  { type: 'heading',    label: 'Heading',      desc: 'Large bold slide title',             icon: Heading1,      default: () => textDefault('Heading',    'New heading',     { fontSize: 32, fontWeight: 700 }) },
  { type: 'subheading', label: 'Subheading',   desc: 'Secondary title or section name',    icon: Heading2,      default: () => textDefault('Subheading', 'New subheading',  { fontSize: 18, fontWeight: 500 }) },
  { type: 'paragraph',  label: 'Paragraph',    desc: 'Body text and descriptions',         icon: AlignLeft,     default: () => textDefault('Paragraph',  'Type your text…', { fontSize: 14, fontWeight: 400 }, 18) },
  { type: 'quote',      label: 'Quote',        desc: 'Pull quote with attribution',        icon: Quote,         default: () => ({ type: 'quote', name: 'Quote', ...box(35, 25), content: { text: 'A short quote', attribution: 'Author' } }) },
  { type: 'caption',    label: 'Caption',      desc: 'Small label or footnote text',       icon: Type,          default: () => textDefault('Caption',    'caption text',    { fontSize: 11 }, 6) },

  // ── Lists ───────────────────────────────────────────────────────────────
  { type: 'bulletList',   label: 'Bullet list',   desc: 'Unordered points with bullet dots',  icon: List,        default: () => listDefault(false) },
  { type: 'numberedList', label: 'Numbered list', desc: 'Ordered steps or ranked items',      icon: ListOrdered, default: () => listDefault(true) },

  // ── Data ────────────────────────────────────────────────────────────────
  { type: 'metric', label: 'Metric',  desc: 'Single KPI number with label',        icon: Hash,      default: () => ({ type: 'metric', name: 'Metric', ...box(25, 14), content: { value: '99%', label: 'Reliability' } }) },
  { type: 'chart',  label: 'Chart',   desc: 'Bar, line or pie chart',              icon: BarChart3, default: () => ({ type: 'chart',  name: 'Chart',  ...box(55, 32), content: { type: 'bar', categories: ['Q1','Q2','Q3','Q4'], series: [{ name: 'Revenue', values: [10,20,30,40], color: '#16a34a' }], legend: { visible: true, position: 'bottom' } } }) },
  { type: 'table',  label: 'Table',   desc: 'Rows and columns of data',            icon: TableIcon, default: () => ({ type: 'table',  name: 'Table',  ...box(60, 22), content: { headers: [{ text: 'Col A', bold: true }, { text: 'Col B', bold: true }], rows: [[{ text: '' }, { text: '' }], [{ text: '' }, { text: '' }]], borders: { color: '#e5e7eb', width: 1, style: 'solid' } } }) },

  // ── Media ───────────────────────────────────────────────────────────────
  { type: 'image', label: 'Image', desc: 'Photo or graphic placeholder',         icon: ImgIcon, default: () => ({ type: 'image', name: 'Image', ...box(40, 30), content: { src: '', alt: '', fit: 'cover', focalX: 0.5, focalY: 0.5 } }) },
  { type: 'icon',  label: 'Icon',  desc: 'Symbol from Lucide icon library',      icon: Star,    default: () => ({ type: 'icon',  name: 'Icon',  ...box(8, 8, 46, 46), content: { name: 'Star', library: 'lucide', color: '#16a34a', strokeWidth: 2 } }) },
  { type: 'logo',  label: 'Logo',  desc: 'Company or brand logo mark',           icon: Tag,     default: () => ({ type: 'logo',  name: 'Logo',  ...box(15, 8), content: { name: 'Acme', height: 32 } }) },

  // ── Shapes ──────────────────────────────────────────────────────────────
  { type: 'shape', label: 'Rectangle', desc: 'Filled or outlined rectangle',     icon: Square,    default: () => shapeDefault('rect') },
  { type: 'shape', label: 'Circle',    desc: 'Filled or outlined circle',        icon: Circle,    default: () => shapeDefault('circle') },
  { type: 'shape', label: 'Triangle',  desc: 'Triangular decorative accent',     icon: Triangle,  default: () => shapeDefault('triangle') },
  { type: 'shape', label: 'Arrow',     desc: 'Directional pointer or flow line', icon: MoveRight, default: () => shapeDefault('arrow') },
  { type: 'shape', label: 'Star',      desc: 'Star or badge accent shape',       icon: Sparkles,  default: () => shapeDefault('star') },

  // ── Blocks ──────────────────────────────────────────────────────────────
  { type: 'cta',     label: 'CTA button', desc: 'Call-to-action click button',    icon: AlignCenter, default: () => ({ type: 'cta',     name: 'CTA',     ...box(20, 6), content: { text: 'Get started', variant: 'primary' } }) },
  { type: 'footer',  label: 'Footer',     desc: 'Bottom bar with page text',      icon: AlignCenter, default: () => ({ type: 'footer',  name: 'Footer',  x: 6, y: 94, width: 70, height: 4, content: { text: '' } }) },
  { type: 'divider', label: 'Divider',    desc: 'Horizontal separator line',      icon: Layers,      default: () => ({ type: 'divider', name: 'Divider', ...box(60, 2), content: { stroke: '#e5e7eb', strokeWidth: 1 } }) },

  // ── Composites ───────────────────────────────────────────────────────────
  { type: 'testimonial',  label: 'Testimonial',  desc: 'Customer quote with name and role',         icon: MessageSquare, default: () => ({ type: 'testimonial', name: 'Testimonial', ...box(60, 30), content: { quote: '"This product changed how we work."', author: 'Jane Smith', role: 'CEO', company: 'Acme Inc.' } }) },
  { type: 'teamCard',     label: 'Team',         desc: 'Member profiles with names and roles',      icon: MessageSquare, default: () => ({ type: 'teamCard', name: 'Team', ...box(80, 35), content: { members: [
    { id: 't1', name: 'Alex Kim',    role: 'CEO' },
    { id: 't2', name: 'Maria Chen',  role: 'CTO' },
    { id: 't3', name: 'Sam Park',    role: 'Design' },
  ] } }) },
  { type: 'pricingCard',  label: 'Pricing',      desc: 'Tiered plan cards with features',           icon: Tag,           default: () => ({ type: 'pricingCard', name: 'Pricing', ...box(80, 40), content: { tiers: [
    { id: 'p1', name: 'Starter',    price: '$9',     period: 'month', features: ['1 user', 'Basic'] },
    { id: 'p2', name: 'Pro',        price: '$29',    period: 'month', features: ['10 users', 'All features'], highlight: true },
    { id: 'p3', name: 'Enterprise', price: 'Custom',                  features: ['Unlimited', 'SLA'] },
  ] } }) },
  { type: 'comparison',   label: 'Comparison',   desc: 'Side-by-side feature comparison grid',      icon: TableIcon,     default: () => ({ type: 'comparison', name: 'Comparison', ...box(80, 35), content: {
    columns: ['Free', 'Pro', 'Enterprise'],
    rows: [
      { feature: 'Team size',    values: ['1', '10', 'Unlimited'] },
      { feature: 'Support',      values: ['Email', 'Priority', 'Dedicated'] },
      { feature: 'Integrations', values: ['Basic', 'All', 'Custom'] },
    ],
    highlightColumn: 1,
  } }) },
  { type: 'swot',         label: 'SWOT',         desc: 'Strengths, weaknesses, opportunities, threats', icon: Sparkles,  default: () => ({ type: 'swot', name: 'SWOT', ...box(70, 50), content: {
    strengths:     ['Strong brand', 'Loyal team'],
    weaknesses:    ['Limited reach'],
    opportunities: ['New markets', 'Partnerships'],
    threats:       ['New entrants'],
  } }) },
  { type: 'featureGrid',  label: 'Feature grid', desc: 'Icon + title + description card grid',      icon: Sparkles,      default: () => ({ type: 'featureGrid', name: 'Features', ...box(80, 40), content: { columns: 3, items: [
    { id: 'f1', title: 'Fast',    description: 'Lightning quick' },
    { id: 'f2', title: 'Simple',  description: 'Easy to use' },
    { id: 'f3', title: 'Secure',  description: 'End-to-end encrypted' },
  ] } }) },
  { type: 'processSteps', label: 'Process',      desc: 'Numbered step-by-step workflow',            icon: AlignLeft,     default: () => ({ type: 'processSteps', name: 'Process', ...box(80, 30), content: { steps: [
    { id: 's1', title: 'Discover', description: 'Understand the problem' },
    { id: 's2', title: 'Design',   description: 'Plan the solution' },
    { id: 's3', title: 'Build',    description: 'Ship & iterate' },
  ] } }) },
  { type: 'timeline',     label: 'Timeline',     desc: 'Events or milestones ordered by date',      icon: AlignLeft,     default: () => ({ type: 'timeline', name: 'Timeline', ...box(80, 25), content: { items: [
    { id: 'e1', date: 'Q1', title: 'Launch',  description: 'Initial release' },
    { id: 'e2', date: 'Q2', title: 'Expand',  description: 'New markets' },
    { id: 'e3', date: 'Q3', title: 'Scale',   description: 'Team & infrastructure' },
  ] } }) },
  { type: 'roadmap',      label: 'Roadmap',      desc: 'Quarterly phases with delivery goals',      icon: AlignLeft,     default: () => ({ type: 'roadmap', name: 'Roadmap', ...box(80, 35), content: { phases: [
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
  const [open, setOpen]     = useState(false);
  const [pos, setPos]       = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const reposition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: r.left });
  }, []);

  const handleOpen = () => {
    reposition();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const panel  = document.getElementById('insert-menu-panel');
      if (btnRef.current?.contains(target) || panel?.contains(target)) return;
      setOpen(false);
    };
    const onScroll = () => reposition();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, reposition]);

  const dropdown = open && pos && mounted ? createPortal(
    <div
      id="insert-menu-panel"
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, width: 320, maxHeight: `calc(100vh - ${pos.top + 12}px)` }}
      className="bg-white border border-[#E3E1DA] rounded-lg shadow-2xl overflow-y-auto"
    >
      {SECTIONS.map((sec) => (
        <div key={sec.label} className="py-2 border-b border-[#F1F0EC] last:border-b-0">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A]">
            {sec.label}
          </div>
          <div className="px-1.5 space-y-0.5">
            {sec.items.map((it) => {
              const Icon = it.icon;
              return (
                <button
                  key={`${it.type}-${it.label}`}
                  type="button"
                  onClick={() => { onInsert(it.default()); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-left hover:bg-[#EEF5F1] group transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-[#F4F3EF] group-hover:bg-white flex items-center justify-center flex-shrink-0 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-[#555]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-[#111111] leading-tight">{it.label}</div>
                    <div className="text-[10px] text-[#9A9A9A] leading-tight mt-0.5">{it.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="h-7 px-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-xs font-semibold rounded shadow-md shadow-green-500/30 flex items-center gap-1.5 hover:from-green-700 hover:to-green-800"
        title="Insert element"
      >
        <Plus className="w-3.5 h-3.5" />
        Insert
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {dropdown}
    </>
  );
};
