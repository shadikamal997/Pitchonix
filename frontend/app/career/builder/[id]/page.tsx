'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Download, Loader2, Plus, Trash2, GripVertical,
  ChevronDown, X, Check, AlertTriangle, Wrench, Bug, Camera, User,
} from 'lucide-react';
import api from '@/lib/api';
import {
  useCvProfile, useCvTemplates,
  CvDocumentDto, CvProfileDto, CvPersonalDto, CvTemplateDto,
} from '@/features/career/hooks';
import { BrandKitPicker, BrandKitBadge } from '@/features/brand-kits/BrandKitPicker';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// =============================================================================
//  Phase 42.12 — Full CV Builder with inline editors + live template switching.
//
//  Layout:
//    Header  — title · save · export
//    Left    — tab panel: Edit | Layout | Design
//    Right   — live preview iframe (template-aware HTML)
//
//  Template switching:
//    templateId is sent in the preview POST body (no DB save required) so
//    the preview updates instantly. On select we also auto-save to DB.
//
//  Content editing:
//    All profile sections (personal, experience, education, skills, languages,
//    certifications, awards, projects) are editable inline via the Edit tab.
//    Changes call the profile API which returns an updated profile; the updated
//    profile.updatedAt triggers a preview re-render automatically.
// =============================================================================

const CV_SECTIONS: { key: string; label: string }[] = [
  { key: 'header',         label: 'Header'         },
  { key: 'summary',        label: 'Summary'        },
  { key: 'experience',     label: 'Experience'     },
  { key: 'education',      label: 'Education'      },
  { key: 'skills',         label: 'Skills'         },
  { key: 'languages',      label: 'Languages'      },
  { key: 'projects',       label: 'Projects'       },
  { key: 'certifications', label: 'Certifications' },
  { key: 'awards',         label: 'Awards'         },
  { key: 'publications',   label: 'Publications'   },
  { key: 'references',     label: 'References'     },
];

const PROFICIENCY_OPTIONS = ['basic', 'conversational', 'fluent', 'native'] as const;
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
const SKILL_CATEGORIES = ['technical', 'business', 'language', 'tool', 'soft', 'other'] as const;

interface Toast { id: number; message: string; tone: 'success' | 'error' | 'info'; onUndo?: () => void }

