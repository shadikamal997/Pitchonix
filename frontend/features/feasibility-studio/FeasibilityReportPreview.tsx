'use client';

import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, FileText, Gauge, ShieldCheck } from 'lucide-react';
import type { FeasibilityAnalysis, FeasibilityProject, FeasibilitySectionCheck } from './types';

type TemplateStyle = {
  id: string;
  name: string;
  shell: string;
  header: string;
  panel: string;
  mutedPanel: string;
  accent: string;
  text: string;
  muted: string;
  badge: string;
  bar: string;
};

const templateStyles: Record<string, TemplateStyle> = {
  'investor-feasibility-report': {
    id: 'investor-feasibility-report',
    name: 'Investor Feasibility Report',
    shell: 'bg-[#F5F1E8] text-[#17130E] border-[#D8CBB5]',
    header: 'bg-[#17130E] text-[#F8F2E6]',
    panel: 'bg-white border-[#D8CBB5]',
    mutedPanel: 'bg-[#EEE4D2] border-[#D8CBB5]',
    accent: 'text-[#8B5E23]',
    text: 'text-[#17130E]',
    muted: 'text-[#6F6251]',
    badge: 'bg-[#8B5E23] text-white',
    bar: 'bg-[#8B5E23]',
  },
  'market-feasibility-study': {
    id: 'market-feasibility-study',
    name: 'Market Feasibility Study',
    shell: 'bg-[#EAF3EE] text-[#10251B] border-[#B7D1C3]',
    header: 'bg-[#163A2A] text-[#F5FFF9]',
    panel: 'bg-white border-[#B7D1C3]',
    mutedPanel: 'bg-[#DCEBE4] border-[#B7D1C3]',
    accent: 'text-[#23674A]',
    text: 'text-[#10251B]',
    muted: 'text-[#56695F]',
    badge: 'bg-[#23674A] text-white',
    bar: 'bg-[#23674A]',
  },
  'financial-viability-study': {
    id: 'financial-viability-study',
    name: 'Financial Viability Study',
    shell: 'bg-[#101820] text-[#F7FAF8] border-[#263746]',
    header: 'bg-[#172532] text-[#F7FAF8]',
    panel: 'bg-[#16222D] border-[#2E4456]',
    mutedPanel: 'bg-[#1D2D3A] border-[#2E4456]',
    accent: 'text-[#8EE0B5]',
    text: 'text-[#F7FAF8]',
    muted: 'text-[#B8C7C0]',
    badge: 'bg-[#8EE0B5] text-[#101820]',
    bar: 'bg-[#8EE0B5]',
  },
  'go-no-go-assessment': {
    id: 'go-no-go-assessment',
    name: 'Go / No-Go Assessment',
    shell: 'bg-[#F4F4F2] text-[#141414] border-[#D7D7D2]',
    header: 'bg-[#141414] text-white',
    panel: 'bg-white border-[#D7D7D2]',
    mutedPanel: 'bg-[#E9E9E4] border-[#D7D7D2]',
    accent: 'text-[#B6422D]',
    text: 'text-[#141414]',
    muted: 'text-[#66665F]',
    badge: 'bg-[#B6422D] text-white',
    bar: 'bg-[#B6422D]',
  },
};

function templateIdFor(project: FeasibilityProject) {
  return project.sourceMetadata?.templateId
    || project.pdfDocument?.metadata?.feasibilityTemplateId
    || project.pdfDocument?.outline?.templateId
    || 'investor-feasibility-report';
}

function statusLabel(section: FeasibilitySectionCheck) {
  if (section.status === 'present') return 'Ready';
  if (section.status === 'missing') return 'Missing';
  return 'Needs work';
}

function scoreRows(analysis: FeasibilityAnalysis) {
  return [
    ['Market', analysis.scores.marketScore],
    ['Financial', analysis.scores.financialScore],
    ['Technical', analysis.scores.technicalScore],
    ['Operations', analysis.scores.operationalScore],
    ['Risk', analysis.scores.riskScore],
  ];
}

function firstUsefulEvidence(section?: FeasibilitySectionCheck) {
  const text = section?.evidence?.find(Boolean) || section?.guidance || '';
  return text.length > 180 ? `${text.slice(0, 177).trim()}...` : text;
}

function sourceExcerpt(project: FeasibilityProject) {
  const page = project.pdfDocument?.pages?.find((item: any) => item.pageType === 'source_content');
  const text = String(page?.content?.text || page?.blocks?.map((block: any) => block.content).join(' ') || '');
  if (!text) return 'Original source content is preserved in the report package.';
  return text.length > 420 ? `${text.slice(0, 417).trim()}...` : text;
}

function ScorePill({ score, style }: { score: number; style: TemplateStyle }) {
  return (
    <div className={`inline-flex min-w-[112px] items-center justify-center rounded-full px-4 py-2 text-sm font-black ${style.badge}`}>
      {Math.round(score)}%
    </div>
  );
}

