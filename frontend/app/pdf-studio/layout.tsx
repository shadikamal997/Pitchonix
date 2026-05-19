'use client';

import AppShell from '@/components/AppShell';

/**
 * AppShell internally detects focused work pages (editor, smart-builder,
 * visual-studio, structured) and renders them WITHOUT the sidebar/topnav,
 * so those keep their own focused chrome intact. The /pdf-studio hub page
 * and /pdf-studio/[id] document pages render inside the shell.
 */
export default function PdfStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
