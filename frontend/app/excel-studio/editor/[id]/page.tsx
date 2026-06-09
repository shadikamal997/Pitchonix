'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Table2,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '@/lib/api';
import {
  applyExcelAction,
  createExcelWorkbookOperation,
  createExcelWorkbookSnapshot,
  enhanceExcelProject,
  getExcelProject,
  listExcelTemplates,
  listExcelWorkbookOperations,
  listExcelWorkbookSnapshots,
  redoExcelWorkbookOperation,
  restoreExcelWorkbookSnapshot,
  undoExcelWorkbookOperation,
  updateExcelProject,
} from '@/features/excel-studio/api';
import type {
  ExcelCell,
  ExcelProject,
  ExcelTemplate,
  ExcelWorkbookOperationInput,
  ExcelWorkbookOperationRecord,
  ExcelWorkbookSnapshotRecord,
  ExcelWorksheet,
} from '@/features/excel-studio/types';
import { formatDate, formatFileSize, formatNumber } from '@/features/excel-studio/format';

type ViewMode = 'workbook' | 'dashboard' | 'issues' | 'before-after';
type MenuKey = 'file' | 'edit' | 'insert' | 'format' | 'data' | 'review' | 'enhance' | 'templates' | 'export';
type RightPanel = 'properties' | 'audit' | 'enhance' | 'snapshots';

const STATIC_MENUS: Array<{ key: MenuKey; label: string; items: string[] }> = [
  { key: 'file',      label: 'File',      items: ['Save project', 'Export Original Workbook', 'Export Enhanced Workbook', 'Download JSON', 'Download CSV', 'Back to projects'] },
  { key: 'edit',      label: 'Edit',      items: ['Undo last operation', 'Redo last operation', 'Rename workbook', 'Freeze header row', 'Mark source data protected'] },
  { key: 'insert',    label: 'Insert',    items: ['Executive summary sheet', 'KPI block', 'Audit sheet', 'Dashboard chart'] },
  { key: 'format',    label: 'Format',    items: ['Standardize headers', 'Apply table style', 'Normalize spacing', 'Highlight exceptions'] },
  { key: 'data',      label: 'Data',      items: ['Validate duplicates', 'Review blanks', 'Map tables', 'Formula dependency audit'] },
  { key: 'review',    label: 'Review',    items: ['Show critical issues', 'Show all recommendations', 'Create snapshot', 'Export Audit PDF', 'Export Issue Report'] },
  { key: 'enhance',   label: 'Enhance',   items: ['Apply enhancement plan', 'Build executive dashboard', 'Modernize workbook', 'Prepare board export'] },
  { key: 'templates', label: 'Templates', items: [] },
  { key: 'export',    label: 'Export',    items: ['Export Enhanced Workbook', 'Export Original Workbook', 'Export Comparison Workbook', 'Export Before/After Workbook', 'Export Board Package', 'Export Audit PDF', 'Export Executive PDF', 'Export Dashboard PDF', 'Export Change Log', 'Export Issue Report', 'Export JSON', 'Export CSV'] },
];

const ACTION_MAP: Record<string, string> = {
  'Executive summary sheet':    'executiveSummary',
  'Audit sheet':                'auditSheet',
  'Dashboard chart':            'dashboardSheet',
  'KPI block':                  'dashboardSheet',
  'Standardize headers':        'standardizeHeaders',
  'Apply table style':          'modernizeWorkbook',
  'Normalize spacing':          'modernizeWorkbook',
  'Highlight exceptions':       'auditSheet',
  'Validate duplicates':        'validateDuplicates',
  'Review blanks':              'reviewBlanks',
  'Map tables':                 'modernizeWorkbook',
  'Formula dependency audit':   'formulaAudit',
  'Show all recommendations':   'auditSheet',
  'Freeze header row':          'freezeHeaderRow',
  'Mark source data protected': 'protectSource',
  'Build executive dashboard':  'dashboardSheet',
  'Modernize workbook':         'modernizeWorkbook',
  'Prepare board export':       'modernizeWorkbook',
};

