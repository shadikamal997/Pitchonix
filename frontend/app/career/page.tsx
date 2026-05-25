'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import {
  Briefcase, FileText, Mail, Layout, Sparkles, User, Plus, Trash2, Copy,
  Download, Upload, ExternalLink, Loader2,
  CheckCircle2, AlertTriangle, XCircle, Eye, X,
} from 'lucide-react';
import { useCvProfile, useCvDocuments, useCvTemplates, CvDoctype } from '@/features/career/hooks';

// =============================================================================
//  Phase 42J — Career documents workspace.
//
//  Tabs:
//    1. Profile       — personal info + sections summary; import file/LinkedIn
//    2. CVs           — list of doctype='cv' documents
//    3. Resumes       — list of doctype='resume'
//    4. Cover Letters — list of doctype='coverLetter'
//    5. Portfolios    — list of doctype='portfolio'
//    6. Templates     — gallery (filterable by doctype + category)
// =============================================================================

type Tab = 'profile' | 'cv' | 'resume' | 'coverLetter' | 'portfolio' | 'templates';

const TABS: { id: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'profile',     label: 'Profile',       icon: User },
  { id: 'cv',          label: 'CVs',            icon: FileText },
  { id: 'resume',      label: 'Resumes',        icon: Briefcase },
  { id: 'coverLetter', label: 'Cover Letters',  icon: Mail },
  { id: 'portfolio',   label: 'Portfolios',     icon: Layout },
  { id: 'templates',   label: 'Templates',      icon: Sparkles },
];

export default function CareerWorkspacePage() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>('profile');

  // Phase 42 — auto-create when arriving via /career?create=cv|resume|...
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
        // Phase 42.6 — surface auto-create errors as a query param the page
        // can render inline; previously this was a window.alert.
        console.error('career auto-create failed:', e);
        router.replace(`/career?create_error=${encodeURIComponent(e?.response?.data?.message || e?.message || 'unknown')}`);
      }
    })();
  }, [params, router]);

  const createError = params?.get('create_error');

  return (
    <div className="min-h-screen bg-slate-50">
      {createError && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 text-xs px-6 py-2">
          Couldn't auto-create that document: {createError}.{' '}
          <button onClick={() => router.replace('/career')} className="underline">dismiss</button>
        </div>
      )}
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-900">← Back</Link>
        <div className="h-5 w-px bg-slate-200" />
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-slate-500" /> Career Documents
        </h1>
        {/* Phase 42.3R / 42.4G — CV Intelligence + Career Dashboard entry points */}
        <Link href="/career/dashboard"
          className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-md">
          <Layout className="w-3.5 h-3.5" /> Dashboard
        </Link>
        <Link href="/career/analyze"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-md">
          <Sparkles className="w-3.5 h-3.5" /> Improve Existing CV
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-[200px_1fr] gap-6">
        <nav className="space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded transition-colors ${
                tab === id ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </nav>

        <main className="bg-white border border-slate-200 rounded-lg p-6 min-h-[60vh]">
          {tab === 'profile'  && <ProfileTab />}
          {tab === 'cv'       && <DocumentList doctype="cv" label="CV" />}
          {tab === 'resume'   && <DocumentList doctype="resume" label="Resume" />}
          {tab === 'coverLetter' && <DocumentList doctype="coverLetter" label="Cover Letter" />}
          {tab === 'portfolio'   && <DocumentList doctype="portfolio" label="Portfolio" />}
          {tab === 'templates'   && <TemplatesTab />}
        </main>
      </div>
    </div>
  );
}

// =============================================================================
//  Profile tab
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

