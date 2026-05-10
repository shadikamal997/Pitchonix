'use client';

import React from 'react';

interface PreviewProps {
  className?: string;
  style?: React.CSSProperties;
}

// ── colour palettes per template ──────────────────────────────────────────────
const palettes: Record<string, { p: string; s: string; a: string; bg: string; text: string }> = {
  modern_one_pager:   { p: '#2563EB', s: '#1D4ED8', a: '#60A5FA', bg: '#EFF6FF', text: '#1E40AF' },
  business_flyer:     { p: '#7C3AED', s: '#6D28D9', a: '#A78BFA', bg: '#F5F3FF', text: '#5B21B6' },
  case_study_sheet:   { p: '#059669', s: '#047857', a: '#34D399', bg: '#ECFDF5', text: '#065F46' },
  startup_overview:   { p: '#EA580C', s: '#C2410C', a: '#FB923C', bg: '#FFF7ED', text: '#9A3412' },
  marketing_flyer:    { p: '#DB2777', s: '#BE185D', a: '#F472B6', bg: '#FDF2F8', text: '#9D174D' },
  corporate_brochure: { p: '#1E40AF', s: '#1E3A8A', a: '#3B82F6', bg: '#EFF6FF', text: '#1E3A8A' },
  executive_handout:  { p: '#374151', s: '#1F2937', a: '#6B7280', bg: '#F9FAFB', text: '#111827' },
  product_flyer:      { p: '#0D9488', s: '#0F766E', a: '#2DD4BF', bg: '#F0FDFA', text: '#134E4A' },
  brand_overview:     { p: '#E11D48', s: '#BE123C', a: '#FB7185', bg: '#FFF1F2', text: '#9F1239' },
  promotional_sheet:  { p: '#D97706', s: '#B45309', a: '#FBBF24', bg: '#FFFBEB', text: '#92400E' },
};

const defaultPalette = palettes.modern_one_pager;

function getPalette(id: string) { return palettes[id] || defaultPalette; }

// ── individual SVG mockups ─────────────────────────────────────────────────────

function ModernOnePagerSVG({ className, style }: PreviewProps) {
  const c = getPalette('modern_one_pager');
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect width="300" height="200" fill="white" />
      {/* Hero gradient band */}
      <defs>
        <linearGradient id="mop-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.p} />
          <stop offset="100%" stopColor={c.s} />
        </linearGradient>
      </defs>
      <rect width="300" height="70" fill="url(#mop-g)" />
      {/* Mock image block */}
      <rect x="180" y="8" width="108" height="54" rx="4" fill={c.a} opacity="0.3" />
      <rect x="195" y="16" width="78" height="38" rx="3" fill={c.a} opacity="0.5" />
      {/* Title text */}
      <rect x="12" y="14" width="120" height="8" rx="2" fill="white" />
      <rect x="12" y="26" width="80" height="5" rx="2" fill="rgba(255,255,255,0.65)" />
      <rect x="12" y="36" width="56" height="5" rx="2" fill="rgba(255,255,255,0.5)" />
      {/* CTA button */}
      <rect x="12" y="48" width="52" height="14" rx="7" fill="white" />
      <rect x="20" y="52" width="36" height="6" rx="2" fill={c.p} />
      {/* Metrics row */}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x={12 + i*96} y="78" width="86" height="36" rx="4" fill={c.bg} />
          <rect x={22 + i*96} y="84" width="30" height="8" rx="2" fill={c.p} />
          <rect x={22 + i*96} y="96" width="50" height="4" rx="2" fill={c.a} opacity="0.6" />
          <rect x={22 + i*96} y="104" width="40" height="4" rx="2" fill="#D1D5DB" />
        </g>
      ))}
      {/* Body cards */}
      <rect x="12" y="122" width="130" height="64" rx="4" fill={c.bg} />
      <rect x="22" y="130" width="60" height="6" rx="2" fill={c.p} />
      <rect x="22" y="140" width="100" height="4" rx="2" fill="#9CA3AF" />
      <rect x="22" y="148" width="85" height="4" rx="2" fill="#D1D5DB" />
      <rect x="22" y="156" width="92" height="4" rx="2" fill="#D1D5DB" />
      <rect x="22" y="164" width="70" height="4" rx="2" fill="#D1D5DB" />

      <rect x="152" y="122" width="136" height="64" rx="4" fill={c.bg} />
      <rect x="162" y="130" width="55" height="6" rx="2" fill={c.s} />
      <rect x="162" y="140" width="106" height="4" rx="2" fill="#9CA3AF" />
      <rect x="162" y="148" width="90" height="4" rx="2" fill="#D1D5DB" />
      <rect x="162" y="156" width="100" height="4" rx="2" fill="#D1D5DB" />
      <rect x="162" y="164" width="78" height="4" rx="2" fill="#D1D5DB" />
      {/* Footer */}
      <rect width="300" height="8" y="192" fill={c.p} />
    </svg>
  );
}