function ScoreBar({ label, score, style }: { label: string; score: number; style: TemplateStyle }) {
  return (
    <div>
      <div className={`mb-2 flex items-center justify-between text-xs font-bold ${style.muted}`}>
        <span>{label}</span>
        <span>{Math.round(score)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/10">
        <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.max(4, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

function SectionGrid({ sections, style }: { sections: FeasibilitySectionCheck[]; style: TemplateStyle }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {sections.slice(0, 8).map((section) => (
        <div key={section.key} className={`rounded-xl border p-4 ${style.panel}`}>
          <div className="flex items-start justify-between gap-3">
            <div className={`text-sm font-black ${style.text}`}>{section.title}</div>
            <div className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${section.status === 'present' ? 'bg-emerald-100 text-emerald-800' : section.status === 'missing' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
              {statusLabel(section)}
            </div>
          </div>
          <p className={`mt-3 text-xs leading-5 ${style.muted}`}>{section.guidance}</p>
        </div>
      ))}
    </div>
  );
}

function FinancialLayout({ project, analysis, style }: { project: FeasibilityProject; analysis: FeasibilityAnalysis; style: TemplateStyle }) {
  const rows = scoreRows(analysis);
  return (
    <div className={`rounded-[28px] border p-5 shadow-[0_24px_70px_rgba(0,0,0,0.18)] ${style.shell}`}>
      <div className={`rounded-[22px] p-6 ${style.header}`}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${style.badge}`}>{style.name}</div>
            <h2 className="text-4xl font-black tracking-[-0.04em]">{project.title}</h2>
            <p className="mt-4 text-sm leading-6 text-white/75">{analysis.businessObjective}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 text-center">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Overall</div>
            <div className="mt-2 text-5xl font-black">{Math.round(analysis.scores.overallScore)}%</div>
            <div className="mt-2 text-sm font-bold text-white/75">{analysis.recommendation}</div>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className={`rounded-2xl border p-5 ${style.panel}`}>
          <div className={`mb-5 flex items-center gap-2 text-sm font-black ${style.accent}`}><Gauge className="h-4 w-4" /> Viability drivers</div>
          <div className="space-y-4">
            {rows.map(([label, score]) => <ScoreBar key={label as string} label={label as string} score={score as number} style={style} />)}
          </div>
        </div>
        <div className={`rounded-2xl border p-5 ${style.mutedPanel}`}>
          <div className={`mb-4 text-sm font-black ${style.accent}`}>Financial decision memo</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {rows.slice(0, 3).map(([label, score]) => (
              <div key={label as string} className={`rounded-xl border p-4 ${style.panel}`}>
                <div className={`text-xs font-bold uppercase ${style.muted}`}>{label as string}</div>
                <div className={`mt-2 text-3xl font-black ${style.text}`}>{score as number}%</div>
              </div>
            ))}
          </div>
          <p className={`mt-5 text-sm leading-6 ${style.muted}`}>{sourceExcerpt(project)}</p>
        </div>
      </div>
      <div className="mt-5">
        <SectionGrid sections={analysis.sections} style={style} />
      </div>
    </div>
  );
}

function InvestorLayout({ project, analysis, style }: { project: FeasibilityProject; analysis: FeasibilityAnalysis; style: TemplateStyle }) {
  const keySections = analysis.sections.filter((section) => section.status !== 'present').slice(0, 4);
  return (
    <div className={`rounded-[28px] border p-6 shadow-[0_24px_70px_rgba(70,50,20,0.16)] ${style.shell}`}>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className={`rounded-[24px] p-7 ${style.header}`}>
          <div className={`mb-5 inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${style.badge}`}>Board feasibility pack</div>
          <h2 className="text-5xl font-black tracking-[-0.05em]">{project.title}</h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/75">{analysis.businessObjective}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ScorePill score={analysis.scores.overallScore} style={style} />
            <div className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/75">{analysis.recommendation}</div>
          </div>
        </div>
        <div className={`rounded-[24px] border p-6 ${style.panel}`}>
          <div className={`text-sm font-black ${style.accent}`}>Investment readiness</div>
          <div className="mt-5 space-y-4">
            {scoreRows(analysis).map(([label, score]) => <ScoreBar key={label as string} label={label as string} score={score as number} style={style} />)}
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {keySections.map((section) => (
          <div key={section.key} className={`rounded-2xl border p-5 ${style.panel}`}>
            <AlertTriangle className={`h-5 w-5 ${style.accent}`} />
            <div className={`mt-4 text-sm font-black ${style.text}`}>{section.title}</div>
            <p className={`mt-2 text-xs leading-5 ${style.muted}`}>{section.guidance}</p>
          </div>
        ))}
      </div>
      <div className={`mt-6 rounded-2xl border p-5 ${style.mutedPanel}`}>
        <div className={`text-sm font-black ${style.accent}`}>Original source preserved</div>
        <p className={`mt-3 text-sm leading-6 ${style.muted}`}>{sourceExcerpt(project)}</p>
      </div>
    </div>
  );
}

function MarketLayout({ project, analysis, style }: { project: FeasibilityProject; analysis: FeasibilityAnalysis; style: TemplateStyle }) {
  const market = analysis.sections.find((section) => section.key === 'market_analysis');
  const competition = analysis.sections.find((section) => section.key === 'competitive_analysis');
  return (
    <div className={`rounded-[28px] border p-5 shadow-[0_24px_70px_rgba(30,80,50,0.14)] ${style.shell}`}>
      <div className={`rounded-[24px] p-6 ${style.header}`}>
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${style.badge}`}>{style.name}</div>
            <h2 className="text-4xl font-black tracking-[-0.04em]">{project.title}</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/75">{analysis.businessObjective}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Market score</div>
            <div className="mt-2 text-5xl font-black">{analysis.scores.marketScore}%</div>
            <div className="mt-2 text-sm text-white/70">{analysis.recommendation}</div>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        {[market, competition].filter(Boolean).map((section) => (
          <div key={section!.key} className={`rounded-2xl border p-5 ${style.panel}`}>
            <div className={`text-sm font-black ${style.accent}`}>{section!.title}</div>
            <p className={`mt-4 text-sm leading-6 ${style.muted}`}>{firstUsefulEvidence(section)}</p>
            <div className="mt-5">
              <ScoreBar label="Confidence" score={section!.confidence} style={style} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {scoreRows(analysis).map(([label, score]) => (
          <div key={label as string} className={`rounded-xl border p-4 ${style.panel}`}>
            <div className={`text-xs font-bold uppercase ${style.muted}`}>{label as string}</div>
            <div className={`mt-2 text-2xl font-black ${style.text}`}>{score as number}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DecisionLayout({ project, analysis, style }: { project: FeasibilityProject; analysis: FeasibilityAnalysis; style: TemplateStyle }) {
  const blockers = analysis.sections.filter((section) => section.status === 'missing').slice(0, 5);
  return (
    <div className={`rounded-[28px] border p-5 shadow-[0_24px_70px_rgba(0,0,0,0.12)] ${style.shell}`}>
      <div className={`rounded-[24px] p-6 ${style.header}`}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${style.badge}`}>Decision gate</div>
            <h2 className="text-4xl font-black tracking-[-0.04em]">{project.title}</h2>
            <p className="mt-4 text-sm leading-6 text-white/75">{analysis.businessObjective}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Recommendation</div>
            <div className="mt-2 text-2xl font-black">{analysis.recommendation}</div>
            <div className="mt-2 text-sm text-white/70">{analysis.scores.overallScore}% confidence</div>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className={`rounded-2xl border p-5 ${style.panel}`}>
          <div className={`mb-5 text-sm font-black ${style.accent}`}>Go / no-go checklist</div>
          <div className="space-y-3">
            {analysis.sections.slice(0, 7).map((section) => (
              <div key={section.key} className="flex items-start gap-3">
                {section.status === 'present' ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-[#B6422D]" />}
                <div>
                  <div className={`text-sm font-bold ${style.text}`}>{section.title}</div>
                  <div className={`text-xs ${style.muted}`}>{statusLabel(section)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={`rounded-2xl border p-5 ${style.mutedPanel}`}>
          <div className={`text-sm font-black ${style.accent}`}>Blockers to resolve</div>
          <div className="mt-4 space-y-3">
            {(blockers.length ? blockers : analysis.sections.slice(0, 3)).map((section) => (
              <div key={section.key} className={`rounded-xl border p-4 ${style.panel}`}>
                <div className={`text-sm font-black ${style.text}`}>{section.title}</div>
                <p className={`mt-2 text-xs leading-5 ${style.muted}`}>{section.guidance}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeasibilityReportPreview({ project }: { project: FeasibilityProject }) {
  const analysis = project.analysis;
  if (!analysis) return null;

  const templateId = templateIdFor(project);
  const style = templateStyles[templateId] || templateStyles['investor-feasibility-report'];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7563]">
            <FileText className="h-4 w-4" />
            Feasibility Template Preview
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.025em]">{style.name}</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D8D3C8] bg-white px-4 py-2 text-xs font-bold text-[#263F34]">
          Template owned by Feasibility Studio
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
      {templateId === 'financial-viability-study' ? <FinancialLayout project={project} analysis={analysis} style={style} /> : null}
      {templateId === 'market-feasibility-study' ? <MarketLayout project={project} analysis={analysis} style={style} /> : null}
      {templateId === 'go-no-go-assessment' ? <DecisionLayout project={project} analysis={analysis} style={style} /> : null}
      {templateId === 'investor-feasibility-report' || !templateStyles[templateId] ? <InvestorLayout project={project} analysis={analysis} style={style} /> : null}
    </section>
  );
}
