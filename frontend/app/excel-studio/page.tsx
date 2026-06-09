'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  Gauge,
  History,
  LayoutTemplate,
  Loader2,
  ShieldCheck,
  UploadCloud,
  Wand2,
} from 'lucide-react';
import { listExcelProjects, uploadExcelWorkbook } from '@/features/excel-studio/api';
import type { ExcelProject } from '@/features/excel-studio/types';
import { formatDate, formatFileSize, formatNumber } from '@/features/excel-studio/format';

export default function ExcelStudioPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<ExcelProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const recent = useMemo(() => projects.slice(0, 5), [projects]);

  useEffect(() => {
    let active = true;
    listExcelProjects()
      .then((items) => {
        if (!active) return;
        setProjects(items);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Could not load Excel Studio projects.');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError('');
    try {
      const project = await uploadExcelWorkbook(file, setProgress);
      router.push(`/excel-studio/editor/${project.id}`);
    } catch (err: any) {
      setError(err?.message || 'Workbook import failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-full bg-[#EDEBE6] text-[#111111]">
      <section className="bg-[#263F34] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-[#DDE8E1]">
              <FileSpreadsheet className="h-4 w-4" />
              Excel Studio
            </div>
            <h1 className="max-w-3xl text-5xl font-bold tracking-[-0.035em] md:text-6xl">
              Audit, repair, and modernize workbooks without losing source data.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#DDE8E1]">
              Import XLSX, XLS, or CSV files. Pitchonix analyzes formulas, sheets, tables, formatting, dashboard readiness, and data quality before any enhancement is applied.
            </p>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                ['Source data safe', ShieldCheck],
                ['Formula-aware audit', Gauge],
                ['Executive-ready output', BarChart3],
              ].map(([label, Icon]) => (
                <div key={label as string} className="rounded-lg border border-white/15 bg-white/10 p-4">
                  <Icon className="h-5 w-5 text-[#DDE8E1]" />
                  <div className="mt-3 text-sm font-semibold">{label as string}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/excel-studio/smart-builder" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#263F34] hover:bg-[#F7F6F2]">
                <Wand2 className="h-4 w-4" />
                Create from script
              </Link>
              <Link href="/excel-studio/templates" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                <LayoutTemplate className="h-4 w-4" />
                Browse templates
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/15 bg-white p-4 text-[#111111] shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDrop={(event) => {
                event.preventDefault();
                handleFile(event.dataTransfer.files?.[0]);
              }}
              onDragOver={(event) => event.preventDefault()}
              className="flex min-h-[360px] w-full flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#D8D3C8] bg-[#F7F6F2] px-6 text-center transition hover:border-[#4F7563] hover:bg-[#EEF5F1]"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              {uploading ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-[#4F7563]" />
                  <h2 className="mt-5 text-2xl font-bold">Analyzing workbook</h2>
                  <div className="mt-5 h-2 w-full max-w-sm overflow-hidden rounded-full bg-[#E3E1DA]">
                    <div className="h-full rounded-full bg-[#4F7563]" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-[#6B6B6B]">{progress}% uploaded</p>
                </>
              ) : (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#263F34] text-white">
                    <UploadCloud className="h-8 w-8" />
                  </div>
                  <h2 className="mt-6 text-3xl font-bold tracking-[-0.02em]">Import workbook</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[#6B6B6B]">
                    Drop a spreadsheet here or click to upload. XLSX, XLS, CSV up to 50 MB.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#111114] px-5 py-3 text-sm font-semibold text-white">
                    Upload and analyze
                    <ArrowRight className="h-4 w-4" />
                  </span>
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

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7563]">
                  <History className="h-3.5 w-3.5" />
                  Recent Workbooks
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em]">Continue Excel Studio work</h2>
              </div>
              <Link href="/excel-studio/projects" className="rounded-full border border-[#D8D3C8] px-4 py-2 text-sm font-semibold text-[#355846] hover:bg-[#EEF5F1]">
                View all
              </Link>
            </div>

            {loading ? (
              <div className="grid gap-3">
                {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-[#F1F0EC]" />)}
              </div>
            ) : recent.length === 0 ? (
              <div className="rounded-xl border border-[#E3E1DA] bg-[#F7F6F2] p-8">
                <h3 className="font-semibold">No Excel projects yet</h3>
                <p className="mt-1 text-sm text-[#6B6B6B]">Upload a workbook and it will appear here automatically.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E3E1DA]">
                {recent.map((project) => (
                  <Link key={project.id} href={`/excel-studio/editor/${project.id}`} className="grid gap-3 py-4 hover:bg-[#FBFAF7] md:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{project.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6B6B6B]">
                        <span>{project.filename}</span>
                        <span>{formatFileSize(project.fileSize)}</span>
                        <span>{project.analysis.summary.sheets} sheets</span>
                        <span>Updated {formatDate(project.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#EEF5F1] px-3 py-1 text-xs font-bold text-[#355846]">{project.analysis.scores.overall}/100</span>
                      <ArrowRight className="h-4 w-4 text-[#9A9A9A]" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-5">
            <Link href="/excel-studio/templates" className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)] hover:border-[#4F7563]/40">
              <LayoutTemplate className="h-6 w-6 text-[#4F7563]" />
              <h3 className="mt-4 text-lg font-bold">Premium workbook templates</h3>
              <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">Finance, sales, operations, dashboards, and executive board packs.</p>
            </Link>
            <Link href="/excel-studio/smart-builder" className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)] hover:border-[#4F7563]/40">
              <Wand2 className="h-6 w-6 text-[#4F7563]" />
              <h3 className="mt-4 text-lg font-bold">Create workbook from script</h3>
              <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">Describe an Excel model, dashboard, forecast, or report and generate a real XLSX workbook.</p>
            </Link>
            <Link href="/excel-studio/reports" className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)] hover:border-[#4F7563]/40">
              <CheckCircle2 className="h-6 w-6 text-[#4F7563]" />
              <h3 className="mt-4 text-lg font-bold">Workbook quality reports</h3>
              <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">{formatNumber(projects.length)} analyzed workbook{projects.length === 1 ? '' : 's'} tracked.</p>
            </Link>
            <div className="rounded-2xl border border-[#E3E1DA] bg-[#263F34] p-5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
              <Wand2 className="h-6 w-6 text-[#DDE8E1]" />
              <h3 className="mt-4 text-lg font-bold">Enhancement rules</h3>
              <p className="mt-2 text-sm leading-6 text-[#DDE8E1]">Excel Studio improves presentation, validation, structure, and readability. It does not alter financial values or source calculations without approval.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
