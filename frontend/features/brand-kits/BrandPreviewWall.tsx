'use client';

import React from 'react';
import { FileText, Mail, Briefcase, Layout, X, CheckCircle2 } from 'lucide-react';

// =============================================================================
//  Phase 42.5C — Brand Preview Wall
//
//  Modal that shows a 2×2 grid of mini-previews — CV, Resume, Cover Letter,
//  Portfolio — each rendered with the selected Brand Kit's colours / fonts /
//  logo. The user can preview before they commit to applying the kit.
//
//  These are *style mock-ups*, not the real template renderer (which lives
//  on the backend and produces a heavy HTML/PDF). They serve to confirm
//  "this is the visual identity the kit will impose".
// =============================================================================

interface BrandKitLite {
  id:    string;
  name:  string;
  logo?:           string | null;
  primaryColor?:   string | null;
  secondaryColor?: string | null;
  tokens?: any | null;
}

interface Props {
  kit:        BrandKitLite | null;
  onCancel:   () => void;
  onConfirm:  () => void | Promise<void>;
}

export const BrandPreviewWall: React.FC<Props> = ({ kit, onCancel, onConfirm }) => {
  if (!kit) return null;

  const primary   = kit.primaryColor   || kit.tokens?.colors?.primary   || '#7C3AED';
  const secondary = kit.secondaryColor || kit.tokens?.colors?.secondary || '#64748B';
  const accent    = kit.tokens?.colors?.accent     || '#06B6D4';
  const headingFont = kit.tokens?.typography?.heading?.family || 'Inter';
  const bodyFont    = kit.tokens?.typography?.body?.family    || 'Inter';

  const theme = { primary, secondary, accent, headingFont, bodyFont, logo: kit.logo };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <header className="px-5 py-3 border-b border-slate-200 flex items-center gap-3">
          <Layout className="w-5 h-5 text-purple-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Brand preview wall</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              How <strong>{kit.name}</strong> looks across CV, Resume, Cover Letter and Portfolio. Apply only after confirming.
            </p>
          </div>
          <button onClick={onCancel} className="ml-auto text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DocPreview Icon={FileText} title="CV" theme={theme}>
              <CvMock theme={theme} />
            </DocPreview>
            <DocPreview Icon={Briefcase} title="Resume" theme={theme}>
              <ResumeMock theme={theme} />
            </DocPreview>
            <DocPreview Icon={Mail} title="Cover Letter" theme={theme}>
              <CoverLetterMock theme={theme} />
            </DocPreview>
            <DocPreview Icon={Layout} title="Portfolio" theme={theme}>
              <PortfolioMock theme={theme} />
            </DocPreview>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-[11px]">
            <Swatch label="Primary"   value={primary} />
            <Swatch label="Secondary" value={secondary} />
            <Swatch label="Accent"    value={accent} />
            <Swatch label="Heading"   value={headingFont} mono />
            <Swatch label="Body"      value={bodyFont} mono />
            <Swatch label="Logo"      value={kit.logo ? 'present' : 'none'} mono />
          </div>
        </div>

        <footer className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-[11px] text-slate-500">
            Previews are approximate — the live renderer uses the full template.
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onCancel}
              className="h-8 px-3 text-xs font-semibold border border-slate-300 hover:bg-white rounded">Cancel</button>
            <button onClick={onConfirm}
              className="h-8 px-3 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Apply brand kit
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

// =============================================================================
//  Mini-mocks — small SVG/HTML approximations of each doctype
// =============================================================================

interface Theme {
  primary: string; secondary: string; accent: string;
  headingFont: string; bodyFont: string;
  logo?: string | null;
}

const DocPreview: React.FC<{ Icon: any; title: string; theme: Theme; children: React.ReactNode }> = ({ Icon, title, children, theme }) => (
  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
    <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
      <Icon className="w-3.5 h-3.5 text-slate-600" />
      <span className="text-xs font-bold text-slate-800">{title}</span>
    </div>
    <div className="aspect-[1/1.4] bg-white relative overflow-hidden">
      {children}
    </div>
  </div>
);

