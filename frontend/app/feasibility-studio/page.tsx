'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CheckCircle2,
  FileCheck2,
  FileText,
  Gauge,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  Wand2,
} from 'lucide-react';
import {
  analyzeFeasibility,
  createFeasibilityProject,
  importFeasibilityFile,
  listFeasibilityProjects,
  listFeasibilityTemplates,
} from '@/features/feasibility-studio/api';
import type { FeasibilityAnalysis, FeasibilityProject, FeasibilityTemplate } from '@/features/feasibility-studio/types';
import { BrandKitPicker, BrandKitBadge } from '@/features/brand-kits/BrandKitPicker';

const studyTypes = [
  ['auto', 'Auto-detect'],
  ['investor_feasibility', 'Investor Feasibility'],
  ['market_feasibility', 'Market Feasibility'],
  ['financial_viability', 'Financial Viability'],
  ['technical_feasibility', 'Technical Feasibility'],
  ['operational_feasibility', 'Operational Feasibility'],
  ['risk_go_no_go', 'Go / No-Go'],
];

function scoreTone(score?: number | null) {
  if ((score || 0) >= 80) return 'bg-[#DDE8E1] text-[#263F34]';
  if ((score || 0) >= 65) return 'bg-[#FFF4D8] text-[#8A5A00]';
  return 'bg-[#F7E3E3] text-[#8A2B2B]';
}