const ProfileTab: React.FC = () => {
  const { profile, loading, patchPersonal, importFile, importLinkedIn, cancelImport } = useCvProfile();
  const [busy, setBusy] = useState(false);
  const [linkedinOpen, setLinkedinOpen] = useState(false);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);
  // Phase 42.7 — keep the last uploaded file in memory so the Recovery
  // Center can retry with OCR / new mappings without asking the user to
  // re-select it from disk.
  const [lastFile, setLastFile] = useState<File | null>(null);
  if (loading && !profile) return <Loader />;
  if (!profile) return <div className="text-xs text-slate-500 italic">No profile.</div>;
  const p = profile.personal || {};

  // Phase 42.8A + 42.9A — live progress state (SSE-streamed, polling fallback).
  const [progress, setProgress] = useState<{ jobId: string; phase: string; percent: number; message: string; page?: number; pagesTotal?: number; packLang?: string; packPercent?: number; detectedLang?: string } | null>(null);

  const runImport = async (file: File, opts?: { forceOcr?: boolean; sectionMappings?: Record<string, string> }) => {
    setBusy(true); setLastImport(null); setProgress(null);
    const jobId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `j-${Date.now()}`);
    setProgress({ jobId, phase: 'queued', percent: 0, message: 'Queued' });
    try {
      const res = await importFile(file, {
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
        filename:   file.name,
        warnings:   res?.warnings || [],
        counts:     c,
        debug:      res?.debug,
        confidence: res?.confidence,
        quality:    res?.quality,
      });
    } catch (e: any) {
      setLastImport({
        filename: file.name, warnings: [], counts: {},
        failedMessage: e?.response?.data?.message || e?.message || 'Import failed',
      });
    } finally { setBusy(false); setTimeout(() => setProgress(null), 1500); }
  };

  const onCancel = async () => {
    if (progress?.jobId && cancelImport) await cancelImport(progress.jobId);
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setLastFile(file);
    await runImport(file);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <section>
        <h2 className="text-sm font-bold text-slate-900 mb-3">Personal information</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name"  value={p.fullName ?? ''} onChange={(v) => patchPersonal({ fullName: v })} />
          <Field label="Headline"   value={p.headline ?? ''} onChange={(v) => patchPersonal({ headline: v })} />
          <Field label="Email"      value={p.email ?? ''}    onChange={(v) => patchPersonal({ email: v })} />
          <Field label="Phone"      value={p.phone ?? ''}    onChange={(v) => patchPersonal({ phone: v })} />
          <Field label="Location"   value={p.location ?? ''} onChange={(v) => patchPersonal({ location: v })} />
          <Field label="Website"    value={p.website ?? ''}  onChange={(v) => patchPersonal({ website: v })} />
          <Field label="LinkedIn"   value={p.linkedin ?? ''} onChange={(v) => patchPersonal({ linkedin: v })} />
          <Field label="GitHub"     value={p.github ?? ''}   onChange={(v) => patchPersonal({ github: v })} />
        </div>
        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Summary</label>
          <textarea value={p.summary ?? ''} onChange={(e) => patchPersonal({ summary: e.target.value })}
            rows={4} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded resize-none" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-900 mb-2">Section counts</h2>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          {([
            ['Experience',    profile.experience.length],
            ['Education',     profile.education.length],
            ['Skills',        profile.skills.length],
            ['Languages',     profile.languages.length],
            ['Projects',      profile.projects.length],
            ['Certifications',profile.certifications.length],
            ['Awards',        profile.awards.length],
            ['Publications',  profile.publications.length],
            ['References',    profile.references.length],
          ] as [string, number][]).map(([label, n]) => (
            <div key={label} className="border border-slate-200 rounded px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
              <div className="text-lg font-bold">{n}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 italic mt-2">
          Use the builder UI on each document to edit sections in detail.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-900 mb-2">Import existing CV</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className={`inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded cursor-pointer hover:bg-slate-50 text-xs ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {busy ? 'Importing…' : 'Upload DOCX / PDF / MD / HTML'}
            <input type="file" className="hidden"
              accept=".docx,.pdf,.md,.markdown,.html,.htm"
              onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {/* Phase Ω.1 — LinkedIn import. Backend endpoint
              POST /career/profile/:id/import/linkedin existed; now reachable. */}
          <button
            type="button"
            onClick={() => setLinkedinOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-blue-300 rounded cursor-pointer hover:bg-blue-50 text-xs text-blue-700"
          >
            <Upload className="w-3 h-3" /> Import from LinkedIn
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          Runs through Universal Conversion → maps sections onto your profile.
        </p>

        {/* Phase 42.8A — live progress card while OCR runs */}
        {busy && progress && progress.phase !== 'done' && (
          <ImportProgressCard p={progress} onCancel={onCancel} />
        )}

        {/* Phase 42.6 + 42.7 — inline import-result card (replaces window.alert) */}
        {lastImport && (
          <ImportResultCard
            result={lastImport}
            onDismiss={() => setLastImport(null)}
            onRetryOcr={lastFile ? () => runImport(lastFile, { forceOcr: true }) : undefined}
            onApplyMappings={lastFile
              ? (mappings) => runImport(lastFile, { sectionMappings: mappings })
              : undefined}
            busy={busy}
          />
        )}
      </section>

      {linkedinOpen && (
        <LinkedInImportModal
          onClose={() => setLinkedinOpen(false)}
          onImport={async (payload) => {
            setBusy(true); setLastImport(null);
            try {
              const res = await importLinkedIn(payload);
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
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
};

// =============================================================================
//  Phase Ω.1 — LinkedIn import modal
//
//  Two paths because LinkedIn doesn't offer a public OAuth surface for
//  arbitrary apps without partnership: (1) paste the Profile JSON the user
//  exports from their LinkedIn settings, (2) paste a public profile URL
//  which the backend scrapes.
// =============================================================================
// =============================================================================
//  Phase 42.8A — Live OCR / import progress card.
//
//  Polled state — phase + percent + page count + message. Shows a cancel
//  button while phase is not done/failed/cancelled.
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
      case 'sampling-lang':     return (p as any).detectedLang
                                ? `Detected language: ${((p as any).detectedLang || '').toUpperCase()}`
                                : 'Detecting CV language…';
      case 'downloading-pack':  return (p as any).packLang
                                ? `Downloading ${((p as any).packLang || '').toUpperCase()} OCR model… ${(p as any).packPercent ?? 0}%`
                                : 'Downloading OCR model…';
      case 'ocr-page':          return p.page && p.pagesTotal ? `OCR page ${p.page} of ${p.pagesTotal}` : 'OCR';
      case 'classifying':       return 'Classifying sections';
      case 'persisting':        return 'Saving';
      case 'cancelled':         return 'Cancelled';
      case 'failed':            return 'Failed';
      default:                  return p.phase;
    }
  })();
  const v = Math.max(0, Math.min(100, p.percent || 0));
  const elapsed = (Date.now() - (p as any).startedAt) / 1000;
  return (
    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-bold text-blue-900">{phaseLabel}</div>
            <button onClick={onCancel}
              className="h-6 px-2 text-[11px] font-semibold border border-blue-300 hover:bg-white text-blue-700 rounded">
              Cancel
            </button>
          </div>
          <div className="text-[11px] text-blue-800 mt-0.5">{p.message}</div>
          <div className="h-1.5 w-full bg-white/70 rounded-full overflow-hidden mt-1.5">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${v}%` }} />
          </div>
          <div className="text-[10px] text-blue-700/80 mt-0.5 flex items-center justify-between">
            <span>{v}%</span>
            {p.pagesTotal && <span>{p.page || 0} / {p.pagesTotal} pages</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
//  Phase 42.6 + 42.7 — Import result card.
//
//  Shows a structured summary of what came out of the import + the new
//  PRO+ surfaces:
//    - 42.7D confidence bar (overall + per-band)
//    - 42.7E quality report (detected / missing sections)
//    - 42.7F raw text preview modal
//    - 42.7C manual section mapping for unknown headings
//    - 42.7J recovery panel (Run OCR / Map sections / View raw / Retry)
//    - 42.7H duplicate detection chips
// =============================================================================
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
    failed  ? 'bg-red-50 border-red-200 text-red-900' :
    showRecovery ? 'bg-amber-50 border-amber-200 text-amber-900' :
              'bg-green-50 border-green-200 text-green-900';

  const [rawOpen, setRawOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <>
    <div className={`mt-3 border rounded-lg p-3 ${tone}`}>
      <div className="flex items-start gap-2">
        {failed ? <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          : showRecovery ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          : <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-bold">
              {failed  ? 'Import failed'
                : sparse ? `Imported "${result.filename}" — only personal info recognised`
                : showRecovery ? `Imported "${result.filename}" with warnings`
                : `Imported "${result.filename}"`}
            </span>
            {confidence?.overall != null && <ConfidenceBadge value={confidence.overall} band={confidence.band} />}
            {result.quality?.ocr?.used && (
              <span className="text-[9px] uppercase tracking-wide bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
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

          {/* 42.7D — Confidence per-band bars */}
          {confidence?.bands && (
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {(['heading','sections','skills','experience','education'] as const).map((k) => {
                const v = confidence.bands[k] ?? 0;
                const fill = v >= 80 ? 'bg-green-600' : v >= 60 ? 'bg-amber-500' : 'bg-red-500';
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

          {/* 42.7E — Quality report (detected / missing) */}
          {result.quality?.detected && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <div className="text-[9px] uppercase tracking-wide font-bold opacity-80">Detected</div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(result.quality.detected || []).map((s: string) =>
                    <span key={s} className="bg-green-100 text-green-900 px-1 py-0.5 rounded font-mono text-[10px]">✓ {s}</span>)}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wide font-bold opacity-80">Missing</div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(result.quality.missing || []).map((s: string) =>
                    <span key={s} className="bg-white/60 text-slate-600 px-1 py-0.5 rounded font-mono text-[10px]">⚠ {s}</span>)}
                </div>
              </div>
            </div>
          )}

          {/* 42.7H — duplicate detection */}
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

          {/* 42.7J — Recovery Center */}
          {showRecovery && !failed && (
            <div className="mt-3 border-t border-current/20 pt-2.5">
              <div className="text-[10px] uppercase tracking-wide font-bold opacity-80 mb-1.5">Recovery actions</div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/career/analyze"
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded">
                  <Sparkles className="w-3 h-3" /> Run deep analysis
                </Link>
                {onRetryOcr && (
                  <button onClick={onRetryOcr} disabled={busy}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold border border-current/30 hover:bg-white/40 rounded disabled:opacity-50">
                    <Eye className="w-3 h-3" /> Run OCR
                  </button>
                )}
                {(result.quality?.unknownHeadings || []).length > 0 && onApplyMappings && (
                  <button onClick={() => setMapOpen(true)}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold border border-current/30 hover:bg-white/40 rounded">
                    <FileText className="w-3 h-3" /> Map {result.quality.unknownHeadings.length} unknown heading(s)
                  </button>
                )}
                <button onClick={() => setRawOpen(true)}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold border border-current/30 hover:bg-white/40 rounded">
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
  const tone = value >= 95 ? 'bg-green-600 text-white'
             : value >= 80 ? 'bg-green-100 text-green-800'
             : value >= 65 ? 'bg-amber-100 text-amber-800'
             : value >= 45 ? 'bg-orange-100 text-orange-800'
             :               'bg-red-100 text-red-800';
  return <span className={`text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded ${tone}`}>{value}/100 · {band || ''}</span>;
};

// 42.7F — Raw extraction modal
const RawTextModal: React.FC<{ debug: any; onClose: () => void }> = ({ debug, onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
      <header className="px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
        <Eye className="w-4 h-4 text-purple-600" />
        <h2 className="text-sm font-bold">Extracted text preview</h2>
        <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
      </header>
      <div className="p-4 overflow-y-auto space-y-3">
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

// 42.7C — Manual section mapping modal
const ManualMappingModal: React.FC<{
  unknownHeadings: string[];
  onCancel: () => void;
  onApply:  (mappings: Record<string, string>) => void;
}> = ({ unknownHeadings, onCancel, onApply }) => {
  const targets = ['experience','education','skills','languages','projects','certifications','awards','publications','summary','references'];
  const [pick, setPick] = useState<Record<string, string>>({});
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-xl">
        <header className="px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-bold">Map unknown section headings</h2>
          <button onClick={onCancel} className="ml-auto text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </header>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          <p className="text-[11px] text-slate-500 mb-2">Pick a target for each heading. Leave blank to skip. We'll re-run the import with these mappings.</p>
          {unknownHeadings.map((h, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
              <div className="font-mono truncate bg-slate-50 border border-slate-200 rounded px-2 py-1">{h}</div>
              <span className="text-slate-400">→</span>
              <select value={pick[normaliseClient(h)] || ''}
                onChange={(e) => setPick((s) => ({ ...s, [normaliseClient(h)]: e.target.value }))}
                className="h-7 px-2 border border-slate-300 rounded text-xs bg-white">
                <option value="">— skip —</option>
                {targets.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          ))}
        </div>
        <footer className="px-4 py-2.5 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="h-7 px-2.5 text-xs font-semibold border border-slate-300 hover:bg-slate-50 rounded">Cancel</button>
          <button onClick={() => onApply(Object.fromEntries(Object.entries(pick).filter(([_, v]) => v)))}
            className="h-7 px-2.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded">
            Re-import with mappings
          </button>
        </footer>
      </div>
    </div>
  );
};

function normaliseClient(s: string): string {
  // Mirrors backend normaliseLatin (sufficient for matching keys in sectionMappings)
  return (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[:.!?–—\-_]+$/, '').replace(/^[:.!?–—\-_]+/, '')
    .replace(/\s{2,}/g, ' ').trim();
}

const DebugBlock: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div>
    <div className="text-[9px] uppercase tracking-wide opacity-70">{title}</div>
    <pre className="bg-white/70 border border-white/80 rounded p-1.5 text-[10px] font-mono overflow-auto max-h-28 whitespace-pre-wrap">{value}</pre>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 w-full max-w-lg">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Import from LinkedIn</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Pulls your name, headline, experience, education and skills into the profile.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">×</button>
        </div>

        <div className="flex gap-1 mb-3 border-b border-slate-200">
          <button onClick={() => setMode('url')}
            className={`px-2 py-1.5 text-xs font-semibold border-b-2 ${mode === 'url' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
            By URL
          </button>
          <button onClick={() => setMode('json')}
            className={`px-2 py-1.5 text-xs font-semibold border-b-2 ${mode === 'json' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'}`}>
            Paste exported JSON
          </button>
        </div>

        {mode === 'url' ? (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">LinkedIn profile URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/your-handle"
              className="w-full h-8 px-2 text-xs border border-slate-300 rounded" />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Paste exported JSON</label>
            <textarea value={json} onChange={(e) => setJson(e.target.value)}
              rows={8}
              placeholder='{ "firstName": "...", "lastName": "...", "experience": [...] }'
              className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded resize-none" />
            <p className="text-[10px] text-slate-500">
              Get this by going to LinkedIn → Settings → "Get a copy of your data" → Download.
            </p>
          </div>
        )}

        {formError && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-800 text-[11px] rounded p-2">{formError}</div>
        )}
        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 inline-flex items-center justify-center gap-1">
            {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
            Import
          </button>
          <button onClick={onClose}
            className="h-8 px-3 text-xs font-semibold border border-slate-300 hover:bg-slate-50 text-slate-700 rounded">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
//  Document list tab (CV / Resume / Cover Letter / Portfolio)
// =============================================================================

const DocumentList: React.FC<{ doctype: CvDoctype; label: string }> = ({ doctype, label }) => {
  const { items, create, remove, duplicate, exportDoc } = useCvDocuments(doctype);
  const [busy, setBusy] = useState<string | null>(null);

  const createNew = async () => {
    const title = window.prompt(`Title for the new ${label}:`, `Untitled ${label}`);
    if (!title) return;
    await create({ doctype, title });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">{label}s ({items.length})</h2>
        <button onClick={createNew} className="h-7 px-2 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-1">
          <Plus className="w-3 h-3" /> New {label}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-slate-500 italic py-8 text-center border border-dashed border-slate-200 rounded">
          No {label.toLowerCase()}s yet. Click "New {label}" to start.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((d) => (
            <li key={d.id} className="bg-white border border-slate-200 rounded p-3 space-y-1.5">
              <div className="text-xs font-bold text-slate-900 truncate">{d.title}</div>
              {d.variant && <div className="text-[10px] text-slate-500 truncate">variant: {d.variant}</div>}
              <div className="text-[9px] text-slate-400 font-mono">{new Date(d.updatedAt).toLocaleString()}</div>
              <div className="flex flex-wrap gap-1 pt-1">
                <Link href={`/career/builder/${d.id}`}
                  className="flex-1 h-7 text-[10px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center justify-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Open
                </Link>
                <button onClick={async () => { setBusy(d.id); try { await exportDoc(d.id, 'pdf', `${d.title}.pdf`); } finally { setBusy(null); } }}
                  disabled={busy === d.id}
                  className="h-7 px-2 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded hover:bg-slate-200 inline-flex items-center gap-1 disabled:opacity-40">
                  {busy === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} PDF
                </button>
                <button onClick={async () => { setBusy(d.id); try { await exportDoc(d.id, 'docx', `${d.title}.docx`); } finally { setBusy(null); } }}
                  disabled={busy === d.id}
                  className="h-7 px-2 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded hover:bg-slate-200 inline-flex items-center gap-1 disabled:opacity-40">
                  <Download className="w-3 h-3" /> DOCX
                </button>
                <button onClick={() => duplicate(d.id)}
                  className="h-7 px-2 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded hover:bg-slate-200 inline-flex items-center gap-1">
                  <Copy className="w-3 h-3" />
                </button>
                <button onClick={() => { if (window.confirm(`Delete "${d.title}"?`)) remove(d.id); }}
                  className="h-7 px-2 text-[10px] font-semibold bg-red-50 text-red-700 rounded hover:bg-red-100">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// =============================================================================
//  Templates tab
// =============================================================================

const TemplatesTab: React.FC = () => {
  const [doctype, setDoctype] = useState<CvDoctype | ''>('');
  const { items, loading } = useCvTemplates(doctype || undefined);
  const groups = items.reduce((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {} as Record<string, typeof items>);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Templates ({items.length})</h2>
        <select value={doctype} onChange={(e) => setDoctype((e.target.value as any) || '')}
          className="h-7 px-2 text-xs border border-slate-300 rounded">
          <option value="">All doctypes</option>
          <option value="cv">CV</option>
          <option value="resume">Resume</option>
          <option value="coverLetter">Cover Letter</option>
          <option value="portfolio">Portfolio</option>
        </select>
      </div>
      {loading && items.length === 0 && <Loader />}
      {Object.entries(groups).map(([cat, list]) => (
        <section key={cat}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{cat} ({list.length})</div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {list.map((t) => (
              <li key={t.id} className="border border-slate-200 rounded p-3 hover:border-blue-400 transition-colors">
                <div className="text-xs font-semibold">{t.name}</div>
                <div className="text-[10px] text-slate-500 capitalize">{t.doctype}</div>
                <div className="mt-2 h-1 rounded" style={{ background: t.layout?.accent || '#E2E8F0' }} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

// =============================================================================
//  Helpers
// =============================================================================

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <label className="text-xs">
    <span className="block font-semibold text-slate-700 mb-1">{label}</span>
    <input value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full h-8 px-2 text-xs border border-slate-300 rounded" />
  </label>
);

const Loader: React.FC = () => (
  <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>
);
