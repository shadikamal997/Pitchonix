'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Copy,
  ExternalLink,
  FileText,
  Gauge,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  archiveFeasibilityProject,
  duplicateFeasibilityProject,
  enhanceFeasibilityProject,
  getFeasibilityOutputs,
  getFeasibilityProject,
} from '@/features/feasibility-studio/api';
import { FeasibilityReportPreview } from '@/features/feasibility-studio/FeasibilityReportPreview';
import type { FeasibilityProject, FeasibilitySectionCheck } from '@/features/feasibility-studio/types';

function scoreTone(score?: number | null) {
  if ((score || 0) >= 80) return 'bg-[#DDE8E1] text-[#263F34]';
  if ((score || 0) >= 65) return 'bg-[#FFF4D8] text-[#8A5A00]';
  return 'bg-[#F7E3E3] text-[#8A2B2B]';
}

function statusTone(status: string) {
  if (status === 'present') return 'bg-[#DDE8E1] text-[#263F34]';
  if (status === 'missing') return 'bg-[#F7E3E3] text-[#8A2B2B]';
  return 'bg-[#FFF4D8] text-[#8A5A00]';
}

export default function FeasibilityEditorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<FeasibilityProject | null>(null);
  const [outputs, setOutputs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const analysis = project?.analysis;
  const sections = useMemo<FeasibilitySectionCheck[]>(() => analysis?.sections || [], [analysis]);
  const warnings = analysis?.warnings || [];
  const recommendations = analysis?.recommendations || [];
  const pdfHref = project?.pdfDocumentId ? `/pdf-studio/editor/${project.pdfDocumentId}` : null;

  const refresh = async () => {
    const [projectData, outputData] = await Promise.all([
      getFeasibilityProject(params.id),
      getFeasibilityOutputs(params.id),
    ]);
    setProject(projectData);
    setOutputs(outputData);
  };

  useEffect(() => {
    let active = true;
    refresh()
      .catch((err) => active && setError(err?.message || 'Could not load feasibility project.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [params.id]);

  const run = async (label: string, fn: () => Promise<any>) => {
    setBusy(label);
    setError('');
    try {
      const result = await fn();
      if (label === 'duplicate') {
        router.push(`/feasibility-studio/editor/${result.id}`);
        return;
      }
      if (label === 'archive') {
        router.push('/feasibility-studio/projects');
        return;
      }
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Action failed.');
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-full items-center justify-center bg-[#EDEBE6] text-[#6B6B6B]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Opening Feasibility Studio
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-full bg-[#EDEBE6] p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#E3E1DA] bg-white p-8">
          <h1 className="text-xl font-bold">Feasibility project not found</h1>
          <Link href="/feasibility-studio" className="mt-4 inline-flex text-sm font-semibold text-[#4F7563]">Back to Feasibility Studio</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-[#EDEBE6] text-[#111111]">
      <div className="border-b border-[#E3E1DA] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <Link href="/feasibility-studio" className="inline-flex items-center gap-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Feasibility Studio
            </Link>
            <h1 className="mt-2 truncate text-2xl font-bold tracking-[-0.025em]">{project.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6B6B6B]">
              <span>{project.studyType.replace(/_/g, ' ')}</span>
              {project.industry && <span>{project.industry}</span>}
              <span>{project.status}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => run('enhance', () => enhanceFeasibilityProject(project.id))} disabled={busy !== ''} className="inline-flex items-center gap-2 rounded-full border border-[#A8B9AE] px-4 py-2 text-sm font-semibold text-[#263F34] hover:bg-[#EEF5F1] disabled:opacity-50">
              {busy === 'enhance' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Re-analyze
            </button>
            <button onClick={() => run('duplicate', () => duplicateFeasibilityProject(project.id))} disabled={busy !== ''} className="inline-flex items-center gap-2 rounded-full border border-[#D8D3C8] px-4 py-2 text-sm font-semibold hover:bg-[#F7F6F2] disabled:opacity-50">
              <Copy className="h-4 w-4" />
              Duplicate
            </button>
            <button onClick={() => window.confirm('Archive this feasibility project?') && run('archive', () => archiveFeasibilityProject(project.id))} disabled={busy !== ''} className="inline-flex items-center gap-2 rounded-full border border-[#E7C8C8] px-4 py-2 text-sm font-semibold text-[#8A2B2B] hover:bg-[#FCF1F1] disabled:opacity-50">
              <Trash2 className="h-4 w-4" />
              Archive
            </button>
            {pdfHref && (
              <Link href={pdfHref} className="inline-flex items-center gap-2 rounded-full bg-[#263F34] px-5 py-2 text-sm font-semibold text-white hover:bg-[#355846]">
                Open export editor
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1fr_380px]">
        <section className="space-y-6">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

          <FeasibilityReportPreview project={project} />

          <div className="rounded-2xl border border-[#E3E1DA] bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7563]">
                  <Gauge className="h-4 w-4" />
                  Scorecard
                </div>
                <h2 className="mt-3 text-2xl font-bold">Feasibility assessment</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6B6B6B]">{analysis?.businessObjective || project.description}</p>
              </div>
              <div className={`rounded-2xl px-6 py-5 text-center ${scoreTone(project.score)}`}>
                <div className="text-4xl font-black">{Math.round(project.score || analysis?.scores.overallScore || 0)}%</div>
                <div className="text-xs font-bold uppercase tracking-[0.14em]">{analysis?.recommendation || 'Review'}</div>
              </div>
            </div>
            {analysis && (
              <div className="mt-6 grid gap-3 md:grid-cols-5">
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
            )}
          </div>

          <div className="rounded-2xl border border-[#E3E1DA] bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7563]">
              <BarChart3 className="h-4 w-4" />
              Missing Sections Panel
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {sections.map((section) => (
                <div key={section.key} className="rounded-xl border border-[#E3E1DA] bg-[#FBFAF7] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold">{section.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusTone(section.status)}`}>
                      {section.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">{section.guidance}</p>
                  {section.evidence?.[0] && <p className="mt-3 rounded-lg bg-white p-3 text-xs leading-5 text-[#6B6B6B]">{section.evidence[0]}</p>}
                </div>
              ))}
            </div>
          </div>

          {pdfHref && (
            <div className="rounded-2xl border border-[#DDE8E1] bg-[#EEF5F1] p-6 text-[#263F34]">
              <FileText className="h-6 w-6" />
              <h2 className="mt-3 text-xl font-bold">Export-ready report package</h2>
              <p className="mt-2 text-sm leading-6">Feasibility Studio owns the analysis and report template preview above. PDF Studio is used as the shared page editor/export engine for final PDF, DOCX, and HTML output.</p>
              <Link href={pdfHref} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#263F34] px-5 py-2 text-sm font-semibold text-white">
                Open export editor
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4 text-[#8A5A00]" />
              Validation Panel
            </div>
            <div className="mt-4 space-y-2">
              {warnings.length ? warnings.map((warning) => (
                <div key={warning} className="rounded-lg border border-[#F2D29B] bg-[#FFF8E8] p-3 text-sm leading-5 text-[#6B5A30]">{warning}</div>
              )) : <div className="rounded-lg border border-[#DDE8E1] bg-[#EEF5F1] p-3 text-sm text-[#263F34]">No high-priority warnings detected.</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="h-4 w-4 text-[#4F7563]" />
              Recommendations Panel
            </div>
            <ol className="mt-4 space-y-2">
              {recommendations.length ? recommendations.map((item, index) => (
                <li key={item} className="rounded-lg border border-[#E3E1DA] bg-[#FBFAF7] p-3 text-sm leading-5 text-[#6B6B6B]">
                  <strong className="text-[#111111]">{index + 1}.</strong> {item}
                </li>
              )) : <li className="rounded-lg border border-[#DDE8E1] bg-[#EEF5F1] p-3 text-sm text-[#263F34]">No recommendations yet.</li>}
            </ol>
          </div>

          <div className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
            <div className="font-bold">Cross-format outputs</div>
            <div className="mt-4 space-y-3 text-sm">
              {outputs && Object.entries(outputs).map(([key, value]: any) => (
                <div key={key} className="rounded-lg border border-[#E3E1DA] bg-[#FBFAF7] p-3">
                  <div className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                  <div className="mt-1 text-xs text-[#6B6B6B]">{value.status}</div>
                  {value.href && <Link href={value.href} className="mt-2 inline-flex text-xs font-semibold text-[#4F7563]">Open</Link>}
                  {value.note && <p className="mt-2 text-xs leading-5 text-[#6B6B6B]">{value.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
