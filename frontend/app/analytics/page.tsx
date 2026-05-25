'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { Eye, Download, Share2, TrendingUp } from 'lucide-react';

interface ProjectAnalytics {
  id: string;
  name: string;
  viewCount: number;
  exportCount: number;
  publicToken: string | null;
  createdAt: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [projects, setProjects] = useState<ProjectAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) { router.push('/login'); return; }
    fetchAnalytics();
  }, [_hasHydrated, user]);

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get('/projects?limit=100');
      const list = Array.isArray(data) ? data : (data.data ?? []);
      setProjects(list);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const totalViews = projects.reduce((s, p) => s + (p.viewCount ?? 0), 0);
  const totalExports = projects.reduce((s, p) => s + (p.exportCount ?? 0), 0);
  const sharedCount = projects.filter(p => p.publicToken).length;

  const topByViews = [...projects]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10);

  const trendData = projects
    .map(p => ({
      name: p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name,
      Views: p.viewCount ?? 0,
      Exports: p.exportCount ?? 0,
    }))
    .slice(0, 10);

  if (!_hasHydrated || !user) return null;

  return (
    <div className="min-h-full bg-[#EDEBE6] p-8">
      <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-[#111111]">Analytics</h1>
          <p className="text-[#9A9A9A] mb-8 text-sm">Document views, exports, and share link activity across all your projects.</p>

          {loading ? (
            <div className="flex items-center justify-center py-32 text-[#C9C6BD]">Loading analytics…</div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard icon={<Eye className="h-5 w-5 text-[#4F7563]" />} label="Total Views" value={totalViews} />
                <StatCard icon={<Download className="h-5 w-5 text-[#4F7563]" />} label="Total Exports" value={totalExports} />
                <StatCard icon={<Share2 className="h-5 w-5 text-[#4F7563]" />} label="Public Share Links" value={sharedCount} />
              </div>

              {/* Bar chart — views per project */}
              <div className="bg-white rounded-xl border border-[#E3E1DA] p-6 mb-6">
                <h2 className="text-base font-semibold text-[#111111] mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#4F7563]" />
                  Views &amp; Exports by Project (top 10)
                </h2>
                {trendData.length === 0 ? (
                  <p className="text-sm text-[#C9C6BD]">No data yet. Share your projects to start collecting analytics.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Views" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Exports" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Table — top projects by views */}
              <div className="bg-white rounded-xl border border-[#E3E1DA] p-6">
                <h2 className="text-base font-semibold text-[#111111] mb-4">Top Projects by Views</h2>
                {topByViews.length === 0 ? (
                  <p className="text-sm text-[#C9C6BD]">No projects yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[#9A9A9A] border-b border-[#F1F0EC]">
                          <th className="pb-3 font-medium">Project</th>
                          <th className="pb-3 font-medium text-right">Views</th>
                          <th className="pb-3 font-medium text-right">Exports</th>
                          <th className="pb-3 font-medium text-right">Share link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topByViews.map((p) => (
                          <tr key={p.id} className="border-b border-gray-50 hover:bg-[#EDEBE6] transition-colors">
                            <td className="py-3 text-[#111111] font-medium">{p.name}</td>
                            <td className="py-3 text-right text-[#111111]">{p.viewCount}</td>
                            <td className="py-3 text-right text-[#111111]">{p.exportCount}</td>
                            <td className="py-3 text-right">
                              {p.publicToken ? (
                                <span className="text-xs bg-[#EEF5F1] text-[#355846] px-2 py-0.5 rounded-full font-medium">Active</span>
                              ) : (
                                <span className="text-xs text-[#C9C6BD]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-[#E3E1DA] p-6 flex items-center gap-4">
      <div className="w-10 h-10 bg-[#EDEBE6] rounded-lg flex items-center justify-center">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-[#111111]">{value.toLocaleString()}</div>
        <div className="text-sm text-[#9A9A9A]">{label}</div>
      </div>
    </div>
  );
}
