'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import {
  ArrowLeft, Save, Loader2, CheckCircle, Sparkles, ZapIcon,
  Eye, EyeOff, Palette, ChevronDown, ChevronUp, Undo2, Redo2, History,
  Plus, Trash2, Copy, Image as ImageIcon, BarChart2, Star,
  Type, AlignLeft, AlignCenter, AlignRight, Highlighter, Bold, Italic,
  Underline, List, ListOrdered, FileText, Layers, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import ExportDropdown from '@/components/pdf-studio/ExportDropdown';
import ThemePicker, { PDF_THEMES } from '@/components/pdf-studio/ThemePicker';
import { ImageUploadPanel } from '@/components/pdf-studio/ImageUploadPanel';
import { ChartPanel, ChartConfig } from '@/components/pdf-studio/ChartPanel';
import LivePreview from '@/components/LivePreview';
import PreviewModal from '@/components/PreviewModal';
import { EditorSkeleton } from '@/components/Skeleton';
import OnboardingTour from '@/components/OnboardingTour';
import { useToast } from '@/components/ToastProvider';
import { PresenceIndicator } from '@/components/PresenceIndicator';
import { ProTemplatesDropdown } from '@/features/pdf-studio/pro-templates/components/ProTemplatesDropdown';

const THEME_STORAGE_KEY = 'pitchonix_pdf_theme';

/** Safely extract display text from a page's content.text field.
 *  Old documents may have stored JSON strings there; extract readable prose from them. */
