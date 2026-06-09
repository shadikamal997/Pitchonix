'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BarChart3, CheckCircle2, FileSpreadsheet, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getExcelReports } from '@/features/excel-studio/api';
import type { ExcelReports } from '@/features/excel-studio/types';
import { formatDate } from '@/features/excel-studio/format';

export default function ExcelReportsPage() {
  const [reports, setReports] = useState<ExcelReports | null>(null);
  const [loading, setLoading] = useState(true);
  const stats: Array<{ label: string; value: string | number; Icon: LucideIcon }> = [
    { label: 'Projects', value: reports?.totalProjects || 0, Icon: FileSpreadsheet },
    { label: 'Average quality', value: `${reports?.averageQuality || 0}/100`, Icon: BarChart3 },
    { label: 'Critical issues', value: reports?.criticalIssues || 0, Icon: AlertTriangle },
    { label: 'Warnings', value: reports?.warningIssues || 0, Icon: CheckCircle2 },
  ];

  useEffect(() => {
    getExcelReports().then(setReports).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-full items-center justify-center bg-[#EDEBE6] text-[#6B6B6B]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading reports
      </main>
    );
  }

  return (
    <main className="min-h-full bg-[#EDEBE6] px-6 py-8 text-[#111111]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7563]">Excel Studio</div>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.03em]">Workbook Quality Reports</h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">A live quality overview across analyzed workbook projects.</p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {stats.map(({ label, value, Icon }) => (
            <div key={label} className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
              <Icon className="h-5 w-5 text-[#4F7563]" />
              <div className="mt-4 text-3xl font-bold">{value}</div>
              <div className="mt-1 text-sm font-medium text-[#6B6B6B]">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <section className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
            <h2 className="text-xl font-bold">Recent audit results</h2>
            <div className="mt-4 divide-y divide-[#E3E1DA]">
              {(reports?.recent || []).length === 0 ? (
                <div className="py-8 text-sm text-[#6B6B6B]">No reports yet. Import a workbook to generate the first quality report.</div>
              ) : reports!.recent.map((project) => (
                <Link key={project.id} href={`/excel-studio/editor/${project.id}`} className="grid gap-3 py-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <h3 className="font-semibold">{project.title}</h3>
                    <p className="mt-1 text-xs text-[#6B6B6B]">{project.analysis.issues.length} issue(s) · Updated {formatDate(project.updatedAt)}</p>
                  </div>
                  <span className="h-fit rounded-full bg-[#EEF5F1] px-3 py-1 text-xs font-bold text-[#355846]">{project.analysis.scores.overall}/100</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
            <h2 className="text-xl font-bold">Template usage</h2>
            <div className="mt-4 space-y-3">
              {(reports?.templateCoverage || []).map((item) => (
                <div key={item.templateId}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-[#6B6B6B]">{item.projects}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#F1F0EC]">
                    <div className="h-full rounded-full bg-[#4F7563]" style={{ width: `${Math.min(100, item.projects * 18)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