// ── Client-side corruption detection (mirrors cv-profile-sanitizer.ts) ──────
const SECTION_HEADING_SET = new Set([
  'experience','work experience','professional experience','career history',
  'employment history','employment','work history','relevant experience',
  'education','academic background','educational background','qualifications',
  'skills','technical skills','core skills','key skills','competencies',
  'languages','language proficiency','languages spoken',
  'summary','profile','professional summary','professional profile',
  'objective','career objective','about','about me','introduction','overview',
  'personal statement','executive summary',
  'contact','contact info','contact information','contact details',
  'personal','personal info','personal information','personal details',
  'projects','certifications','certificates','awards','achievements',
  'references','publications','research','curriculum vitae','resume','cv',
]);
const EDU_POISON_RE = /\b(javascript|typescript|python|react|angular|vue|node\.?js|css|html|sql|java|php|ruby|swift|kotlin|docker|kubernetes|git|agile|scrum|redux|graphql|aws|azure|gcp)\b/i;
const EXP_VERB_RE   = /^(collaborated|developed|managed|worked|designed|implemented|coordinated|created|maintained|led|built|achieved)\b/i;
const CONTACT_RE = /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(\+?\d[\d\s().-]{6,})|key\s+skills|contact\s*:|phone\s*:|email\s*:/i;
const PARSER_ARTIFACT_RE = /\s[,;:]?\s*[\{\[\(]\s*[,;:]?\s*$/;

function normHeading(text: string) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function detectProfileCorruption(profile: CvProfileDto | null): string[] {
  if (!profile) return [];
  const issues: string[] = [];
  const fn = (profile.personal?.fullName || '').trim().toLowerCase();
  if (fn && SECTION_HEADING_SET.has(normHeading(fn))) {
    issues.push(`Header shows "${profile.personal!.fullName}" instead of candidate name`);
  }
  for (const exp of profile.experience || []) {
    const role = normHeading(exp.role || '');
    if (role && SECTION_HEADING_SET.has(role)) {
      issues.push(`Experience entry has section heading as role: "${exp.role}"`);
      break;
    }
  }
  const importedCvLike = profile.importSource === 'pdf' || profile.importSource === 'docx';
  if (importedCvLike && (profile.experience || []).length > 0) {
    const hasExperienceDetails = (profile.experience || []).some((exp) =>
      Boolean(exp.description) ||
      (Array.isArray(exp.bullets) && exp.bullets.length > 0) ||
      (Array.isArray(exp.achievements) && exp.achievements.length > 0) ||
      /\n\s*(?:[-•*]|\bdeveloped\b|\bintegrated\b|\bmanaged\b|\bcollaborated\b|\bcreated\b)/i.test(String(exp.rawText || ''))
    );
    if (!hasExperienceDetails) {
      issues.push('Imported experience is semantically collapsed: descriptions and bullets are missing');
    }
  }
  if (importedCvLike && !(profile.education || []).length) {
    issues.push('Imported education section is missing');
  }
  for (const edu of profile.education || []) {
    const inst = edu.institution || '';
    if (EDU_POISON_RE.test(inst) || EXP_VERB_RE.test(inst)) {
      issues.push(`Education contains non-education content: "${inst.slice(0, 50)}"`);
      break;
    }
  }
  const summary = profile.personal?.summary || '';
  if (summary && CONTACT_RE.test(summary)) {
    issues.push('Summary contains contact info fragments');
  }
  if (summary && PARSER_ARTIFACT_RE.test(summary.trim())) {
    issues.push('Summary contains parser artifact fragments');
  }
  return issues;
}

function detectDocumentContentCorruption(content: any): string[] {
  const issues: string[] = [];
  if (!content || typeof content !== 'object') return issues;
  const order = Array.isArray(content.sectionOrder) ? content.sectionOrder : [];
  if (new Set(order).size !== order.length) issues.push('Document section order contains duplicates');
  for (const key of ['header', 'fullName', 'name']) {
    const value = content[key];
    if (typeof value === 'string' && SECTION_HEADING_SET.has(normHeading(value))) {
      issues.push(`Document ${key} is a section heading: "${value}"`);
    }
  }
  const summary = content.sectionOverrides?.summary || content.summary;
  if (typeof summary === 'string' && CONTACT_RE.test(summary)) {
    issues.push('Document content summary override contains contact fragments');
  }
  for (const edu of content.education || []) {
    const blob = [edu?.institution, edu?.degree, edu?.field, ...(edu?.honors || [])].filter(Boolean).join(' ');
    if (EDU_POISON_RE.test(blob) || EXP_VERB_RE.test(blob) || /tour operator|collaborated with designers|freelancer|current/i.test(blob)) {
      issues.push('Document content education contains experience/skills fragments');
      break;
    }
  }
  return issues;
}

// =============================================================================
//  Main page
// =============================================================================

export default function CvBuilderPage() {
  const params = useParams();
  const id = (params?.id as string) || '';

  const {
    profile, loading: profileLoading, error: profileError, refresh: refreshProfile,
    patchPersonal, addItem, updateItem, removeItem, reorder,
  } = useCvProfile();

  const [doc, setDoc] = useState<CvDocumentDto | null>(null);
  const [busy, setBusy] = useState<'save' | 'pdf' | 'docx' | 'html' | 'pptx' | 'md' | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'layout' | 'design'>('edit');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [corruptionIssues, setCorruptionIssues] = useState<string[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const reimportInputRef = useRef<HTMLInputElement | null>(null);

  const { items: templates } = useCvTemplates(doc?.doctype);

  const pushToast = (message: string, tone: Toast['tone'] = 'info', onUndo?: () => void) => {
    const t: Toast = { id: Date.now() + Math.random(), message, tone, onUndo };
    setToasts((cur) => [...cur, t]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== t.id)), 4000);
  };

  // Load document
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<CvDocumentDto>(`/career/documents/${id}`);
        if (!cancelled) setDoc(data);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.response?.data?.message || e?.message || 'Failed to load');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Refresh preview when doc or profile changes.
  // Phase 42.12 — passes doc.templateId in the body so the backend uses the
  // currently selected template without needing a DB save first.
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    setPreviewLoading(true);
    (async () => {
      try {
        const res = await api.post(
          `/career/documents/${doc.id}/export?format=html`,
          { templateId: doc.templateId ?? null },
          { responseType: 'blob' },
        );
        const text = await (res.data as Blob).text();
        if (!cancelled) setPreviewHtml(text);
      } catch (e: any) {
        if (!cancelled) {
          const msg = e?.message || 'Preview unavailable';
          setPreviewHtml(`<div style="padding:24px;color:#94A3B8;font-family:system-ui"><p style="font-weight:600">Preview unavailable</p><p style="font-size:12px">${msg}</p></div>`);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [doc?.id, doc?.templateId, doc?.brandKitId, doc?.content, profile?.updatedAt]);

  // Phase Ω.4A — detect corruption whenever the profile/document changes.
  useEffect(() => {
    const issues = [
      ...detectProfileCorruption(profile),
      ...detectDocumentContentCorruption(doc?.content),
    ];
    setCorruptionIssues(issues);
    if (issues.length > 0) setBannerDismissed(false);
  }, [profile?.updatedAt, doc?.updatedAt, doc?.content]);

  // Phase Ω.4A — repair corrupted profile sections via backend sanitizer.
  const repairDocument = async () => {
    if (!doc) return;
    setRepairing(true);
    try {
      const { data } = await api.post<{ profile: CvProfileDto; document?: CvDocumentDto; report: any; documentReport?: any }>(`/career/documents/${doc.id}/repair`);
      if (data.document) setDoc(data.document);
      await refreshProfile();
      const fixed: string[] = [];
      if (data.report.fullNameFixed)    fixed.push('name');
      if (data.report.headlineFixed)    fixed.push('headline');
      if (data.report.summaryFixed)     fixed.push('summary');
      if (data.report.experienceFixed)  fixed.push(`${data.report.experienceFixed} experience entries`);
      if (data.report.educationFixed)   fixed.push(`${data.report.educationFixed} education entries`);
      if (data.report.skillsFixed)      fixed.push(`${data.report.skillsFixed} skills`);
      pushToast(fixed.length ? `Repaired: ${fixed.join(', ')}` : 'No corruption found — profile is clean', fixed.length ? 'success' : 'info');
      setBannerDismissed(true);
    } catch (e: any) {
      pushToast(`Repair failed: ${e?.message || ''}`, 'error');
    } finally { setRepairing(false); }
  };

  const rebuildFromProfile = async () => {
    if (!doc) return;
    setRepairing(true);
    try {
      const { data } = await api.post<{ profile: CvProfileDto; document: CvDocumentDto; report: any }>(`/career/documents/${doc.id}/rebuild-from-profile`);
      setDoc(data.document);
      await refreshProfile();
      pushToast('Rebuilt CV from clean profile', 'success');
      setBannerDismissed(true);
    } catch (e: any) {
      pushToast(`Rebuild failed: ${e?.message || ''}`, 'error');
    } finally { setRepairing(false); }
  };

  const reimportAndReplace = async (file: File) => {
    if (!doc) return;
    setRepairing(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const jobId = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `j-${Date.now()}`;
      await api.post(`/career/profile/${doc.profileId}/import/file?forceOcr=1&jobId=${encodeURIComponent(jobId)}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const rebuilt = await api.post<{ document: CvDocumentDto }>(`/career/documents/${doc.id}/rebuild-from-profile`);
      setDoc(rebuilt.data.document);
      await refreshProfile();
      pushToast('Re-imported and replaced profile/document content', 'success');
      setBannerDismissed(true);
    } catch (e: any) {
      pushToast(`Re-import failed: ${e?.message || ''}`, 'error');
    } finally {
      setRepairing(false);
      if (reimportInputRef.current) reimportInputRef.current.value = '';
    }
  };

  const save = async () => {
    if (!doc) return;
    setBusy('save');
    try {
      const { data } = await api.patch<CvDocumentDto>(`/career/documents/${doc.id}`, {
        title: doc.title, templateId: doc.templateId, content: doc.content,
      });
      setDoc(data);
      pushToast('Saved', 'success');
    } catch (e: any) {
      pushToast(`Save failed: ${e?.response?.data?.message || e?.message}`, 'error');
    } finally { setBusy(null); }
  };

  const autoSaveContent = async (nextContent: any, label: string) => {
    if (!doc) return;
    const snapshot = doc.content;
    setDoc({ ...doc, content: nextContent });
    try {
      await api.patch(`/career/documents/${doc.id}`, { content: nextContent });
      pushToast(label, 'success', () => {
        setDoc((cur) => cur ? { ...cur, content: snapshot } : cur);
        api.patch(`/career/documents/${doc.id}`, { content: snapshot }).catch(() => {});
        pushToast('Reverted', 'info');
      });
    } catch (e: any) {
      setDoc((cur) => cur ? { ...cur, content: snapshot } : cur);
      pushToast(`Save failed: ${e?.response?.data?.message || e?.message || ''}`, 'error');
    }
  };

  // Phase 42.12 — template auto-save. Update local state first (triggers preview
  // via the body override), then persist to DB. No extra network round-trip needed
  // for the preview because templateId is already in the POST body.
  const onTemplateChange = async (templateId: string | null) => {
    if (!doc) return;
    const prev = doc.templateId;
    setDoc({ ...doc, templateId });
    try {
      await api.patch(`/career/documents/${doc.id}`, { templateId });
    } catch (e: any) {
      setDoc((cur) => cur ? { ...cur, templateId: prev } : cur);
      pushToast('Template save failed', 'error');
    }
  };

  const exportFile = async (format: 'pdf' | 'docx' | 'html' | 'pptx' | 'md') => {
    if (!doc) return;
    if (format === 'docx') {
      const ok = window.confirm(
        'DOCX export preserves your content structure for editing in Word, but does not preserve the premium visual design. Use PDF for a design-matched export.',
      );
      if (!ok) return;
    }
    setBusy(format);
    try {
      const res = await api.post(
        `/career/documents/${doc.id}/export?format=${format}`,
        { templateId: doc.templateId ?? null },
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      const ext = (res.headers?.['x-pitchonix-export-extension'] as string) || format;
      a.href = url; a.download = `${doc.title}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      if (format === 'pdf' && ext === 'html') {
        pushToast('PDF renderer failed after retry, so HTML was exported instead.', 'error');
      }
    } catch (e: any) {
      pushToast(`Export failed: ${e?.message || ''}`, 'error');
    } finally { setBusy(null); }
  };

  if (!doc) {
    return (
      <div className="h-screen flex items-center justify-center text-sm text-[#9A9A9A]">
        {loadError ? <span className="text-red-600">{loadError}</span> : <Loader2 className="w-5 h-5 animate-spin" />}
      </div>
    );
  }

  const sectionOrder: string[] = (doc.content?.sectionOrder) || CV_SECTIONS.map((s) => s.key);
  const isCV = doc.doctype === 'cv' || doc.doctype === 'resume';

  return (
    <div className="h-screen flex flex-col bg-[#EDEBE6] overflow-hidden">
      {/* ── Header ── */}
      <header className="bg-white border-b border-[#E3E1DA] px-4 h-12 flex items-center gap-2 shrink-0">
        <Link href="/career" className="text-xs text-[#9A9A9A] hover:text-[#111111] flex items-center gap-1 shrink-0">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="h-5 w-px bg-[#E3E1DA]" />
        <input
          value={doc.title}
          onChange={(e) => setDoc({ ...doc, title: e.target.value })}
          className="text-sm font-bold text-[#111111] bg-transparent border-b border-transparent focus:border-[#C9C6BD] outline-none w-48 min-w-0"
        />
        {profileError && (
          <div className="text-[10px] text-[#9a3737] bg-[#FCF1F1] px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
            Profile error
            <button onClick={refreshProfile} className="underline">Retry</button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={save} disabled={busy !== null}
            className="h-7 px-2.5 text-xs font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846] inline-flex items-center gap-1 disabled:opacity-40">
            {busy === 'save' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
          </button>
          {(['pdf', 'docx', 'html', 'pptx', 'md'] as const).map((fmt) => (
            <button key={fmt} onClick={() => exportFile(fmt)} disabled={busy !== null}
              title={fmt === 'docx' ? 'DOCX preserves editable content structure, not premium visual design. Use PDF for design parity.' : `Export ${fmt.toUpperCase()}`}
              className="h-7 px-2 text-xs font-semibold bg-[#F1F0EC] text-[#111111] rounded hover:bg-[#E3E1DA] inline-flex items-center gap-1 disabled:opacity-40 uppercase">
              {busy === fmt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {fmt}
            </button>
          ))}
        </div>
      </header>

      {/* ── Corruption Repair Banner ── */}
      {corruptionIssues.length > 0 && !bannerDismissed && (
        <div className="bg-[#FEF3C7] border-b border-[#F59E0B] px-4 py-2 flex items-center gap-3 shrink-0">
          <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#92400E]">
              This CV contains corrupted data from a previous import
            </p>
            <p className="text-[10px] text-[#78350F] truncate">{corruptionIssues[0]}{corruptionIssues.length > 1 ? ` (+${corruptionIssues.length - 1} more)` : ''}</p>
          </div>
          <button
            onClick={repairDocument}
            disabled={repairing}
            className="shrink-0 h-7 px-3 text-xs font-semibold bg-[#B45309] text-white rounded hover:bg-[#92400E] inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {repairing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wrench className="w-3 h-3" />}
            {repairing ? 'Repairing…' : 'Repair Automatically'}
          </button>
          <button
            onClick={rebuildFromProfile}
            disabled={repairing}
            className="shrink-0 h-7 px-3 text-xs font-semibold bg-[#111111] text-white rounded hover:bg-black inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            Rebuild from Profile
          </button>
          <input
            ref={reimportInputRef}
            type="file"
            accept=".docx,.pdf,.md,.markdown,.html,.htm,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) reimportAndReplace(file);
            }}
          />
          <button
            onClick={() => reimportInputRef.current?.click()}
            disabled={repairing}
            className="shrink-0 h-7 px-3 text-xs font-semibold bg-white text-[#92400E] border border-[#F59E0B] rounded hover:bg-[#FFFBEB] disabled:opacity-50"
          >
            Re-import CV
          </button>
          <button onClick={() => setBannerDismissed(true)} className="text-[#92400E] hover:text-[#78350F]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 grid grid-cols-[300px_1fr] overflow-hidden">
        {/* Left panel */}
        <aside className="bg-white border-r border-[#E3E1DA] flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-[#E3E1DA] shrink-0">
            {([
              { id: 'edit',   label: 'Edit'   },
              { id: 'layout', label: 'Layout' },
              { id: 'design', label: 'Design' },
            ] as const).map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-[11px] font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#4F7563] text-[#4F7563]'
                    : 'border-transparent text-[#9A9A9A] hover:text-[#111111]'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {isCV ? (
              <>
                {activeTab === 'edit'   && (
                  <EditPanel
                    profile={profile}
                    patchPersonal={patchPersonal}
                    addItem={addItem}
                    updateItem={updateItem}
                    removeItem={removeItem}
                    reorder={reorder}
                    pushToast={pushToast}
                  />
                )}
                {activeTab === 'layout' && (
                  <LayoutPanel
                    sectionOrder={sectionOrder}
                    onReorder={(next) => autoSaveContent({ ...doc.content, sectionOrder: next }, 'Order saved')}
                    onRemove={(key) => autoSaveContent({ ...doc.content, sectionOrder: sectionOrder.filter((s) => s !== key) }, 'Section removed')}
                    onAdd={(key) => autoSaveContent({ ...doc.content, sectionOrder: [...sectionOrder, key] }, `${key} added`)}
                  />
                )}
                {activeTab === 'design' && (
                  <DesignPanel
                    doc={doc}
                    templates={templates}
                    onTemplateChange={onTemplateChange}
                    onBrandKitChange={async (kitId) => {
                      const prev = doc;
                      setDoc({ ...doc, brandKitId: kitId });
                      try {
                        await api.patch(`/career/documents/${doc.id}`, { brandKitId: kitId });
                        pushToast(kitId ? 'Brand kit applied' : 'Brand kit cleared', 'success');
                      } catch (e: any) {
                        setDoc(prev);
                        pushToast('Brand kit save failed', 'error');
                      }
                    }}
                  />
                )}
              </>
            ) : doc.doctype === 'coverLetter' ? (
              <CoverLetterEditor doc={doc} onChange={setDoc} />
            ) : (
              <PortfolioEditor doc={doc} onChange={setDoc} />
            )}
          </div>

          {/* ── Debug panel ── */}
          <div className="shrink-0 border-t border-[#E3E1DA]">
            <button
              onClick={() => setShowDebug((v) => !v)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-[#9A9A9A] hover:text-[#111111] hover:bg-[#F7F6F2] transition-colors"
            >
              <Bug className="w-3 h-3" />
              {showDebug ? 'Hide debug' : 'Show debug'}
              {corruptionIssues.length > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-[9px] px-1.5 rounded-full">{corruptionIssues.length}</span>
              )}
            </button>
            {showDebug && profile && (
              <div className="bg-[#0D1117] text-[#7EE787] text-[9px] font-mono p-3 overflow-x-auto max-h-56 overflow-y-auto">
                <div className="text-[#79C0FF] mb-1">[CV-BUILDER:SOURCE]</div>
                <div>documentId={doc.id}</div>
                <div>templateId={doc.templateId ?? 'none'}</div>
                <div>profileId={profile.id}</div>
                <div>usingDocContent={JSON.stringify(!!doc.content)}</div>
                <div>usingProfile={JSON.stringify(!!profile)}</div>
                <div>contentUpdatedAt={doc.updatedAt}</div>
                <div>profileUpdatedAt={profile.updatedAt}</div>
                <div className="text-[#79C0FF] mt-2 mb-1">[CV-BUILDER:COUNTS]</div>
                <div>profile.personal.fullName="{profile.personal?.fullName ?? ''}"</div>
                <div>profile.personal.headline="{profile.personal?.headline ?? ''}"</div>
                <div>profile.summary.length={profile.personal?.summary?.length ?? 0}</div>
                <div>profile.experience.length={profile.experience?.length ?? 0}</div>
                <div>profile.education.length={profile.education?.length ?? 0}</div>
                <div>profile.skills.length={profile.skills?.length ?? 0}</div>
                <div>profile.languages.length={profile.languages?.length ?? 0}</div>
                <div className="text-[#79C0FF] mt-2 mb-1">[CV-BUILDER:DOC-CONTENT]</div>
                <div>doc.content.header="{doc.content?.header ?? ''}"</div>
                <div>doc.content.summary="{(doc.content?.sectionOverrides?.summary ?? doc.content?.summary ?? '').toString().slice(0, 120)}"</div>
                <div>doc.content.experience[0]={JSON.stringify(doc.content?.experience?.[0] ?? null)}</div>
                <div>doc.content.education[0]={JSON.stringify(doc.content?.education?.[0] ?? null)}</div>
                {profile.experience?.[0] && <>
                  <div className="text-[#79C0FF] mt-2 mb-1">[CV-RENDER:SECTIONS]</div>
                  <div>role="{profile.experience[0].role}"</div>
                  <div>company="{profile.experience[0].company}"</div>
                </>}
                {profile.education?.[0] && <>
                  <div className="text-[#79C0FF] mt-2 mb-1">[CV-RENDER:EDUCATION-0]</div>
                  <div>institution="{profile.education[0].institution}"</div>
                  <div>degree="{profile.education[0].degree ?? ''}"</div>
                </>}
                {corruptionIssues.length > 0 && <>
                  <div className="text-[#FF7B72] mt-2 mb-1">[CV-CORRUPTION-DETECTED]</div>
                  {corruptionIssues.map((issue, i) => <div key={i} className="text-[#FF7B72]">• {issue}</div>)}
                </>}
              </div>
            )}
          </div>
        </aside>

        {/* Right: preview */}
        <main className="overflow-auto bg-[#F1F0EC] p-4 relative">
          {previewLoading && (
            <div className="absolute top-2 right-2 z-10 bg-white/80 rounded px-2 py-1 text-[10px] text-[#9A9A9A] flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Rendering…
            </div>
          )}
          {previewHtml ? (
            <iframe
              title="preview"
              srcDoc={previewHtml}
              className="w-full bg-white border border-[#E3E1DA] rounded"
              style={{ minHeight: '80vh', height: '100%' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-[#9A9A9A] italic">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Rendering preview…
            </div>
          )}
        </main>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-center gap-2 px-3 py-2 rounded shadow-lg text-xs
            ${t.tone === 'success' ? 'bg-[#EEF5F1] border border-[#DDE8E1] text-[#1A2D24]'
            : t.tone === 'error'  ? 'bg-[#FCF1F1] border border-[#F7E3E3] text-red-900'
            : 'bg-slate-900 text-white'}`}>
            <span className="flex-1">{t.message}</span>
            {t.onUndo && (
              <button onClick={() => { t.onUndo!(); setToasts((cur) => cur.filter((x) => x.id !== t.id)); }}
                className="font-bold underline">Undo</button>
            )}
            <button onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))} className="opacity-60 hover:opacity-100">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
//  Design tab — template gallery + brand kit
// =============================================================================

const DesignPanel: React.FC<{
  doc: CvDocumentDto;
  templates: CvTemplateDto[];
  onTemplateChange: (id: string | null) => void;
  onBrandKitChange: (id: string | null) => Promise<void>;
}> = ({ doc, templates, onTemplateChange, onBrandKitChange }) => {
  const grouped = templates.reduce<Record<string, CvTemplateDto[]>>((acc, t) => {
    const cat = t.category || 'Other';
    (acc[cat] = acc[cat] || []).push(t);
    return acc;
  }, {});

  return (
    <div className="p-3 space-y-4">
      {/* Brand Kit */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-2">Brand Kit</div>
        <div className="flex items-center gap-2">
          {doc.brandKitId && <BrandKitBadge kitId={doc.brandKitId} />}
          <BrandKitPicker mode="select" value={doc.brandKitId ?? null} onSelect={onBrandKitChange} />
        </div>
      </div>

      {/* Template gallery */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-2">
          Template ({templates.length})
        </div>
        {/* Clear selection */}
        <button
          onClick={() => onTemplateChange(null)}
          className={`w-full mb-2 h-8 px-2 text-xs border rounded flex items-center gap-2 transition-colors
            ${!doc.templateId ? 'border-[#4F7563] bg-[#EEF5F1] text-[#355846] font-semibold' : 'border-[#E3E1DA] text-[#9A9A9A] hover:border-[#C9C6BD]'}`}
        >
          {!doc.templateId && <Check className="w-3 h-3" />}
          No template (default)
        </button>

        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, list]) => (
          <div key={cat} className="mb-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#C9C6BD] mb-1 px-1">{cat}</div>
            <div className="space-y-1">
              {list.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={doc.templateId === t.id}
                  onClick={() => onTemplateChange(t.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TemplateCard: React.FC<{
  template: CvTemplateDto;
  selected: boolean;
  onClick: () => void;
}> = ({ template, selected, onClick }) => {
  const layout = (template.layout || {}) as any;
  const accent = layout.accent || '#1F2937';
  const cols   = layout.columns || 1;
  const style  = layout.style   || 'classic';
  const sidebarSide = layout.sidebarSide === 'right' ? 'right' : 'left';
  const isDark = ['dark', 'charcoal', 'navy', 'accent'].includes(layout.sidebarColor || '');
  const headerStyle = layout.headerStyle || 'block';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded border transition-all flex items-center gap-2 group
        ${selected
          ? 'border-[#4F7563] bg-[#EEF5F1]'
          : 'border-[#E3E1DA] hover:border-[#C9C6BD] hover:bg-[#F8F7F4]'}`}
    >
      {/* Mini visual preview */}
      <div className="w-9 h-12 rounded overflow-hidden shrink-0 border border-[#DAD7CE] bg-white shadow-[0_3px_10px_rgba(17,17,17,0.08)]">
        {cols === 2 || style === 'sidebar' || style === 'twoColumn' ? (
          <div className={`h-full flex ${sidebarSide === 'right' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-[38%] p-0.5 ${isDark ? 'bg-[#25272B]' : 'bg-[#EEF6F3]'}`} style={{ borderTop: `3px solid ${accent}` }}>
              {layout.photoShape !== 'none' && <div className="w-3.5 h-3.5 rounded-full bg-white/80 mx-auto mt-1 mb-1 border" style={{ borderColor: accent }} />}
              <div className="space-y-0.5 mt-1">
                <div className="h-0.5 rounded bg-white/60" />
                <div className="h-0.5 rounded bg-white/40 w-3/4" />
                <div className="h-0.5 rounded bg-white/40" />
              </div>
            </div>
            <div className="flex-1 p-1 space-y-0.5">
              <div className="h-1 rounded w-4/5" style={{ background: accent }} />
              <div className="h-0.5 bg-slate-300 rounded w-2/3" />
              <div className="h-px my-1" style={{ background: accent }} />
              <div className="h-0.5 bg-slate-200 rounded" />
              <div className="h-0.5 bg-slate-200 rounded w-3/4" />
              <div className="h-0.5 bg-slate-200 rounded w-5/6" />
            </div>
          </div>
        ) : headerStyle === 'banner' ? (
          <div className="h-full flex flex-col">
            <div className="h-4 p-1 relative overflow-hidden" style={{ background: accent }}>
              <div className="absolute -right-1 -top-1 w-4 h-4 rotate-45 bg-white/20 rounded-sm" />
              <div className="h-1 bg-white/90 rounded w-5" />
              <div className="h-0.5 bg-white/60 rounded w-4 mt-0.5" />
            </div>
            <div className="flex-1 p-1 space-y-0.5">
              <div className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} /><span className="h-0.5 bg-slate-300 rounded flex-1" /></div>
              <div className="h-0.5 bg-slate-200 rounded" />
              <div className="h-0.5 bg-slate-200 rounded w-3/4" />
              <div className="h-0.5 bg-slate-200 rounded w-5/6" />
            </div>
          </div>
        ) : style === 'minimal' ? (
          <div className="h-full p-1.5">
            <div className="h-1 bg-[#111] rounded w-5 mb-0.5" />
            <div className="h-1 bg-[#111] rounded w-4 mb-1" />
            <div className="h-px bg-slate-300 mb-1" />
            <div className="grid grid-cols-[0.8fr_1.2fr] gap-1">
              <div className="space-y-0.5"><div className="h-0.5 bg-slate-300 rounded" /><div className="h-0.5 bg-slate-200 rounded" /></div>
              <div className="space-y-0.5"><div className="h-0.5 rounded" style={{ background: accent }} /><div className="h-0.5 bg-slate-200 rounded" /><div className="h-0.5 bg-slate-200 rounded w-4/5" /></div>
            </div>
          </div>
        ) : (
          <div className="h-full p-1 flex flex-col">
            <div className="h-1 rounded w-5" style={{ background: accent }} />
            <div className="h-0.5 bg-slate-300 rounded w-3/4 mt-0.5" />
            <div className="h-px my-1" style={{ background: accent }} />
            <div className="space-y-0.5 flex-1">
              <div className="h-0.5 bg-slate-200 rounded" />
              <div className="h-0.5 bg-slate-200 rounded w-3/4" />
              <div className="h-0.5 bg-slate-200 rounded" />
              <div className="h-0.5 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className={`text-[11px] font-semibold truncate ${selected ? 'text-[#355846]' : 'text-[#111111]'}`}>
          {template.name}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[9px] text-[#9A9A9A]">{style}</span>
          {cols === 2 && <span className="text-[9px] text-[#9A9A9A]">· 2-col</span>}
          {layout.premium && <span className="text-[9px] bg-amber-50 text-amber-600 px-1 rounded">★</span>}
        </div>
      </div>

      {selected && <Check className="w-3 h-3 text-[#4F7563] shrink-0" />}
    </button>
  );
};

// =============================================================================
//  Layout tab — section order + add/remove
// =============================================================================

const LayoutPanel: React.FC<{
  sectionOrder: string[];
  onReorder: (next: string[]) => void;
  onRemove: (key: string) => void;
  onAdd: (key: string) => void;
}> = ({ sectionOrder, onReorder, onRemove, onAdd }) => (
  <div className="p-3 space-y-3">
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-2">Section order</div>
      <SortableSections items={sectionOrder} onReorder={onReorder} onRemove={onRemove} />
    </div>
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-1">Add section</div>
      <div className="flex flex-wrap gap-1">
        {CV_SECTIONS.filter((s) => !sectionOrder.includes(s.key)).map((s) => (
          <button key={s.key} onClick={() => onAdd(s.key)}
            className="h-6 px-2 text-[10px] bg-[#F1F0EC] text-[#111111] rounded hover:bg-[#E3E1DA] inline-flex items-center gap-0.5">
            <Plus className="w-2.5 h-2.5" /> {s.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

// =============================================================================
//  Edit tab — all section content editors
// =============================================================================

const EditPanel: React.FC<{
  profile: CvProfileDto | null;
  patchPersonal: (p: Partial<CvPersonalDto>) => Promise<any>;
  addItem: (section: string, item: any) => Promise<any>;
  updateItem: (section: string, id: string, patch: any) => Promise<any>;
  removeItem: (section: string, id: string) => Promise<any>;
  reorder: (section: string, ids: string[]) => Promise<any>;
  pushToast: (msg: string, tone?: 'success' | 'error' | 'info') => void;
}> = ({ profile, patchPersonal, addItem, updateItem, removeItem, reorder, pushToast }) => {
  if (!profile) {
    return (
      <div className="p-3 text-xs text-[#9A9A9A] italic">
        {profile === null ? 'Loading profile…' : 'No profile found.'}
      </div>
    );
  }

  const wrap = (fn: () => Promise<any>, label: string) => async () => {
    try { await fn(); }
    catch (e: any) { pushToast(`${label}: ${e?.response?.data?.message || e?.message || 'Error'}`, 'error'); }
  };

  return (
    <div className="divide-y divide-[#F1F0EC]">
      <PersonalEditor   profile={profile} patchPersonal={patchPersonal} />
      <SummaryEditor    profile={profile} patchPersonal={patchPersonal} />
      <ExperienceEditor profile={profile} addItem={addItem} updateItem={updateItem} removeItem={removeItem} reorder={reorder} />
      <EducationEditor  profile={profile} addItem={addItem} updateItem={updateItem} removeItem={removeItem} reorder={reorder} />
      <SkillsEditor     profile={profile} addItem={addItem} updateItem={updateItem} removeItem={removeItem} />
      <LanguagesEditor  profile={profile} addItem={addItem} updateItem={updateItem} removeItem={removeItem} />
      <CertificationsEditor profile={profile} addItem={addItem} updateItem={updateItem} removeItem={removeItem} />
      <AwardsEditor        profile={profile} addItem={addItem} updateItem={updateItem} removeItem={removeItem} />
      <ProjectsEditor      profile={profile} addItem={addItem} updateItem={updateItem} removeItem={removeItem} />
      <PublicationsEditor  profile={profile} addItem={addItem} updateItem={updateItem} removeItem={removeItem} />
      <ReferencesEditor    profile={profile} addItem={addItem} updateItem={updateItem} removeItem={removeItem} />
    </div>
  );
};

// ---------------------------------------------------------------------------
//  Collapsible section wrapper
// ---------------------------------------------------------------------------

const Collapsible: React.FC<{
  title: string;
  badge?: number | string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, badge, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold text-[#111111] hover:bg-[#F8F7F4] transition-colors"
      >
        <span className="flex items-center gap-2">
          {title}
          {badge !== undefined && (
            <span className="bg-[#F1F0EC] text-[#9A9A9A] text-[9px] font-semibold px-1.5 py-0.5 rounded-full">{badge}</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#9A9A9A] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------
//  Personal / Header editor
// ---------------------------------------------------------------------------

const PersonalEditor: React.FC<{
  profile: CvProfileDto;
  patchPersonal: (p: Partial<CvPersonalDto>) => Promise<any>;
}> = ({ profile, patchPersonal }) => {
  const p = profile.personal || {};
  const [form, setForm] = useState({
    fullName: p.fullName || '', headline: p.headline || '',
    location: p.location || '', email: p.email || '',
    phone: p.phone || '', website: p.website || '',
    linkedin: p.linkedin || '', github: p.github || '',
  });
  const [photoUrl, setPhotoUrl] = useState<string>(p.photoUrl || '');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const loaded = useRef(false);
  useEffect(() => {
    if (!loaded.current && profile.personal) {
      loaded.current = true;
      setForm({
        fullName: profile.personal.fullName || '', headline: profile.personal.headline || '',
        location: profile.personal.location || '', email: profile.personal.email || '',
        phone: profile.personal.phone || '', website: profile.personal.website || '',
        linkedin: profile.personal.linkedin || '', github: profile.personal.github || '',
      });
      setPhotoUrl(profile.personal.photoUrl || '');
    }
  }, [profile.id]);

  const saveField = async (field: keyof typeof form) => {
    await patchPersonal({ [field]: form[field] });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res = await api.post<{ photoUrl: string }>('/career/profile/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const nextPhotoUrl = res.data.photoUrl;
      setPhotoUrl(nextPhotoUrl);
      await patchPersonal({ photoUrl: nextPhotoUrl });
    } catch (err: any) {
      setPhotoError(err?.response?.data?.message || 'Photo upload failed');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    await patchPersonal({ photoUrl: '' });
    setPhotoUrl('');
  };

  const fullPhotoUrl = photoUrl
    ? (photoUrl.startsWith('http') ? photoUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}${photoUrl}`)
    : null;

  return (
    <Collapsible title="Header / Personal" defaultOpen>
      <div className="space-y-2">
        {/* Photo upload */}
        <div className="flex items-center gap-3 p-2 bg-[#F8F7F4] rounded border border-[#E3E1DA]">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#C9C6BD] flex items-center justify-center bg-[#E3E1DA] shrink-0">
            {fullPhotoUrl
              ? <img src={fullPhotoUrl} alt="Profile" className="w-full h-full object-cover" />
              : <User className="w-6 h-6 text-[#9A9A9A]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider mb-1">Profile Photo</p>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-[#4F7563] text-white rounded hover:bg-[#3d5c4e] disabled:opacity-50"
              >
                {photoUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                {fullPhotoUrl ? 'Replace' : 'Upload photo'}
              </button>
              {fullPhotoUrl && (
                <button onClick={removePhoto} className="px-2 py-1 text-[10px] font-medium text-red-500 border border-red-200 rounded hover:bg-red-50">
                  Remove
                </button>
              )}
            </div>
            {photoError && <p className="text-[10px] text-red-500 mt-0.5">{photoError}</p>}
            <p className="text-[9px] text-[#B0ADA6] mt-0.5">Appears in photo-supported templates · JPEG/PNG/WebP · max 5 MB</p>
          </div>
          <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoSelect} />
        </div>
        <Field label="Full Name"   value={form.fullName}  onChange={(v) => setForm(f => ({...f, fullName: v}))}  onBlur={() => saveField('fullName')} />
        <Field label="Headline"    value={form.headline}  onChange={(v) => setForm(f => ({...f, headline: v}))}  onBlur={() => saveField('headline')} />
        <Field label="Location"    value={form.location}  onChange={(v) => setForm(f => ({...f, location: v}))}  onBlur={() => saveField('location')} />
        <Field label="Email"       value={form.email}     onChange={(v) => setForm(f => ({...f, email: v}))}     onBlur={() => saveField('email')} />
        <Field label="Phone"       value={form.phone}     onChange={(v) => setForm(f => ({...f, phone: v}))}     onBlur={() => saveField('phone')} />
        <Field label="Website"     value={form.website}   onChange={(v) => setForm(f => ({...f, website: v}))}   onBlur={() => saveField('website')} />
        <Field label="LinkedIn"    value={form.linkedin}  onChange={(v) => setForm(f => ({...f, linkedin: v}))}  onBlur={() => saveField('linkedin')} />
        <Field label="GitHub"      value={form.github}    onChange={(v) => setForm(f => ({...f, github: v}))}    onBlur={() => saveField('github')} />
      </div>
    </Collapsible>
  );
};

// ---------------------------------------------------------------------------
//  Summary editor
// ---------------------------------------------------------------------------

const SummaryEditor: React.FC<{
  profile: CvProfileDto;
  patchPersonal: (p: Partial<CvPersonalDto>) => Promise<any>;
}> = ({ profile, patchPersonal }) => {
  const [text, setText] = useState(profile.personal?.summary || '');
  const loaded = useRef(false);
  useEffect(() => {
    if (!loaded.current) { loaded.current = true; setText(profile.personal?.summary || ''); }
  }, [profile.id]);

  return (
    <Collapsible title="Summary">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => patchPersonal({ summary: text })}
        rows={5}
        placeholder="Professional summary…"
        className="w-full px-2 py-1.5 text-xs border border-[#C9C6BD] rounded resize-none focus:border-[#4F7563] focus:outline-none"
      />
    </Collapsible>
  );
};

// ---------------------------------------------------------------------------
//  Experience editor
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
//  Sortable wrapper for items inside a section list (experience, education)
// ---------------------------------------------------------------------------

const SortableItem: React.FC<{ id: string; children: (dragHandleProps: any) => React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined }}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
};

const ExperienceEditor: React.FC<{
  profile: CvProfileDto;
  addItem: (s: string, item: any) => Promise<any>;
  updateItem: (s: string, id: string, patch: any) => Promise<any>;
  removeItem: (s: string, id: string) => Promise<any>;
  reorder: (s: string, ids: string[]) => Promise<any>;
}> = ({ profile, addItem, updateItem, removeItem, reorder }) => {
  const list: any[] = profile.experience || [];
  const ids = list.map((e: any) => e.id);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingBusy, setAddingBusy] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleAdd = async () => {
    setAddingBusy(true);
    const res = await addItem('experience', { role: 'New Role', company: 'Company', start: '', end: '', location: '', bullets: [] });
    const newList = res?.experience || [];
    const last = newList[newList.length - 1];
    if (last?.id) setExpandedId(last.id);
    setAddingBusy(false);
  };

  const handleDuplicate = async (exp: any) => {
    const { id: _id, ...rest } = exp;
    const res = await addItem('experience', { ...rest, role: `${exp.role || 'Role'} (copy)` });
    const newList = res?.experience || [];
    const last = newList[newList.length - 1];
    if (last?.id) setExpandedId(last.id);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to   = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    reorder('experience', arrayMove(ids, from, to));
  };

  return (
    <Collapsible title="Experience" badge={list.length}>
      <div className="space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {list.map((exp: any) => (
              <SortableItem key={exp.id} id={exp.id}>
                {(dragHandle) => (
                  <ExperienceEntry
                    exp={exp}
                    expanded={expandedId === exp.id}
                    dragHandle={dragHandle}
                    onToggle={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                    onUpdate={(patch) => updateItem('experience', exp.id, patch)}
                    onRemove={() => removeItem('experience', exp.id)}
                    onDuplicate={() => handleDuplicate(exp)}
                  />
                )}
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
        <button onClick={handleAdd} disabled={addingBusy}
          className="w-full h-7 text-[11px] font-semibold border border-dashed border-[#C9C6BD] rounded hover:border-[#4F7563] hover:text-[#4F7563] flex items-center justify-center gap-1 text-[#9A9A9A] disabled:opacity-40">
          {addingBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Experience
        </button>
      </div>
    </Collapsible>
  );
};

const ExperienceEntry: React.FC<{
  exp: any;
  expanded: boolean;
  dragHandle?: any;
  onToggle: () => void;
  onUpdate: (patch: any) => Promise<any>;
  onRemove: () => Promise<any>;
  onDuplicate: () => Promise<any>;
}> = ({ exp, expanded, dragHandle, onToggle, onUpdate, onRemove, onDuplicate }) => {
  const [form, setForm] = useState({
    role: exp.role || '', company: exp.company || '',
    location: exp.location || '', start: exp.start || '', end: exp.end || '',
    bullets: (exp.bullets || []).join('\n'),
  });

  const save = async (field: string, value: any) => {
    const patch: any = { [field]: value };
    if (field === 'bullets') patch.bullets = value.split('\n').map((b: string) => b.trim()).filter(Boolean);
    await onUpdate(patch);
  };

  return (
    <div className="border border-[#E3E1DA] rounded overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[#F8F7F4]">
        {dragHandle && (
          <button {...dragHandle} className="cursor-grab active:cursor-grabbing p-0.5 text-[#C9C6BD] hover:text-[#111111] shrink-0">
            <GripVertical className="w-3 h-3" />
          </button>
        )}
        <button onClick={onToggle} className="flex-1 text-left text-[11px] font-semibold text-[#111111] truncate">
          {exp.role || 'Untitled'} {exp.company ? `· ${exp.company}` : ''}
        </button>
        <button onClick={() => onDuplicate()} title="Duplicate" className="p-0.5 text-[#C9C6BD] hover:text-[#4F7563] rounded shrink-0">
          <Plus className="w-3 h-3" />
        </button>
        <button onClick={() => onRemove()} className="p-0.5 text-[#C9C6BD] hover:text-red-500 rounded shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
        <button onClick={onToggle} className="p-0.5 text-[#C9C6BD] hover:text-[#111111] rounded shrink-0">
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {expanded && (
        <div className="px-2 pb-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Role"    value={form.role}    onChange={(v) => setForm(f => ({...f, role: v}))}    onBlur={() => save('role', form.role)} />
            <Field label="Company" value={form.company} onChange={(v) => setForm(f => ({...f, company: v}))} onBlur={() => save('company', form.company)} />
          </div>
          <Field label="Location" value={form.location} onChange={(v) => setForm(f => ({...f, location: v}))} onBlur={() => save('location', form.location)} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Start" value={form.start} onChange={(v) => setForm(f => ({...f, start: v}))} onBlur={() => save('start', form.start)} placeholder="2020" />
            <Field label="End"   value={form.end}   onChange={(v) => setForm(f => ({...f, end: v}))}   onBlur={() => save('end', form.end)}   placeholder="Present" />
          </div>
          <label className="block">
            <span className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Bullets (one per line)</span>
            <textarea
              value={form.bullets}
              onChange={(e) => setForm(f => ({...f, bullets: e.target.value}))}
              onBlur={() => save('bullets', form.bullets)}
              rows={4}
              className="mt-0.5 w-full px-1.5 py-1 text-xs border border-[#C9C6BD] rounded resize-none focus:border-[#4F7563] focus:outline-none"
              placeholder="Achievement or responsibility…"
            />
          </label>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
//  Education editor
// ---------------------------------------------------------------------------

const EducationEditor: React.FC<{
  profile: CvProfileDto;
  addItem: (s: string, item: any) => Promise<any>;
  updateItem: (s: string, id: string, patch: any) => Promise<any>;
  removeItem: (s: string, id: string) => Promise<any>;
  reorder: (s: string, ids: string[]) => Promise<any>;
}> = ({ profile, addItem, updateItem, removeItem, reorder }) => {
  const list: any[] = profile.education || [];
  const ids = list.map((e: any) => e.id);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleAdd = async () => {
    setBusy(true);
    const res = await addItem('education', { institution: 'Institution', degree: '', field: '', start: '', end: '' });
    const newList = res?.education || [];
    const last = newList[newList.length - 1];
    if (last?.id) setExpandedId(last.id);
    setBusy(false);
  };

  const handleDuplicate = async (ed: any) => {
    const { id: _id, ...rest } = ed;
    const res = await addItem('education', rest);
    const newList = res?.education || [];
    const last = newList[newList.length - 1];
    if (last?.id) setExpandedId(last.id);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to   = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    reorder('education', arrayMove(ids, from, to));
  };

  return (
    <Collapsible title="Education" badge={list.length}>
      <div className="space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {list.map((ed: any) => (
              <SortableItem key={ed.id} id={ed.id}>
                {(dragHandle) => (
                  <EducationEntry
                    ed={ed}
                    expanded={expandedId === ed.id}
                    dragHandle={dragHandle}
                    onToggle={() => setExpandedId(expandedId === ed.id ? null : ed.id)}
                    onUpdate={(patch) => updateItem('education', ed.id, patch)}
                    onRemove={() => removeItem('education', ed.id)}
                    onDuplicate={() => handleDuplicate(ed)}
                  />
                )}
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
        <button onClick={handleAdd} disabled={busy}
          className="w-full h-7 text-[11px] font-semibold border border-dashed border-[#C9C6BD] rounded hover:border-[#4F7563] hover:text-[#4F7563] flex items-center justify-center gap-1 text-[#9A9A9A] disabled:opacity-40">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Education
        </button>
      </div>
    </Collapsible>
  );
};

const EducationEntry: React.FC<{
  ed: any;
  expanded: boolean;
  dragHandle?: any;
  onToggle: () => void;
  onUpdate: (patch: any) => Promise<any>;
  onRemove: () => Promise<any>;
  onDuplicate: () => Promise<any>;
}> = ({ ed, expanded, dragHandle, onToggle, onUpdate, onRemove, onDuplicate }) => {
  const [form, setForm] = useState({
    institution: ed.institution || '', degree: ed.degree || '',
    field: ed.field || '', start: ed.start || '', end: ed.end || '', gpa: ed.gpa || '',
  });

  const save = (field: string, value: string) => onUpdate({ [field]: value });

  return (
    <div className="border border-[#E3E1DA] rounded overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[#F8F7F4]">
        {dragHandle && (
          <button {...dragHandle} className="cursor-grab active:cursor-grabbing p-0.5 text-[#C9C6BD] hover:text-[#111111] shrink-0">
            <GripVertical className="w-3 h-3" />
          </button>
        )}
        <button onClick={onToggle} className="flex-1 text-left text-[11px] font-semibold text-[#111111] truncate">
          {ed.institution || 'Untitled'}{ed.degree ? ` · ${ed.degree}` : ''}
        </button>
        <button onClick={() => onDuplicate()} title="Duplicate" className="p-0.5 text-[#C9C6BD] hover:text-[#4F7563] rounded">
          <Plus className="w-3 h-3" />
        </button>
        <button onClick={() => onRemove()} className="p-0.5 text-[#C9C6BD] hover:text-red-500 rounded">
          <Trash2 className="w-3 h-3" />
        </button>
        <button onClick={onToggle} className="p-0.5 text-[#C9C6BD] hover:text-[#111111] rounded">
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {expanded && (
        <div className="px-2 pb-2 space-y-2">
          <Field label="Institution" value={form.institution} onChange={(v) => setForm(f => ({...f, institution: v}))} onBlur={() => save('institution', form.institution)} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Degree" value={form.degree} onChange={(v) => setForm(f => ({...f, degree: v}))} onBlur={() => save('degree', form.degree)} />
            <Field label="Field"  value={form.field}  onChange={(v) => setForm(f => ({...f, field: v}))}  onBlur={() => save('field', form.field)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Start" value={form.start} onChange={(v) => setForm(f => ({...f, start: v}))} onBlur={() => save('start', form.start)} placeholder="2018" />
            <Field label="End"   value={form.end}   onChange={(v) => setForm(f => ({...f, end: v}))}   onBlur={() => save('end', form.end)}   placeholder="2022" />
            <Field label="GPA"   value={form.gpa}   onChange={(v) => setForm(f => ({...f, gpa: v}))}   onBlur={() => save('gpa', form.gpa)}   placeholder="3.8" />
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
//  Skills editor
// ---------------------------------------------------------------------------

const SkillsEditor: React.FC<{
  profile: CvProfileDto;
  addItem: (s: string, item: any) => Promise<any>;
  updateItem: (s: string, id: string, patch: any) => Promise<any>;
  removeItem: (s: string, id: string) => Promise<any>;
}> = ({ profile, addItem, updateItem, removeItem }) => {
  const list: any[] = profile.skills || [];
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<string>('technical');
  const [newLevel, setNewLevel] = useState<string>('intermediate');
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    await addItem('skills', { name: newName.trim(), category: newCat, level: newLevel });
    setNewName('');
    setBusy(false);
  };

  return (
    <Collapsible title="Skills" badge={list.length}>
      <div className="space-y-1.5">
        {list.map((s: any) => (
          <div key={s.id} className="flex items-center gap-1.5 group">
            <input
              defaultValue={s.name}
              onBlur={(e) => { if (e.target.value !== s.name) updateItem('skills', s.id, { name: e.target.value }); }}
              className="flex-1 h-6 px-1.5 text-[11px] border border-[#E3E1DA] rounded focus:border-[#4F7563] focus:outline-none"
            />
            <select
              defaultValue={s.level || 'intermediate'}
              onChange={(e) => updateItem('skills', s.id, { level: e.target.value })}
              className="h-6 px-1 text-[10px] border border-[#E3E1DA] rounded bg-white"
            >
              {SKILL_LEVELS.map((l) => <option key={l} value={l}>{l.slice(0,3)}</option>)}
            </select>
            <button onClick={() => removeItem('skills', s.id)} className="p-0.5 text-[#C9C6BD] hover:text-red-500 opacity-0 group-hover:opacity-100">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {/* Add new */}
        <div className="flex gap-1 mt-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="Skill name"
            className="flex-1 h-7 px-1.5 text-xs border border-[#C9C6BD] rounded focus:border-[#4F7563] focus:outline-none"
          />
          <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className="h-7 px-1 text-[10px] border border-[#C9C6BD] rounded bg-white">
            {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={handleAdd} disabled={!newName.trim() || busy}
            className="h-7 px-2 text-xs font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846] disabled:opacity-40">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </Collapsible>
  );
};

// ---------------------------------------------------------------------------
//  Languages editor
// ---------------------------------------------------------------------------

const LanguagesEditor: React.FC<{
  profile: CvProfileDto;
  addItem: (s: string, item: any) => Promise<any>;
  updateItem: (s: string, id: string, patch: any) => Promise<any>;
  removeItem: (s: string, id: string) => Promise<any>;
}> = ({ profile, addItem, updateItem, removeItem }) => {
  const list: any[] = profile.languages || [];
  const [newName, setNewName] = useState('');
  const [newProf, setNewProf] = useState<string>('fluent');
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    await addItem('languages', { name: newName.trim(), proficiency: newProf });
    setNewName('');
    setBusy(false);
  };

  return (
    <Collapsible title="Languages" badge={list.length}>
      <div className="space-y-1.5">
        {list.map((l: any) => (
          <div key={l.id} className="flex items-center gap-1.5 group">
            <input
              defaultValue={l.name}
              onBlur={(e) => { if (e.target.value !== l.name) updateItem('languages', l.id, { name: e.target.value }); }}
              className="flex-1 h-6 px-1.5 text-[11px] border border-[#E3E1DA] rounded focus:border-[#4F7563] focus:outline-none"
            />
            <select
              defaultValue={l.proficiency || 'fluent'}
              onChange={(e) => updateItem('languages', l.id, { proficiency: e.target.value })}
              className="h-6 px-1 text-[10px] border border-[#E3E1DA] rounded bg-white"
            >
              {PROFICIENCY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={() => removeItem('languages', l.id)} className="p-0.5 text-[#C9C6BD] hover:text-red-500 opacity-0 group-hover:opacity-100">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <div className="flex gap-1 mt-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="Language"
            className="flex-1 h-7 px-1.5 text-xs border border-[#C9C6BD] rounded focus:border-[#4F7563] focus:outline-none"
          />
          <select value={newProf} onChange={(e) => setNewProf(e.target.value)} className="h-7 px-1 text-[10px] border border-[#C9C6BD] rounded bg-white">
            {PROFICIENCY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={handleAdd} disabled={!newName.trim() || busy}
            className="h-7 px-2 text-xs font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846] disabled:opacity-40">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </Collapsible>
  );
};

// ---------------------------------------------------------------------------
//  Certifications editor
// ---------------------------------------------------------------------------

const CertificationsEditor: React.FC<{
  profile: CvProfileDto;
  addItem: (s: string, item: any) => Promise<any>;
  updateItem: (s: string, id: string, patch: any) => Promise<any>;
  removeItem: (s: string, id: string) => Promise<any>;
}> = ({ profile, addItem, updateItem, removeItem }) => {
  const list: any[] = profile.certifications || [];
  const [busy, setBusy] = useState(false);
  const addCertification = async () => {
    setBusy(true);
    try {
      await addItem('certifications', { name: 'Certification', issuer: '', date: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Collapsible title="Certifications" badge={list.length}>
      <div className="space-y-2">
        {list.map((c: any) => (
          <div key={c.id} className="border border-[#E3E1DA] rounded p-2 space-y-1.5 group relative">
            <button onClick={() => removeItem('certifications', c.id)} className="absolute top-1.5 right-1.5 p-0.5 text-[#C9C6BD] hover:text-red-500 opacity-0 group-hover:opacity-100">
              <X className="w-3 h-3" />
            </button>
            <Field label="Name"   defaultValue={c.name}   onBlur={(v) => updateItem('certifications', c.id, { name: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Issuer" defaultValue={c.issuer || ''} onBlur={(v) => updateItem('certifications', c.id, { issuer: v })} />
              <Field label="Date"   defaultValue={c.date || ''}   onBlur={(v) => updateItem('certifications', c.id, { date: v })} placeholder="2023" />
            </div>
          </div>
        ))}
        <button onClick={addCertification}
          disabled={busy}
          className="w-full h-7 text-[11px] font-semibold border border-dashed border-[#C9C6BD] rounded hover:border-[#4F7563] hover:text-[#4F7563] flex items-center justify-center gap-1 text-[#9A9A9A] disabled:opacity-40">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Certification
        </button>
      </div>
    </Collapsible>
  );
};

// ---------------------------------------------------------------------------
//  Awards editor
// ---------------------------------------------------------------------------

const AwardsEditor: React.FC<{
  profile: CvProfileDto;
  addItem: (s: string, item: any) => Promise<any>;
  updateItem: (s: string, id: string, patch: any) => Promise<any>;
  removeItem: (s: string, id: string) => Promise<any>;
}> = ({ profile, addItem, updateItem, removeItem }) => {
  const list: any[] = profile.awards || [];
  const [busy, setBusy] = useState(false);
  const addAward = async () => {
    setBusy(true);
    try {
      await addItem('awards', { title: 'Award', issuer: '', date: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Collapsible title="Awards" badge={list.length}>
      <div className="space-y-2">
        {list.map((a: any) => (
          <div key={a.id} className="border border-[#E3E1DA] rounded p-2 space-y-1.5 group relative">
            <button onClick={() => removeItem('awards', a.id)} className="absolute top-1.5 right-1.5 p-0.5 text-[#C9C6BD] hover:text-red-500 opacity-0 group-hover:opacity-100">
              <X className="w-3 h-3" />
            </button>
            <Field label="Title"  defaultValue={a.title}       onBlur={(v) => updateItem('awards', a.id, { title: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Issuer" defaultValue={a.issuer || ''} onBlur={(v) => updateItem('awards', a.id, { issuer: v })} />
              <Field label="Date"   defaultValue={a.date || ''}   onBlur={(v) => updateItem('awards', a.id, { date: v })} />
            </div>
          </div>
        ))}
        <button onClick={addAward}
          disabled={busy}
          className="w-full h-7 text-[11px] font-semibold border border-dashed border-[#C9C6BD] rounded hover:border-[#4F7563] hover:text-[#4F7563] flex items-center justify-center gap-1 text-[#9A9A9A] disabled:opacity-40">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Award
        </button>
      </div>
    </Collapsible>
  );
};

// ---------------------------------------------------------------------------
//  Projects editor
// ---------------------------------------------------------------------------

const ProjectsEditor: React.FC<{
  profile: CvProfileDto;
  addItem: (s: string, item: any) => Promise<any>;
  updateItem: (s: string, id: string, patch: any) => Promise<any>;
  removeItem: (s: string, id: string) => Promise<any>;
}> = ({ profile, addItem, updateItem, removeItem }) => {
  const list: any[] = profile.projects || [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const addProject = async () => {
    setBusy(true);
    try {
      await addItem('projects', { name: 'Project', description: '', technologies: [] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Collapsible title="Projects" badge={list.length}>
      <div className="space-y-2">
        {list.map((p: any) => (
          <div key={p.id} className="border border-[#E3E1DA] rounded overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-1.5 bg-[#F8F7F4]">
              <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="flex-1 text-left text-[11px] font-semibold truncate">{p.name || 'Untitled'}</button>
              <button onClick={() => removeItem('projects', p.id)} className="p-0.5 text-[#C9C6BD] hover:text-red-500"><X className="w-3 h-3" /></button>
              <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="p-0.5 text-[#C9C6BD]"><ChevronDown className={`w-3 h-3 transition-transform ${expandedId === p.id ? 'rotate-180' : ''}`} /></button>
            </div>
            {expandedId === p.id && (
              <div className="px-2 pb-2 space-y-2">
                <Field label="Project Name" defaultValue={p.name || ''} onBlur={(v) => updateItem('projects', p.id, { name: v })} />
                <label className="block">
                  <span className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">Description</span>
                  <textarea defaultValue={p.description || ''} onBlur={(e) => updateItem('projects', p.id, { description: e.target.value })}
                    rows={3} className="mt-0.5 w-full px-1.5 py-1 text-xs border border-[#C9C6BD] rounded resize-none focus:border-[#4F7563] focus:outline-none" />
                </label>
                <Field label="Technologies (comma-separated)" defaultValue={(p.technologies || []).join(', ')}
                  onBlur={(v) => updateItem('projects', p.id, { technologies: v.split(',').map((s: string) => s.trim()).filter(Boolean) })} />
              </div>
            )}
          </div>
        ))}
        <button onClick={addProject}
          disabled={busy}
          className="w-full h-7 text-[11px] font-semibold border border-dashed border-[#C9C6BD] rounded hover:border-[#4F7563] hover:text-[#4F7563] flex items-center justify-center gap-1 text-[#9A9A9A] disabled:opacity-40">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Project
        </button>
      </div>
    </Collapsible>
  );
};

// ---------------------------------------------------------------------------
//  Publications editor
// ---------------------------------------------------------------------------

const PublicationsEditor: React.FC<{
  profile: CvProfileDto;
  addItem: (s: string, item: any) => Promise<any>;
  updateItem: (s: string, id: string, patch: any) => Promise<any>;
  removeItem: (s: string, id: string) => Promise<any>;
}> = ({ profile, addItem, updateItem, removeItem }) => {
  const list: any[] = profile.publications || [];
  const [busy, setBusy] = useState(false);
  const addPublication = async () => {
    setBusy(true);
    try {
      await addItem('publications', { title: 'Publication', venue: '', date: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Collapsible title="Publications" badge={list.length}>
      <div className="space-y-2">
        {list.map((p: any) => (
          <div key={p.id} className="border border-[#E3E1DA] rounded p-2 space-y-1.5 group relative">
            <button onClick={() => removeItem('publications', p.id)} className="absolute top-1.5 right-1.5 p-0.5 text-[#C9C6BD] hover:text-red-500 opacity-0 group-hover:opacity-100">
              <X className="w-3 h-3" />
            </button>
            <Field label="Title" defaultValue={p.title || ''} onBlur={(v) => updateItem('publications', p.id, { title: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Venue" defaultValue={p.venue || ''} onBlur={(v) => updateItem('publications', p.id, { venue: v })} />
              <Field label="Date"  defaultValue={p.date  || ''} onBlur={(v) => updateItem('publications', p.id, { date: v })} placeholder="2023" />
            </div>
            <Field label="URL" defaultValue={p.url || ''} onBlur={(v) => updateItem('publications', p.id, { url: v })} placeholder="https://…" />
          </div>
        ))}
        <button onClick={addPublication}
          disabled={busy}
          className="w-full h-7 text-[11px] font-semibold border border-dashed border-[#C9C6BD] rounded hover:border-[#4F7563] hover:text-[#4F7563] flex items-center justify-center gap-1 text-[#9A9A9A] disabled:opacity-40">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Publication
        </button>
      </div>
    </Collapsible>
  );
};

// ---------------------------------------------------------------------------
//  References editor
// ---------------------------------------------------------------------------

const ReferencesEditor: React.FC<{
  profile: CvProfileDto;
  addItem: (s: string, item: any) => Promise<any>;
  updateItem: (s: string, id: string, patch: any) => Promise<any>;
  removeItem: (s: string, id: string) => Promise<any>;
}> = ({ profile, addItem, updateItem, removeItem }) => {
  const list: any[] = profile.references || [];
  const [busy, setBusy] = useState(false);
  const addReference = async () => {
    setBusy(true);
    try {
      await addItem('references', { name: 'Reference Name', title: '', company: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Collapsible title="References" badge={list.length}>
      <div className="space-y-2">
        {list.map((r: any) => (
          <div key={r.id} className="border border-[#E3E1DA] rounded p-2 space-y-1.5 group relative">
            <button onClick={() => removeItem('references', r.id)} className="absolute top-1.5 right-1.5 p-0.5 text-[#C9C6BD] hover:text-red-500 opacity-0 group-hover:opacity-100">
              <X className="w-3 h-3" />
            </button>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Name"  defaultValue={r.name  || ''} onBlur={(v) => updateItem('references', r.id, { name: v })} />
              <Field label="Title" defaultValue={r.title || ''} onBlur={(v) => updateItem('references', r.id, { title: v })} />
            </div>
            <Field label="Company" defaultValue={r.company || ''} onBlur={(v) => updateItem('references', r.id, { company: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Email" defaultValue={r.email || ''} onBlur={(v) => updateItem('references', r.id, { email: v })} />
              <Field label="Phone" defaultValue={r.phone || ''} onBlur={(v) => updateItem('references', r.id, { phone: v })} />
            </div>
          </div>
        ))}
        <button onClick={addReference}
          disabled={busy}
          className="w-full h-7 text-[11px] font-semibold border border-dashed border-[#C9C6BD] rounded hover:border-[#4F7563] hover:text-[#4F7563] flex items-center justify-center gap-1 text-[#9A9A9A] disabled:opacity-40">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add Reference
        </button>
      </div>
    </Collapsible>
  );
};

// =============================================================================
//  Cover letter / Portfolio editors (unchanged from Phase 42B)
// =============================================================================

const CoverLetterEditor: React.FC<{ doc: CvDocumentDto; onChange: (d: CvDocumentDto) => void }> = ({ doc, onChange }) => {
  const c: any = doc.content || {};
  const patch = (p: any) => onChange({ ...doc, content: { ...c, ...p } });
  return (
    <div className="p-3 space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-1">Cover Letter</div>
      <LabeledTextarea label="Greeting"       value={c.greeting ?? 'Dear Hiring Manager,'} onChange={(v) => patch({ greeting: v })} rows={1} />
      <LabeledTextarea label="Company"        value={c.company ?? ''}                       onChange={(v) => patch({ company: v })} rows={1} />
      <LabeledTextarea label="Role"           value={c.role ?? ''}                          onChange={(v) => patch({ role: v })} rows={1} />
      <LabeledTextarea label="Intro"          value={c.intro ?? ''}                         onChange={(v) => patch({ intro: v })} rows={3} />
      <LabeledTextarea label="Body"           value={(c.body ?? []).join('\n\n')}            onChange={(v) => patch({ body: v.split(/\n\n+/) })} rows={8} />
      <LabeledTextarea label="Why this company" value={c.whyCompany ?? ''}                  onChange={(v) => patch({ whyCompany: v })} rows={3} />
      <LabeledTextarea label="Closing"        value={c.closing ?? 'Sincerely,'}             onChange={(v) => patch({ closing: v })} rows={1} />
      <LabeledTextarea label="Signature"      value={c.signature ?? ''}                     onChange={(v) => patch({ signature: v })} rows={1} />
    </div>
  );
};

const PortfolioEditor: React.FC<{ doc: CvDocumentDto; onChange: (d: CvDocumentDto) => void }> = ({ doc, onChange }) => {
  const c: any = doc.content || { sections: [] };
  const patch = (p: any) => onChange({ ...doc, content: { ...c, ...p } });
  return (
    <div className="p-3 space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-1">Portfolio sections</div>
      <ul className="space-y-2">
        {(c.sections || []).map((s: any, i: number) => (
          <li key={i} className="border border-[#E3E1DA] rounded p-2 space-y-1">
            <input value={s.title} onChange={(e) => {
              const next = [...c.sections]; next[i] = { ...s, title: e.target.value }; patch({ sections: next });
            }} className="w-full h-7 px-1.5 text-xs font-semibold border border-[#C9C6BD] rounded" />
            <textarea value={s.body ?? ''} onChange={(e) => {
              const next = [...c.sections]; next[i] = { ...s, body: e.target.value }; patch({ sections: next });
            }} rows={3} className="w-full px-1.5 py-1 text-xs border border-[#C9C6BD] rounded resize-none" />
          </li>
        ))}
      </ul>
      <button onClick={() => patch({ sections: [...(c.sections || []), { key: `s${(c.sections || []).length + 1}`, title: 'New section' }] })}
        className="h-7 px-2 text-xs font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846] inline-flex items-center gap-1">
        <Plus className="w-3 h-3" /> Add section
      </button>
    </div>
  );
};

// =============================================================================
//  DnD sortable section list (Layout tab)
// =============================================================================

const SortableSections: React.FC<{
  items: string[];
  onReorder: (next: string[]) => void;
  onRemove: (key: string) => void;
}> = ({ items, onReorder, onRemove }) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.indexOf(String(active.id));
    const to   = items.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1">
          {items.map((key) => <SortableSectionRow key={key} id={key} onRemove={() => onRemove(key)} />)}
        </ul>
      </SortableContext>
    </DndContext>
  );
};

const SortableSectionRow: React.FC<{ id: string; onRemove: () => void }> = ({ id, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const label = CV_SECTIONS.find((s) => s.key === id)?.label || id;
  return (
    <li ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 1 : undefined }}
      className={`flex items-center gap-1 text-xs bg-[#F8F7F4] border border-[#E3E1DA] rounded px-2 py-1.5 ${isDragging ? 'shadow ring-1 ring-blue-300' : ''}`}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 text-[#C9C6BD] hover:text-[#111111]" aria-label="Drag">
        <GripVertical className="w-3 h-3" />
      </button>
      <span className="flex-1 select-none">{label}</span>
      <button onClick={onRemove} className="p-0.5 text-[#C9C6BD] hover:text-red-500 rounded" title="Remove">
        <Trash2 className="w-3 h-3" />
      </button>
    </li>
  );
};

// =============================================================================
//  Utility components
// =============================================================================

// Field: supports both controlled (value+onChange+onBlur) and uncontrolled (defaultValue+onBlur) patterns
const Field: React.FC<{
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  onBlur?: (v: string) => void;
  placeholder?: string;
  type?: string;
}> = ({ label, value, defaultValue, onChange, onBlur, placeholder, type = 'text' }) => {
  const controlled = value !== undefined;
  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-[#9A9A9A] uppercase tracking-wider">{label}</span>
      <input
        type={type}
        {...(controlled ? { value, onChange: (e) => onChange?.(e.target.value) } : { defaultValue })}
        onBlur={(e) => onBlur?.(e.target.value)}
        placeholder={placeholder}
        className="mt-0.5 w-full h-7 px-1.5 text-xs border border-[#C9C6BD] rounded focus:border-[#4F7563] focus:outline-none"
      />
    </label>
  );
};

const LabeledTextarea: React.FC<{ label: string; value: string; onChange: (v: string) => void; rows: number }> = ({ label, value, onChange, rows }) => (
  <label className="block text-[11px]">
    <span className="block font-semibold text-[#111111] mb-1">{label}</span>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
      className="w-full px-1.5 py-1 text-xs border border-[#C9C6BD] rounded resize-none focus:border-[#4F7563] focus:outline-none" />
  </label>
);
