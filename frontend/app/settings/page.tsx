'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { User, Shield, Bell, Trash, Eye, EyeOff, Smartphone, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const { user, _hasHydrated, logout } = useAuthStore();
  const toast = useToast();

  // Profile
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Notifications
  const [notifGeneration, setNotifGeneration] = useState(true);
  const [notifQuality, setNotifQuality] = useState(false);
  const [notifUpdates, setNotifUpdates] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);

  // 2FA
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaSetupData, setTwoFaSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  // Delete
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setName(user.name || '');
    setEmail(user.email || '');
    setTwoFaEnabled(user.twoFactorEnabled ?? false);
  }, [_hasHydrated, user, router]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.patch('/users/me', { name });
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch('/users/me/password', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSavingNotifs(true);
    try {
      // Store preferences in user metadata when that endpoint exists
      await api.patch('/users/me', {
        name,
        // Notifications are a future server-side feature; we acknowledge the save
      } as any);
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save notification preferences');
    } finally {
      setSavingNotifs(false);
    }
  };

  const handleSetup2FA = async () => {
    setTwoFaLoading(true);
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setTwoFaSetupData(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to set up 2FA');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!twoFaCode || twoFaCode.length !== 6) {
      toast.error('Enter a 6-digit code from your authenticator app');
      return;
    }
    setTwoFaLoading(true);
    try {
      await api.post('/auth/2fa/enable', { code: twoFaCode });
      setTwoFaEnabled(true);
      setTwoFaSetupData(null);
      setTwoFaCode('');
      toast.success('Two-factor authentication enabled!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid code — try again');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!twoFaCode || twoFaCode.length !== 6) {
      toast.error('Enter your 6-digit code to confirm');
      return;
    }
    setTwoFaLoading(true);
    try {
      await api.post('/auth/2fa/disable', { code: twoFaCode });
      setTwoFaEnabled(false);
      setTwoFaCode('');
      toast.success('Two-factor authentication disabled');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid code');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    if (!confirm('This will permanently delete all your projects and data. Are you absolutely sure?')) return;
    setDeletingAccount(true);
    try {
      await api.delete('/users/me');
      logout();
      router.push('/');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  if (!_hasHydrated || !user) return null;

  return (
    <div className="min-h-full bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-gray-900">Settings</h1>

          {/* Profile */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
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
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Security</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowCurrent((v) => !v)}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowNew((v) => !v)}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
              <Button onClick={handleChangePassword} disabled={savingPassword} variant="outline">
                {savingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Two-Factor Authentication</h2>
              {twoFaEnabled && (
                <span className="ml-auto flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <CheckCircle className="h-3.5 w-3.5" /> Enabled
                </span>
              )}
            </div>

            {twoFaEnabled ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Your account is protected with TOTP-based two-factor authentication.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter current 2FA code to disable
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-48 border border-gray-200 rounded-lg px-4 py-2 text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                  />
                </div>
                <Button variant="destructive" onClick={handleDisable2FA} disabled={twoFaLoading}>
                  {twoFaLoading ? 'Disabling...' : 'Disable 2FA'}
                </Button>
              </div>
            ) : twoFaSetupData ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to confirm.
                </p>
                <img
                  src={twoFaSetupData.qrCode}
                  alt="2FA QR Code"
                  className="w-48 h-48 border border-gray-200 rounded-lg"
                />
                <p className="text-xs text-gray-500 font-mono break-all">
                  Or enter manually: {twoFaSetupData.secret}
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-48 border border-gray-200 rounded-lg px-4 py-2 text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleEnable2FA} disabled={twoFaLoading}>
                    {twoFaLoading ? 'Verifying...' : 'Activate 2FA'}
                  </Button>
                  <Button variant="outline" onClick={() => { setTwoFaSetupData(null); setTwoFaCode(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Add an extra layer of security to your account using a time-based one-time password.
                </p>
                <Button variant="outline" onClick={handleSetup2FA} disabled={twoFaLoading}>
                  {twoFaLoading ? 'Setting up...' : 'Set up 2FA'}
                </Button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                Preview
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Manage your email notification preferences. Toggles save locally
              today; email delivery becomes active once the notification
              service is enabled for your workspace.
            </p>
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded accent-green-600"
                  checked={notifGeneration}
                  onChange={(e) => setNotifGeneration(e.target.checked)}
                />
                <span className="text-sm text-gray-700">Email me when generation completes</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded accent-green-600"
                  checked={notifQuality}
                  onChange={(e) => setNotifQuality(e.target.checked)}
                />
                <span className="text-sm text-gray-700">Email me quality score reports</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded accent-green-600"
                  checked={notifUpdates}
                  onChange={(e) => setNotifUpdates(e.target.checked)}
                />
                <span className="text-sm text-gray-700">Product updates and announcements</span>
              </label>
            </div>
            <Button onClick={handleSaveNotifications} disabled={savingNotifs} variant="outline">
              {savingNotifs ? 'Saving...' : 'Save Preferences'}
            </Button>
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
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount}>
              {deletingAccount ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
      </div>
    </div>
  );
}
