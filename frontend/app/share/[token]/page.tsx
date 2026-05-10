'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { FileText, Eye } from 'lucide-react';

interface SharedProject {
  id: string;
  name: string;
  description: string | null;
  type: string;
  viewCount: number;
  owner: { name: string | null; email: string };
}

export default function SharedProjectPage() {
  const params = useParams();
  const token = params.token as string;

  const [project, setProject] = useState<SharedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get(`/share/${token}`)
      .then(({ data }) => setProject(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Link not found</h1>
        <p className="text-sm text-gray-500">This share link may have been revoked or never existed.</p>
        <a href="/" className="mt-2 text-sm text-violet-600 hover:underline">Go to Pitchonix</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-gray-900">Pitchonix</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Eye className="w-4 h-4" />
          <span>{project.viewCount} {project.viewCount === 1 ? 'view' : 'views'}</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Project header */}
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                {project.description && (
                  <p className="text-gray-500 mt-1 text-sm">{project.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Shared by {project.owner.name || project.owner.email}
                </p>
              </div>
            </div>
          </div>

          {/* Placeholder — actual slides/pages would render here based on project.type */}
          <div className="p-12 flex flex-col items-center justify-center text-center bg-gray-50">
            <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {project.type === 'pdf' ? 'PDF Document' : 'Presentation'}
            </h2>
            <p className="text-sm text-gray-500 max-w-sm">
              The full document viewer is available when you sign in to Pitchonix. This shared link lets collaborators view the project details and metadata.
            </p>
            <a
              href="/login"
              className="mt-6 inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-900 transition-colors"
            >
              Sign in to view
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
