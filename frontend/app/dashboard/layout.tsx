'use client';

import { ModernSidebar } from '@/components/ui/modern-sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <ModernSidebar />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
