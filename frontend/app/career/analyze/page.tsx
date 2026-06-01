'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Sparkles, FileText, ShieldCheck, Wand2, Loader2,
  CheckCircle2, AlertTriangle, AlertCircle, Trash2, Eye, ChevronRight,
  Briefcase, Lock, Award, Layers, Mic, Bug, ChevronDown,
} from 'lucide-react';
import api from '@/lib/api';
import { useCvTemplates } from '@/features/career/hooks';
import { useConfirm } from '@/components/ConfirmDialog';
import { CvDiffEditor } from '@/features/career/CvDiffEditor';
import { TemplateRadar, TemplateRadarCompare, type TemplateInsightAxes } from '@/features/career/TemplateRadar';

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
  const confirm = useConfirm();
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

  // Import debug trace (dev-mode only, from parse-file response)
  const [importDebug, setImportDebug] = useState<any | null>(null);

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
      setImportDebug(data?.debug || null);
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
    if (!(await confirm({ title: 'Generate 4 CV variants?', message: 'We\'ll create separate documents for ATS, Executive, Modern, and Developer styles. You can keep, edit or delete any of them.', confirmLabel: 'Generate' }))) return;
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
        const { data } = await api.post('/career/analyze/preview', {
          profile,
          templateId,
          doctype: 'cv',
          title: 'CV Preview',
        });
        if (!cancelled) setPreviewHtml(data?.html || '');
      } catch (e: any) {
        if (!cancelled) {
          setPreviewHtml(`<div style="padding:24px;font-family:system-ui;color:#7a2929">Preview unavailable: ${esc(e?.message || 'render failed')}</div>`);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [step, profile, templateId]);

  // Auto-load recs when entering template step.
  useEffect(() => { if (step === 'template' && !recommendations) loadRecs(); /* eslint-disable-line */ }, [step]);

  return (
    <div className="min-h-screen bg-[#EDEBE6]">
      <header className="bg-white border-b border-[#E3E1DA] px-6 h-14 flex items-center gap-3">
        <Link href="/career" className="text-xs text-[#9A9A9A] hover:text-[#111111] flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Career
        </Link>
        <div className="h-5 w-px bg-[#E3E1DA]" />
        <h1 className="text-base font-bold text-[#111111] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#4F7563]" /> CV Intelligence Studio
        </h1>
        <span className="ml-2 text-[10px] font-bold tracking-wide uppercase bg-[#DDE8E1] text-purple-800 px-1.5 py-0.5 rounded">
          Improve existing CV
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        <Stepper step={step} onStepClick={setStep} />

        <PrivacyBar />

        {error && (
          <div className="bg-[#FCF1F1] border border-[#F7E3E3] text-[#7a2929] text-xs rounded p-3">{error}</div>
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
              onSkipToTemplate={() => setStep('template')}
              jdText={jdText} setJdText={setJdText}
              matchReport={matchReport} onMatch={runMatch}
            />
            {/* Import trace panel — only shown when debug data is available (dev mode) */}
            {importDebug && <ImportTracePanel debug={importDebug} warnings={warnings} />}
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
            <div className="flex items-center justify-between bg-[#EDEBE6] border border-[#E3E1DA] rounded p-2">
              <span className="text-xs text-[#6B6B6B]">
                Want to see exactly what changed from the original upload?
              </span>
              <button onClick={() => setShowDiff((v) => !v)}
                className="h-7 px-2 text-xs font-semibold border border-[#C9C6BD] hover:bg-white rounded inline-flex items-center gap-1">
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
              onSkipToTemplate={() => setStep('template')}
              busy={busy}
            />
          </>
        )}

        {step === 'template' && profile && (
          <TemplateStep
            recommendations={recommendations}
            templateId={templateId} setTemplateId={setTemplateId}
            onBack={() => setStep('fixes')} onNext={() => setStep('preview')}
            onSaveAndOpen={saveAndOpen}
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

const Stepper: React.FC<{ step: Step; onStepClick?: (s: Step) => void }> = ({ step, onStepClick }) => {
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
          <button
            onClick={() => { if (i < cur) onStepClick?.(s.id); }}
            disabled={i >= cur}
            className={`px-2 py-1 rounded font-semibold transition-colors ${
              i === cur ? 'bg-purple-600 text-white cursor-default' :
              i <  cur  ? 'bg-[#EEF5F1] text-[#355846] hover:bg-[#DDE8E1] cursor-pointer' :
                          'bg-[#F1F0EC] text-[#9A9A9A] cursor-default'
            }`}>{s.label}</button>
          {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-[#C9C6BD]" />}
        </React.Fragment>
      ))}
    </div>
  );
};

const PrivacyBar: React.FC = () => (
  <div className="bg-[#EEF5F1]/50 border border-[#DDE8E1] rounded-md p-3 flex items-start gap-2 text-[11px] text-[#1A2D24]">
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
  <section className="bg-white border border-[#E3E1DA] rounded-lg p-6 space-y-4">
    <h2 className="text-sm font-bold text-[#111111]">Upload your existing CV</h2>
    <p className="text-xs text-[#9A9A9A]">
      Supported: PDF · DOCX · HTML · Markdown · TXT. The file is parsed into
      structured sections (Personal, Experience, Education, Skills, Languages,
      Projects, Certifications) for analysis.
    </p>
    <label className={`flex items-center gap-2 border-2 border-dashed border-[#C9C6BD] rounded-lg p-8 cursor-pointer hover:bg-[#EDEBE6] ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
      {busy ? <Loader2 className="w-5 h-5 animate-spin text-[#4F7563]" /> : <Upload className="w-5 h-5 text-[#4F7563]" />}
      <span className="text-sm text-[#111111]">{busy ? 'Parsing…' : 'Click to choose a file or drop one here'}</span>
      <input type="file" className="hidden"
        accept=".pdf,.docx,.doc,.html,.htm,.md,.markdown,.txt"
        disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
    </label>
    {warnings.length > 0 && (
      <ul className="text-[11px] text-[#735008] space-y-0.5">
        {warnings.map((w, i) => <li key={i} className="flex items-start gap-1"><AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {w}</li>)}
      </ul>
    )}
  </section>
);

// ----- REPORT --------------------------------------------------------------
const ReportStep: React.FC<{
  report: CvReport | null; busy: boolean; onNext: () => void; onSkipToTemplate: () => void;
  jdText: string; setJdText: (s: string) => void;
  matchReport: any; onMatch: () => void;
}> = ({ report, busy, onNext, onSkipToTemplate, jdText, setJdText, matchReport, onMatch }) => {
  if (!report) return <div className="text-xs text-[#9A9A9A]"><Loader2 className="w-3 h-3 animate-spin inline mr-1" /> Analysing…</div>;
  const tone = report.overall >= 80 ? 'green' : report.overall >= 60 ? 'amber' : 'red';
  return (
    <section className="bg-white border border-[#E3E1DA] rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#111111] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#4F7563]" /> Quality report
        </h2>
        <span className="text-[11px] text-[#9A9A9A]">Detected: <strong className="text-[#111111]">{report.detectedType}</strong></span>
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

      <div className="border-t border-[#F1F0EC] pt-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-1">Metrics</div>
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
        <ul className="text-[11px] text-[#735008] space-y-0.5">
          {report.warnings.map((w, i) => <li key={i} className="flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5" /> {w}</li>)}
        </ul>
      )}

      <details className="border border-[#E3E1DA] rounded">
        <summary className="px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-[#EDEBE6] flex items-center gap-2">
          <Briefcase className="w-3.5 h-3.5" /> Match against a job description (optional)
        </summary>
        <div className="p-3 space-y-2 text-xs">
          <textarea
            value={jdText} onChange={(e) => setJdText(e.target.value)}
            rows={6}
            placeholder="Paste the job description here…"
            className="w-full px-2 py-1.5 border border-[#C9C6BD] rounded resize-none font-mono text-[11px]"
          />
          <button onClick={onMatch} disabled={!jdText.trim() || busy}
            className="px-3 py-1.5 text-xs font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded disabled:opacity-40 inline-flex items-center gap-1">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Match
          </button>
          {matchReport && (
            <div className="mt-2 p-2 bg-[#EDEBE6] border border-[#E3E1DA] rounded space-y-1">
              <div className="text-xs font-semibold">Alignment: {matchReport.alignment}%</div>
              {matchReport.missingSkills?.length > 0 && (
                <div className="text-[11px]">
                  <strong className="text-[#735008]">Possible gaps:</strong> {matchReport.missingSkills.join(', ')}
                </div>
              )}
              {matchReport.presentSkills?.length > 0 && (
                <div className="text-[11px]">
                  <strong className="text-[#355846]">Already present:</strong> {matchReport.presentSkills.join(', ')}
                </div>
              )}
              {matchReport.recommendations?.length > 0 && (
                <ul className="text-[11px] text-[#111111] list-disc ml-4">
                  {matchReport.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </details>

      <div className="flex items-center justify-between pt-2 border-t border-[#F1F0EC]">
        <button onClick={onNext}
          className="px-3 py-1.5 text-xs font-semibold border border-[#C9C6BD] rounded hover:bg-[#EDEBE6] inline-flex items-center gap-1">
          Review fixes first
        </button>
        <button onClick={onSkipToTemplate}
          className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded inline-flex items-center gap-1">
          Continue to Template <ChevronRight className="w-4 h-4" />
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
  onBack: () => void; onNext: () => void; onSkipToTemplate: () => void;
  busy: boolean;
}> = ({ report, ignored, onApply, onIgnore, onApplyAllSafe, onBack, onNext, onSkipToTemplate, busy }) => {
  const visible = report.issues.filter((i) => !ignored.has(i.id));
  const safeCount = visible.filter((i) => i.autoFixAvailable).length;
  return (
    <section className="bg-white border border-[#E3E1DA] rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#111111] flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-[#4F7563]" /> Fix suggestions
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#9A9A9A]">{visible.length} open · {safeCount} auto-safe</span>
          <button onClick={onApplyAllSafe} disabled={busy || safeCount === 0}
            className="h-7 px-2 text-xs font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded inline-flex items-center gap-1 disabled:opacity-40">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Apply all safe
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bg-[#EEF5F1] border border-[#DDE8E1] rounded p-4 text-sm text-[#1A2D24] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> No open issues. Looking great!
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((i) => <IssueCard key={i.id} issue={i} onApply={onApply} onIgnore={onIgnore} busy={busy} />)}
        </ul>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[#F1F0EC]">
        <button onClick={onBack} className="px-3 py-1.5 text-xs font-semibold border border-[#C9C6BD] rounded hover:bg-[#EDEBE6]">← Back</button>
        <div className="flex items-center gap-2">
          <button onClick={onSkipToTemplate}
            className="px-3 py-1.5 text-xs font-semibold border border-[#C9C6BD] rounded hover:bg-[#EDEBE6]">
            Skip fixes →
          </button>
          <button onClick={onNext}
            className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded inline-flex items-center gap-1">
            Done, choose template <ChevronRight className="w-4 h-4" />
          </button>
        </div>
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
    issue.severity === 'critical' ? 'bg-[#FCF1F1] border-[#F7E3E3] text-red-900' :
    issue.severity === 'major'    ? 'bg-[#FAEEDB] border-[#F2DCAE] text-amber-900' :
    issue.severity === 'minor'    ? 'bg-[#EEF5F1] border-[#DDE8E1] text-[#1A2D24]' :
                                    'bg-[#EDEBE6] border-[#E3E1DA] text-[#111111]';

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
                <div className="text-[10px] text-[#6B6B6B] font-mono p-1.5 bg-white/60 rounded">
                  current: {issue.fixHint.current}
                </div>
              )}
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3}
                className="w-full px-2 py-1 text-[11px] font-mono border border-[#C9C6BD] rounded resize-none" />
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-2">
            {issue.autoFixAvailable && (
              <button onClick={() => onApply(issue.id, showEdit ? draft : undefined)} disabled={busy}
                className="h-6 px-2 text-[11px] font-semibold bg-[#4F7563] hover:bg-[#355846] text-white rounded inline-flex items-center gap-1 disabled:opacity-40">
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                {showEdit ? 'Apply edit' : 'Apply fix'}
              </button>
            )}
            {issue.autoFixAvailable && (
              <button onClick={() => setShowEdit((v) => !v)}
                className="h-6 px-2 text-[11px] font-semibold border border-[#C9C6BD] hover:bg-white text-[#111111] rounded inline-flex items-center gap-1">
                {showEdit ? 'Cancel edit' : 'Edit manually'}
              </button>
            )}
            <button onClick={() => onIgnore(issue.id)}
              className="h-6 px-2 text-[11px] font-semibold border border-[#C9C6BD] hover:bg-white text-[#111111] rounded">
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
  onBack: () => void; onNext: () => void; onSaveAndOpen: () => void; busy: boolean;
}> = ({ recommendations, templateId, setTemplateId, onBack, onNext, onSaveAndOpen, busy }) => {
  const { items: all } = useCvTemplates('cv');
  // Phase 42.5A — fetch radar insights for every template.
  const [insights, setInsights] = useState<any[]>([]);
  const insightById = React.useMemo(() => {
    const m = new Map<string, any>();
    insights.forEach((i) => m.set(i.id, i));
    return m;
  }, [insights]);
  useEffect(() => {
    (async () => {
      try { const { data } = await api.get('/career/templates/insights?doctype=cv'); setInsights(Array.isArray(data) ? data : []); }
      catch { /* non-fatal */ }
    })();
  }, []);

  // Compare drawer state — pick a second template to overlay against the selected one.
  const [compareWith, setCompareWith] = useState<string | null>(null);

  const selectedInsight = templateId ? insightById.get(templateId) : null;
  const compareInsight  = compareWith ? insightById.get(compareWith) : null;

  return (
    <section className="bg-white border border-[#E3E1DA] rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-bold text-[#111111] flex items-center gap-2">
        <FileText className="w-4 h-4 text-[#4F7563]" /> Choose a template
      </h2>

      {busy && <div className="text-[11px] text-[#9A9A9A] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading recommendations…</div>}

      {/* Phase 42.5A — radar panel for the selected template */}
      {selectedInsight && (
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 border border-[#DDE8E1] bg-[#EEF5F1]/40 rounded-lg p-3">
          <div className="flex flex-col items-center">
            {compareInsight ? (
              <TemplateRadarCompare
                a={selectedInsight.axes} aLabel={selectedInsight.name}
                b={compareInsight.axes}  bLabel={compareInsight.name}
                size={200}
              />
            ) : (
              <TemplateRadar axes={selectedInsight.axes} size={180} />
            )}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#111111]">{selectedInsight.name}</span>
              <span className="text-[10px] text-[#9A9A9A]">Best for <strong>{selectedInsight.bestFor}</strong> · balanced {selectedInsight.balanced}/100</span>
              {selectedInsight.badges?.map((b: string) => (
                <span key={b} className="text-[9px] uppercase tracking-wide bg-white border border-[#DDE8E1] text-purple-800 px-1 py-0.5 rounded">{b}</span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['ats','visual','executive','creative','readability','print'] as const).map((k) => {
                const v = selectedInsight.axes[k];
                const tone = v >= 80 ? 'bg-[#DDE8E1] text-[#263F34]' : v >= 60 ? 'bg-[#F5E1B7] text-amber-800' : 'bg-[#F7E3E3] text-[#7a2929]';
                return (
                  <div key={k} className="flex items-center justify-between text-[11px] border border-[#E3E1DA] rounded px-1.5 py-1 bg-white">
                    <span className="capitalize text-[#6B6B6B]">{k}</span>
                    <span className={`text-[10px] font-bold px-1 rounded ${tone}`}>{v}</span>
                  </div>
                );
              })}
            </div>
            <div className="pt-1 text-[11px] text-[#6B6B6B]">
              Compare with:
              <select
                value={compareWith || ''}
                onChange={(e) => setCompareWith(e.target.value || null)}
                className="ml-2 h-7 px-2 text-xs border border-[#C9C6BD] rounded bg-white max-w-[220px]"
              >
                <option value="">— none —</option>
                {insights.filter((i) => i.id !== templateId).slice(0, 30).map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {recommendations?.bestOverall?.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-1.5">
            Recommended for your {recommendations.detectedType} CV
          </div>
          <TemplateGrid items={recommendations.bestOverall} selectedId={templateId} onSelect={setTemplateId} insights={insightById} />
        </div>
      )}

      {recommendations?.bestForAts?.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-1.5">ATS-safe</div>
          <TemplateGrid items={recommendations.bestForAts} selectedId={templateId} onSelect={setTemplateId} insights={insightById} />
        </div>
      )}

      <details className="border border-[#E3E1DA] rounded">
        <summary className="px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-[#EDEBE6]">Browse all templates ({all.length})</summary>
        <div className="p-3">
          <TemplateGrid items={all.map((t: any) => ({ id: t.id, name: t.name, category: t.category, atsSafe: t.atsSafe }))} selectedId={templateId} onSelect={setTemplateId} insights={insightById} />
        </div>
      </details>

      <div className="flex items-center justify-between pt-2 border-t border-[#F1F0EC]">
        <button onClick={onBack} className="px-3 py-1.5 text-xs font-semibold border border-[#C9C6BD] rounded hover:bg-[#EDEBE6]">← Back</button>
        <div className="flex items-center gap-2">
          <button onClick={onNext} disabled={!templateId}
            className="px-3 py-1.5 text-xs font-semibold border border-[#C9C6BD] rounded hover:bg-[#EDEBE6] disabled:opacity-40">
            Preview first
          </button>
          <button onClick={onSaveAndOpen} disabled={!templateId || busy}
            className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-40 inline-flex items-center gap-1">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Create CV &amp; Open Builder
          </button>
        </div>
      </div>
    </section>
  );
};

const TemplateGrid: React.FC<{
  items: any[]; selectedId: string | null; onSelect: (id: string) => void;
  insights?: Map<string, any>;
}> = ({ items, selectedId, onSelect, insights }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
    {items.map((t) => {
      const ins = insights?.get(t.id);
      return (
      <button key={t.id} onClick={() => onSelect(t.id)}
        className={`text-left p-2 rounded border transition-colors flex gap-2 ${selectedId === t.id ? 'border-purple-500 bg-[#EEF5F1]' : 'border-[#E3E1DA] hover:border-[#C9C6BD] bg-white'}`}>
        {ins && (
          <TemplateRadar axes={ins.axes} size={56} showLabels={false} className="flex-shrink-0 opacity-90" />
        )}
        <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-[#111111] truncate">{t.name}</div>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {t.category && <span className="text-[9px] uppercase tracking-wide bg-[#F1F0EC] text-[#6B6B6B] px-1 py-0.5 rounded">{t.category}</span>}
          {t.atsSafe  && <span className="text-[9px] uppercase tracking-wide bg-[#DDE8E1] text-[#263F34] px-1 py-0.5 rounded">ATS-safe</span>}
        </div>
        {ins && (
          <div className="text-[10px] text-[#9A9A9A] mt-1 font-mono">
            ATS {ins.axes.ats} · Vis {ins.axes.visual} · Exec {ins.axes.executive}
          </div>
        )}
        </div>
      </button>
      );
    })}
  </div>
);

// ----- PREVIEW + EXPORT ----------------------------------------------------
const PreviewStep: React.FC<{ html: string; onBack: () => void; onNext: () => void }> = ({ html, onBack, onNext }) => (
  <section className="bg-white border border-[#E3E1DA] rounded-lg p-5 space-y-3">
    <h2 className="text-sm font-bold text-[#111111] flex items-center gap-2">
      <Eye className="w-4 h-4 text-[#4F7563]" /> Preview
    </h2>
    <p className="text-[11px] text-[#9A9A9A]">Rendered with the same backend template engine used by the builder and export.</p>
    <iframe srcDoc={html} className="w-full h-[600px] border border-[#E3E1DA] rounded bg-white" />
    <div className="flex items-center justify-between pt-2 border-t border-[#F1F0EC]">
      <button onClick={onBack} className="px-3 py-1.5 text-xs font-semibold border border-[#C9C6BD] rounded hover:bg-[#EDEBE6]">← Back</button>
      <button onClick={onNext} className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded inline-flex items-center gap-1">
        Continue to export <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </section>
);

const ExportStep: React.FC<{ onBack: () => void; onSave: () => void; savedDocId: string | null; busy: boolean }> = ({ onBack, onSave, savedDocId, busy }) => (
  <section className="bg-white border border-[#E3E1DA] rounded-lg p-5 space-y-3">
    <h2 className="text-sm font-bold text-[#111111]">Save &amp; export</h2>
    <p className="text-xs text-[#9A9A9A]">
      Saving creates a new CV document linked to your profile. From the builder
      you can keep editing and export PDF, DOCX, HTML, MD or PPTX.
    </p>
    <div className="flex items-center justify-between pt-2 border-t border-[#F1F0EC]">
      <button onClick={onBack} className="px-3 py-1.5 text-xs font-semibold border border-[#C9C6BD] rounded hover:bg-[#EDEBE6]">← Back</button>
      <button onClick={onSave} disabled={busy}
        className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-40 inline-flex items-center gap-1">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        Save &amp; open in builder
      </button>
    </div>
    {savedDocId && (
      <p className="text-[11px] text-[#355846]">Saved. Opening builder…</p>
    )}
  </section>
);

// ----- atoms ---------------------------------------------------------------
const ScoreCard: React.FC<{ label: string; value: number; tone?: 'green' | 'amber' | 'red'; large?: boolean }> = ({ label, value, tone, large }) => {
  const t = tone || (value >= 80 ? 'green' : value >= 60 ? 'amber' : 'red');
  const colour = t === 'green' ? 'text-[#355846] bg-[#EEF5F1] border-[#DDE8E1]'
              : t === 'amber' ? 'text-[#735008] bg-[#FAEEDB] border-[#F2DCAE]'
                              : 'text-[#7a2929] bg-[#FCF1F1] border-[#F7E3E3]';
  return (
    <div className={`border rounded p-2 ${colour}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className={large ? 'text-2xl font-bold' : 'text-lg font-bold'}>{value}<span className="text-[10px] opacity-70">/100</span></div>
    </div>
  );
};

const Metric: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="border border-[#E3E1DA] rounded p-1.5 bg-[#EDEBE6]">
    <div className="text-[9px] uppercase tracking-wide text-[#9A9A9A]">{k}</div>
    <div className="text-xs font-mono text-[#111111] truncate">{v}</div>
  </div>
);

function esc(s: any): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// =============================================================================
//  Import Trace Panel — dev-mode only, shows parsed sections + bullet counts
// =============================================================================
const ImportTracePanel: React.FC<{ debug: any; warnings: string[] }> = ({ debug, warnings }) => {
  const [open, setOpen] = useState(false);
  const [showRawLines, setShowRawLines] = useState(false);

  const expAfter: any[] = debug?.parsedExpAfter || [];
  const expBefore: any[] = debug?.parsedExpBefore || [];
  const totalBullets = expAfter.reduce((s: number, e: any) => s + (e.bulletCount || 0), 0);
  const thinEntries = expAfter.filter((e: any) => (e.bulletCount || 0) < 3);

  return (
    <section className="bg-[#FFFBF0] border border-[#F2DCAE] rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-[#735008] hover:bg-[#FFF3CC]/40"
      >
        <span className="flex items-center gap-2">
          <Bug className="w-3.5 h-3.5" />
          Import trace
          <span className="text-[10px] font-normal text-[#9A9A9A]">
            {expAfter.length} exp entries · {totalBullets} bullets · {debug?.totalLines ?? 0} lines
          </span>
          {thinEntries.length > 0 && (
            <span className="text-[9px] uppercase tracking-wide bg-[#F7E3E3] text-[#7a2929] px-1.5 py-0.5 rounded font-bold">
              {thinEntries.length} thin
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 text-[11px]">

          {/* Completeness warnings */}
          {thinEntries.length > 0 && (
            <div className="bg-[#FCF1F1] border border-[#F7E3E3] rounded p-3 space-y-1">
              <div className="font-bold text-[#7a2929] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Completeness warnings
              </div>
              {thinEntries.map((e: any, i: number) => (
                <div key={i} className="text-[#7a2929]">
                  "{e.role || '(no role)'}" @ {e.company || '(no company)'} — only {e.bulletCount} bullet(s). Expected ≥ 3.
                </div>
              ))}
            </div>
          )}

          {/* Import warnings */}
          {warnings.length > 0 && (
            <div className="bg-[#FAEEDB] border border-[#F2DCAE] rounded p-3 space-y-0.5">
              <div className="font-bold text-[#735008]">Import warnings</div>
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1 text-[#735008]">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {w}
                </div>
              ))}
            </div>
          )}

          {/* Sections detected */}
          <div>
            <div className="font-bold text-[#111111] mb-1.5">Sections detected</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(debug?.mappedSections || {}).map(([k, v]: [string, any]) => (
                <span key={k} className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                  (v as number) > 0 ? 'bg-[#EEF5F1] border-[#DDE8E1] text-[#263F34]' : 'bg-[#F1F0EC] border-[#E3E1DA] text-[#9A9A9A]'
                }`}>
                  {k}: {v as number}
                </span>
              ))}
              {debug?.usedFallback && (
                <span className="text-[10px] px-2 py-0.5 rounded font-mono border bg-[#FAEEDB] border-[#F2DCAE] text-[#735008]">
                  fallback heuristic
                </span>
              )}
            </div>
          </div>

          {/* Experience entries (after semantics) */}
          {expAfter.length > 0 && (
            <div>
              <div className="font-bold text-[#111111] mb-1.5">Experience entries (after enrichment)</div>
              <div className="space-y-2">
                {expAfter.map((e: any, i: number) => (
                  <div key={i} className={`border rounded p-2.5 ${(e.bulletCount || 0) < 3 ? 'border-[#F7E3E3] bg-[#FCF1F1]' : 'border-[#E3E1DA] bg-white'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-[#111111]">{e.role || <em className="text-[#9A9A9A]">no role</em>}</div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${
                        (e.bulletCount || 0) >= 5 ? 'bg-[#DDE8E1] text-[#263F34]' :
                        (e.bulletCount || 0) >= 3 ? 'bg-[#F5E1B7] text-amber-800' :
                        'bg-[#F7E3E3] text-[#7a2929]'
                      }`}>
                        {e.bulletCount} bullet{e.bulletCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-[#6B6B6B] mt-0.5">
                      {e.company || <em>no company</em>}
                      {(e.start || e.end) && <span className="ml-2 text-[#9A9A9A] font-mono">{e.start}–{e.end || 'present'}</span>}
                      {e.location && <span className="ml-2 text-[#9A9A9A]">· {e.location}</span>}
                    </div>
                    {e.bullets?.length > 0 && (
                      <ul className="mt-1.5 ml-3 list-disc space-y-0.5 text-[#111111]">
                        {e.bullets.map((b: string, j: number) => <li key={j}>{b}</li>)}
                      </ul>
                    )}
                    {e.achievements?.length > 0 && (
                      <ul className="mt-1 ml-3 list-disc space-y-0.5 text-[#355846]">
                        {e.achievements.map((b: string, j: number) => <li key={j}>{b}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Before/after bullet count comparison */}
          {expBefore.length > 0 && (
            <details className="border border-[#E3E1DA] rounded">
              <summary className="px-3 py-2 cursor-pointer font-semibold hover:bg-[#EDEBE6] flex items-center gap-2">
                Before semantic enrichment ({expBefore.length} entries)
              </summary>
              <div className="p-3 space-y-1.5">
                {expBefore.map((e: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 border border-[#E3E1DA] rounded px-2.5 py-1.5 bg-white">
                    <span className="flex-1 truncate font-mono text-[10px] text-[#111111]">
                      {e.role || '(no role)'} {e.company ? `@ ${e.company}` : ''}
                    </span>
                    <span className="text-[10px] font-mono text-[#9A9A9A]">{e.start}–{e.end || 'present'}</span>
                    <span className="text-[10px] font-bold font-mono bg-[#F1F0EC] px-1.5 py-0.5 rounded">
                      {e.bulletCount} bullets
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Raw lines toggle */}
          <div>
            <button
              onClick={() => setShowRawLines((v) => !v)}
              className="text-[11px] font-semibold text-[#4F7563] hover:underline flex items-center gap-1"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${showRawLines ? 'rotate-180' : ''}`} />
              {showRawLines ? 'Hide' : 'Show'} all extracted lines ({debug?.allLines?.length ?? 0})
            </button>
            {showRawLines && (
              <pre className="mt-2 p-2 bg-[#F1F0EC] border border-[#E3E1DA] rounded text-[10px] font-mono whitespace-pre-wrap max-h-64 overflow-auto text-[#111111]">
                {(debug?.allLines || []).map((l: string, i: number) => `${String(i + 1).padStart(3, ' ')}  ${l}`).join('\n')}
              </pre>
            )}
          </div>

        </div>
      )}
    </section>
  );
};

