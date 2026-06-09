'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Briefcase, Loader2, Plus } from 'lucide-react';
import { listFeasibilityProjects } from '@/features/feasibility-studio/api';
import type { FeasibilityProject } from '@/features/feasibility-studio/types';

function scoreTone(score?: number | null) {
  if ((score || 0) >= 80) return 'bg-[#DDE8E1] text-[#263F34]';
  if ((score || 0) >= 65) return 'bg-[#FFF4D8] text-[#8A5A00]';
  return 'bg-[#F7E3E3] text-[#8A2B2B]';
}

export default function FeasibilityProjectsPage() {
  const [projects, setProjects] = useState<FeasibilityProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listFeasibilityProjects()
      .then((items) => {
        if (!active) return;
        setProjects(items);
      })
      .catch((err) => active && setError(err?.message || 'Could not load feasibility projects.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-full bg-[#EDEBE6] px-6 py-8 text-[#111111]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/feasibility-studio" className="inline-flex items-center gap-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#111111]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Feasibility Studio
            </Link>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em]">Feasibility Projects</h1>
            <p className="mt-2 text-sm text-[#6B6B6B]">All saved feasibility studies, scorecards, and linked PDF Studio reports.</p>
          </div>
          <Link href="/feasibility-studio" className="inline-flex items-center gap-2 rounded-full bg-[#263F34] px-5 py-3 text-sm font-semibold text-white hover:bg-[#355846]">
            <Plus className="h-4 w-4" />
            New feasibility study
          </Link>
        </div>

        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <div className="rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-[#6B6B6B]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading feasibility projects
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-[#E3E1DA] bg-[#F7F6F2] p-10 text-center">
              <Briefcase className="mx-auto h-10 w-10 text-[#4F7563]" />
              <h2 className="mt-4 text-xl font-bold">No feasibility projects yet</h2>
              <p className="mt-2 text-sm text-[#6B6B6B]">Create one from existing business material and it will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E3E1DA]">
              {projects.map((project) => (
                <Link key={project.id} href={`/feasibility-studio/editor/${project.id}`} className="grid gap-4 py-4 transition hover:bg-[#FBFAF7] md:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{project.title}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6B6B6B]">
                      <span>{project.studyType.replace(/_/g, ' ')}</span>
                      {project.industry && <span>{project.industry}</span>}
                      <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6B6B6B]">{project.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-sm font-black ${scoreTone(project.score)}`}>{Math.round(project.score || 0)}%</span>
                    <ArrowRight className="h-4 w-4 text-[#9A9A9A]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
