import { CvDoctype } from './cv-types';

// =============================================================================
//  Phase 42F — CV / Resume / Cover Letter / Portfolio template library seed.
//
//  50+ templates across 12 categories. Each entry carries the layout spec
//  the renderer consumes (column count, accent colour, typography pairing).
//
//  These get inserted into the CvTemplate table on first server boot by
//  CvTemplatesService.seedIfEmpty().
// =============================================================================

export type CvCategory =
  | 'Corporate' | 'Executive' | 'Modern' | 'Creative' | 'Minimal'
  | 'Developer' | 'Designer'  | 'Academic' | 'Healthcare' | 'Consulting'
  | 'Finance'   | 'Sales';

export interface CvTemplateSeed {
  doctype:   CvDoctype;
  name:      string;
  category:  CvCategory;
  layout:    {
    columns:    1 | 2;
    accent:     string;
    headerStyle:'banner' | 'block' | 'sidebar' | 'minimal';
    typography: { heading: string; body: string };
    density:    'compact' | 'comfortable' | 'spacious';
    // Phase 42.1 — premium visual layout knobs (consumed by cv-html-renderer)
    style?:        'classic' | 'sidebar' | 'banner' | 'minimal' | 'twoColumn' | 'timeline' | 'photo' | 'creative';
    sidebarColor?: 'accent' | 'dark' | 'light' | string;
    sidebarSide?:  'left' | 'right';
    photoShape?:   'circle' | 'square' | 'none';
    photoPlace?:   'sidebar' | 'header';
    skillStyle?:   'bars' | 'dots' | 'pills' | 'plain' | 'ratings' | 'percent';
    languageStyle?:'dots' | 'pills' | 'plain' | 'bars' | 'stars' | 'text';
    icons?:        boolean;
    timeline?:     boolean;
    accentDividers?: boolean;
    premium?:      boolean;
    // Phase 42.2 polish knobs
    atsSafe?:      boolean;
    logoPlace?:    'header' | 'watermark' | 'footer' | 'none';
    customCss?:    string;
  };
}

const T = (
  doctype:   CvDoctype,
  name:      string,
  category:  CvCategory,
  layout:    CvTemplateSeed['layout'],
): CvTemplateSeed => ({ doctype, name, category, layout });

// -----------------------------------------------------------------------------
//  Library
// -----------------------------------------------------------------------------

