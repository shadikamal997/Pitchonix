'use client';

import { usePathname } from 'next/navigation';
import { ModernSidebar } from '@/components/ui/modern-sidebar';
import AppTopNav from '@/components/AppTopNav';

/**
 * Pages that have their own focused chrome (editor toolbar, wizard progress
 * bar, etc.) and should NOT be wrapped by the global app shell.
 *
 * Adding a path here means it renders as-is (no sidebar, no top navbar).
 */
const FOCUSED_PAGE_PATTERNS: RegExp[] = [
  /^\/pdf-studio\/editor\b/,         // PDF Studio editor (own toolbar)
  /^\/pdf-studio\/smart-builder\b/,  // Smart builder wizard (own progress bar)
  /^\/pdf-studio\/visual-studio\b/,  // Visual studio (own toolbar)
  /^\/pdf-studio\/structured\b/,     // Structured editor (own toolbar)
  /^\/projects\/[^/]+\/edit\b/,      // Slide canvas editor (own focused chrome)
  /^\/create\b/,                     // Create wizard (own header + stepper)
  /^\/onboarding\b/,                 // Onboarding (special intro flow)
];

function isFocusedPage(pathname: string): boolean {
  return FOCUSED_PAGE_PATTERNS.some((re) => re.test(pathname));
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';

  if (isFocusedPage(pathname)) {
    // Focused-work pages keep their own chrome — render children as-is.
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <ModernSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppTopNav />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
