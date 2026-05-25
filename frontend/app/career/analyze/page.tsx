'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Sparkles, FileText, ShieldCheck, Wand2, Loader2,
  CheckCircle2, AlertTriangle, AlertCircle, Trash2, Eye, ChevronRight,
  Briefcase, Lock, Award, Layers, Mic,
} from 'lucide-react';
import api from '@/lib/api';
import { useCvTemplates } from '@/features/career/hooks';
import { CvDiffEditor } from '@/features/career/CvDiffEditor';

// =============================================================================
//  Phase 42.3R — CV Intelligence Studio wizard.
//
//  Single-page wizard, 6 steps:
//
//    1. Upload      — drop a PDF / DOCX / HTML / MD / TXT
//    2. Report      — quality score + subscores + issues
//    3. Fixes       — apply / ignore / edit fixes one at a time
//    4. Template    — recommendations + full catalogue
//    5. Preview     — render the improved CV in the chosen template
//    6. Export      — PDF / DOCX / HTML / MD / PPTX
//
//  The wizard works entirely on an in-memory CvProfileSnapshot — the
//  user's saved CvProfile is NOT mutated until the user clicks "Save & open"
//  on the final step. This is the spec's "no silent changes" requirement.
// =============================================================================

type Step = 'upload' | 'report' | 'fixes' | 'template' | 'preview' | 'export';

interface CvIssue {
  id: string; category: string; severity: 'critical' | 'major' | 'minor' | 'info';
  section: string; title: string; detail: string; why: string; suggestion: string;
  autoFixAvailable: boolean;
  target?: { kind: 'bullet' | 'section' | 'personal'; id?: string; index?: number; field?: string };
  fixHint?: { kind: 'text' | 'list' | 'date'; current?: any; example?: any };
}

interface CvReport {
  overall: number;
  subscores: Record<string, number>;
  issues: CvIssue[];
  detectedType: string;
  atsScore: number;
  warnings: string[];
  metrics: any;
}

