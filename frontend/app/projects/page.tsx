'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { Search, FileText, Trash2, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Phase 39.1A — workspace switcher
import { WorkspaceSwitcher } from '@/features/workspaces/WorkspaceSwitcher';
import { CreateWorkspaceModal } from '@/features/workspaces/CreateWorkspaceModal';
import { useMyWorkspaces } from '@/features/workspaces/useWorkspaces';

export default function ProjectsPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
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
    if (!user) {
      router.push('/login');
      return;
    }
    // Phase Audit Fix — auto-debounce search (250ms) so users don't need to
    // press Enter. Mirrors the dashboard's UX.
    const t = setTimeout(() => fetchProjects(search, filter), 250);
    return () => clearTimeout(t);
  }, [_hasHydrated, user, router, fetchProjects, search, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (value: string) => {
    setFilter(value);
    fetchProjects(search, value);
  };

  const handleSearch = () => fetchProjects(search, filter);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
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
      {/* Phase 39.1A — sticky workspace context bar */}
      <ProjectsWorkspaceBar />
      <main className="p-8 bg-gray-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Projects</h1>
          <Button onClick={() => router.push('/create')}>
            + New Project
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <select
            className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
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
          <div className="text-center py-12">
            <div className="animate-pulse">Loading projects...</div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No projects found</p>
            <Button onClick={() => router.push('/create')}>
              Create Your First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: any) => (
              <div
                key={project.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">
                    {project.name}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    project.status === 'exported' ? 'bg-green-100 text-green-700' :
                    project.status === 'generated' ? 'bg-blue-100 text-blue-700' :
                    project.status === 'reviewed' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{project.documentType?.replace(/_/g, ' ')}</p>
                {project.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/create?project=${project.id}`)}
                  >
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(project.id)}
                  >
                    <Trash2 className="h-3 w-3" />
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

// Phase 39.1A — small subcomponent so the hook + modal state live alongside.
function ProjectsWorkspaceBar() {
  const workspaces = useMyWorkspaces();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-3">
          <WorkspaceSwitcher
            settingsHref={(id) => `/workspaces/${id}/settings`}
            onCreate={() => setOpen(true)}
          />
          <span className="text-[10px] uppercase tracking-wide text-slate-400 font-mono">Workspace</span>
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
