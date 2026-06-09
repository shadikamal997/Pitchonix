'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LayoutTemplate, Loader2 } from 'lucide-react';
import { listExcelTemplates } from '@/features/excel-studio/api';
import type { ExcelTemplate } from '@/features/excel-studio/types';

export default function ExcelTemplatesPage() {
  const [templates, setTemplates] = useState<ExcelTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listExcelTemplates().then(setTemplates).finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-full bg-[#EDEBE6] px-6 py-8 text-[#111111]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#4F7563]">Excel Studio</div>
            <h1 className="mt-2 text-4xl font-bold tracking-[-0.03em]">Premium Workbook Templates</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B6B6B]">Templates define review strategy, visual system, dashboard structure, and export-ready executive presentation styling.</p>
          </div>
          <Link href="/excel-studio" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111114] px-5 py-3 text-sm font-semibold text-white">
            Import workbook
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center rounded-2xl bg-white">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading templates
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <article key={template.id} className="overflow-hidden rounded-2xl border border-[#E3E1DA] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
                <div className="h-32 p-5" style={{ background: `linear-gradient(135deg, ${template.accent}, #111114)` }}>
                  <div className="flex h-full items-end justify-between text-white">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-75">{template.category}</div>
                      <h2 className="mt-2 text-xl font-bold">{template.name}</h2>
                    </div>
                    <LayoutTemplate className="h-8 w-8 opacity-80" />
                  </div>
                </div>
                <div className="p-5">
                  <p className="min-h-[72px] text-sm leading-6 text-[#6B6B6B]">{template.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {template.strengths.map((strength) => (
                      <span key={strength} className="rounded-full bg-[#EEF5F1] px-3 py-1 text-xs font-bold text-[#355846]">{strength}</span>
                    ))}
                  </div>
                  <Link href="/excel-studio" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#355846]">
                    Use with a workbook
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