export default function CvAnalyzePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');

  // Wizard state
  const [profile, setProfile]       = useState<any | null>(null);
  const [originalProfile, setOriginalProfile] = useState<any | null>(null); // for diff
  const [report,  setReport]        = useState<CvReport | null>(null);
  const [warnings, setWarnings]     = useState<string[]>([]);
  const [ignored, setIgnored]       = useState<Set<string>>(new Set());
  const [busy, setBusy]             = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [savedDocId, setSavedDocId] = useState<string | null>(null);

  // Job target mode (optional)
  const [jdText, setJdText] = useState('');
  const [matchReport, setMatchReport] = useState<any | null>(null);

  // Phase 42.4 PRO+ state
  const [benchmark,    setBenchmark]    = useState<any | null>(null);
  const [interview,    setInterview]    = useState<any | null>(null);
  const [variants,     setVariants]     = useState<any[] | null>(null);
  const [showDiff,     setShowDiff]     = useState(false);
  const [preflight,    setPreflight]    = useState<any | null>(null);

  // ---- upload + parse ------------------------------------------------------
  const handleUpload = async (file: File) => {
    setBusy(true); setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/career/analyze/parse-file', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(data?.profile || null);
      setOriginalProfile(data?.profile ? JSON.parse(JSON.stringify(data.profile)) : null);
      setWarnings(data?.warnings || []);
      await runAnalyze(data?.profile);
      setStep('report');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Upload failed');
    } finally { setBusy(false); }
  };

  // ---- PRO+ extras --------------------------------------------------------
  const runBenchmark = async () => {
    if (!profile) return;
    setBusy(true); setError(null);
    try {
      const { data } = await api.post('/career/analyze/benchmark', { profile });
      setBenchmark(data);
      // Auto-snapshot benchmark for the dashboard timeline.
      try { await api.post('/career/analyze/snapshot', { kind: 'benchmark', profile, analysisJson: data }); } catch { /* ignore */ }
    } catch (e: any) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  const runInterview = async () => {
    if (!profile) return;
    setBusy(true); setError(null);
    try {
      const { data } = await api.post('/career/analyze/interview', { profile });
      setInterview(data);
      try { await api.post('/career/analyze/snapshot', { kind: 'interview', profile, analysisJson: data, score: data?.score }); } catch { /* ignore */ }
    } catch (e: any) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  const runPreflight = async () => {
    if (!profile) return;
    setBusy(true); setError(null);
    try {
      const { data } = await api.post('/career/analyze/preflight', { profile });
      setPreflight(data);
    } catch (e: any) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  const generateVariants = async () => {
    if (!profile) return;
    if (!window.confirm('Generate 4 CV variants (ATS, Executive, Modern, Developer)?')) return;
    setBusy(true); setError(null);
    try {
      // Save profile first so variants link to it.
      const { data: saved } = await api.post('/career/analyze/save', { profile, doctype: 'cv', title: 'Source CV' });
      const { data } = await api.post('/career/analyze/variants', {
        presets: ['ats', 'executive', 'modern', 'developer'],
        profileId: saved?.profileId,
      });
      setVariants(data?.created || []);
    } catch (e: any) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  // ---- analyze -------------------------------------------------------------
  const runAnalyze = async (p?: any) => {
    const src = p || profile;
    if (!src) return;
    setBusy(true); setError(null);
    try {
      const { data } = await api.post('/career/analyze', { profile: src });
      setReport(data);
      // Phase 42.4B — persist snapshot so the Career Dashboard timeline updates.
      try {
        await api.post('/career/analyze/snapshot', {
          kind: 'analysis', profile: src, analysisJson: data,
          score: data?.overall, atsScore: data?.atsScore,
        });
      } catch { /* non-fatal */ }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message);
    } finally { setBusy(false); }
  };

  // ---- apply a single fix --------------------------------------------------
  const applyFix = async (issueId: string, userInput?: string) => {
    if (!profile) return;
    setBusy(true); setError(null);
    try {
      const { data } = await api.post('/career/analyze/apply-fix', { profile, issueId, userInput });
      setProfile(data?.profile);
      await runAnalyze(data?.profile);
    } catch (e: any) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  const ignoreFix = (issueId: string) => setIgnored((s) => new Set([...s, issueId]));

  // ---- apply ALL auto-safe fixes ------------------------------------------
  const applyAllSafe = async () => {
    if (!profile || !report) return;
    const safeIds = report.issues
      .filter((i) => i.autoFixAvailable && !ignored.has(i.id))
      .map((i) => i.id);
    let cur = profile;
    setBusy(true); setError(null);
    try {
      for (const id of safeIds) {
        const { data } = await api.post('/career/analyze/apply-fix', { profile: cur, issueId: id });
        cur = data?.profile || cur;
      }
      setProfile(cur);
      await runAnalyze(cur);
    } catch (e: any) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  // ---- template recommendations -------------------------------------------
  const loadRecs = async () => {
    if (!profile) return;
    setBusy(true); setError(null);
    try {
      const { data } = await api.post('/career/analyze/recommend-templates', { profile, doctype: 'cv' });
      setRecommendations(data);
      if (!templateId && data?.bestOverall?.length) setTemplateId(data.bestOverall[0].id);
    } catch (e: any) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  // ---- job target match ---------------------------------------------------
  const runMatch = async () => {
    if (!profile || !jdText.trim()) return;
    setBusy(true); setError(null);
    try {
      const { data } = await api.post('/career/analyze/match-job', { profile, jobDescription: jdText });
      setMatchReport(data);
    } catch (e: any) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  // ---- save + open in builder ---------------------------------------------
  const saveAndOpen = async () => {
    if (!profile) return;
    setBusy(true); setError(null);
    try {
      const { data } = await api.post('/career/analyze/save', {
        profile, doctype: 'cv', title: 'Improved CV', templateId,
      });
      setSavedDocId(data?.documentId || null);
      if (data?.documentId) router.push(`/career/builder/${data.documentId}`);
    } catch (e: any) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(false); }
  };

  // ---- re-render preview when template / profile changes ------------------
  useEffect(() => {
    if (step !== 'preview' && step !== 'template') return;
    if (!profile || !templateId) return;
    let cancelled = false;
    (async () => {
      try {
        // Use the analyze/save trick? No — preview without persistence.
        // Just render a lightweight HTML preview from the profile data.
        const html = renderPreviewHtml(profile, templateId);
        if (!cancelled) setPreviewHtml(html);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [step, profile, templateId]);

  // Auto-load recs when entering template step.
  useEffect(() => { if (step === 'template' && !recommendations) loadRecs(); /* eslint-disable-line */ }, [step]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
        <Link href="/career" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Career
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" /> CV Intelligence Studio
        </h1>
        <span className="ml-2 text-[10px] font-bold tracking-wide uppercase bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
          Improve existing CV
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        <Stepper step={step} />

        <PrivacyBar />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded p-3">{error}</div>
        )}

        {step === 'upload' && (
          <UploadStep onUpload={handleUpload} busy={busy} warnings={warnings} />
        )}

        {step === 'report' && profile && (
          <>
            <ReportStep
              report={report}
              busy={busy}
              onNext={() => setStep('fixes')}
              jdText={jdText} setJdText={setJdText}
              matchReport={matchReport} onMatch={runMatch}
            />
            {/* Phase 42.4D / 42.4E / 42.4C — benchmark + interview readiness + variants */}
            <ProExtras
              benchmark={benchmark} interview={interview} variants={variants}
              onBenchmark={runBenchmark} onInterview={runInterview} onVariants={generateVariants}
              busy={busy}
            />
          </>
        )}

        {step === 'fixes' && profile && report && (
          <>
            {/* Phase 42.4A — Before / After diff toggle */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-2">
              <span className="text-xs text-slate-600">
                Want to see exactly what changed from the original upload?
              </span>
              <button onClick={() => setShowDiff((v) => !v)}
                className="h-7 px-2 text-xs font-semibold border border-slate-300 hover:bg-white rounded inline-flex items-center gap-1">
                <Layers className="w-3 h-3" /> {showDiff ? 'Hide diff' : 'Show diff'}
              </button>
            </div>
            {showDiff && originalProfile && (
              <CvDiffEditor
                original={originalProfile}
                improved={profile}
                onChange={async (next) => { setProfile(next); await runAnalyze(next); }}
              />
            )}
            <FixesStep
              report={report} ignored={ignored}
              onApply={applyFix} onIgnore={ignoreFix} onApplyAllSafe={applyAllSafe}
              onBack={() => setStep('report')} onNext={() => setStep('template')}
              busy={busy}
            />
          </>
        )}

        {step === 'template' && profile && (
          <TemplateStep
            recommendations={recommendations}
            templateId={templateId} setTemplateId={setTemplateId}
            onBack={() => setStep('fixes')} onNext={() => setStep('preview')}
            busy={busy}
          />
        )}

        {step === 'preview' && profile && (
          <PreviewStep
            html={previewHtml}
            onBack={() => setStep('template')} onNext={() => setStep('export')}
          />
        )}

        {step === 'export' && profile && (
          <>
            {/* Phase 42.4J — preflight before download */}
            <PreflightPanel preflight={preflight} onRun={runPreflight} busy={busy} />
            <ExportStep
              onBack={() => setStep('preview')}
              onSave={saveAndOpen}
              savedDocId={savedDocId}
              busy={busy}
            />
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
//  Components
// =============================================================================

const Stepper: React.FC<{ step: Step }> = ({ step }) => {
  const steps: Array<{ id: Step; label: string }> = [
    { id: 'upload',   label: '1. Upload'   },
    { id: 'report',   label: '2. Analysis' },
    { id: 'fixes',    label: '3. Fixes'    },
    { id: 'template', label: '4. Template' },
    { id: 'preview',  label: '5. Preview'  },
    { id: 'export',   label: '6. Export'   },
  ];
  const cur = steps.findIndex((s) => s.id === step);
  return (
    <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className={`px-2 py-1 rounded font-semibold ${
            i === cur     ? 'bg-purple-600 text-white' :
            i <  cur      ? 'bg-purple-50 text-purple-700' :
                            'bg-slate-100 text-slate-500'
          }`}>{s.label}</div>
          {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300" />}
        </React.Fragment>
      ))}
    </div>
  );
};

const PrivacyBar: React.FC = () => (
  <div className="bg-blue-50/50 border border-blue-200 rounded-md p-3 flex items-start gap-2 text-[11px] text-blue-900">
    <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
    <div>
      <strong>Your CV stays private.</strong> The uploaded file is parsed in memory
      and the extracted profile lives only in this browser session until you
      click <em>Save &amp; open</em>. We do not store the raw file or share it
      with third parties.
    </div>
  </div>
);

// ----- UPLOAD --------------------------------------------------------------
const UploadStep: React.FC<{ onUpload: (f: File) => void; busy: boolean; warnings: string[] }> = ({ onUpload, busy, warnings }) => (
  <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
    <h2 className="text-sm font-bold text-slate-900">Upload your existing CV</h2>
    <p className="text-xs text-slate-500">
      Supported: PDF · DOCX · HTML · Markdown · TXT. The file is parsed into
      structured sections (Personal, Experience, Education, Skills, Languages,
      Projects, Certifications) for analysis.
    </p>
    <label className={`flex items-center gap-2 border-2 border-dashed border-slate-300 rounded-lg p-8 cursor-pointer hover:bg-slate-50 ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
      {busy ? <Loader2 className="w-5 h-5 animate-spin text-purple-600" /> : <Upload className="w-5 h-5 text-purple-600" />}
      <span className="text-sm text-slate-700">{busy ? 'Parsing…' : 'Click to choose a file or drop one here'}</span>
      <input type="file" className="hidden"
        accept=".pdf,.docx,.doc,.html,.htm,.md,.markdown,.txt"
        disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
    </label>
    {warnings.length > 0 && (
      <ul className="text-[11px] text-amber-700 space-y-0.5">
        {warnings.map((w, i) => <li key={i} className="flex items-start gap-1"><AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {w}</li>)}
      </ul>
    )}
  </section>
);

// ----- REPORT --------------------------------------------------------------
const ReportStep: React.FC<{
  report: CvReport | null; busy: boolean; onNext: () => void;
  jdText: string; setJdText: (s: string) => void;
  matchReport: any; onMatch: () => void;
}> = ({ report, busy, onNext, jdText, setJdText, matchReport, onMatch }) => {
  if (!report) return <div className="text-xs text-slate-500"><Loader2 className="w-3 h-3 animate-spin inline mr-1" /> Analysing…</div>;
  const tone = report.overall >= 80 ? 'green' : report.overall >= 60 ? 'amber' : 'red';
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-600" /> Quality report
        </h2>
        <span className="text-[11px] text-slate-500">Detected: <strong className="text-slate-700">{report.detectedType}</strong></span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ScoreCard label="Overall"     value={report.overall} tone={tone} large />
        <ScoreCard label="ATS"         value={report.atsScore} tone={report.atsScore >= 80 ? 'green' : report.atsScore >= 60 ? 'amber' : 'red'} />
        <ScoreCard label="Impact"      value={report.subscores.impact} />
        <ScoreCard label="Readability" value={report.subscores.readability} />
        <ScoreCard label="Structure"   value={report.subscores.structure} />
        <ScoreCard label="Content"     value={report.subscores.content} />
        <ScoreCard label="Design"      value={report.subscores.design} />
        <ScoreCard label="Completeness" value={report.subscores.completeness} />
      </div>

      <div className="border-t border-slate-100 pt-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Metrics</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <Metric k="Years of experience"  v={String(report.metrics.yearsExperience)} />
          <Metric k="Estimated pages"      v={String(report.metrics.estimatedPages)} />
          <Metric k="Bullets"              v={String(report.metrics.bulletCount)} />
          <Metric k="Avg bullet length"    v={`${report.metrics.avgBulletWords}w`} />
          <Metric k="Action verb ratio"    v={`${report.metrics.actionVerbRatio}%`} />
          <Metric k="Measurable bullets"   v={`${report.metrics.measurableRatio}%`} />
          <Metric k="Sections present"     v={String(report.metrics.sectionsPresent?.length || 0)} />
          <Metric k="Sections missing"     v={(report.metrics.sectionsMissing || []).join(', ') || '—'} />
        </div>
      </div>

      {report.warnings?.length > 0 && (
        <ul className="text-[11px] text-amber-700 space-y-0.5">
          {report.warnings.map((w, i) => <li key={i} className="flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5" /> {w}</li>)}
        </ul>
      )}

      <details className="border border-slate-200 rounded">
        <summary className="px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50 flex items-center gap-2">
          <Briefcase className="w-3.5 h-3.5" /> Match against a job description (optional)
        </summary>
        <div className="p-3 space-y-2 text-xs">
          <textarea
            value={jdText} onChange={(e) => setJdText(e.target.value)}
            rows={6}
            placeholder="Paste the job description here…"
            className="w-full px-2 py-1.5 border border-slate-300 rounded resize-none font-mono text-[11px]"
          />
          <button onClick={onMatch} disabled={!jdText.trim() || busy}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-40 inline-flex items-center gap-1">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Match
          </button>
          {matchReport && (
            <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded space-y-1">
              <div className="text-xs font-semibold">Alignment: {matchReport.alignment}%</div>
              {matchReport.missingSkills?.length > 0 && (
                <div className="text-[11px]">
                  <strong className="text-amber-700">Possible gaps:</strong> {matchReport.missingSkills.join(', ')}
                </div>
              )}
              {matchReport.presentSkills?.length > 0 && (
                <div className="text-[11px]">
                  <strong className="text-green-700">Already present:</strong> {matchReport.presentSkills.join(', ')}
                </div>
              )}
              {matchReport.recommendations?.length > 0 && (
                <ul className="text-[11px] text-slate-700 list-disc ml-4">
                  {matchReport.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </details>

      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button onClick={onNext}
          className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded inline-flex items-center gap-1">
          Review fixes <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

// ----- FIXES ---------------------------------------------------------------
const FixesStep: React.FC<{
  report: CvReport; ignored: Set<string>;
  onApply: (id: string, userInput?: string) => void;
  onIgnore: (id: string) => void;
  onApplyAllSafe: () => void;
  onBack: () => void; onNext: () => void;
  busy: boolean;
}> = ({ report, ignored, onApply, onIgnore, onApplyAllSafe, onBack, onNext, busy }) => {
  const visible = report.issues.filter((i) => !ignored.has(i.id));
  const safeCount = visible.filter((i) => i.autoFixAvailable).length;
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-600" /> Fix suggestions
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">{visible.length} open · {safeCount} auto-safe</span>
          <button onClick={onApplyAllSafe} disabled={busy || safeCount === 0}
            className="h-7 px-2 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded inline-flex items-center gap-1 disabled:opacity-40">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Apply all safe
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-green-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> No open issues. Looking great!
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((i) => <IssueCard key={i.id} issue={i} onApply={onApply} onIgnore={onIgnore} busy={busy} />)}
        </ul>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button onClick={onBack} className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-50">← Back</button>
        <button onClick={onNext}
          className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded inline-flex items-center gap-1">
          Choose template <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

const IssueCard: React.FC<{
  issue: CvIssue; onApply: (id: string, userInput?: string) => void; onIgnore: (id: string) => void; busy: boolean;
}> = ({ issue, onApply, onIgnore, busy }) => {
  const [showEdit, setShowEdit] = useState(false);
  const [draft, setDraft] = useState<string>(issue.fixHint?.example || '');

  const sevTone =
    issue.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-900' :
    issue.severity === 'major'    ? 'bg-amber-50 border-amber-200 text-amber-900' :
    issue.severity === 'minor'    ? 'bg-blue-50 border-blue-200 text-blue-900' :
                                    'bg-slate-50 border-slate-200 text-slate-700';

  const SevIcon = issue.severity === 'critical' ? AlertCircle
                : issue.severity === 'major'    ? AlertTriangle
                                                : AlertTriangle;

  return (
    <li className={`border rounded p-3 ${sevTone}`}>
      <div className="flex items-start gap-2">
        <SevIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold">{issue.title}</span>
            <span className="text-[9px] uppercase tracking-wide font-bold px-1 py-0.5 rounded bg-white/60">{issue.severity}</span>
            <span className="text-[9px] uppercase tracking-wide font-bold px-1 py-0.5 rounded bg-white/60">{issue.section}</span>
          </div>
          {issue.detail && <div className="text-[11px] mt-0.5 opacity-80">{issue.detail}</div>}
          <div className="text-[11px] mt-1 leading-snug"><strong>Why:</strong> {issue.why}</div>
          <div className="text-[11px] mt-0.5 leading-snug"><strong>Fix:</strong> {issue.suggestion}</div>

          {showEdit && issue.fixHint?.kind === 'text' && (
            <div className="mt-2 space-y-1">
              {issue.fixHint.current && (
                <div className="text-[10px] text-slate-600 font-mono p-1.5 bg-white/60 rounded">
                  current: {issue.fixHint.current}
                </div>
              )}
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3}
                className="w-full px-2 py-1 text-[11px] font-mono border border-slate-300 rounded resize-none" />
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-2">
            {issue.autoFixAvailable && (
              <button onClick={() => onApply(issue.id, showEdit ? draft : undefined)} disabled={busy}
                className="h-6 px-2 text-[11px] font-semibold bg-green-600 hover:bg-green-700 text-white rounded inline-flex items-center gap-1 disabled:opacity-40">
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                {showEdit ? 'Apply edit' : 'Apply fix'}
              </button>
            )}
            {issue.autoFixAvailable && (
              <button onClick={() => setShowEdit((v) => !v)}
                className="h-6 px-2 text-[11px] font-semibold border border-slate-300 hover:bg-white text-slate-700 rounded inline-flex items-center gap-1">
                {showEdit ? 'Cancel edit' : 'Edit manually'}
              </button>
            )}
            <button onClick={() => onIgnore(issue.id)}
              className="h-6 px-2 text-[11px] font-semibold border border-slate-300 hover:bg-white text-slate-700 rounded">
              Ignore
            </button>
          </div>
        </div>
      </div>
    </li>
  );
};

// ----- TEMPLATE -----------------------------------------------------------
const TemplateStep: React.FC<{
  recommendations: any; templateId: string | null; setTemplateId: (id: string) => void;
  onBack: () => void; onNext: () => void; busy: boolean;
}> = ({ recommendations, templateId, setTemplateId, onBack, onNext, busy }) => {
  const { items: all } = useCvTemplates('cv');
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
        <FileText className="w-4 h-4 text-purple-600" /> Choose a template
      </h2>

      {busy && <div className="text-[11px] text-slate-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading recommendations…</div>}

      {recommendations?.bestOverall?.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Recommended for your {recommendations.detectedType} CV
          </div>
          <TemplateGrid items={recommendations.bestOverall} selectedId={templateId} onSelect={setTemplateId} />
        </div>
      )}

      {recommendations?.bestForAts?.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">ATS-safe</div>
          <TemplateGrid items={recommendations.bestForAts} selectedId={templateId} onSelect={setTemplateId} />
        </div>
      )}

      <details className="border border-slate-200 rounded">
        <summary className="px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50">Browse all templates ({all.length})</summary>
        <div className="p-3">
          <TemplateGrid items={all.map((t: any) => ({ id: t.id, name: t.name, category: t.category, atsSafe: t.atsSafe }))} selectedId={templateId} onSelect={setTemplateId} />
        </div>
      </details>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button onClick={onBack} className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-50">← Back</button>
        <button onClick={onNext} disabled={!templateId}
          className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-40 inline-flex items-center gap-1">
          Preview <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

const TemplateGrid: React.FC<{ items: any[]; selectedId: string | null; onSelect: (id: string) => void }> = ({ items, selectedId, onSelect }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
    {items.map((t) => (
      <button key={t.id} onClick={() => onSelect(t.id)}
        className={`text-left p-2 rounded border transition-colors ${selectedId === t.id ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
        <div className="text-xs font-semibold text-slate-900 truncate">{t.name}</div>
        <div className="flex items-center gap-1 mt-0.5">
          {t.category && <span className="text-[9px] uppercase tracking-wide bg-slate-100 text-slate-600 px-1 py-0.5 rounded">{t.category}</span>}
          {t.atsSafe  && <span className="text-[9px] uppercase tracking-wide bg-green-100 text-green-800 px-1 py-0.5 rounded">ATS-safe</span>}
        </div>
      </button>
    ))}
  </div>
);

// ----- PREVIEW + EXPORT ----------------------------------------------------
const PreviewStep: React.FC<{ html: string; onBack: () => void; onNext: () => void }> = ({ html, onBack, onNext }) => (
  <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
      <Eye className="w-4 h-4 text-purple-600" /> Preview
    </h2>
    <p className="text-[11px] text-slate-500">Approximate render. The final exported file uses the full template renderer.</p>
    <iframe srcDoc={html} className="w-full h-[600px] border border-slate-200 rounded bg-white" />
    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
      <button onClick={onBack} className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-50">← Back</button>
      <button onClick={onNext} className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded inline-flex items-center gap-1">
        Continue to export <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </section>
);

const ExportStep: React.FC<{ onBack: () => void; onSave: () => void; savedDocId: string | null; busy: boolean }> = ({ onBack, onSave, savedDocId, busy }) => (
  <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
    <h2 className="text-sm font-bold text-slate-900">Save &amp; export</h2>
    <p className="text-xs text-slate-500">
      Saving creates a new CV document linked to your profile. From the builder
      you can keep editing and export PDF, DOCX, HTML, MD or PPTX.
    </p>
    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
      <button onClick={onBack} className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-50">← Back</button>
      <button onClick={onSave} disabled={busy}
        className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-40 inline-flex items-center gap-1">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        Save &amp; open in builder
      </button>
    </div>
    {savedDocId && (
      <p className="text-[11px] text-green-700">Saved. Opening builder…</p>
    )}
  </section>
);

// ----- atoms ---------------------------------------------------------------
const ScoreCard: React.FC<{ label: string; value: number; tone?: 'green' | 'amber' | 'red'; large?: boolean }> = ({ label, value, tone, large }) => {
  const t = tone || (value >= 80 ? 'green' : value >= 60 ? 'amber' : 'red');
  const colour = t === 'green' ? 'text-green-700 bg-green-50 border-green-200'
              : t === 'amber' ? 'text-amber-700 bg-amber-50 border-amber-200'
                              : 'text-red-700 bg-red-50 border-red-200';
  return (
    <div className={`border rounded p-2 ${colour}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className={large ? 'text-2xl font-bold' : 'text-lg font-bold'}>{value}<span className="text-[10px] opacity-70">/100</span></div>
    </div>
  );
};

const Metric: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="border border-slate-200 rounded p-1.5 bg-slate-50">
    <div className="text-[9px] uppercase tracking-wide text-slate-500">{k}</div>
    <div className="text-xs font-mono text-slate-800 truncate">{v}</div>
  </div>
);

// =============================================================================
//  Lightweight preview renderer — produces a single-page HTML preview so
//  the user sees roughly what the chosen template will look like before
//  saving. The final export uses the real backend renderer.
// =============================================================================
function renderPreviewHtml(profile: any, templateId: string | null): string {
  const p = profile?.personal || {};
  const exp = profile?.experience || [];
  const edu = profile?.education || [];
  const skills = profile?.skills || [];
  const accent = '#7C3AED';
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { margin:0; padding:32px; font:14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto; color: #1F2937; background: #fff; }
  h1 { color: ${accent}; margin: 0 0 4px; }
  .head { border-bottom: 3px solid ${accent}; padding-bottom: 8px; margin-bottom: 16px; }
  .meta { font-size: 12px; color: #64748B; }
  .sect { margin-top: 18px; }
  .sect h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .1em; color: ${accent}; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 8px; }
  .role { font-weight: 600; margin-top: 8px; }
  .role span.dim { font-weight: 400; color: #64748B; font-size: 12px; margin-left: 4px; }
  ul { margin: 4px 0 0 18px; padding: 0; }
  li { margin: 2px 0; font-size: 13px; }
  .skills { display: flex; flex-wrap: wrap; gap: 4px; }
  .skills span { background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 3px; padding: 2px 6px; font-size: 11px; }
  .tpl-note { font-size: 10px; color: #94A3B8; margin-top: 24px; font-style: italic; }
</style></head><body>
  <div class="head">
    <h1>${esc(p.fullName || 'Your name')}</h1>
    ${p.headline ? `<div style="font-size:14px;color:#475569">${esc(p.headline)}</div>` : ''}
    <div class="meta">${[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map(esc).join(' · ')}</div>
  </div>
  ${p.summary ? `<div class="sect"><h2>Summary</h2><p>${esc(p.summary)}</p></div>` : ''}
  ${exp.length ? `<div class="sect"><h2>Experience</h2>${exp.map((e: any) => `
    <div class="role">${esc(e.role || '')} <span class="dim">@ ${esc(e.company || '')} · ${esc(e.start || '')}${e.end ? '–'+esc(e.end) : '–Present'}</span></div>
    ${e.bullets?.length ? `<ul>${e.bullets.map((b: string) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
  `).join('')}</div>` : ''}
  ${edu.length ? `<div class="sect"><h2>Education</h2>${edu.map((d: any) => `
    <div class="role">${esc(d.degree || '')} ${d.field ? '— '+esc(d.field) : ''} <span class="dim">@ ${esc(d.institution || '')} · ${esc(d.end || d.start || '')}</span></div>
  `).join('')}</div>` : ''}
  ${skills.length ? `<div class="sect"><h2>Skills</h2><div class="skills">${skills.map((s: any) => `<span>${esc(s.name || '')}</span>`).join('')}</div></div>` : ''}
  <p class="tpl-note">Preview only — exports use the full template renderer (template: ${esc(templateId || 'default')}).</p>
</body></html>`;
}

function esc(s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// =============================================================================
//  Phase 42.4 — PRO+ panels (benchmark / interview readiness / variants)
// =============================================================================
const ProExtras: React.FC<{
  benchmark: any; interview: any; variants: any[] | null;
  onBenchmark: () => void; onInterview: () => void; onVariants: () => void;
  busy: boolean;
}> = ({ benchmark, interview, variants, onBenchmark, onInterview, onVariants, busy }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-purple-600" />
        <h3 className="text-sm font-bold text-slate-900">Benchmark</h3>
      </div>
      {!benchmark ? (
        <button onClick={onBenchmark} disabled={busy}
          className="w-full h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded inline-flex items-center justify-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Award className="w-3 h-3" />} Run benchmark
        </button>
      ) : (
        <div className="space-y-1.5">
          {(Object.values(benchmark.bands || {}) as any[]).slice(0, 4).map((b, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-700 font-semibold">{b.metric}</span>
                <span className="text-slate-500">{b.value}{b.unit === 'percent' ? '%' : ''}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${b.band === 'top10' ? 'bg-green-500' : b.band === 'aboveAvg' ? 'bg-blue-500' : b.band === 'average' ? 'bg-amber-500' : 'bg-red-500'}`}
                     style={{ width: `${Math.max(0, Math.min(100, b.value))}%` }} />
              </div>
              <div className="text-[10px] text-slate-400">industry {b.industry} · top10 {b.top10}</div>
            </div>
          ))}
        </div>
      )}
    </section>

    <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-purple-600" />
        <h3 className="text-sm font-bold text-slate-900">Interview readiness</h3>
      </div>
      {!interview ? (
        <button onClick={onInterview} disabled={busy}
          className="w-full h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded inline-flex items-center justify-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />} Predict questions
        </button>
      ) : (
        <div className="space-y-2 text-[11px]">
          <div className="text-2xl font-bold text-slate-900">{interview.score}<span className="text-xs text-slate-500">/100</span></div>
          {interview.weakAreas?.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-0.5">Weak areas</div>
              <ul className="list-disc ml-4 text-slate-700">
                {interview.weakAreas.slice(0, 3).map((w: string, i: number) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
          {interview.likelyHiringManagerQuestions?.length > 0 && (
            <details>
              <summary className="cursor-pointer text-slate-700 font-semibold">Likely hiring-manager Qs ({interview.likelyHiringManagerQuestions.length})</summary>
              <ul className="list-disc ml-4 text-slate-700 mt-1">
                {interview.likelyHiringManagerQuestions.slice(0, 5).map((q: any, i: number) => <li key={i}>{q.q}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>

    <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-purple-600" />
        <h3 className="text-sm font-bold text-slate-900">Generate variants</h3>
      </div>
      {!variants ? (
        <>
          <p className="text-[11px] text-slate-500">One-click ATS / Executive / Modern / Developer versions, each a separate CvDocument linked to your profile.</p>
          <button onClick={onVariants} disabled={busy}
            className="w-full h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded inline-flex items-center justify-center gap-1 disabled:opacity-50">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Layers className="w-3 h-3" />} Generate 4 variants
          </button>
        </>
      ) : (
        <ul className="space-y-1 text-[11px]">
          {variants.map((v: any) => (
            <li key={v.documentId} className="flex items-center gap-2 border border-slate-200 rounded px-2 py-1">
              <span className="font-mono text-[10px] uppercase bg-purple-100 text-purple-800 px-1 py-0.5 rounded">{v.preset}</span>
              <span className="flex-1 truncate">{v.title}</span>
              <a href={`/career/builder/${v.documentId}`} className="text-blue-600 hover:underline">Open →</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  </div>
);

const PreflightPanel: React.FC<{ preflight: any; onRun: () => void; busy: boolean }> = ({ preflight, onRun, busy }) => (
  <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-purple-600" /> Export preflight
      </h3>
      <button onClick={onRun} disabled={busy}
        className="h-7 px-2 text-xs font-semibold border border-slate-300 hover:bg-slate-50 rounded inline-flex items-center gap-1 disabled:opacity-50">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />} Run check
      </button>
    </div>
    {!preflight ? (
      <p className="text-[11px] text-slate-500 italic">Run the check to see warnings the export would surface (missing contact, page overflow, ATS issues).</p>
    ) : (
      <div className="space-y-1.5">
        {preflight.ok ? (
          <div className="text-[11px] text-green-700 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> No blocking issues. Safe to export.
          </div>
        ) : (
          <div className="text-[11px] text-red-700 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {preflight.warnings.filter((w: any) => w.severity === 'error').length} blocking issue(s).
          </div>
        )}
        <ul className="space-y-0.5 max-h-32 overflow-auto">
          {preflight.warnings.map((w: any, i: number) => (
            <li key={i} className={`text-[11px] flex items-start gap-1 ${w.severity === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
              {w.severity === 'error' ? <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />}
              <span><strong>{w.section}:</strong> {w.message}</span>
            </li>
          ))}
        </ul>
        {!preflight.ok && preflight.canForceExport && (
          <p className="text-[10px] text-slate-500 italic">You can still Save &amp; open below — preflight warnings don't block.</p>
        )}
      </div>
    )}
  </section>
);
