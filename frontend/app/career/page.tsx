'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import {
  Briefcase, FileText, Mail, Layout, Sparkles, User, Plus, Trash2, Copy,
  Download, Upload, ExternalLink, Loader2,
  CheckCircle2, AlertTriangle, XCircle, Eye, X,
  TrendingUp, Award, BarChart3, Target, Compass, ArrowUpRight,
  History, BookOpenCheck, Wand2, Gauge, ArrowRight, Inbox,
} from 'lucide-react';
import {
  useCvProfile, useCvDocuments, useCvTemplates, CvDoctype,
  CvDocumentDto, CvProfileDto,
} from '@/features/career/hooks';
import { useConfirm } from '@/components/ConfirmDialog';

// =============================================================================
//  Phase 43.0 — Career Docs Dashboard.
//
//  Re-imagined as a true dashboard landing page (no empty white container).
//  Surfaces every career capability built in Phase 42.x:
//
//    Hero (greeting + CTAs)
//    Stats row (Docs, Imports, ATS, Templates)
//    Quick actions (Create CV / Resume / Cover Letter / Portfolio,
//                    Import, Analyze)
//    Career Intelligence card  (deep link → /career/dashboard)
//    ATS Score widget          (highest-scoring CV → /career/analyze)
//    Recent documents
//    Import history (recent imports + status)
//    Template gallery preview
//    Profile compact + onboarding (first-time experience)
//
//  Sage / beige tokens match the global Pitchonix design system.
// =============================================================================

type DoctypeKey = 'cv' | 'resume' | 'coverLetter' | 'portfolio';

const DOCTYPE_LABEL: Record<DoctypeKey, string> = {
  cv: 'CV', resume: 'Resume', coverLetter: 'Cover Letter', portfolio: 'Portfolio',
};

const DOCTYPE_ICON: Record<DoctypeKey, React.ComponentType<any>> = {
  cv: FileText, resume: Briefcase, coverLetter: Mail, portfolio: Layout,
};

const DOCTYPE_GROUPS: { key: DoctypeKey; label: string; icon: React.ComponentType<any>; desc: string }[] = [
  { key: 'cv',          label: 'Create CV',           icon: FileText,  desc: 'Long-form career profile' },
  { key: 'resume',      label: 'Create Resume',       icon: Briefcase, desc: 'Concise one-pager resume' },
  { key: 'coverLetter', label: 'Create Cover Letter', icon: Mail,      desc: 'Tailored application letter' },
  { key: 'portfolio',   label: 'Create Portfolio',    icon: Layout,    desc: 'Visual project showcase' },
];

// =============================================================================
//  Page entry — wraps body in Suspense for useSearchParams.
// =============================================================================
export default function CareerWorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#EDEBE6]" />}>
      <CareerWorkspaceBody />
    </Suspense>
  );
}

