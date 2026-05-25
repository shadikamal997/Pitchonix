'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Download, Loader2, Plus, Trash2, GripVertical, Sparkles,
} from 'lucide-react';
import api from '@/lib/api';
import { useCvProfile, useCvTemplates, CvDocumentDto, CvDoctype } from '@/features/career/hooks';
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
//  Phase 42B-E — Visual builder for one CV / Resume / Cover Letter / Portfolio.
//
//  Layout:
//    Left  — section list (reorder, toggle visibility, add)
//    Right — live preview iframe (HTML export of the doc)
//    Top   — title + template dropdown + export buttons
//
//  Reorder is via up/down arrows for simplicity (full drag-and-drop is a
//  larger interaction layer; the data model already supports arbitrary
//  reorders via the API).
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

interface Toast { id: number; message: string; tone: 'success' | 'error' | 'info'; onUndo?: () => void }

export default function CvBuilderPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const { profile } = useCvProfile();
  const [doc, setDoc] = useState<CvDocumentDto | null>(null);
  const [busy, setBusy] = useState<'save'|'pdf'|'docx'|'html'|'pptx'|'md'|null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const { items: templates } = useCvTemplates(doc?.doctype);
  // Phase 42.2A — toasts + undo stack.
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (message: string, tone: Toast['tone'] = 'info', onUndo?: () => void) => {
    const t: Toast = { id: Date.now() + Math.random(), message, tone, onUndo };
    setToasts((cur) => [...cur, t]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== t.id)), 5000);
  };

  // Load the document.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<CvDocumentDto>(`/career/documents/${id}`);
        if (!cancelled) setDoc(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.message || e?.message || 'Failed to load');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Re-render preview whenever doc/profile changes.
  useEffect(() => {
    if (!doc || !profile) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post(`/career/documents/${doc.id}/export?format=html`, null, { responseType: 'blob' });
        const text = await (res.data as Blob).text();
        if (!cancelled) setPreviewHtml(text);
      } catch {
        if (!cancelled) setPreviewHtml('<p style="padding:24px;color:#94A3B8">Preview unavailable</p>');
      }
    })();
    return () => { cancelled = true; };
  }, [doc, profile?.updatedAt]);

  const save = async () => {
    if (!doc) return;
    setBusy('save'); setError(null);
    try {
      const { data } = await api.patch<CvDocumentDto>(`/career/documents/${doc.id}`, {
        title:      doc.title,
        templateId: doc.templateId,
        content:    doc.content,
      });
      setDoc(data);
    } catch (e: any) { setError(e?.response?.data?.message || e?.message); }
    finally { setBusy(null); }
  };

  /**
   * Phase 42.2A — optimistic auto-save with undo.
   * Caller passes the next content + an undo snapshot. We update local state
   * immediately, fire-and-forget the PATCH, and show a toast with Undo.
   * Errors revert + toast.
   */
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
      // Rollback on failure.
      setDoc((cur) => cur ? { ...cur, content: snapshot } : cur);
      pushToast(`Save failed: ${e?.response?.data?.message || e?.message || ''}`, 'error');
    }
  };

  const exportFile = async (format: 'pdf' | 'docx' | 'html' | 'pptx' | 'md') => {
    if (!doc) return;
    setBusy(format);
    try {
      const res = await api.post(`/career/documents/${doc.id}/export?format=${format}`, null, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${doc.title}.${format === 'html' ? 'html' : format}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } finally { setBusy(null); }
  };

  if (!doc) return <div className="p-6 text-sm text-[#9A9A9A]">{error || 'Loading…'}</div>;

  const sectionOrder: string[] = (doc.content?.sectionOrder) || CV_SECTIONS.map((s) => s.key);
  const isCV = doc.doctype === 'cv' || doc.doctype === 'resume';

  return (
    <div className="h-screen flex flex-col bg-[#EDEBE6]">
      <header className="bg-white border-b border-[#E3E1DA] px-6 h-14 flex items-center gap-3">
        <Link href="/career" className="text-xs text-[#9A9A9A] hover:text-[#111111] flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="h-5 w-px bg-[#E3E1DA]" />
        <input value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })}
          className="text-sm font-bold text-[#111111] bg-transparent border-b border-transparent focus:border-[#C9C6BD] outline-none w-72" />

        <select
          value={doc.templateId ?? ''}
          onChange={(e) => setDoc({ ...doc, templateId: e.target.value || null })}
          className="h-7 px-2 text-xs border border-[#C9C6BD] rounded bg-white"
        >
          <option value="">No template</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.category} · {t.name}</option>)}
        </select>

        {/* Phase 37.3F — canonical Brand Kit picker.
            Persists to doc.brandKitId so the career export pipeline
            (resolveBrandTokens) injects the kit's tokens at render time. */}
        {doc.brandKitId && <BrandKitBadge kitId={doc.brandKitId} />}
        <BrandKitPicker
          mode="select"
          value={doc.brandKitId ?? null}
          onSelect={async (kitId: string | null) => {
            const prev = doc;
            setDoc({ ...doc, brandKitId: kitId });
            try {
              await api.patch(`/career/documents/${doc.id}`, { brandKitId: kitId });
              pushToast(kitId ? 'Brand kit applied' : 'Brand kit cleared', 'success');
            } catch (e: any) {
              pushToast(`Save failed: ${e?.response?.data?.message || e?.message || ''}`, 'error');
              setDoc(prev);
            }
          }}
        />


        <div className="ml-auto flex items-center gap-1.5">
          {error && <span className="text-[11px] text-[#9a3737] mr-2">{error}</span>}
          <button onClick={save} disabled={busy !== null}
            className="h-7 px-2 text-xs font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846] inline-flex items-center gap-1 disabled:opacity-40">
            {busy === 'save' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
          </button>
          <button onClick={() => exportFile('pdf')} disabled={busy !== null}
            className="h-7 px-2 text-xs font-semibold bg-[#F1F0EC] text-[#111111] rounded hover:bg-[#E3E1DA] inline-flex items-center gap-1 disabled:opacity-40">
            {busy === 'pdf' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} PDF
          </button>
          <button onClick={() => exportFile('docx')} disabled={busy !== null}
            className="h-7 px-2 text-xs font-semibold bg-[#F1F0EC] text-[#111111] rounded hover:bg-[#E3E1DA] inline-flex items-center gap-1 disabled:opacity-40">
            <Download className="w-3 h-3" /> DOCX
          </button>
          <button onClick={() => exportFile('html')} disabled={busy !== null}
            className="h-7 px-2 text-xs font-semibold bg-[#F1F0EC] text-[#111111] rounded hover:bg-[#E3E1DA] inline-flex items-center gap-1 disabled:opacity-40">
            <Download className="w-3 h-3" /> HTML
          </button>
          {/* Phase Ω.1 — surface the PPTX + Markdown export targets the backend
              already supports (career.controller line 41). */}
          <button onClick={() => exportFile('pptx')} disabled={busy !== null}
            className="h-7 px-2 text-xs font-semibold bg-[#F1F0EC] text-[#111111] rounded hover:bg-[#E3E1DA] inline-flex items-center gap-1 disabled:opacity-40">
            <Download className="w-3 h-3" /> PPTX
          </button>
          <button onClick={() => exportFile('md')} disabled={busy !== null}
            className="h-7 px-2 text-xs font-semibold bg-[#F1F0EC] text-[#111111] rounded hover:bg-[#E3E1DA] inline-flex items-center gap-1 disabled:opacity-40">
            <Download className="w-3 h-3" /> MD
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-[280px_1fr] gap-0 overflow-hidden">
        <aside className="bg-white border-r border-[#E3E1DA] overflow-y-auto p-3">
          {isCV ? (
            <>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-2">Sections</div>
              <SortableSections
                items={sectionOrder}
                onReorder={(next) => autoSaveContent({ ...doc.content, sectionOrder: next }, 'Section order saved')}
                onRemove={(key) => {
                  const next = sectionOrder.filter((s) => s !== key);
                  autoSaveContent({ ...doc.content, sectionOrder: next }, 'Section removed');
                }}
              />
              <div className="mt-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-1">Add section</div>
                <div className="flex flex-wrap gap-1">
                  {CV_SECTIONS.filter((s) => !sectionOrder.includes(s.key)).map((s) => (
                    <button key={s.key} onClick={() => autoSaveContent({ ...doc.content, sectionOrder: [...sectionOrder, s.key] }, `${s.label} added`)}
                      className="h-6 px-2 text-[10px] bg-[#F1F0EC] text-[#111111] rounded hover:bg-[#E3E1DA] inline-flex items-center gap-0.5">
                      <Plus className="w-2.5 h-2.5" /> {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 p-2.5 bg-[#EEF5F1] border border-[#DDE8E1] rounded text-[10px] text-[#1A2D24]">
                <Sparkles className="w-3 h-3 inline mr-1" />
                Edit profile data in <Link href="/career" className="underline">Career → Profile</Link>;
                section content lives there so every CV stays in sync.
              </div>
            </>
          ) : doc.doctype === 'coverLetter' ? (
            <CoverLetterEditor doc={doc} onChange={setDoc} />
          ) : (
            <PortfolioEditor doc={doc} onChange={setDoc} />
          )}
        </aside>

        <main className="overflow-auto bg-[#F1F0EC] p-4">
          {previewHtml ? (
            <iframe
              title="preview"
              srcDoc={previewHtml}
              className="w-full h-full bg-white border border-[#E3E1DA] rounded"
              style={{ minHeight: '80vh' }}
            />
          ) : (
            <div className="text-xs text-[#9A9A9A] italic">Rendering preview…</div>
          )}
        </main>
      </div>

      {/* Phase 42.2A — toast overlay */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div key={t.id}
            className={`flex items-center gap-2 px-3 py-2 rounded shadow-lg text-xs animate-in fade-in slide-in-from-bottom-2
              ${t.tone === 'success' ? 'bg-[#EEF5F1] border border-[#DDE8E1] text-[#1A2D24]'
              : t.tone === 'error'  ? 'bg-[#FCF1F1]   border border-[#F7E3E3]   text-red-900'
              :                       'bg-slate-900 text-white'}`}
          >
            <span className="flex-1">{t.message}</span>
            {t.onUndo && (
              <button onClick={() => { t.onUndo!(); setToasts((cur) => cur.filter((x) => x.id !== t.id)); }}
                className="text-xs font-bold underline">Undo</button>
            )}
            <button onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}
              className="text-xs opacity-60 hover:opacity-100">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
//  Cover letter editor (focused on letter fields)
// =============================================================================

const CoverLetterEditor: React.FC<{ doc: CvDocumentDto; onChange: (d: CvDocumentDto) => void }> = ({ doc, onChange }) => {
  const c: any = doc.content || {};
  const patch = (p: any) => onChange({ ...doc, content: { ...c, ...p } });
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-1">Cover Letter</div>
      <Textarea label="Greeting" value={c.greeting ?? 'Dear Hiring Manager,'} onChange={(v) => patch({ greeting: v })} rows={1} />
      <Textarea label="Company" value={c.company ?? ''} onChange={(v) => patch({ company: v })} rows={1} />
      <Textarea label="Role"    value={c.role ?? ''}    onChange={(v) => patch({ role: v })} rows={1} />
      <Textarea label="Intro"   value={c.intro ?? ''}   onChange={(v) => patch({ intro: v })} rows={3} />
      <Textarea label="Body"    value={(c.body ?? []).join('\n\n')} onChange={(v) => patch({ body: v.split(/\n\n+/) })} rows={8} />
      <Textarea label="Why this company" value={c.whyCompany ?? ''} onChange={(v) => patch({ whyCompany: v })} rows={3} />
      <Textarea label="Closing" value={c.closing ?? 'Sincerely,'}    onChange={(v) => patch({ closing: v })} rows={1} />
      <Textarea label="Signature" value={c.signature ?? ''}          onChange={(v) => patch({ signature: v })} rows={1} />
    </div>
  );
};

// =============================================================================
//  Portfolio editor (sections + showcase project ids)
// =============================================================================

const PortfolioEditor: React.FC<{ doc: CvDocumentDto; onChange: (d: CvDocumentDto) => void }> = ({ doc, onChange }) => {
  const c: any = doc.content || { sections: [] };
  const patch = (p: any) => onChange({ ...doc, content: { ...c, ...p } });
  const addSection = () => patch({ sections: [...(c.sections || []), { key: `s${(c.sections || []).length + 1}`, title: 'New section' }] });
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A] mb-1">Portfolio sections</div>
      <ul className="space-y-2">
        {(c.sections || []).map((s: any, i: number) => (
          <li key={i} className="border border-[#E3E1DA] rounded p-2 space-y-1">
            <input value={s.title} onChange={(e) => {
              const next = [...c.sections]; next[i] = { ...s, title: e.target.value };
              patch({ sections: next });
            }} className="w-full h-7 px-1.5 text-xs font-semibold border border-[#C9C6BD] rounded" />
            <textarea value={s.body ?? ''} onChange={(e) => {
              const next = [...c.sections]; next[i] = { ...s, body: e.target.value };
              patch({ sections: next });
            }} rows={3} placeholder="Section body…" className="w-full px-1.5 py-1 text-xs border border-[#C9C6BD] rounded resize-none" />
          </li>
        ))}
      </ul>
      <button onClick={addSection} className="h-7 px-2 text-xs font-semibold bg-[#4F7563] text-white rounded hover:bg-[#355846] inline-flex items-center gap-1">
        <Plus className="w-3 h-3" /> Add section
      </button>
    </div>
  );
};

const Textarea: React.FC<{ label: string; value: string; onChange: (v: string) => void; rows: number }> = ({ label, value, onChange, rows }) => (
  <label className="block text-[11px]">
    <span className="block font-semibold text-[#111111] mb-1">{label}</span>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
      className="w-full px-1.5 py-1 text-xs border border-[#C9C6BD] rounded resize-none" />
  </label>
);

// =============================================================================
//  Phase 42.1 — Drag-and-drop sortable section list (dnd-kit).
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
          {items.map((key) => (
            <SortableSectionRow key={key} id={key} onRemove={() => onRemove(key)} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
};

const SortableSectionRow: React.FC<{ id: string; onRemove: () => void }> = ({ id, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const label = CV_SECTIONS.find((s) => s.key === id)?.label || id;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex:  isDragging ? 1 : undefined,
  };
  return (
    <li ref={setNodeRef} style={style}
      className={`flex items-center gap-1 text-xs bg-[#EDEBE6] border border-[#E3E1DA] rounded px-2 py-1.5 ${isDragging ? 'shadow-md ring-1 ring-blue-300' : ''}`}>
      <button
        {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 text-[#C9C6BD] hover:text-[#111111]"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-3 h-3" />
      </button>
      <span className="flex-1 select-none">{label}</span>
      <button onClick={onRemove} className="p-0.5 text-[#9a3737] hover:bg-[#FCF1F1] rounded" title="Remove">
        <Trash2 className="w-3 h-3" />
      </button>
    </li>
  );
};