export default function FeasibilityStudioPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<FeasibilityProject[]>([]);
  const [templates, setTemplates] = useState<FeasibilityTemplate[]>([]);
  const [rawContent, setRawContent] = useState('');
  const [title, setTitle] = useState('');
  const [industry, setIndustry] = useState('');
  const [studyType, setStudyType] = useState('auto');
  const [templateId, setTemplateId] = useState('investor-feasibility-report');
  const [analysis, setAnalysis] = useState<FeasibilityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [brandKitId, setBrandKitId] = useState<string | null>(null);
  const [brandKit, setBrandKit] = useState<any | null>(null);

  const recent = useMemo(() => projects.slice(0, 5), [projects]);
  const wordCount = useMemo(() => rawContent.trim().split(/\s+/).filter(Boolean).length, [rawContent]);

  useEffect(() => {
    let active = true;
    Promise.all([listFeasibilityProjects(), listFeasibilityTemplates()])
      .then(([projectRows, templateRows]) => {
        if (!active) return;
        setProjects(projectRows);
        setTemplates(templateRows);
        if (templateRows[0]?.id) setTemplateId(templateRows[0].id);
      })
      .catch((err) => active && setError(err?.message || 'Could not load Feasibility Studio.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setBusy('import');
    setError('');
    try {
      if (/\.(txt|md|html?)$/i.test(file.name)) {
        const text = await file.text();
        setRawContent(text);
      } else {
        const result = await importFeasibilityFile(file);
        setRawContent((result.html || result.text || '').trim());
      }
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
      setAnalysis(null);
    } catch (err: any) {
      setError(err?.message || 'Could not import this file.');
    } finally {
      setBusy('');
    }
  };

  const handleAnalyze = async () => {
    if (rawContent.trim().length < 10) {
      setError('Add or import feasibility-related content first.');
      return;
    }
    setBusy('analyze');
    setError('');
    try {
      const result = await analyzeFeasibility({ rawContent, title, industry, studyType });
      setAnalysis(result);
      if (!title) setTitle(result.projectName);
      const matchingTemplate = templates.find((template) => template.studyTypes.includes(result.studyType));
      if (matchingTemplate) setTemplateId(matchingTemplate.id);
    } catch (err: any) {
      setError(err?.message || 'Feasibility analysis failed.');
    } finally {
      setBusy('');
    }
  };

  const handleCreate = async () => {
    setBusy('create');
    setError('');
    try {
      const project = await createFeasibilityProject({
        rawContent,
        title: title || analysis?.projectName,
        industry: industry || analysis?.industry,
        studyType: studyType === 'auto' ? analysis?.studyType : studyType,
        templateId,
        brandKitId,
      });
      router.push(`/feasibility-studio/editor/${project.id}`);
    } catch (err: any) {
      setError(err?.message || 'Could not create feasibility project.');
    } finally {
      setBusy('');
    }
  };

  return (
    <main className="min-h-full bg-[#EDEBE6] text-[#111111]">
      <section className="bg-[#263F34] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-[#DDE8E1]">
              <Briefcase className="h-4 w-4" />
              Feasibility Studio
            </div>
            <h1 className="max-w-3xl text-5xl font-bold tracking-[-0.035em] md:text-6xl">
              Turn existing business material into decision-ready feasibility studies.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#DDE8E1]">
              Import a feasibility study, business plan, memo, notes, or market research. Pitchonix analyzes gaps, scores readiness, preserves the source, and builds a premium editable report.
            </p>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                ['Content preserved', ShieldCheck],
                ['Risk and finance checks', Gauge],
                ['Feasibility templates', FileCheck2],
              ].map(([label, Icon]) => (
                <div key={label as string} className="rounded-lg border border-white/15 bg-white/10 p-4">
                  <Icon className="h-5 w-5 text-[#DDE8E1]" />
                  <div className="mt-3 text-sm font-semibold">{label as string}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/15 bg-white p-4 text-[#111111] shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDrop={(event) => {
                event.preventDefault();
                handleFile(event.dataTransfer.files?.[0]);
              }}
              onDragOver={(event) => event.preventDefault()}
              className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#D8D3C8] bg-[#F7F6F2] px-6 text-center transition hover:border-[#4F7563] hover:bg-[#EEF5F1]"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md,.html,.htm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/html"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              {busy === 'import' ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-[#4F7563]" />
                  <h2 className="mt-5 text-2xl font-bold">Importing document</h2>
                </>
              ) : (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#263F34] text-white">
                    <UploadCloud className="h-8 w-8" />
                  </div>
                  <h2 className="mt-6 text-3xl font-bold tracking-[-0.02em]">Import feasibility material</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[#6B6B6B]">
                    PDF, DOCX, TXT, MD, HTML, investor memos, business plans, market research, or project notes.
                  </p>
                </>
              )}
            </button>
            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7563]">Create New</div>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em]">Analyze, validate, then apply a feasibility template</h2>
              </div>
              <BrandKitPicker mode="select" value={brandKitId} onSelect={(id, kit) => { setBrandKitId(id); setBrandKit(kit); }} />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Project title" className="rounded-xl border border-[#D8D3C8] px-3 py-2 text-sm outline-none focus:border-[#4F7563]" />
              <input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Industry" className="rounded-xl border border-[#D8D3C8] px-3 py-2 text-sm outline-none focus:border-[#4F7563]" />
              <select value={studyType} onChange={(event) => setStudyType(event.target.value)} className="rounded-xl border border-[#D8D3C8] px-3 py-2 text-sm outline-none focus:border-[#4F7563]">
                {studyTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            <textarea
              value={rawContent}
              onChange={(event) => { setRawContent(event.target.value); setAnalysis(null); }}
              placeholder="Paste an existing feasibility study, business plan, investor memo, project notes, or market research here..."
              className="mt-4 min-h-[320px] w-full resize-y rounded-2xl border border-[#D8D3C8] bg-[#FBFAF7] p-4 text-sm leading-6 outline-none focus:border-[#4F7563]"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[#6B6B6B]">{wordCount} words {brandKitId && brandKit ? <span>· <BrandKitBadge kitId={brandKitId} /></span> : null}</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleAnalyze} disabled={busy !== '' || rawContent.trim().length < 10} className="inline-flex items-center gap-2 rounded-full border border-[#A8B9AE] px-4 py-2 text-sm font-semibold text-[#263F34] hover:bg-[#EEF5F1] disabled:opacity-50">
                  {busy === 'analyze' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                  Analyze
                </button>
                <button onClick={handleCreate} disabled={busy !== '' || rawContent.trim().length < 10} className="inline-flex items-center gap-2 rounded-full bg-[#263F34] px-5 py-2 text-sm font-semibold text-white hover:bg-[#355846] disabled:opacity-50">
                  {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Create feasibility study
                </button>
              </div>
            </div>
          </div>

          {analysis && (
            <div className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7563]">Feasibility Scorecard</div>
                  <h2 className="mt-2 text-2xl font-bold">{analysis.projectName}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6B6B6B]">{analysis.businessObjective}</p>
                </div>
                <div className={`rounded-2xl px-5 py-4 text-center ${scoreTone(analysis.scores.overallScore)}`}>
                  <div className="text-3xl font-black">{analysis.scores.overallScore}%</div>
                  <div className="text-xs font-bold uppercase tracking-[0.14em]">{analysis.recommendation}</div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-5">
                {[
                  ['Market', analysis.scores.marketScore],
                  ['Financial', analysis.scores.financialScore],
                  ['Technical', analysis.scores.technicalScore],
                  ['Operational', analysis.scores.operationalScore],
                  ['Risk', analysis.scores.riskScore],
                ].map(([label, score]) => (
                  <div key={label as string} className="rounded-xl border border-[#E3E1DA] bg-[#FBFAF7] p-4">
                    <div className="text-xs font-semibold text-[#6B6B6B]">{label as string}</div>
                    <div className="mt-2 text-2xl font-black">{score as number}%</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {analysis.sections.map((section) => (
                  <div key={section.key} className="rounded-xl border border-[#E3E1DA] bg-[#FBFAF7] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold">{section.title}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${section.status === 'present' ? 'bg-[#DDE8E1] text-[#263F34]' : section.status === 'missing' ? 'bg-[#F7E3E3] text-[#8A2B2B]' : 'bg-[#FFF4D8] text-[#8A5A00]'}`}>
                        {section.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#6B6B6B]">{section.guidance}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7563]">
              <FileText className="h-4 w-4" />
              Feasibility Templates
            </div>
            <div className="mt-4 space-y-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setTemplateId(template.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${templateId === template.id ? 'border-[#4F7563] bg-[#EEF5F1]' : 'border-[#E3E1DA] bg-[#FBFAF7] hover:border-[#A8B9AE]'}`}
                >
                  <div className="font-bold">{template.name}</div>
                  <p className="mt-1 text-xs leading-5 text-[#6B6B6B]">{template.description}</p>
                  <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#4F7563]">
                    Own layout · Own scorecard · PDF export handoff
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7563]">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Recent
                </div>
                <h2 className="mt-2 text-lg font-bold">Feasibility projects</h2>
              </div>
              <Link href="/feasibility-studio/projects" className="text-xs font-semibold text-[#4F7563] hover:underline">View all</Link>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-[#F1F0EC]" />)}
              </div>
            ) : recent.length === 0 ? (
              <div className="rounded-xl border border-[#E3E1DA] bg-[#F7F6F2] p-4 text-sm text-[#6B6B6B]">
                No feasibility projects yet.
              </div>
            ) : (
              <div className="divide-y divide-[#E3E1DA]">
                {recent.map((project) => (
                  <Link key={project.id} href={`/feasibility-studio/editor/${project.id}`} className="block py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{project.title}</div>
                        <div className="mt-1 text-xs text-[#6B6B6B]">{project.studyType.replace(/_/g, ' ')}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${scoreTone(project.score)}`}>{Math.round(project.score || 0)}%</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {analysis?.warnings?.length ? (
            <div className="rounded-2xl border border-[#F2D29B] bg-[#FFF8E8] p-5">
              <div className="flex items-center gap-2 font-bold text-[#8A5A00]">
                <AlertTriangle className="h-4 w-4" />
                Validation warnings
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-5 text-[#6B5A30]">
                {analysis.warnings.slice(0, 6).map((warning) => <li key={warning}>• {warning}</li>)}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#DDE8E1] bg-[#EEF5F1] p-5 text-[#263F34]">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="mt-3 font-bold">Enhancement platform, not random generation</h3>
              <p className="mt-2 text-sm leading-6">Feasibility Studio preserves source content and adds structure, scorecards, warnings, and report templates around it.</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