export const CV_TEMPLATE_LIBRARY: CvTemplateSeed[] = [
  // ──────── Corporate (CV + Resume)
  T('cv',     'Corporate Classic',  'Corporate', { columns: 1, accent: '#1F2937', headerStyle: 'banner',   typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('cv',     'Corporate Two-Col',  'Corporate', { columns: 2, accent: '#1E3A8A', headerStyle: 'sidebar',  typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('resume', 'Corporate Concise',  'Corporate', { columns: 1, accent: '#1F2937', headerStyle: 'block',    typography: { heading: 'Inter',    body: 'Inter'    }, density: 'compact' }),
  T('resume', 'Corporate Bold',     'Corporate', { columns: 1, accent: '#7F1D1D', headerStyle: 'banner',   typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),

  // ──────── Executive
  T('cv',     'Executive Serif',    'Executive', { columns: 1, accent: '#111827', headerStyle: 'block',    typography: { heading: 'Playfair', body: 'Lora'     }, density: 'spacious' }),
  T('resume', 'Executive Two-Col',  'Executive', { columns: 2, accent: '#1F2937', headerStyle: 'sidebar',  typography: { heading: 'Playfair', body: 'Lora'     }, density: 'comfortable' }),
  T('resume', 'Executive Modern',   'Executive', { columns: 1, accent: '#0F766E', headerStyle: 'banner',   typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),

  // ──────── Modern
  T('cv',     'Modern Slate',       'Modern',    { columns: 2, accent: '#0F172A', headerStyle: 'sidebar',  typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('cv',     'Modern Indigo',      'Modern',    { columns: 1, accent: '#4F46E5', headerStyle: 'banner',   typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('resume', 'Modern Compact',     'Modern',    { columns: 1, accent: '#0EA5E9', headerStyle: 'block',    typography: { heading: 'Inter',    body: 'Inter'    }, density: 'compact' }),

  // ──────── Creative
  T('cv',     'Creative Magenta',   'Creative',  { columns: 2, accent: '#C026D3', headerStyle: 'sidebar',  typography: { heading: 'Poppins',  body: 'Inter'    }, density: 'comfortable' }),
  T('cv',     'Creative Coral',     'Creative',  { columns: 1, accent: '#F97316', headerStyle: 'banner',   typography: { heading: 'Poppins',  body: 'Inter'    }, density: 'spacious' }),
  T('portfolio', 'Creative Showcase','Creative', { columns: 1, accent: '#7C3AED', headerStyle: 'banner',   typography: { heading: 'Poppins',  body: 'Inter'    }, density: 'spacious' }),

  // ──────── Minimal
  T('cv',     'Minimal Sans',       'Minimal',   { columns: 1, accent: '#111827', headerStyle: 'minimal',  typography: { heading: 'Inter',    body: 'Inter'    }, density: 'spacious' }),
  T('resume', 'Minimal Mono',       'Minimal',   { columns: 1, accent: '#111827', headerStyle: 'minimal',  typography: { heading: 'JetBrains Mono', body: 'Inter' }, density: 'compact' }),
  T('coverLetter', 'Minimal Letter','Minimal',   { columns: 1, accent: '#111827', headerStyle: 'minimal',  typography: { heading: 'Inter',    body: 'Inter'    }, density: 'spacious' }),

  // ──────── Developer
  T('cv',     'Developer Terminal', 'Developer', { columns: 2, accent: '#22C55E', headerStyle: 'sidebar',  typography: { heading: 'JetBrains Mono', body: 'Inter' }, density: 'compact' }),
  T('resume', 'Developer GitHub',   'Developer', { columns: 1, accent: '#1E293B', headerStyle: 'block',    typography: { heading: 'Inter',    body: 'Inter'    }, density: 'compact' }),
  T('portfolio', 'Developer Stack', 'Developer', { columns: 1, accent: '#0EA5E9', headerStyle: 'banner',   typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),

  // ──────── Designer
  T('cv',     'Designer Editorial', 'Designer',  { columns: 2, accent: '#DC2626', headerStyle: 'sidebar',  typography: { heading: 'Playfair', body: 'Inter'    }, density: 'spacious' }),
  T('portfolio', 'Designer Studio', 'Designer',  { columns: 1, accent: '#7C3AED', headerStyle: 'banner',   typography: { heading: 'Poppins',  body: 'Inter'    }, density: 'spacious' }),

  // ──────── Academic
  T('cv',     'Academic Latex',     'Academic',  { columns: 1, accent: '#1F2937', headerStyle: 'minimal',  typography: { heading: 'Lora',     body: 'Lora'     }, density: 'comfortable' }),
  T('cv',     'Academic Two-Col',   'Academic',  { columns: 2, accent: '#1F2937', headerStyle: 'sidebar',  typography: { heading: 'Lora',     body: 'Lora'     }, density: 'comfortable' }),

  // ──────── Healthcare
  T('cv',     'Healthcare Clean',   'Healthcare',{ columns: 1, accent: '#0F766E', headerStyle: 'block',    typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('resume', 'Clinical Concise',   'Healthcare',{ columns: 2, accent: '#047857', headerStyle: 'sidebar',  typography: { heading: 'Inter',    body: 'Inter'    }, density: 'compact' }),

  // ──────── Consulting
  T('cv',     'Consulting MBB',     'Consulting',{ columns: 1, accent: '#1E3A8A', headerStyle: 'block',    typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('resume', 'Consulting Brief',   'Consulting',{ columns: 1, accent: '#1E3A8A', headerStyle: 'block',    typography: { heading: 'Inter',    body: 'Inter'    }, density: 'compact' }),

  // ──────── Finance
  T('cv',     'Finance Navy',       'Finance',   { columns: 1, accent: '#1E3A8A', headerStyle: 'block',    typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('resume', 'Finance Two-Col',    'Finance',   { columns: 2, accent: '#1E3A8A', headerStyle: 'sidebar',  typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),

  // ──────── Sales
  T('cv',     'Sales Energetic',    'Sales',     { columns: 1, accent: '#EF4444', headerStyle: 'banner',   typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('resume', 'Sales Achievements', 'Sales',     { columns: 1, accent: '#F97316', headerStyle: 'banner',   typography: { heading: 'Inter',    body: 'Inter'    }, density: 'compact' }),

  // ──────── Cover Letter sets (one per major style)
  T('coverLetter', 'Corporate Cover Letter', 'Corporate', { columns: 1, accent: '#1F2937', headerStyle: 'block',   typography: { heading: 'Inter',    body: 'Inter' }, density: 'spacious' }),
  T('coverLetter', 'Modern Cover Letter',    'Modern',    { columns: 1, accent: '#4F46E5', headerStyle: 'banner',  typography: { heading: 'Inter',    body: 'Inter' }, density: 'spacious' }),
  T('coverLetter', 'Executive Cover Letter', 'Executive', { columns: 1, accent: '#111827', headerStyle: 'block',   typography: { heading: 'Playfair', body: 'Lora'  }, density: 'spacious' }),
  T('coverLetter', 'Creative Cover Letter',  'Creative',  { columns: 1, accent: '#C026D3', headerStyle: 'banner',  typography: { heading: 'Poppins',  body: 'Inter' }, density: 'spacious' }),
  T('coverLetter', 'Developer Cover Letter', 'Developer', { columns: 1, accent: '#22C55E', headerStyle: 'minimal', typography: { heading: 'JetBrains Mono', body: 'Inter' }, density: 'comfortable' }),

  // ──────── Portfolio sets
  T('portfolio', 'Portfolio Magazine',  'Modern',    { columns: 2, accent: '#0EA5E9', headerStyle: 'banner',  typography: { heading: 'Inter',    body: 'Inter' }, density: 'spacious' }),
  T('portfolio', 'Portfolio Boardroom', 'Executive', { columns: 1, accent: '#111827', headerStyle: 'block',   typography: { heading: 'Playfair', body: 'Lora'  }, density: 'spacious' }),
  T('portfolio', 'Portfolio Grid',      'Designer',  { columns: 2, accent: '#DC2626', headerStyle: 'sidebar', typography: { heading: 'Playfair', body: 'Inter' }, density: 'comfortable' }),
  T('portfolio', 'Portfolio Minimal',   'Minimal',   { columns: 1, accent: '#111827', headerStyle: 'minimal', typography: { heading: 'Inter',    body: 'Inter' }, density: 'spacious' }),

  // ──────── Extras to round us out past 50
  T('resume', 'Two-Page Detailed',  'Corporate', { columns: 1, accent: '#1F2937', headerStyle: 'block',    typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('cv',     'European CV',        'Academic',  { columns: 1, accent: '#1F2937', headerStyle: 'minimal',  typography: { heading: 'Lora',     body: 'Lora'     }, density: 'comfortable' }),
  T('cv',     'Civic / Government', 'Corporate', { columns: 1, accent: '#1E3A8A', headerStyle: 'banner',   typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('cv',     'Startup Founder',    'Modern',    { columns: 1, accent: '#16A34A', headerStyle: 'banner',   typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('cv',     'Product Manager',    'Modern',    { columns: 2, accent: '#0EA5E9', headerStyle: 'sidebar',  typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('resume', 'Data Scientist',     'Developer', { columns: 1, accent: '#22C55E', headerStyle: 'block',    typography: { heading: 'JetBrains Mono', body: 'Inter' }, density: 'compact' }),
  T('resume', 'Marketing Lead',     'Sales',     { columns: 1, accent: '#F97316', headerStyle: 'banner',   typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('cv',     'Operations Director','Executive', { columns: 2, accent: '#1F2937', headerStyle: 'sidebar',  typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),
  T('cv',     'Public Speaker',     'Creative',  { columns: 1, accent: '#C026D3', headerStyle: 'banner',   typography: { heading: 'Poppins',  body: 'Inter'    }, density: 'spacious' }),
  T('cv',     'Bilingual CV',       'Corporate', { columns: 2, accent: '#1F2937', headerStyle: 'sidebar',  typography: { heading: 'Inter',    body: 'Inter'    }, density: 'comfortable' }),

  // ──────── Phase 42.1 — Premium visual templates (20 fully differentiated).
  // Each one exercises a distinctive combination of the new layout knobs.

  // 1. Teal sidebar with photo circle + skill bars (the prototypical "Modern Pro" CV).
  T('cv',     'Modern Teal Sidebar',     'Modern',    { columns: 2, accent: '#0F766E', headerStyle: 'sidebar',  typography: { heading: 'Inter',    body: 'Inter' },    density: 'comfortable', style: 'sidebar',   sidebarColor: 'accent',  sidebarSide: 'left',  photoShape: 'circle',  photoPlace: 'sidebar', skillStyle: 'bars',  languageStyle: 'dots',  icons: true,  accentDividers: true,  premium: true }),

  // 2. Dark sidebar with yellow accent (creative agency look).
  T('cv',     'Creative Yellow Dark',    'Creative',  { columns: 2, accent: '#EAB308', headerStyle: 'sidebar',  typography: { heading: 'Poppins',  body: 'Inter' },    density: 'comfortable', style: 'sidebar',   sidebarColor: 'dark',    sidebarSide: 'left',  photoShape: 'circle',  photoPlace: 'sidebar', skillStyle: 'bars',  languageStyle: 'dots',  icons: true,                          premium: true }),

  // 3. Photo-circle banner + skill pills (executive welcome).
  T('cv',     'Executive Banner Photo',  'Executive', { columns: 1, accent: '#111827', headerStyle: 'banner',   typography: { heading: 'Playfair', body: 'Lora'  },    density: 'spacious',    style: 'photo',                              photoShape: 'circle',  photoPlace: 'header',  skillStyle: 'pills',                          accentDividers: true,                     premium: true }),

  // 4. Timeline layout (developer-friendly chronological focus).
  T('cv',     'Developer Timeline',      'Developer', { columns: 1, accent: '#22C55E', headerStyle: 'block',    typography: { heading: 'JetBrains Mono', body: 'Inter' }, density: 'compact',    style: 'timeline',                                                                  skillStyle: 'pills',                          timeline: true,                            premium: true }),

  // 5. Minimal black/white (academic and editorial).
  T('cv',     'Minimal Editorial',       'Minimal',   { columns: 1, accent: '#000000', headerStyle: 'minimal',  typography: { heading: 'Lora',     body: 'Lora' },     density: 'spacious',    style: 'minimal',                                                                   skillStyle: 'plain', languageStyle: 'plain',                                              premium: true }),

  // 6. Two-column with photo + skill dots (consulting/finance polish).
  T('cv',     'Consulting Two-Column',   'Consulting',{ columns: 2, accent: '#1E3A8A', headerStyle: 'block',    typography: { heading: 'Inter',    body: 'Inter' },    density: 'comfortable', style: 'twoColumn', sidebarColor: 'light',   sidebarSide: 'right', photoShape: 'square',  photoPlace: 'sidebar', skillStyle: 'dots',  languageStyle: 'dots',                        accentDividers: true,                     premium: true }),

  // 7. Finance navy banner with skill bars.
  T('cv',     'Finance Navy Banner',     'Finance',   { columns: 1, accent: '#0F172A', headerStyle: 'banner',   typography: { heading: 'Inter',    body: 'Inter' },    density: 'comfortable', style: 'banner',                                                                    skillStyle: 'bars',  languageStyle: 'pills',                                              premium: true }),

  // 8. Healthcare teal with sidebar + icons.
  T('cv',     'Healthcare Pro',          'Healthcare',{ columns: 2, accent: '#0F766E', headerStyle: 'sidebar',  typography: { heading: 'Inter',    body: 'Inter' },    density: 'comfortable', style: 'sidebar',   sidebarColor: 'light',   sidebarSide: 'left',  photoShape: 'circle',  photoPlace: 'sidebar', skillStyle: 'dots',  languageStyle: 'dots',  icons: true,                                                     premium: true }),

  // 9. Designer magazine layout (right sidebar + photo).
  T('cv',     'Designer Magazine',       'Designer',  { columns: 2, accent: '#DC2626', headerStyle: 'block',    typography: { heading: 'Playfair', body: 'Inter' },    density: 'spacious',    style: 'twoColumn', sidebarColor: 'light',   sidebarSide: 'right', photoShape: 'square',  photoPlace: 'sidebar', skillStyle: 'pills', languageStyle: 'pills',                                              premium: true }),

  // 10. Sales energetic with banner + pills.
  T('cv',     'Sales Vibrant',           'Sales',     { columns: 1, accent: '#EF4444', headerStyle: 'banner',   typography: { heading: 'Poppins',  body: 'Inter' },    density: 'comfortable', style: 'banner',                                                                    skillStyle: 'pills', languageStyle: 'pills',                                              premium: true }),

  // 11. Corporate sidebar with accent dividers.
  T('cv',     'Corporate Refined',       'Corporate', { columns: 2, accent: '#1F2937', headerStyle: 'sidebar',  typography: { heading: 'Inter',    body: 'Inter' },    density: 'comfortable', style: 'sidebar',   sidebarColor: 'accent',  sidebarSide: 'left',                          photoPlace: 'sidebar', skillStyle: 'bars',  languageStyle: 'dots',                        accentDividers: true,                     premium: true }),

  // 12. Academic single column with timeline.
  T('cv',     'Academic Timeline',       'Academic',  { columns: 1, accent: '#1F2937', headerStyle: 'minimal',  typography: { heading: 'Lora',     body: 'Lora' },     density: 'comfortable', style: 'timeline',                                                                  skillStyle: 'plain', languageStyle: 'plain', timeline: true,                                                  premium: true }),

  // 13. Indigo modern with photo header.
  T('cv',     'Indigo Photo Header',     'Modern',    { columns: 1, accent: '#4F46E5', headerStyle: 'banner',   typography: { heading: 'Inter',    body: 'Inter' },    density: 'comfortable', style: 'photo',                              photoShape: 'circle',  photoPlace: 'header',  skillStyle: 'pills',                                                                  premium: true }),

  // 14. Government civic with accent dividers.
  T('cv',     'Civic Pro',               'Corporate', { columns: 1, accent: '#1E3A8A', headerStyle: 'block',    typography: { heading: 'Inter',    body: 'Inter' },    density: 'comfortable', style: 'classic',                                                                   skillStyle: 'plain', languageStyle: 'plain',                       accentDividers: true,                     premium: true }),

  // 15. Startup founder magenta sidebar.
  T('cv',     'Founder Magenta',         'Modern',    { columns: 2, accent: '#C026D3', headerStyle: 'sidebar',  typography: { heading: 'Poppins',  body: 'Inter' },    density: 'comfortable', style: 'sidebar',   sidebarColor: 'accent',  sidebarSide: 'left',  photoShape: 'circle',  photoPlace: 'sidebar', skillStyle: 'pills', languageStyle: 'pills',                                              premium: true }),

  // 16. PM crisp with two-column.
  T('cv',     'Product Manager Crisp',   'Modern',    { columns: 2, accent: '#0EA5E9', headerStyle: 'sidebar',  typography: { heading: 'Inter',    body: 'Inter' },    density: 'comfortable', style: 'twoColumn', sidebarColor: 'light',   sidebarSide: 'right',                        photoPlace: 'sidebar', skillStyle: 'dots',  languageStyle: 'dots',                                                                  premium: true }),

  // 17. Data scientist developer terminal vibe.
  T('cv',     'Data Scientist Terminal', 'Developer', { columns: 1, accent: '#22C55E', headerStyle: 'minimal',  typography: { heading: 'JetBrains Mono', body: 'Inter' }, density: 'compact',    style: 'minimal',                                                                   skillStyle: 'pills',                                                                                       premium: true }),

  // 18. Marketing creative coral.
  T('cv',     'Marketing Coral',         'Creative',  { columns: 2, accent: '#F97316', headerStyle: 'sidebar',  typography: { heading: 'Poppins',  body: 'Inter' },    density: 'comfortable', style: 'sidebar',   sidebarColor: 'accent',  sidebarSide: 'left',  photoShape: 'circle',  photoPlace: 'sidebar', skillStyle: 'bars',  languageStyle: 'pills',                                              premium: true }),

  // 19. Operations director navy banner with skill bars.
  T('cv',     'Ops Director Navy',       'Executive', { columns: 1, accent: '#1E3A8A', headerStyle: 'banner',   typography: { heading: 'Playfair', body: 'Inter' },    density: 'spacious',    style: 'banner',                                                                    skillStyle: 'bars',  languageStyle: 'dots',                        accentDividers: true,                     premium: true }),

  // 20. Speaker creative with timeline + accent dividers.
  T('cv',     'Speaker Spotlight',       'Creative',  { columns: 1, accent: '#7C3AED', headerStyle: 'banner',   typography: { heading: 'Poppins',  body: 'Inter' },    density: 'spacious',    style: 'timeline',                                                                  skillStyle: 'pills', languageStyle: 'pills',                       accentDividers: true,  timeline: true,    premium: true }),

  // ──────── Phase 42.2J — ATS-safe variant (single column, no photos/icons,
  //          standard fonts, accent black, plain skills, no decorations).
  T('cv',     'ATS-Safe Universal',      'Corporate', { columns: 1, accent: '#000000', headerStyle: 'block',    typography: { heading: 'Arial',    body: 'Arial' },    density: 'comfortable', style: 'classic',                                                                                                  atsSafe: true,                                                                                                            premium: true }),
  T('resume', 'ATS-Safe Resume',         'Corporate', { columns: 1, accent: '#000000', headerStyle: 'block',    typography: { heading: 'Arial',    body: 'Arial' },    density: 'compact',     style: 'classic',                                                                                                  atsSafe: true,                                                                                                            premium: true }),
];

// =============================================================================
//  Phase 42.2C — Per-template visual differentiation via customCss.
//
//  We attach template-specific CSS overrides as a post-processing step so the
//  base library above stays a clean layout-knob declaration. The customCss
//  string is injected into the renderer's <style> block at the very end so
//  it can override anything earlier.
//
//  Goal: every premium template should *feel* distinct, not just be a
//  recoloured copy. We use serif drop-caps, monospaced section labels,
//  underline-only headings, sidebar pattern fills, etc. — small touches that
//  add up to a recognisable identity.
// =============================================================================

const PER_TEMPLATE_CSS: Record<string, string> = {
  'Modern Teal Sidebar':     `.sidebar { box-shadow: inset -8px 0 0 rgba(255,255,255,0.08); } .sidebar h2 { letter-spacing: 0.15em; }`,
  'Creative Yellow Dark':    `.sidebar { background: linear-gradient(180deg, #0F172A 0%, #1E293B 100%); } h1 { color: #EAB308 !important; }`,
  'Executive Banner Photo':  `h1 { font-style: italic; letter-spacing: -0.02em; } .header.banner { background: linear-gradient(135deg, #111827 0%, #1F2937 100%); }`,
  'Developer Timeline':      `h2::before { content: '// '; color: var(--accent); opacity: 0.6; } .pill { font-family: 'JetBrains Mono', monospace !important; }`,
  'Minimal Editorial':       `h2 { border-bottom: none !important; text-transform: none !important; font-style: italic; font-size: 18px !important; letter-spacing: 0 !important; } h1 { font-style: italic; }`,
  'Consulting Two-Column':   `.sidebar { border-right: 2px solid var(--accent); } .entry-head { font-variant: small-caps; }`,
  'Finance Navy Banner':     `.header.banner { background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%); border-bottom: 4px solid #FBBF24; } h2 { color: #1E3A8A; }`,
  'Healthcare Pro':          `.sidebar { background: linear-gradient(180deg, #F0FDFA 0%, #CCFBF1 100%); } h2 { color: #0F766E; } .skill-bar .fill { background: linear-gradient(90deg, #14B8A6, #0F766E); }`,
  'Designer Magazine':       `h1 { font-size: 42px !important; font-style: italic; } h2 { font-style: italic; font-weight: 400 !important; font-size: 16px !important; text-transform: none !important; letter-spacing: 0 !important; }`,
  'Sales Vibrant':           `.header.banner { background: linear-gradient(135deg, #EF4444 0%, #F97316 100%); } .pill { background: rgba(239,68,68,0.15); color: #DC2626; }`,
  'Corporate Refined':       `.sidebar { background: linear-gradient(180deg, var(--accent) 0%, #111827 100%); } h2 { border-bottom-width: 2px; }`,
  'Academic Timeline':       `h2 { font-variant: small-caps; letter-spacing: 0.05em !important; } .entry-head { font-style: italic; }`,
  'Indigo Photo Header':     `.header.banner { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); } .photo { border: 4px solid white; }`,
  'Civic Pro':               `h2 { text-transform: none !important; font-variant: small-caps; letter-spacing: 0.04em !important; border-bottom: 2px double var(--accent) !important; }`,
  'Founder Magenta':         `.sidebar { background: linear-gradient(180deg, #C026D3 0%, #7C3AED 100%); } .pill { background: rgba(255,255,255,0.18); }`,
  'Product Manager Crisp':   `.sidebar { background: #F8FAFC; border-left: 1px solid #E2E8F0; } h2 { font-weight: 600 !important; font-size: 11px !important; }`,
  'Data Scientist Terminal': `body { background: white; } h2 { font-family: 'JetBrains Mono', monospace !important; } h2::before { content: '> '; color: var(--accent); } .pill { background: #0F172A; color: #22C55E; font-family: 'JetBrains Mono', monospace !important; }`,
  'Marketing Coral':         `.sidebar { background: linear-gradient(180deg, #F97316 0%, #EA580C 100%); } .header.banner { background: linear-gradient(135deg, #FB923C 0%, #F97316 100%); }`,
  'Ops Director Navy':       `.header.banner { background: linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%); border-bottom: 6px solid #FBBF24; } h1 { font-weight: 400; letter-spacing: -0.01em; }`,
  'Speaker Spotlight':       `.header.banner { background: linear-gradient(135deg, #7C3AED 0%, #C026D3 100%); } h2 { font-family: 'Poppins', sans-serif !important; font-weight: 600 !important; }`,
  // ATS variants stay visually clean — no customCss override; the atsSafe flag handles everything.
};

// Apply customCss to every matching seed.
for (const seed of CV_TEMPLATE_LIBRARY) {
  const css = PER_TEMPLATE_CSS[seed.name];
  if (css) seed.layout.customCss = css;
}
