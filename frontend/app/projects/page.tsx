'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { Search, FileText, Trash2, Edit, Eye, Plus, MoreVertical, Calendar, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ConfirmDialog';
// Phase 39.1A — workspace switcher
import { WorkspaceSwitcher } from '@/features/workspaces/WorkspaceSwitcher';
import { CreateWorkspaceModal } from '@/features/workspaces/CreateWorkspaceModal';
import { useMyWorkspaces } from '@/features/workspaces/useWorkspaces';
import { EmptyState } from '@/components/ui/empty-state';

const STATUS_TINT: Record<string, string> = {
  exported:  'bg-[#DDE8E1] text-[#263F34]',
  generated: 'bg-[#EEF5F1] text-[#4F7563]',
  reviewed:  'bg-[#EEF5F1] text-[#4F7563]',
  draft:     'bg-[#F1F0EC] text-[#6B6B6B]',
  failed:    'bg-[#F7E3E3] text-[#9a3737]',
};

export default function ProjectsPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const confirm = useConfirm();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchProjects = useCallback(async (searchVal: string, filterVal: string) => {
    try {
      const { data } = await api.get('/projects', {
        params: { search: searchVal || undefined, status: filterVal !== 'all' ? filterVal : undefined },
      });
      setProjects(Array.isArray(data) ? data : (data?.projects || []));
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) { router.push('/login'); return; }
    const t = setTimeout(() => fetchProjects(search, filter), 250);
    return () => clearTimeout(t);
  }, [_hasHydrated, user, router, fetchProjects, search, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (value: string) => {
    setFilter(value);
    fetchProjects(search, value);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete project?', message: 'This action cannot be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await api.delete(`/projects/${id}`);
      fetchProjects(search, filter);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  if (!_hasHydrated || !user) return null;

  return (
    <>
      {/* Workspace context bar */}
      <ProjectsWorkspaceBar />

      <main className="bg-[#EDEBE6] min-h-full p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="pn-h1">All Projects</h1>
              <p className="pn-body text-[#6B6B6B] mt-1">Manage every deck, document, and draft in this workspace.</p>
            </div>
            <Button onClick={() => router.push('/create')}>
              <Plus className="w-4 h-4 mr-2" /> New Project
            </Button>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9A9A9A]" />
              <input
                type="text"
                placeholder="Search projects…"
                className="w-full pl-12 pr-4 h-12 bg-white border border-transparent rounded-full text-sm text-[#111111] placeholder:text-[#9A9A9A] shadow-[0_12px_30px_rgba(0,0,0,0.05)] focus:outline-none focus:border-[#4F7563]/30 focus:shadow-[0_12px_30px_rgba(0,0,0,0.05),0_0_0_3px_rgba(79,117,99,0.12)] transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-12 px-5 bg-white border border-[#E3E1DA] rounded-full text-sm text-[#111111] focus:outline-none focus:border-[#4F7563] focus:shadow-[0_0_0_3px_rgba(79,117,99,0.15)] transition-all min-w-[160px]"
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="generated">Generated</option>
              <option value="reviewed">Reviewed</option>
              <option value="exported">Exported</option>
            </select>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="pn-card p-6 space-y-4">
                  <div className="pn-skeleton h-6 w-3/4" />
                  <div className="pn-skeleton h-4 w-1/2" />
                  <div className="pn-skeleton h-16 w-full" />
                  <div className="pn-skeleton h-9 w-full" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No projects found"
              description="Start a new pitch deck, business plan, or any of 16 document types."
              action={
                <Button onClick={() => router.push('/create')}>
                  <Plus className="h-4 w-4 mr-2" /> Create Your First Project
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project: any) => (
                <div
                  key={project.id}
                  className="group pn-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lifted"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${STATUS_TINT[project.status] || 'bg-[#F1F0EC] text-[#6B6B6B]'}`}>
                      {project.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[15px] text-[#111111] line-clamp-1 mb-1">
                    {project.name}
                  </h3>
                  <p className="text-[12.5px] text-[#9A9A9A] mb-3 capitalize">{project.documentType?.replace(/_/g, ' ')}</p>
                  {project.description && (
                    <p className="text-[13px] text-[#6B6B6B] mb-4 line-clamp-2 leading-relaxed">{project.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-[#9A9A9A] pt-3 border-t border-[#F1F0EC] mb-4">
                    {project.lastEditedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(project.lastEditedAt).toLocaleDateString()}
                      </span>
                    )}
                    {project.decks?.length !== undefined && (
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {project.decks?.length || 0}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => router.push(`/projects/${project.id}`)} className="flex-1">
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/create?project=${project.id}`)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(project.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-[#9a3737]" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function ProjectsWorkspaceBar() {
  const workspaces = useMyWorkspaces();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="bg-[#EDEBE6]/85 backdrop-blur-md border-b border-[#E3E1DA]/60 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-3">
          <WorkspaceSwitcher
            settingsHref={(id) => `/workspaces/${id}/settings`}
            onCreate={() => setOpen(true)}
          />
          <span className="text-[10px] uppercase tracking-wide text-[#9A9A9A] font-semibold">Workspace</span>
        </div>
      </div>
      <CreateWorkspaceModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={async (input) => { await workspaces.create(input); }}
      />
    </>
  );
}
