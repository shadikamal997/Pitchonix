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
  career:             'Career Docs',
  convert:            'Convert',
  'pptx-import':      'Import .pptx',
  workspaces:         'Workspace',
  admin:              'Admin',
  diagnostics:        'Diagnostics',
};

function prettyLabel(segment: string): string {
  if (PATH_LABELS[segment]) return PATH_LABELS[segment];
  if (/^[0-9a-f-]{20,}$/i.test(segment)) return segment.slice(0, 6) + '…';
  return segment.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AppTopNav() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const TOP_LEVEL = new Set(['/', '/dashboard']);
  const canGoBack = !TOP_LEVEL.has(pathname);

  return (
    <header className="sticky top-0 z-40 bg-[#EDEBE6]/85 backdrop-blur-md border-b border-[#E3E1DA]/60">
      <div className="flex items-center h-[60px] px-4 lg:px-6 gap-2">
        {/* Back */}
        {canGoBack && (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            title="Back"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white shadow-[0_8px_18px_rgba(0,0,0,0.04)] text-[#111111] hover:bg-[#F7F6F2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {/* Home */}
        <Link
          href="/"
          aria-label="Home"
          title="Home"
          className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-white text-[#111111] text-[13px] font-semibold shadow-[0_8px_18px_rgba(0,0,0,0.04)] hover:bg-[#F7F6F2] transition-colors"
        >
          <Home className="w-4 h-4" />
          <span className="hidden md:inline">Home</span>
        </Link>

        {/* Dashboard */}
        {pathname !== '/dashboard' && (
          <Link
            href="/dashboard"
            aria-label="Dashboard"
            title="Dashboard"
            className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-white text-[#111111] text-[13px] font-semibold shadow-[0_8px_18px_rgba(0,0,0,0.04)] hover:bg-[#F7F6F2] transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>
        )}

        <span className="hidden md:inline-block h-5 w-px bg-[#E3E1DA] mx-1" />

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 min-w-0 flex-shrink">
          {crumbs.length === 0 ? (
            <span className="text-sm font-bold text-[#355846]">Pitchonix</span>
          ) : (
            crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <div key={c.href} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#C9C6BD] flex-shrink-0" />}
                  {isLast ? (
                    <span className="text-[13.5px] font-semibold text-[#111111] truncate max-w-[160px] sm:max-w-[260px]">
                      {c.label}
                    </span>
                  ) : (
                    <Link
                      href={c.href}
                      className="text-[13px] text-[#6B6B6B] hover:text-[#111111] truncate hidden sm:inline max-w-[160px]"
                    >
                      {c.label}
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-md mx-4"
          role="search"
        >
          <div className="relative w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9A9A] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, templates…"
              aria-label="Search"
              className="w-full h-10 pl-11 pr-4 text-[13px] bg-white border border-transparent rounded-full outline-none shadow-[0_8px_18px_rgba(0,0,0,0.04)] focus:border-[#4F7563]/30 focus:shadow-[0_8px_18px_rgba(0,0,0,0.04),0_0_0_3px_rgba(79,117,99,0.12)] transition-all placeholder:text-[#9A9A9A] text-[#111111]"
            />
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          <Link
            href="/create"
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#111114] hover:bg-black text-white text-[12.5px] font-semibold shadow-[0_10px_22px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-3.5 h-3.5" />
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
              className="flex items-center justify-center w-10 h-10 rounded-full bg-[#EFEAE0] text-[#355846] font-semibold text-sm ring-[3px] ring-white shadow-[0_8px_18px_rgba(0,0,0,0.06)] hover:scale-[1.03] transition-transform"
            >
              {initial}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-[#E3E1DA]/60 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-[#F1F0EC] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#EFEAE0] text-[#355846] flex items-center justify-center font-semibold text-sm ring-[3px] ring-white shadow-[0_6px_14px_rgba(0,0,0,0.06)]">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#9A9A9A] uppercase tracking-wider font-semibold">Signed in as</p>
                    <p className="text-[13px] font-semibold text-[#111111] truncate">
                      {user?.email || 'User'}
                    </p>
                  </div>
                </div>

                <div className="p-1.5">
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] text-[#111111] hover:bg-[#F7F6F2]"
                  >
                    <User className="w-4 h-4 text-[#6B6B6B]" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] text-[#111111] hover:bg-[#F7F6F2]"
                  >
                    <Settings className="w-4 h-4 text-[#6B6B6B]" />
                    Settings
                  </Link>
                </div>

                <div className="p-1.5 border-t border-[#F1F0EC]">
                  <button
                    type="button"
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] text-[#9a3737] hover:bg-[#F7E3E3]/60"
                  >
                    <LogOut className="w-4 h-4" />
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
