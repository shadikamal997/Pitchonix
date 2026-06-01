import { CvDoctype } from './cv-types';

// =============================================================================
//  Phase 42.21 — Premium CV Template Library. Visual certification pass.
//
//  All templates audited against screenshots and scored for:
//    • Name dominance (h1 is always largest element)
//    • Company/role visual distinction (e-company always italic, visually distinct)
//    • Section header differentiation (h2 styles vary by template character)
//    • Layout uniqueness (not just color variations)
//    • Spacing and balance
//
//  CSS class reference (Phase 42.20):
//    .e-role      — role/degree title (bold, body-color)
//    .e-company   — company/institution (italic, accent-color by default)
//    .e-date      — date range (italic, muted, right)
//    .e-location  — location below date row
//    .tl-dot      — timeline dot
//    .tl-track    — timeline left rail
//    .dots        — dot-style skill level indicator
//    .c-ico       — contact icon in sidebar
//    .s-headline  — headline in sidebar-head
//    .contact-bar — contact row in block/minimal/split headers
//    .summary-body — summary paragraph
// =============================================================================

export type CvCategory =
  | 'Executive' | 'Corporate' | 'ATS' | 'Modern' | 'Creative'
  | 'Developer' | 'Designer'  | 'Startup' | 'Consultant' | 'Academic';

export interface CvTemplateSeed {
  doctype:  CvDoctype;
  name:     string;
  category: CvCategory;
  layout: {
    columns:    1 | 2;
    accent:     string;
    headerStyle: 'banner' | 'block' | 'sidebar' | 'minimal' | 'split';
    typography: { heading: string; body: string };
    density:    'compact' | 'comfortable' | 'spacious';
    style?:        string;
    sidebarColor?: string;
    sidebarSide?:  'left' | 'right';
    sidebarWidth?: number;
    photoShape?:   'circle' | 'square' | 'none';
    photoPlace?:   'sidebar' | 'header';
    skillStyle?:   string;
    languageStyle?:string;
    icons?:        boolean;
    timeline?:     boolean;
    accentDividers?: boolean;
    premium?:      boolean;
    atsSafe?:      boolean;
    logoPlace?:    string;
    headerBg?:     string;
    bannerBorderBottom?: string;
    customCss?:    string;
  };
}

const T = (
  doctype:   CvDoctype,
  name:      string,
  category:  CvCategory,
  layout:    CvTemplateSeed['layout'],
): CvTemplateSeed => ({
  doctype,
  name,
  category,
  layout: {
    ...layout,
    customCss: [layout.customCss, templatePolish(name, category)].filter(Boolean).join(''),
  },
});

function templatePolish(name: string, category: CvCategory): string {
  const base = `
/*premium-final-polish-43.1C*/
.page{background:#fff;box-shadow:0 2px 12px rgba(15,23,42,.08)}
.premium-page .main,.premium-page .content{min-width:0}
.premium-page .section{margin-bottom:calc(var(--sp) * 1.15);position:relative}
.premium-page .section:last-child{margin-bottom:0}
.premium-page .entry{position:relative;min-height:0}
.premium-page .entry-row{align-items:baseline}
.premium-page .e-role{font-size:13.5px;line-height:1.3;letter-spacing:-.01em}
.premium-page .e-company{margin-top:3px;font-size:12.5px}
.premium-page .e-date{font-size:10.5px;padding-top:1px}
.premium-page .e-location{margin-top:4px;margin-bottom:6px}
.premium-page .e-description{margin-top:10px;line-height:1.68}
.premium-page .e-description p{margin-bottom:7px;color:#374151}
.premium-page .e-bullets{margin-top:9px;padding-left:18px}
.premium-page .e-bullets li{padding-left:3px;margin-bottom:6px;line-height:1.62}
.premium-page .semantic-list{margin-top:9px}
.premium-page .experience-chips{margin-top:9px}
.premium-page .pill{box-shadow:inset 0 0 0 1px rgba(15,23,42,.06);padding:4px 11px;font-weight:500}
.premium-page .cert-item{border-radius:6px;padding:9px 0 9px 13px;margin-bottom:11px}
.premium-page .cert-name{font-size:12.5px;margin-bottom:4px}
.premium-page .cert-issuer{margin-bottom:3px}
.premium-page .cert-date{font-size:10px}
.premium-page .ref-card{border-radius:6px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06)}
.premium-page .ref-card:last-child{border-bottom:none}
.premium-page .sidebar .section{margin-bottom:20px}
.premium-page .sidebar .section:last-child{margin-bottom:0}
.premium-page .sidebar .c-val{line-height:1.4;word-break:break-word}
.premium-page .sidebar .sk-compact-grid{grid-template-columns:1fr;gap:8px}
.premium-page .sidebar .sk-compact{padding:6px 0;border-bottom:1px solid rgba(255,255,255,.12)}
.premium-page .sidebar.light .sk-compact{border-bottom-color:rgba(15,23,42,.09)}
.premium-page .header.banner{box-shadow:inset 0 -1px 0 rgba(255,255,255,.12)}
.premium-page .header.banner h1{font-size:46px;letter-spacing:-.02em}
.premium-page .header.block h1{font-size:42px;letter-spacing:-.015em;margin-bottom:6px}
.premium-page .header.minimal h1{font-size:44px;letter-spacing:-.018em}
.premium-page .header.split h1{font-size:40px;letter-spacing:-.015em}
.premium-page .sidebar-head h1{font-size:24px;letter-spacing:-.01em;line-height:1.25}
.premium-page .summary-body{background:linear-gradient(90deg,rgba(15,23,42,.032),transparent);padding:13px 15px;border-left:3px solid color-mix(in srgb,var(--a) 78%,#fff);border-radius:0 7px 7px 0;font-size:12.5px;line-height:1.72}
.premium-page h2{font-size:13.5px;letter-spacing:.11em;margin-bottom:17px;padding-bottom:7px}
.premium-page .sidebar h2{font-size:10px;margin-bottom:14px;padding-bottom:6px}
.premium-page .sk-bar{margin:9px 0}
.premium-page .sk-bar .sk-name{font-size:11.5px;margin-bottom:5px}
.premium-page .sk-dots{padding:5px 0;font-size:11.5px}
.premium-page .lang-row{padding:5px 0;font-size:11.5px}
.premium-page .award-item{padding:8px 0;border-bottom-width:1px}
.premium-page .award-name{font-size:12.5px}
.premium-page .award-meta{font-size:10.5px}
.ats-page .summary-body{background:transparent!important;padding:0!important;border-left:0!important;border-radius:0!important}
.ats-page{box-shadow:none!important;background:#fff!important}
.ats-page .section{margin-bottom:19px}
.ats-page .summary-body{font-size:11.5px;line-height:1.58}
`;

  const family: Record<CvCategory, string> = {
    Executive: `
.premium-page:not(.ats-page){background:linear-gradient(180deg,#fff 0%,#FBFAF7 100%)}
.premium-page .section>h2{letter-spacing:.12em}
.premium-page .e-company,.premium-page .cert-issuer{font-weight:600}
`,
    Corporate: `
.premium-page:not(.ats-page){background:linear-gradient(180deg,#FFFFFF 0%,#FAFBFF 100%)}
.premium-page .section>h2{letter-spacing:.10em}
.premium-page .entry{padding:2px 0}
`,
    ATS: `
.ats-page{box-shadow:none!important;background:#fff!important}
.ats-page .section{margin-bottom:18px}
.ats-page .summary-body{font-size:11.5px;line-height:1.55}
`,
    Modern: `
.premium-page:not(.ats-page){background:linear-gradient(180deg,#FFFFFF 0%,#F8FCFB 100%)}
.premium-page .section>h2{font-weight:800}
.premium-page .pill{border-radius:999px}
`,
    Creative: `
.premium-page:not(.ats-page){background:linear-gradient(180deg,#FFFFFF 0%,#FFFCFB 100%)}
.premium-page .section>h2{letter-spacing:.08em}
.premium-page .semantic-item{border-radius:8px}
`,
    Developer: `
.premium-page:not(.ats-page){background:linear-gradient(180deg,#FCFFFD 0%,#F8FAFC 100%)}
.premium-page .pill{font-family:'JetBrains Mono',monospace;border-radius:5px}
.premium-page .section>h2{font-family:'JetBrains Mono',monospace}
`,
    Designer: `
.premium-page:not(.ats-page){background:linear-gradient(180deg,#FFFFFF 0%,#FDFBFF 100%)}
.premium-page .section>h2{letter-spacing:.14em}
.premium-page .entry{border-radius:8px}
`,
    Startup: `
.premium-page:not(.ats-page){background:linear-gradient(180deg,#FFFFFF 0%,#F8FFFC 100%)}
.premium-page .pill{border-radius:999px}
.premium-page .e-role{letter-spacing:-.02em}
`,
    Consultant: `
.premium-page:not(.ats-page){background:linear-gradient(180deg,#FFFFFF 0%,#F8FAFC 100%)}
.premium-page .summary-body{border-left-width:4px}
.premium-page .section>h2{letter-spacing:.13em}
`,
    Academic: `
.premium-page:not(.ats-page){background:linear-gradient(180deg,#FFFFFF 0%,#FDFDFB 100%)}
.premium-page .summary-body{background:transparent;border-left:0;padding:0}
.premium-page .section>h2{letter-spacing:.08em}
`,
  };

  const perTemplate: Record<string, string> = {
    'Executive Prestige': `.sidebar{background:linear-gradient(180deg,#081827 0%,#102B42 58%,#07131F 100%)}.main{background:linear-gradient(90deg,rgba(184,151,46,.035),transparent 38%)}.sidebar .cert-item,.sidebar .sk-chip{background:rgba(255,255,255,.055)!important}.section>h2::after{content:'';height:1px;background:linear-gradient(90deg,var(--a),transparent);flex:1;margin-left:12px}`,
    'Executive Gilt': `.header.banner{border-radius:0 0 18px 18px;margin:-44px -44px 32px;padding:42px 44px 34px}.content{padding-top:0}.section>h2{display:flex;align-items:center;gap:12px}.section>h2::after{content:'';height:1px;background:linear-gradient(90deg,var(--a),transparent);flex:1}`,
    'Executive Nordic': `.page.single{padding-left:68px;padding-right:68px}.header.minimal{margin-bottom:38px}.section{border-top:1px solid #ECE7DF;padding-top:18px}.section:first-of-type{border-top:0}`,
    'Executive Slate': `.header.split{background:#F8FAFC;padding:28px;border-radius:10px;margin-bottom:26px}.section{border-left:2px solid rgba(30,41,59,.12);padding-left:18px}.section>h2{margin-left:-20px;background:#fff}`,
    'Executive Photo': `.header.banner{border-radius:20px;margin:-44px -44px 30px;padding:38px 44px}.section>h2::after{content:'';display:block;width:72px;height:2px;background:var(--a);margin-top:8px}`,
    'Corporate Pro': `.sidebar.light{background:linear-gradient(180deg,#F8FAFC 0%,#EEF4FF 100%)}.main{background:#fff}.header.block{background:#F8FAFC;padding:24px;border-radius:8px}.section>h2{background:#EFF6FF;padding:7px 10px;border-radius:6px;border-bottom:0}`,
    'Corporate Classic': `.section{padding:12px 0 0;border-top:1px solid #E5E7EB}.section>h2{background:#fff}.header.block{background:linear-gradient(90deg,#F8FAFC,transparent);padding:22px;border-radius:8px}`,
    'Corporate Timeline': `.header.banner{border-radius:0 0 14px 14px;margin:-44px -44px 30px;padding:34px 44px}.entry{background:#FBFDFF;border:1px solid #EAF1FF;border-radius:8px;padding:12px 14px;margin-bottom:12px}.tl-dot{left:-39px}`,
    'Corporate Bold': `.header.banner{background:#111827!important;color:#fff!important;margin:-44px -44px 28px;padding:36px 44px}.banner-text h1,.banner-text .headline{color:#fff!important}.section>h2{border-bottom:3px solid #111827}`,
    'Civic Government': `.page.single{border-top:8px solid #1E3A8A}.header.block{background:#F8FAFC;padding:22px}.section{border-bottom:1px solid #E5E7EB;padding-bottom:14px}`,
    'Modern Teal Pro': `.sidebar{background:linear-gradient(180deg,#0F766E 0%,#115E59 100%)}.main{background:linear-gradient(180deg,#FFFFFF 0%,#F6FFFD 100%)}.section>h2{background:#ECFDF5;padding:7px 10px;border-radius:999px;border-bottom:0}`,
    'Modern Split': `.header.split{background:linear-gradient(135deg,#111827,#1F2937);color:#fff;border-radius:16px;padding:28px}.split-left h1,.split-left .headline,.split-contact span{color:#fff!important}.section>h2{border-bottom:0}.section>h2::after{content:'';display:block;height:2px;background:var(--a);margin-top:8px}`,
    'Modern Indigo': `.header.minimal{background:linear-gradient(135deg,#EEF2FF,#FFFFFF);padding:28px;border-radius:16px}.section{background:rgba(79,70,229,.018);padding:14px;border-radius:10px}.s-experience{background:transparent;padding:0}`,
    'Modern Dark': `.sidebar{background:linear-gradient(180deg,#0F172A 0%,#111827 100%)}.main{background:#FAFAFA}.section>h2{color:#111827;background:#F1F5F9;padding:7px 10px;border-radius:6px;border-bottom:0}`,
    'Creative Dark': `.sidebar{background:linear-gradient(180deg,#09090B 0%,#18181B 100%)}.main{background:#FFF7ED}.section>h2{border-bottom:0}.section>h2::after{content:'';display:block;width:52px;height:3px;background:var(--a);margin-top:7px;border-radius:3px}`,
    'Creative Coral': `.sidebar.light{background:linear-gradient(180deg,#FFF7ED 0%,#FFE4E6 100%)}.main{background:#fff}.entry{background:#FFF7F4;border:1px solid #FFE4DE;border-radius:10px;padding:12px 14px;margin-bottom:12px}`,
    'Creative Purple': `.header.banner{background:linear-gradient(135deg,#6D28D9,#A21CAF)!important;border-radius:18px;margin:-44px -44px 28px;padding:36px 44px}.section>h2{color:#7C3AED;border-color:#DDD6FE}`,
    'Creative Magazine': `.page.sidebar-layout{grid-template-columns:310px 1fr}.sidebar{background:#111827}.main{background:#FFFDF8}.section>h2{font-size:17px;text-transform:none;letter-spacing:0}.summary-body{font-size:13px}`,
    'Dev Terminal': `.page{background:#07111F!important;color:#D1FAE5}.main,.content{background:#07111F}.sidebar{background:#020617}.section>h2,.e-role{color:#A7F3D0!important}.e-bullets li,.summary-body,.e-description p{color:#D1FAE5!important}.entry{border:1px solid rgba(16,185,129,.18);background:rgba(16,185,129,.045);border-radius:8px;padding:12px}`,
    'Dev GitHub': `.header.block{background:#F6F8FA;border:1px solid #D0D7DE;border-radius:10px;padding:22px}.section{border:1px solid #D0D7DE;border-radius:10px;padding:14px;margin-bottom:14px}.section>h2{border-bottom:1px solid #D0D7DE}`,
    'Dev Full Stack': `.sidebar{background:linear-gradient(180deg,#0B1220,#102A43)}.main{background:#F8FBFF}.section>h2{background:#E0F2FE;padding:7px 10px;border-radius:6px;border-bottom:0}.pill{background:#DBEAFE!important}`,
    'Dev Data': `.header.banner{background:linear-gradient(135deg,#164E63,#0F766E)!important;border-radius:16px;margin:-44px -44px 28px;padding:34px 44px}.section>h2{color:#0F766E;border-color:#99F6E4}.entry{border-left:3px solid #14B8A6;padding-left:14px}`,
    'Designer Editorial': `.page.sidebar-layout{grid-template-columns:300px 1fr}.main{background:#FFFBFB}.section>h2{font-size:20px}.entry{background:#fff;border:1px solid #FEE2E2;border-radius:12px;padding:13px;margin-bottom:12px}`,
    'Designer Studio': `.sidebar{background:linear-gradient(180deg,#7C3AED,#4C1D95)}.main{background:#FCFAFF}.entry{background:#fff;border:1px solid #EDE9FE;border-radius:12px;padding:13px;margin-bottom:12px}.section>h2{background:#F5F3FF;padding:7px 10px;border-radius:999px;border-bottom:0}`,
    'Designer Minimal': `.header.split{border:1px solid #E5E7EB;border-radius:14px;padding:28px}.section>h2{border-bottom:0}.section>h2::after{content:'';display:block;width:38px;height:2px;background:#111827;margin-top:8px}`,
    'Startup Founder': `.header.banner{border-radius:18px;margin:-44px -44px 28px;padding:36px 44px}.entry{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:13px 15px;margin-bottom:12px}`,
    'Startup Growth': `.header.banner{border-radius:18px;margin:-44px -44px 28px;padding:34px 44px}.entry{background:#FFFBEB;border:1px solid #FED7AA;border-radius:10px;padding:12px 14px;margin-bottom:12px}`,
    'Startup PM': `.sidebar.light{background:linear-gradient(180deg,#F0F9FF,#E0F2FE)}.main{background:#FBFDFF}.section>h2{background:#E0F2FE;padding:7px 10px;border-radius:8px;border-bottom:0}`,
    'Consultant Premium': `.sidebar.light{background:linear-gradient(180deg,#F8FAFC,#EEF2FF)}.main{background:#fff}.summary-body{background:#F8FAFC}.section>h2{display:flex;align-items:center;gap:12px}.section>h2::after{content:'';height:1px;background:linear-gradient(90deg,var(--a),transparent);flex:1}`,
    'Consultant Brief': `.header.minimal{background:#F8FAFC;border-radius:14px;padding:28px}.section{border-left:3px solid #DBEAFE;padding-left:16px}.section>h2{margin-left:-19px;background:#fff;padding-left:0}`,
    'Consulting Strategic': `.sidebar{background:linear-gradient(180deg,#111827,#334155)}.main{background:#F8FAFC}.entry{background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:12px 14px;margin-bottom:12px}`,
    'Academic Formal': `.page.single{box-shadow:none;border:1px solid #D1D5DB}.section{border-top:1px solid #E5E7EB;padding-top:14px}.summary-body{font-size:12px}`,
    'Academic Modern': `.header.minimal{background:#F8FAFC;border-radius:12px;padding:26px}.section>h2{border-bottom:0}.section>h2::after{content:'';display:block;height:1px;background:#D1D5DB;margin-top:8px}`,
    'Academic European': `.sidebar.light{background:linear-gradient(180deg,#F9FAFB,#F3F4F6)}.main{background:#fff}.section{border-bottom:1px solid #E5E7EB;padding-bottom:13px}`,
  };

  const sidebarReset = `
.premium-page .sidebar .section>h2{background:transparent!important;border-radius:0!important;padding:0 0 6px!important}
.premium-page .sidebar .section>h2::after{content:none!important;display:none!important}
.premium-page .sidebar.light .section>h2{background:transparent!important}
`;

  return `${base}${family[category] || ''}${perTemplate[name] || ''}${sidebarReset}`;
}


