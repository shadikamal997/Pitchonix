'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ModernSidebar } from '@/components/ui/modern-sidebar';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { FileType, Plus } from 'lucide-react';

export default function ExportTemplatesPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) {
      router.push('/login');
    }
  }, [_hasHydrated, user, router]);

  if (!_hasHydrated || !user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ModernSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Export Templates</h1>
            <Button onClick={() => router.push('/templates')}>
              <Plus className="h-4 w-4 mr-2" />
              Browse Templates
            </Button>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FileType className="h-16 w-16 text-violet-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Export Templates</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Manage and create custom PowerPoint and PDF export templates with your own layouts, styles, and branding.
            </p>
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-violet-800">
                <strong>Features:</strong>
                <br />
                • Custom slide layouts
                <br />
                • PDF page templates  
                <br />
                • Brand kit integration
                <br />
                • Template marketplace
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