export default function ExcelEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id || '');

  const [project, setProject] = useState<ExcelProject | null>(null);
  const [templates, setTemplates] = useState<ExcelTemplate[]>([]);
  const [operations, setOperations] = useState<ExcelWorkbookOperationRecord[]>([]);
  const [snapshots, setSnapshots] = useState<ExcelWorkbookSnapshotRecord[]>([]);
  const [activeSheetId, setActiveSheetId] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('workbook');
  const [openMenu, setOpenMenu] = useState<MenuKey | ''>('');
  const [rightPanel, setRightPanel] = useState<RightPanel>('properties');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [snapshotLabel, setSnapshotLabel] = useState('');

  const menus = useMemo(
    () => STATIC_MENUS.map((m) =>
      m.key === 'templates' ? { ...m, items: templates.map((t) => t.name) } : m,
    ),
    [templates],
  );

  const load = () => {
    setLoading(true);
    Promise.all([
      getExcelProject(id),
      listExcelTemplates(),
      listExcelWorkbookOperations(id),
      listExcelWorkbookSnapshots(id),
    ])
      .then(([proj, tmpl, ops, snaps]) => {
        setProject(proj);
        setTemplates(tmpl);
        setOperations(ops);
        setSnapshots(snaps);
        setActiveSheetId((current) => {
          const stillValid = proj.analysis.worksheets.find((s) => s.id === current);
          return stillValid ? current : (proj.analysis.worksheets[0]?.id || '');
        });
        setError('');
      })
      .catch((err) => setError(err?.message || 'Could not load workbook project.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const loadSilent = useCallback(async () => {
    try {
      const [proj, ops, snaps] = await Promise.all([
        getExcelProject(id),
        listExcelWorkbookOperations(id),
        listExcelWorkbookSnapshots(id),
      ]);
      setProject(proj);
      setOperations(ops);
      setSnapshots(snaps);
      setActiveSheetId((current) => {
        const stillValid = proj.analysis.worksheets.find((s) => s.id === current);
        return stillValid ? current : (proj.analysis.worksheets[0]?.id || '');
      });
    } catch { /* silent */ }
  }, [id]);

  const activeSheet = useMemo(
    () => project?.analysis.worksheets.find((s) => s.id === activeSheetId) || project?.analysis.worksheets[0] || null,
    [project, activeSheetId],
  );

  const activeTemplate = templates.find((t) => t.id === project?.activeTemplateId) || templates[0];
  const approvedOps = operations.filter((op) => op.status === 'approved');
  const undoneOps   = operations.filter((op) => op.status === 'undone');

  const closeMenu = () => setOpenMenu('');
  const toast = (message: string) => { setStatus(message); closeMenu(); };

  // ── Core operation executor ────────────────────────────────────────────────

  const performOperation = useCallback(async (op: ExcelWorkbookOperationInput) => {
    if (!project) return;
    setBusy(true);
    setStatus('Saving…');
    try {
      await createExcelWorkbookOperation(project.id, op);
      await loadSilent();
      setStatus('Saved');
    } catch (e: any) {
      setStatus(`Error: ${e?.response?.data?.message || e?.message || 'Operation failed'}`);
    } finally {
      setBusy(false);
    }
  }, [project, loadSilent]);

  // ── Undo / Redo ────────────────────────────────────────────────────────────

  const undo = async () => {
    if (!project || busy) return;
    setBusy(true);
    setStatus('Undoing…');
    try {
      await undoExcelWorkbookOperation(project.id);
      await loadSilent();
      setStatus('Undone');
    } catch (e: any) {
      setStatus(`Cannot undo: ${e?.response?.data?.message || e?.message || 'nothing to undo'}`);
    } finally {
      setBusy(false);
    }
  };

  const redo = async () => {
    if (!project || busy) return;
    setBusy(true);
    setStatus('Redoing…');
    try {
      await redoExcelWorkbookOperation(project.id);
      await loadSilent();
      setStatus('Redone');
    } catch (e: any) {
      setStatus(`Cannot redo: ${e?.response?.data?.message || e?.message || 'nothing to redo'}`);
    } finally {
      setBusy(false);
    }
  };

  // ── Snapshots ──────────────────────────────────────────────────────────────

  const handleCreateSnapshot = async () => {
    if (!project) return;
    setBusy(true);
    try {
      await createExcelWorkbookSnapshot(project.id, snapshotLabel.trim() || undefined);
      setSnapshotLabel('');
      await loadSilent();
      setStatus('Snapshot created');
      setRightPanel('snapshots');
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (!project) return;
    setBusy(true);
    setStatus('Restoring snapshot…');
    try {
      await restoreExcelWorkbookSnapshot(project.id, snapshotId);
      await loadSilent();
      setStatus('Snapshot restored');
    } finally {
      setBusy(false);
    }
  };

  // ── Save / Enhance / Actions ───────────────────────────────────────────────

  const save = async () => {
    if (!project) return;
    closeMenu();
    setBusy(true);
    try {
      const updated = await updateExcelProject(project.id, {
        title: project.title,
        activeTemplateId: project.activeTemplateId,
        enhancementPlan: project.enhancementPlan,
      } as Partial<ExcelProject>);
      setProject(updated);
      setStatus('Saved project settings.');
    } finally {
      setBusy(false);
    }
  };

  const enhance = async (templateId?: string) => {
    if (!project) return;
    closeMenu();
    setBusy(true);
    try {
      const updated = await enhanceExcelProject(project.id, templateId || project.activeTemplateId);
      setProject(updated);
      setRightPanel('enhance');
      setViewMode('dashboard');
      setStatus('Enhancement plan applied without changing source values.');
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: string) => {
    if (!project) return;
    closeMenu();
    setBusy(true);
    try {
      const updated = await applyExcelAction(project.id, action);
      setProject(updated);
      await loadSilent();
      setRightPanel('enhance');
      setStatus(`Applied: ${updated.appliedActions.at(-1)?.label || action}.`);
    } finally {
      setBusy(false);
    }
  };

  const download = async (format: string) => {
    if (!project) return;
    closeMenu();
    setBusy(true);
    try {
      const response = await api.get(`/excel-studio/projects/${project.id}/export?format=${format}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      // Prefer the server's Content-Disposition filename so the extension always
      // matches the bytes actually returned (e.g. an HTML report served when
      // Puppeteer is unavailable, or a CSV-origin original) rather than guessing.
      const disposition = (response.headers?.['content-disposition'] as string) || '';
      const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(disposition);
      const fallbackExt = format.includes('pdf') ? 'pdf'
        : format.includes('csv') || ['change-log', 'issue-report'].includes(format) ? 'csv'
        : 'xlsx';
      const safeTitle = project.title.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '') || 'workbook';
      a.download = match?.[1] ? decodeURIComponent(match[1]) : `${safeTitle}.${fallbackExt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus(`Exported ${format.toUpperCase()}.`);
    } finally {
      setBusy(false);
    }
  };

  const handleMenuItem = (menuKey: MenuKey, label: string) => {
    if (label === 'Undo last operation')                                 return undo();
    if (label === 'Redo last operation')                                 return redo();
    if (label === 'Create snapshot')                                     return handleCreateSnapshot();
    if (label.includes('Original Workbook'))                             return download('original-xlsx');
    if (label.includes('Enhanced Workbook'))                             return download('enhanced-xlsx');
    if (label.includes('Comparison Workbook'))                           return download('comparison-xlsx');
    if (label.includes('Before/After Workbook'))                         return download('before-after-xlsx');
    if (label.includes('Board Package'))                                 return download('board-package-xlsx');
    if (label.includes('Audit PDF'))                                     return download('audit-pdf');
    if (label.includes('Executive PDF'))                                 return download('executive-pdf');
    if (label.includes('Dashboard PDF'))                                 return download('dashboard-pdf');
    if (label.includes('Change Log'))                                    return download('change-log');
    if (label.includes('Issue Report'))                                  return download('issue-report');
    if (label.includes('XLSX'))                                          return download('enhanced-xlsx');
    if (label.includes('JSON'))                                          return download('json');
    if (label.includes('CSV'))                                           return download('csv');
    if (label.includes('Save'))                                          return save();
    if (label.includes('Back'))  { closeMenu(); return void router.push('/excel-studio/projects'); }
    if (label.includes('critical')) {
      setViewMode('issues');
      setRightPanel('audit');
      return toast('Showing critical issues first.');
    }
    if (menuKey === 'templates') {
      const tpl = templates.find((t) => t.name === label);
      if (tpl) {
        setProject((prev) => prev ? { ...prev, activeTemplateId: tpl.id } : prev);
        return enhance(tpl.id);
      }
    }
    if (label.toLowerCase().includes('enhancement plan')) return enhance();
    if (label.toLowerCase().includes('modernize'))        return runAction('modernizeWorkbook');
    const action = ACTION_MAP[label];
    if (action) return runAction(action);
    toast(`${label} is not available for this workbook yet.`);
  };

  // ── Render guards ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex min-h-full items-center justify-center bg-[#EDEBE6] text-[#6B6B6B]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Opening Excel Studio
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="flex min-h-full items-center justify-center bg-[#EDEBE6] px-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-600" />
          <h1 className="mt-4 text-xl font-bold">Could not open workbook</h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">{error || 'Project not found.'}</p>
          <button onClick={() => router.push('/excel-studio/projects')} className="mt-5 rounded-full bg-[#111114] px-5 py-2 text-sm font-semibold text-white">
            Back to projects
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100vh-60px)] min-h-[720px] flex-col bg-[#EDEBE6] text-[#111111]">
      {/* ── Top header ── */}
      <header className="border-b border-[#D8D3C8] bg-white">
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={() => router.push('/excel-studio/projects')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7F6F2] text-[#355846]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1">
            <input
              value={project.title}
              onChange={(e) => setProject({ ...project, title: e.target.value })}
              className="w-full bg-transparent text-lg font-bold outline-none"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6B6B]">
              <span>{project.filename}</span>
              <span>{formatFileSize(project.fileSize)}</span>
              <span>{project.analysis.summary.sheets} sheets</span>
              <span>{project.analysis.scores.overall}/100 quality</span>
              {approvedOps.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">
                  {approvedOps.length} edit{approvedOps.length !== 1 ? 's' : ''}
                </span>
              )}
              {busy && <span className="flex items-center gap-1 font-semibold text-[#4F7563]"><Loader2 className="h-3 w-3 animate-spin" />{status}</span>}
              {!busy && status && <span className="font-semibold text-[#4F7563]">{status}</span>}
            </div>
          </div>

          {/* Undo */}
          <button
            onClick={undo}
            disabled={busy || approvedOps.length === 0}
            title={`Undo (${approvedOps.length} approved)`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D8D3C8] text-[#6B6B6B] hover:bg-[#F7F6F2] disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" />
          </button>

          {/* Redo */}
          <button
            onClick={redo}
            disabled={busy || undoneOps.length === 0}
            title={`Redo (${undoneOps.length} undone)`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D8D3C8] text-[#6B6B6B] hover:bg-[#F7F6F2] disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" />
          </button>

          {/* Snapshot */}
          <button
            onClick={handleCreateSnapshot}
            disabled={busy}
            title="Create snapshot"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D8D3C8] text-[#6B6B6B] hover:bg-[#F7F6F2] disabled:opacity-30"
          >
            <Camera className="h-4 w-4" />
          </button>

          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-[#D8D3C8] px-4 py-2 text-sm font-semibold text-[#355846] hover:bg-[#EEF5F1] disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
          <button
            onClick={() => enhance()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-[#111114] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Enhance
          </button>
        </div>

        {/* Backdrop for menus */}
        {openMenu && <div className="fixed inset-0 z-20" onClick={closeMenu} />}

        {/* Menu toolbar */}
        <div className="relative flex flex-wrap items-center gap-1 border-t border-[#F1F0EC] px-4 py-2">
          {menus.map((menu) => (
            <div key={menu.key} className="relative z-30">
              <button
                onClick={() => setOpenMenu(openMenu === menu.key ? '' : menu.key)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${openMenu === menu.key ? 'bg-[#111114] text-white' : 'text-[#3F3F3F] hover:bg-[#F7F6F2]'}`}
              >
                {menu.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {openMenu === menu.key && menu.items.length > 0 && (
                <div className="absolute left-0 top-full z-40 mt-1 w-64 rounded-xl border border-[#E3E1DA] bg-white p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
                  {menu.items.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleMenuItem(menu.key, item)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#111111] hover:bg-[#F7F6F2]"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_320px]">
        {/* Left sidebar */}
        <aside className="min-h-0 border-r border-[#D8D3C8] bg-white">
          <div className="border-b border-[#F1F0EC] p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#4F7563]">Workbook</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {([
                ['Sheets', project.analysis.summary.sheets],
                ['Rows', formatNumber(project.analysis.summary.rows)],
                ['Formulas', project.analysis.summary.formulas],
                ['Issues', project.analysis.issues.length],
              ] as Array<[string, string | number]>).map(([label, value]) => (
                <div key={label} className="rounded-lg bg-[#F7F6F2] p-3">
                  <div className="text-lg font-bold">{value}</div>
                  <div className="text-[11px] font-semibold text-[#6B6B6B]">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <nav className="border-b border-[#F1F0EC] p-3">
            {([
              ['workbook',    'Workbook',      Table2],
              ['dashboard',   'Dashboard',     LayoutDashboard],
              ['issues',      'Audit Issues',  AlertTriangle],
              ['before-after','Before / After', Eye],
            ] as Array<[ViewMode, string, LucideIcon]>).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold ${viewMode === key ? 'bg-[#111114] text-white' : 'text-[#3F3F3F] hover:bg-[#F7F6F2]'}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 overflow-y-auto p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#9A9A9A]">Sheets</div>
            {project.analysis.worksheets.map((sheet) => (
              <button
                key={sheet.id}
                onClick={() => { setActiveSheetId(sheet.id); setViewMode('workbook'); }}
                className={`mb-1 w-full rounded-xl px-3 py-2 text-left ${activeSheet?.id === sheet.id ? 'bg-[#EEF5F1] text-[#355846]' : 'hover:bg-[#F7F6F2]'}`}
              >
                <div className="truncate text-sm font-semibold">{sheet.name}</div>
                <div className="mt-0.5 text-[11px] text-[#6B6B6B]">{sheet.rows} rows · {sheet.columns} cols</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0 overflow-auto bg-[#F7F6F2] p-5">
          {viewMode === 'workbook' && activeSheet && (
            <WorkbookView
              sheet={activeSheet}
              sheets={project.analysis.worksheets}
              activeSheetId={activeSheetId}
              onSelectSheet={setActiveSheetId}
              onOperation={performOperation}
              busy={busy}
            />
          )}
          {viewMode === 'dashboard'   && <DashboardView project={project} />}
          {viewMode === 'issues'      && <IssuesView project={project} />}
          {viewMode === 'before-after' && <BeforeAfterView project={project} template={activeTemplate} />}
        </section>

        {/* Right sidebar */}
        <aside className="min-h-0 overflow-y-auto border-l border-[#D8D3C8] bg-white p-4">
          <div className="mb-4 grid grid-cols-4 gap-1 rounded-full bg-[#F7F6F2] p-1">
            {([
              ['properties', 'Props'],
              ['audit',      'Audit'],
              ['enhance',    'Plan'],
              ['snapshots',  'Snaps'],
            ] as Array<[RightPanel, string]>).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRightPanel(key)}
                className={`rounded-full px-2 py-1.5 text-[11px] font-bold ${rightPanel === key ? 'bg-white text-[#355846] shadow-sm' : 'text-[#6B6B6B]'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {rightPanel === 'properties' && (
            <div>
              <h2 className="text-lg font-bold">Properties</h2>
              <div className="mt-4 space-y-3 text-sm">
                <Info label="Active sheet"   value={activeSheet?.name || 'None'} />
                <Info label="Used range"     value={activeSheet?.usedRange || 'None'} />
                <Info label="Formulas"       value={String(activeSheet?.formulas || 0)} />
                <Info label="Merged cells"   value={String(activeSheet?.mergedCells || 0)} />
                <Info label="Template"       value={activeTemplate?.name || 'Executive Emerald'} />
                <Info label="Operations"     value={`${approvedOps.length} approved · ${undoneOps.length} undone`} />
              </div>
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-bold">Apply template</h3>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => { setProject({ ...project, activeTemplateId: template.id }); enhance(template.id); }}
                      className={`w-full rounded-xl border px-3 py-2 text-left ${project.activeTemplateId === template.id ? 'border-[#4F7563] bg-[#EEF5F1]' : 'border-[#E3E1DA] hover:bg-[#F7F6F2]'}`}
                    >
                      <div className="text-sm font-bold">{template.name}</div>
                      <div className="mt-1 text-[11px] text-[#6B6B6B]">{template.category}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {rightPanel === 'audit' && (
            <div>
              <h2 className="text-lg font-bold">Audit</h2>
              <div className="mt-4 space-y-3">
                {Object.entries(project.analysis.scores).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="capitalize text-[#6B6B6B]">{key.replace(/[A-Z]/g, ' $&')}</span>
                      <span>{value}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-[#F1F0EC]">
                      <div className="h-full rounded-full bg-[#4F7563]" style={{ width: `${value}%` }} />
                    </div>
                    {(project.analysis.scoreExplanations?.[key as keyof typeof project.analysis.scores] || []).slice(0, 2).map((reason) => (
                      <p key={reason} className="mt-1 text-[11px] leading-4 text-[#6B6B6B]">{reason}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {rightPanel === 'enhance' && (
            <div>
              <h2 className="text-lg font-bold">Enhancement Plan</h2>
              {project.appliedActions.length > 0 && (
                <div className="mt-4 rounded-xl border border-[#D8D3C8] bg-white p-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A9A9A]">Applied actions</div>
                  <div className="mt-2 space-y-2">
                    {project.appliedActions.slice(-6).reverse().map((action) => (
                      <div key={action.id} className="text-xs text-[#3F3F3F]">
                        <strong>{action.label}</strong>
                        <div className="text-[#9A9A9A]">{formatDate(action.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 space-y-2">
                {project.enhancementPlan.map((item, i) => (
                  <div key={`${item}-${i}`} className="rounded-xl bg-[#F7F6F2] p-3 text-sm leading-5 text-[#3F3F3F]">
                    <CheckCircle2 className="mb-2 h-4 w-4 text-[#4F7563]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {rightPanel === 'snapshots' && (
            <SnapshotsPanel
              snapshots={snapshots}
              operations={operations}
              snapshotLabel={snapshotLabel}
              onLabelChange={setSnapshotLabel}
              onCreateSnapshot={handleCreateSnapshot}
              onRestoreSnapshot={handleRestoreSnapshot}
              busy={busy}
            />
          )}
        </aside>
      </div>
    </main>
  );
}

// ── Snapshots panel ────────────────────────────────────────────────────────

function SnapshotsPanel({
  snapshots,
  operations,
  snapshotLabel,
  onLabelChange,
  onCreateSnapshot,
  onRestoreSnapshot,
  busy,
}: {
  snapshots: ExcelWorkbookSnapshotRecord[];
  operations: ExcelWorkbookOperationRecord[];
  snapshotLabel: string;
  onLabelChange: (v: string) => void;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (id: string) => void;
  busy: boolean;
}) {
  const approvedOps = operations.filter((op) => op.status === 'approved');

  return (
    <div>
      <h2 className="text-lg font-bold">Snapshots</h2>
      <p className="mt-1 text-xs text-[#6B6B6B]">
        Save the current state of all {approvedOps.length} approved operation{approvedOps.length !== 1 ? 's' : ''} so you can restore later.
      </p>

      <div className="mt-4 space-y-2">
        <input
          value={snapshotLabel}
          onChange={(e) => onLabelChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onCreateSnapshot(); }}
          placeholder="Optional label…"
          className="w-full rounded-xl border border-[#D8D3C8] px-3 py-2 text-sm outline-none focus:border-[#4F7563]"
        />
        <button
          onClick={onCreateSnapshot}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111114] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          Create Snapshot
        </button>
      </div>

      {snapshots.length === 0 ? (
        <div className="mt-6 rounded-xl bg-[#F7F6F2] p-4 text-center text-sm text-[#9A9A9A]">
          No snapshots yet. Create one to save the current state.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A9A9A]">
            {snapshots.length} Snapshot{snapshots.length !== 1 ? 's' : ''}
          </div>
          {snapshots.map((snap) => (
            <div key={snap.id} className="rounded-xl border border-[#E3E1DA] bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{snap.label || 'Snapshot'}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#6B6B6B]">
                    <Clock className="h-3 w-3" />
                    {formatDate(snap.createdAt)}
                  </div>
                  <div className="mt-1 text-[11px] text-[#6B6B6B]">
                    {snap.operationIds.length} operation{snap.operationIds.length !== 1 ? 's' : ''}
                    {snap.restoredAt && <span className="ml-2 text-[#355846]">↩ Restored</span>}
                  </div>
                </div>
                <button
                  onClick={() => onRestoreSnapshot(snap.id)}
                  disabled={busy}
                  className="shrink-0 flex items-center gap-1 rounded-lg bg-[#EEF5F1] px-2.5 py-1.5 text-[11px] font-bold text-[#355846] hover:bg-[#D4E8DC] disabled:opacity-50"
                  title="Restore this snapshot"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {operations.length > 0 && (
        <div className="mt-5 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A9A9A]">Operation History</div>
          {[...operations].reverse().slice(0, 12).map((op) => (
            <div
              key={op.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${op.status === 'approved' ? 'bg-[#F7F6F2]' : 'bg-[#FAFAF8] opacity-50'}`}
            >
              <span className="font-semibold">{op.type}</span>
              <div className="flex items-center gap-1.5 text-[#9A9A9A]">
                {op.sheetName && <span>{op.sheetName}</span>}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${op.status === 'approved' ? 'bg-[#EEF5F1] text-[#355846]' : 'bg-gray-100 text-gray-400'}`}>
                  {op.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Info card ──────────────────────────────────────────────────────────────

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F7F6F2] p-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A9A9A]">{label}</div>
      <div className="mt-1 font-semibold text-[#111111]">{value}</div>
    </div>
  );
}

// ── WorkbookView ───────────────────────────────────────────────────────────

function WorkbookView({
  sheet,
  sheets,
  activeSheetId,
  onSelectSheet,
  onOperation,
  busy,
}: {
  sheet: ExcelWorksheet;
  sheets: ExcelWorksheet[];
  activeSheetId: string;
  onSelectSheet: (id: string) => void;
  onOperation: (op: ExcelWorkbookOperationInput) => Promise<void>;
  busy: boolean;
}) {
  const fallbackCells = useMemo(() => buildFallbackCells(sheet), [sheet]);
  const cells = sheet.cells?.length ? sheet.cells : fallbackCells;

  const [selected, setSelected] = useState<{ row: number; col: number; address: string } | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [renamingTab, setRenamingTab] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    type: 'row' | 'column'; index: number; x: number; y: number;
  } | null>(null);

  const cellInputRef = useRef<HTMLInputElement>(null);

  // Reset selection when sheet changes
  useEffect(() => {
    setSelected(null);
    setEditingCell(null);
    setContextMenu(null);
  }, [sheet.id]);

  const selectedCell = useMemo(() => {
    if (!selected) return cells[0]?.[0] || null;
    return cells.flat().find((c) => c.address === selected.address) || cells[0]?.[0] || null;
  }, [cells, selected]);

  const formulaBarValue = editingCell
    ? editValue
    : selectedCell?.formula
      ? `=${selectedCell.formula}`
      : String(selectedCell?.rawValue ?? selectedCell?.value ?? '');

  const selectCell = (cell: ExcelCell) => {
    setSelected({ row: cell.row, col: cell.column, address: cell.address });
  };

  const startCellEdit = (cell: ExcelCell) => {
    selectCell(cell);
    setEditingCell(cell.address);
    const val = cell.formula
      ? `=${cell.formula}`
      : String(cell.rawValue ?? cell.value ?? '');
    setEditValue(val);
    setTimeout(() => cellInputRef.current?.focus(), 10);
  };

  const commitEdit = useCallback(async () => {
    if (!editingCell) return;
    const addr = editingCell;
    const val = editValue;
    setEditingCell(null);
    const isFormula = val.trimStart().startsWith('=');
    let op: ExcelWorkbookOperationInput;
    if (isFormula) {
      op = { type: 'setFormula', sheetName: sheet.name, target: { address: addr }, payload: { formula: val.trimStart().slice(1) }, source: 'user' };
    } else {
      const num = Number(val);
      op = {
        type: 'setCellValue',
        sheetName: sheet.name,
        target: { address: addr },
        payload: { value: val !== '' && !isNaN(num) && val.trim() !== '' ? num : val },
        source: 'user',
      };
    }
    await onOperation(op);
  }, [editingCell, editValue, sheet.name, onOperation]);

  const cancelEdit = useCallback(() => setEditingCell(null), []);

  const handleFormulaBarChange = (val: string) => {
    if (!editingCell && selectedCell) {
      setEditingCell(selectedCell.address);
    }
    setEditValue(val);
  };

  const handleFormulaBarKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  { e.preventDefault(); void commitEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  };

  const handleCellInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  { e.preventDefault(); void commitEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    if (e.key === 'Tab')    { e.preventDefault(); void commitEdit(); }
  };

  // ── Row / column context actions ──────────────────────────────────────────

  const handleContextAction = async (action: string) => {
    if (!contextMenu) return;
    const cm = contextMenu;
    setContextMenu(null);
    if (cm.type === 'row') {
      if (action === 'insert-before') await onOperation({ type: 'insertRow',    sheetName: sheet.name, target: { index: cm.index },     source: 'user' });
      if (action === 'insert-after')  await onOperation({ type: 'insertRow',    sheetName: sheet.name, target: { index: cm.index + 1 }, source: 'user' });
      if (action === 'delete')        await onOperation({ type: 'deleteRow',    sheetName: sheet.name, target: { index: cm.index },     source: 'user' });
    } else {
      if (action === 'insert-before') await onOperation({ type: 'insertColumn', sheetName: sheet.name, target: { index: cm.index },     source: 'user' });
      if (action === 'insert-after')  await onOperation({ type: 'insertColumn', sheetName: sheet.name, target: { index: cm.index + 1 }, source: 'user' });
      if (action === 'delete')        await onOperation({ type: 'deleteColumn', sheetName: sheet.name, target: { index: cm.index },     source: 'user' });
    }
  };

  // ── Sheet tab operations ──────────────────────────────────────────────────

  const startRenameTab = (tabId: string, currentName: string) => {
    setRenamingTab(tabId);
    setRenameValue(currentName);
  };

  const commitRenameTab = async (tabId: string) => {
    const newName = renameValue.trim();
    const tab = sheets.find((s) => s.id === tabId);
    setRenamingTab(null);
    if (!newName || !tab || newName === tab.name) return;
    await onOperation({ type: 'renameSheet', sheetName: tab.name, payload: { name: newName }, source: 'user' });
  };

  const createSheet = async () => {
    const name = `Sheet${sheets.length + 1}`;
    await onOperation({ type: 'createSheet', payload: { name }, source: 'user' });
  };

  const deleteSheet = async (sheetName: string) => {
    if (sheets.length <= 1) return;
    const idx = sheets.findIndex((s) => s.name === sheetName);
    await onOperation({ type: 'deleteSheet', sheetName, source: 'user' });
    const remaining = sheets.filter((s) => s.name !== sheetName);
    if (activeSheetId === sheets[idx]?.id && remaining[0]) {
      onSelectSheet(remaining[0].id);
    }
  };

  const skippedMergedCells = useMemo(
    () => new Set(cells.flat().filter((c) => c.isMerged && !c.mergeMaster).map((c) => `${c.row}:${c.column}`)),
    [cells],
  );

  return (
    <div
      className="rounded-2xl border border-[#D8D3C8] bg-white shadow-[0_20px_55px_rgba(0,0,0,0.06)]"
      onClick={() => { if (contextMenu) setContextMenu(null); }}
    >
      {/* Sheet header */}
      <div className="flex items-center justify-between border-b border-[#E3E1DA] px-5 py-4">
        <div>
          <h2 className="text-xl font-bold">{sheet.name}</h2>
          <p className="text-sm text-[#6B6B6B]">
            {sheet.usedRange} · {sheet.rows} rows · {sheet.columns} columns · source preserved
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <span className="rounded-full bg-[#EEF5F1] px-3 py-1 text-xs font-bold text-[#355846]">{sheet.formulas} formulas</span>
          <span className="rounded-full bg-[#F7F6F2] px-3 py-1 text-xs font-bold text-[#6B6B6B]">{sheet.mergedCells} merged</span>
          {editingCell && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Editing {editingCell}</span>
          )}
        </div>
      </div>

      {/* Formula bar */}
      <div className="border-b border-[#E3E1DA] bg-[#FBFAF7] px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-[#D8D3C8] bg-white p-2">
          <div className="w-20 shrink-0 rounded-lg bg-[#F1F0EC] px-2 py-1 text-center text-xs font-bold text-[#355846]">
            {selectedCell?.address || 'A1'}
          </div>
          <div className="shrink-0 rounded-lg bg-[#EEF5F1] px-2 py-1 text-xs font-black text-[#355846]">fx</div>
          <input
            value={formulaBarValue}
            onChange={(e) => handleFormulaBarChange(e.target.value)}
            onKeyDown={handleFormulaBarKeyDown}
            onFocus={() => {
              if (!editingCell && selectedCell) {
                setEditingCell(selectedCell.address);
                setEditValue(formulaBarValue);
              }
            }}
            onBlur={() => { if (editingCell) void commitEdit(); }}
            placeholder="Empty cell"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#111111] outline-none placeholder:text-[#9A9A9A]"
          />
          {editingCell && (
            <div className="flex shrink-0 gap-1">
              <button
                onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
                className="flex h-6 w-6 items-center justify-center rounded bg-red-50 hover:bg-red-100"
                title="Cancel (Escape)"
              >
                <X className="h-3.5 w-3.5 text-red-500" />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); void commitEdit(); }}
                className="flex h-6 w-6 items-center justify-center rounded bg-[#EEF5F1] hover:bg-[#D4E8DC]"
                title="Commit (Enter)"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-[#355846]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-h-[55vh] overflow-auto bg-[#F7F6F2]">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 h-9 min-w-12 border-b border-r border-[#D8D3C8] bg-[#ECE8DE]" />
              {(cells[0] || []).map((cell) => (
                <th
                  key={`col-${cell.column}`}
                  className="sticky top-0 z-20 h-9 min-w-32 select-none cursor-pointer border-b border-r border-[#D8D3C8] bg-[#ECE8DE] px-2 text-center text-xs font-black text-[#355846] hover:bg-[#DDD8CE]"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ type: 'column', index: cell.column, x: e.clientX, y: e.clientY });
                  }}
                  title="Right-click for column options"
                >
                  {columnLabel(cell.column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row) => (
              <tr key={`row-${row[0]?.row ?? 0}`}>
                <th
                  className="sticky left-0 z-10 h-10 min-w-12 select-none cursor-pointer border-b border-r border-[#D8D3C8] bg-[#ECE8DE] px-2 text-center text-xs font-black text-[#6B6B6B] hover:bg-[#DDD8CE]"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ type: 'row', index: row[0]?.row ?? 0, x: e.clientX, y: e.clientY });
                  }}
                  title="Right-click for row options"
                >
                  {(row[0]?.row ?? 0) + 1}
                </th>
                {row.map((cell) => {
                  if (skippedMergedCells.has(`${cell.row}:${cell.column}`)) return null;
                  const isSelected = selected?.address === cell.address;
                  const isEditing  = editingCell === cell.address;
                  const span       = cell.mergeSpan || { rows: 1, columns: 1 };
                  return (
                    <td
                      key={cell.address}
                      rowSpan={span.rows}
                      colSpan={span.columns}
                      onClick={() => { if (!isEditing) selectCell(cell); }}
                      onDoubleClick={() => startCellEdit(cell)}
                      className={`h-10 max-w-72 border-b border-r border-[#E3E1DA] align-top transition-colors ${isEditing ? 'p-0' : 'cursor-cell px-2 py-1'} ${isSelected && !isEditing ? 'bg-[#EEF5F1] ring-2 ring-inset ring-[#4F7563]' : isEditing ? '' : 'bg-white hover:bg-[#FBFAF7]'}`}
                      style={isEditing ? undefined : cellStyle(cell)}
                    >
                      {isEditing ? (
                        <input
                          ref={cellInputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleCellInputKeyDown}
                          onBlur={() => void commitEdit()}
                          spellCheck={false}
                          className="h-full w-full bg-[#FFFAE8] px-2 py-1 text-sm font-medium outline-none ring-2 ring-inset ring-[#C8A96A]"
                        />
                      ) : (
                        <div className="flex min-w-0 items-start gap-1">
                          {cell.formula && (
                            <span className="mt-0.5 shrink-0 rounded bg-[#EEF5F1] px-1 text-[10px] font-black text-[#355846]">fx</span>
                          )}
                          <span
                            className={`line-clamp-2 break-words ${cell.style?.bold ? 'font-bold' : ''} ${cell.style?.italic ? 'italic' : ''}`}
                          >
                            {cell.value || <span className="text-[#C9C6BD]">blank</span>}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-[#E3E1DA] bg-[#FBFAF7] px-3 py-2">
        {sheets.map((tab) => (
          <div key={tab.id} className="group relative shrink-0">
            {renamingTab === tab.id ? (
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')  void commitRenameTab(tab.id);
                  if (e.key === 'Escape') setRenamingTab(null);
                }}
                onBlur={() => void commitRenameTab(tab.id)}
                autoFocus
                className="w-28 rounded-t-xl border border-[#4F7563] bg-white px-2 py-2 text-xs font-bold text-[#355846] outline-none"
              />
            ) : (
              <button
                onClick={() => onSelectSheet(tab.id)}
                onDoubleClick={() => startRenameTab(tab.id, tab.name)}
                title="Double-click to rename"
                className={`whitespace-nowrap rounded-t-xl border px-3 py-2 text-xs font-bold ${activeSheetId === tab.id ? 'border-[#4F7563] bg-white text-[#355846]' : 'border-[#D8D3C8] bg-[#F1F0EC] text-[#6B6B6B] hover:bg-[#F7F6F2]'}`}
              >
                {tab.name}
              </button>
            )}
            {/* Delete button — only when multiple sheets, shows on hover of active tab */}
            {sheets.length > 1 && activeSheetId === tab.id && renamingTab !== tab.id && (
              <button
                onClick={(e) => { e.stopPropagation(); void deleteSheet(tab.name); }}
                disabled={busy}
                className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 group-hover:flex disabled:opacity-50"
                title="Delete sheet"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        ))}
        {/* Add sheet button */}
        <button
          onClick={() => void createSheet()}
          disabled={busy}
          title="Add sheet"
          className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D8D3C8] bg-[#F1F0EC] text-[#6B6B6B] hover:bg-[#EEF5F1] hover:text-[#355846] disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-xl border border-[#E3E1DA] bg-white p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A9A9A]">
            {contextMenu.type === 'row' ? `Row ${contextMenu.index + 1}` : `Column ${columnLabel(contextMenu.index)}`}
          </div>
          <button
            onClick={() => void handleContextAction('insert-before')}
            disabled={busy}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#111111] hover:bg-[#F7F6F2] disabled:opacity-50"
          >
            Insert {contextMenu.type} before
          </button>
          <button
            onClick={() => void handleContextAction('insert-after')}
            disabled={busy}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#111111] hover:bg-[#F7F6F2] disabled:opacity-50"
          >
            Insert {contextMenu.type} after
          </button>
          <div className="my-1 border-t border-[#F1F0EC]" />
          <button
            onClick={() => void handleContextAction('delete')}
            disabled={busy}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete {contextMenu.type}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildFallbackCells(sheet: ExcelWorksheet): ExcelCell[][] {
  const rows  = sheet.previewRows?.length ? sheet.previewRows : [['']];
  const width = Math.max(1, ...rows.map((row) => row.length));
  return rows.slice(0, 80).map((row, ri) =>
    Array.from({ length: width }, (_, ci) => ({
      address:   `${columnLabel(ci)}${ri + 1}`,
      row:       ri,
      column:    ci,
      value:     String(row[ci] ?? ''),
      formatted: String(row[ci] ?? ''),
    })),
  );
}

function columnLabel(index: number) {
  let label = '';
  let value = index + 1;
  while (value > 0) {
    const mod = (value - 1) % 26;
    label = String.fromCharCode(65 + mod) + label;
    value = Math.floor((value - mod) / 26);
  }
  return label;
}

function cellStyle(cell: ExcelCell): CSSProperties {
  const style: CSSProperties = {};
  if (cell.style?.fillColor && /^#[0-9A-Fa-f]{6}$/.test(cell.style.fillColor)) style.backgroundColor = cell.style.fillColor;
  if (cell.style?.textColor  && /^#[0-9A-Fa-f]{6}$/.test(cell.style.textColor))  style.color           = cell.style.textColor;
  if (cell.style?.horizontal) style.textAlign = cell.style.horizontal as CSSProperties['textAlign'];
  return style;
}

// ── Dashboard / Issues / Before-After views (unchanged) ────────────────────

function DashboardView({ project }: { project: ExcelProject }) {
  const summary = project.analysis.summary;
  const scoreCards: Array<{ label: string; value: number; Icon: LucideIcon }> = [
    { label: 'Overall Quality',  value: project.analysis.scores.overall,           Icon: Gauge },
    { label: 'Data Quality',     value: project.analysis.scores.dataQuality,       Icon: ShieldCheck },
    { label: 'Readability',      value: project.analysis.scores.readability,       Icon: Eye },
    { label: 'Executive Ready',  value: project.analysis.scores.executiveReadiness, Icon: BarChart3 },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[#263F34] p-6 text-white shadow-[0_20px_55px_rgba(0,0,0,0.12)]">
        <Sparkles className="h-6 w-6 text-[#DDE8E1]" />
        <h2 className="mt-4 text-3xl font-bold tracking-[-0.02em]">Executive Workbook Dashboard</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#DDE8E1]">
          A safe presentation layer built from detected workbook structure. Source values and calculations remain protected.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {scoreCards.map(({ label, value, Icon }) => (
          <div key={label} className="rounded-2xl border border-[#E3E1DA] bg-white p-5">
            <Icon className="h-5 w-5 text-[#4F7563]" />
            <div className="mt-4 text-3xl font-bold">{value}/100</div>
            <div className="mt-1 text-sm font-semibold text-[#6B6B6B]">{label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {([
          ['Sheets',       summary.sheets],
          ['Rows',         formatNumber(summary.rows)],
          ['Tables',       summary.tables],
          ['Formulas',     summary.formulas],
          ['Merged cells', summary.mergedCells],
          ['Blank cells',  formatNumber(summary.blankCells)],
        ] as Array<[string, string | number]>).map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#E3E1DA] bg-white p-5">
            <div className="text-2xl font-bold">{value}</div>
            <div className="mt-1 text-sm text-[#6B6B6B]">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IssuesView({ project }: { project: ExcelProject }) {
  return (
    <div className="rounded-2xl border border-[#D8D3C8] bg-white p-5 shadow-[0_20px_55px_rgba(0,0,0,0.06)]">
      <h2 className="text-2xl font-bold">Workbook Audit Issues</h2>
      <div className="mt-5 space-y-3">
        {project.analysis.issues.length === 0 ? (
          <div className="rounded-xl bg-[#EEF5F1] p-4 text-sm font-semibold text-[#355846]">
            No critical workbook issues detected.
          </div>
        ) : project.analysis.issues.map((issue) => (
          <div key={issue.id} className="rounded-xl border border-[#E3E1DA] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${issue.severity === 'critical' ? 'bg-red-100 text-red-700' : issue.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-[#EEF5F1] text-[#355846]'}`}>
                {issue.severity}
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#9A9A9A]">{issue.category}</span>
              {issue.sheet && <span className="text-xs text-[#6B6B6B]">{issue.sheet}</span>}
            </div>
            <h3 className="mt-3 font-bold">{issue.title}</h3>
            <p className="mt-1 text-sm leading-6 text-[#6B6B6B]">{issue.detail}</p>
            <p className="mt-3 rounded-lg bg-[#F7F6F2] p-3 text-sm text-[#3F3F3F]">{issue.suggestedFix}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BeforeAfterView({ project, template }: { project: ExcelProject; template?: ExcelTemplate }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-2xl border border-[#D8D3C8] bg-white p-5">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#9A9A9A]">
          <FileSpreadsheet className="h-4 w-4" />
          Before
        </div>
        <h2 className="mt-3 text-2xl font-bold">Imported workbook</h2>
        <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
          Original sheets, rows, formulas, values, and detected structure are preserved as the source layer.
        </p>
        <div className="mt-5 space-y-2">
          {project.analysis.worksheets.map((sheet) => (
            <div key={sheet.id} className="rounded-xl bg-[#F7F6F2] p-3 text-sm">
              <strong>{sheet.name}</strong> · {sheet.rows} rows · {sheet.columns} columns · {sheet.formulas} formulas
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-[#D8D3C8] bg-[#263F34] p-5 text-white">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#DDE8E1]">
          <LayoutTemplate className="h-4 w-4" />
          After
        </div>
        <h2 className="mt-3 text-2xl font-bold">{template?.name || 'Executive Emerald Board Pack'}</h2>
        <p className="mt-2 text-sm leading-6 text-[#DDE8E1]">
          Presentation, audit, dashboard, and formatting layers are added around the workbook without mutating source values.
        </p>
        <div className="mt-5 space-y-2">
          {project.enhancementPlan.map((item, i) => (
            <div key={`${item}-${i}`} className="rounded-xl border border-white/15 bg-white/10 p-3 text-sm">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
