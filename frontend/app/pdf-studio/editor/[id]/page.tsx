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
  Underline, Strikethrough, AlignJustify, List, ListOrdered, FileText, Layers,
  AlertTriangle, Table2, LayoutTemplate, Blocks,
} from 'lucide-react';
import Link from 'next/link';
import ExportDropdown from '@/components/pdf-studio/ExportDropdown';
import ThemePicker, { PDF_THEMES } from '@/components/pdf-studio/ThemePicker';
import { ChartPanel, ChartConfig } from '@/components/pdf-studio/ChartPanel';
import LivePreview from '@/components/LivePreview';
import PreviewModal from '@/components/PreviewModal';
import { EditorSkeleton } from '@/components/Skeleton';
import OnboardingTour from '@/components/OnboardingTour';
import { useToast } from '@/components/ToastProvider';
import { PresenceIndicator } from '@/components/PresenceIndicator';
import { ProTemplatesDropdown } from '@/features/pdf-studio/pro-templates/components/ProTemplatesDropdown';
import { TemplatesDropdown } from '@/features/pdf-studio/templates/components/TemplatesDropdown';
import { FontPicker } from '@/components/FontPicker';
import { getFontKeyFromStack, getFontStack } from '@/lib/fonts';
import { BlockPicker, BlockType } from '@/components/pdf-editor/BlockPicker';
import { PageImageOverlay } from '@/features/pdf-studio/image-placement/PageImageOverlay';
import { ImagePlacementTab } from '@/features/pdf-studio/image-placement/ImagePlacementTab';
import type { PlacedImage } from '@/features/pdf-studio/image-placement/types';

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