function safePageText(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw !== 'string') return String(raw);
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return raw;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'string') return parsed;
    const candidates = [
      parsed.text, parsed.content, parsed.body, parsed.description,
      parsed.title, parsed.subtitle, parsed.summary,
    ];
    const parts = candidates.filter((v: unknown) => typeof v === 'string' && v.trim());
    return parts.length > 0 ? parts.join('\n\n') : JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function textToEditableHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function editableHtmlForPage(page: any): string {
  const html = page?.content?.html;
  if (typeof html === 'string' && html.trim()) return html;
  return textToEditableHtml(safePageText(page?.content?.text));
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function pageDensity(words: number, pageType?: string): { label: string; value: number; problem: string } {
  if (pageType === 'cover') return { label: 'Designed cover', value: 55, problem: '' };
  if (pageType === 'toc') return { label: words > 20 ? 'Useful TOC' : 'Weak TOC', value: words > 20 ? 45 : 10, problem: words > 20 ? '' : 'TOC has too little structure' };
  if (words < 20) return { label: 'Empty', value: 5, problem: 'Heading-only or empty page' };
  if (words < 120) return { label: 'Underfilled', value: 20, problem: 'Below 120 words' };
  if (words < 250) return { label: 'Light', value: 45, problem: 'Could use more content' };
  if (words <= 450) return { label: 'Balanced', value: 75, problem: '' };
  return { label: 'Dense', value: 92, problem: 'May need splitting' };
}

function proArchetypeForPage(page: any, index: number, total: number): string {
  const type = String(page?.pageType || '').toLowerCase();
  const title = String(page?.title || '').toLowerCase();
  if (type === 'cover' || index === 0) return 'cover';
  if (index === total - 1 || title.includes('conclusion') || title.includes('closing')) return 'closing';
  if (title.includes('timeline') || title.includes('process') || title.includes('roadmap')) return 'timeline';
  if (title.includes('metric') || title.includes('stat') || title.includes('kpi')) return 'stats';
  if (title.includes('swot') || title.includes('risk') || title.includes('opportunit')) return 'grid';
  if (title.includes('feature') || title.includes('recommend')) return 'list';
  if (type === 'section' || type === 'divider') return 'divider';
  if (index === 1) return 'intro';
  return index % 3 === 0 ? 'image' : 'content';
}

function sectionLabel(page: any): string {
  const content = page?.content || {};
  const title = String(page?.title || content.sectionTitle || '').replace(/\s*\(continued\)\s*$/i, '').trim();
  if (!title) return page?.pageType === 'cover' ? 'Cover' : page?.pageType === 'toc' ? 'Table of Contents' : 'Document';
  return title;
}

function templateStyleLabel(template?: PdfTemplateOption): string {
  if (!template?.style) return 'Template';
  return [template.style.headerStyle, template.style.cardStyle, template.style.spacing]
    .filter(Boolean)
    .map(value => String(value).replace(/_/g, ' '))
    .join(' / ');
}

interface PdfTemplateOption {
  type: string;
  name: string;
  category?: string;
  description?: string;
  thumbnail?: string;
  style?: {
    colorScheme?: string;
    headerStyle?: string;
    cardStyle?: string;
    spacing?: string;
  };
}

export default function PdfEditorPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancementType, setEnhancementType] = useState<string>('');
  const [document, setDocument] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [previewRefreshTrigger, setPreviewRefreshTrigger] = useState(0);
  const [previewMode, setPreviewMode] = useState<'page' | 'document'>('page');
  const [templates, setTemplates] = useState<PdfTemplateOption[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('clean_business_report');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedProTemplateId, setSelectedProTemplateId] = useState<string | null>(null);
  const [showProTemplatePicker, setShowProTemplatePicker] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'blue';
    }
    return 'blue';
  });

  // Undo/Redo history
  const [history, setHistory] = useState<any[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  // Right panel tab: 'content' | 'images' | 'charts'
  const [rightTab, setRightTab] = useState<'content' | 'images' | 'charts'>('content');
  const [addingPage, setAddingPage] = useState(false);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);

  const themePickerRef = useRef<HTMLDivElement>(null);
  const templatePickerRef = useRef<HTMLDivElement>(null);
  const proTemplatePickerRef = useRef<HTMLDivElement>(null);
  const bodyEditorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const currentPageForEditor = pages[currentPageIndex];

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (!bodyEditorRef.current || !currentPageForEditor) return;
    bodyEditorRef.current.innerHTML = editableHtmlForPage(currentPageForEditor);
    savedRangeRef.current = null;
  }, [currentPageForEditor?.id]);

  // Auto-save: debounce 3s after any page edit
  useEffect(() => {
    if (!isDirtyRef.current) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      if (!isDirtyRef.current) return;
      try {
        for (const page of pages) {
          await api.patch(`/pdf-pages/${page.id}`, { content: page.content, title: page.title });
        }
        isDirtyRef.current = false;
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (_) {}
    }, 3000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [pages]);

  // Close theme picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target as Node)) {
        setShowThemePicker(false);
      }
      if (templatePickerRef.current && !templatePickerRef.current.contains(e.target as Node)) {
        setShowTemplatePicker(false);
      }
      if (proTemplatePickerRef.current && !proTemplatePickerRef.current.contains(e.target as Node)) {
        setShowProTemplatePicker(false);
      }
    };
    if (showThemePicker || showTemplatePicker || showProTemplatePicker) window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [showThemePicker, showTemplatePicker, showProTemplatePicker]);

  const fetchDocument = async () => {
    try {
      const response = await api.get(`/pdf-studio/smart-builder/documents/${documentId}`);
      const { document } = response.data.data;
      const loadedPages = document.pages || [];
      setDocument(document);
      setPages(loadedPages);
      setSelectedTemplate(document.metadata?.templateType || 'clean_business_report');
      setSelectedProTemplateId(document.metadata?.proTemplateId || null);
      // Seed history with the initial state so undo starts from a clean base
      setHistory([loadedPages]);
      setHistoryIndex(0);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load document');
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/pdf-studio/export/templates');
      const rawTemplates = response.data?.data?.templates || response.data?.templates || [];
      const userTemplates = rawTemplates
        .filter((template: PdfTemplateOption) => template.type !== 'smart_pdf_builder')
        .sort((a: PdfTemplateOption, b: PdfTemplateOption) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));
      setTemplates(userTemplates);
    } catch {
      setTemplates([]);
    }
  };

  const handlePageContentChange = (pageId: string, newContent: string) => {
    const html = textToEditableHtml(newContent);
    const newPages = pages.map(page =>
      page.id === pageId
        ? { ...page, content: { ...page.content, text: newContent, html } }
        : page
    );
    if (bodyEditorRef.current && currentPageForEditor?.id === pageId) {
      bodyEditorRef.current.innerHTML = html;
    }
    // Timeline approach: history[historyIndex] = current state.
    // Slice off any "future" states then append the new state.
    setHistory(prev => {
      const base = prev.slice(0, historyIndex + 1);
      base.push(newPages);
      return base.length > 50 ? base.slice(-50) : base;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
    setPages(newPages);
    isDirtyRef.current = true;
    setPreviewRefreshTrigger(prev => prev + 1);
  };

  const updatePagesAfterEdit = (newPages: any[]) => {
    setHistory(prev => {
      const base = prev.slice(0, historyIndex + 1);
      base.push(newPages);
      return base.length > 50 ? base.slice(-50) : base;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
    setPages(newPages);
    isDirtyRef.current = true;
    setPreviewRefreshTrigger(prev => prev + 1);
  };

  const handlePageHtmlInput = (pageId: string) => {
    const editor = bodyEditorRef.current;
    if (!editor) return;
    const html = editor.innerHTML;
    const text = editor.innerText.replace(/\u00a0/g, ' ').trim();
    const newPages = pages.map(page =>
      page.id === pageId
        ? { ...page, content: { ...page.content, text, html } }
        : page
    );
    updatePagesAfterEdit(newPages);
  };

  const rememberSelection = () => {
    const editor = bodyEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const editor = bodyEditorRef.current;
    const range = savedRangeRef.current;
    if (!editor || !range || !editor.contains(range.commonAncestorContainer)) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const applySelectionStyle = (styles: Record<string, string | number>) => {
    const currentPage = pages[currentPageIndex];
    if (!currentPage || !restoreSelection()) {
      toast.warning('Select text on the page first');
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      toast.warning('Select text on the page first');
      return;
    }

    const range = selection.getRangeAt(0);
    const span = window.document.createElement('span');
    Object.entries(styles).forEach(([key, value]) => {
      span.style.setProperty(key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`), String(value));
    });
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    const nextRange = window.document.createRange();
    nextRange.selectNodeContents(span);
    selection.addRange(nextRange);
    savedRangeRef.current = nextRange.cloneRange();
    handlePageHtmlInput(currentPage.id);
  };

  const applySelectionCommand = (command: string, value?: string) => {
    const currentPage = pages[currentPageIndex];
    if (!currentPage || !restoreSelection()) {
      toast.warning('Select text on the page first');
      return;
    }
    window.document.execCommand(command, false, value);
    rememberSelection();
    handlePageHtmlInput(currentPage.id);
  };

  const handlePageStyleChange = (pageId: string, styles: Record<string, any>) => {
    const newPages = pages.map(page =>
      page.id === pageId
        ? {
            ...page,
            content: {
              ...page.content,
              styles: {
                ...(page.content?.styles || {}),
                ...styles,
              },
            },
          }
        : page
    );
    setPages(newPages);
    isDirtyRef.current = true;
    setPreviewRefreshTrigger(prev => prev + 1);
  };

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return; // index 0 = initial state, nothing to undo
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setPages(history[newIndex]);
    isDirtyRef.current = true;
    setPreviewRefreshTrigger(prev => prev + 1);
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setPages(history[newIndex]);
    isDirtyRef.current = true;
    setPreviewRefreshTrigger(prev => prev + 1);
  }, [history, historyIndex]);

  const fetchVersions = async () => {
    try {
      const res = await api.get(`/pdf-documents/${documentId}/versions`);
      setVersions(res.data);
    } catch (_) {}
  };

  const saveVersion = async () => {
    try {
      await api.post(`/pdf-documents/${documentId}/versions`, {
        title: `Version ${new Date().toLocaleString()}`,
        pagesSnapshot: pages,
      });
      await fetchVersions();
      toast.success('Version saved!');
    } catch (_) { toast.error('Could not save version'); }
  };

  const restoreVersion = async (versionId: string) => {
    try {
      const res = await api.post(`/pdf-documents/${documentId}/versions/${versionId}/restore`);
      if (res.data.pages) {
        setPages(res.data.pages);
        setPreviewRefreshTrigger(prev => prev + 1);
        toast.success('Version restored!');
      }
    } catch (_) { toast.error('Could not restore version'); }
  };

  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    setPreviewRefreshTrigger(prev => prev + 1);
  };

  const handleTemplateChange = async (templateType: string) => {
    if (!document) return;
    const template = templates.find(item => item.type === templateType);
    const templateColorScheme = template?.style?.colorScheme;

    setSelectedTemplate(templateType);
    setSelectedProTemplateId(null);
    if (templateColorScheme && PDF_THEMES.some(theme => theme.id === templateColorScheme)) {
      setSelectedTheme(templateColorScheme);
      localStorage.setItem(THEME_STORAGE_KEY, templateColorScheme);
    }
    setShowTemplatePicker(false);

    const nextMetadata = {
      ...(document.metadata || {}),
      templateType,
      proTemplateId: null,
      templateStyle: template?.style,
    };
    setDocument({ ...document, metadata: nextMetadata });

    try {
      await api.put(`/pdf-documents/${documentId}`, { metadata: nextMetadata });
      await api.post(`/pdf-studio/export/preview/${documentId}/invalidate`);
      setPreviewRefreshTrigger(prev => prev + 1);
      toast.success('Template updated');
    } catch {
      toast.error('Template changed locally, but could not save it yet');
    }
  };

  const handleProTemplateChange = async (proTemplateId: string | null) => {
    if (!document) return;
    setSelectedProTemplateId(proTemplateId);
    setShowProTemplatePicker(false);

    const nextMetadata = {
      ...(document.metadata || {}),
      proTemplateId,
      templateType: selectedTemplate,
    };
    setDocument({ ...document, metadata: nextMetadata });

    try {
      await api.put(`/pdf-documents/${documentId}`, { metadata: nextMetadata });
      await api.post(`/pdf-studio/export/preview/${documentId}/invalidate`);
      setPreviewRefreshTrigger(prev => prev + 1);
      toast.success(proTemplateId ? 'Pro Template updated' : 'Using basic templates');
    } catch {
      toast.error('Pro Template changed locally, but could not save it yet');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      for (const page of pages) {
        await api.patch(`/pdf-pages/${page.id}`, { content: page.content, title: page.title });
      }
      try {
        await api.post(`/pdf-studio/export/preview/${documentId}/invalidate`);
      } catch (_) {}

      setSaveSuccess(true);
      toast.success('Document saved successfully!');
      setPreviewRefreshTrigger(prev => prev + 1);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save changes';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEnhance = async (type: string) => {
    const currentPage = pages[currentPageIndex];
    if (!currentPage) return;
    if (!safePageText(currentPage.content?.text).trim()) {
      const msg = 'Cannot enhance empty content. Please add some text first.';
      setError(msg);
      toast.warning(msg);
      setTimeout(() => setError(''), 3000);
      return;
    }

    setEnhancing(true);
    setEnhancementType(type);
    setError('');

    try {
      const response = await api.post(`/pdf-studio/smart-builder/enhance`, {
        documentId: document.id,
        enhancementType: type,
        targetId: currentPage.id,
      });
      const { enhancedContent } = response.data.data;
      if (!enhancedContent?.trim()) throw new Error('Enhancement returned empty content');

      handlePageContentChange(currentPage.id, enhancedContent);

      const labels: Record<string, string> = {
        improve_writing: 'Writing improved',
        fix_grammar: 'Grammar fixed',
        restructure: 'Content restructured',
        expand: 'Content expanded',
        shorten: 'Content shortened',
        professionalize: 'Content professionalized',
      };
      toast.success(labels[type] || 'Content enhanced!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Enhancement failed.';
      setError(msg);
      toast.error(msg);
      setTimeout(() => setError(''), 5000);
    } finally {
      setEnhancing(false);
      setEnhancementType('');
    }
  };

  const handleAddPage = async () => {
    setAddingPage(true);
    try {
      const { data } = await api.post(`/pdf-studio/smart-builder/documents/${documentId}/pages`, {
        pageType: 'content',
        title: `Page ${pages.length + 1}`,
      });
      const newPage = data.data.page;
      const updated = [...pages, newPage];
      setPages(updated);
      setHistory(prev => { const b = prev.slice(0, historyIndex + 1); b.push(updated); return b.length > 50 ? b.slice(-50) : b; });
      setHistoryIndex(prev => Math.min(prev + 1, 49));
      setCurrentPageIndex(updated.length - 1);
      toast.success('Page added');
    } catch { toast.error('Failed to add page'); }
    finally { setAddingPage(false); }
  };

  const handleDeletePage = async (pageId: string, pageIndex: number) => {
    if (pages.length <= 1) { toast.warning('Cannot delete the only page'); return; }
    setDeletingPageId(pageId);
    try {
      await api.delete(`/pdf-studio/smart-builder/documents/${documentId}/pages/${pageId}`);
      const updated = pages.filter(p => p.id !== pageId);
      setPages(updated);
      setHistory(prev => { const b = prev.slice(0, historyIndex + 1); b.push(updated); return b.length > 50 ? b.slice(-50) : b; });
      setHistoryIndex(prev => Math.min(prev + 1, 49));
      setCurrentPageIndex(Math.min(pageIndex, updated.length - 1));
      setPreviewRefreshTrigger(t => t + 1);
      toast.success('Page deleted');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to delete page'); }
    finally { setDeletingPageId(null); }
  };

  const handleDuplicatePage = async (pageId: string) => {
    try {
      const { data } = await api.post(`/pdf-studio/smart-builder/documents/${documentId}/pages/${pageId}/duplicate`);
      const newPage = data.data.page;
      const updated = [...pages, newPage];
      setPages(updated);
      setHistory(prev => { const b = prev.slice(0, historyIndex + 1); b.push(updated); return b.length > 50 ? b.slice(-50) : b; });
      setHistoryIndex(prev => Math.min(prev + 1, 49));
      setCurrentPageIndex(updated.length - 1);
      toast.success('Page duplicated');
    } catch { toast.error('Failed to duplicate page'); }
  };

  const handlePageImageChange = (pageId: string, url: string) => {
    const newPages = pages.map(p =>
      p.id === pageId ? { ...p, content: { ...p.content, heroImage: url, image: url } } : p
    );
    setPages(newPages);
    isDirtyRef.current = true;
    setPreviewRefreshTrigger(t => t + 1);
  };

  const handlePageChartsChange = (pageId: string, charts: ChartConfig[]) => {
    const newPages = pages.map(p =>
      p.id === pageId ? { ...p, content: { ...p.content, charts } } : p
    );
    setPages(newPages);
    isDirtyRef.current = true;
    setPreviewRefreshTrigger(t => t + 1);
  };

  const handleExport = async (format: string = 'pdf') => {
    if (!document) return;
    try {
      setSaving(true);
      const response = await api.post(`/pdf-studio/export/${document.id}`, {
        format,
        templateType: selectedTemplate,
        proTemplateId: selectedProTemplateId,
        colorScheme: selectedTheme,
      }, { responseType: 'blob' });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      const ext = format === 'pdf' ? 'pdf' : format === 'docx' ? 'docx' : 'pptx';
      link.download = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Export failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <EditorSkeleton />;

  if (error && !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/pdf-studio" className="text-blue-600 hover:underline">Back to PDF Studio</Link>
        </div>
      </div>
    );
  }

  const currentPage = currentPageForEditor;
  const activeTheme = PDF_THEMES.find(t => t.id === selectedTheme) || PDF_THEMES[0];
  const activeTemplate = templates.find(template => template.type === selectedTemplate);
  const currentText = safePageText(currentPage?.content?.text);
  const currentWords = wordCount(currentText);
  const currentDensity = pageDensity(currentWords, currentPage?.pageType);
  const pageGroups = pages.reduce((groups: Array<{ label: string; pages: any[] }>, page) => {
    const label = sectionLabel(page);
    const previous = groups[groups.length - 1];
    if (previous && previous.label === label) {
      previous.pages.push(page);
    } else {
      groups.push({ label, pages: [page] });
    }
    return groups;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingTour />

      {/* ── Header ── */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/pdf-studio" className="text-gray-500 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-none">
                  {document?.title || 'Untitled Document'}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">{pages.length} pages</p>
              </div>
              {/* Quality score badge */}
              {document?.qualityScore != null && (
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                  style={{
                    background: document.qualityScore >= 80 ? '#ECFDF5' : document.qualityScore >= 60 ? '#FFFBEB' : '#FEF2F2',
                    color: document.qualityScore >= 80 ? '#065F46' : document.qualityScore >= 60 ? '#92400E' : '#991B1B',
                  }}
                  title={`Quality score: ${Math.round(document.qualityScore)}/100`}
                >
                  <Star className="w-3 h-3" />
                  {Math.round(document.qualityScore)}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <PresenceIndicator documentId={documentId} />
              {saveSuccess && (
                <div className="flex h-9 items-center gap-1.5 text-green-600 bg-green-50 px-2.5 rounded-lg text-xs font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Auto-saved
                </div>
              )}

              {/* Undo / Redo */}
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo (Ctrl+Z)"
                className="h-9 w-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors flex items-center justify-center"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo (Ctrl+Shift+Z)"
                className="h-9 w-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors flex items-center justify-center"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              {/* Version history */}
              <button
                onClick={() => { setShowVersionPanel(!showVersionPanel); if (!showVersionPanel) fetchVersions(); }}
                title="Version history"
                className={`h-9 w-9 rounded-lg border transition-colors flex items-center justify-center ${showVersionPanel ? 'border-violet-400 bg-violet-50 text-violet-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <History className="w-4 h-4" />
              </button>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex h-8 items-center gap-1.5 px-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-xs font-semibold"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>

              {/* Preview */}
              <button
                onClick={() => setShowPreviewModal(true)}
                className="flex h-8 items-center gap-1.5 px-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-semibold"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>

              {/* Template picker */}
              <div ref={templatePickerRef} className="relative">
                <button
                  onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                  className={`flex h-8 items-center gap-1.5 px-2.5 rounded-lg border transition-all text-xs font-semibold ${
                    showTemplatePicker
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                  title={`${templates.length || 30} PDF Studio templates`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Templates</span>
                  <span className="hidden xl:inline max-w-[140px] truncate text-[11px] opacity-70">
                    {activeTemplate?.name || 'Choose design'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTemplatePicker ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showTemplatePicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-[420px] max-h-[620px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl z-50"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                        <div>
                          <div className="text-xs font-semibold text-gray-900">Templates</div>
                          <div className="text-[11px] text-gray-500">{templates.length || 30} designs</div>
                        </div>
                        {activeTemplate && (
                          <div className="max-w-[190px] truncate text-right text-[11px] font-medium text-gray-500">
                            {activeTemplate.name}
                          </div>
                        )}
                      </div>
                      <div className="grid max-h-[530px] grid-cols-2 gap-2 overflow-y-auto p-2.5">
                        {templates.map(template => (
                          <button
                            key={template.type}
                            onClick={() => handleTemplateChange(template.type)}
                            className={`group overflow-hidden rounded-lg border bg-white text-left transition-all ${
                              selectedTemplate === template.type
                                ? 'border-blue-500 ring-2 ring-blue-100'
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            }`}
                            title={`${template.name} - ${templateStyleLabel(template)}`}
                          >
                            <div className="relative bg-gray-50">
                              {template.thumbnail ? (
                                <img
                                  src={template.thumbnail}
                                  alt=""
                                  className="h-28 w-full object-cover"
                                />
                              ) : (
                                <div className="h-28 w-full bg-gradient-to-br from-gray-100 to-gray-200" />
                              )}
                              {selectedTemplate === template.type && (
                                <div className="absolute right-2 top-2 rounded-full bg-blue-600 p-1 text-white shadow-sm">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </div>
                              )}
                              <div className="absolute bottom-2 left-2 flex gap-1">
                                <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold capitalize text-gray-700 shadow-sm">
                                  {template.style?.headerStyle || 'style'}
                                </span>
                                <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold capitalize text-gray-700 shadow-sm">
                                  {template.style?.cardStyle || 'cards'}
                                </span>
                              </div>
                            </div>
                            <div className="px-2.5 py-2">
                              <div className="truncate text-xs font-semibold text-gray-900">{template.name}</div>
                              <div className="mt-0.5 flex items-center justify-between gap-2">
                                <span className="truncate text-[10px] capitalize text-gray-500">
                                  {String(template.category || '').replace(/_/g, ' ')}
                                </span>
                                <span className="text-[10px] capitalize text-gray-400">
                                  {template.style?.spacing || 'normal'}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div ref={proTemplatePickerRef}>
                <ProTemplatesDropdown
                  open={showProTemplatePicker}
                  selectedId={selectedProTemplateId}
                  onToggle={() => setShowProTemplatePicker(!showProTemplatePicker)}
                  onSelect={(id) => handleProTemplateChange(id)}
                  onClear={() => handleProTemplateChange(null)}
                />
              </div>

              {/* Theme Picker Button */}
              <div ref={themePickerRef} className="relative">
                <button
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className={`group flex h-8 items-center gap-1.5 rounded-lg border px-2 pr-1.5 transition-all text-xs font-semibold shadow-sm ${
                    showThemePicker
                      ? 'border-gray-900 bg-gray-900 text-white shadow-md'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md'
                  }`}
                  title={`Theme: ${activeTheme.name}`}
                >
                  <div
                    className="h-5 w-5 rounded-md ring-1 ring-black/10 shadow-inner"
                    style={{ background: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.secondary})` }}
                  />
                  <span className="hidden max-w-[88px] truncate sm:inline">{activeTheme.name}</span>
                  <Palette className={`w-3.5 h-3.5 ${showThemePicker ? 'text-white/80' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {showThemePicker ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Theme picker dropdown */}
                <AnimatePresence>
                  {showThemePicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                      style={{ maxHeight: '480px' }}
                    >
                      <ThemePicker
                        selectedTheme={selectedTheme}
                        onThemeChange={(id) => {
                          handleThemeChange(id);
                        }}
                        onClose={() => setShowThemePicker(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Toggle right panel */}
              <button
                onClick={() => setShowPreview(!showPreview)}
                title={showPreview ? 'Hide preview panel' : 'Show preview panel'}
                className={`h-9 w-9 rounded-lg transition-colors text-sm flex items-center justify-center ${
                  showPreview
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <ExportDropdown onExport={handleExport} loading={saving} />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className={`grid gap-4 ${showPreview ? 'lg:grid-cols-[240px_minmax(620px,1fr)_360px]' : 'lg:grid-cols-[240px_minmax(620px,1fr)]'}`}>

          {/* ── Page Sidebar ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-20 max-h-[calc(100vh-90px)] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pages ({pages.length})</h3>
                <button
                  onClick={handleAddPage}
                  disabled={addingPage}
                  title="Add page"
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-40"
                >
                  {addingPage ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" /> : <Plus className="w-3.5 h-3.5 text-gray-600" />}
                </button>
              </div>
              <div className="space-y-3">
                {pageGroups.map(group => (
                  <div key={group.label}>
                    <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 truncate">
                      {group.label}
                    </div>
                    <div className="space-y-1">
                      {group.pages.map((page) => {
                        const index = pages.findIndex(p => p.id === page.id);
                        const text = safePageText(page.content?.text);
                        const density = pageDensity(wordCount(text), page.pageType);
                        const proArchetype = proArchetypeForPage(page, index, pages.length);
                        return (
                          <div
                            key={page.id}
                            className={`group relative flex items-center gap-1.5 p-2 rounded-lg transition-all cursor-pointer ${
                              currentPageIndex === index ? 'ring-2' : 'hover:bg-gray-50'
                            }`}
                            style={currentPageIndex === index ? {
                              background: `${activeTheme.primary}10`,
                              outline: `2px solid ${activeTheme.primary}`,
                            } : {}}
                            onClick={() => setCurrentPageIndex(index)}
                          >
                            {selectedProTemplateId ? (
                              <div className="relative h-9 w-7 flex-shrink-0 overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                                <div className="absolute inset-x-0 top-0 h-2 bg-[#1F2933]" />
                                <div className="absolute left-1 top-3 h-4 w-2 rounded-r-full bg-[#2CB6A3]" />
                                <div className="absolute right-1 top-3 h-1 w-3 rounded bg-[#1F2933]" />
                                <div className="absolute right-1 top-5 h-1 w-4 rounded bg-gray-200" />
                                <div className="absolute bottom-1 left-1 text-[7px] font-bold text-[#1F2933]">{index + 1}</div>
                              </div>
                            ) : (
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                style={{
                                  background: currentPageIndex === index
                                    ? `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.secondary})`
                                    : '#E5E7EB',
                                  color: currentPageIndex === index ? 'white' : '#6B7280',
                                }}
                              >
                                {index + 1}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium text-gray-900 truncate">{page.title || `Page ${index + 1}`}</div>
                              <div className="flex items-center gap-1 text-[9px] text-gray-400 capitalize">
                                <span>{page.pageType}</span>
                                {selectedProTemplateId && <span className="rounded bg-teal-50 px-1 font-bold text-teal-700">{proArchetype}</span>}
                                {density.problem && <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />}
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                              <button
                                onClick={e => { e.stopPropagation(); handleDuplicatePage(page.id); }}
                                title="Duplicate"
                                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); handleDeletePage(page.id, index); }}
                                title="Delete"
                                disabled={deletingPageId === page.id || pages.length <= 1}
                                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                              >
                                {deletingPageId === page.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Trash2 className="w-3 h-3" />
                                }
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Theme mini preview */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-2">Active Theme</p>
                <div
                  className="h-8 rounded-lg w-full"
                  style={{ background: `linear-gradient(135deg, ${activeTheme.primary} 0%, ${activeTheme.secondary} 60%, ${activeTheme.accent} 100%)` }}
                />
                <p className="text-[10px] text-gray-500 mt-1 text-center">{activeTheme.name}</p>
              </div>

              {/* Version History Panel */}
              {showVersionPanel && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Version History</p>
                    <button
                      onClick={saveVersion}
                      className="text-[10px] text-violet-600 font-medium hover:text-violet-800 transition-colors"
                    >
                      + Save now
                    </button>
                  </div>
                  {versions.length === 0 ? (
                    <p className="text-[10px] text-gray-400">No saved versions yet.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {versions.map((v: any) => (
                        <div key={v.id} className="flex items-center justify-between p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div>
                            <p className="text-[10px] font-medium text-gray-700 truncate max-w-[110px]">{v.title}</p>
                            <p className="text-[9px] text-gray-400">{new Date(v.createdAt).toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => restoreVersion(v.id)}
                            className="text-[9px] text-violet-600 hover:text-violet-800 font-medium ml-1"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Main A4 Editor Canvas ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Accent strip */}
              <div
                className="h-1.5"
                style={{ background: `linear-gradient(90deg, ${activeTheme.primary}, ${activeTheme.accent})` }}
              />
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                  <FileText className="w-4 h-4" />
                  {selectedProTemplateId ? 'Editable A4 Canvas · Pro Template Active' : 'Editable A4 Canvas'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{currentWords} words</span>
                  <span
                    className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                      currentDensity.problem ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {currentDensity.label}
                  </span>
                </div>
              </div>
              <div className="p-6">
                {currentPage && (
                  <>
                    <>
                    <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-2">
                      {([
                        { icon: Bold, style: { fontWeight: 700 }, title: 'Bold' },
                        { icon: Italic, style: { fontStyle: 'italic' }, title: 'Italic' },
                        { icon: Underline, style: { textDecoration: 'underline' }, title: 'Underline' },
                      ] as Array<{ icon: any; style: Record<string, string | number>; title: string }>).map(({ icon: Icon, style, title }) => (
                        <button
                          key={title}
                          title={title}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => applySelectionStyle(style)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors text-gray-600 hover:bg-gray-100"
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                      <div className="mx-1 h-6 w-px bg-gray-200" />
                      {[
                        { icon: AlignLeft, value: 'left', title: 'Align left' },
                        { icon: AlignCenter, value: 'center', title: 'Align center' },
                        { icon: AlignRight, value: 'right', title: 'Align right' },
                      ].map(({ icon: Icon, value, title }) => (
                        <button
                          key={value}
                          title={title}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => applySelectionCommand(`justify${value[0].toUpperCase()}${value.slice(1)}`)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors text-gray-600 hover:bg-gray-100"
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                      <div className="mx-1 h-6 w-px bg-gray-200" />
                      <label className="flex items-center gap-1.5 rounded-lg px-2 text-xs text-gray-500">
                        <Type className="w-3.5 h-3.5" />
                        <input
                          type="number"
                          min="12"
                          max="28"
                          defaultValue={currentPage.content?.styles?.fontSize || 16}
                          onMouseDown={rememberSelection}
                          onChange={e => applySelectionStyle({ fontSize: `${Number(e.target.value)}px` })}
                          className="h-8 w-14 rounded-md border border-gray-200 px-2 text-xs"
                        />
                      </label>
                      <label title="Text color" className="h-8 w-8 overflow-hidden rounded-lg border border-gray-200">
                        <input
                          type="color"
                          value={currentPage.content?.styles?.color || '#374151'}
                          onMouseDown={rememberSelection}
                          onChange={e => applySelectionStyle({ color: e.target.value })}
                          className="h-10 w-10 -m-1 cursor-pointer"
                        />
                      </label>
                      <button
                        title="Bullet list"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => applySelectionCommand('insertUnorderedList')}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        title="Numbered list"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => applySelectionCommand('insertOrderedList')}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      >
                        <ListOrdered className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mx-auto bg-[#d8dbe0] p-5 rounded-xl overflow-auto">
                      <div className="mx-auto bg-white shadow-xl border border-gray-200" style={{ width: 595, minHeight: 842 }}>
                        <div className="p-12">
                          <input
                            type="text"
                            value={currentPage.title || ''}
                            onChange={(e) => {
                              const newPages = [...pages];
                              newPages[currentPageIndex] = { ...currentPage, title: e.target.value };
                              setPages(newPages);
                              isDirtyRef.current = true;
                              setPreviewRefreshTrigger(prev => prev + 1);
                            }}
                            placeholder="Page title..."
                            className="w-full border-0 border-b border-gray-200 bg-transparent pb-3 text-3xl font-bold text-gray-900 focus:outline-none"
                          />
                          <div
                            ref={bodyEditorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={() => handlePageHtmlInput(currentPage.id)}
                            onMouseUp={rememberSelection}
                            onKeyUp={rememberSelection}
                            onBlur={rememberSelection}
                            data-placeholder="Enter page content..."
                            className="mt-8 w-full border-0 bg-transparent text-gray-700 outline-none whitespace-pre-wrap"
                            style={{
                              minHeight: 610,
                              fontFamily: currentPage.content?.styles?.fontFamily || 'Inter, system-ui, sans-serif',
                              fontSize: currentPage.content?.styles?.fontSize || 16,
                              lineHeight: currentPage.content?.styles?.lineHeight || 1.65,
                              color: currentPage.content?.styles?.color || '#374151',
                              textAlign: currentPage.content?.styles?.textAlign || 'left',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        {error}
                      </div>
                    )}

                    {/* AI Enhance bar */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-2.5 uppercase tracking-wide">
                        AI Enhance
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'improve_writing', label: 'Improve', icon: Sparkles },
                          { id: 'fix_grammar', label: 'Grammar', icon: CheckCircle },
                          { id: 'restructure', label: 'Structure', icon: ZapIcon },
                          { id: 'expand', label: 'Expand', icon: ZapIcon },
                          { id: 'shorten', label: 'Shorten', icon: ZapIcon },
                          { id: 'professionalize', label: 'Professionalize', icon: Sparkles },
                        ].map(({ id, label, icon: Icon }) => (
                          <button
                            key={id}
                            onClick={() => handleEnhance(id)}
                            disabled={enhancing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white"
                            style={{ background: enhancing && enhancementType === id ? activeTheme.secondary : activeTheme.primary }}
                          >
                            {enhancing && enhancementType === id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Icon className="w-3 h-3" />}
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Page navigation */}
                    <div className="mt-5 flex items-center justify-between pt-4 border-t border-gray-100">
                      <button
                        onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                        disabled={currentPageIndex === 0}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 text-sm transition-colors"
                      >
                        ← Prev
                      </button>
                      <span className="text-xs text-gray-500">
                        {currentPageIndex + 1} / {pages.length}
                      </span>
                      {currentPageIndex === pages.length - 1 ? (
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-4 py-1.5 text-white text-sm rounded-lg font-semibold transition-colors disabled:opacity-50"
                          style={{ background: activeTheme.primary }}
                        >
                          {saving ? 'Saving...' : 'Finish & Save'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition-colors"
                        >
                          Next →
                        </button>
                      )}
                    </div>
                    </>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Inspector + Export Preview ── */}
          {showPreview && (
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-4">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="flex border-b border-gray-100 bg-gray-50">
                    {([
                      { id: 'content', label: 'Content', icon: <Layers className="w-3.5 h-3.5" /> },
                      { id: 'images', label: 'Image', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                      { id: 'charts', label: 'Charts', icon: <BarChart2 className="w-3.5 h-3.5" /> },
                    ] as const).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setRightTab(tab.id)}
                        className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                          rightTab === tab.id
                            ? 'border-current text-blue-600 bg-white'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="p-4">
                    {rightTab === 'content' && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                            <span>Page Density</span>
                            <span>{currentDensity.value}%</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${currentDensity.problem ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${currentDensity.value}%` }}
                            />
                          </div>
                          {currentDensity.problem && (
                            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {currentDensity.problem}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg border border-gray-100 p-3">
                            <div className="text-gray-400">Type</div>
                            <div className="mt-1 font-semibold capitalize text-gray-800">{currentPage?.pageType || 'content'}</div>
                          </div>
                          <div className="rounded-lg border border-gray-100 p-3">
                            <div className="text-gray-400">Words</div>
                            <div className="mt-1 font-semibold text-gray-800">{currentWords}</div>
                          </div>
                        </div>
                        <label className="block text-xs font-semibold text-gray-500">
                          Line height
                          <input
                            type="range"
                            min="1.2"
                            max="2"
                            step="0.05"
                            value={currentPage?.content?.styles?.lineHeight || 1.65}
                            onChange={e => currentPage && handlePageStyleChange(currentPage.id, { lineHeight: Number(e.target.value) })}
                            className="mt-2 w-full"
                          />
                        </label>
                      </div>
                    )}
                    {rightTab === 'images' && currentPage && (
                      <ImageUploadPanel
                        onImageSelect={url => handlePageImageChange(currentPage.id, url)}
                        currentImageUrl={currentPage.content?.heroImage || currentPage.content?.image || ''}
                        label="Hero / Page Image"
                      />
                    )}
                    {rightTab === 'charts' && currentPage && (
                      <ChartPanel
                        charts={currentPage.content?.charts || []}
                        onChange={charts => handlePageChartsChange(currentPage.id, charts)}
                      />
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                      <Eye className="w-3.5 h-3.5" />
                      Export Preview
                    </div>
                    <button
                      onClick={() => setShowPreviewModal(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Fullscreen
                    </button>
                  </div>
                  <div className="h-[420px]">
                    <LivePreview
                      documentId={documentId}
                      refreshTrigger={previewRefreshTrigger}
                      colorScheme={selectedTheme}
                      templateType={selectedTemplate}
                      proTemplateId={selectedProTemplateId}
                      onFullscreen={() => setShowPreviewModal(true)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen preview modal */}
      {showPreviewModal && (
        <PreviewModal
          documentId={documentId}
          documentTitle={document?.title || 'Untitled Document'}
          pageCount={pages.length}
          colorScheme={selectedTheme}
          templateType={selectedTemplate}
          proTemplateId={selectedProTemplateId}
          onClose={() => setShowPreviewModal(false)}
          onExport={handleExport}
        />
      )}
    </div>
  );
}
