// =============================================================================
//  Slide Template Registry
//
//  A "template" here is a deck-level visual spec that drives:
//    1. theme tokens   (colors + fonts) → written to slide.themeTokens
//    2. background     (solid / gradient / image) → written to slide.background
//    3. element accents → per-element style fields that derive from the theme
//        (e.g. heading color = theme.text, metric value color = theme.accent)
//
//  Templates are intentionally NON-DESTRUCTIVE when applied: user-authored
//  positions, sizes, content and bespoke styles are preserved. Only the
//  template-controlled fields are overwritten.
//
//  This file is the source of truth for the 5 templates in Phase 10. New
//  templates in later phases (10b/c/d) plug in here.
// =============================================================================

import type { SlideElementDTO, ElementStyle, SlideBackground, SlideThemeTokens, ElementType } from '@/types/slide-element';

// ── Theme spec ─────────────────────────────────────────────────────────────

export interface SlideThemeSpec extends SlideThemeTokens {
  /** Display fallback for backgrounds when the type-specific override isn't set. */
  defaultBackground: SlideBackground;
}

export interface TemplateBlueprint {
  /** Per-slide-type background override (cover, problem, closing, etc.) */
  background: Partial<Record<string, SlideBackground>>;
  /** Optional per-slide-type accent strip / divider hints (not yet wired in renderer) */
  accents?: Partial<Record<string, { strip?: 'top' | 'bottom' | 'left' | 'right'; color?: string }>>;
}

export type TemplateCategory =
  | 'Dark' | 'Vibrant' | 'Editorial' | 'Minimal' | 'Luxury'
  | 'Business' | 'Investor' | 'Tech' | 'Healthcare' | 'Sustainability' | 'Education';

export interface TemplateSpec {
  id:          string;
  name:        string;
  category:    TemplateCategory;
  description: string;
  /** Short attribution shown in the gallery, e.g. "Investor / Pitch" */
  tags:        string[];
  theme:       SlideThemeSpec;
  blueprint:   TemplateBlueprint;
}

// =============================================================================
//  Template 1 — Crimson Dark Business
//  Dark slate background, deep crimson accents, serif headings.
// =============================================================================