function BusinessFlyerSVG({ className, style }: PreviewProps) {
  const c = getPalette('business_flyer');
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <defs>
        <linearGradient id="bf-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.p} />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#bf-g)" />
      {/* Overlay circle shapes */}
      <circle cx="240" cy="40" r="70" fill={c.a} opacity="0.12" />
      <circle cx="60" cy="160" r="55" fill={c.a} opacity="0.1" />
      {/* Central content */}
      <rect x="30" y="30" width="160" height="10" rx="3" fill="white" />
      <rect x="30" y="46" width="100" height="7" rx="3" fill={c.a} opacity="0.8" />
      <rect x="30" y="60" width="200" height="5" rx="2" fill="rgba(255,255,255,0.5)" />
      <rect x="30" y="70" width="175" height="5" rx="2" fill="rgba(255,255,255,0.4)" />
      <rect x="30" y="80" width="185" height="5" rx="2" fill="rgba(255,255,255,0.4)" />
      {/* Divider */}
      <rect x="30" y="96" width="50" height="2" rx="1" fill={c.a} />
      {/* Key points */}
      {[0,1,2].map(i => (
        <g key={i}>
          <circle cx="38" cy={110 + i*16} r="4" fill={c.a} opacity="0.8" />
          <rect x="48" y={106 + i*16} width="130" height="5" rx="2" fill="rgba(255,255,255,0.7)" />
        </g>
      ))}
      {/* CTA */}
      <rect x="30" y="158" width="90" height="22" rx="11" fill={c.a} />
      <rect x="44" y="164" width="62" height="10" rx="2" fill={c.p} />
    </svg>
  );
}

function CaseStudySVG({ className, style }: PreviewProps) {
  const c = getPalette('case_study_sheet');
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect width="300" height="200" fill="white" />
      {/* Left accent stripe */}
      <rect x="0" y="0" width="8" height="200" fill={c.p} />
      {/* Header */}
      <rect x="18" y="12" width="180" height="10" rx="2" fill={c.p} />
      <rect x="18" y="26" width="110" height="6" rx="2" fill={c.a} opacity="0.7" />
      {/* Results metrics */}
      {[0,1,2,3].map(i => (
        <g key={i}>
          <rect x={18 + i*70} y="44" width="60" height="40" rx="4" fill={c.bg} />
          <rect x={23 + i*70} y="50" width="28" height="10" rx="2" fill={c.p} />
          <rect x={23 + i*70} y="64" width="44" height="4" rx="2" fill={c.a} opacity="0.6" />
          <rect x={23 + i*70} y="72" width="35" height="4" rx="2" fill="#D1D5DB" />
        </g>
      ))}
      {/* Challenge / Solution */}
      <rect x="18" y="94" width="126" height="90" rx="4" fill={c.bg} />
      <rect x="26" y="102" width="50" height="6" rx="2" fill={c.s} />
      <rect x="26" y="112" width="100" height="4" rx="2" fill="#9CA3AF" />
      <rect x="26" y="120" width="88" height="4" rx="2" fill="#D1D5DB" />
      <rect x="26" y="128" width="95" height="4" rx="2" fill="#D1D5DB" />
      <rect x="26" y="136" width="80" height="4" rx="2" fill="#D1D5DB" />
      <rect x="26" y="150" width="44" height="6" rx="2" fill={c.s} />
      <rect x="26" y="160" width="100" height="4" rx="2" fill="#9CA3AF" />
      <rect x="26" y="168" width="92" height="4" rx="2" fill="#D1D5DB" />

      <rect x="154" y="94" width="130" height="90" rx="4" fill={c.bg} />
      <rect x="162" y="102" width="55" height="6" rx="2" fill={c.p} />
      {[0,1,2,3].map(i => (
        <g key={i}>
          <circle cx="168" cy={117 + i*14} r="3" fill={c.a} opacity="0.7" />
          <rect x="176" cy={113 + i*14} y={113 + i*14} width="94" height="4" rx="2" fill="#D1D5DB" />
        </g>
      ))}
    </svg>
  );
}