const Swatch: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => {
  const isColour = /^#[0-9a-f]{3,8}$/i.test(value);
  return (
    <div className="border border-slate-200 rounded p-1.5 flex items-center gap-2 bg-slate-50">
      {isColour
        ? <span className="w-5 h-5 rounded-sm border border-slate-300" style={{ background: value }} />
        : <span className="w-5 h-5 rounded-sm border border-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-500">Aa</span>}
      <div className="flex-1 min-w-0">
        <div className="text-[9px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className={`text-[11px] text-slate-800 truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
      </div>
    </div>
  );
};

// CV mock — banner header, three sections, accent dividers.
const CvMock: React.FC<{ theme: Theme }> = ({ theme }) => (
  <div className="absolute inset-0 p-3" style={{ fontFamily: theme.bodyFont, fontSize: 7 }}>
    <div className="flex items-center gap-1.5 mb-1.5">
      {theme.logo
        ? <img src={theme.logo} alt="" className="w-5 h-5 object-contain" />
        : <span className="w-5 h-5 rounded-sm" style={{ background: theme.primary }} />}
      <div className="flex-1">
        <div className="font-bold leading-tight" style={{ fontFamily: theme.headingFont, color: theme.primary, fontSize: 10 }}>Jane Engineer</div>
        <div className="text-[6px] text-slate-500">Senior Software Engineer · Berlin</div>
      </div>
    </div>
    <div className="h-px mb-1" style={{ background: theme.accent }} />
    <Section title="Summary" theme={theme}>
      <Line w={100} /><Line w={86} /><Line w={70} />
    </Section>
    <Section title="Experience" theme={theme}>
      <SubTitle theme={theme} text="Senior Engineer · TechCo · 2022–Present" />
      <Bullet w={90} /><Bullet w={82} /><Bullet w={88} />
      <SubTitle theme={theme} text="Engineer · StartupCo · 2019–2022" />
      <Bullet w={84} /><Bullet w={78} />
    </Section>
    <Section title="Skills" theme={theme}>
      <Chips theme={theme} items={['TypeScript', 'React', 'Node', 'AWS', 'PostgreSQL']} />
    </Section>
  </div>
);

// Resume mock — compact, single column, no accent dividers.
const ResumeMock: React.FC<{ theme: Theme }> = ({ theme }) => (
  <div className="absolute inset-0 p-3" style={{ fontFamily: theme.bodyFont, fontSize: 7 }}>
    <div className="font-bold leading-tight" style={{ fontFamily: theme.headingFont, color: theme.primary, fontSize: 11 }}>Jane Engineer</div>
    <div className="text-[6px] text-slate-500 mb-1.5">Senior Software Engineer · jane@example.com · linkedin.com/in/jane</div>
    <Section title="Experience" theme={theme}>
      <SubTitle theme={theme} text="Senior Engineer · TechCo · 2022–Present" />
      <Bullet w={92} /><Bullet w={88} /><Bullet w={84} /><Bullet w={80} />
      <SubTitle theme={theme} text="Engineer · StartupCo · 2019–2022" />
      <Bullet w={86} /><Bullet w={82} />
    </Section>
    <Section title="Education" theme={theme}>
      <SubTitle theme={theme} text="BSc Computer Science · TU Berlin · 2019" />
    </Section>
    <Section title="Skills" theme={theme}>
      <Chips theme={theme} items={['TypeScript', 'React', 'Node', 'AWS']} />
    </Section>
  </div>
);

