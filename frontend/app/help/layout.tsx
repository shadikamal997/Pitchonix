'use client';

import AppShell from '@/components/AppShell';

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
