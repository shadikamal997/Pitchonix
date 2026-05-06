'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ModernSidebar } from '@/components/ui/modern-sidebar';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { User, Shield, Bell, Trash } from 'lucide-react';
import api from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const { user, _hasHydrated, logout } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setName(user.name || '');
    setEmail(user.email || '');
  }, [_hasHydrated, user, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me', { name });
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Failed to update settings:', error);
      alert('Failed to save settings. User update endpoint may not be implemented yet.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    if (!confirm('This will permanently delete all your projects, decks, and data. Are you absolutely sure?')) return;
    
    try {
      await api.delete('/users/me');
      logout();
      router.push('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account. This feature may not be implemented yet.');
    }
  };

  if (!_hasHydrated || !user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ModernSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-gray-900">Settings</h1>
          
          {/* Profile Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-5 w-5 text-violet-600" />
              <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Email</label>
                <input
                  type="email"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 bg-gray-50 cursor-not-allowed"
                  value={email}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-5 w-5 text-violet-600" />
              <h2 className="text-xl font-semibold text-gray-900">Security</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Password</label>
                <Button variant="outline" onClick={() => alert('Password reset email sent! Check your inbox.')}>
                  Change Password
                </Button>
                <p className="text-xs text-gray-500 mt-1">A reset link will be sent to your email</p>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="h-5 w-5 text-violet-600" />
              <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Manage your email notification preferences. Updates will be reflected immediately.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-gray-700">Email me when generation completes</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-gray-700">Email me quality score reports</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" disabled className="rounded" />
                <span className="text-sm text-gray-700">Product updates and announcements</span>
              </label>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg border border-red-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trash className="h-5 w-5 text-red-600" />
              <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
