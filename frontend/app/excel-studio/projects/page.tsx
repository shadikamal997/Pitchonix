'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Archive, Copy, FileSpreadsheet, Loader2, Plus, Search } from 'lucide-react';
import { archiveExcelProject, duplicateExcelProject, listExcelProjects } from '@/features/excel-studio/api';
import type { ExcelProject } from '@/features/excel-studio/types';
import { formatDate, formatFileSize } from '@/features/excel-studio/format';

export default function ExcelProjectsPage() {
  const [projects, setProjects] = useState<ExcelProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    listExcelProjects()
      .then((items) => {
        setProjects(items);
        setError('');
      })
      .catch((err) => setError(err?.message || 'Could not load projects.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = projects.filter((project) => {
    const haystack = `${project.title} ${project.filename} ${project.status}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const duplicate = async (id: string) => {
    setBusyId(id);
    try {
      await duplicateExcelProject(id);
      load();
    } finally {
      setBusyId('');
    }
  };

  const archive = async (id: string) => {
    setBusyId(id);
    try {
      await archiveExcelProject(id);
      setProjects((items) => items.filter((project) => project.id !== id));
    } finally {
      setBusyId('');
    }
  };

  return (
    <main className="min-h-full bg-[#EDEBE6] px-6 py-8 text-[#111111]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7563]">Excel Studio</div>
            <h1 className="mt-2 text-4xl font-bold tracking-[-0.03em]">Workbook Projects</h1>
            <p className="mt-2 text-sm text-[#6B6B6B]">Review analyzed spreadsheets, reopen editors, duplicate audits, or archive completed work.</p>
          </div>
          <Link href="/excel-studio" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111114] px-5 py-3 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            New workbook
          </Link>
          <Link href="/excel-studio/smart-builder" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8D3C8] bg-white px-5 py-3 text-sm font-semibold text-[#355846] hover:bg-[#EEF5F1]">
            Create from script
          </Link>
        </div>

        <div className="mb-5 rounded-2xl border border-[#E3E1DA] bg-white p-4 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A9A9A]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search workbooks..."
              className="h-11 w-full rounded-full bg-[#F7F6F2] pl-11 pr-4 text-sm outline-none ring-1 ring-transparent focus:bg-white focus:ring-[#4F7563]/30"
            />
          </div>
        </div>

        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="rounded-2xl border border-[#E3E1DA] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
          {loading ? (
            <div className="flex h-56 items-center justify-center text-[#6B6B6B]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading projects
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-[#4F7563]" />
              <h2 className="mt-4 text-xl font-bold">No matching workbooks</h2>
              <p className="mt-2 text-sm text-[#6B6B6B]">Upload or analyze a workbook from Excel Studio to create your first project.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E3E1DA]">
              {filtered.map((project) => (
                <div key={project.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
                  <Link href={`/excel-studio/editor/${project.id}`} className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{project.title}</h2>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#6B6B6B]">
                      <span>{project.filename}</span>
                      <span>{formatFileSize(project.fileSize)}</span>
                      <span>{project.analysis.summary.sheets} sheet{project.analysis.summary.sheets === 1 ? '' : 's'}</span>
                      <span>{project.analysis.summary.formulas} formulas</span>
                      <span>{project.analysis.issues.length} issues</span>
                      <span>Updated {formatDate(project.updatedAt)}</span>
                    </div>
                  </Link>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#EEF5F1] px-3 py-1 text-xs font-bold text-[#355846]">{project.analysis.scores.overall}/100 quality</span>
                    <button
                      onClick={() => duplicate(project.id)}
                      disabled={busyId === project.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#D8D3C8] px-3 py-2 text-xs font-semibold text-[#355846] hover:bg-[#EEF5F1] disabled:opacity-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => archive(project.id)}
                      disabled={busyId === project.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#D8D3C8] px-3 py-2 text-xs font-semibold text-[#6B6B6B] hover:bg-[#F7F6F2] disabled:opacity-50"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
