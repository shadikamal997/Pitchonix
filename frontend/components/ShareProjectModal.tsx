'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Loader2, Users } from 'lucide-react';
import api from '@/lib/api';

interface Member {
  id: string;
  role: string;
  user: { id: string; email: string; name?: string };
}

interface Props {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ROLES = ['viewer', 'editor'];

export default function ShareProjectModal({ projectId, isOpen, onClose }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) fetchMembers();
  }, [isOpen]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/projects/${projectId}/members`);
      setMembers(res.data);
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  const invite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    setError('');
    setSuccess('');
    try {
      await api.post(`/projects/${projectId}/members/invite`, { email, role });
      setEmail('');
      setSuccess(`Invitation sent to ${email}`);
      await fetchMembers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const updateRole = async (memberId: string, newRole: string) => {
    try {
      await api.patch(`/projects/${projectId}/members/${memberId}/role`, { role: newRole });
      setMembers((prev) => prev.map((m) => m.user.id === memberId ? { ...m, role: newRole } : m));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update role');
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await api.delete(`/projects/${projectId}/members/${memberId}`);
      setMembers((prev) => prev.filter((m) => m.user.id !== memberId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F0EC]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#4F7563]" />
            <h2 className="font-semibold text-[#111111]">Share project</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#C9C6BD] hover:text-[#111111] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Invite form */}
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-2">Invite by email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 border border-[#E3E1DA] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7563]/40 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && invite()}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="border border-[#E3E1DA] rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7563]/40 bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <button
                onClick={invite}
                disabled={inviting || !email.trim()}
                className="flex items-center gap-1 px-3 py-2 bg-[#4F7563] text-white rounded-xl text-sm font-medium hover:bg-[#355846] disabled:opacity-50 transition-colors"
              >
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Invite
              </button>
            </div>
            {error && <p className="text-xs text-[#D96A6A] mt-1.5">{error}</p>}
            {success && <p className="text-xs text-[#4F7563] mt-1.5">{success}</p>}
          </div>

          {/* Members list */}
          <div>
            <p className="text-sm font-medium text-[#111111] mb-2">
              Members {members.length > 0 && <span className="text-[#C9C6BD] font-normal">({members.length})</span>}
            </p>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 text-[#C9C6BD] animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-[#C9C6BD] text-center py-4">No members yet. Invite someone above.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2.5 bg-[#EDEBE6] rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-[#111111]">{m.user.name || m.user.email}</p>
                      {m.user.name && <p className="text-xs text-[#9A9A9A]">{m.user.email}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={m.role}
                        onChange={(e) => updateRole(m.user.id, e.target.value)}
                        className="text-xs border border-[#E3E1DA] rounded-lg px-1.5 py-1 bg-white focus:outline-none"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeMember(m.user.id)}
                        className="p-1 rounded-lg text-[#C9C6BD] hover:text-[#D96A6A] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
