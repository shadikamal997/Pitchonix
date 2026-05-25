'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKeyboardShortcuts, getAppShortcuts, KeyboardShortcutsHelp } from '@/hooks/useKeyboardShortcuts';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import NotificationBell from '@/components/NotificationBell';
// Phase 39.1A — workspace switcher
import { WorkspaceSwitcher } from '@/features/workspaces/WorkspaceSwitcher';
import { CreateWorkspaceModal } from '@/features/workspaces/CreateWorkspaceModal';
import { useMyWorkspaces } from '@/features/workspaces/useWorkspaces';
import {
  Plus,
  FileText,
  LogOut,
  Sparkles,
  Search,
  Filter,
  MoreVertical,
  Copy,
  Trash2,
  Edit,
  Rocket,
  Briefcase,
  FileCheck,
  BarChart3,
  Calendar,
  TrendingUp,
  Zap,
  Target,
  Award,
  Download,
  ArrowRight,
  Eye,
  Layers,
  Star,
  CheckCircle2,
  Archive,
  ArchiveRestore,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Project {
  id: string;
  name: string;
  description?: string;
  documentType: string;
  status: string;
  qualityScore?: number;
  lastEditedAt: string;
  createdAt: string;
  decks: any[];
  archivedAt?: string | null;
}

const DOCUMENT_TYPES = {
  pitch_deck: { label: 'Pitch Deck', icon: Rocket, color: 'text-[#4F7563] bg-[#DDE8E1]' },
  business_plan: { label: 'Business Plan', icon: Briefcase, color: 'text-[#4F7563] bg-[#DDE8E1]' },
  proposal: { label: 'Proposal', icon: FileCheck, color: 'text-[#4F7563] bg-[#DDE8E1]' },
  sales_deck: { label: 'Sales Deck', icon: TrendingUp, color: 'text-[#8c6210] bg-[#F5E1B7]' },
  case_study: { label: 'Case Study', icon: FileText, color: 'text-[#4F7563] bg-[#DDE8E1]' },
  company_profile: { label: 'Company Profile', icon: Target, color: 'text-[#111111] bg-[#F1F0EC]' },
  one_pager: { label: 'One Pager', icon: Star, color: 'text-[#355846] bg-[#DDE8E1]' },
  marketing_plan: { label: 'Marketing Plan', icon: BarChart3, color: 'text-[#9a3737] bg-[#F7E3E3]' },
  training_presentation: { label: 'Training', icon: Award, color: 'text-[#4F7563] bg-[#DDE8E1]' },
  executive_summary: { label: 'Executive Summary', icon: FileText, color: 'text-[#355846] bg-[#DDE8E1]' },
  financial_projection: { label: 'Financial Projection', icon: BarChart3, color: 'text-[#4F7563] bg-[#DDE8E1]' },
  product_launch: { label: 'Product Launch', icon: Rocket, color: 'text-[#4F7563] bg-[#DDE8E1]' },
  strategy_presentation: { label: 'Strategy', icon: Target, color: 'text-[#4F7563] bg-[#DDE8E1]' },
  partnership_proposal: { label: 'Partnership', icon: Layers, color: 'text-[#4F7563] bg-[#DDE8E1]' },
  internal_report: { label: 'Internal Report', icon: FileText, color: 'text-[#6B6B6B] bg-[#F1F0EC]' },
  board_meeting_deck: { label: 'Board Meeting', icon: Briefcase, color: 'text-[#9a3737] bg-[#F7E3E3]' },
};

const STATUS_COLORS: Record<string, string> = {
  draft:      'bg-[#F1F0EC] text-[#6B6B6B]',
  generating: 'bg-[#FAEEDB] text-[#8c6210]',
  generated:  'bg-[#EEF5F1] text-[#4F7563]',
  completed:  'bg-[#E6F0EA] text-[#355846]',
  reviewed:   'bg-[#EEF5F1] text-[#4F7563]',
  exported:   'bg-[#DDE8E1] text-[#263F34]',
  failed:     'bg-[#F7E3E3] text-[#9a3737]',
};

export default function DashboardPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { user, isAuthenticated, logout, _hasHydrated } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionError, setActionError] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phase 39.1A — workspace switcher mount + create-modal state
  const workspaces = useMyWorkspaces();
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);

  const shortcuts = useMemo(
    () => getAppShortcuts(router, { onShowShortcuts: () => setShowShortcuts(true) }),
    [router]
  );
  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchProjects();
    fetchActivities();
    setSelectedIds(new Set());
  }, [_hasHydrated, isAuthenticated, documentTypeFilter, statusFilter, showArchived]);

  // Debounced search — wait 300 ms after typing stops before hitting the API
  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchProjects();
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const fetchActivities = async () => {
    try {
      const res = await api.get('/activity?limit=5');
      setActivities(res.data);
    } catch (_) {}
  };

  const fetchProjects = async () => {
    try {
      let url: string;
      if (showArchived) {
        url = '/projects/archived';
      } else {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (documentTypeFilter !== 'all') params.append('documentType', documentTypeFilter);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        url = `/projects?${params.toString()}`;
      }

      const response = await api.get(url);
      const projectsData = response.data.data || response.data;
      // Ensure projectsData is always an array
      const projectsArray = Array.isArray(projectsData) ? projectsData : [];
      setProjects(projectsArray);
    } catch (error: any) {
      setActionError(error.response?.data?.message || 'Failed to load projects. Please refresh.');
      setProjects([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (projectId: string) => {
    setActionError('');
    try {
      await api.post(`/projects/${projectId}/duplicate`);
      fetchProjects();
    } catch (error: any) {
      setActionError(error.response?.data?.message || 'Failed to duplicate project.');
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!(await confirm({ title: 'Delete project?', message: 'This action cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    setActionError('');
    try {
      await api.delete(`/projects/${projectId}`);
      fetchProjects();
    } catch (error: any) {
      setActionError(error.response?.data?.message || 'Failed to delete project.');
    }
  };

  const handleArchive = async (projectId: string) => {
    try {
      await api.post(`/projects/${projectId}/archive`);
      fetchProjects();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to archive project.');
    }
  };

  const handleRestore = async (projectId: string) => {
    try {
      await api.post(`/projects/${projectId}/restore`);
      fetchProjects();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to restore project.');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === projects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projects.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!(await confirm({ title: 'Delete projects?', message: `Delete ${selectedIds.size} project(s)? This cannot be undone.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    setBulkLoading(true);
    try {
      await api.post('/projects/bulk/delete', { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      fetchProjects();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Bulk delete failed.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkArchive = async () => {
    setBulkLoading(true);
    try {
      await api.post('/projects/bulk/archive', { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      fetchProjects();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Bulk archive failed.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleCreateProject = async (documentType: string) => {
    setActionError('');
    try {
      const response = await api.post('/projects', {
        name: `New ${DOCUMENT_TYPES[documentType as keyof typeof DOCUMENT_TYPES]?.label || 'Project'}`,
        documentType,
        description: '',
      });
      router.push(`/create?project=${response.data.id}`);
    } catch (error: any) {
      setActionError(error.response?.data?.message || 'Failed to create project. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate stats
  const totalProjects = projects.length;
  const totalDecks = projects.reduce((sum, p) => sum + p.decks.length, 0);
  
  // Calculate average quality score - only for projects that have scores
  const projectsWithScores = projects.filter(p => p.qualityScore !== null && p.qualityScore !== undefined);
  const avgScore = projectsWithScores.length > 0
    ? Math.round(projectsWithScores.reduce((sum, p) => sum + (p.qualityScore || 0), 0) / projectsWithScores.length)
    : null;
  
  const totalExports = projects.filter(p => p.status === 'exported').length;

  // Show nothing while Zustand is rehydrating to avoid flash of unauthenticated state
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-[#EDEBE6] flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4F7563]" />
          <div className="absolute inset-0 rounded-full border-2 border-[#DDE8E1] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#EDEBE6]">
      {/* Phase 39.1A — sticky workspace context bar */}
      <div className="bg-[#EDEBE6]/85 backdrop-blur-md border-b border-[#E3E1DA]/60 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-3">
          <WorkspaceSwitcher
            settingsHref={(id) => `/workspaces/${id}/settings`}
            onCreate={() => setCreateWorkspaceOpen(true)}
          />
          <span className="text-[10px] uppercase tracking-wide text-[#9A9A9A] font-semibold">Workspace</span>
          <div className="ml-auto" />
        </div>
      </div>
      <CreateWorkspaceModal
        open={createWorkspaceOpen}
        onClose={() => setCreateWorkspaceOpen(false)}
        onCreate={async (input) => { await workspaces.create(input); }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3"
        >
          <h1 className="text-3xl sm:text-[34px] font-bold tracking-[-0.03em] text-[#111111] leading-[1.1]">
            Welcome back, <span className="text-[#4F7563]">{user?.email?.split('@')[0] || 'Creator'}</span>
          </h1>
          <p className="text-[#6B6B6B] text-base leading-relaxed">Create investor-ready business documents with AI</p>
        </motion.div>

        {/* Hero Section — premium sage card */}
        <div className="relative overflow-hidden rounded-[28px] bg-[#263F34] p-7 sm:p-10 shadow-[0_24px_60px_rgba(38,63,52,0.30)]">
          <div className="absolute inset-0 opacity-25 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#4F7563] blur-3xl" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-[#7A988A] blur-3xl" />
          </div>

          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15">
                <Sparkles className="w-3.5 h-3.5 text-[#DDE8E1]" />
                <span className="text-[11px] font-semibold tracking-wide uppercase text-[#DDE8E1]">AI-powered platform</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-white leading-tight">
                Create investor-ready business documents
              </h2>

              <p className="text-[#DDE8E1] text-sm leading-relaxed max-w-md">
                Generate pitch decks, business plans, proposals, and sales decks with structured workflows and beautiful templates.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  onClick={() => handleCreateProject('pitch_deck')}
                  className="bg-white text-[#263F34] hover:bg-[#F7F6F2] shadow-[0_12px_24px_rgba(0,0,0,0.15)]"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Create Pitch Deck
                </Button>
                <Button
                  onClick={() => handleCreateProject('business_plan')}
                  variant="outline"
                  className="bg-white/10 border-white/25 text-white hover:bg-white/15 backdrop-blur-sm"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Create Business Plan
                </Button>
              </div>
            </div>

            <div className="hidden md:block relative">
              <div className="relative space-y-4">
                <div className="bg-white/8 backdrop-blur-md border border-white/15 rounded-3xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.20)] transform rotate-2 hover:rotate-0 transition-transform">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#4F7563] flex items-center justify-center shadow-[0_10px_22px_rgba(79,117,99,0.4)]">
                      <Star className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">Quality Score</div>
                      <div className="text-[#A8B9AE] text-xs">AI-Powered Analysis</div>
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-white tracking-tight">
                    {avgScore !== null ? `${avgScore}/100` : '—/100'}
                  </div>
                </div>

                <div className="bg-white/8 backdrop-blur-md border border-white/15 rounded-3xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.20)] transform -rotate-2 hover:rotate-0 transition-transform">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="h-5 w-5 text-[#DDE8E1]" />
                    <span className="text-white font-semibold text-sm">Deck Builder</span>
                  </div>
                  <div className="text-[#A8B9AE] text-xs">Ready to present</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section — Phase Δ MetricCards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Projects',         value: totalProjects, icon: Layers },
            { label: 'Decks Generated',        value: totalDecks,    icon: FileText },
            { label: 'Avg. Quality',           value: avgScore !== null ? `${avgScore}%` : '—', icon: Award, hint: avgScore === null ? 'Generate to see' : undefined },
            { label: 'Exports',                value: totalExports,  icon: Download },
          ].map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div key={stat.label} className="pn-card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="pn-label uppercase">{stat.label}</span>
                  <div className="pn-icon-circle" style={{ width: 36, height: 36 }}>
                    <StatIcon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="pn-metric">{stat.value}</div>
                  {stat.hint && <div className="text-[11px] text-[#9A9A9A] mt-0.5">{stat.hint}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Create Section — Phase Δ soft cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="pn-h2">Quick Create</h3>
            <Link href="/create" className="text-sm text-[#4F7563] hover:text-[#355846] font-semibold flex items-center gap-1">
              View All 16 Types <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { type: 'pitch_deck',      label: 'Pitch Deck',       desc: 'Investor-ready presentations with structured slides', icon: Rocket },
              { type: 'business_plan',   label: 'Business Plan',    desc: 'Comprehensive business strategy documents',           icon: Briefcase },
              { type: 'proposal',        label: 'Proposal',         desc: 'Professional project and service proposals',          icon: FileCheck },
              { type: 'sales_deck',      label: 'Sales Deck',       desc: 'Persuasive sales and marketing presentations',        icon: TrendingUp },
              { type: 'case_study',      label: 'Case Study',       desc: 'Customer success stories',                            icon: FileText },
              { type: 'company_profile', label: 'Company Profile',  desc: 'Showcase capabilities',                               icon: Target },
              { type: 'one_pager',       label: 'One Pager',        desc: 'Single-page overview',                                icon: Star },
              { type: 'marketing_plan',  label: 'Marketing Plan',   desc: 'Strategic marketing roadmap',                         icon: BarChart3 },
            ].map((it) => {
              const ItemIcon = it.icon;
              return (
                <button
                  key={it.type}
                  onClick={() => handleCreateProject(it.type)}
                  className="group pn-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lifted"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center group-hover:bg-[#DDE8E1] transition-colors">
                      <ItemIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[#111111] mb-1 text-[14.5px]">{it.label}</h4>
                      <p className="text-[12.5px] text-[#6B6B6B] leading-relaxed line-clamp-2">{it.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-[#4F7563] font-semibold text-[12px] mt-4">
                    Create now <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search and Filters — Phase Δ pill style */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9A9A9A]" />
            <input
              type="text"
              placeholder="Search projects…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 h-12 bg-white border border-transparent rounded-full text-sm text-[#111111] placeholder:text-[#9A9A9A] shadow-[0_12px_30px_rgba(0,0,0,0.05)] focus:outline-none focus:border-[#4F7563]/30 focus:shadow-[0_12px_30px_rgba(0,0,0,0.05),0_0_0_3px_rgba(79,117,99,0.12)] transition-all"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all',       label: 'All' },
              { id: 'draft',     label: 'Draft' },
              { id: 'generated', label: 'Generated' },
              { id: 'exported',  label: 'Exported',  hideOnMobile: true },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id)}
                className={`${chip.hideOnMobile ? 'hidden sm:inline-flex' : 'inline-flex'} items-center px-4 h-10 rounded-full text-[13px] font-semibold transition-all ${
                  statusFilter === chip.id
                    ? 'bg-[#111114] text-white shadow-[0_12px_22px_rgba(0,0,0,0.18)]'
                    : 'bg-white text-[#111111] border border-[#E3E1DA] hover:bg-[#F7F6F2]'
                }`}
              >
                {chip.label}
              </button>
            ))}
            <button
              onClick={() => { setShowArchived(v => !v); setStatusFilter('all'); }}
              className={`inline-flex items-center gap-1.5 px-4 h-10 rounded-full text-[13px] font-semibold transition-all ${
                showArchived
                  ? 'bg-[#D9A441] text-white shadow-[0_12px_22px_rgba(217,164,65,0.30)]'
                  : 'bg-white text-[#111111] border border-[#E3E1DA] hover:bg-[#F7F6F2]'
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              Archived
            </button>
          </div>
        </div>

        {/* Action Error — Phase Δ soft red */}
        {actionError && (
          <div className="rounded-3xl bg-[#FCF1F1] border border-[#F7E3E3] p-4 flex items-start gap-3" role="alert">
            <div className="w-9 h-9 rounded-full bg-[#F7E3E3] flex items-center justify-center flex-shrink-0">
              <span className="text-[#9a3737] text-sm font-bold">!</span>
            </div>
            <div className="flex-1 pt-1.5">
              <p className="text-[#9a3737] text-sm font-medium">{actionError}</p>
            </div>
            <button
              onClick={() => setActionError('')}
              aria-label="Dismiss"
              className="w-8 h-8 rounded-full text-[#9a3737] hover:bg-[#F7E3E3] flex items-center justify-center transition-colors"
            >
              <span className="text-lg leading-none">&times;</span>
            </button>
          </div>
        )}

        {/* Projects Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="pn-h2">
                {showArchived ? 'Archived Projects' : 'Your Projects'}
              </h3>
              {Array.isArray(projects) && projects.length > 0 && (
                <span className="text-sm text-[#6B6B6B] font-medium">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            {Array.isArray(projects) && projects.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#4F7563] transition-colors"
              >
                {selectedIds.size === projects.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {selectedIds.size === projects.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>

          {/* Bulk action toolbar — Phase Δ */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-[#EEF5F1] border border-[#DDE8E1] rounded-2xl px-4 py-3">
              <span className="text-sm font-semibold text-[#355846]">{selectedIds.size} selected</span>
              <div className="flex-1" />
              {!showArchived && (
                <button
                  onClick={handleBulkArchive}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-[#FAEEDB] text-[#8c6210] text-sm font-semibold hover:bg-[#F5E1B7] transition-colors disabled:opacity-50"
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                disabled={bulkLoading}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-[#F7E3E3] text-[#9a3737] text-sm font-semibold hover:bg-[#F1D2D2] transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-[#6B6B6B] hover:text-[#111111]"
              >
                Cancel
              </button>
            </div>
          )}

          {loading ? (
            <DashboardSkeleton />
          ) : !Array.isArray(projects) || projects.length === 0 ? (
            <EmptyState
              icon={showArchived ? Archive : FileText}
              title={
                showArchived
                  ? 'No archived projects'
                  : searchQuery || documentTypeFilter !== 'all' || statusFilter !== 'all'
                  ? 'No projects found'
                  : 'No projects yet'
              }
              description={
                showArchived
                  ? 'Projects you archive will appear here. You can restore them at any time.'
                  : searchQuery || documentTypeFilter !== 'all' || statusFilter !== 'all'
                  ? "Try adjusting your search or filters to find what you're looking for"
                  : 'Create your first investor-ready deck and start building beautiful presentations'
              }
              action={
                !showArchived ? (
                  <Button
                    onClick={() => handleCreateProject('pitch_deck')}
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Project
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {projects.map((project) => {
                const docType = DOCUMENT_TYPES[project.documentType as keyof typeof DOCUMENT_TYPES];
                const Icon = docType?.icon || FileText;
                const isSelected = selectedIds.has(project.id);
                return (
                  <motion.div
                    key={project.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show:   { opacity: 1, y: 0 },
                    }}
                    className={`group relative pn-card transition-all hover:-translate-y-0.5 hover:shadow-lifted ${
                      isSelected ? 'ring-2 ring-[#4F7563]/40 border-[#4F7563]/40' : ''
                    }`}
                  >
                    {/* Checkbox — always visible when selected */}
                    <button
                      onClick={() => toggleSelect(project.id)}
                      className={`absolute top-3 left-3 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      aria-label={isSelected ? 'Deselect' : 'Select'}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-[#4F7563]" />
                      ) : (
                        <Square className="h-5 w-5 text-[#9A9A9A]" />
                      )}
                    </button>

                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center">
                          <Icon className="h-5 w-5" />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl">
                            {!showArchived && (
                              <>
                                <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(project.id)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleArchive(project.id)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              </>
                            )}
                            {showArchived && (
                              <DropdownMenuItem onClick={() => handleRestore(project.id)}>
                                <ArchiveRestore className="h-4 w-4 mr-2" />
                                Restore
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(project.id)}
                              className="text-[#9a3737]"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div>
                        <h4 className="font-semibold text-[#111111] mb-1 line-clamp-1 text-[15px]">{project.name}</h4>
                        <p className="text-[13px] text-[#6B6B6B] leading-relaxed line-clamp-2">
                          {project.description || 'No description'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${STATUS_COLORS[project.status] || 'bg-[#F1F0EC] text-[#6B6B6B]'}`}>
                          {project.status}
                        </span>
                        {project.qualityScore && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E6F0EA] text-[#355846] flex items-center gap-1">
                            <Star className="h-3 w-3 fill-[#4F7563] text-[#4F7563]" />
                            {project.qualityScore}/100
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#F1F0EC]">
                        <div className="flex items-center gap-3 text-[11px] text-[#9A9A9A]">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(project.lastEditedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {project.decks.length}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Link href={`/projects/${project.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                        {project.decks.length > 0 && (
                          <Link href={`/editor/${project.decks[0].id}`} className="flex-1">
                            <Button size="sm" className="w-full">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        {/* Activity Feed */}
        {activities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h2 className="pn-h2 mb-3">Recent Activity</h2>
            <div className="pn-card divide-y divide-[#F1F0EC] overflow-hidden">
              {activities.map((activity: any) => (
                <div key={activity.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="w-2 h-2 rounded-full bg-[#4F7563] mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111111]">{activity.title}</p>
                    {activity.description && (
                      <p className="text-xs text-[#6B6B6B] mt-0.5">{activity.description}</p>
                    )}
                  </div>
                  <p className="text-xs text-[#9A9A9A] flex-shrink-0 mt-0.5">
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <KeyboardShortcutsHelp
        shortcuts={shortcuts}
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}
