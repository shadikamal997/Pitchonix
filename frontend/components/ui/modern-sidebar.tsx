"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
  Home,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Palette,
  Search,
  HelpCircle,
  Plus,
  Sparkles,
  FileType,
  BarChart2,
  Briefcase,
  Shuffle,
  Upload,
} from 'lucide-react';

interface NavigationItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
}

interface SidebarProps {
  className?: string;
}

// Pitchonix navigation items (Phase Δ — Soft Sage)
const navigationItems: NavigationItem[] = [
  { id: "dashboard",   name: "Dashboard",     icon: Home,        href: "/dashboard" },
  { id: "create",      name: "Create New",    icon: Plus,        href: "/create" },
  { id: "projects",    name: "Projects",      icon: FolderOpen,  href: "/projects" },
  { id: "pdf-studio",  name: "PDF Studio",    icon: FileType,    href: "/pdf-studio" },
  { id: "career",      name: "Career Docs",   icon: Briefcase,   href: "/career" },
  { id: "brand-kits",  name: "Brand Kits",    icon: Palette,     href: "/brand-kits" },
  { id: "convert",     name: "Convert",       icon: Shuffle,     href: "/convert" },
  { id: "pptx-import", name: "Import .pptx",  icon: Upload,      href: "/pptx-import" },
  { id: "analytics",   name: "Analytics",     icon: BarChart2,   href: "/analytics" },
  { id: "settings",    name: "Settings",      icon: Settings,    href: "/settings" },
  { id: "help",        name: "Help & Support",icon: HelpCircle,  href: "/help" },
];

export function ModernSidebar({ className = "" }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user, _hasHydrated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsOpen(true);
      else setIsOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const handleItemClick = (item: NavigationItem) => {
    router.push(item.href);
    if (window.innerWidth < 768) setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getActiveItem = () => {
    const item = navigationItems.find(item => pathname.startsWith(item.href));
    return item?.id || "dashboard";
  };

  const activeItem = getActiveItem();

  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return navigationItems;
    const q = searchQuery.toLowerCase();
    return navigationItems.filter((item) => item.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
    return user.name.substring(0, 2).toUpperCase();
  };

  if (!isMounted || !_hasHydrated) return null;

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="fixed top-6 left-6 z-50 p-3 rounded-2xl bg-white shadow-[0_12px_30px_rgba(0,0,0,0.06)] md:hidden hover:bg-[#F7F6F2] transition-all"
        aria-label="Toggle sidebar"
      >
        {isOpen
          ? <X className="h-5 w-5 text-[#111111]" />
          : <Menu className="h-5 w-5 text-[#111111]" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-[#EDEBE6] z-40 transition-all duration-300 ease-in-out flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "w-20" : "w-72"}
          md:translate-x-0 md:static md:z-auto
          ${className}
        `}
      >
        {/* Brand + collapse */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          {!isCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4F7563] to-[#355846] flex items-center justify-center shadow-[0_10px_24px_rgba(79,117,99,0.28)] shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold tracking-tight text-[#111111] text-[15px] truncate">Pitchonix</span>
                <span className="text-[11px] font-medium text-[#9A9A9A] truncate">AI Presentation Studio</span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4F7563] to-[#355846] flex items-center justify-center mx-auto shadow-[0_10px_24px_rgba(79,117,99,0.28)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          )}

          <button
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 rounded-full hover:bg-[#F1F0EC] transition-all text-[#6B6B6B]"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed
              ? <ChevronRight className="h-4 w-4" />
              : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9A9A9A]" />
              <input
                type="text"
                placeholder="Quick find…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 h-10 bg-[#F7F6F2] border border-transparent rounded-full text-sm placeholder:text-[#9A9A9A] text-[#111111] focus:outline-none focus:bg-white focus:border-[#4F7563]/40 focus:shadow-[0_0_0_3px_rgba(79,117,99,0.12)] transition-all"
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-1.5 overflow-y-auto">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all group relative
                      ${isActive
                        ? "bg-[#111114] text-white shadow-[0_12px_24px_rgba(0,0,0,0.16)]"
                        : "text-[#3F3F3F] hover:bg-[#F1F0EC]"
                      }
                      ${isCollapsed ? "justify-center px-2" : ""}
                    `}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <div className={`
                      flex items-center justify-center w-9 h-9 rounded-full shrink-0
                      ${isActive
                        ? "bg-white/10 text-white"
                        : "bg-[#EEF5F1] text-[#4F7563] group-hover:bg-white"
                      }
                    `}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center justify-between w-full min-w-0">
                        <span className={`text-[13.5px] truncate ${isActive ? "font-semibold" : "font-medium"}`}>
                          {item.name}
                        </span>
                        {item.badge && (
                          <span className={`
                            px-2 py-0.5 text-[10px] font-bold rounded-full
                            ${isActive
                              ? "bg-white/15 text-white"
                              : "bg-[#EEF5F1] text-[#4F7563]"
                            }
                          `}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {isCollapsed && item.badge && (
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-[#4F7563] border-2 border-white">
                        <span className="text-[9px] font-bold text-white">
                          {parseInt(item.badge) > 9 ? '9+' : item.badge}
                        </span>
                      </div>
                    )}

                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#111114] text-white text-xs font-medium rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                        {item.name}
                        {item.badge && (
                          <span className="ml-2 px-1.5 py-0.5 bg-white/15 rounded-full text-[10px]">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom: profile + logout */}
        <div className="mt-auto p-3 space-y-2 border-t border-[#F1F0EC]">
          {!isCollapsed ? (
            <button
              onClick={() => router.push('/settings')}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-[#F7F6F2] hover:bg-[#EEF5F1] transition-colors text-left"
              title="Go to Settings"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#EFEAE0] text-[#355846] flex items-center justify-center font-semibold text-sm ring-[3px] ring-white shadow-[0_8px_18px_rgba(0,0,0,0.06)]">
                  {getUserInitials()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#4F7563] rounded-full border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#111111] truncate">{user?.name || 'User'}</p>
                <p className="text-[11px] text-[#9A9A9A] truncate">{user?.email || 'user@pitchonix.com'}</p>
              </div>
            </button>
          ) : (
            <button
              onClick={() => router.push('/settings')}
              className="flex justify-center w-full"
              title="Go to Settings"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#EFEAE0] text-[#355846] flex items-center justify-center font-semibold text-sm ring-[3px] ring-white shadow-[0_8px_18px_rgba(0,0,0,0.06)]">
                  {getUserInitials()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#4F7563] rounded-full border-2 border-white" />
              </div>
            </button>
          )}

          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center rounded-2xl transition-all group relative
              text-[#9a3737] hover:bg-[#F7E3E3]/60
              ${isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"}
            `}
            title={isCollapsed ? "Logout" : undefined}
          >
            <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${isCollapsed ? '' : ''} bg-[#F7E3E3] text-[#9a3737]`}>
              <LogOut className="h-4 w-4" />
            </div>
            {!isCollapsed && <span className="text-[13.5px] font-medium">Sign out</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#111114] text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                Sign out
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default ModernSidebar;
