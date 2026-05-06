'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
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
  CheckCircle2
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
}

const DOCUMENT_TYPES = {
  pitch_deck: { label: 'Pitch Deck', icon: Rocket, color: 'text-blue-600 bg-blue-100' },
  business_plan: { label: 'Business Plan', icon: Briefcase, color: 'text-purple-600 bg-purple-100' },
  proposal: { label: 'Proposal', icon: FileCheck, color: 'text-green-600 bg-green-100' },
  sales_deck: { label: 'Sales Deck', icon: TrendingUp, color: 'text-orange-600 bg-orange-100' },
  case_study: { label: 'Case Study', icon: FileText, color: 'text-teal-600 bg-teal-100' },
  company_profile: { label: 'Company Profile', icon: Target, color: 'text-gray-700 bg-gray-100' },
  one_pager: { label: 'One Pager', icon: Star, color: 'text-indigo-600 bg-indigo-100' },
  marketing_plan: { label: 'Marketing Plan', icon: BarChart3, color: 'text-pink-600 bg-pink-100' },
  training_presentation: { label: 'Training', icon: Award, color: 'text-lime-600 bg-lime-100' },
  executive_summary: { label: 'Executive Summary', icon: FileText, color: 'text-indigo-600 bg-indigo-100' },
  financial_projection: { label: 'Financial Projection', icon: BarChart3, color: 'text-emerald-600 bg-emerald-100' },
  product_launch: { label: 'Product Launch', icon: Rocket, color: 'text-blue-600 bg-blue-100' },
  strategy_presentation: { label: 'Strategy', icon: Target, color: 'text-violet-600 bg-violet-100' },
  partnership_proposal: { label: 'Partnership', icon: Layers, color: 'text-violet-600 bg-violet-100' },
  internal_report: { label: 'Internal Report', icon: FileText, color: 'text-slate-600 bg-slate-100' },
  board_meeting_deck: { label: 'Board Meeting', icon: Briefcase, color: 'text-red-600 bg-red-100' },
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  generating: 'bg-yellow-100 text-yellow-700',
  generated: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  reviewed: 'bg-purple-100 text-purple-700',
  exported: 'bg-teal-100 text-teal-700',
  failed: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, _hasHydrated } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionError, setActionError] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Wait for Zustand to rehydrate from localStorage before checking auth.
    // Without this guard, isAuthenticated is always false on first render
    // (initial state) and the user gets redirected to /login immediately.
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchProjects();
  }, [_hasHydrated, isAuthenticated, documentTypeFilter, statusFilter]);

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

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (documentTypeFilter !== 'all') params.append('documentType', documentTypeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await api.get(`/projects?${params.toString()}`);
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
    if (!confirm('Are you sure you want to delete this project?')) return;
    setActionError('');
    try {
      await api.delete(`/projects/${projectId}`);
      fetchProjects();
    } catch (error: any) {
      setActionError(error.response?.data?.message || 'Failed to delete project.');
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600" />
          <div className="absolute inset-0 rounded-full border-2 border-violet-200 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-cyan-600 bg-clip-text text-transparent">
                Pitchonix
              </div>
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-100">
                <Sparkles className="h-3 w-3 text-violet-600" />
                <span className="text-xs font-medium text-violet-700">AI-Powered</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/templates">
                <Button
                  variant="outline"
                  className="hidden sm:flex border-violet-200 text-violet-700 hover:bg-violet-50"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Browse Templates
                </Button>
              </Link>
              
              <Button
                onClick={() => handleCreateProject('pitch_deck')}
                className="hidden sm:flex bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 shadow-lg shadow-violet-500/30 transition-all hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
              
              <div className="flex items-center gap-3">
                <span className="hidden md:block text-sm text-slate-600">{user?.email}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600 hover:text-slate-900">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3"
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Welcome back, <span className="bg-gradient-to-r from-violet-600 to-cyan-600 bg-clip-text text-transparent">
              {user?.email?.split('@')[0] || 'Creator'}
            </span>
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed">Create investor-ready business documents with AI</p>
        </motion.div>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-cyan-600 p-8 sm:p-12 shadow-2xl shadow-violet-500/20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
          
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <Sparkles className="h-4 w-4 text-cyan-200" />
                <span className="text-sm font-medium text-white">AI-Powered Platform</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                Create investor-ready business documents
              </h2>
              
              <p className="text-violet-100 text-lg leading-relaxed">
                Generate pitch decks, business plans, proposals, and sales decks with structured workflows and beautiful templates.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => handleCreateProject('pitch_deck')}
                  size="lg"
                  className="bg-white text-violet-700 hover:bg-violet-50 shadow-xl shadow-black/10 transition-all hover:-translate-y-0.5"
                >
                  <Rocket className="h-5 w-5 mr-2" />
                  Create Pitch Deck
                </Button>
                <Button 
                  onClick={() => handleCreateProject('business_plan')}
                  size="lg"
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <Briefcase className="h-5 w-5 mr-2" />
                  Create Business Plan
                </Button>
              </div>
            </div>
            
            <div className="hidden md:block relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400/20 to-violet-400/20 blur-3xl" />
              <div className="relative space-y-4">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                      <Star className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-semibold">Quality Score</div>
                      <div className="text-violet-200 text-sm">AI-Powered Analysis</div>
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-white">92/100</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-5 w-5 text-cyan-200" />
                    <span className="text-white font-semibold">12 Slides</span>
                  </div>
                  <div className="text-violet-200 text-sm">Ready to present</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{totalProjects}</div>
              <div className="text-sm text-slate-600 font-medium">Total Projects</div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{totalDecks}</div>
              <div className="text-sm text-slate-600 font-medium">Decks Generated</div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <Target className="h-5 w-5 text-violet-500" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {avgScore !== null ? `${avgScore}%` : 'N/A'}
              </div>
              <div className="text-sm text-slate-600 font-medium">Average Quality Score</div>
              {avgScore === null && (
                <div className="text-xs text-slate-500 mt-1">Generate a project to see scores</div>
              )}
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Download className="h-6 w-6 text-white" />
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-3xl font-bold text-slate-900 mb-1">{totalExports}</div>
              <div className="text-sm text-slate-600 font-medium">Exports</div>
            </div>
          </div>
        </div>

        {/* Quick Create Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Quick Create</h3>
            <Link href="/create" className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
              View All 16 Types <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => handleCreateProject('pitch_deck')}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                  <Rocket className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Pitch Deck</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Investor-ready presentations with structured slides
                  </p>
                </div>
                <div className="flex items-center text-violet-600 font-medium text-sm">
                  Create now <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => handleCreateProject('business_plan')}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                  <Briefcase className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Business Plan</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Comprehensive business strategy documents
                  </p>
                </div>
                <div className="flex items-center text-purple-600 font-medium text-sm">
                  Create now <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => handleCreateProject('proposal')}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                  <FileCheck className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Proposal</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Professional project and service proposals
                  </p>
                </div>
                <div className="flex items-center text-emerald-600 font-medium text-sm">
                  Create now <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => handleCreateProject('sales_deck')}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Sales Deck</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Persuasive sales and marketing presentations
                  </p>
                </div>
                <div className="flex items-center text-orange-600 font-medium text-sm">
                  Create now <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => handleCreateProject('case_study')}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Case Study</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Customer success stories
                  </p>
                </div>
                <div className="flex items-center text-teal-600 font-medium text-sm">
                  Create now <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => handleCreateProject('company_profile')}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gray-600/10 to-gray-800/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg shadow-gray-500/30 group-hover:scale-110 transition-transform">
                  <Target className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Company Profile</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Showcase capabilities
                  </p>
                </div>
                <div className="flex items-center text-gray-700 font-medium text-sm">
                  Create now <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => handleCreateProject('one_pager')}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                  <Star className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">One Pager</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Single-page overview
                  </p>
                </div>
                <div className="flex items-center text-indigo-600 font-medium text-sm">
                  Create now <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => handleCreateProject('marketing_plan')}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Marketing Plan</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Strategic marketing roadmap
                  </p>
                </div>
                <div className="flex items-center text-pink-600 font-medium text-sm">
                  Create now <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                statusFilter === 'all'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                statusFilter === 'draft'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300'
              }`}
            >
              Draft
            </button>
            <button
              onClick={() => setStatusFilter('generated')}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                statusFilter === 'generated'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300'
              }`}
            >
              Generated
            </button>
            <button
              onClick={() => setStatusFilter('exported')}
              className={`hidden sm:block px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                statusFilter === 'exported'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300'
              }`}
            >
              Exported
            </button>
          </div>
        </div>

        {/* Action Error */}
        {actionError && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-red-600 text-sm font-bold">!</span>
            </div>
            <div className="flex-1">
              <p className="text-red-800 font-medium">{actionError}</p>
            </div>
            <button 
              onClick={() => setActionError('')} 
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <span className="text-xl leading-none">&times;</span>
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
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">Your Projects</h3>
            {Array.isArray(projects) && projects.length > 0 && (
              <span className="text-sm text-slate-600 font-medium">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {loading ? (
            <DashboardSkeleton />
          ) : !Array.isArray(projects) || projects.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={
                searchQuery || documentTypeFilter !== 'all' || statusFilter !== 'all'
                  ? 'No projects found'
                  : 'No projects yet'
              }
              description={
                searchQuery || documentTypeFilter !== 'all' || statusFilter !== 'all'
                  ? "Try adjusting your search or filters to find what you're looking for"
                  : 'Create your first investor-ready deck and start building beautiful presentations'
              }
              action={
                <Button 
                  onClick={() => handleCreateProject('pitch_deck')}
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 shadow-lg shadow-violet-500/30"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Project
                </Button>
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
              {projects.map((project, index) => {
                const docType = DOCUMENT_TYPES[project.documentType as keyof typeof DOCUMENT_TYPES];
                const Icon = docType?.icon || FileText;
                const gradientColors: Record<string, string> = {
                  pitch_deck: 'from-blue-500 to-violet-600',
                  business_plan: 'from-purple-500 to-pink-600',
                  proposal: 'from-emerald-500 to-cyan-600',
                  sales_deck: 'from-orange-500 to-amber-600',
                };

                return (
                  <motion.div
                    key={project.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 }
                    }}
                    className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientColors[project.documentType] || 'from-slate-500 to-slate-600'} flex items-center justify-center shadow-lg`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(project.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(project.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div>
                        <h4 className="font-bold tracking-tight text-slate-900 mb-1 line-clamp-1">{project.name}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                          {project.description || 'No description'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          STATUS_COLORS[project.status] || 'bg-slate-100 text-slate-700'
                        }`}>
                          {project.status}
                        </span>
                        {project.qualityScore && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <Star className="h-3 w-3 fill-emerald-600" />
                            {project.qualityScore}/100
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                        <div className="flex items-center gap-4 text-xs text-slate-600">
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

                      <div className="flex gap-2 pt-2">
                        <Link href={`/projects/${project.id}`} className="flex-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full rounded-xl border-slate-200/60 hover:border-violet-300 hover:bg-violet-50"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                        {project.decks.length > 0 && (
                          <Link href={`/editor/${project.decks[0].id}`} className="flex-1">
                            <Button 
                              size="sm" 
                              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 shadow-lg shadow-violet-500/20"
                            >
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
      </div>
    </div>
  );
}