function stripLegacyImagePlaceholders(html: string): string {
  return html
    .replace(/<section\b[^>]*data-pitchonix-block=["']image["'][\s\S]*?<\/section>/gi, '')
    .replace(/<div\b[^>]*>\s*Image placeholder\s*<\/div>\s*<p\b[^>]*>\s*Use the Image tab to upload or replace the page image\.\s*<\/p>/gi, '');
}

function blockHtml(block: BlockType): string {
  const common = 'margin:24px 0;padding:22px;border:1px solid #D9E7E3;border-radius:18px;background:#F8FCFA;color:#173D39;';
  const title = `<h3 style="margin:0 0 12px;font-size:20px;line-height:1.15;color:#12312E;">${escapeHtml(block.name)}</h3>`;
  if (block.id === 'timeline') {
    return `<section data-pitchonix-block="timeline" style="${common}">${title}<div style="display:grid;gap:12px;">${['Discovery','Build','Launch'].map((item, index) => `<div style="display:grid;grid-template-columns:32px 1fr;gap:12px;align-items:start;"><b style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:#1E4240;color:white;">${index + 1}</b><div><strong>${item}</strong><p style="margin:4px 0 0;color:#55736D;">Add milestone details here.</p></div></div>`).join('')}</div></section>`;
  }
  if (block.id === 'swot') {
    return `<section data-pitchonix-block="swot" style="${common}">${title}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${['Strengths','Weaknesses','Opportunities','Threats'].map(item => `<div style="padding:14px;border-radius:14px;background:white;border:1px solid #E2ECE9;"><strong>${item}</strong><p style="margin:6px 0 0;color:#55736D;">Add strategic notes.</p></div>`).join('')}</div></section>`;
  }
  if (block.id === 'kpi-cards') {
    return `<section data-pitchonix-block="kpi-cards" style="${common}">${title}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">${['78%','3.4x','12k'].map((metric, index) => `<div style="padding:16px;border-radius:16px;background:${index === 1 ? '#1E4240' : 'white'};color:${index === 1 ? 'white' : '#173D39'};border:1px solid #E2ECE9;"><strong style="display:block;font-size:24px;">${metric}</strong><span style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;">Metric label</span></div>`).join('')}</div></section>`;
  }
  if (block.id === 'chart') {
    return `<section data-pitchonix-block="chart" style="${common}">${title}<div style="display:flex;align-items:end;gap:10px;height:120px;">${[62, 86, 48, 74, 92].map(value => `<span style="flex:1;height:${value}%;border-radius:10px 10px 3px 3px;background:#1E4240;"></span>`).join('')}</div></section>`;
  }
  if (block.id === 'table' || block.id === 'comparison') {
    return `<section data-pitchonix-block="${block.id}" style="${common}">${title}<table style="width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden;"><thead><tr>${['Item','Status','Notes'].map(h => `<th style="padding:10px;text-align:left;background:#1E4240;color:white;">${h}</th>`).join('')}</tr></thead><tbody>${['First','Second','Third'].map(row => `<tr><td style="padding:10px;border-bottom:1px solid #E2ECE9;">${row}</td><td style="padding:10px;border-bottom:1px solid #E2ECE9;">Ready</td><td style="padding:10px;border-bottom:1px solid #E2ECE9;">Add details</td></tr>`).join('')}</tbody></table></section>`;
  }
  if (block.id === 'feature-grid') {
    return `<section data-pitchonix-block="feature-grid" style="${common}">${title}<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">${['Fast workflow','Brand-ready','Export-safe','Editable'].map(item => `<div style="padding:14px;border-radius:14px;background:white;border:1px solid #E2ECE9;"><strong>${item}</strong><p style="margin:6px 0 0;color:#55736D;">Add supporting detail.</p></div>`).join('')}</div></section>`;
  }
  if (block.id === 'testimonial') {
    return `<section data-pitchonix-block="testimonial" style="${common}"><blockquote style="margin:0;font-size:22px;line-height:1.3;color:#12312E;">“Add a customer quote or stakeholder endorsement here.”</blockquote><p style="margin:14px 0 0;color:#55736D;font-weight:700;">Name, role, company</p></section>`;
  }
  if (block.id === 'cta') {
    return `<section data-pitchonix-block="cta" style="margin:24px 0;padding:24px;border-radius:20px;background:#1E4240;color:white;"><h3 style="margin:0 0 8px;font-size:24px;">Next action</h3><p style="margin:0 0 16px;color:#D6EEE9;">Describe the primary call to action.</p><span style="display:inline-block;padding:10px 14px;border-radius:999px;background:#9FE89F;color:#173D39;font-weight:800;">Call to action</span></section>`;
  }
  return `<section data-pitchonix-block="${escapeHtml(block.id)}" style="${common}">${title}<p style="margin:0;color:#55736D;">${escapeHtml(block.description)}</p></section>`;
}

function editableHtmlForPage(page: any): string {
  const html = page?.content?.html;
  if (typeof html === 'string' && html.trim()) return stripLegacyImagePlaceholders(html);
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
  // Group by the semantic section (sectionId or sectionTitle), not by the per-page title.
  // This keeps continuation pages in one group even when they have unique per-page titles.
  const sectionTitle = String(content.sectionTitle || page?.title || '').replace(/\s*\(continued\)\s*$/i, '').trim();
  if (!sectionTitle) return page?.pageType === 'cover' ? 'Cover' : page?.pageType === 'toc' ? 'Table of Contents' : 'Document';
  return sectionTitle;
}

function pageDisplayTitle(page: any, indexInSection: number): string {
  // Use the per-page title if it differs from the section title; otherwise use section title.
  const content = page?.content || {};
  const pageTitle = String(page?.title || '').replace(/\s*\(continued\)\s*$/i, '').trim();
  const sectionTitle = String(content.sectionTitle || '').replace(/\s*\(continued\)\s*$/i, '').trim();
  if (pageTitle && pageTitle !== sectionTitle) return pageTitle;
  if (indexInSection > 0) return sectionTitle || `Page ${indexInSection + 1}`;
  return pageTitle || sectionTitle || 'Untitled';
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
  const [rightTab, setRightTab] = useState<'content' | 'images' | 'charts'>('content');
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [preflightResult, setPreflightResult] = useState<any>(null);
  const [runningPreflight, setRunningPreflight] = useState(false);
  const [addingPage, setAddingPage] = useState(false);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);

  const themePickerRef = useRef<HTMLDivElement>(null);
  const templatePickerRef = useRef<HTMLDivElement>(null);
  const proTemplatePickerRef = useRef<HTMLDivElement>(null);
  const bodyEditorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const toolbarImageInputRef = useRef<HTMLInputElement>(null);
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
    setSelectedImageId(null); // clear selection when switching pages
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

  const hasEditorSelection = () => {
    const editor = bodyEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
    return editor.contains(selection.getRangeAt(0).commonAncestorContainer);
  };

  const applyTextStyle = (styles: Record<string, string | number>) => {
    const currentPage = pages[currentPageIndex];
    if (!currentPage) return;
    if (hasEditorSelection() || restoreSelection()) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        applySelectionStyle(styles);
        return;
      }
    }
    handlePageStyleChange(currentPage.id, styles);
  };

  const applyFontFamily = (fontFamily: string) => {
    applyTextStyle({ fontFamily });
  };

  const applyHeading = (tag: 'p' | 'h1' | 'h2' | 'h3' | 'blockquote') => {
    const currentPage = pages[currentPageIndex];
    if (!currentPage) return;
    if (restoreSelection()) {
      window.document.execCommand('formatBlock', false, tag);
      rememberSelection();
      handlePageHtmlInput(currentPage.id);
    } else {
      toast.warning('Place the cursor inside the page first');
    }
  };

  const insertHtmlAtCursor = (html: string) => {
    const currentPage = pages[currentPageIndex];
    const editor = bodyEditorRef.current;
    if (!currentPage || !editor) return;
    const selectionRestored = restoreSelection();
    const selection = window.getSelection();
    if (selectionRestored && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const fragment = range.createContextualFragment(html);
      range.insertNode(fragment);
      selection.removeAllRanges();
    } else {
      editor.insertAdjacentHTML('beforeend', html);
    }
    handlePageHtmlInput(currentPage.id);
  };

  const handleInsertBlock = (block: BlockType) => {
    if (block.id === 'image') {
      setRightTab('images');
      toolbarImageInputRef.current?.click();
      toast.success('Choose an image to place on the page');
      return;
    }
    insertHtmlAtCursor(blockHtml(block));
    toast.success(`${block.name} block inserted`);
  };

  const handleInsertTable = () => {
    insertHtmlAtCursor(blockHtml({
      id: 'table',
      name: 'Table',
      description: 'Data table',
      icon: Table2,
      category: 'data',
      component: 'TableBlock',
    }));
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

  const resolveImageUrl = (url: string) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');
    return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`;
  };

  const uploadAndPlaceImage = async (file: File) => {
    const currentPage = pages[currentPageIndex];
    if (!currentPage || !file.type.startsWith('image/')) return;
    setRightTab('images');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/pdf-studio/images/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = resolveImageUrl(data.data?.url || data.url || '');
      if (!url) throw new Error('Upload response did not include an image URL');
      handleAddPlacedImage(currentPage.id, url);
      toast.success('Image added. Drag it on the page to position it.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Image upload failed');
    }
  };

  // ── Placed-image handlers ──────────────────────────────────────────────────
  const handleAddPlacedImage = (pageId: string, url: string) => {
    const newImage: PlacedImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url,
      x: 5,
      y: 10,
      width: 90,
      height: 38,
      zIndex: 2,
      opacity: 1,
      fit: 'cover',
    };
    const newPages = pages.map(p =>
      p.id === pageId
        ? { ...p, content: { ...p.content, placedImages: [...(p.content?.placedImages || []), newImage] } }
        : p
    );
    updatePagesAfterEdit(newPages);
    setSelectedImageId(newImage.id);
    setRightTab('images');
  };

  const handleUpdatePlacedImage = (pageId: string, imageId: string, updates: Partial<PlacedImage>) => {
    const newPages = pages.map(p => {
      if (p.id !== pageId) return p;
      const imgs: PlacedImage[] = (p.content?.placedImages || []).map((img: PlacedImage) =>
        img.id === imageId ? { ...img, ...updates } : img
      );
      return { ...p, content: { ...p.content, placedImages: imgs } };
    });
    setPages(newPages);
    isDirtyRef.current = true;
    setPreviewRefreshTrigger(t => t + 1);
  };

  const handleDeletePlacedImage = (pageId: string, imageId: string) => {
    const newPages = pages.map(p => {
      if (p.id !== pageId) return p;
      const imgs = (p.content?.placedImages || []).filter((img: PlacedImage) => img.id !== imageId);
      return { ...p, content: { ...p.content, placedImages: imgs } };
    });
    updatePagesAfterEdit(newPages);
    setSelectedImageId(null);
  };

  const handlePageChartsChange = (pageId: string, charts: ChartConfig[]) => {
    const newPages = pages.map(p =>
      p.id === pageId ? { ...p, content: { ...p.content, charts } } : p
    );
    setPages(newPages);
    isDirtyRef.current = true;
    setPreviewRefreshTrigger(t => t + 1);
  };

  const runPreflight = async () => {
    if (!document) return;
    setRunningPreflight(true);
    try {
      const res = await api.get(`/pdf-studio/export/preflight/${document.id}`);
      setPreflightResult(res.data.data);
    } catch (_) {
      setPreflightResult({ errors: [{ message: 'Preflight check failed' }], warnings: [], suggestions: [], exportReady: false, qualityScore: 0 });
    } finally {
      setRunningPreflight(false);
    }
  };

  const handleExport = async (format: string = 'pdf', exportOptions?: Record<string, any>) => {
    if (!document) return;
    try {
      setSaving(true);
      const response = await api.post(`/pdf-studio/export/${document.id}`, {
        format,
        templateType: selectedTemplate,
        proTemplateId: selectedProTemplateId,
        colorScheme: selectedTheme,
        ...(exportOptions ? { exportOptions } : {}),
      }, { responseType: 'blob' });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      const ext = format === 'pdf' ? 'pdf' : format === 'docx' ? 'docx' : format === 'png' ? 'png' : format === 'jpeg' || format === 'jpg' ? 'jpg' : 'pptx';
      link.download = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      let msg = err.response?.data?.message || err.message || 'Export failed';
      const responseData = err.response?.data || err.details;
      if (responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const parsed = JSON.parse(text);
          msg = parsed?.message || parsed?.preflight?.errors?.[0]?.message || msg;
          if (parsed?.preflight) setPreflightResult(parsed.preflight);
        } catch (_) {}
      } else if (responseData?.preflight) {
        msg = responseData.message || responseData.preflight?.errors?.[0]?.message || msg;
        setPreflightResult(responseData.preflight);
      }
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
  const currentText = safePageText(currentPage?.content?.text);
  const currentWords = wordCount(currentText);
  const currentDensity = pageDensity(currentWords, currentPage?.pageType);
  const pageGroups = pages.reduce((groups: Array<{ label: string; pages: any[]; }>, page) => {
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
      <BlockPicker
        isOpen={showBlockPicker}
        onClose={() => setShowBlockPicker(false)}
        onSelectBlock={handleInsertBlock}
      />
      <input
        ref={toolbarImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) uploadAndPlaceImage(file);
          e.currentTarget.value = '';
        }}
      />

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

            <div className="flex items-center gap-1.5">
              <PresenceIndicator documentId={documentId} />

              {/* Auto-saved pill */}
              {saveSuccess && (
                <div className="flex h-7 items-center gap-1 rounded-md bg-green-50 px-2 text-[10px] font-medium text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  Saved
                </div>
              )}

              {/* Divider */}
              <div className="h-5 w-px bg-gray-200" />

              {/* Undo / Redo */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  title="Undo (Ctrl+Z)"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  title="Redo (Ctrl+Shift+Z)"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setShowVersionPanel(!showVersionPanel); if (!showVersionPanel) fetchVersions(); }}
                  title="Version history"
                  className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${showVersionPanel ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <History className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Divider */}
              <div className="h-5 w-px bg-gray-200" />

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex h-7 items-center gap-1 px-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors text-[11px] font-semibold"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </button>

              {/* Preview */}
              <button
                onClick={() => setShowPreviewModal(true)}
                className="flex h-7 items-center gap-1 px-2.5 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors text-[11px] font-semibold"
              >
                <Eye className="w-3 h-3" />
                Preview
              </button>

              {/* Divider */}
              <div className="h-5 w-px bg-gray-200" />

              {/* Template picker */}
              <div ref={templatePickerRef}>
                <TemplatesDropdown
                  open={showTemplatePicker}
                  selectedId={selectedTemplate}
                  onToggle={() => setShowTemplatePicker(!showTemplatePicker)}
                  onSelect={(id) => { handleTemplateChange(id); setShowTemplatePicker(false); }}
                />
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

              {/* Divider */}
              <div className="h-5 w-px bg-gray-200" />

              {/* Theme Picker Button */}
              <div ref={themePickerRef} className="relative">
                <button
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className={`group flex h-7 items-center gap-1 rounded-md border px-2 transition-all text-[11px] font-semibold ${
                    showThemePicker
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  title={`Theme: ${activeTheme.name}`}
                >
                  <div
                    className="h-3.5 w-3.5 rounded-sm ring-1 ring-black/10"
                    style={{ background: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.secondary})` }}
                  />
                  <span className="hidden max-w-[72px] truncate sm:inline">{activeTheme.name}</span>
                  {showThemePicker ? <ChevronUp className="w-3 h-3 opacity-60" /> : <ChevronDown className="w-3 h-3 opacity-60" />}
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
                className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                  showPreview
                    ? 'border-gray-300 bg-gray-100 text-gray-700'
                    : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                }`}
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
                  aria-label="Add new page"
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-40"
                >
                  {addingPage ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" aria-hidden="true" /> : <Plus className="w-3.5 h-3.5 text-gray-600" aria-hidden="true" />}
                </button>
              </div>
              <div className="space-y-3">
                {pageGroups.map(group => (
                  <div key={group.label}>
                    <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 truncate">
                      {group.label}
                    </div>
                    <div className="space-y-1">
                      {group.pages.map((page, indexInSection) => {
                        const index = pages.findIndex(p => p.id === page.id);
                        const text = safePageText(page.content?.text);
                        const density = pageDensity(wordCount(text), page.pageType);
                        const proArchetype = proArchetypeForPage(page, index, pages.length);
                        const displayTitle = pageDisplayTitle(page, indexInSection);
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
                              <div className="text-[11px] font-medium text-gray-900 truncate">{displayTitle || `Page ${index + 1}`}</div>
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
                      className="text-[10px] text-green-600 font-medium hover:text-green-800 transition-colors"
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
                            className="text-[9px] text-green-600 hover:text-green-800 font-medium ml-1"
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
                    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <FontPicker
                          value={getFontKeyFromStack(currentPage.content?.styles?.fontFamily)}
                          returnValue="stack"
                          onChange={applyFontFamily}
                          className="h-8 w-[190px] rounded-lg border-gray-200 text-xs"
                        />
                        <select
                          title="Text style"
                          onMouseDown={rememberSelection}
                          onChange={e => applyHeading(e.target.value as 'p' | 'h1' | 'h2' | 'h3' | 'blockquote')}
                          defaultValue="p"
                          className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 outline-none"
                        >
                          <option value="p">Paragraph</option>
                          <option value="h1">Heading 1</option>
                          <option value="h2">Heading 2</option>
                          <option value="h3">Heading 3</option>
                          <option value="blockquote">Quote</option>
                        </select>
                        <label className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 text-xs text-gray-500">
                          <Type className="w-3.5 h-3.5" />
                          <input
                            type="number"
                            min="10"
                            max="72"
                            defaultValue={currentPage.content?.styles?.fontSize || 16}
                            onMouseDown={rememberSelection}
                            onChange={e => applyTextStyle({ fontSize: `${Number(e.target.value)}px` })}
                            className="h-7 w-12 border-0 px-0 text-xs outline-none"
                          />
                        </label>
                        <div className="mx-1 h-6 w-px bg-gray-200" />
                      {([
                        { icon: Bold, style: { fontWeight: 700 }, title: 'Bold' },
                        { icon: Italic, style: { fontStyle: 'italic' }, title: 'Italic' },
                        { icon: Underline, style: { textDecoration: 'underline' }, title: 'Underline' },
                        { icon: Strikethrough, style: { textDecoration: 'line-through' }, title: 'Strikethrough' },
                      ] as Array<{ icon: any; style: Record<string, string | number>; title: string }>).map(({ icon: Icon, style, title }) => (
                        <button
                          key={title}
                          title={title}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => applyTextStyle(style)}
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
                        { icon: AlignJustify, value: 'full', title: 'Justify' },
                      ].map(({ icon: Icon, value, title }) => (
                        <button
                          key={value}
                          title={title}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            applySelectionCommand(value === 'full' ? 'justifyFull' : `justify${value[0].toUpperCase()}${value.slice(1)}`);
                            if (currentPage) handlePageStyleChange(currentPage.id, { textAlign: value === 'full' ? 'justify' : value });
                          }}
                          className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors text-gray-600 hover:bg-gray-100"
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                      <div className="mx-1 h-6 w-px bg-gray-200" />
                      <label title="Text color" className="h-8 w-8 overflow-hidden rounded-lg border border-gray-200">
                        <input
                          type="color"
                          value={currentPage.content?.styles?.color || '#374151'}
                          onMouseDown={rememberSelection}
                          onChange={e => applyTextStyle({ color: e.target.value })}
                          className="h-10 w-10 -m-1 cursor-pointer"
                        />
                      </label>
                      <label title="Highlight color" className="relative h-8 w-8 overflow-hidden rounded-lg border border-gray-200">
                        <Highlighter className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-gray-700" />
                        <input
                          type="color"
                          defaultValue="#FEF3C7"
                          onMouseDown={rememberSelection}
                          onChange={e => applyTextStyle({ backgroundColor: e.target.value })}
                          className="h-10 w-10 -m-1 cursor-pointer opacity-0"
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
                      <div className="mx-1 h-6 w-px bg-gray-200" />
                      <button
                        title="Upload and place image"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setRightTab('images');
                          toolbarImageInputRef.current?.click();
                        }}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button
                        title="Insert chart"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => setRightTab('charts')}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </button>
                      <button
                        title="Insert table"
                        onMouseDown={e => e.preventDefault()}
                        onClick={handleInsertTable}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      >
                        <Table2 className="w-4 h-4" />
                      </button>
                      <button
                        title="Insert block"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => setShowBlockPicker(true)}
                        className="h-8 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                      >
                        <Blocks className="w-4 h-4" />
                        Blocks
                      </button>
                      <button
                        title="Two-column starter"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => insertHtmlAtCursor('<section data-pitchonix-block="columns" style="margin:24px 0;display:grid;grid-template-columns:1fr 1fr;gap:16px;"><div style="padding:18px;border-radius:16px;background:#F8FCFA;border:1px solid #D9E7E3;"><h3 style="margin:0 0 8px;">Column one</h3><p>Add content here.</p></div><div style="padding:18px;border-radius:16px;background:#F8FCFA;border:1px solid #D9E7E3;"><h3 style="margin:0 0 8px;">Column two</h3><p>Add content here.</p></div></section>')}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      >
                        <LayoutTemplate className="w-4 h-4" />
                      </button>
                      </div>
                    </div>

                    <div className="mx-auto bg-[#d8dbe0] p-5 rounded-xl overflow-auto">
                      <div
                        className="mx-auto bg-white shadow-xl border border-gray-200"
                        style={{ width: 595, minHeight: 842, position: 'relative' }}
                        onClick={() => setSelectedImageId(null)}
                      >
                        <div className="p-12" style={{ position: 'relative', zIndex: 1 }}>
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
                              fontFamily: currentPage.content?.styles?.fontFamily || getFontStack('inter'),
                              fontSize: currentPage.content?.styles?.fontSize || 16,
                              lineHeight: currentPage.content?.styles?.lineHeight || 1.65,
                              color: currentPage.content?.styles?.color || '#374151',
                              textAlign: currentPage.content?.styles?.textAlign || 'left',
                            }}
                          />
                        </div>

                        {/* Placed-image drag/resize overlay */}
                        <PageImageOverlay
                          images={currentPage.content?.placedImages || []}
                          onUpdate={(id, updates) => handleUpdatePlacedImage(currentPage.id, id, updates)}
                          onDelete={(id) => handleDeletePlacedImage(currentPage.id, id)}
                          selectedId={selectedImageId}
                          onSelect={(id) => {
                            setSelectedImageId(id);
                            if (id) setRightTab('images');
                          }}
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        {error}
                      </div>
                    )}

                    {/* Editorial tools */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-2.5 uppercase tracking-wide">
                        Editorial Tools
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
                  <div className="flex border-b border-gray-100 bg-gray-50" role="tablist" aria-label="Inspector tabs">
                    {([
                      { id: 'content', label: 'Content', icon: <Layers className="w-3.5 h-3.5" /> },
                      { id: 'images', label: 'Image', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                      { id: 'charts', label: 'Charts', icon: <BarChart2 className="w-3.5 h-3.5" /> },
                    ] as const).map(tab => (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={rightTab === tab.id}
                        aria-controls={`tabpanel-${tab.id}`}
                        id={`tab-${tab.id}`}
                        onClick={() => setRightTab(tab.id)}
                        onKeyDown={e => {
                          const tabs = ['content', 'images', 'charts'] as const;
                          const idx = tabs.indexOf(tab.id);
                          if (e.key === 'ArrowRight') setRightTab(tabs[(idx + 1) % tabs.length]);
                          if (e.key === 'ArrowLeft') setRightTab(tabs[(idx + tabs.length - 1) % tabs.length]);
                        }}
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
                      <div role="tabpanel" id="tabpanel-content" aria-labelledby="tab-content" className="space-y-4">
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
                      <div role="tabpanel" id="tabpanel-images" aria-labelledby="tab-images">
                        <ImagePlacementTab
                          onAddImage={url => handleAddPlacedImage(currentPage.id, url)}
                          selectedImage={
                            selectedImageId
                              ? ((currentPage.content?.placedImages || []) as PlacedImage[]).find(
                                  (img: PlacedImage) => img.id === selectedImageId
                                ) ?? null
                              : null
                          }
                          onUpdateSelected={updates => selectedImageId && handleUpdatePlacedImage(currentPage.id, selectedImageId, updates)}
                          onDeleteSelected={() => selectedImageId && handleDeletePlacedImage(currentPage.id, selectedImageId)}
                          onDeselect={() => setSelectedImageId(null)}
                        />
                      </div>
                    )}
                    {rightTab === 'charts' && currentPage && (
                      <div role="tabpanel" id="tabpanel-charts" aria-labelledby="tab-charts">
                        <ChartPanel
                          charts={currentPage.content?.charts || []}
                          onChange={charts => handlePageChartsChange(currentPage.id, charts)}
                        />
                      </div>
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

              {/* Preflight Quality Check */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    <span>Preflight Check</span>
                    {preflightResult && (
                      <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${preflightResult.exportReady ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {preflightResult.exportReady ? 'Ready' : 'Issues'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={runPreflight}
                    disabled={runningPreflight}
                    aria-label="Run preflight quality check"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {runningPreflight ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : null}
                    {runningPreflight ? 'Checking…' : 'Run Check'}
                  </button>
                </div>
                {preflightResult && (
                  <div className="p-3 space-y-2 text-xs max-h-60 overflow-y-auto">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">Score</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${preflightResult.qualityScore >= 80 ? 'bg-emerald-500' : preflightResult.qualityScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${preflightResult.qualityScore}%` }}
                        />
                      </div>
                      <span className="font-bold text-gray-700">{preflightResult.qualityScore}</span>
                    </div>
                    {preflightResult.errors.map((e: any, i: number) => (
                      <div key={i} className="flex items-start gap-1.5 rounded-lg bg-red-50 px-2 py-1.5 text-red-700">
                        <span className="font-bold mt-0.5">✗</span>
                        <span>{e.message}</span>
                      </div>
                    ))}
                    {preflightResult.warnings.map((w: any, i: number) => (
                      <div key={i} className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-amber-700">
                        <span className="font-bold mt-0.5">!</span>
                        <span>{w.message}</span>
                      </div>
                    ))}
                    {preflightResult.suggestions.slice(0, 3).map((s: any, i: number) => (
                      <div key={i} className="flex items-start gap-1.5 rounded-lg bg-blue-50 px-2 py-1.5 text-blue-700">
                        <span className="font-bold mt-0.5">→</span>
                        <span>{s.message}</span>
                      </div>
                    ))}
                    {preflightResult.errors.length === 0 && preflightResult.warnings.length === 0 && (
                      <p className="text-emerald-600 font-semibold text-center py-1">Document is export-ready!</p>
                    )}
                  </div>
                )}
                {!preflightResult && (
                  <div className="px-3 py-4 text-center text-xs text-gray-400">
                    Run a quality check before exporting to catch issues early.
                  </div>
                )}
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
