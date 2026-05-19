'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Search,
  Plus,
  User,
  Settings,
  LogOut,
  ChevronRight,
  ArrowLeft,
  LayoutDashboard,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import NotificationBell from '@/components/NotificationBell';

const PATH_LABELS: Record<string, string> = {
  dashboard:          'Dashboard',
  projects:           'Projects',
  'pdf-studio':       'PDF Studio',
  'smart-builder':    'Smart Builder',
  editor:             'Editor',
  'brand-kits':       'Brand Kits',
  'export-templates': 'Export Templates',
  analytics:          'Analytics',
  settings:           'Settings',
  help:               'Help',
  templates:          'Templates',
  create:             'Create',
  onboarding:         'Welcome',
  'visual-studio':    'Visual Studio',
  structured:         'Structured',
};

function prettyLabel(segment: string): string {
  if (PATH_LABELS[segment]) return PATH_LABELS[segment];
  // UUID-ish or long opaque ids → truncate
  if (/^[0-9a-f-]{20,}$/i.test(segment)) return segment.slice(0, 6) + '…';
  // Title-case fallback
  return segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AppTopNav() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close avatar dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  // Build breadcrumb from URL
  const crumbs = useMemo(() => {
    const segs = pathname.split('/').filter(Boolean);
    return segs.map((seg, i) => ({
      label: prettyLabel(seg),
      href: '/' + segs.slice(0, i + 1).join('/'),
    }));
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    router.push(`/projects?q=${encodeURIComponent(q)}`);
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    router.push('/login');
  };

  const initial = user?.email?.[0]?.toUpperCase() || 'U';

  // Hide the back button on top-level pages where it would be pointless.
  const TOP_LEVEL = new Set(['/', '/dashboard']);
  const canGoBack = !TOP_LEVEL.has(pathname);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center h-[52px] px-4 gap-2">
        {/* Back button */}
        {canGoBack && (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back to previous page"
            title="Back"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        {/* Home button */}
        <Link
          href="/"
          aria-label="Go to home page"
          title="Home"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-green-700 hover:bg-green-50 transition-colors"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          <span className="hidden md:inline">Home</span>
        </Link>

        {/* Dashboard button — hidden when already on dashboard */}
        {pathname !== '/dashboard' && (
          <Link
            href="/dashboard"
            aria-label="Go to dashboard"
            title="Dashboard"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-green-700 hover:bg-green-50 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>
        )}

        <div className="h-6 w-px bg-slate-200" />

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 min-w-0 flex-shrink"
        >
          {crumbs.length === 0 ? (
            <span className="text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              Pitchonix
            </span>
          ) : (
            crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <div key={c.href} className="flex items-center gap-1 min-w-0">
                  {i > 0 && (
                    <ChevronRight
                      className="w-3.5 h-3.5 text-slate-300 flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  {isLast ? (
                    <span className="text-sm font-semibold text-slate-900 truncate max-w-[160px] sm:max-w-[260px]">
                      {c.label}
                    </span>
                  ) : (
                    <Link
                      href={c.href}
                      className="text-sm text-slate-500 hover:text-slate-900 truncate hidden sm:inline max-w-[160px]"
                    >
                      {c.label}
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* Search (md+) */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-md mx-4"
          role="search"
        >
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, templates…"
              aria-label="Search"
              className="w-full h-9 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors placeholder:text-slate-400"
            />
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          <Link
            href="/create"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs font-semibold shadow-md shadow-green-500/30 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            New Project
          </Link>

          <NotificationBell />

          {/* Avatar / user menu */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="User menu"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-green-600 to-emerald-500 text-white font-semibold text-sm hover:shadow-md hover:shadow-green-500/30 transition-shadow"
            >
              {initial}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
              >
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                    Signed in as
                  </p>
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {user?.email || 'User'}
                  </p>
                </div>

                <div className="p-1.5">
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <User className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    Settings
                  </Link>
                </div>

                <div className="p-1.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