function StartupOverviewSVG({ className, style }: PreviewProps) {
  const c = getPalette('startup_overview');
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <defs>
        <linearGradient id="so-g" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={c.p} />
          <stop offset="100%" stopColor={c.a} />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="white" />
      {/* Top bar */}
      <rect width="300" height="4" fill="url(#so-g)" />
      {/* Logo area */}
      <circle cx="22" cy="22" r="12" fill={c.p} />
      <rect x="10" y="18" width="24" height="8" rx="2" fill="white" opacity="0.7" />
      {/* Title */}
      <rect x="42" y="14" width="140" height="9" rx="2" fill="#1F2937" />
      <rect x="42" y="28" width="90" height="5" rx="2" fill={c.a} opacity="0.8" />
      {/* Hero stat banner */}
      <rect x="12" y="46" width="276" height="36" rx="6" fill={c.p} />
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x={28 + i*96} y="54" width="36" height="10" rx="2" fill="white" />
          <rect x={28 + i*96} y="68" width="60" height="4" rx="2" fill="rgba(255,255,255,0.6)" />
        </g>
      ))}
      {/* Team + traction */}
      <rect x="12" y="92" width="130" height="50" rx="4" fill={c.bg} />
      <rect x="20" y="98" width="45" height="6" rx="2" fill={c.s} />
      {[0,1,2].map(i => (
        <g key={i}>
          <circle cx="22" cy={112 + i*10} r="4" fill={c.a} opacity="0.5" />
          <rect x="32" y={108 + i*10} width="80" height="4" rx="2" fill="#D1D5DB" />
        </g>
      ))}
      <rect x="152" y="92" width="136" height="50" rx="4" fill={c.bg} />
      <rect x="160" y="98" width="55" height="6" rx="2" fill={c.p} />
      {/* Traction bars */}
      {[60,90,75,100].map((h, i) => (
        <rect key={i} x={164 + i*26} y={102 + (40 - Math.round(h*0.3))} width="16" height={Math.round(h*0.3)} rx="2" fill={c.a} opacity="0.7" />
      ))}
      {/* Bottom CTA */}
      <rect x="12" y="152" width="276" height="32" rx="6" fill={c.bg} />
      <rect x="20" y="160" width="140" height="6" rx="2" fill="#6B7280" />
      <rect x="210" y="156" width="68" height="20" rx="10" fill={c.p} />
      <rect x="220" y="162" width="48" height="8" rx="2" fill="white" />
    </svg>
  );
}

function MarketingFlyerSVG({ className, style }: PreviewProps) {
  const c = getPalette('marketing_flyer');
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <defs>
        <linearGradient id="mf-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.p} />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#mf-g)" />
      {/* Pattern dots */}
      {Array.from({length: 20}).map((_, i) => (
        <circle key={i} cx={(i % 5) * 60 + 10} cy={Math.floor(i/5) * 50 + 10} r="3" fill="rgba(255,255,255,0.08)" />
      ))}
      {/* White card */}
      <rect x="20" y="20" width="260" height="160" rx="12" fill="white" opacity="0.95" />
      <rect x="34" y="34" width="160" height="12" rx="3" fill={c.p} />
      <rect x="34" y="52" width="100" height="7" rx="3" fill={c.a} opacity="0.8" />
      <rect x="34" y="66" width="200" height="5" rx="2" fill="#6B7280" />
      <rect x="34" y="76" width="175" height="5" rx="2" fill="#9CA3AF" />
      {/* Feature list */}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x="34" y={92 + i*18} width="14" height="14" rx="7" fill={c.bg} />
          <rect x="40" y={95 + i*18} width="8" height="8" rx="4" fill={c.p} />
          <rect x="54" y={96 + i*18} width="130" height="5" rx="2" fill="#374151" />
        </g>
      ))}
      {/* CTA */}
      <rect x="34" y="152" width="100" height="18" rx="9" fill={c.p} />
      <rect x="46" y="156" width="76" height="10" rx="2" fill="white" />
    </svg>
  );
}

