'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ModernSidebar } from '@/components/ui/modern-sidebar';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Palette, Plus, Edit, Trash, X } from 'lucide-react';
import api from '@/lib/api';

export default function BrandKitsPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [brandKits, setBrandKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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
      setBrandKits(data);
    } catch (error) {
      console.error('Failed to fetch brand kits:', error);
      setBrandKits([]);
    } finally {
      setLoading(false);
    }
  };

  if (!_hasHydrated || !user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ModernSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Brand Kits</h1>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Brand Kit
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse">Loading brand kits...</div>
            </div>
          ) : brandKits.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Palette className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-gray-900">No Brand Kits Yet</h2>
              <p className="text-gray-600 mb-6">
                Create custom brand kits with your logo, colors, and fonts.
                <br />
                Apply them to your presentations and PDFs for consistent branding.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                Create Your First Brand Kit
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {brandKits.map((kit: any) => (
                <BrandKitCard key={kit.id} kit={kit} onRefresh={fetchBrandKits} />
              ))}
            </div>
          )}

          {showCreateDialog && (
            <CreateBrandKitDialog
              onClose={() => setShowCreateDialog(false)}
              onSuccess={() => {
                setShowCreateDialog(false);
                fetchBrandKits();
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function BrandKitCard({ kit, onRefresh }: any) {
  const handleDelete = async () => {
    if (!confirm('Delete this brand kit?')) return;
    try {
      await api.delete(`/brand-kits/${kit.id}`);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete brand kit:', error);
      alert('Failed to delete brand kit');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-12 h-12 rounded"
          style={{ backgroundColor: kit.primaryColor || '#8B5CF6' }}
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{kit.name}</h3>
          <p className="text-sm text-gray-500">{kit.primaryColor}</p>
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        {kit.secondaryColor && (
          <div
            className="w-8 h-8 rounded border border-gray-200"
            style={{ backgroundColor: kit.secondaryColor }}
          />
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1">
          <Edit className="h-3 w-3 mr-1" /> Edit
        </Button>
        <Button size="sm" variant="outline" onClick={handleDelete}>
          <Trash className="h-3 w-3 mr-1" /> Delete
        </Button>
      </div>
    </div>
  );
}

function CreateBrandKitDialog({ onClose, onSuccess }: any) {
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#8B5CF6');
  const [secondaryColor, setSecondaryColor] = useState('#06B6D4');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a name');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/brand-kits', { 
        name: name.trim(), 
        primaryColor, 
        secondaryColor 
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create brand kit:', error);
      alert('Failed to create brand kit. The API endpoint may not be implemented yet.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Create Brand Kit</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Name</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Brand"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                className="w-16 h-10 border border-gray-200 rounded cursor-pointer"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
              <input
                type="text"
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2 font-mono text-sm"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Secondary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                className="w-16 h-10 border border-gray-200 rounded cursor-pointer"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
              />
              <input
                type="text"
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2 font-mono text-sm"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Creating...' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
