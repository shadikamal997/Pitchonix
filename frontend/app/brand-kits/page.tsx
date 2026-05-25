'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import {
  Palette, Plus, Edit, Trash, X, Settings,
  Type, ImageIcon, Files, Shield, MessageSquare, Archive, Download, Upload,
} from 'lucide-react';
import api from '@/lib/api';

export default function BrandKitsPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const toast = useToast();
  const [brandKits, setBrandKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingKit, setEditingKit] = useState<any | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchBrandKits();
  }, [_hasHydrated, user, router]);

  const fetchBrandKits = async () => {
    try {
      const { data } = await api.get('/brand-kits');
      setBrandKits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch brand kits:', error);
      setBrandKits([]);
    } finally {
      setLoading(false);
    }
  };

  if (!_hasHydrated || !user) return null;

  return (
    <div className="min-h-full bg-[#EDEBE6] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="pn-h1">Brand Kits</h1>
              <p className="pn-body text-[#6B6B6B] mt-1">Logos, colors, typography, voice — applied everywhere you create.</p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Brand Kit
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="pn-card p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="pn-skeleton w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="pn-skeleton h-4 w-3/4" />
                      <div className="pn-skeleton h-3 w-1/3" />
                    </div>
                  </div>
                  <div className="pn-skeleton h-9 w-full" />
                </div>
              ))}
            </div>
          ) : brandKits.length === 0 ? (
            <EmptyState onCreate={() => setShowCreateDialog(true)} onImportZip={async (file) => {
              try {
                const form = new FormData();
                form.append('file', file);
                const { data } = await api.post('/brand-kits/import-zip', form, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                });
                if (data?.id) router.push(`/brand-kits/${data.id}`);
              } catch (e: any) {
                toast.error(e?.response?.data?.message || 'Import failed');
              }
            }} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {brandKits.map((kit: any) => (
                <BrandKitCard
                  key={kit.id}
                  kit={kit}
                  onEdit={() => setEditingKit(kit)}
                  onRefresh={fetchBrandKits}
                  toast={toast}
                />
              ))}
            </div>
          )}

          {showCreateDialog && (
            <BrandKitDialog
              mode="create"
              onClose={() => setShowCreateDialog(false)}
              onSuccess={(newKit: any) => {
                setShowCreateDialog(false);
                toast.success('Brand kit created — opening dashboard…');
                // Phase 37 UX fix: jump straight to the 8-tab dashboard so users
                // discover Colors / Typography / Logos / Assets / Voice /
                // Charts / Audit / Export-ZIP / Apply-to-workspace immediately.
                if (newKit?.id) router.push(`/brand-kits/${newKit.id}`);
                else fetchBrandKits();
              }}
              toast={toast}
            />
          )}

          {editingKit && (
            <BrandKitDialog
              mode="edit"
              kit={editingKit}
              onClose={() => setEditingKit(null)}
              onSuccess={() => {
                setEditingKit(null);
                fetchBrandKits();
                toast.success('Brand kit updated');
              }}
              toast={toast}
            />
          )}
      </div>
    </div>
  );
}

function BrandKitCard({ kit, onEdit, onRefresh, toast }: any) {
  const handleDelete = async () => {
    if (!confirm('Delete this brand kit?')) return;
    try {
      await api.delete(`/brand-kits/${kit.id}`);
      onRefresh();
      toast.success('Brand kit deleted');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete brand kit');
    }
  };

  return (
    <div className="group pn-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lifted">
      <div className="flex items-center gap-4 mb-5">
        <div
          className="w-14 h-14 rounded-full ring-[3px] ring-white shadow-[0_10px_22px_rgba(0,0,0,0.10)]"
          style={{ backgroundColor: kit.primaryColor || '#4F7563' }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#111111] text-[15px] truncate">{kit.name}</h3>
          <p className="text-xs text-[#9A9A9A] font-mono">{kit.primaryColor || '—'}</p>
        </div>
      </div>
      <div className="flex gap-1.5 mb-5">
        <div
          className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: kit.primaryColor || '#4F7563' }}
          title={kit.primaryColor}
        />
        {kit.secondaryColor && (
          <div
            className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: kit.secondaryColor }}
            title={kit.secondaryColor}
          />
        )}
        {kit.accentColor && (
          <div
            className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: kit.accentColor }}
            title={kit.accentColor}
          />
        )}
      </div>
      <div className="flex gap-2">
        {/* Phase 37Q — Open dashboard is the primary action; it surfaces all 8 tabs. */}
        <a
          href={`/brand-kits/${kit.id}`}
          className="pn-btn pn-btn-primary flex-1 h-10 text-[13px]"
        >
          <Settings className="h-4 w-4" /> Open dashboard
        </a>
        <Button size="sm" variant="outline" onClick={onEdit} title="Quick rename / recolor">
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleDelete} title="Delete this brand kit">
          <Trash className="h-3.5 w-3.5 text-[#9a3737]" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