function CorporateBrochureSVG({ className, style }: PreviewProps) {
  const c = getPalette('corporate_brochure');
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect width="300" height="200" fill="white" />
      {/* Header */}
      <rect width="300" height="48" fill={c.p} />
      <rect x="12" y="10" width="18" height="18" rx="2" fill={c.a} opacity="0.6" />
      <rect x="36" y="14" width="100" height="8" rx="2" fill="white" />
      <rect x="36" y="26" width="65" height="4" rx="2" fill="rgba(255,255,255,0.5)" />
      {/* Three column layout */}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x={12 + i*96} y="56" width="86" height="130" rx="4" fill={c.bg} />
          <rect x={16 + i*96} y="60" width="78" height="40" rx="3" fill={c.a} opacity="0.25" />
          <rect x={20 + i*96} y="68" width="50" height="6" rx="2" fill={c.p} />
          <rect x={20 + i*96} y="108" width="45" height="5" rx="2" fill={c.s} />
          <rect x={20 + i*96} y="117" width="66" height="4" rx="2" fill="#9CA3AF" />
          <rect x={20 + i*96} y="125" width="58" height="4" rx="2" fill="#D1D5DB" />
          <rect x={20 + i*96} y="133" width="62" height="4" rx="2" fill="#D1D5DB" />
          <rect x={20 + i*96} y="141" width="50" height="4" rx="2" fill="#D1D5DB" />
          <rect x={20 + i*96} y="155" width="60" height="14" rx="7" fill={c.p} />
        </g>
      ))}
    </svg>
  );
}

function ExecutiveHandoutSVG({ className, style }: PreviewProps) {
  const c = getPalette('executive_handout');
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect width="300" height="200" fill="white" />
      {/* Top accent line */}
      <rect width="300" height="3" fill={c.p} />
      <rect x="0" y="3" width="80" height="3" fill={c.a} opacity="0.6" />
      {/* Header */}
      <rect x="12" y="16" width="200" height="12" rx="2" fill={c.p} />
      <rect x="12" y="32" width="130" height="6" rx="2" fill={c.a} opacity="0.6" />
      {/* Horizontal separator */}
      <rect x="12" y="46" width="276" height="1" fill="#E5E7EB" />
      {/* Two column layout */}
      <rect x="12" y="54" width="130" height="130" rx="4" fill={c.bg} />
      <rect x="20" y="62" width="55" height="7" rx="2" fill={c.p} />
      <rect x="20" y="74" width="110" height="4" rx="2" fill="#6B7280" />
      <rect x="20" y="82" width="95" height="4" rx="2" fill="#9CA3AF" />
      <rect x="20" y="90" width="100" height="4" rx="2" fill="#9CA3AF" />
      <rect x="20" y="106" width="55" height="7" rx="2" fill={c.p} />
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x="20" y={118 + i*12} width="4" height="4" rx="1" fill={c.a} />
          <rect x="28" y={118 + i*12} width="96" height="4" rx="2" fill="#D1D5DB" />
        </g>
      ))}
      <rect x="152" y="54" width="136" height="130" rx="4" fill={c.bg} />
      <rect x="160" y="62" width="55" height="7" rx="2" fill={c.s} />
      {/* Bar chart */}
      {[55, 80, 65, 90, 72].map((h, i) => (
        <rect key={i} x={162 + i*22} y={90 + (50 - Math.round(h*0.5))} width="14" height={Math.round(h*0.5)} rx="2" fill={c.p} opacity="0.7" />
      ))}
      <rect x="160" y="144" width="110" height="4" rx="2" fill="#D1D5DB" />
      <rect x="160" y="156" width="90" height="4" rx="2" fill="#D1D5DB" />
      <rect x="160" y="164" width="100" height="4" rx="2" fill="#D1D5DB" />
    </svg>
  );
}

