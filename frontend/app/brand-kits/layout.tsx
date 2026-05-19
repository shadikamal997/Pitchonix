'use client';

import AppShell from '@/components/AppShell';

export default function BrandKitsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