export const TPL_CRIMSON_DARK: TemplateSpec = {
  id:          'crimson-dark-business',
  name:        'Crimson Dark Business',
  category:    'Dark',
  description: 'Deep slate background with crimson accents. Serif headings, generous spacing.',
  tags:        ['Dark', 'Executive', 'Premium'],
  theme: {
    primary:    '#dc2626',  // red-600
    secondary:  '#b91c1c',  // red-700
    accent:     '#fca5a5',  // red-300
    text:       '#f8fafc',  // slate-50
    muted:      '#94a3b8',  // slate-400
    surface:    '#1e293b',  // slate-800
    background: '#0f172a',  // slate-900
    fontHeading: '"Playfair Display", Georgia, serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#0f172a' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#7f1d1d', offset: 0 }, { color: '#0f172a', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#7f1d1d', offset: 0 }, { color: '#0f172a', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 2 — Purple Gradient Startup
//  Vibrant purple→pink gradient, modern sans, bold caps headings.
// =============================================================================

export const TPL_PURPLE_GRADIENT: TemplateSpec = {
  id:          'purple-gradient-startup',
  name:        'Purple Gradient Startup',
  category:    'Vibrant',
  description: 'Vibrant purple-to-pink gradients, bold all-caps headings, energetic startup vibe.',
  tags:        ['Startup', 'Pitch', 'Modern'],
  theme: {
    primary:    '#7c3aed',  // violet-600
    secondary:  '#a855f7',  // purple-500
    accent:     '#ec4899',  // pink-500
    text:       '#0f172a',  // slate-900 — body on white
    muted:      '#64748b',  // slate-500
    surface:    '#f5f3ff',  // violet-50
    background: '#ffffff',
    fontHeading: '"Space Grotesk", "Inter", sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#ffffff' },
  },
  blueprint: {
    background: {
      cover:     { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#7c3aed', offset: 0 }, { color: '#ec4899', offset: 1 }] } },
      closing:   { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#7c3aed', offset: 0 }, { color: '#ec4899', offset: 1 }] } },
      section_break: { type: 'gradient', gradient: { kind: 'linear', angle: 180, stops: [{ color: '#f5f3ff', offset: 0 }, { color: '#ede9fe', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 3 — Editorial Business Report
//  Magazine-style. Cream background, charcoal text, serif body, generous gutters.
// =============================================================================

export const TPL_EDITORIAL: TemplateSpec = {
  id:          'editorial-business-report',
  name:        'Editorial Business Report',
  category:    'Editorial',
  description: 'Magazine-inspired layouts with serif typography, cream paper, and editorial pacing.',
  tags:        ['Editorial', 'Whitepaper', 'Long-form'],
  theme: {
    primary:    '#b35432',  // burnt sienna
    secondary:  '#7c2d12',  // orange-900
    accent:     '#b35432',
    text:       '#1c1a17',  // near-black
    muted:      '#756c5f',
    surface:    '#fdfaf2',
    background: '#fffdf8',  // warm paper
    fontHeading: '"Cormorant Garamond", Georgia, serif',
    fontBody:    'Lora, "EB Garamond", serif',
    defaultBackground: { type: 'solid', color: '#fffdf8' },
  },
  blueprint: {
    background: {
      cover: { type: 'solid', color: '#fffdf8' },
    },
  },
};

// =============================================================================
//  Template 4 — Dark Luxury Proposal
//  Black + gold. Premium typography, generous negative space.
// =============================================================================

export const TPL_DARK_LUXURY: TemplateSpec = {
  id:          'dark-luxury-proposal',
  name:        'Dark Luxury Proposal',
  category:    'Luxury',
  description: 'Black background with gold accents. Premium typography for high-end proposals.',
  tags:        ['Luxury', 'Proposal', 'Dark'],
  theme: {
    primary:    '#c7a45d',  // gold
    secondary:  '#a47d3a',
    accent:     '#e5c989',
    text:       '#f8f1e5',
    muted:      '#c4b8a4',
    surface:    '#1a1814',
    background: '#0a0a0a',
    fontHeading: '"Playfair Display", "Cormorant Garamond", serif',
    fontBody:    'Lora, Georgia, serif',
    defaultBackground: { type: 'solid', color: '#0a0a0a' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'radial', stops: [{ color: '#1a1814', offset: 0 }, { color: '#0a0a0a', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'radial', stops: [{ color: '#1a1814', offset: 0 }, { color: '#0a0a0a', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 5 — Ultra Minimal Swiss
//  Pure white. Helvetica-style sans. Grid-based. Maximum negative space.
// =============================================================================

export const TPL_ULTRA_MINIMAL: TemplateSpec = {
  id:          'ultra-minimal-swiss',
  name:        'Ultra Minimal Swiss',
  category:    'Minimal',
  description: 'Swiss-style minimalism: white canvas, geometric sans, generous whitespace.',
  tags:        ['Minimal', 'Swiss', 'Modern'],
  theme: {
    primary:    '#171717',  // near-black
    secondary:  '#404040',
    accent:     '#dc2626',  // red highlight, Swiss tradition
    text:       '#171717',
    muted:      '#737373',
    surface:    '#fafafa',
    background: '#ffffff',
    fontHeading: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
    fontBody:    '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
    defaultBackground: { type: 'solid', color: '#ffffff' },
  },
  blueprint: {
    background: {
      cover: { type: 'solid', color: '#ffffff' },
    },
  },
};

// =============================================================================
//  Template 6 — Investor Geometric Beige
//  Warm beige canvas with terracotta + ink accents. Geometric headings.
// =============================================================================

export const TPL_INVESTOR_BEIGE: TemplateSpec = {
  id:          'investor-geometric-beige',
  name:        'Investor Geometric Beige',
  category:    'Investor',
  description: 'Warm beige canvas with terracotta accents. Geometric sans, generous gutters.',
  tags:        ['Investor', 'Pitch', 'Warm'],
  theme: {
    primary:    '#b04a2e',
    secondary:  '#3f3327',
    accent:     '#d97e4a',
    text:       '#2a221a',
    muted:      '#7d6b56',
    surface:    '#f4ead8',
    background: '#f0e3cc',
    fontHeading: '"DM Serif Display", Georgia, serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#f0e3cc' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#f5eadb', offset: 0 }, { color: '#e3cda8', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#f5eadb', offset: 0 }, { color: '#e3cda8', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 7 — Yellow Digital Course
// =============================================================================

export const TPL_YELLOW_COURSE: TemplateSpec = {
  id:          'yellow-digital-course',
  name:        'Yellow Digital Course',
  category:    'Education',
  description: 'Bright yellow + black contrast for digital learning content and online courses.',
  tags:        ['Education', 'Course', 'Bright'],
  theme: {
    primary:    '#0f172a',
    secondary:  '#1e293b',
    accent:     '#facc15',
    text:       '#0f172a',
    muted:      '#475569',
    surface:    '#fefce8',
    background: '#fef9c3',
    fontHeading: '"Poppins", "Inter", sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#fef9c3' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#fde047', offset: 0 }, { color: '#facc15', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#fef9c3', offset: 0 }, { color: '#fde047', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 8 — Light Blue Business Marketing
// =============================================================================

export const TPL_LIGHT_BLUE_MARKETING: TemplateSpec = {
  id:          'light-blue-business-marketing',
  name:        'Light Blue Business Marketing',
  category:    'Business',
  description: 'Soft sky blue with deep navy accents. Marketing-grade clarity.',
  tags:        ['Marketing', 'Business', 'Friendly'],
  theme: {
    primary:    '#1d4ed8',
    secondary:  '#1e3a8a',
    accent:     '#38bdf8',
    text:       '#0f172a',
    muted:      '#64748b',
    surface:    '#e0f2fe',
    background: '#f0f9ff',
    fontHeading: '"Manrope", "Inter", sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#f0f9ff' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#e0f2fe', offset: 0 }, { color: '#bae6fd', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#e0f2fe', offset: 0 }, { color: '#bae6fd', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 9 — Teal Business Plan
// =============================================================================

export const TPL_TEAL_BUSINESS: TemplateSpec = {
  id:          'teal-business-plan',
  name:        'Teal Business Plan',
  category:    'Business',
  description: 'Calm teal-and-cream palette. For business plans, operating reviews, and strategy.',
  tags:        ['Business plan', 'Strategy', 'Teal'],
  theme: {
    primary:    '#0f766e',
    secondary:  '#115e59',
    accent:     '#5eead4',
    text:       '#0f172a',
    muted:      '#64748b',
    surface:    '#ccfbf1',
    background: '#f0fdfa',
    fontHeading: '"Outfit", "Inter", sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#f0fdfa' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#ccfbf1', offset: 0 }, { color: '#5eead4', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#ccfbf1', offset: 0 }, { color: '#5eead4', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 10 — Monochrome Corporate Strategy
// =============================================================================

export const TPL_MONO_CORPORATE: TemplateSpec = {
  id:          'monochrome-corporate-strategy',
  name:        'Monochrome Corporate Strategy',
  category:    'Minimal',
  description: 'Black and white with a single charcoal accent. Used by McKinsey-style decks.',
  tags:        ['Corporate', 'Strategy', 'Monochrome'],
  theme: {
    primary:    '#111111',
    secondary:  '#3f3f46',
    accent:     '#52525b',
    text:       '#0a0a0a',
    muted:      '#71717a',
    surface:    '#f4f4f5',
    background: '#ffffff',
    fontHeading: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
    fontBody:    '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
    defaultBackground: { type: 'solid', color: '#ffffff' },
  },
  blueprint: {
    background: {
      cover: { type: 'solid', color: '#ffffff' },
    },
  },
};

// =============================================================================
//  Template 11 — Fintech Investor Deck
// =============================================================================

export const TPL_FINTECH_INVESTOR: TemplateSpec = {
  id:          'fintech-investor-deck',
  name:        'Fintech Investor Deck',
  category:    'Tech',
  description: 'Deep navy with electric green data accents. Built for financial product pitches.',
  tags:        ['Fintech', 'Investor', 'Data'],
  theme: {
    primary:    '#0c4a6e',
    secondary:  '#075985',
    accent:     '#22d3ee',
    text:       '#e0f2fe',
    muted:      '#94a3b8',
    surface:    '#0f2740',
    background: '#0b1c30',
    fontHeading: '"Space Grotesk", "Inter", sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#0b1c30' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#0b1c30', offset: 0 }, { color: '#0c4a6e', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#0b1c30', offset: 0 }, { color: '#0c4a6e', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 12 — Startup Pitch Modern
// =============================================================================

export const TPL_STARTUP_MODERN: TemplateSpec = {
  id:          'startup-pitch-modern',
  name:        'Startup Pitch Modern',
  category:    'Vibrant',
  description: 'Crisp white with electric indigo and green-lime accents. Modern Y-Combinator energy.',
  tags:        ['Startup', 'Pitch', 'YC'],
  theme: {
    primary:    '#4f46e5',
    secondary:  '#3730a3',
    accent:     '#84cc16',
    text:       '#0f172a',
    muted:      '#64748b',
    surface:    '#eef2ff',
    background: '#ffffff',
    fontHeading: '"Inter", system-ui, sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#ffffff' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#eef2ff', offset: 0 }, { color: '#ffffff', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#eef2ff', offset: 0 }, { color: '#ffffff', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 13 — Product Launch Showcase
// =============================================================================

export const TPL_PRODUCT_LAUNCH: TemplateSpec = {
  id:          'product-launch-showcase',
  name:        'Product Launch Showcase',
  category:    'Vibrant',
  description: 'Magenta-coral gradient with white space. Built for product launches and reveals.',
  tags:        ['Launch', 'Product', 'Showcase'],
  theme: {
    primary:    '#e11d48',
    secondary:  '#be123c',
    accent:     '#f97316',
    text:       '#1f2937',
    muted:      '#6b7280',
    surface:    '#fff1f2',
    background: '#ffffff',
    fontHeading: '"Sora", "Inter", sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#ffffff' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#e11d48', offset: 0 }, { color: '#f97316', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#e11d48', offset: 0 }, { color: '#f97316', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 14 — Training Course Pro
// =============================================================================

export const TPL_TRAINING_PRO: TemplateSpec = {
  id:          'training-course-pro',
  name:        'Training Course Pro',
  category:    'Education',
  description: 'Friendly green-and-white scheme designed for instructional content and L&D decks.',
  tags:        ['Training', 'Education', 'L&D'],
  theme: {
    primary:    '#15803d',
    secondary:  '#166534',
    accent:     '#34d399',
    text:       '#0f172a',
    muted:      '#475569',
    surface:    '#dcfce7',
    background: '#f7fef8',
    fontHeading: '"Nunito", "Inter", sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#f7fef8' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#dcfce7', offset: 0 }, { color: '#86efac', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#dcfce7', offset: 0 }, { color: '#86efac', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 15 — Board Meeting Executive
// =============================================================================

export const TPL_BOARD_EXECUTIVE: TemplateSpec = {
  id:          'board-meeting-executive',
  name:        'Board Meeting Executive',
  category:    'Business',
  description: 'Restrained navy + slate palette. Used for board reviews and quarterly briefings.',
  tags:        ['Board', 'Executive', 'Quarterly'],
  theme: {
    primary:    '#1e3a8a',
    secondary:  '#1e40af',
    accent:     '#fbbf24',
    text:       '#0f172a',
    muted:      '#475569',
    surface:    '#f1f5f9',
    background: '#ffffff',
    fontHeading: '"Source Serif Pro", Georgia, serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#ffffff' },
  },
  blueprint: {
    background: {
      cover:   { type: 'solid', color: '#1e3a8a' },
      closing: { type: 'solid', color: '#1e3a8a' },
    },
  },
};

// =============================================================================
//  Template 16 — Sales Deck Conversion
// =============================================================================

export const TPL_SALES_CONVERSION: TemplateSpec = {
  id:          'sales-deck-conversion',
  name:        'Sales Deck Conversion',
  category:    'Business',
  description: 'High-energy orange + black. Built for conversion-focused sales presentations.',
  tags:        ['Sales', 'Conversion', 'Outreach'],
  theme: {
    primary:    '#ea580c',
    secondary:  '#9a3412',
    accent:     '#fed7aa',
    text:       '#1c1917',
    muted:      '#78716c',
    surface:    '#fff7ed',
    background: '#ffffff',
    fontHeading: '"Bricolage Grotesque", "Inter", sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#ffffff' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#fff7ed', offset: 0 }, { color: '#fed7aa', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#fff7ed', offset: 0 }, { color: '#fed7aa', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 17 — Strategy Roadmap
// =============================================================================

export const TPL_STRATEGY_ROADMAP: TemplateSpec = {
  id:          'strategy-roadmap',
  name:        'Strategy Roadmap',
  category:    'Business',
  description: 'Cool steel-blue scheme with structured grids. Ideal for roadmaps and OKRs.',
  tags:        ['Strategy', 'Roadmap', 'OKR'],
  theme: {
    primary:    '#334155',
    secondary:  '#1e293b',
    accent:     '#0ea5e9',
    text:       '#0f172a',
    muted:      '#64748b',
    surface:    '#f1f5f9',
    background: '#f8fafc',
    fontHeading: '"IBM Plex Sans", "Inter", sans-serif',
    fontBody:    '"IBM Plex Sans", "Inter", sans-serif',
    defaultBackground: { type: 'solid', color: '#f8fafc' },
  },
  blueprint: {
    background: {
      cover:   { type: 'solid', color: '#1e293b' },
      closing: { type: 'solid', color: '#1e293b' },
    },
  },
};

// =============================================================================
//  Template 18 — Agency Campaign Deck
// =============================================================================

export const TPL_AGENCY_CAMPAIGN: TemplateSpec = {
  id:          'agency-campaign-deck',
  name:        'Agency Campaign Deck',
  category:    'Vibrant',
  description: 'Bold magenta + ink with playful typography. For creative agency campaign decks.',
  tags:        ['Agency', 'Creative', 'Campaign'],
  theme: {
    primary:    '#db2777',
    secondary:  '#9d174d',
    accent:     '#fde047',
    text:       '#1f2937',
    muted:      '#6b7280',
    surface:    '#fdf2f8',
    background: '#ffffff',
    fontHeading: '"Bricolage Grotesque", "Sora", sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#ffffff' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#fde047', offset: 0 }, { color: '#db2777', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#fde047', offset: 0 }, { color: '#db2777', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 19 — Healthcare Clean Brief
// =============================================================================

export const TPL_HEALTHCARE_BRIEF: TemplateSpec = {
  id:          'healthcare-clean-brief',
  name:        'Healthcare Clean Brief',
  category:    'Healthcare',
  description: 'Calm aqua-and-white scheme with clinical clarity. For healthcare and life-sciences briefs.',
  tags:        ['Healthcare', 'Medical', 'Clinical'],
  theme: {
    primary:    '#0891b2',
    secondary:  '#155e75',
    accent:     '#22d3ee',
    text:       '#0f172a',
    muted:      '#64748b',
    surface:    '#ecfeff',
    background: '#f8fdff',
    fontHeading: '"Lato", "Inter", sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#f8fdff' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#ecfeff', offset: 0 }, { color: '#67e8f9', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#ecfeff', offset: 0 }, { color: '#67e8f9', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Template 20 — Sustainability Impact Deck
// =============================================================================

export const TPL_SUSTAINABILITY_IMPACT: TemplateSpec = {
  id:          'sustainability-impact-deck',
  name:        'Sustainability Impact Deck',
  category:    'Sustainability',
  description: 'Forest green + earth tones with organic warmth. For ESG and impact reports.',
  tags:        ['Sustainability', 'ESG', 'Impact'],
  theme: {
    primary:    '#166534',
    secondary:  '#14532d',
    accent:     '#a3e635',
    text:       '#1c1917',
    muted:      '#57534e',
    surface:    '#f0fdf4',
    background: '#fafdf7',
    fontHeading: '"Fraunces", Georgia, serif',
    fontBody:    'Inter, system-ui, sans-serif',
    defaultBackground: { type: 'solid', color: '#fafdf7' },
  },
  blueprint: {
    background: {
      cover:   { type: 'gradient', gradient: { kind: 'linear', angle: 135, stops: [{ color: '#dcfce7', offset: 0 }, { color: '#166534', offset: 1 }] } },
      closing: { type: 'gradient', gradient: { kind: 'linear', angle: 315, stops: [{ color: '#dcfce7', offset: 0 }, { color: '#166534', offset: 1 }] } },
    },
  },
};

// =============================================================================
//  Registry
// =============================================================================

export const TEMPLATES: TemplateSpec[] = [
  TPL_CRIMSON_DARK,
  TPL_PURPLE_GRADIENT,
  TPL_EDITORIAL,
  TPL_DARK_LUXURY,
  TPL_ULTRA_MINIMAL,
  TPL_INVESTOR_BEIGE,
  TPL_YELLOW_COURSE,
  TPL_LIGHT_BLUE_MARKETING,
  TPL_TEAL_BUSINESS,
  TPL_MONO_CORPORATE,
  TPL_FINTECH_INVESTOR,
  TPL_STARTUP_MODERN,
  TPL_PRODUCT_LAUNCH,
  TPL_TRAINING_PRO,
  TPL_BOARD_EXECUTIVE,
  TPL_SALES_CONVERSION,
  TPL_STRATEGY_ROADMAP,
  TPL_AGENCY_CAMPAIGN,
  TPL_HEALTHCARE_BRIEF,
  TPL_SUSTAINABILITY_IMPACT,
];

export function findTemplate(id: string | null | undefined): TemplateSpec | null {
  if (!id) return null;
  return TEMPLATES.find((t) => t.id === id) || null;
}

// =============================================================================
//  Style derivation — turns a template + element type into the style fields
//  that should overwrite the element's style on apply.
//
//  Intentionally narrow: only properties controlled by the theme are touched.
//  User-set fields outside this set (fontWeight, fontSize, alignment,
//  borderRadius, opacity, gradient, etc.) remain unchanged.
// =============================================================================

const TEXT_TYPES: ElementType[] = [
  'heading', 'subheading', 'paragraph', 'quote', 'caption', 'label',
  'cta', 'footer', 'pageNumber', 'bulletList', 'numberedList',
];
const ACCENT_TYPES: ElementType[] = ['metric', 'kpi'];

export function deriveElementStyle(template: TemplateSpec, el: SlideElementDTO): Partial<ElementStyle> {
  const t = template.theme;
  const existing = (el.style || {}) as ElementStyle;
  const out: Partial<ElementStyle> = {};

  if (TEXT_TYPES.includes(el.type)) {
    // Headings use the heading font; others use body font
    const isHeading = el.type === 'heading' || el.type === 'subheading';
    out.fontFamily = isHeading ? t.fontHeading : t.fontBody;
    // Text color: text token for body / muted for footer-pageNumber-caption
    if (el.type === 'footer' || el.type === 'pageNumber' || el.type === 'caption') {
      out.color = t.muted;
    } else if (el.type === 'heading' || el.type === 'subheading') {
      out.color = t.text;
    } else {
      out.color = t.text;
    }
  }
  if (ACCENT_TYPES.includes(el.type)) {
    // Color the metric value through theme.accent; rendering happens in MetricRenderer
    out.color = t.accent;
  }
  // CTA gets the primary as background, preserving user-chosen radius
  if (el.type === 'cta') {
    out.fill = t.primary;
    out.color = '#ffffff';
  }
  // Footer / pageNumber don't get fill changes
  // Shapes / icons / images: leave alone — they're user-driven art

  // Preserve fontSize / weight / alignment / decoration / line-height etc.
  return out;
}