function ProductFlyerSVG({ className, style }: PreviewProps) {
  const c = getPalette('product_flyer');
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <defs>
        <linearGradient id="pf-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.p} />
          <stop offset="100%" stopColor={c.s} />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="white" />
      {/* Split layout - right image half */}
      <rect x="150" y="0" width="150" height="200" fill={c.bg} />
      <rect x="160" y="16" width="130" height="168" rx="6" fill={c.a} opacity="0.25" />
      <rect x="170" y="30" width="110" height="80" rx="4" fill={c.a} opacity="0.35" />
      <rect x="180" y="40" width="90" height="60" rx="3" fill={c.a} opacity="0.4" />
      {/* Mock product icon */}
      <circle cx="225" cy="70" r="24" fill={c.p} opacity="0.8" />
      <rect x="213" y="64" width="24" height="12" rx="3" fill="white" opacity="0.8" />
      {/* Feature badges */}
      {[0,1,2].map(i => (
        <rect key={i} x={164 + (i%2)*66} y={120 + Math.floor(i/2)*24} width="58" height="16" rx="8" fill={c.p} opacity="0.15" />
      ))}
      {/* Left content */}
      <rect x="12" y="16" width="130" height="10" rx="3" fill={c.p} />
      <rect x="12" y="30" width="90" height="6" rx="2" fill={c.a} opacity="0.8" />
      <rect x="12" y="44" width="126" height="4" rx="2" fill="#6B7280" />
      <rect x="12" y="52" width="110" height="4" rx="2" fill="#9CA3AF" />
      {/* Feature list */}
      {[0,1,2,3].map(i => (
        <g key={i}>
          <rect x="12" y={66 + i*16} width="10" height="10" rx="5" fill={c.bg} />
          <rect x="15" y={68 + i*16} width="6" height="6" rx="3" fill={c.p} />
          <rect x="28" y={69 + i*16} width="106" height="4" rx="2" fill="#374151" />
        </g>
      ))}
      {/* Pricing */}
      <rect x="12" y="136" width="100" height="28" rx="6" fill={c.bg} />
      <rect x="20" y="142" width="40" height="14" rx="2" fill={c.p} />
      <rect x="64" y="148" width="38" height="5" rx="2" fill="#9CA3AF" />
      {/* CTA */}
      <rect x="12" y="170" width="126" height="22" rx="11" fill={c.p} />
      <rect x="40" y="176" width="70" height="10" rx="2" fill="white" />
    </svg>
  );
}

function BrandOverviewSVG({ className, style }: PreviewProps) {
  const c = getPalette('brand_overview');
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect width="300" height="200" fill="#1A1A2E" />
      {/* Color swatch strip */}
      {[c.p, c.s, c.a, '#F472B6', '#818CF8'].map((col, i) => (
        <rect key={i} x={i*60} y="0" width="60" height="8" fill={col} />
      ))}
      {/* Logo area */}
      <circle cx="40" cy="38" r="20" fill={c.p} opacity="0.9" />
      <rect x="28" y="32" width="24" height="12" rx="3" fill="white" opacity="0.8" />
      {/* Brand name */}
      <rect x="70" y="24" width="140" height="12" rx="3" fill="white" />
      <rect x="70" y="40" width="90" height="6" rx="2" fill={c.a} opacity="0.8" />
      {/* Mission */}
      <rect x="12" y="68" width="276" height="40" rx="6" fill="rgba(255,255,255,0.06)" />
      <rect x="20" y="76" width="45" height="6" rx="2" fill={c.a} opacity="0.7" />
      <rect x="20" y="86" width="240" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
      <rect x="20" y="94" width="200" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
      {/* Values */}
      {[0,1,2,3].map(i => (
        <g key={i}>
          <rect x={12 + i*72} y="118" width="62" height="52" rx="6" fill="rgba(255,255,255,0.07)" />
          <rect x={12 + i*72} y="118" width="62" height="6" rx="3" fill={c.p} opacity="0.7" />
          <rect x={18 + i*72} y="130" width="42" height="5" rx="2" fill="rgba(255,255,255,0.6)" />
          <rect x={18 + i*72} y="139" width="50" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
          <rect x={18 + i*72} y="147" width="40" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
          <rect x={18 + i*72} y="155" width="46" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
        </g>
      ))}
      {/* Footer */}
      <rect y="180" width="300" height="20" fill="rgba(255,255,255,0.04)" />
      <rect x="12" y="186" width="80" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
}