// =============================================================================
//  Body — orchestrates data + dashboard sections.
// =============================================================================
function CareerWorkspaceBody() {
  const router = useRouter();
  const params = useSearchParams();
  const confirm = useConfirm();

  const profile = useCvProfile();
  const docs    = useCvDocuments();
  const templates = useCvTemplates();

  // Phase 42.9B Item 4 — OCR pack warmup
  useEffect(() => {
    api.post('/career/import/warmup', { langs: ['eng', 'ara', 'fra', 'deu', 'ron'] }).catch(() => { /* silent */ });
  }, []);

  // /career?create=cv|resume|... auto-create + redirect
  useEffect(() => {
    const wanted = params?.get('create');
    if (!wanted) return;
    const doctype = (['cv', 'resume', 'coverLetter', 'portfolio'].includes(wanted) ? wanted : null) as CvDoctype | null;
    if (!doctype) return;
    const defaultTitles: Record<string, string> = {
      cv: 'Untitled CV',
      resume: 'Untitled Resume',
      coverLetter: 'Untitled Cover Letter',
      portfolio: 'Untitled Portfolio',
    };
    (async () => {
      try {
        const { data } = await api.post('/career/documents', { doctype, title: defaultTitles[doctype] });
        router.replace(`/career/builder/${data.id}`);
      } catch (e: any) {
        console.error('career auto-create failed:', e);
        router.replace(`/career?create_error=${encodeURIComponent(e?.response?.data?.message || e?.message || 'unknown')}`);
      }
    })();
  }, [params, router]);

  const createError = params?.get('create_error');

  // Derived stats
  const stats = useMemo(() => {
    const items = docs.items || [];
    const byType = (t: DoctypeKey) => items.filter((d) => d.doctype === t).length;
    return {
      total:        items.length,
      cv:           byType('cv'),
      resume:       byType('resume'),
      coverLetter:  byType('coverLetter'),
      portfolio:    byType('portfolio'),
    };
  }, [docs.items]);

  const hasProfile = !!profile.profile && (!!profile.profile.personal?.fullName || (profile.profile.experience?.length ?? 0) > 0);
  const isFirstTime = !profile.loading && !hasProfile && (docs.items?.length ?? 0) === 0;

  const recentDocs = useMemo(() => {
    return [...(docs.items || [])]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [docs.items]);

  // Quick-create helper
  const handleQuickCreate = (doctype: DoctypeKey) => {
    const title = `Untitled ${DOCTYPE_LABEL[doctype]}`;
    api.post('/career/documents', { doctype, title })
      .then(({ data }) => router.push(`/career/builder/${data.id}`))
      .catch(() => router.push(`/career?create=${doctype}`));
  };

  // For "Analyze CV" deep link — pre-pick the most recent CV if any
  const cvDocs = (docs.items || []).filter((d) => d.doctype === 'cv');
  const latestCv = cvDocs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  const totalSections = profile.profile
    ? (profile.profile.experience?.length || 0)
      + (profile.profile.education?.length || 0)
      + (profile.profile.skills?.length || 0)
      + (profile.profile.projects?.length || 0)
      + (profile.profile.certifications?.length || 0)
      + (profile.profile.languages?.length || 0)
      + (profile.profile.awards?.length || 0)
      + (profile.profile.publications?.length || 0)
      + (profile.profile.references?.length || 0)
    : 0;

  // Estimate ATS score from profile completeness (0–100). Just for the widget
  // when the user hasn't formally run analysis yet.
  const profileScore = (() => {
    if (!profile.profile) return 0;
    const buckets = [
      !!profile.profile.personal?.fullName,
      !!profile.profile.personal?.email,
      !!profile.profile.personal?.headline,
      !!profile.profile.personal?.summary,
      (profile.profile.experience?.length ?? 0) > 0,
      (profile.profile.education?.length ?? 0)  > 0,
      (profile.profile.skills?.length ?? 0)     > 0,
      (profile.profile.projects?.length ?? 0)   > 0 || (profile.profile.certifications?.length ?? 0) > 0,
    ];
    return Math.round((buckets.filter(Boolean).length / buckets.length) * 100);
  })();

  return (
    <div className="min-h-screen bg-[#EDEBE6]">
      {/* Inline create-error toast */}
      {createError && (
        <div className="bg-[#FCF1F1] border-b border-[#F7E3E3] text-[#7a2929] text-xs px-6 py-2 flex items-center gap-3">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="flex-1">Couldn't auto-create that document: {createError}.</span>
          <button onClick={() => router.replace('/career')} className="underline font-semibold">dismiss</button>
        </div>
      )}

      {/* Sticky header */}
      <header className="bg-[#EDEBE6]/85 backdrop-blur-md border-b border-[#E3E1DA]/60 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="text-xs text-[#9A9A9A] hover:text-[#111111]">← Dashboard</Link>
          <div className="h-5 w-px bg-[#E3E1DA]" />
          <h1 className="text-base font-bold text-[#111111] flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
            Career Docs
          </h1>
          <span className="text-[10px] uppercase tracking-wide text-[#9A9A9A] font-semibold hidden sm:inline">Dashboard</span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/career/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white text-[13px] font-semibold text-[#111111] shadow-[0_8px_18px_rgba(0,0,0,0.04)] hover:bg-[#F7F6F2] transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" /> Career Dashboard
            </Link>
            <Link
              href={latestCv ? `/career/analyze?cv=${latestCv.id}` : '/career/analyze'}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#111114] hover:bg-black text-white text-[13px] font-semibold shadow-[0_10px_22px_rgba(0,0,0,0.18)]"
            >
              <Wand2 className="w-3.5 h-3.5" /> Improve Existing CV
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* --- HERO ---------------------------------------------------- */}
        <CareerHero
          profile={profile.profile}
          hasProfile={hasProfile}
          onCreateCv={() => handleQuickCreate('cv')}
        />

        {/* --- ONBOARDING (first-time users) -------------------------- */}
        {isFirstTime && <FirstTimeOnboarding onCreate={handleQuickCreate} />}

        {/* --- STATS ROW ---------------------------------------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricTile
            label="Documents"
            value={stats.total}
            icon={FileText}
            hint={stats.total === 0 ? 'Create your first one' : `${stats.cv} CV · ${stats.resume} resume`}
          />
          <MetricTile
            label="Profile Strength"
            value={`${profileScore}%`}
            icon={Gauge}
            hint={profileScore >= 80 ? 'Looking great' : profileScore >= 50 ? 'Add more sections' : 'Get started'}
            tone={profileScore >= 80 ? 'success' : profileScore >= 50 ? 'warn' : 'neutral'}
          />
          <MetricTile
            label="Profile Sections"
            value={totalSections}
            icon={BookOpenCheck}
            hint={totalSections === 0 ? 'Import or add manually' : 'Across all categories'}
          />
          <MetricTile
            label="Templates"
            value={templates.items.length}
            icon={Sparkles}
            hint="Ready to apply"
          />
        </div>

        {/* --- QUICK ACTIONS ------------------------------------------ */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="pn-h2">Quick actions</h2>
              <p className="pn-body text-[#6B6B6B] mt-0.5">Start a new document or upgrade an existing one — all your career tools in one place.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {DOCTYPE_GROUPS.map((g) => {
              const Icon = g.icon;
              return (
                <button
                  key={g.key}
                  onClick={() => handleQuickCreate(g.key)}
                  className="group pn-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lifted"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center mb-3 group-hover:bg-[#DDE8E1] transition-colors">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-[13px] font-semibold text-[#111111]">{g.label}</div>
                  <div className="text-[11px] text-[#9A9A9A] mt-0.5 leading-snug">{g.desc}</div>
                </button>
              );
            })}

            <button
              onClick={() => document.getElementById('career-import-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="group pn-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lifted"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#FAEEDB] text-[#8c6210] flex items-center justify-center mb-3 group-hover:bg-[#F5E1B7] transition-colors">
                <Upload className="w-4.5 h-4.5" />
              </div>
              <div className="text-[13px] font-semibold text-[#111111]">Import CV</div>
              <div className="text-[11px] text-[#9A9A9A] mt-0.5 leading-snug">PDF · DOCX · LinkedIn</div>
            </button>

            <Link
              href={latestCv ? `/career/analyze?cv=${latestCv.id}` : '/career/analyze'}
              className="group pn-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lifted block"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#111114] text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Wand2 className="w-4.5 h-4.5" />
              </div>
              <div className="text-[13px] font-semibold text-[#111111]">Analyze CV</div>
              <div className="text-[11px] text-[#9A9A9A] mt-0.5 leading-snug">AI improvements + ATS</div>
            </Link>
          </div>
        </section>

        {/* --- CAREER INTELLIGENCE + ATS SCORE WIDGETS ---------------- */}
        <section className="grid lg:grid-cols-3 gap-4">
          <CareerIntelligenceCard score={profileScore} totalDocs={stats.total} latestCvId={latestCv?.id} />
          <AtsScoreWidget profile={profile.profile} score={profileScore} />
        </section>

        {/* --- RECENT DOCUMENTS + IMPORT HISTORY ---------------------- */}
        <section className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RecentDocumentsCard
              docs={recentDocs}
              onCreate={() => handleQuickCreate('cv')}
              onDelete={async (id, title) => {
                if (!(await confirm({ title: 'Delete document?', message: `"${title}" will be permanently removed.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
                await docs.remove(id);
              }}
              onDuplicate={(id) => docs.duplicate(id)}
              onExport={(id, format, filename) => docs.exportDoc(id, format, filename)}
            />
          </div>
          <ImportHistoryCard profile={profile.profile} />
        </section>

        {/* --- TEMPLATE GALLERY PREVIEW ------------------------------- */}
        <TemplateGalleryPreview items={templates.items} loading={templates.loading} />

        {/* --- IMPORT PANEL ------------------------------------------- */}
        <section id="career-import-panel">
          <ImportPanel profile={profile} />
        </section>

        {/* --- PROFILE COMPACT EDITOR --------------------------------- */}
        <ProfileCompact profile={profile.profile} loading={profile.loading} onPatch={profile.patchPersonal} />
      </div>
    </div>
  );
}

// =============================================================================
//  Hero
// =============================================================================
const CareerHero: React.FC<{
  profile: CvProfileDto | null;
  hasProfile: boolean;
  onCreateCv: () => void;
}> = ({ profile, hasProfile, onCreateCv }) => {
  const name = profile?.personal?.fullName?.split(' ')[0];
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[#263F34] p-7 sm:p-10 shadow-[0_24px_60px_rgba(38,63,52,0.30)]">
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#4F7563] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-[#7A988A] blur-3xl" />
      </div>

      <div className="relative grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-[#DDE8E1]" />
            <span className="text-[11px] font-semibold tracking-wide uppercase text-[#DDE8E1]">Career Studio</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-white leading-tight">
            {hasProfile && name
              ? <>Welcome back, {name}.</>
              : <>Build a CV that gets you hired.</>}
          </h2>

          <p className="text-[#DDE8E1] text-sm leading-relaxed max-w-md">
            {hasProfile
              ? 'Your career profile is ready. Create new documents, run an AI analysis, or import an existing CV.'
              : 'Start from scratch, paste a LinkedIn URL, or upload your existing CV — the AI will turn it into an interview-ready document.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={onCreateCv}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-white text-[#263F34] hover:bg-[#F7F6F2] font-semibold text-sm shadow-[0_12px_24px_rgba(0,0,0,0.15)]"
            >
              <Plus className="w-4 h-4" /> Create CV
            </button>
            <a
              href="#career-import-panel"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-white/10 border border-white/25 text-white hover:bg-white/15 font-semibold text-sm backdrop-blur-sm"
            >
              <Upload className="w-4 h-4" /> Import existing CV
            </a>
          </div>
        </div>

        <div className="hidden md:block relative">
          <div className="relative space-y-4">
            <div className="bg-white/8 backdrop-blur-md border border-white/15 rounded-3xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.20)] transform rotate-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-[#4F7563] flex items-center justify-center shadow-[0_10px_22px_rgba(79,117,99,0.4)]">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">ATS Optimised</div>
                  <div className="text-[#A8B9AE] text-xs">Recruiter-friendly templates</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div className="h-full bg-white" style={{ width: '88%' }} />
                </div>
                <span className="text-white font-bold tracking-tight">88%</span>
              </div>
            </div>

            <div className="bg-white/8 backdrop-blur-md border border-white/15 rounded-3xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.20)] transform -rotate-2">
              <div className="flex items-center gap-2 mb-1">
                <Compass className="h-5 w-5 text-[#DDE8E1]" />
                <span className="text-white font-semibold text-sm">9 languages supported</span>
              </div>
              <div className="text-[#A8B9AE] text-xs">English · Arabic · French · German · Romanian + 4 more</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
//  Onboarding (first-time)
// =============================================================================
const FirstTimeOnboarding: React.FC<{ onCreate: (t: DoctypeKey) => void }> = ({ onCreate }) => (
  <div className="pn-card p-7 lg:p-8">
    <div className="text-center mb-6 max-w-xl mx-auto">
      <div className="w-14 h-14 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center mx-auto mb-3">
        <Compass className="w-6 h-6" />
      </div>
      <h2 className="pn-h2 mb-1.5">Welcome to Career Docs</h2>
      <p className="pn-body text-[#6B6B6B]">Pick how you want to start. You can always switch later.</p>
    </div>
    <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
      <button
        onClick={() => onCreate('cv')}
        className="group rounded-3xl border border-[#E3E1DA]/70 bg-[#F7F6F2] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lifted hover:bg-white"
      >
        <div className="w-10 h-10 rounded-2xl bg-[#DDE8E1] text-[#355846] flex items-center justify-center mb-3">
          <FileText className="w-5 h-5" />
        </div>
        <div className="font-semibold text-[#111111] text-[14.5px]">Start from scratch</div>
        <p className="text-[12.5px] text-[#6B6B6B] mt-1 leading-relaxed">Build your career profile section by section, with AI assistance.</p>
        <div className="flex items-center text-[#4F7563] font-semibold text-[12px] mt-4">
          Create blank CV <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      <a
        href="#career-import-panel"
        className="group rounded-3xl border border-[#E3E1DA]/70 bg-[#F7F6F2] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lifted hover:bg-white"
      >
        <div className="w-10 h-10 rounded-2xl bg-[#FAEEDB] text-[#8c6210] flex items-center justify-center mb-3">
          <Upload className="w-5 h-5" />
        </div>
        <div className="font-semibold text-[#111111] text-[14.5px]">Import existing CV</div>
        <p className="text-[12.5px] text-[#6B6B6B] mt-1 leading-relaxed">PDF, DOCX or paste a LinkedIn URL. We'll extract every section automatically.</p>
        <div className="flex items-center text-[#4F7563] font-semibold text-[12px] mt-4">
          Upload file <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </a>

      <button
        onClick={() => onCreate('resume')}
        className="group rounded-3xl border border-[#E3E1DA]/70 bg-[#F7F6F2] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lifted hover:bg-white"
      >
        <div className="w-10 h-10 rounded-2xl bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center mb-3">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="font-semibold text-[#111111] text-[14.5px]">Pick a template</div>
        <p className="text-[12.5px] text-[#6B6B6B] mt-1 leading-relaxed">Browse our gallery and start with a recruiter-tested layout in one click.</p>
        <div className="flex items-center text-[#4F7563] font-semibold text-[12px] mt-4">
          Open template gallery <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>
    </div>
  </div>
);

// =============================================================================
//  Metric tile
// =============================================================================
const MetricTile: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<any>;
  hint?: string;
  tone?: 'success' | 'warn' | 'neutral';
}> = ({ label, value, icon: Icon, hint, tone = 'neutral' }) => {
  const valueTone =
    tone === 'success' ? 'text-[#355846]' :
    tone === 'warn'    ? 'text-[#8c6210]' :
    'text-[#111111]';
  return (
    <div className="pn-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="pn-label uppercase">{label}</span>
        <div className="pn-icon-circle" style={{ width: 36, height: 36 }}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <div className={`pn-metric ${valueTone}`}>{value}</div>
        {hint && <div className="text-[11px] text-[#9A9A9A] mt-0.5">{hint}</div>}
      </div>
    </div>
  );
};

// =============================================================================
//  Career Intelligence card
// =============================================================================
const CareerIntelligenceCard: React.FC<{
  score: number;
  totalDocs: number;
  latestCvId?: string;
}> = ({ score, totalDocs, latestCvId }) => (
  <div className="lg:col-span-2 pn-card p-6 bg-gradient-to-br from-white to-[#F7F6F2] relative overflow-hidden">
    <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#EEF5F1] blur-2xl opacity-70 pointer-events-none" />
    <div className="relative">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#263F34] text-white flex items-center justify-center">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <div className="pn-label uppercase">Career Intelligence</div>
            <h3 className="pn-h2">AI-powered insights for your career</h3>
          </div>
        </div>
        <Link
          href="/career/dashboard"
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white text-[13px] font-semibold text-[#111111] border border-[#E3E1DA] hover:bg-[#F7F6F2]"
        >
          Open dashboard <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <IntelTile icon={Target}      title="ATS Match"        hint="Recruiter optimisation" />
        <IntelTile icon={TrendingUp}  title="Career Roadmap"   hint="Trajectory + next steps" />
        <IntelTile icon={Award}       title="Skill Gaps"       hint="What recruiters look for" />
      </div>

      <div className="flex items-center justify-between gap-3 bg-white/60 backdrop-blur-sm rounded-2xl border border-[#E3E1DA]/60 p-4">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[#111111]">
            {totalDocs === 0
              ? 'Create or import a CV to unlock analysis'
              : score >= 80
                ? 'Your profile looks great — run a job-match analysis next'
                : 'Add more sections, then ask the AI to upgrade your CV'}
          </div>
          <div className="text-[11px] text-[#9A9A9A] mt-0.5">Compare versions · Job-match scoring · One-click improvements</div>
        </div>
        <Link
          href={latestCvId ? `/career/analyze?cv=${latestCvId}` : '/career/analyze'}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#4F7563] hover:bg-[#355846] text-white text-[13px] font-semibold whitespace-nowrap"
        >
          <Wand2 className="w-3.5 h-3.5" /> Analyze
        </Link>
      </div>
    </div>
  </div>
);

const IntelTile: React.FC<{ icon: React.ComponentType<any>; title: string; hint: string }> = ({ icon: Icon, title, hint }) => (
  <div className="rounded-2xl bg-white border border-[#E3E1DA]/60 p-4">
    <div className="w-9 h-9 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center mb-2">
      <Icon className="w-4 h-4" />
    </div>
    <div className="text-[13px] font-semibold text-[#111111]">{title}</div>
    <div className="text-[11px] text-[#9A9A9A] mt-0.5">{hint}</div>
  </div>
);

// =============================================================================
//  ATS score widget
// =============================================================================
const AtsScoreWidget: React.FC<{ profile: CvProfileDto | null; score: number }> = ({ profile, score }) => {
  const stroke = 8;
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const tone =
    score >= 80 ? { ring: '#4F7563', label: 'Excellent', bg: 'bg-[#EEF5F1] text-[#355846]' } :
    score >= 60 ? { ring: '#D9A441', label: 'Good',      bg: 'bg-[#FAEEDB] text-[#8c6210]' } :
                  { ring: '#D96A6A', label: 'Needs work', bg: 'bg-[#F7E3E3] text-[#9a3737]' };

  return (
    <div className="pn-card p-6 flex flex-col items-center text-center">
      <span className="pn-label uppercase mb-3">ATS Readiness</span>
      <div className="relative w-32 h-32 mb-3">
        <svg viewBox="0 0 128 128" className="w-full h-full">
          <circle cx="64" cy="64" r={r} stroke="#F1F0EC" strokeWidth={stroke} fill="none" />
          <circle
            cx="64" cy="64" r={r}
            stroke={tone.ring}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform="rotate(-90 64 64)"
            style={{ transition: 'stroke-dashoffset 600ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="pn-metric leading-none">{score}</div>
          <div className="text-[10px] text-[#9A9A9A] mt-0.5 uppercase tracking-wider">/ 100</div>
        </div>
      </div>
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${tone.bg}`}>{tone.label}</span>
      <p className="text-[12px] text-[#6B6B6B] mt-3 leading-snug">
        Based on profile completeness. Run an in-depth analysis to score against a specific job description.
      </p>
      <Link
        href="/career/analyze"
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#4F7563] hover:text-[#355846]"
      >
        Run full analysis <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
};

// =============================================================================
//  Recent Documents card
// =============================================================================
const RecentDocumentsCard: React.FC<{
  docs: CvDocumentDto[];
  onCreate: () => void;
  onDelete: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string, format: any, filename: string) => Promise<void>;
}> = ({ docs, onCreate, onDelete, onDuplicate, onExport }) => {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="pn-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <h3 className="pn-h2">Recent documents</h3>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#4F7563] hover:bg-[#355846] text-white text-[13px] font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /> New CV
        </button>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-10 rounded-2xl border border-dashed border-[#E3E1DA] bg-[#F7F6F2]">
          <Inbox className="w-8 h-8 text-[#C9C6BD] mx-auto mb-2" />
          <p className="text-sm text-[#6B6B6B]">No documents yet</p>
          <p className="text-[12px] text-[#9A9A9A] mt-0.5">Your CVs, resumes, cover letters and portfolios will appear here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#F1F0EC]">
          {docs.map((d) => {
            const Icon = DOCTYPE_ICON[d.doctype as DoctypeKey] || FileText;
            return (
              <li key={d.id} className="flex items-center gap-3 py-3 group">
                <div className="w-10 h-10 rounded-2xl bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/career/builder/${d.id}`}
                      className="text-[13.5px] font-semibold text-[#111111] hover:text-[#4F7563] truncate"
                    >
                      {d.title}
                    </Link>
                    <span className="text-[10px] text-[#9A9A9A] uppercase tracking-wide font-semibold">
                      {DOCTYPE_LABEL[d.doctype as DoctypeKey] || d.doctype}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#9A9A9A]">
                    Updated {new Date(d.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/career/builder/${d.id}`}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[#6B6B6B] hover:bg-[#F1F0EC] hover:text-[#111111]"
                    title="Open"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={async () => { setBusy(d.id); try { await onExport(d.id, 'pdf', `${d.title}.pdf`); } finally { setBusy(null); } }}
                    disabled={busy === d.id}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[#6B6B6B] hover:bg-[#F1F0EC] hover:text-[#111111]"
                    title="Export PDF"
                  >
                    {busy === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => onDuplicate(d.id)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[#6B6B6B] hover:bg-[#F1F0EC] hover:text-[#111111]"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(d.id, d.title)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[#9a3737] hover:bg-[#F7E3E3]/60"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

// =============================================================================
//  Import history card
// =============================================================================
const ImportHistoryCard: React.FC<{ profile: CvProfileDto | null }> = ({ profile }) => {
  return (
    <div className="pn-card p-6 flex flex-col">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-full bg-[#FAEEDB] text-[#8c6210] flex items-center justify-center">
          <Upload className="w-4 h-4" />
        </div>
        <h3 className="pn-h2">Import history</h3>
      </div>

      {profile?.importSource ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-[#DDE8E1] bg-[#EEF5F1] p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#4F7563] mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#263F34]">Last import succeeded</div>
                <div className="text-[11px] text-[#355846] mt-0.5 truncate">Source: {profile.importSource}</div>
                {profile.importedAt && (
                  <div className="text-[11px] text-[#4F7563] mt-0.5">
                    {new Date(profile.importedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
          <a
            href="#career-import-panel"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#4F7563] hover:text-[#355846]"
          >
            Import another file <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <div className="w-12 h-12 rounded-full bg-[#F1F0EC] text-[#9A9A9A] flex items-center justify-center mb-3">
            <Inbox className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-[#111111] mb-1">No imports yet</p>
          <p className="text-[12px] text-[#6B6B6B] leading-snug max-w-[220px]">
            Upload a PDF, DOCX or paste your LinkedIn URL to populate your profile in seconds.
          </p>
          <a
            href="#career-import-panel"
            className="mt-4 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#111114] hover:bg-black text-white text-[12.5px] font-semibold"
          >
            <Upload className="w-3.5 h-3.5" /> Start import
          </a>
        </div>
      )}
    </div>
  );
};

// =============================================================================
//  Template gallery preview
// =============================================================================
const TemplateGalleryPreview: React.FC<{ items: any[]; loading: boolean }> = ({ items, loading }) => {
  if (loading && items.length === 0) {
    return (
      <div className="pn-card p-6">
        <h3 className="pn-h2 mb-4">Template gallery</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="pn-skeleton h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  if (items.length === 0) return null;
  const featured = items.slice(0, 8);
  return (
    <div className="pn-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="pn-h2">Template gallery</h3>
            <p className="text-[12px] text-[#9A9A9A]">Hand-tuned layouts for every career stage</p>
          </div>
        </div>
        <span className="text-[11px] text-[#9A9A9A] font-semibold uppercase tracking-wide">{items.length} templates</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {featured.map((t) => {
          const accent: string = t.layout?.accent || '#4F7563';
          return (
            <div key={t.id} className="rounded-2xl border border-[#E3E1DA]/70 bg-white p-4 hover:shadow-soft transition-shadow">
              <div className="relative h-24 rounded-xl bg-[#F7F6F2] mb-3 overflow-hidden">
                <div className="absolute top-3 left-3 right-3 h-1.5 rounded-full" style={{ background: accent }} />
                <div className="absolute top-7 left-3 right-3 space-y-1">
                  <div className="h-1.5 rounded bg-[#E3E1DA] w-2/3" />
                  <div className="h-1.5 rounded bg-[#E3E1DA] w-1/2" />
                  <div className="h-1.5 rounded bg-[#E3E1DA] w-3/4" />
                </div>
                <div className="absolute bottom-3 left-3 right-3 grid grid-cols-3 gap-1">
                  <div className="h-1 rounded bg-[#E3E1DA]" />
                  <div className="h-1 rounded bg-[#E3E1DA]" />
                  <div className="h-1 rounded bg-[#E3E1DA]" />
                </div>
              </div>
              <div className="text-[12.5px] font-semibold text-[#111111] truncate">{t.name}</div>
              <div className="text-[10.5px] text-[#9A9A9A] capitalize">{t.doctype} · {t.category}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
//  Import panel (file + LinkedIn) — encapsulates the long-lived import flow
//  + Phase 42.7/42.8/42.9 result/recovery cards.
// =============================================================================

interface ImportResult {
  filename:        string;
  warnings:        string[];
  counts:          Record<string, number>;
  debug?:          any;
  confidence?:     any;
  quality?:        any;
  failedMessage?:  string;
}

const ImportPanel: React.FC<{ profile: ReturnType<typeof useCvProfile> }> = ({ profile }) => {
  const [busy, setBusy] = useState(false);
  const [linkedinOpen, setLinkedinOpen] = useState(false);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<{ jobId: string; phase: string; percent: number; message: string; page?: number; pagesTotal?: number; packLang?: string; packPercent?: number; detectedLang?: string } | null>(null);

  const runImport = async (file: File, opts?: { forceOcr?: boolean; sectionMappings?: Record<string, string> }) => {
    setBusy(true); setLastImport(null); setProgress(null);
    const jobId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `j-${Date.now()}`);
    setProgress({ jobId, phase: 'queued', percent: 0, message: 'Queued' });
    try {
      const res = await profile.importFile(file, {
        ...opts,
        jobId,
        onProgress: (p) => setProgress((prev) => ({ ...(prev || { jobId } as any), ...p })),
      });
      const c: Record<string, number> = {};
      if (res?.profile) {
        c.Experience     = res.profile.experience?.length     || 0;
        c.Education      = res.profile.education?.length      || 0;
        c.Skills         = res.profile.skills?.length         || 0;
        c.Languages      = res.profile.languages?.length      || 0;
        c.Projects       = res.profile.projects?.length       || 0;
        c.Certifications = res.profile.certifications?.length || 0;
      }
      setLastImport({
        filename: file.name, warnings: res?.warnings || [], counts: c,
        debug: res?.debug, confidence: res?.confidence, quality: res?.quality,
      });
    } catch (e: any) {
      setLastImport({ filename: file.name, warnings: [], counts: {},
        failedMessage: e?.response?.data?.message || e?.message || 'Import failed' });
    } finally { setBusy(false); setTimeout(() => setProgress(null), 1500); }
  };

  const onCancel = async () => {
    if (progress?.jobId && profile.cancelImport) await profile.cancelImport(progress.jobId);
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setLastFile(file);
    await runImport(file);
  };

  return (
    <div className="pn-card p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#FAEEDB] text-[#8c6210] flex items-center justify-center">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h3 className="pn-h2">Import an existing CV</h3>
            <p className="text-[12px] text-[#9A9A9A]">PDF · DOCX · MD · HTML · LinkedIn (9 languages, OCR fallback)</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <label className={`relative rounded-3xl border-2 border-dashed border-[#A8B9AE] bg-[#EEF5F1] p-6 cursor-pointer hover:bg-[#DDE8E1] transition-colors flex items-center gap-3 ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="w-12 h-12 rounded-2xl bg-white text-[#4F7563] flex items-center justify-center shrink-0">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#263F34]">{busy ? 'Importing…' : 'Drop or click to upload'}</div>
            <div className="text-[11px] text-[#4F7563]">DOCX · PDF · MD · HTML — max 10 MB</div>
          </div>
          <input
            type="file" className="hidden"
            accept=".docx,.pdf,.md,.markdown,.html,.htm"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>

        <button
          type="button"
          onClick={() => setLinkedinOpen(true)}
          className="rounded-3xl border-2 border-dashed border-[#E3E1DA] bg-[#F7F6F2] p-6 hover:bg-white transition-colors flex items-center gap-3 text-left"
        >
          <div className="w-12 h-12 rounded-2xl bg-white text-[#111111] flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#111111]">Import from LinkedIn</div>
            <div className="text-[11px] text-[#9A9A9A]">Paste profile URL or exported JSON</div>
          </div>
        </button>
      </div>

      {busy && progress && progress.phase !== 'done' && (
        <ImportProgressCard p={progress} onCancel={onCancel} />
      )}

      {lastImport && (
        <ImportResultCard
          result={lastImport}
          onDismiss={() => setLastImport(null)}
          onRetryOcr={lastFile ? () => runImport(lastFile, { forceOcr: true }) : undefined}
          onApplyMappings={lastFile ? (m) => runImport(lastFile, { sectionMappings: m }) : undefined}
          busy={busy}
        />
      )}

      {linkedinOpen && (
        <LinkedInImportModal
          onClose={() => setLinkedinOpen(false)}
          onImport={async (payload) => {
            setBusy(true); setLastImport(null);
            try {
              const res = await profile.importLinkedIn(payload);
              setLinkedinOpen(false);
              const c: Record<string, number> = {};
              if ((res as any)?.profile) {
                const p2 = (res as any).profile;
                c.Experience     = p2.experience?.length     || 0;
                c.Education      = p2.education?.length      || 0;
                c.Skills         = p2.skills?.length         || 0;
                c.Languages      = p2.languages?.length      || 0;
                c.Certifications = p2.certifications?.length || 0;
              }
              setLastImport({ filename: 'LinkedIn', warnings: (res as any)?.warnings || [], counts: c });
            } catch (e: any) {
              setLastImport({ filename: 'LinkedIn', warnings: [], counts: {},
                failedMessage: e?.response?.data?.message || e?.message || 'Import failed' });
            } finally { setBusy(false); }
          }}
        />
      )}
    </div>
  );
};

// =============================================================================
//  Profile compact
// =============================================================================
const ProfileCompact: React.FC<{
  profile: CvProfileDto | null;
  loading: boolean;
  onPatch: (patch: any) => Promise<any>;
}> = ({ profile, loading, onPatch }) => {
  if (loading && !profile) {
    return (
      <div className="pn-card p-6 space-y-4">
        <div className="pn-skeleton h-6 w-1/4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="pn-skeleton h-10" />)}
        </div>
      </div>
    );
  }
  if (!profile) return null;
  const p = profile.personal || {};
  return (
    <div className="pn-card p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="pn-h2">Profile</h3>
            <p className="text-[12px] text-[#9A9A9A]">Used as the source for every CV / resume you create</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Full name"  value={p.fullName ?? ''} onChange={(v) => onPatch({ fullName: v })} />
        <Field label="Headline"   value={p.headline ?? ''} onChange={(v) => onPatch({ headline: v })} />
        <Field label="Email"      value={p.email ?? ''}    onChange={(v) => onPatch({ email: v })} />
        <Field label="Phone"      value={p.phone ?? ''}    onChange={(v) => onPatch({ phone: v })} />
        <Field label="Location"   value={p.location ?? ''} onChange={(v) => onPatch({ location: v })} />
        <Field label="Website"    value={p.website ?? ''}  onChange={(v) => onPatch({ website: v })} />
        <Field label="LinkedIn"   value={p.linkedin ?? ''} onChange={(v) => onPatch({ linkedin: v })} />
        <Field label="GitHub"     value={p.github ?? ''}   onChange={(v) => onPatch({ github: v })} />
      </div>
      <div className="mt-3">
        <label className="block text-xs font-semibold text-[#6B6B6B] mb-1.5">Summary</label>
        <textarea
          value={p.summary ?? ''}
          onChange={(e) => onPatch({ summary: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 bg-white border border-[#E3E1DA] rounded-[14px] text-sm text-[#111111] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#4F7563] focus:shadow-[0_0_0_3px_rgba(79,117,99,0.15)] transition resize-none"
        />
      </div>

      {/* Section counts */}
      <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 gap-2">
        {([
          ['Experience',    profile.experience.length],
          ['Education',     profile.education.length],
          ['Skills',        profile.skills.length],
          ['Languages',     profile.languages.length],
          ['Projects',      profile.projects.length],
          ['Certifications',profile.certifications.length],
        ] as [string, number][]).map(([label, n]) => (
          <div key={label} className="rounded-2xl border border-[#E3E1DA]/70 bg-[#F7F6F2] px-3 py-2.5">
            <div className="text-[9px] uppercase tracking-wider text-[#9A9A9A] font-semibold">{label}</div>
            <div className="text-lg font-bold text-[#111111]">{n}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
//  ImportProgressCard / ImportResultCard / Modals
//  Preserved from Phase 42.6/42.7/42.8/42.9 — light visual polish only.
// =============================================================================

const ImportProgressCard: React.FC<{
  p: { jobId: string; phase: string; percent: number; message: string; page?: number; pagesTotal?: number; packLang?: string; packPercent?: number; detectedLang?: string };
  onCancel: () => void;
}> = ({ p, onCancel }) => {
  const phaseLabel = (() => {
    switch (p.phase) {
      case 'queued':            return 'Queued';
      case 'extracting':        return 'Extracting text';
      case 'rendering':         return 'Rendering pages';
      case 'sampling-lang':     return (p as any).detectedLang ? `Detected language: ${((p as any).detectedLang || '').toUpperCase()}` : 'Detecting CV language…';
      case 'downloading-pack':  return (p as any).packLang ? `Downloading ${((p as any).packLang || '').toUpperCase()} OCR model… ${(p as any).packPercent ?? 0}%` : 'Downloading OCR model…';
      case 'ocr-page':          return p.page && p.pagesTotal ? `OCR page ${p.page} of ${p.pagesTotal}` : 'OCR';
      case 'classifying':       return 'Classifying sections';
      case 'persisting':        return 'Saving';
      case 'cancelled':         return 'Cancelled';
      case 'failed':            return 'Failed';
      default:                  return p.phase;
    }
  })();
  const v = Math.max(0, Math.min(100, p.percent || 0));
  return (
    <div className="mt-4 bg-[#EEF5F1] border border-[#DDE8E1] rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[#355846]" />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-bold text-[#1A2D24]">{phaseLabel}</div>
            <button onClick={onCancel}
              className="h-7 px-2.5 text-[11px] font-semibold border border-[#A8B9AE] hover:bg-white text-[#355846] rounded-full">
              Cancel
            </button>
          </div>
          <div className="text-[11px] text-[#263F34] mt-0.5">{p.message}</div>
          <div className="h-1.5 w-full bg-white/70 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-[#4F7563] transition-all" style={{ width: `${v}%` }} />
          </div>
          <div className="text-[10px] text-[#355846]/80 mt-1 flex items-center justify-between">
            <span>{v}%</span>
            {p.pagesTotal && <span>{p.page || 0} / {p.pagesTotal} pages</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

const ImportResultCard: React.FC<{
  result:          ImportResult;
  onDismiss:       () => void;
  onRetryOcr?:     () => void;
  onApplyMappings?: (mappings: Record<string, string>) => void;
  busy?:           boolean;
}> = ({ result, onDismiss, onRetryOcr, onApplyMappings, busy }) => {
  const total = Object.values(result.counts).reduce((s, n) => s + n, 0);
  const sparse = !result.failedMessage && total <= 0;
  const failed = !!result.failedMessage;
  const confidence = result.confidence as { overall?: number; band?: string; bands?: any } | undefined;
  const lowConfidence = (confidence?.overall ?? 100) < 70;
  const showRecovery = !failed && (sparse || lowConfidence || (result.quality?.unknownHeadings || []).length > 0);

  const tone =
    failed       ? 'bg-[#FCF1F1] border-[#F7E3E3] text-[#7a2929]' :
    showRecovery ? 'bg-[#FAEEDB] border-[#F2DCAE] text-[#8c6210]' :
                   'bg-[#EEF5F1] border-[#DDE8E1] text-[#1A2D24]';

  const [rawOpen, setRawOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <>
    <div className={`mt-4 border rounded-2xl p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        {failed ? <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          : showRecovery ? <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          : <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-sm font-bold">
              {failed  ? 'Import failed'
                : sparse ? `Imported "${result.filename}" — only personal info recognised`
                : showRecovery ? `Imported "${result.filename}" with warnings`
                : `Imported "${result.filename}"`}
            </span>
            {confidence?.overall != null && <ConfidenceBadge value={confidence.overall} band={confidence.band} />}
            {result.quality?.ocr?.used && (
              <span className="text-[9px] uppercase tracking-wide bg-[#DDE8E1] text-[#263F34] px-1.5 py-0.5 rounded">
                OCR ({result.quality.ocr.avgConfidence ?? '?'}%)
              </span>
            )}
            <button onClick={onDismiss} className="ml-auto text-[10px] opacity-70 hover:opacity-100 underline">dismiss</button>
          </div>

          {failed && <p className="text-[12px]">{result.failedMessage}</p>}

          {!failed && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {Object.entries(result.counts).map(([k, n]) => (
                <span key={k} className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${n > 0 ? 'bg-white/70' : 'bg-white/30 opacity-50'}`}>
                  {k} {n}
                </span>
              ))}
            </div>
          )}

          {confidence?.bands && (
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {(['heading','sections','skills','experience','education'] as const).map((k) => {
                const v = confidence.bands[k] ?? 0;
                const fill = v >= 80 ? 'bg-[#4F7563]' : v >= 60 ? 'bg-[#D9A441]' : 'bg-[#D96A6A]';
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between text-[9px] uppercase tracking-wide font-bold opacity-80">
                      <span>{k}</span><span>{v}</span>
                    </div>
                    <div className="h-1 w-full bg-white/50 rounded-full overflow-hidden">
                      <div className={`h-full ${fill}`} style={{ width: `${v}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {result.quality?.detected && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <div className="text-[9px] uppercase tracking-wide font-bold opacity-80">Detected</div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(result.quality.detected || []).map((s: string) =>
                    <span key={s} className="bg-[#DDE8E1] text-[#1A2D24] px-1 py-0.5 rounded font-mono text-[10px]">✓ {s}</span>)}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wide font-bold opacity-80">Missing</div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(result.quality.missing || []).map((s: string) =>
                    <span key={s} className="bg-white/60 text-[#6B6B6B] px-1 py-0.5 rounded font-mono text-[10px]">⚠ {s}</span>)}
                </div>
              </div>
            </div>
          )}

          {result.quality?.duplicates?.skills?.length > 0 && (
            <p className="mt-1.5 text-[10px] opacity-80">
              Detected duplicate skills: {result.quality.duplicates.skills.slice(0, 3).map((g: any) => `${g.canonical} (${g.variants.length})`).join(' · ')}
              {result.quality.duplicates.skills.length > 3 ? ' + more' : ''}
            </p>
          )}

          {result.warnings.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[11px] list-disc ml-4">
              {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}

          {showRecovery && !failed && (
            <div className="mt-3 border-t border-current/20 pt-2.5">
              <div className="text-[10px] uppercase tracking-wide font-bold opacity-80 mb-1.5">Recovery actions</div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/career/analyze"
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-[11px] font-semibold bg-[#111114] hover:bg-black text-white rounded-full">
                  <Sparkles className="w-3 h-3" /> Run deep analysis
                </Link>
                {onRetryOcr && (
                  <button onClick={onRetryOcr} disabled={busy}
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-[11px] font-semibold border border-current/30 hover:bg-white/40 rounded-full disabled:opacity-50">
                    <Eye className="w-3 h-3" /> Run OCR
                  </button>
                )}
                {(result.quality?.unknownHeadings || []).length > 0 && onApplyMappings && (
                  <button onClick={() => setMapOpen(true)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-[11px] font-semibold border border-current/30 hover:bg-white/40 rounded-full">
                    <FileText className="w-3 h-3" /> Map {result.quality.unknownHeadings.length} unknown heading(s)
                  </button>
                )}
                <button onClick={() => setRawOpen(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-[11px] font-semibold border border-current/30 hover:bg-white/40 rounded-full">
                  <Eye className="w-3 h-3" /> View extracted text
                </button>
              </div>
            </div>
          )}

          {result.debug && (
            <details className="mt-2 text-[10px]">
              <summary className="cursor-pointer font-mono opacity-80">Developer debug</summary>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <DebugBlock title="Mapped sections" value={JSON.stringify(result.debug.mappedSections, null, 2)} />
                <DebugBlock title="Detected headings" value={(result.debug.detectedHeadings || []).join('\n') || '— none —'} />
                <DebugBlock title="Unknown headings"  value={(result.debug.unknownHeadings  || []).join('\n') || '— none —'} />
                <DebugBlock title={`Raw text preview`} value={result.debug.rawTextPreview || ''} />
              </div>
            </details>
          )}
        </div>
      </div>
    </div>

    {rawOpen && result.debug && (
      <RawTextModal debug={result.debug} onClose={() => setRawOpen(false)} />
    )}
    {mapOpen && onApplyMappings && (
      <ManualMappingModal
        unknownHeadings={result.quality.unknownHeadings || []}
        onCancel={() => setMapOpen(false)}
        onApply={(m) => { setMapOpen(false); onApplyMappings(m); }}
      />
    )}
    </>
  );
};

const ConfidenceBadge: React.FC<{ value: number; band?: string }> = ({ value, band }) => {
  const tone = value >= 95 ? 'bg-[#4F7563] text-white'
             : value >= 80 ? 'bg-[#DDE8E1] text-[#263F34]'
             : value >= 65 ? 'bg-[#F5E1B7] text-[#8c6210]'
             : value >= 45 ? 'bg-[#F5E1B7] text-[#8c6210]'
             :               'bg-[#F7E3E3] text-[#7a2929]';
  return <span className={`text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${tone}`}>{value}/100 · {band || ''}</span>;
};

const RawTextModal: React.FC<{ debug: any; onClose: () => void }> = ({ debug, onClose }) => (
  <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
    <div className="bg-white rounded-[28px] w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-modal">
      <header className="px-6 py-4 border-b border-[#F1F0EC] flex items-center gap-2">
        <Eye className="w-4 h-4 text-[#4F7563]" />
        <h2 className="text-sm font-bold text-[#111111]">Extracted text preview</h2>
        <button onClick={onClose} className="ml-auto w-9 h-9 rounded-full text-[#6B6B6B] hover:bg-[#F1F0EC] flex items-center justify-center"><X className="w-4 h-4" /></button>
      </header>
      <div className="p-6 overflow-y-auto space-y-3">
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <DebugBlock title="Detected headings" value={(debug.detectedHeadings || []).join('\n') || '— none —'} />
          <DebugBlock title="Unknown headings"  value={(debug.unknownHeadings  || []).join('\n') || '— none —'} />
          <DebugBlock title="Mapped sections"   value={JSON.stringify(debug.mappedSections, null, 2)} />
          <DebugBlock title="Stats" value={`fallback used: ${String(debug.usedFallback)}\ntotal lines: ${debug.totalLines}`} />
        </div>
        <DebugBlock title={`Raw text (first ${debug.rawTextPreview?.length || 0} chars)`} value={debug.rawTextPreview || ''} />
      </div>
    </div>
  </div>
);

const ManualMappingModal: React.FC<{
  unknownHeadings: string[];
  onCancel: () => void;
  onApply:  (mappings: Record<string, string>) => void;
}> = ({ unknownHeadings, onCancel, onApply }) => {
  const targets = ['experience','education','skills','languages','projects','certifications','awards','publications','summary','references'];
  const [pick, setPick] = useState<Record<string, string>>({});
  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-[28px] w-full max-w-xl shadow-modal">
        <header className="px-6 py-4 border-b border-[#F1F0EC] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#4F7563]" />
          <h2 className="text-sm font-bold text-[#111111]">Map unknown section headings</h2>
          <button onClick={onCancel} className="ml-auto w-9 h-9 rounded-full text-[#6B6B6B] hover:bg-[#F1F0EC] flex items-center justify-center"><X className="w-4 h-4" /></button>
        </header>
        <div className="p-6 space-y-2 max-h-[60vh] overflow-y-auto">
          <p className="text-[11px] text-[#9A9A9A] mb-2">Pick a target for each heading. Leave blank to skip. We'll re-run the import with these mappings.</p>
          {unknownHeadings.map((h, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
              <div className="font-mono truncate bg-[#F7F6F2] border border-[#E3E1DA] rounded-xl px-3 py-2">{h}</div>
              <span className="text-[#C9C6BD]">→</span>
              <select value={pick[normaliseClient(h)] || ''}
                onChange={(e) => setPick((s) => ({ ...s, [normaliseClient(h)]: e.target.value }))}
                className="h-9 px-3 border border-[#E3E1DA] rounded-xl text-xs bg-white">
                <option value="">— skip —</option>
                {targets.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          ))}
        </div>
        <footer className="px-6 py-4 border-t border-[#F1F0EC] flex items-center justify-end gap-2">
          <button onClick={onCancel} className="h-9 px-3.5 text-[13px] font-semibold border border-[#E3E1DA] hover:bg-[#F7F6F2] rounded-2xl">Cancel</button>
          <button onClick={() => onApply(Object.fromEntries(Object.entries(pick).filter(([_, v]) => v)))}
            className="h-9 px-3.5 text-[13px] font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded-2xl">
            Re-import with mappings
          </button>
        </footer>
      </div>
    </div>
  );
};

function normaliseClient(s: string): string {
  return (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[:.!?–—\-_]+$/, '').replace(/^[:.!?–—\-_]+/, '')
    .replace(/\s{2,}/g, ' ').trim();
}

const DebugBlock: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div>
    <div className="text-[9px] uppercase tracking-wide opacity-70">{title}</div>
    <pre className="bg-white/70 border border-white/80 rounded-xl p-2 text-[10px] font-mono overflow-auto max-h-28 whitespace-pre-wrap">{value}</pre>
  </div>
);

const LinkedInImportModal: React.FC<{
  onClose:  () => void;
  onImport: (payload: any) => void | Promise<void>;
}> = ({ onClose, onImport }) => {
  const [mode, setMode] = useState<'url' | 'json'>('url');
  const [url,  setUrl]  = useState('');
  const [json, setJson] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true); setFormError(null);
    try {
      if (mode === 'url') {
        if (!url.trim()) { setFormError('Please enter a LinkedIn URL'); return; }
        await onImport({ url: url.trim() });
      } else {
        let payload: any;
        try { payload = JSON.parse(json); }
        catch { setFormError('That doesn\'t parse as valid JSON.'); return; }
        await onImport(payload);
      }
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-[28px] p-7 w-full max-w-lg shadow-modal">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="pn-h2">Import from LinkedIn</h2>
            <p className="text-[11px] text-[#9A9A9A] mt-1.5">Pulls your name, headline, experience, education and skills into the profile.</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full text-[#6B6B6B] hover:bg-[#F1F0EC] flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex gap-1 mb-3 border-b border-[#F1F0EC]">
          <button onClick={() => setMode('url')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 ${mode === 'url' ? 'border-[#4F7563] text-[#355846]' : 'border-transparent text-[#9A9A9A]'}`}>
            By URL
          </button>
          <button onClick={() => setMode('json')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 ${mode === 'json' ? 'border-[#4F7563] text-[#355846]' : 'border-transparent text-[#9A9A9A]'}`}>
            Paste exported JSON
          </button>
        </div>

        {mode === 'url' ? (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#6B6B6B]">LinkedIn profile URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/your-handle"
              className="w-full h-11 px-4 text-sm border border-[#E3E1DA] rounded-[14px] focus:outline-none focus:border-[#4F7563] focus:shadow-[0_0_0_3px_rgba(79,117,99,0.15)] transition" />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#6B6B6B]">Paste exported JSON</label>
            <textarea value={json} onChange={(e) => setJson(e.target.value)}
              rows={8}
              placeholder='{ "firstName": "...", "lastName": "...", "experience": [...] }'
              className="w-full px-4 py-3 text-xs font-mono border border-[#E3E1DA] rounded-[14px] resize-none focus:outline-none focus:border-[#4F7563] focus:shadow-[0_0_0_3px_rgba(79,117,99,0.15)] transition" />
            <p className="text-[10px] text-[#9A9A9A]">
              Get this by going to LinkedIn → Settings → "Get a copy of your data" → Download.
            </p>
          </div>
        )}

        {formError && (
          <div className="mt-3 bg-[#FCF1F1] border border-[#F7E3E3] text-[#7a2929] text-[11px] rounded-xl p-3">{formError}</div>
        )}
        <div className="flex gap-2 mt-4 pt-3 border-t border-[#F1F0EC]">
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 h-10 px-4 text-sm font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded-2xl disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Import
          </button>
          <button onClick={onClose}
            className="h-10 px-4 text-sm font-semibold border border-[#E3E1DA] hover:bg-[#F7F6F2] text-[#111111] rounded-2xl">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
//  Reusable field
// =============================================================================
const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <label className="block">
    <span className="block text-xs font-semibold text-[#6B6B6B] mb-1.5">{label}</span>
    <input value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full h-11 px-4 bg-white border border-[#E3E1DA] rounded-[14px] text-sm text-[#111111] focus:outline-none focus:border-[#4F7563] focus:shadow-[0_0_0_3px_rgba(79,117,99,0.15)] transition" />
  </label>
);
