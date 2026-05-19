'use client';

import AppShell from '@/components/AppShell';

export default function ExportTemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