function PromotionalSheetSVG({ className, style }: PreviewProps) {
  const c = getPalette('promotional_sheet');
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <defs>
        <linearGradient id="ps-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.p} />
          <stop offset="100%" stopColor={c.s} />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="white" />
      {/* Diagonal banner */}
      <rect x="0" y="0" width="300" height="80" fill="url(#ps-g)" />
      {/* Badge */}
      <circle cx="258" cy="20" r="22" fill="white" opacity="0.15" />
      <rect x="242" y="12" width="32" height="8" rx="2" fill="white" />
      <rect x="244" y="24" width="28" height="6" rx="2" fill="rgba(255,255,255,0.7)" />
      {/* Main promo text */}
      <rect x="14" y="12" width="190" height="12" rx="3" fill="white" />
      <rect x="14" y="30" width="130" height="8" rx="3" fill="rgba(255,255,255,0.75)" />
      <rect x="14" y="44" width="90" height="22" rx="11" fill="white" />
      <rect x="22" y="50" width="74" height="10" rx="3" fill={c.p} />
      {/* Offer cards */}
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x={12 + i*96} y="90" width="86" height="60" rx="6" fill={c.bg} />
          <rect x={12 + i*96} y="90" width="86" height="6" rx="3" fill={c.a} opacity="0.6" />
          <rect x={20 + i*96} y="104" width="40" height="10" rx="2" fill={c.p} />
          <rect x={20 + i*96} y="118" width="60" height="4" rx="2" fill="#9CA3AF" />
          <rect x={20 + i*96} y="126" width="50" height="4" rx="2" fill="#D1D5DB" />
          <rect x={20 + i*96} y="134" width="55" height="10" rx="5" fill={c.p} opacity="0.15" />
        </g>
      ))}
      {/* Bottom CTA */}
      <rect x="12" y="160" width="276" height="32" rx="8" fill={c.bg} />
      <rect x="20" y="168" width="120" height="6" rx="2" fill="#374151" />
      <rect x="20" y="178" width="90" height="4" rx="2" fill="#9CA3AF" />
      <rect x="204" y="164" width="74" height="24" rx="12" fill={c.p} />
      <rect x="214" y="170" width="54" height="12" rx="3" fill="white" />
    </svg>
  );
}

// ── Registry ──────────────────────────────────────────────────────────────────
const PREVIEW_COMPONENTS: Record<string, React.FC<PreviewProps>> = {
  modern_one_pager:   ModernOnePagerSVG,
  business_flyer:     BusinessFlyerSVG,
  case_study_sheet:   CaseStudySVG,
  startup_overview:   StartupOverviewSVG,
  marketing_flyer:    MarketingFlyerSVG,
  corporate_brochure: CorporateBrochureSVG,
  executive_handout:  ExecutiveHandoutSVG,
  product_flyer:      ProductFlyerSVG,
  brand_overview:     BrandOverviewSVG,
  promotional_sheet:  PromotionalSheetSVG,
};

// Generic fallback SVG for any unknown template
function GenericTemplateSVG({ templateId, className, style }: PreviewProps & { templateId: string }) {
  const c = getPalette(templateId);
  return (
    <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <rect width="300" height="200" fill="white" />
      <rect width="300" height="50" fill={c.p} />
      <rect x="12" y="14" width="130" height="10" rx="3" fill="white" />
      <rect x="12" y="30" width="80" height="5" rx="2" fill="rgba(255,255,255,0.6)" />
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x={12 + i*96} y="62" width="86" height="80" rx="4" fill={c.bg} />
          <rect x={20 + i*96} y="70" width="55" height="7" rx="2" fill={c.p} />
          <rect x={20 + i*96} y="82" width="66" height="4" rx="2" fill="#9CA3AF" />
          <rect x={20 + i*96} y="90" width="58" height="4" rx="2" fill="#D1D5DB" />
          <rect x={20 + i*96} y="98" width="62" height="4" rx="2" fill="#D1D5DB" />
          <rect x={20 + i*96} y="114" width="50" height="16" rx="8" fill={c.p} opacity="0.8" />
        </g>
      ))}
      <rect x="12" y="154" width="276" height="36" rx="4" fill={c.bg} />
    </svg>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
interface TemplatePreviewProps {
  templateId: string;
  className?: string;
  style?: React.CSSProperties;
}

export function TemplatePreview({ templateId, className, style }: TemplatePreviewProps) {
  const Component = PREVIEW_COMPONENTS[templateId];
  if (Component) return <Component className={className} style={style} />;
  return <GenericTemplateSVG templateId={templateId} className={className} style={style} />;
}
