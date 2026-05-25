'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { FileType, Layers, Palette, ShoppingBag, Clock } from 'lucide-react';

const COMING_SOON_FEATURES = [
  { icon: Layers, title: 'Custom Slide Layouts', description: 'Design bespoke PowerPoint layouts for every section of your deck.' },
  { icon: FileType, title: 'PDF Page Templates', description: 'Create reusable page templates for proposals and business plans.' },
  { icon: Palette, title: 'Brand Kit Integration', description: 'Auto-apply your brand colors, fonts, and logos to every template.' },
  { icon: ShoppingBag, title: 'Template Marketplace', description: 'Browse and install community-created templates with one click.' },
];

export default function ExportTemplatesPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) router.push('/login');
  }, [_hasHydrated, user, router]);

  if (!_hasHydrated || !user) return null;

  return (
    <div className="min-h-full bg-[#EDEBE6] p-8">
      <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#111111]">Export Templates</h1>
            <p className="text-[#9A9A9A] mt-1">Customisable layouts for PowerPoint and PDF exports</p>
          </div>

          {/* Coming soon banner */}
          <div className="bg-[#4F7563] rounded-2xl p-8 text-white mb-8 flex items-center gap-6">
            <div className="flex-shrink-0">
              <Clock className="h-12 w-12 text-green-200" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-green-200 mb-1 block">Coming Soon</span>
              <h2 className="text-2xl font-bold mb-2">Export Templates are in development</h2>
              <p className="text-green-100 text-sm leading-relaxed max-w-xl">
                We're building a powerful template system so you can create, save, and reuse custom layouts across all your exports. Stay tuned!
              </p>
            </div>
          </div>

          {/* Feature preview cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {COMING_SOON_FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-white border border-[#E3E1DA] rounded-xl p-6 flex gap-4 items-start">
                <div className="w-10 h-10 bg-[#EEF5F1] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-[#4F7563]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#111111] mb-1">{title}</h3>
                  <p className="text-sm text-[#9A9A9A]">{description}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