//  Empty state — advertises every tab + action that's behind the create flow.
//  Without this, users only saw a 3-field create modal and assumed the
//  feature was that limited; the 8-tab dashboard at /brand-kits/[id] was
//  invisible until they created + clicked Manage.
// =============================================================================
function EmptyState({ onCreate, onImportZip }: { onCreate: () => void; onImportZip: (file: File) => void }) {
  const features: { Icon: any; label: string; desc: string }[] = [
    { Icon: Palette,         label: 'Colors',     desc: 'Primary, secondary, accent, semantic + chart palette' },
    { Icon: Type,            label: 'Typography', desc: 'Heading, body & caption font families' },
    { Icon: ImageIcon,       label: 'Logos',      desc: 'Primary / mono / dark / light / favicon variants' },
    { Icon: Files,           label: 'Assets',     desc: 'Images, icon marks & favicons (native upload)' },
    { Icon: MessageSquare,   label: 'Voice',      desc: 'Tone, voice + house writing rules for AI generation' },
    { Icon: Shield,          label: 'Audit',      desc: 'Per-deck compliance scan + one-click auto-fix' },
    { Icon: Archive,         label: 'Export ZIP', desc: 'Portable bundle with assets baked in' },
    { Icon: Download,        label: 'Apply to workspace', desc: 'Rebrand every deck in one click' },
  ];
  return (
    <div className="pn-card p-8 lg:p-10">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center mx-auto mb-4">
          <Palette className="h-7 w-7" />
        </div>
        <h2 className="pn-h1 mb-2">Create your first brand kit</h2>
        <p className="text-[#6B6B6B] max-w-xl mx-auto">
          A brand kit centralises your colors, fonts, logos, assets and voice — then
          applies them to every deck, PDF and CV in your workspace.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {features.map(({ Icon, label, desc }) => (
          <div key={label} className="rounded-2xl border border-[#E3E1DA]/70 bg-[#F7F6F2] p-4 text-left">
            <div className="w-9 h-9 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center mb-2.5">
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-sm font-semibold text-[#111111] mb-0.5">{label}</div>
            <div className="text-[11px] text-[#9A9A9A] leading-snug">{desc}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" /> Create brand kit
        </Button>
        <label className="pn-btn pn-btn-secondary cursor-pointer">
          <Upload className="h-4 w-4" /> Import .zip
          <input
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportZip(f);
            }}
          />
        </label>
      </div>
      <p className="text-center text-[11px] text-[#9A9A9A] mt-4">
        Tip: the create form just collects a name + 2 seed colors — you'll land on the
        full 8-tab dashboard right after.
      </p>
    </div>
  );
}

function BrandKitDialog({ mode, kit, onClose, onSuccess, toast }: any) {
  const [name, setName] = useState(kit?.name || '');
  const [primaryColor, setPrimaryColor] = useState(kit?.primaryColor || '#8B5CF6');
  const [secondaryColor, setSecondaryColor] = useState(kit?.secondaryColor || '#06B6D4');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    setSubmitting(true);
    try {
      let created: any = null;
      if (mode === 'edit') {
        await api.patch(`/brand-kits/${kit.id}`, { name: name.trim(), primaryColor, secondaryColor });
      } else {
        const { data } = await api.post('/brand-kits', { name: name.trim(), primaryColor, secondaryColor });
        created = data;
      }
      onSuccess(created);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to ${mode} brand kit`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[28px] shadow-[0_30px_80px_rgba(0,0,0,0.18)] p-7 w-full max-w-md">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="pn-h2">
              {mode === 'edit' ? 'Edit Brand Kit' : 'Create Brand Kit'}
            </h2>
            {mode === 'create' && (
              <p className="text-xs text-[#6B6B6B] mt-1.5 leading-snug">
                Just a name + 2 seed colors to get started. <strong>The next
                screen has the full editor</strong> for typography, logos,
                assets, voice, charts, audit and more.
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full text-[#6B6B6B] hover:bg-[#F1F0EC] flex items-center justify-center flex-shrink-0 ml-2 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[#111111]">Name</label>
            <input
              type="text"
              className="w-full border border-[#E3E1DA] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#4F7563]/40"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Brand"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[#111111]">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                className="w-16 h-10 border border-[#E3E1DA] rounded cursor-pointer"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
              <input
                type="text"
                className="flex-1 border border-[#E3E1DA] rounded-lg px-4 py-2 font-mono text-sm"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[#111111]">Secondary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                className="w-16 h-10 border border-[#E3E1DA] rounded cursor-pointer"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
              />
              <input
                type="text"
                className="flex-1 border border-[#E3E1DA] rounded-lg px-4 py-2 font-mono text-sm"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting
                ? (mode === 'edit' ? 'Saving...' : 'Creating…')
                : (mode === 'edit' ? 'Save Changes' : 'Create & open editor →')}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
          {mode === 'create' && (
            <p className="text-[11px] text-[#C9C6BD] text-center mt-2">
              You'll land on a dashboard with 8 tabs: Overview, Logos, Colors,
              Typography, Charts, Voice, Assets, Audit — plus Export ZIP /
              Import ZIP / Apply-to-workspace.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