export const CV_TEMPLATE_LIBRARY: CvTemplateSeed[] = [

  // ─── Executive ──────────────────────────────────────────────────────────────
  // Architectural diversity: sidebar+luxury(Prestige) / banner+italic(Gilt) /
  // minimal+whitespace(Nordic) / split+photo-banner(Photo) / split+bold(Slate)

  T('cv', 'Executive Prestige', 'Executive', {
    columns: 2, accent: '#B8972E', headerStyle: 'sidebar',
    typography: { heading: 'Playfair Display', body: 'Lora' },
    density: 'spacious', style: 'sidebar', sidebarColor: 'navy',
    sidebarSide: 'left', sidebarWidth: 285, photoShape: 'circle', photoPlace: 'sidebar',
    skillStyle: 'chips', languageStyle: 'text', timeline: true, premium: true,
    accentDividers: true,
    customCss: `/*executive-luxury-serif-gold-navy-spacious*/.sidebar{background:linear-gradient(175deg,#0D1B2A 0%,#14283E 100%)}.sidebar-head{border-bottom-color:rgba(184,151,46,.35)}.sidebar-head h1{font-size:26px;letter-spacing:-.01em;font-weight:500}.sidebar h2{color:rgba(184,151,46,.85);border-color:rgba(184,151,46,.3);font-size:10px;letter-spacing:.12em}.photo-circle{border:3px solid rgba(184,151,46,.45)}h2{color:#0D1B2A;border-color:#B8972E;font-size:13px;letter-spacing:.04em;font-weight:600}.e-role{font-weight:600;font-size:14px;color:#0F172A;font-style:italic;font-family:'Playfair Display',serif}.e-company{color:#B8972E;font-style:italic;font-weight:500}.e-date{color:#9CA3AF;font-style:italic;font-size:10px}.tl-dot{background:#B8972E;box-shadow:0 0 0 3px rgba(184,151,46,.25)}.tl-track{border-left-color:rgba(184,151,46,.35)}.sk-chip{border-left-color:#B8972E;background:rgba(184,151,46,.04)}.chip-name{color:#E6EDF3}.chip-level{color:#B8972E}.cert-item{border-left-color:#B8972E;background:rgba(184,151,46,.04)}.cert-name{color:#E6EDF3;font-size:11px;font-weight:600}.cert-issuer{color:#B8972E;font-size:10px}.e-bullets strong.metric{color:#B8972E;font-weight:700}.award-item{border-bottom:1px solid rgba(184,151,46,.15);padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:600;color:#0F172A;font-style:italic;font-family:'Playfair Display',serif}.award-meta{color:#B8972E;font-size:11px}`,
  }),

  T('cv', 'Executive Gilt', 'Executive', {
    columns: 1, accent: '#8B6914', headerStyle: 'banner',
    headerBg: 'linear-gradient(160deg,#0D1B2A 0%,#1a2d42 100%)',
    bannerBorderBottom: '5px solid #B8972E',
    typography: { heading: 'Playfair Display', body: 'Lora' },
    density: 'spacious', style: 'banner', skillStyle: 'compact',
    languageStyle: 'text', accentDividers: true, premium: true,
    timeline: true, customCss: `/*executive-luxury-serif-gold-navy-spacious*/.banner-text h1{font-size:44px;font-style:italic;font-weight:400;letter-spacing:-.02em}.banner-text .headline{font-size:18px;font-style:italic;opacity:.82}.banner-contact{border-top-color:rgba(184,151,46,.4);letter-spacing:.04em}h2{color:#8B6914;border-bottom:none;padding-bottom:0}h2::after{content:'';display:block;width:44px;height:2px;background:#B8972E;margin-top:8px;opacity:.7}.e-company{color:#8B6914;font-style:italic}.e-date{color:#9CA3AF;font-style:italic;font-size:10px}.stars{color:#B8972E}.summary-body{font-style:italic;font-size:12px;line-height:1.8}.e-bullets strong.metric{color:#B8972E;font-weight:700}.cert-item{border-left-color:#B8972E;padding-left:16px;background:rgba(184,151,46,.02)}.cert-name{font-size:13px;font-weight:600;font-style:italic}.cert-issuer{color:#8B6914;font-size:11px}.award-item{padding:8px 0;border-bottom-color:rgba(139,105,20,.12)}.award-name{font-size:12.5px;font-weight:600}.award-meta{color:#8B6914;font-size:10.5px}`,
  }),

  T('cv', 'Executive Nordic', 'Executive', {
    columns: 1, accent: '#1F2937', headerStyle: 'minimal',
    typography: { heading: 'Cormorant Garamond', body: 'DM Sans' },
    density: 'spacious', style: 'minimal', skillStyle: 'compact', languageStyle: 'text', timeline: true, accentDividers: true, premium: true,
    photoShape: 'circle', photoPlace: 'header', customCss: `/*executive-luxury-serif-gold-navy-spacious*/.header.minimal{border-bottom:none;padding-bottom:0}.header.minimal h1{font-size:54px;font-weight:300;letter-spacing:-.04em;font-style:italic}.header.minimal .headline{font-size:13px;letter-spacing:.18em;color:#4B5563;text-transform:uppercase;font-weight:400;margin-top:8px;font-family:'DM Sans',sans-serif}.header.minimal .contact-bar{color:#9CA3AF;font-size:11px}.header.minimal::after{content:'';display:block;width:56px;height:2px;background:#1F2937;margin-top:24px}h2{border-bottom:none;font-size:10px;letter-spacing:.22em;color:#9CA3AF;margin-bottom:10px;font-family:'DM Sans',sans-serif;padding-bottom:0;text-transform:uppercase}h2::before{content:'— ';color:#1F2937}.e-role{font-weight:600;font-size:15px;color:#0F172A;font-family:'Cormorant Garamond',serif;font-style:italic}.e-company{color:#4B5563;font-style:italic;font-weight:500;font-size:13px}.e-date{color:#9CA3AF;font-size:10px;font-style:italic}.e-bullets strong.metric{color:#1F2937;font-weight:700}.cert-item{border-left:2px solid #1F2937;padding-left:16px;margin-bottom:10px;background:rgba(31,41,55,.01)}.cert-name{font-weight:600;color:#0F172A;font-size:13px;font-family:'Cormorant Garamond',serif;font-style:italic}.cert-issuer{color:#4B5563;font-size:11px;font-family:'DM Sans',sans-serif}.cert-date{color:#9CA3AF;font-size:10px}.award-item{border-bottom:1px solid #E5E7EB;padding-bottom:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:600;color:#0F172A;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14px}.award-meta{color:#4B5563;font-size:11px;font-family:'DM Sans',sans-serif}`,
  }),

  T('resume', 'Executive Slate', 'Executive', {
    columns: 1, accent: '#1E293B', headerStyle: 'split',
    typography: { heading: 'Manrope', body: 'Manrope' },
    density: 'comfortable', style: 'split', skillStyle: 'compact', languageStyle: 'dots', timeline: true, accentDividers: true, premium: true,
    photoShape: 'circle', photoPlace: 'header', customCss: `/*executive-luxury-serif-gold-navy-spacious*/.header.split{border-bottom-width:4px;border-bottom-color:#1E293B}.split-left h1{font-size:42px;color:#0F172A;letter-spacing:-.03em;font-weight:800}.split-left .headline{font-size:16px;color:#475569;font-weight:500}.split-contact span{font-size:10.5px;color:#64748B}h2{color:#1E293B;border-color:#1E293B;font-family:'Manrope',sans-serif;font-weight:700;font-size:12px;letter-spacing:.05em}.e-role{font-weight:700;font-size:14px;color:#0F172A}.e-company{color:#64748B;font-weight:500;font-style:italic;font-size:13px}.e-date{color:#94A3B8;font-size:10px;font-style:italic}.e-bullets strong.metric{color:#1E293B;font-weight:800}.cert-item{border-left:3px solid #1E293B;padding-left:12px;margin-bottom:10px;background:rgba(30,41,59,.02)}.cert-name{font-weight:700;color:#0F172A;font-size:12px}.cert-issuer{color:#475569;font-size:10px}.cert-date{color:#94A3B8;font-size:9px}.award-item{border-bottom:1px solid #E2E8F0;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#0F172A}.award-meta{color:#64748B;font-size:11px}`,
  }),

  T('cv', 'Executive Photo', 'Executive', {
    columns: 1, accent: '#1A1A2E', headerStyle: 'banner',
    headerBg: 'linear-gradient(135deg,#1A1A2E 0%,#16213E 100%)',
    typography: { heading: 'Cormorant Garamond', body: 'Inter' },
    density: 'comfortable', style: 'photo', photoShape: 'circle', photoPlace: 'header',
    skillStyle: 'compact', languageStyle: 'text', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*executive-luxury-serif-gold-navy-spacious*/.banner-main{gap:24px}.photo.photo-banner.photo-circle{width:96px;height:96px;border:3px solid rgba(255,255,255,.4)}.banner-text h1{font-size:48px;font-weight:300;font-style:italic;letter-spacing:-.01em}.banner-text .headline{font-size:17px;letter-spacing:.06em;opacity:.88;font-weight:400}h2{color:#1A1A2E;border-bottom:none;padding-bottom:0;font-size:13px;letter-spacing:.04em;font-weight:600}h2::after{content:'';display:block;height:1px;background:linear-gradient(to right,rgba(26,26,46,.6),transparent);margin-top:8px}.e-role{font-weight:600;font-size:14px;color:#0F172A;font-family:'Cormorant Garamond',serif;font-style:italic}.e-company{color:#334155;font-style:italic;font-weight:500;font-size:13px}.e-date{color:#94A3B8;font-size:10px;font-style:italic}.pill{border:1px solid rgba(26,26,46,.3);background:transparent;color:#1A1A2E;font-weight:500;font-size:10px}.summary-body{font-style:italic;line-height:1.75}.e-bullets strong.metric{color:#1A1A2E;font-weight:700}.cert-item{border-left:2px solid #1A1A2E;padding-left:14px;margin-bottom:10px;background:rgba(26,26,46,.01)}.cert-name{font-weight:600;color:#0F172A;font-size:12px;font-family:'Cormorant Garamond',serif;font-style:italic}.cert-issuer{color:#334155;font-size:10px}.cert-date{color:#94A3B8;font-size:9px}.award-item{border-bottom:1px solid rgba(26,26,46,.1);padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:600;color:#0F172A;font-family:'Cormorant Garamond',serif;font-style:italic}.award-meta{color:#334155;font-size:11px}`,
  }),

  // ─── Corporate ──────────────────────────────────────────────────────────────
  // Architectural diversity: sidebar-right(Pro) / left-border-h2(Classic) /
  // banner+timeline(Timeline) / full-bleed-dark(Bold) / double-border(Civic)

  T('cv', 'Corporate Pro', 'Corporate', {
    columns: 2, accent: '#1E3A8A', headerStyle: 'block',
    typography: { heading: 'Manrope', body: 'Manrope' },
    density: 'comfortable', style: 'twoColumn', sidebarColor: 'light', photoShape: 'none',
    sidebarSide: 'right', sidebarWidth: 260, skillStyle: 'compact', languageStyle: 'dots', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*corporate-professional-structured-blue-conservative*/.sidebar{background:#F8FAFC;border-left:1px solid #E2E8F0}.sidebar h2{color:#1E3A8A;border-color:#1E3A8A;opacity:1;font-size:10px;font-family:'Manrope',sans-serif}.sidebar .dots{color:#1E3A8A}.sidebar .sk-compact-grid{gap:8px 12px}.sidebar .compact-dots{color:#1E3A8A}.sidebar .cert-item{border-left-color:#1E3A8A;background:rgba(30,58,138,.02)}.sidebar .cert-issuer{color:#1E3A8A}h2{color:#1E3A8A;border-color:#1E3A8A;font-family:'Manrope',sans-serif;font-weight:700}.header.block h1{font-size:34px;font-weight:800;letter-spacing:-.025em}.header.block .headline{color:#1E3A8A;font-weight:500}.e-role{font-weight:700;color:#0F172A}.e-company{color:#1E3A8A;font-style:italic;font-weight:400}.e-date{color:#64748B;font-size:10px}.e-bullets strong.metric{color:#1E3A8A;font-weight:800}.award-item{border-bottom-color:rgba(30,58,138,.1)}.award-name{font-weight:700}.award-meta{color:#1E3A8A}`,
  }),

  T('resume', 'Corporate Classic', 'Corporate', {
    columns: 1, accent: '#1F2937', headerStyle: 'block',
    typography: { heading: 'Manrope', body: 'Inter' },
    density: 'comfortable', style: 'classic', skillStyle: 'compact', languageStyle: 'dots', timeline: true, premium: true,
    accentDividers: true,
    photoShape: 'circle', photoPlace: 'header', customCss: `/*corporate-professional-structured-blue-conservative*/.header.block{border-bottom:2px solid #1F2937;padding-bottom:14px}.header.block h1{font-size:42px;font-weight:800;letter-spacing:-.03em;color:#0F172A}.header.block .headline{color:#4B5563;font-weight:500;font-size:15px}.header.block .contact-bar{color:#6B7280}h2{color:#1F2937;border-bottom:none;border-left:3px solid #1F2937;padding-left:10px;font-family:'Manrope',sans-serif;font-weight:700;padding-bottom:3px;font-size:11px;letter-spacing:.08em;text-transform:uppercase}.e-role{font-weight:700;color:#0F172A;font-size:14px}.e-company{color:#1F2937;font-weight:500;font-style:italic;font-size:13px}.e-date{color:#94A3B8;font-size:10px;font-style:italic}.e-bullets strong.metric{color:#1F2937;font-weight:800}.cert-item{border-left:3px solid #1F2937;padding-left:12px;margin-bottom:10px;background:rgba(31,41,55,.02)}.cert-name{font-weight:700;color:#0F172A;font-size:12px}.cert-issuer{color:#4B5563;font-size:10px}.cert-date{color:#94A3B8;font-size:9px}.award-item{border-bottom:1px solid #E5E7EB;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#0F172A}.award-meta{color:#4B5563;font-size:11px}`,
  }),

  T('cv', 'Corporate Timeline', 'Corporate', {
    columns: 1, accent: '#1E3A8A', headerStyle: 'banner',
    headerBg: 'linear-gradient(135deg,#1E3A8A 0%,#1e40af 100%)',
    typography: { heading: 'Manrope', body: 'Inter' },
    density: 'comfortable', style: 'timeline', skillStyle: 'compact', languageStyle: 'dots', timeline: true, premium: true,
    accentDividers: true,
    customCss: `/*corporate-professional-structured-blue-conservative*/.banner-text h1{font-size:42px;font-weight:800;letter-spacing:-.025em}.banner-text .headline{font-size:16px;opacity:.95;font-weight:400}h2{color:#1E3A8A;border-color:#1E3A8A;font-family:'Manrope',sans-serif;font-weight:700;font-size:11px;letter-spacing:.08em}.e-role{font-weight:700;color:#0F172A;font-size:14px}.e-company{color:#1E3A8A;font-style:italic;font-weight:500;font-size:13px}.e-date{color:#64748B;font-size:10px;font-style:italic}.tl-dot{background:#1E3A8A;box-shadow:0 0 0 3px #BFDBFE;width:10px;height:10px}.tl-track{border-left-color:#BFDBFE;border-left-width:2px}.e-bullets strong.metric{color:#1E3A8A;font-weight:800}.cert-item{border-left:3px solid #1E3A8A;padding-left:12px;margin-bottom:10px;background:rgba(30,58,138,.02)}.cert-name{font-weight:700;color:#0F172A;font-size:12px}.cert-issuer{color:#1E3A8A;font-size:10px}.cert-date{color:#64748B;font-size:9px}.award-item{border-bottom:1px solid #BFDBFE;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#0F172A}.award-meta{color:#1E3A8A;font-size:11px}`,
  }),

  T('resume', 'Corporate Bold', 'Corporate', {
    columns: 1, accent: '#111827', headerStyle: 'banner',
    typography: { heading: 'Manrope', body: 'Inter' },
    density: 'compact', style: 'banner', skillStyle: 'compact', languageStyle: 'pills', premium: true,
    timeline: true, accentDividers: true,
    photoShape: 'circle', photoPlace: 'header', customCss: `/*corporate-professional-structured-blue-conservative*/.banner-text h1{font-size:48px;font-weight:900;letter-spacing:-.04em;color:#0F172A}.banner-text .headline{font-size:16px;text-transform:uppercase;letter-spacing:.08em;opacity:.75;font-weight:600}h2{font-size:11px;letter-spacing:.15em;color:#111827;border-color:#111827;font-family:'Manrope',sans-serif;font-weight:800;text-transform:uppercase}.e-role{font-weight:800;color:#0F172A;font-size:14px;letter-spacing:-.01em}.e-company{color:#374151;font-weight:600;font-style:normal;font-size:13px}.e-date{color:#9CA3AF;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.04em}.pill{background:rgba(17,24,39,.08);color:#111827;font-weight:700;border-radius:3px;font-size:10px}.e-bullets strong.metric{color:#111827;font-weight:900}.cert-item{border-left:4px solid #111827;padding-left:12px;margin-bottom:10px;background:rgba(17,24,39,.03)}.cert-name{font-weight:800;color:#0F172A;font-size:12px;text-transform:uppercase;letter-spacing:.02em}.cert-issuer{color:#374151;font-size:10px;font-weight:600}.cert-date{color:#9CA3AF;font-size:9px;font-weight:500}.award-item{border-bottom:2px solid #E5E7EB;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:800;color:#0F172A;letter-spacing:-.01em}.award-meta{color:#374151;font-size:11px;font-weight:600}`,
  }),

  T('cv', 'Civic Government', 'Corporate', {
    columns: 1, accent: '#1E3A8A', headerStyle: 'block',
    typography: { heading: 'Inter', body: 'Inter' },
    density: 'comfortable', style: 'classic', skillStyle: 'compact', languageStyle: 'plain', premium: true,
    timeline: true, accentDividers: true,
    photoShape: 'circle', photoPlace: 'header', customCss: `/*corporate-professional-structured-blue-conservative*/.header.block{border-bottom:3px double #1E3A8A;padding-bottom:12px}.header.block h1{font-size:36px;letter-spacing:.01em;font-weight:700;color:#0F172A}.header.block .headline{color:#1E3A8A;font-size:15px;font-weight:600;letter-spacing:.02em}.header.block .contact-bar{color:#6B7280;font-size:11px}h2{font-variant:small-caps;font-size:13px;letter-spacing:.06em;text-transform:none;border-bottom:3px double #1E3A8A;padding-bottom:6px;font-weight:700;color:#1E3A8A}.e-role{font-variant:small-caps;font-size:14px;font-style:normal;font-weight:700;color:#0F172A;letter-spacing:.02em}.e-company{color:#1E3A8A;font-style:italic;font-size:12px;font-weight:500}.e-date{color:#64748B;font-style:italic;font-size:10px}.e-location{font-style:italic;color:#6B7280;font-size:11px}.e-bullets strong.metric{color:#1E3A8A;font-weight:800}.cert-item{border-left:3px double #1E3A8A;padding-left:12px;margin-bottom:10px;background:rgba(30,58,138,.02)}.cert-name{font-weight:700;color:#0F172A;font-size:12px;font-variant:small-caps;letter-spacing:.02em}.cert-issuer{color:#1E3A8A;font-size:10px;font-weight:500}.cert-date{color:#64748B;font-size:9px}.award-item{border-bottom:1px solid #DBEAFE;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#0F172A;font-variant:small-caps;letter-spacing:.01em}.award-meta{color:#1E3A8A;font-size:11px;font-weight:500}`,
  }),

  // ─── ATS ────────────────────────────────────────────────────────────────────

  T('cv',     'ATS Universal',    'ATS', { columns: 1, accent: '#000000', headerStyle: 'block',   typography: { heading: 'Arial', body: 'Arial' }, density: 'comfortable', style: 'classic', skillStyle: 'compact', languageStyle: 'plain', timeline: true, accentDividers: true, atsSafe: true, premium: true, customCss: `/*ats-professional-structured*/.header.block{border-bottom:2px solid #000000;padding-bottom:12px}.header.block h1{font-size:36px;font-weight:700;letter-spacing:-.01em;color:#000000}.header.block .headline{font-size:14px;color:#333333;font-weight:600}.header.block .contact-bar{color:#666666;font-size:11px}h2{color:#000000;border-bottom:2px solid #000000;padding-bottom:6px;font-size:12px;letter-spacing:.04em;font-weight:700;text-transform:uppercase}.e-role{font-weight:700;color:#000000;font-size:14px}.e-company{color:#333333;font-weight:600;font-size:13px}.e-date{color:#666666;font-size:11px}.e-bullets strong.metric{color:#000000;font-weight:800}.cert-item{border-left:3px solid #000000;padding-left:12px;margin-bottom:10px}.cert-name{font-weight:700;color:#000000;font-size:12px}.cert-issuer{color:#333333;font-size:11px}.cert-date{color:#666666;font-size:10px}.award-item{border-bottom:1px solid #CCCCCC;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#000000}.award-meta{color:#333333;font-size:11px}` }),
  T('resume', 'ATS Resume',       'ATS', { columns: 1, accent: '#000000', headerStyle: 'block',   typography: { heading: 'Arial', body: 'Arial' }, density: 'compact',     style: 'classic', skillStyle: 'compact', languageStyle: 'plain', timeline: true, accentDividers: true, atsSafe: true, premium: true, customCss: `/*ats-professional-structured*/.header.block{border-bottom:2px solid #000000;padding-bottom:10px}.header.block h1{font-size:34px;font-weight:700;letter-spacing:-.01em;color:#000000}.header.block .headline{font-size:13px;color:#333333;font-weight:600}.header.block .contact-bar{color:#666666;font-size:10px}h2{color:#000000;border-bottom:2px solid #000000;padding-bottom:5px;font-size:11px;letter-spacing:.04em;font-weight:700;text-transform:uppercase}.e-role{font-weight:700;color:#000000;font-size:13px}.e-company{color:#333333;font-weight:600;font-size:12px}.e-date{color:#666666;font-size:10px}.e-bullets strong.metric{color:#000000;font-weight:800}.cert-item{border-left:3px solid #000000;padding-left:10px;margin-bottom:8px}.cert-name{font-weight:700;color:#000000;font-size:11px}.cert-issuer{color:#333333;font-size:10px}.cert-date{color:#666666;font-size:9px}.award-item{border-bottom:1px solid #CCCCCC;padding-bottom:6px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#000000}.award-meta{color:#333333;font-size:10px}` }),
  T('cv',     'ATS Professional', 'ATS', { columns: 1, accent: '#1a1a1a', headerStyle: 'minimal', typography: { heading: 'Arial', body: 'Arial' }, density: 'comfortable', style: 'minimal', skillStyle: 'compact', languageStyle: 'text', timeline: true, accentDividers: true, atsSafe: true, premium: true, customCss: `/*ats-professional-structured*/.header.minimal h1{font-size:38px;font-weight:700;letter-spacing:-.01em;color:#1a1a1a}.header.minimal .headline{font-size:14px;color:#333333;font-weight:600;letter-spacing:.02em}.header.minimal .contact-bar{color:#666666;font-size:11px}.header.minimal{border-bottom:1px solid #1a1a1a;padding-bottom:12px}h2{color:#1a1a1a;border-bottom:1px solid #1a1a1a;padding-bottom:6px;font-size:12px;letter-spacing:.04em;font-weight:700;text-transform:uppercase}.e-role{font-weight:700;color:#1a1a1a;font-size:14px}.e-company{color:#333333;font-weight:600;font-size:13px}.e-date{color:#666666;font-size:11px}.e-bullets strong.metric{color:#1a1a1a;font-weight:800}.cert-item{border-left:3px solid #1a1a1a;padding-left:12px;margin-bottom:10px}.cert-name{font-weight:700;color:#1a1a1a;font-size:12px}.cert-issuer{color:#333333;font-size:11px}.cert-date{color:#666666;font-size:10px}.award-item{border-bottom:1px solid #CCCCCC;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#1a1a1a}.award-meta{color:#333333;font-size:11px}` }),

  // ─── Modern ─────────────────────────────────────────────────────────────────
  // Architectural diversity: accent-sidebar(Teal) / photo-sidebar-left(Split) /
  // gradient-banner(Indigo) / dark-charcoal-sidebar(Dark)

  T('cv', 'Modern Teal Pro', 'Modern', {
    columns: 2, accent: '#0F766E', headerStyle: 'sidebar',
    typography: { heading: 'DM Sans', body: 'DM Sans' },
    density: 'comfortable', style: 'sidebar', sidebarColor: 'accent',
    sidebarSide: 'left', sidebarWidth: 270, photoShape: 'circle', photoPlace: 'sidebar',
    skillStyle: 'chips', languageStyle: 'dots', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*modern-dynamic-gradient*/.sidebar{background:linear-gradient(175deg,#0F766E 0%,#0D5E58 100%)}.sidebar-head h1{font-size:26px;font-weight:700}.sidebar h2{color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.25);font-size:10px;letter-spacing:.12em}.sidebar .dots{color:rgba(255,255,255,.9)}.sidebar .sk-chip{border-left-color:rgba(255,255,255,.6);background:rgba(255,255,255,.08)}.sidebar .chip-name{color:#FFF;font-weight:600}.sidebar .chip-level{color:rgba(255,255,255,.7)}.sidebar .cert-item{border-left-color:rgba(255,255,255,.6);background:rgba(255,255,255,.06)}.sidebar .cert-name{color:#FFF;font-size:11px}.sidebar .cert-issuer{color:rgba(255,255,255,.8);font-size:10px}.photo-circle{border-color:rgba(255,255,255,.4);border-width:3px}h2{color:#0F766E;border-color:#0F766E;font-family:'DM Sans',sans-serif;font-weight:700;font-size:12px;letter-spacing:.06em}.e-role{font-weight:700;color:#0F172A;font-size:14px}.e-company{color:#0F766E;font-style:italic;font-weight:500}.e-date{color:#64748B;font-size:10px}.e-bullets strong.metric{color:#0F766E;font-weight:800}.award-item{border-bottom:1px solid #D1FAE5;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#0F172A}.award-meta{color:#0F766E;font-size:11px}`,
  }),

  T('resume', 'Modern Split', 'Modern', {
    columns: 2, accent: '#0284C7', headerStyle: 'block',
    typography: { heading: 'DM Sans', body: 'DM Sans' },
    density: 'comfortable', style: 'twoColumn', sidebarColor: 'light',
    sidebarSide: 'left', sidebarWidth: 265, photoShape: 'circle', photoPlace: 'sidebar',
    skillStyle: 'compact', languageStyle: 'dots', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*modern-dynamic-gradient*/.sidebar{background:#F0F9FF;border-right:1px solid #BAE6FD}.sidebar h2{color:#0284C7;border-color:#0284C7;opacity:1;font-size:10px;letter-spacing:.1em;font-weight:700}.sidebar .dots{color:#0284C7}.sidebar .pill{background:rgba(2,132,199,.12);color:#0284C7;font-weight:600}.sidebar .cert-item{border-left:3px solid #0284C7;padding-left:10px;margin-bottom:8px;background:rgba(2,132,199,.04)}.sidebar .cert-name{font-weight:700;font-size:10px}.sidebar .cert-issuer{color:#0284C7;font-size:9px}.photo-circle{border:3px solid #0284C7}h2{color:#0284C7;border-color:#0284C7;font-family:'DM Sans',sans-serif;font-weight:700;font-size:12px;letter-spacing:.06em}.header.block h1{font-size:38px;font-weight:700;letter-spacing:-.025em}.header.block .headline{color:#0284C7;font-weight:600;font-size:15px}.e-role{font-weight:700;color:#0F172A;font-size:14px}.e-company{color:#0284C7;font-style:italic;font-weight:500}.e-date{color:#64748B;font-size:10px}.e-bullets strong.metric{color:#0284C7;font-weight:800}.award-item{border-bottom:1px solid #BAE6FD;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#0F172A}.award-meta{color:#0284C7;font-size:11px}`,
  }),

  T('cv', 'Modern Indigo', 'Modern', {
    columns: 1, accent: '#4F46E5', headerStyle: 'banner',
    headerBg: 'linear-gradient(135deg,#4F46E5 0%,#4338CA 100%)',
    typography: { heading: 'Plus Jakarta Sans', body: 'DM Sans' },
    density: 'comfortable', style: 'banner', skillStyle: 'compact', languageStyle: 'pills', premium: true,
    timeline: true, accentDividers: true,
    photoShape: 'circle', photoPlace: 'header', customCss: `/*modern-dynamic-gradient*/.banner-text h1{font-size:44px;font-weight:700;letter-spacing:-.025em}.banner-text .headline{font-size:17px;opacity:.92;font-weight:500}h2{color:#4F46E5;border-color:#4F46E5;font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:12px;letter-spacing:.06em}.e-role{font-weight:700;color:#0F172A;font-size:14px}.e-company{color:#4F46E5;font-style:italic;font-weight:500}.e-date{color:#64748B;font-size:10px}.pill{background:rgba(79,70,229,.09);color:#4F46E5;border-radius:4px;font-weight:600;font-size:10px}.e-bullets strong.metric{color:#4F46E5;font-weight:800}.cert-item{border-left:3px solid #4F46E5;padding-left:12px;margin-bottom:10px;background:rgba(79,70,229,.03)}.cert-name{font-weight:700;color:#0F172A;font-size:12px}.cert-issuer{color:#4F46E5;font-size:10px}.cert-date{color:#64748B;font-size:9px}.award-item{border-bottom:1px solid #C7D2FE;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#0F172A}.award-meta{color:#4F46E5;font-size:11px}`,
  }),

  T('cv', 'Modern Dark', 'Modern', {
    columns: 2, accent: '#6366F1', headerStyle: 'sidebar',
    typography: { heading: 'Plus Jakarta Sans', body: 'DM Sans' },
    density: 'comfortable', style: 'sidebar', sidebarColor: 'charcoal',
    sidebarSide: 'left', sidebarWidth: 270, photoShape: 'circle', photoPlace: 'sidebar',
    skillStyle: 'compact', languageStyle: 'dots', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*modern-dynamic-gradient*/.sidebar{background:linear-gradient(175deg,#1E293B 0%,#0F172A 100%)}.sidebar-head h1{font-size:24px;font-weight:700}.sidebar h2{color:rgba(99,102,241,.9);border-color:rgba(99,102,241,.35);letter-spacing:.18em;font-family:'Plus Jakarta Sans',sans-serif;font-size:10px}.sidebar .dots{color:#818CF8}.sidebar .sk-compact-grid{gap:6px}.sidebar .sk-compact{font-size:10px;color:#E2E8F0}.sidebar .compact-dots{color:#818CF8}.sidebar .cert-item{border-left-color:#818CF8;background:rgba(99,102,241,.05)}.sidebar .cert-name{color:#E2E8F0;font-size:11px;font-weight:700}.sidebar .cert-issuer{color:#818CF8;font-size:10px}.photo-circle{border-color:rgba(99,102,241,.5);border-width:3px}h2{color:#4F46E5;border-color:#4F46E5;font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:12px;letter-spacing:.06em}.e-role{font-weight:700;color:#0F172A;font-size:14px}.e-company{color:#4F46E5;font-style:italic;font-weight:500}.e-date{color:#64748B;font-size:10px}.e-bullets strong.metric{color:#6366F1;font-weight:800}.award-item{border-bottom:1px solid #E0E7FF;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#0F172A}.award-meta{color:#6366F1;font-size:11px}`,
  }),

  // ─── Creative ───────────────────────────────────────────────────────────────
  // Architectural diversity: dark-sidebar+gold(Dark) / coral-gradient(Coral) /
  // purple-banner+timeline(Purple) / editorial-left-border(Magazine)

  T('cv', 'Creative Dark', 'Creative', {
    columns: 2, accent: '#EAB308', headerStyle: 'sidebar',
    typography: { heading: 'Poppins', body: 'Inter' },
    density: 'comfortable', style: 'sidebar', sidebarColor: 'dark',
    sidebarSide: 'left', sidebarWidth: 280, photoShape: 'circle', photoPlace: 'sidebar',
    skillStyle: 'chips', languageStyle: 'pills', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*creative-bold-vivid-gradient-artistic*/.sidebar{background:linear-gradient(175deg,#0F172A 0%,#1a2538 100%)}.sidebar-head h1{font-size:26px;color:#EAB308;font-weight:700}.sidebar-head .s-headline{color:#94A3B8}.sidebar h2{color:#EAB308;border-color:rgba(234,179,8,.3);opacity:1;font-size:10px;letter-spacing:.1em}.sidebar .pill{background:rgba(234,179,8,.15);color:#EAB308;font-weight:600}.sidebar .sk-chip{border-left-color:#EAB308;background:rgba(234,179,8,.08)}.sidebar .chip-name{color:#E6EDF3}.sidebar .chip-level{color:#EAB308}.sidebar .cert-item{border-left-color:#EAB308;background:rgba(234,179,8,.05)}.sidebar .cert-name{color:#E6EDF3;font-size:11px;font-weight:700}.sidebar .cert-issuer{color:#EAB308;font-size:10px}.photo-circle{border:3px solid rgba(234,179,8,.5)}h2{color:#EAB308;border-color:rgba(234,179,8,.5);font-size:12px;letter-spacing:.05em;font-weight:700}.e-role{font-weight:700;color:#0F172A;font-size:14px}.e-company{color:#D97706;font-style:italic;font-weight:500}.e-date{color:#6B7280;font-size:10px}.e-bullets strong.metric{color:#EAB308;font-weight:800}.award-item{border-bottom:1px solid rgba(234,179,8,.15);padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#0F172A}.award-meta{color:#D97706;font-size:11px}`,
  }),

  T('cv', 'Creative Coral', 'Creative', {
    columns: 2, accent: '#EA580C', headerStyle: 'sidebar',
    typography: { heading: 'Poppins', body: 'Inter' },
    density: 'comfortable', style: 'sidebar', sidebarColor: 'accent',
    sidebarSide: 'left', sidebarWidth: 270, photoShape: 'circle', photoPlace: 'sidebar',
    skillStyle: 'compact', languageStyle: 'dots', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*creative-bold-vivid-gradient-artistic*/.sidebar{background:linear-gradient(160deg,#EA580C 0%,#C2410C 100%)}.sidebar-head h1{font-size:25px;font-weight:700}.sidebar h2{color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.25);font-size:10px;letter-spacing:.1em}.sidebar .bar{background:rgba(255,255,255,.2)}.sidebar .fill{background:#FFF}.sidebar .dots{color:#FFF}.sidebar .cert-item{border-left:3px solid rgba(255,255,255,.6);padding-left:10px;margin-bottom:8px;background:rgba(255,255,255,.08)}.sidebar .cert-name{color:#FFF;font-size:11px;font-weight:700}.sidebar .cert-issuer{color:rgba(255,255,255,.8);font-size:10px}.photo-circle{border-color:rgba(255,255,255,.5);border-width:3px}h2{color:#EA580C;border-color:#EA580C;font-size:12px;letter-spacing:.05em;font-weight:700}.e-role{font-weight:700;color:#0F172A;font-size:14px}.e-company{color:#C2410C;font-style:italic;font-weight:500}.e-date{color:#6B7280;font-size:10px}.pill{background:rgba(234,88,12,.1);color:#EA580C;font-weight:600;font-size:10px}.e-bullets strong.metric{color:#EA580C;font-weight:800}.award-item{border-bottom:1px solid #FED7AA;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#0F172A}.award-meta{color:#C2410C;font-size:11px}`,
  }),

  T('resume', 'Creative Purple', 'Creative', {
    columns: 1, accent: '#7C3AED', headerStyle: 'banner',
    headerBg: 'linear-gradient(135deg,#7C3AED 0%,#C026D3 100%)',
    typography: { heading: 'Poppins', body: 'Inter' },
    density: 'comfortable', style: 'timeline', skillStyle: 'compact', languageStyle: 'pills', timeline: true, premium: true,
    accentDividers: true,
    customCss: `/*creative-bold-vivid-gradient-artistic*/.banner-text h1{font-size:40px;font-weight:700}.banner-text .headline{font-size:17px;opacity:.9}h2{color:#7C3AED;border-color:#7C3AED}.e-role{font-weight:700;color:#0F172A}.e-company{color:#7C3AED;font-style:italic;font-weight:400}.e-date{color:#6B7280;font-size:10px}.tl-dot{background:#7C3AED;box-shadow:0 0 0 3px #DDD6FE}.tl-track{border-left-color:#DDD6FE}.pill{background:rgba(124,58,237,.1);color:#7C3AED;font-weight:600}.e-bullets strong.metric{color:#7C3AED;font-weight:800}.cert-item{border-left-color:#7C3AED;background:rgba(124,58,237,.04)}.cert-name{font-weight:700}.cert-issuer{color:#7C3AED}.award-item{border-bottom-color:rgba(124,58,237,.12)}.award-name{font-weight:700}.award-meta{color:#7C3AED}`,
  }),

  T('cv', 'Creative Magazine', 'Creative', {
    columns: 2, accent: '#DC2626', headerStyle: 'block',
    typography: { heading: 'Cormorant Garamond', body: 'Inter' },
    density: 'spacious', style: 'twoColumn', sidebarColor: 'warmlight',
    sidebarSide: 'right', sidebarWidth: 260, photoShape: 'none', skillStyle: 'compact', languageStyle: 'pills', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*creative-bold-vivid-gradient-artistic*/.header.block h1{font-size:54px;font-style:italic;font-weight:600;letter-spacing:-.03em}.header.block .headline{font-size:17px;color:#DC2626;font-style:italic;font-weight:500}.header.block{border-bottom:none;border-left:5px solid #DC2626;padding-left:20px}.sidebar{background:#FAFAF8;border-left:1px solid #F3F0E8}.sidebar h2{color:#DC2626;border-color:rgba(220,38,38,.3);opacity:1;font-size:9px;letter-spacing:.2em;font-weight:700}.sidebar .pill{background:rgba(220,38,38,.09);color:#DC2626;font-weight:600}.sidebar .cert-item{border-left:3px solid #DC2626;padding-left:10px;margin-bottom:8px;background:rgba(220,38,38,.03)}.sidebar .cert-name{font-weight:700;font-size:10px}.sidebar .cert-issuer{color:#DC2626;font-size:9px}h2{font-style:italic;text-transform:none;letter-spacing:0;font-size:16px;font-weight:500;border-bottom:none;color:#111827;padding-bottom:0;margin-bottom:10px}h2::after{content:'';display:block;height:1px;background:#E5E7EB;margin-top:8px}.e-role{font-weight:600;font-style:italic;font-size:14px}.e-company{color:#DC2626;font-style:italic;font-weight:500}.e-date{color:#9CA3AF;font-size:10px;font-style:italic}.pill{background:rgba(220,38,38,.08);color:#DC2626;border-radius:3px;font-size:10px}.e-bullets strong.metric{color:#DC2626;font-weight:800}.award-item{border-bottom:1px solid rgba(220,38,38,.12);padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#111827;font-style:italic}.award-meta{color:#DC2626;font-size:11px}`,
  }),

  // ─── Developer ──────────────────────────────────────────────────────────────
  // Architectural diversity: terminal-dark-sidebar(Terminal) / dark-banner(GitHub) /
  // sidebar-right-teal(Full Stack) / mono-minimal(Data)
  // Note: .e-company overrides font-style:normal since monospace italic looks wrong

  T('cv', 'Dev Terminal', 'Developer', {
    columns: 2, accent: '#16A34A', headerStyle: 'sidebar',
    typography: { heading: 'JetBrains Mono', body: 'Inter' },
    density: 'compact', style: 'sidebar', sidebarColor: 'dark',
    sidebarSide: 'left', sidebarWidth: 270, photoShape: 'none',
    skillStyle: 'compact', languageStyle: 'pills', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*developer-monospace-terminal-technical-green*/.sidebar{background:#0D1117;font-family:'JetBrains Mono',monospace}.sidebar-head h1{font-family:'JetBrains Mono',monospace;font-size:20px;color:#E6EDF3}.sidebar-head .s-headline{color:#8B949E;font-size:11px}.sidebar-head{border-bottom-color:rgba(22,163,74,.3)}.sidebar h2{font-family:'JetBrains Mono',monospace;color:#16A34A;border-color:rgba(22,163,74,.25);border-bottom-width:1px}.sidebar h2::before{content:'// '}.sidebar .pill{background:transparent;border:1px solid #16A34A;color:#16A34A;font-family:'JetBrains Mono',monospace;border-radius:2px;font-size:9.5px}.sidebar .sk-compact-grid{gap:6px 10px}.sidebar .sk-compact{font-family:'JetBrains Mono',monospace;font-size:10px}.sidebar .compact-dots{color:#16A34A;font-size:11px}.c-ico{color:#16A34A}h2{color:#16A34A;border-color:#16A34A;font-family:'JetBrains Mono',monospace;border-bottom-width:1px}h2::before{content:'// ';color:#16A34A;opacity:.5;font-size:11px}.e-role{font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:700}.e-company{color:#16A34A;font-family:'JetBrains Mono',monospace;font-size:11px;font-style:normal}.e-date{font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B7280}.pill{background:transparent;border:1px solid rgba(22,163,74,.4);color:#16A34A;font-family:'JetBrains Mono',monospace;border-radius:2px}.cert-item{border-left-color:#16A34A;background:rgba(22,163,74,.04)}.cert-name{color:#E6EDF3;font-family:'JetBrains Mono',monospace;font-size:11px}.cert-issuer{color:#16A34A;font-family:'JetBrains Mono',monospace}`,
  }),

  T('resume', 'Dev GitHub', 'Developer', {
    columns: 1, accent: '#1B4332', headerStyle: 'block',
    typography: { heading: 'Inter', body: 'Inter' },
    density: 'compact', style: 'classic', skillStyle: 'compact', languageStyle: 'pills', timeline: true, premium: true,
    accentDividers: true,
    customCss: `/*developer-monospace-terminal-technical-green*/.header.block{background:#0D1117;padding:32px 44px 22px;border-bottom:none}.header.block h1{color:#E6EDF3;font-size:38px;font-weight:700;letter-spacing:-.02em}.header.block .headline{color:#8B949E;font-size:15px;font-weight:500}.header.block .contact-bar{color:#8B949E;font-size:11px}h2{color:#1B4332;border-color:#4ADE80;border-bottom-width:1px;font-size:11px;letter-spacing:.12em;font-weight:700}h2::before{content:'## ';color:#4ADE80;opacity:.7}.e-role{font-weight:700;color:#0F172A;font-size:14px;font-family:'JetBrains Mono',monospace}.e-company{color:#166534;font-style:normal;font-weight:500;font-size:12px;font-family:'JetBrains Mono',monospace}.e-date{color:#6B7280;font-size:10px;font-family:'JetBrains Mono',monospace}.pill{background:rgba(27,67,50,.08);color:#1B4332;border-radius:3px;font-weight:600;font-size:10px;font-family:'JetBrains Mono',monospace}.e-bullets strong.metric{color:#1B4332;font-weight:800}.cert-item{border-left:3px solid #4ADE80;padding-left:12px;margin-bottom:10px;background:rgba(27,67,50,.03)}.cert-name{font-weight:700;font-size:12px;font-family:'JetBrains Mono',monospace}.cert-issuer{color:#166534;font-size:10px}.cert-date{color:#6B7280;font-size:9px}.award-item{border-bottom:1px solid #BBF7D0;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;font-family:'JetBrains Mono',monospace}.award-meta{color:#166534;font-size:11px}`,
  }),

  T('cv', 'Dev Full Stack', 'Developer', {
    columns: 2, accent: '#0F766E', headerStyle: 'block',
    typography: { heading: 'DM Sans', body: 'DM Sans' },
    density: 'comfortable', style: 'twoColumn', sidebarColor: 'light', photoShape: 'none',
    sidebarSide: 'right', sidebarWidth: 260, skillStyle: 'compact', languageStyle: 'pills', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*developer-monospace-terminal-technical-green*/.sidebar{background:#F0FDF4;border-left:1px solid #BBF7D0}.sidebar h2{color:#0F766E;border-color:#0F766E;opacity:1;font-size:10px;letter-spacing:.1em;font-weight:700}.sidebar .pill{background:rgba(15,118,110,.12);color:#0F766E;font-weight:600;font-size:10px;font-family:'JetBrains Mono',monospace}.sidebar .cert-item{border-left:3px solid #0F766E;padding-left:10px;margin-bottom:8px;background:rgba(15,118,110,.04)}.sidebar .cert-name{font-weight:700;font-size:10px;font-family:'JetBrains Mono',monospace}.sidebar .cert-issuer{color:#0F766E;font-size:9px}.header.block{border-bottom-color:#0F766E;border-bottom-width:2px}.header.block h1{font-size:38px;font-weight:700;letter-spacing:-.025em;font-family:'JetBrains Mono',monospace}.header.block .headline{color:#0F766E;font-weight:600;font-family:'JetBrains Mono',monospace;font-size:13px}h2{color:#0F766E;border-color:#0F766E;font-family:'DM Sans',sans-serif;font-weight:700;font-size:11px;letter-spacing:.1em}h2::before{content:'/> ';color:#0F766E;opacity:.6}.e-role{font-weight:700;color:#0F172A;font-size:14px;font-family:'JetBrains Mono',monospace}.e-company{color:#0F766E;font-style:normal;font-weight:500;font-size:12px;font-family:'JetBrains Mono',monospace}.e-date{color:#64748B;font-size:10px}.e-bullets strong.metric{color:#0F766E;font-weight:800}.award-item{border-bottom:1px solid#BBF7D0;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;font-family:'JetBrains Mono',monospace}.award-meta{color:#0F766E;font-size:11px}`,
  }),

  T('resume', 'Dev Data', 'Developer', {
    columns: 1, accent: '#6366F1', headerStyle: 'minimal',
    typography: { heading: 'JetBrains Mono', body: 'Inter' },
    density: 'compact', style: 'minimal', skillStyle: 'compact', languageStyle: 'pills', premium: true,
    timeline: true, accentDividers: true,
    photoShape: 'circle', photoPlace: 'header', customCss: `/*developer-monospace-terminal-technical-green*/.header.minimal h1{font-family:'JetBrains Mono',monospace;font-size:38px;font-weight:700;letter-spacing:-.02em}.header.minimal .headline{font-size:12px;letter-spacing:.06em;color:#6366F1;text-transform:uppercase;font-weight:500;font-family:'JetBrains Mono',monospace}.header.minimal .contact-bar{color:#6B7280;font-family:'JetBrains Mono',monospace;font-size:10px}.header.minimal{border-bottom-color:#E0E7FF;border-bottom-width:2px}h2{font-family:'JetBrains Mono',monospace;font-size:10px;color:#6366F1;border-color:#C7D2FE;font-weight:700;letter-spacing:.1em}h2::before{content:'>>> ';color:#6366F1;opacity:.6}.e-role{font-family:'JetBrains Mono',monospace;font-weight:700;color:#0F172A;font-size:14px}.e-company{color:#4F46E5;font-family:'JetBrains Mono',monospace;font-size:12px;font-style:normal;font-weight:500}.e-date{font-family:'JetBrains Mono',monospace;font-size:10px;color:#6B7280}.pill{background:rgba(99,102,241,.1);color:#4F46E5;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600}.e-bullets strong.metric{color:#6366F1;font-weight:800}.cert-item{border-left:3px solid #6366F1;padding-left:12px;margin-bottom:10px;background:rgba(99,102,241,.03)}.cert-name{font-weight:700;font-size:12px;font-family:'JetBrains Mono',monospace}.cert-issuer{color:#4F46E5;font-size:10px}.cert-date{color:#6B7280;font-size:9px}.award-item{border-bottom:1px solid #C7D2FE;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;font-family:'JetBrains Mono',monospace}.award-meta{color:#4F46E5;font-size:11px}`,
  }),

  // ─── Designer ───────────────────────────────────────────────────────────────
  // Architectural diversity: italic-serif-editorial(Editorial) /
  // vivid-sidebar+square-photo(Studio) / ultra-minimal-split(Minimal)

  T('cv', 'Designer Editorial', 'Designer', {
    columns: 2, accent: '#DC2626', headerStyle: 'block',
    typography: { heading: 'Cormorant Garamond', body: 'Plus Jakarta Sans' },
    density: 'spacious', style: 'twoColumn', sidebarColor: 'light', photoShape: 'none',
    sidebarSide: 'right', sidebarWidth: 260, skillStyle: 'compact', languageStyle: 'pills', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*designer-editorial-creative-visual-portfolio*/.header.block{border-bottom:none;position:relative;padding-bottom:24px}.header.block::after{content:'';position:absolute;bottom:0;left:44px;right:44px;height:1px;background:#F3F4F6}.header.block h1{font-size:56px;font-style:italic;font-weight:500;letter-spacing:-.02em;color:#111827}.header.block .headline{color:#DC2626;font-size:18px;font-style:italic;font-weight:500}.header.block .contact-bar{color:#9CA3AF}.sidebar{background:#FAFAFA;border-left:1px solid #F3F4F6}.sidebar h2{color:#DC2626;border-color:rgba(220,38,38,.3);opacity:1;font-size:9px;letter-spacing:.2em;font-family:'Plus Jakarta Sans',sans-serif;font-weight:700}.sidebar .pill{background:rgba(220,38,38,.08);color:#DC2626;font-weight:600}.sidebar .sk-compact-grid{gap:8px}.sidebar .compact-dots{color:#DC2626}.sidebar .cert-item{border-left:3px solid #DC2626;padding-left:10px;margin-bottom:8px;background:rgba(220,38,38,.02)}.sidebar .cert-name{font-weight:700;font-size:10px}.sidebar .cert-issuer{color:#DC2626;font-size:9px}h2{font-style:italic;text-transform:none;letter-spacing:0;font-size:17px;font-weight:500;border-bottom:none;color:#111827;padding-bottom:0;margin-bottom:10px;font-family:'Cormorant Garamond',serif}h2::after{content:'';display:block;height:1px;background:#E5E7EB;margin-top:8px}.e-role{font-weight:600;font-style:italic;font-size:14px}.e-company{color:#DC2626;font-style:italic;font-weight:500}.e-date{color:#9CA3AF;font-size:10px;font-style:italic}.pill{background:rgba(220,38,38,.08);color:#DC2626;border-radius:3px;font-size:10px}.e-bullets strong.metric{color:#DC2626;font-weight:800}.award-item{border-bottom:1px solid rgba(220,38,38,.08);padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:600;color:#111827;font-style:italic;font-family:'Cormorant Garamond',serif}.award-meta{color:#DC2626;font-size:11px}`,
  }),

  T('cv', 'Designer Studio', 'Designer', {
    columns: 2, accent: '#7C3AED', headerStyle: 'sidebar',
    typography: { heading: 'Manrope', body: 'Manrope' },
    density: 'comfortable', style: 'sidebar', sidebarColor: 'accent',
    sidebarSide: 'left', sidebarWidth: 270, photoShape: 'square', photoPlace: 'sidebar',
    skillStyle: 'compact', languageStyle: 'dots', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*designer-editorial-creative-visual-portfolio*/.sidebar{background:linear-gradient(160deg,#7C3AED 0%,#6D28D9 100%)}.sidebar-head h1{font-size:25px;font-weight:700}.sidebar h2{color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.2);font-family:'Manrope',sans-serif;font-size:10px;letter-spacing:.1em}.sidebar .bar{background:rgba(255,255,255,.18)}.sidebar .fill{background:rgba(255,255,255,.85)}.sidebar .dots{color:rgba(255,255,255,.9)}.sidebar .cert-item{border-left:3px solid rgba(255,255,255,.6);padding-left:10px;margin-bottom:8px;background:rgba(255,255,255,.08)}.sidebar .cert-name{color:#FFF;font-size:11px;font-weight:700}.sidebar .cert-issuer{color:rgba(255,255,255,.8);font-size:10px}.photo-square{border:3px solid rgba(255,255,255,.35);border-radius:10px}h2{color:#6D28D9;border-color:#6D28D9;font-family:'Manrope',sans-serif;font-weight:700;font-size:12px;letter-spacing:.05em}.e-role{font-weight:700;color:#0F172A;font-size:14px}.e-company{color:#7C3AED;font-style:italic;font-weight:500}.e-date{color:#64748B;font-size:10px}.e-bullets strong.metric{color:#7C3AED;font-weight:800}.award-item{border-bottom:1px solid #DDD6FE;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#0F172A}.award-meta{color:#7C3AED;font-size:11px}`,
  }),

  T('resume', 'Designer Minimal', 'Designer', {
    columns: 1, accent: '#111827', headerStyle: 'split',
    typography: { heading: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans' },
    density: 'spacious', style: 'split', skillStyle: 'compact', languageStyle: 'pills', premium: true,
    timeline: true, accentDividers: true,
    photoShape: 'circle', photoPlace: 'header', customCss: `/*designer-editorial-creative-visual-portfolio*/.header.split{border-bottom-width:1px}.split-left h1{font-size:44px;font-weight:800;letter-spacing:-.04em;color:#111827}.split-left .headline{font-size:15px;color:#6B7280;font-weight:500;letter-spacing:.02em}.split-contact span{color:#9CA3AF;font-size:10.5px}h2{font-size:9px;letter-spacing:.25em;color:#111827;border-bottom:1px solid #111827;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;text-transform:uppercase}.e-role{font-weight:700;font-size:14px;color:#0F172A}.e-company{color:#6B7280;font-style:italic;font-weight:500}.e-date{color:#9CA3AF;font-size:10px}.pill{background:#F3F4F6;color:#374151;border-radius:2px;font-weight:600;font-size:10px}.e-bullets strong.metric{color:#111827;font-weight:800}.cert-item{border-left:2px solid #111827;padding-left:12px;margin-bottom:10px;background:rgba(17,24,39,.01)}.cert-name{font-weight:700;color:#111827;font-size:12px}.cert-issuer{color:#6B7280;font-size:10px}.cert-date{color:#9CA3AF;font-size:9px}.award-item{border-bottom:1px solid #E5E7EB;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#111827}.award-meta{color:#6B7280;font-size:11px}`,
  }),

  // ─── Startup ────────────────────────────────────────────────────────────────
  // Architectural diversity: bold-green-banner+timeline(Founder) /
  // compact-amber-banner(Growth) / sidebar-right-blue(PM)
  // Founder/Growth use accent-bar h2 instead of border-bottom for startup energy

  T('cv', 'Startup Founder', 'Startup', {
    columns: 1, accent: '#059669', headerStyle: 'banner',
    headerBg: 'linear-gradient(135deg,#059669 0%,#047857 100%)',
    typography: { heading: 'Poppins', body: 'Inter' },
    density: 'comfortable', style: 'banner', skillStyle: 'compact', languageStyle: 'pills', timeline: true, premium: true,
    accentDividers: true,
    customCss: `/*startup-growth-dynamic-modern-energetic*/.banner-text h1{font-size:42px;font-weight:800;letter-spacing:-.03em}.banner-text .headline{font-size:17px;font-weight:500;opacity:.9}h2{border-bottom:none;color:#059669;padding-bottom:0;font-family:'Poppins',sans-serif;font-weight:700}h2::after{content:'';display:block;width:36px;height:3px;background:#059669;border-radius:2px;margin-top:7px}.e-role{font-weight:700;color:#0F172A}.e-company{color:#059669;font-style:italic;font-weight:400}.e-date{color:#64748B;font-size:10px}.tl-dot{background:#059669;box-shadow:0 0 0 3px #A7F3D0}.tl-track{border-left-color:#A7F3D0}.pill{background:rgba(5,150,105,.1);color:#059669;font-weight:600}.e-bullets strong.metric{color:#047857;font-weight:800;font-size:11.5px}.cert-item{border-left-color:#059669;background:rgba(5,150,105,.03)}.cert-name{font-weight:800}.award-item{border-bottom-color:rgba(5,150,105,.15)}.award-name{font-weight:700;color:#0F172A}.award-meta{color:#059669;font-weight:500}`,
  }),

  T('resume', 'Startup Growth', 'Startup', {
    columns: 1, accent: '#D97706', headerStyle: 'banner',
    headerBg: 'linear-gradient(135deg,#D97706 0%,#B45309 100%)',
    typography: { heading: 'Poppins', body: 'Inter' },
    density: 'compact', style: 'banner', skillStyle: 'compact', languageStyle: 'pills', premium: true,
    timeline: true, accentDividers: true,
    photoShape: 'circle', photoPlace: 'header', customCss: `/*startup-growth-dynamic-modern-energetic*/.banner-text h1{font-size:44px;font-weight:800;letter-spacing:-.03em}.banner-text .headline{font-size:16px;font-weight:600;opacity:.92}h2{border-bottom:none;color:#B45309;padding-bottom:0;font-family:'Poppins',sans-serif;font-weight:700;font-size:11px;letter-spacing:.06em}h2::after{content:'';display:block;width:28px;height:3px;background:#D97706;border-radius:2px;margin-top:6px}.e-role{font-weight:700;color:#0F172A;font-size:14px}.e-company{color:#B45309;font-style:italic;font-weight:500}.e-date{color:#64748B;font-size:10px}.pill{background:rgba(217,119,6,.1);color:#B45309;font-weight:600;font-size:10px}.e-bullets strong.metric{color:#D97706;font-weight:800}.cert-item{border-left:3px solid #D97706;padding-left:12px;margin-bottom:10px;background:rgba(217,119,6,.03)}.cert-name{font-weight:800;color:#0F172A;font-size:12px}.cert-issuer{color:#B45309;font-size:10px}.cert-date{color:#64748B;font-size:9px}.award-item{border-bottom:1px solid #FED7AA;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#0F172A}.award-meta{color:#D97706;font-size:11px;font-weight:500}`,
  }),

  T('cv', 'Startup PM', 'Startup', {
    columns: 2, accent: '#0284C7', headerStyle: 'banner',
    headerBg: 'linear-gradient(135deg,#0284C7 0%,#0369A1 100%)',
    typography: { heading: 'Manrope', body: 'DM Sans' },
    density: 'comfortable', style: 'sidebar', sidebarColor: 'light', photoShape: 'none',
    sidebarSide: 'right', sidebarWidth: 260, skillStyle: 'compact', languageStyle: 'dots', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*startup-growth-dynamic-modern-energetic*/.sidebar{background:#F0F9FF;border-left:1px solid #BAE6FD}.sidebar-head h1{font-size:24px;letter-spacing:-.02em}.sidebar h2{color:#0284C7;border-color:#0284C7;opacity:1;font-size:10px;font-family:'Manrope',sans-serif;font-weight:700;letter-spacing:.1em}.sidebar .pill{background:rgba(2,132,199,.12);color:#0284C7;font-weight:600}.sidebar .dots{color:#0284C7}.sidebar .cert-item{border-left:3px solid #0284C7;padding-left:10px;margin-bottom:8px;background:rgba(2,132,199,.04)}.sidebar .cert-name{font-weight:700;font-size:10px}.sidebar .cert-issuer{color:#0284C7;font-size:9px}.banner-text h1{font-size:38px;font-weight:800;letter-spacing:-.02em}.banner-text .headline{font-size:16px;font-weight:600;opacity:.95}h2{color:#0284C7;border-color:#0284C7;font-family:'Manrope',sans-serif;font-weight:700;font-size:11px;letter-spacing:.06em}.e-role{font-weight:700;color:#0F172A;font-size:14px}.e-company{color:#0284C7;font-style:italic;font-weight:500}.e-date{color:#64748B;font-size:10px}.pill{background:rgba(2,132,199,.1);color:#0284C7;font-size:10px}.e-bullets strong.metric{color:#0284C7;font-weight:800}.award-item{border-bottom:1px solid #BAE6FD;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;color:#0F172A}.award-meta{color:#0284C7;font-size:11px;font-weight:500}`,
  }),

  // ─── Consultant ─────────────────────────────────────────────────────────────
  // Architectural diversity: sidebar-right+serif(Premium) /
  // minimal-gradient-h2(Brief) / charcoal-sidebar+name-in-sidebar(Strategic)

  T('cv', 'Consultant Premium', 'Consultant', {
    columns: 2, accent: '#1E3A8A', headerStyle: 'block',
    typography: { heading: 'DM Serif Display', body: 'DM Sans' },
    density: 'comfortable', style: 'twoColumn', sidebarColor: 'light', photoShape: 'none',
    sidebarSide: 'right', sidebarWidth: 260, skillStyle: 'compact', languageStyle: 'text', accentDividers: true, premium: true,
    timeline: true, customCss: `/*consultant-professional-structured-authoritative*/.header.block{border-bottom:3px solid #1E3A8A}.header.block h1{font-size:44px;font-weight:400;color:#0D1B2A;letter-spacing:-.02em}.header.block .headline{color:#1E3A8A;font-size:17px;font-weight:400;font-style:italic;font-family:'DM Serif Display',serif}.sidebar{background:#F7F8FB;border-left:1px solid #DBEAFE}.sidebar h2{color:#1E3A8A;border-color:#BFDBFE;opacity:1;font-size:9px;letter-spacing:.2em;font-family:'DM Sans',sans-serif;font-weight:700}.sidebar .cert-item{border-left:3px solid #1E3A8A;padding-left:10px;margin-bottom:8px;background:rgba(30,58,138,.03)}.sidebar .cert-name{font-size:10px;font-weight:700}.sidebar .cert-issuer{color:#1E3A8A;font-size:9px}h2{color:#0D1B2A;border-color:#1E3A8A;font-variant:small-caps;font-size:14px;text-transform:none;letter-spacing:.04em;font-weight:600;font-family:'DM Serif Display',serif}.e-role{font-weight:600;color:#0D1B2A;font-size:14px}.e-company{color:#1E3A8A;font-style:italic;font-weight:400}.e-date{color:#6B7280;font-style:italic;font-size:10px}.e-bullets strong.metric{color:#1E3A8A;font-weight:800}.award-item{border-bottom:1px solid #DBEAFE;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700}.award-meta{color:#1E3A8A}`,
  }),

  T('resume', 'Consultant Brief', 'Consultant', {
    columns: 1, accent: '#1E3A8A', headerStyle: 'minimal',
    typography: { heading: 'Manrope', body: 'Manrope' },
    density: 'comfortable', style: 'minimal', skillStyle: 'compact', languageStyle: 'text', premium: true,
    photoShape: 'circle', photoPlace: 'header', customCss: `/*consultant-professional-structured-authoritative*/.header.minimal h1{font-size:46px;font-weight:800;letter-spacing:-.04em;color:#0D1B2A}.header.minimal .headline{font-size:14px;color:#1E3A8A;font-weight:600;letter-spacing:.04em;text-transform:none}.header.minimal .contact-bar{color:#64748B}.header.minimal{border-bottom:none}h2{color:#1E3A8A;border-bottom:none;padding-bottom:0;font-size:10px;letter-spacing:.2em;font-family:'Manrope',sans-serif;font-weight:700}h2::after{content:'';display:block;height:1px;background:linear-gradient(to right,#1E3A8A 60%,transparent);margin-top:7px}.e-role{font-weight:700;font-size:14px;color:#0D1B2A}.e-company{color:#1E3A8A;font-style:italic;font-weight:400}.e-date{color:#64748B;font-style:italic;font-size:10px}.e-bullets strong.metric{color:#1E3A8A;font-weight:800}.cert-item{border-left:3px solid #1E3A8A;padding-left:12px;margin-bottom:10px;background:rgba(30,58,138,.02)}.cert-name{font-weight:700}.cert-issuer{color:#1E3A8A}.cert-date{color:#64748B}.award-item{border-bottom:1px solid #DBEAFE;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700}.award-meta{color:#1E3A8A}`,
  }),

  T('cv', 'Consulting Strategic', 'Consultant', {
    columns: 2, accent: '#0F172A', headerStyle: 'sidebar',
    typography: { heading: 'Inter', body: 'Inter' },
    density: 'comfortable', style: 'sidebar', sidebarColor: 'charcoal', photoShape: 'none',
    sidebarSide: 'left', sidebarWidth: 270, skillStyle: 'compact', languageStyle: 'text', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*consultant-professional-structured-authoritative*/.sidebar{background:#1E293B}.sidebar-head h1{font-size:24px;font-weight:700}.sidebar h2{color:rgba(148,163,184,.8);border-color:rgba(148,163,184,.2);letter-spacing:.18em}.sidebar .dots{color:#94A3B8;font-size:13px}.sidebar .cert-item{border-left:3px solid #94A3B8;padding-left:10px;margin-bottom:8px;background:rgba(148,163,184,.05)}.sidebar .cert-name{color:#E2E8F0;font-size:10px;font-weight:700}.sidebar .cert-issuer{color:#94A3B8;font-size:9px}h2{color:#0F172A;border-color:#0F172A;font-weight:700}.e-role{font-weight:700;font-size:14px;color:#0F172A}.e-company{color:#475569;font-style:italic;font-weight:400}.e-date{color:#6B7280;font-size:10px}.e-bullets strong.metric{color:#0F172A;font-weight:800}.award-item{border-bottom:1px solid #E2E8F0;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700}.award-meta{color:#475569}`,
  }),

  // ─── Academic ───────────────────────────────────────────────────────────────
  // Architectural diversity: serif-small-caps(Formal) /
  // display-serif+timeline(Modern) / europass-sidebar-left(European)

  T('cv', 'Academic Formal', 'Academic', {
    columns: 1, accent: '#1F2937', headerStyle: 'block',
    typography: { heading: 'Lora', body: 'Lora' },
    density: 'comfortable', style: 'classic', skillStyle: 'compact', languageStyle: 'text', premium: true,
    timeline: true, accentDividers: true,
    photoShape: 'circle', photoPlace: 'header', customCss: `/*academic-formal-traditional-structured*/.header.block h1{font-size:34px;font-weight:700;letter-spacing:-.01em;font-family:'Lora',serif}.header.block .headline{font-size:16px;font-style:italic;font-weight:400;color:#374151}.header.block{border-bottom:2px solid #1F2937;padding-bottom:12px}.header.block .contact-bar{color:#6B7280;font-family:'Lora',serif}h2{font-variant:small-caps;font-size:14px;text-transform:none;letter-spacing:.05em;color:#1F2937;border-color:#D1D5DB;font-weight:700}.e-role{font-style:italic;font-weight:600;color:#0F172A;font-size:14px}.e-company{color:#4B5563;font-style:italic;font-weight:400}.e-date{color:#6B7280;font-style:italic;font-size:10px}.summary-body{font-style:italic;line-height:1.8}.e-bullets strong.metric{color:#1F2937;font-weight:800}.cert-item{border-left:3px solid #1F2937;padding-left:12px;margin-bottom:10px;background:rgba(31,41,55,.02)}.cert-name{font-weight:700;font-style:italic}.cert-issuer{color:#4B5563;font-style:italic}.cert-date{color:#6B7280}.award-item{border-bottom:1px solid #E5E7EB;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;font-style:italic}.award-meta{color:#4B5563;font-style:italic}`,
  }),

  T('cv', 'Academic Modern', 'Academic', {
    columns: 1, accent: '#1F2937', headerStyle: 'minimal',
    typography: { heading: 'DM Serif Display', body: 'Inter' },
    density: 'spacious', style: 'timeline', skillStyle: 'compact', languageStyle: 'text', timeline: true, premium: true,
    accentDividers: true,
    photoShape: 'circle', photoPlace: 'header', customCss: `/*academic-formal-traditional-structured*/.header.minimal h1{font-family:'DM Serif Display',serif;font-style:italic;font-size:46px;font-weight:400}.header.minimal .headline{font-size:13px;color:#4B5563;text-transform:uppercase;letter-spacing:.1em;font-weight:400;font-family:'Inter',sans-serif}.header.minimal{border-bottom:1px solid #D1D5DB;padding-bottom:10px}h2{font-family:'DM Serif Display',serif;font-variant:small-caps;font-size:14px;text-transform:none;letter-spacing:.04em;border-color:#D1D5DB}.e-role{font-style:italic;font-weight:600;color:#0F172A;font-size:14px}.e-company{color:#4B5563;font-style:italic;font-weight:400}.e-date{color:#6B7280;font-style:italic;font-size:10px}.tl-dot{background:#1F2937;box-shadow:0 0 0 3px #D1D5DB}.tl-track{border-left-color:#D1D5DB}.e-bullets strong.metric{color:#1F2937;font-weight:800}.cert-item{border-left:3px solid #1F2937;padding-left:12px;margin-bottom:10px;background:rgba(31,41,55,.02)}.cert-name{font-weight:700;font-style:italic}.cert-issuer{color:#4B5563;font-style:italic}.cert-date{color:#6B7280}.award-item{border-bottom:1px solid #E5E7EB;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;font-style:italic}.award-meta{color:#4B5563;font-style:italic}`,
  }),

  T('cv', 'Academic European', 'Academic', {
    columns: 2, accent: '#1F2937', headerStyle: 'block',
    typography: { heading: 'Lora', body: 'Lora' },
    density: 'comfortable', style: 'twoColumn', sidebarColor: 'light',
    sidebarSide: 'left', sidebarWidth: 265, skillStyle: 'compact', languageStyle: 'bars',
    photoShape: 'square', photoPlace: 'sidebar', premium: true,
    timeline: true, accentDividers: true,
    customCss: `/*academic-formal-traditional-structured*/.sidebar{background:#F9FAFB;border-right:1px solid #E5E7EB}.sidebar h2{color:#1F2937;border-color:#D1D5DB;opacity:1;font-size:10px;font-variant:small-caps;text-transform:none;letter-spacing:.06em;font-family:'Lora',serif}.sidebar .bar{background:#E5E7EB}.sidebar .fill{background:#1F2937}.sidebar .cert-item{border-left:3px solid #1F2937;padding-left:10px;margin-bottom:8px;background:rgba(31,41,55,.02)}.sidebar .cert-name{font-size:10px;font-weight:700}.sidebar .cert-issuer{color:#4B5563;font-size:9px}.photo-square{border-radius:4px}h2{font-family:'Lora',serif;font-variant:small-caps;font-size:14px;text-transform:none;letter-spacing:.04em;border-color:#D1D5DB;color:#1F2937}.header.block h1{font-size:32px;font-family:'Lora',serif}.header.block .headline{font-style:italic;font-weight:400;color:#374151}.e-role{font-style:italic;font-weight:600;color:#0F172A;font-size:14px}.e-company{color:#4B5563;font-style:italic;font-weight:400}.e-date{color:#6B7280;font-style:italic;font-size:10px}.e-bullets strong.metric{color:#1F2937;font-weight:800}.award-item{border-bottom:1px solid #E5E7EB;padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700;font-style:italic}.award-meta{color:#4B5563;font-style:italic}`,
  }),

  // ─── Cover Letters ──────────────────────────────────────────────────────────

  T('coverLetter', 'Cover Letter Classic',    'Corporate',  { columns: 1, accent: '#1F2937', headerStyle: 'block',   typography: { heading: 'Inter',             body: 'Inter'  }, density: 'spacious', style: 'classic' }),
  T('coverLetter', 'Cover Letter Executive',  'Executive',  { columns: 1, accent: '#0D1B2A', headerStyle: 'block',   typography: { heading: 'Playfair Display',  body: 'Lora'   }, density: 'spacious', style: 'classic' }),
  T('coverLetter', 'Cover Letter Modern',     'Modern',     { columns: 1, accent: '#4F46E5', headerStyle: 'banner',  typography: { heading: 'DM Sans',           body: 'DM Sans'}, density: 'spacious', style: 'banner'  }),
  T('coverLetter', 'Cover Letter Creative',   'Creative',   { columns: 1, accent: '#7C3AED', headerStyle: 'banner',  typography: { heading: 'Poppins',           body: 'Inter'  }, density: 'spacious', style: 'banner'  }),
  T('coverLetter', 'Cover Letter Developer',  'Developer',  { columns: 1, accent: '#16A34A', headerStyle: 'minimal', typography: { heading: 'JetBrains Mono',    body: 'Inter'  }, density: 'comfortable', style: 'minimal' }),
  T('coverLetter', 'Cover Letter Consultant', 'Consultant', { columns: 1, accent: '#1E3A8A', headerStyle: 'block',   typography: { heading: 'DM Serif Display',  body: 'DM Sans'}, density: 'spacious', style: 'classic' }),
  T('coverLetter', 'Cover Letter Academic',   'Academic',   { columns: 1, accent: '#1F2937', headerStyle: 'block',   typography: { heading: 'Lora',              body: 'Lora'   }, density: 'spacious', style: 'classic' }),

  // ─── Portfolios ─────────────────────────────────────────────────────────────

  T('portfolio', 'Portfolio Executive',  'Executive', { columns: 1, accent: '#0D1B2A', headerStyle: 'block',   typography: { heading: 'Playfair Display',   body: 'Lora'           }, density: 'spacious',    style: 'classic'   }),
  T('portfolio', 'Portfolio Creative',   'Creative',  { columns: 2, accent: '#7C3AED', headerStyle: 'banner',  typography: { heading: 'Poppins',            body: 'Inter'          }, density: 'spacious',    style: 'banner'    }),
  T('portfolio', 'Portfolio Developer',  'Developer', { columns: 1, accent: '#16A34A', headerStyle: 'block',   typography: { heading: 'JetBrains Mono',    body: 'Inter'          }, density: 'comfortable', style: 'classic'   }),
  T('portfolio', 'Portfolio Designer',   'Designer',  { columns: 2, accent: '#DC2626', headerStyle: 'block',   typography: { heading: 'Cormorant Garamond', body: 'Plus Jakarta Sans' }, density: 'spacious', style: 'twoColumn' }),
  T('portfolio', 'Portfolio Minimal',    'Academic',  { columns: 1, accent: '#1F2937', headerStyle: 'minimal', typography: { heading: 'DM Sans',            body: 'DM Sans'        }, density: 'spacious',    style: 'minimal'   }),
];