// Cover Letter mock — paragraph-heavy.
const CoverLetterMock: React.FC<{ theme: Theme }> = ({ theme }) => (
  <div className="absolute inset-0 p-3" style={{ fontFamily: theme.bodyFont, fontSize: 7 }}>
    <div className="flex items-center justify-between mb-1.5">
      <div>
        <div className="font-bold" style={{ fontFamily: theme.headingFont, color: theme.primary, fontSize: 10 }}>Jane Engineer</div>
        <div className="text-[6px] text-slate-500">jane@example.com</div>
      </div>
      {theme.logo
        ? <img src={theme.logo} alt="" className="w-5 h-5 object-contain" />
        : <span className="w-5 h-5 rounded-sm" style={{ background: theme.primary }} />}
    </div>
    <div className="h-px mb-1" style={{ background: theme.accent }} />
    <div className="text-[7px] text-slate-700 mb-1">Dear Hiring Manager,</div>
    <Paragraph lines={5} />
    <Paragraph lines={4} />
    <Paragraph lines={3} />
    <div className="text-[7px] mt-1.5" style={{ color: theme.primary, fontFamily: theme.headingFont }}>Sincerely,</div>
    <div className="text-[7px] text-slate-700">Jane Engineer</div>
  </div>
);

// Portfolio mock — banner + tile grid.
const PortfolioMock: React.FC<{ theme: Theme }> = ({ theme }) => (
  <div className="absolute inset-0 p-3" style={{ fontFamily: theme.bodyFont, fontSize: 7 }}>
    <div className="rounded p-2 mb-1.5 text-center" style={{ background: theme.primary }}>
      <div className="font-bold text-white" style={{ fontFamily: theme.headingFont, fontSize: 11 }}>Jane Engineer</div>
      <div className="text-white/80 text-[6px]">Selected Work · 2019–2026</div>
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      {[1,2,3,4].map((i) => (
        <div key={i} className="border border-slate-200 rounded p-1.5">
          <div className="w-full h-8 rounded mb-1" style={{ background: i % 2 ? theme.accent : theme.secondary }} />
          <div className="font-semibold text-[7px]" style={{ color: theme.primary }}>Project {i}</div>
          <div className="text-[6px] text-slate-500">Lorem ipsum dolor sit amet.</div>
        </div>
      ))}
    </div>
  </div>
);

// =============================================================================
//  Atoms (line / bullet / chip / section etc.)
// =============================================================================
const Section: React.FC<{ title: string; theme: Theme; children: React.ReactNode }> = ({ title, theme, children }) => (
  <div className="mb-1.5">
    <div className="font-bold uppercase tracking-wide text-[6px] mb-0.5" style={{ color: theme.primary, fontFamily: theme.headingFont }}>{title}</div>
    {children}
  </div>
);

const SubTitle: React.FC<{ theme: Theme; text: string }> = ({ theme, text }) => (
  <div className="font-semibold text-[7px] text-slate-700 mt-1" style={{ fontFamily: theme.headingFont }}>{text}</div>
);

const Line: React.FC<{ w: number }> = ({ w }) => (
  <div className="h-[2px] bg-slate-200 rounded mt-0.5" style={{ width: `${w}%` }} />
);
const Bullet: React.FC<{ w: number }> = ({ w }) => (
  <div className="flex items-center gap-1 mt-0.5">
    <span className="w-[3px] h-[3px] rounded-full bg-slate-400 flex-shrink-0" />
    <div className="h-[2px] bg-slate-200 rounded" style={{ width: `${w}%` }} />
  </div>
);
const Paragraph: React.FC<{ lines: number }> = ({ lines }) => (
  <div className="mb-1">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="h-[2px] bg-slate-200 rounded mt-0.5" style={{ width: `${88 - (i * 4)}%` }} />
    ))}
  </div>
);
const Chips: React.FC<{ theme: Theme; items: string[] }> = ({ theme, items }) => (
  <div className="flex flex-wrap gap-0.5 mt-0.5">
    {items.map((s) => (
      <span key={s} className="text-[6px] px-1 py-0.5 rounded"
        style={{ background: `${theme.primary}1A`, color: theme.primary, fontFamily: theme.bodyFont }}>{s}</span>
    ))}
  </div>
);
