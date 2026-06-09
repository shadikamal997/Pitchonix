'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Gauge,
  LayoutTemplate,
  Loader2,
  Sparkles,
  Table2,
  Wand2,
} from 'lucide-react';
import { analyzeExcelScript, generateExcelFromScript, listExcelTemplates } from '@/features/excel-studio/api';
import type { ExcelScriptAnalysis, ExcelTemplate } from '@/features/excel-studio/types';

type Step = 'script' | 'review' | 'template' | 'generate';

const exampleScript = `Title: Startup Metrics Command Center

Create a SaaS founder workbook for investor and management reporting.

Metrics:
MRR: $15000
ARR: $180000
Customers: 5000
Growth Rate: 18%
Burn: $42000
Runway: 14

Sheets/tabs:
Executive Summary
Source Data
Assumptions
Dashboard
Forecast
Audit

Include monthly forecast, KPI cards, assumptions, data quality audit, and dashboard-ready structure.`;

export default function ExcelSmartBuilderPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('script');
  const [script, setScript] = useState(exampleScript);
  const [title, setTitle] = useState('');
  const [templates, setTemplates] = useState<ExcelTemplate[]>([]);
  const [templateId, setTemplateId] = useState('executive-emerald');
  const [analysis, setAnalysis] = useState<ExcelScriptAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listExcelTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) || templates[0],
    [templates, templateId],
  );

  const handleAnalyze = async () => {
    if (!script.trim()) {
      setError('Add a workbook script first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await analyzeExcelScript(script);
      setAnalysis(result);
      setTitle(result.suggestedTitle);
      setTemplateId(result.recommendedTemplateId);
      setStep('review');
    } catch (err: any) {
      setError(err?.message || 'Could not analyze workbook script.');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!analysis) return;
    setBusy(true);
    setError('');
    try {
      const project = await generateExcelFromScript({
        script,
        title: title || analysis.suggestedTitle,
        templateId,
      });
      router.push(`/excel-studio/editor/${project.id}`);
    } catch (err: any) {
      setError(err?.message || 'Could not generate workbook.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-full bg-[#EDEBE6] text-[#111111]">
      <header className="sticky top-0 z-30 border-b border-[#E3E1DA] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/excel-studio" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F6F2] text-[#355846] hover:bg-[#EEF5F1]">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-lg font-bold">
                <Sparkles className="h-5 w-5 text-[#4F7563]" />
                Smart Excel Builder
              </h1>
              <p className="text-xs text-[#6B6B6B]">Script → Analysis → Template → Workbook</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {[
              ['script', 'Script'],
              ['review', 'Review'],
              ['template', 'Template'],
              ['generate', 'Generate'],
            ].map(([key, label], index) => {
              const active = step === key;
              const done = ['script', 'review', 'template', 'generate'].indexOf(step) > index;
              return (
                <div key={key} className={`rounded-full px-3 py-1.5 text-xs font-bold ${active ? 'bg-[#111114] text-white' : done ? 'bg-[#EEF5F1] text-[#355846]' : 'bg-[#F7F6F2] text-[#9A9A9A]'}`}>
                  {done ? '✓ ' : ''}{label}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
          {step === 'script' && (
            <>
              <div className="mb-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7563]">Workbook Script</div>
                <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em]">Describe the Excel workbook you want</h2>
                <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
                  Include metrics, sheets, assumptions, dashboard needs, formulas, and reporting purpose. Pitchonix will create a real XLSX project from the script.
                </p>
              </div>
              <textarea
                value={script}
                onChange={(event) => setScript(event.target.value)}
                className="min-h-[440px] w-full resize-y rounded-2xl border border-[#D8D3C8] bg-[#F7F6F2] p-5 font-mono text-sm leading-7 outline-none focus:border-[#4F7563] focus:bg-white"
              />
              <div className="mt-5 flex justify-end">
                <button onClick={handleAnalyze} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[#111114] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Analyze script
                </button>
              </div>
            </>
          )}

          {step !== 'script' && analysis && (
            <>
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7563]">{analysis.workbookType}</div>
                  <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em]">{analysis.suggestedTitle}</h2>
                  <p className="mt-2 text-sm text-[#6B6B6B]">{analysis.confidence}% planning confidence</p>
                </div>
                <button onClick={() => setStep('script')} className="rounded-full border border-[#D8D3C8] px-4 py-2 text-sm font-semibold text-[#355846] hover:bg-[#EEF5F1]">
                  Edit script
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Stat icon={Table2} label="Sheets planned" value={analysis.detectedSheets.length} />
                <Stat icon={Gauge} label="Metrics found" value={analysis.detectedMetrics.length} />
                <Stat icon={LayoutTemplate} label="Template" value={selectedTemplate?.name || templateId} />
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <Panel title="Generated Sheets">
                  {analysis.detectedSheets.map((sheet) => <Pill key={sheet}>{sheet}</Pill>)}
                </Panel>
                <Panel title="Detected Metrics">
                  {(analysis.detectedMetrics.length ? analysis.detectedMetrics : [{ label: 'Starter metrics', value: 'Auto-generated' }]).map((metric) => (
                    <div key={`${metric.label}-${metric.value}`} className="flex justify-between rounded-lg bg-[#F7F6F2] px-3 py-2 text-sm">
                      <span className="font-semibold">{metric.label}</span>
                      <span className="text-[#355846]">{metric.value}</span>
                    </div>
                  ))}
                </Panel>
                <Panel title="Generation Plan">
                  {analysis.generationPlan.map((item) => (
                    <div key={item} className="flex gap-2 text-sm leading-6">
                      <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-[#4F7563]" />
                      {item}
                    </div>
                  ))}
                </Panel>
                <Panel title="Review Notes">
                  {(analysis.risks.length ? analysis.risks : ['No major script gaps detected.']).map((risk) => (
                    <div key={risk} className="flex gap-2 text-sm leading-6">
                      <AlertCircle className="mt-1 h-4 w-4 flex-shrink-0 text-amber-600" />
                      {risk}
                    </div>
                  ))}
                </Panel>
              </div>

              <div className="mt-6 rounded-2xl border border-[#E3E1DA] bg-[#F7F6F2] p-4">
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B6B6B]">Workbook title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-[#D8D3C8] bg-white px-4 text-sm font-semibold outline-none focus:border-[#4F7563]"
                />
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                {step === 'review' && (
                  <button onClick={() => setStep('template')} className="inline-flex items-center gap-2 rounded-full bg-[#111114] px-5 py-3 text-sm font-semibold text-white">
                    Choose template
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {step === 'template' && (
                  <button onClick={() => setStep('generate')} className="inline-flex items-center gap-2 rounded-full bg-[#111114] px-5 py-3 text-sm font-semibold text-white">
                    Review generation
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {step === 'generate' && (
                  <button onClick={handleGenerate} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[#111114] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                    Create workbook
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <LayoutTemplate className="h-5 w-5 text-[#4F7563]" />
              Template system
            </h3>
            <div className="mt-4 space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setTemplateId(template.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${templateId === template.id ? 'border-[#4F7563] bg-[#EEF5F1]' : 'border-[#E3E1DA] hover:bg-[#F7F6F2]'}`}
                >
                  <div className="text-sm font-bold">{template.name}</div>
                  <div className="mt-1 text-xs text-[#6B6B6B]">{template.category}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E3E1DA] bg-[#263F34] p-5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <Sparkles className="h-6 w-6 text-[#DDE8E1]" />
            <h3 className="mt-4 text-lg font-bold">What gets created</h3>
            <p className="mt-2 text-sm leading-6 text-[#DDE8E1]">
              A real XLSX workbook with source data, assumptions, dashboard, audit, script, and template-system sheets. It opens in the Excel Studio editor immediately.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#E3E1DA] bg-[#F7F6F2] p-4">
      <Icon className="h-5 w-5 text-[#4F7563]" />
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold text-[#6B6B6B]">{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E3E1DA] bg-white p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-[#6B6B6B]">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="mr-2 inline-flex rounded-full bg-[#EEF5F1] px-3 py-1 text-xs font-bold text-[#355846]">
      {children}
    </span>
  );
}