// =============================================================================
//  Phase 42.4 — PRO+ panels (benchmark / interview readiness / variants)
// =============================================================================
const ProExtras: React.FC<{
  benchmark: any; interview: any; variants: any[] | null;
  onBenchmark: () => void; onInterview: () => void; onVariants: () => void;
  busy: boolean;
}> = ({ benchmark, interview, variants, onBenchmark, onInterview, onVariants, busy }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <section className="bg-white border border-[#E3E1DA] rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-[#4F7563]" />
        <h3 className="text-sm font-bold text-[#111111]">Benchmark</h3>
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
                <span className="text-[#111111] font-semibold">{b.metric}</span>
                <span className="text-[#9A9A9A]">{b.value}{b.unit === 'percent' ? '%' : ''}</span>
              </div>
              <div className="h-1.5 bg-[#F1F0EC] rounded-full overflow-hidden">
                <div className={`h-full ${b.band === 'top10' ? 'bg-[#4F7563]' : b.band === 'aboveAvg' ? 'bg-[#4F7563]' : b.band === 'average' ? 'bg-[#D9A441]' : 'bg-[#D96A6A]'}`}
                     style={{ width: `${Math.max(0, Math.min(100, b.value))}%` }} />
              </div>
              <div className="text-[10px] text-[#C9C6BD]">industry {b.industry} · top10 {b.top10}</div>
            </div>
          ))}
        </div>
      )}
    </section>

    <section className="bg-white border border-[#E3E1DA] rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-[#4F7563]" />
        <h3 className="text-sm font-bold text-[#111111]">Interview readiness</h3>
      </div>
      {!interview ? (
        <button onClick={onInterview} disabled={busy}
          className="w-full h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded inline-flex items-center justify-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />} Predict questions
        </button>
      ) : (
        <div className="space-y-2 text-[11px]">
          <div className="text-2xl font-bold text-[#111111]">{interview.score}<span className="text-xs text-[#9A9A9A]">/100</span></div>
          {interview.weakAreas?.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#9A9A9A] mb-0.5">Weak areas</div>
              <ul className="list-disc ml-4 text-[#111111]">
                {interview.weakAreas.slice(0, 3).map((w: string, i: number) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
          {interview.likelyHiringManagerQuestions?.length > 0 && (
            <details>
              <summary className="cursor-pointer text-[#111111] font-semibold">Likely hiring-manager Qs ({interview.likelyHiringManagerQuestions.length})</summary>
              <ul className="list-disc ml-4 text-[#111111] mt-1">
                {interview.likelyHiringManagerQuestions.slice(0, 5).map((q: any, i: number) => <li key={i}>{q.q}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>

    <section className="bg-white border border-[#E3E1DA] rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-[#4F7563]" />
        <h3 className="text-sm font-bold text-[#111111]">Generate variants</h3>
      </div>
      {!variants ? (
        <>
          <p className="text-[11px] text-[#9A9A9A]">One-click ATS / Executive / Modern / Developer versions, each a separate CvDocument linked to your profile.</p>
          <button onClick={onVariants} disabled={busy}
            className="w-full h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded inline-flex items-center justify-center gap-1 disabled:opacity-50">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Layers className="w-3 h-3" />} Generate 4 variants
          </button>
        </>
      ) : (
        <ul className="space-y-1 text-[11px]">
          {variants.map((v: any) => (
            <li key={v.documentId} className="flex items-center gap-2 border border-[#E3E1DA] rounded px-2 py-1">
              <span className="font-mono text-[10px] uppercase bg-[#DDE8E1] text-purple-800 px-1 py-0.5 rounded">{v.preset}</span>
              <span className="flex-1 truncate">{v.title}</span>
              <a href={`/career/builder/${v.documentId}`} className="text-[#4F7563] hover:underline">Open →</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  </div>
);

const PreflightPanel: React.FC<{ preflight: any; onRun: () => void; busy: boolean }> = ({ preflight, onRun, busy }) => (
  <section className="bg-white border border-[#E3E1DA] rounded-lg p-4 space-y-2">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-bold text-[#111111] flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#4F7563]" /> Export preflight
      </h3>
      <button onClick={onRun} disabled={busy}
        className="h-7 px-2 text-xs font-semibold border border-[#C9C6BD] hover:bg-[#EDEBE6] rounded inline-flex items-center gap-1 disabled:opacity-50">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />} Run check
      </button>
    </div>
    {!preflight ? (
      <p className="text-[11px] text-[#9A9A9A] italic">Run the check to see warnings the export would surface (missing contact, page overflow, ATS issues).</p>
    ) : (
      <div className="space-y-1.5">
        {preflight.ok ? (
          <div className="text-[11px] text-[#355846] inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> No blocking issues. Safe to export.
          </div>
        ) : (
          <div className="text-[11px] text-[#7a2929] inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {preflight.warnings.filter((w: any) => w.severity === 'error').length} blocking issue(s).
          </div>
        )}
        <ul className="space-y-0.5 max-h-32 overflow-auto">
          {preflight.warnings.map((w: any, i: number) => (
            <li key={i} className={`text-[11px] flex items-start gap-1 ${w.severity === 'error' ? 'text-[#7a2929]' : 'text-[#735008]'}`}>
              {w.severity === 'error' ? <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />}
              <span><strong>{w.section}:</strong> {w.message}</span>
            </li>
          ))}
        </ul>
        {!preflight.ok && preflight.canForceExport && (
          <p className="text-[10px] text-[#9A9A9A] italic">You can still Save &amp; open below — preflight warnings don't block.</p>
        )}
      </div>
    )}
  </section>
);
