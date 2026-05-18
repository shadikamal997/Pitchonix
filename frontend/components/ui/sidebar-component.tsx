"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import {
  Search as SearchIcon,
  Dashboard,
  Task,
  Folder,
  Calendar as CalendarIcon,
  UserMultiple,
  Analytics,
  DocumentAdd,
  Settings as SettingsIcon,
  User as UserIcon,
  ChevronDown as ChevronDownIcon,
  AddLarge,
  Filter,
  Time,
  InProgress,
  CheckmarkOutline,
  Flag,
  Archive,
  View,
  Report,
  StarFilled,
  Group,
  ChartBar,
  FolderOpen,
  Share,
  CloudUpload,
  Security,
  Notification,
  Integration,
  Logout,
} from "@carbon/icons-react";

const softSpringEasing = "cubic-bezier(0.25, 1.1, 0.4, 1)";

const svgPaths = {
  p36880f80:
    "M0.32 0C0.20799 0 0.151984 0 0.109202 0.0217987C0.0715695 0.0409734 0.0409734 0.0715695 0.0217987 0.109202C0 0.151984 0 0.20799 0 0.32V6.68C0 6.79201 0 6.84801 0.0217987 6.8908C0.0409734 6.92843 0.0715695 6.95902 0.109202 6.9782C0.151984 7 0.207989 7 0.32 7L3.68 7C3.79201 7 3.84802 7 3.8908 6.9782C3.92843 6.95903 3.95903 6.92843 3.9782 6.8908C4 6.84801 4 6.79201 4 6.68V4.32C4 4.20799 4 4.15198 4.0218 4.1092C4.04097 4.07157 4.07157 4.04097 4.1092 4.0218C4.15198 4 4.20799 4 4.32 4L19.68 4C19.792 4 19.848 4 19.8908 4.0218C19.9284 4.04097 19.959 4.07157 19.9782 4.1092C20 4.15198 20 4.20799 20 4.32V6.68C20 6.79201 20 6.84802 20.0218 6.8908C20.041 6.92843 20.0716 6.95903 20.1092 6.9782C20.152 7 20.208 7 20.32 7L23.68 7C23.792 7 23.848 7 23.8908 6.9782C23.9284 6.95903 23.959 6.92843 23.9782 6.8908C24 6.84802 24 6.79201 24 6.68V0.32C24 0.20799 24 0.151984 23.9782 0.109202C23.959 0.0715695 23.9284 0.0409734 23.8908 0.0217987C23.848 0 23.792 0 23.68 0H0.32Z",
  p355df480:
    "M0.32 16C0.20799 16 0.151984 16 0.109202 15.9782C0.0715695 15.959 0.0409734 15.9284 0.0217987 15.8908C0 15.848 0 15.792 0 15.68V9.32C0 9.20799 0 9.15198 0.0217987 9.1092C0.0409734 9.07157 0.0715695 9.04097 0.109202 9.0218C0.151984 9 0.207989 9 0.32 9H3.68C3.79201 9 3.84802 9 3.8908 9.0218C3.92843 9.04097 3.95903 9.07157 3.9782 9.1092C4 9.15198 4 9.20799 4 9.32V11.68C4 11.792 4 11.848 4.0218 11.8908C4.04097 11.9284 4.07157 11.959 4.1092 11.9782C4.15198 12 4.20799 12 4.32 12L19.68 12C19.792 12 19.848 12 19.8908 11.9782C19.9284 11.959 19.959 11.9284 19.9782 11.8908C20 11.848 20 11.792 20 11.68V9.32C20 9.20799 20 9.15199 20.0218 9.1092C20.041 9.07157 20.0716 9.04098 20.1092 9.0218C20.152 9 20.208 9 20.32 9H23.68C23.792 9 23.848 9 23.8908 9.0218C23.9284 9.04098 23.959 9.07157 23.9782 9.1092C24 9.15199 24 9.20799 24 9.32V15.68C24 15.792 24 15.848 23.9782 15.8908C23.959 15.9284 23.9284 15.959 23.8908 15.9782C23.848 16 23.792 16 23.68 16H0.32Z",
  pfa0d600:
    "M6.32 10C6.20799 10 6.15198 10 6.1092 9.9782C6.07157 9.95903 6.04097 9.92843 6.0218 9.8908C6 9.84802 6 9.79201 6 9.68V6.32C6 6.20799 6 6.15198 6.0218 6.1092C6.04097 6.07157 6.07157 6.04097 6.1092 6.0218C6.15198 6 6.20799 6 6.32 6L17.68 6C17.792 6 17.848 6 17.8908 6.0218C17.9284 6.04097 17.959 6.07157 17.9782 6.1092C18 6.15198 18 6.20799 18 6.32V9.68C18 9.79201 18 9.84802 17.9782 9.8908C17.959 9.92843 17.9284 9.95903 17.8908 9.9782C17.848 10 17.792 10 17.68 10H6.32Z",
};

function InterfacesLogoSquare() {
  return (
    <div className="aspect-[24/24] grow min-h-px min-w-px overflow-clip relative shrink-0">
      <div className="absolute aspect-[24/16] left-0 right-0 top-1/2 -translate-y-1/2">
        <svg className="block size-full" fill="none" viewBox="0 0 24 16">
          <g>
            <path d={svgPaths.p36880f80} fill="#171717" />
            <path d={svgPaths.p355df480} fill="#171717" />
            <path d={svgPaths.pfa0d600} fill="#171717" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function BrandBadge() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex items-center p-1 w-full">
        <div className="h-10 w-8 flex items-center justify-center pl-2">
          <InterfacesLogoSquare />
        </div>
        <div className="px-2 py-1">
          <div className="font-semibold text-[16px] text-neutral-900">Pitchonix</div>
        </div>
      </div>
    </div>
  );
}

function AvatarCircle({ initial }: { initial?: string }) {
  return (
    <div className="relative rounded-full shrink-0 size-8 bg-gradient-to-br from-green-500 to-emerald-500">
      <div className="flex items-center justify-center size-8 text-white font-semibold text-sm">
        {initial || <UserIcon size={16} />}
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full border border-neutral-200 pointer-events-none"
      />
    </div>
  );
}

function SearchContainer({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const [searchValue, setSearchValue] = useState("");

  return (
    <div
      className={`relative shrink-0 transition-all duration-500 ${
        isCollapsed ? "w-full flex justify-center" : "w-full"
      }`}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      <div
        className={`bg-neutral-100 h-10 relative rounded-lg flex items-center transition-all duration-500 ${
          isCollapsed ? "w-10 min-w-10 justify-center" : "w-full"
        }`}
        style={{ transitionTimingFunction: softSpringEasing }}
      >
        <div
          className={`flex items-center justify-center shrink-0 transition-all duration-500 ${
            isCollapsed ? "p-1" : "px-1"
          }`}
          style={{ transitionTimingFunction: softSpringEasing }}
        >
          <div className="size-8 flex items-center justify-center">
            <SearchIcon size={16} className="text-neutral-900" />
          </div>
        </div>

        <div
          className={`flex-1 relative transition-opacity duration-500 overflow-hidden ${
            isCollapsed ? "opacity-0 w-0" : "opacity-100"
          }`}
          style={{ transitionTimingFunction: softSpringEasing }}
        >
          <div className="flex flex-col justify-center size-full">
            <div className="flex flex-col gap-2 items-start justify-center pr-2 py-1 w-full">
              <input
                type="text"
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-[14px] text-neutral-900 placeholder:text-neutral-500 leading-[20px]"
                tabIndex={isCollapsed ? -1 : 0}
              />
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-lg border border-neutral-200 pointer-events-none"
        />
      </div>
    </div>
  );
}

interface MenuItemT {
  icon?: React.ReactNode;
  label: string;
  route?: string;
  hasDropdown?: boolean;
  isActive?: boolean;
  children?: MenuItemT[];
}
interface MenuSectionT {
  title: string;
  items: MenuItemT[];
}
interface SidebarContent {
  title: string;
  sections: MenuSectionT[];
}

function getSidebarContent(activeSection: string, pathname: string): SidebarContent {
  const contentMap: Record<string, SidebarContent> = {
    dashboard: {
      title: "Dashboard",
      sections: [
        {
          title: "Overview",
          items: [
            {
              icon: <View size={16} className="text-neutral-900" />,
              label: "Overview",
              route: "/dashboard",
              isActive: pathname === "/dashboard",
            },
            {
              icon: <AddLarge size={16} className="text-neutral-900" />,
              label: "New Project",
              route: "/create",
              isActive: pathname === "/create",
            },
          ],
        },
        {
          title: "Document Types",
          items: [
            {
              icon: <ChartBar size={16} className="text-neutral-900" />,
              label: "Pitch Decks",
              hasDropdown: true,
              children: [
                { label: "Create Pitch Deck", route: "/create?type=pitch_deck" },
              ],
            },
            {
              icon: <FolderOpen size={16} className="text-neutral-900" />,
              label: "Business Plans",
              hasDropdown: true,
              children: [
                { label: "Create Business Plan", route: "/create?type=business_plan" },
              ],
            },
            {
              icon: <Report size={16} className="text-neutral-900" />,
              label: "Proposals",
              hasDropdown: true,
              children: [
                { label: "Create Proposal", route: "/create?type=proposal" },
              ],
            },
          ],
        },
      ],
    },

    projects: {
      title: "Projects",
      sections: [
        {
          title: "Quick Actions",
          items: [
            {
              icon: <AddLarge size={16} className="text-neutral-900" />,
              label: "New Project",
              route: "/create",
            },
            {
              icon: <Filter size={16} className="text-neutral-900" />,
              label: "All Projects",
              route: "/dashboard",
            },
          ],
        },
        {
          title: "Status",
          items: [
            {
              icon: <InProgress size={16} className="text-neutral-900" />,
              label: "In Progress",
              route: "/dashboard?status=generating",
            },
            {
              icon: <CheckmarkOutline size={16} className="text-neutral-900" />,
              label: "Completed",
              route: "/dashboard?status=completed",
            },
            {
              icon: <Archive size={16} className="text-neutral-900" />,
              label: "Exported",
              route: "/dashboard?status=exported",
            },
          ],
        },
      ],
    },

    analytics: {
      title: "Analytics",
      sections: [
        {
          title: "Reports",
          items: [
            {
              icon: <ChartBar size={16} className="text-neutral-900" />,
              label: "Quality Metrics",
              route: "/dashboard",
            },
            {
              icon: <Report size={16} className="text-neutral-900" />,
              label: "Generation Stats",
              route: "/dashboard",
            },
            {
              icon: <StarFilled size={16} className="text-neutral-900" />,
              label: "Export History",
              route: "/dashboard",
            },
          ],
        },
      ],
    },

    files: {
      title: "Documents",
      sections: [
        {
          title: "Quick Actions",
          items: [
            {
              icon: <CloudUpload size={16} className="text-neutral-900" />,
              label: "Export PPTX",
              route: "/dashboard",
            },
            {
              icon: <DocumentAdd size={16} className="text-neutral-900" />,
              label: "New Document",
              route: "/create",
            },
          ],
        },
      ],
    },

    settings: {
      title: "Settings",
      sections: [
        {
          title: "Account",
          items: [
            {
              icon: <UserIcon size={16} className="text-neutral-900" />,
              label: "Profile",
              route: "/dashboard",
            },
            {
              icon: <Security size={16} className="text-neutral-900" />,
              label: "Security",
              route: "/dashboard",
            },
            {
              icon: <Notification size={16} className="text-neutral-900" />,
              label: "Notifications",
              route: "/dashboard",
            },
          ],
        },
      ],
    },
  };

  return contentMap[activeSection] || contentMap.dashboard;
}

function IconNavButton({
  children,
  isActive = false,
  onClick,
  title,
}: {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className={`flex items-center justify-center rounded-lg size-10 min-w-10 transition-colors duration-500
        ${isActive ? "bg-neutral-100 text-neutral-900" : "hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"}`}
      style={{ transitionTimingFunction: softSpringEasing }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function IconNavigation({
  activeSection,
  onSectionChange,
  onLogout,
  userInitial,
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  userInitial: string;
}) {
  const navItems = [
    { id: "dashboard", icon: <Dashboard size={16} />, label: "Dashboard" },
    { id: "projects", icon: <Folder size={16} />, label: "Projects" },
    { id: "analytics", icon: <Analytics size={16} />, label: "Analytics" },
    { id: "files", icon: <DocumentAdd size={16} />, label: "Documents" },
  ];

  return (
    <aside className="bg-white flex flex-col gap-2 items-center p-4 w-16 h-full border-r border-neutral-200">
      <div className="mb-2 size-10 flex items-center justify-center">
        <div className="size-7">
          <InterfacesLogoSquare />
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full items-center">
        {navItems.map((item) => (
          <IconNavButton
            key={item.id}
            isActive={activeSection === item.id}
            onClick={() => onSectionChange(item.id)}
            title={item.label}
          >
            {item.icon}
          </IconNavButton>
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-2 w-full items-center">
        <IconNavButton
          isActive={activeSection === "settings"}
          onClick={() => onSectionChange("settings")}
          title="Settings"
        >
          <SettingsIcon size={16} />
        </IconNavButton>
        <IconNavButton onClick={onLogout} title="Logout">
          <Logout size={16} />
        </IconNavButton>
        <div className="size-8">
          <AvatarCircle initial={userInitial} />
        </div>
      </div>
    </aside>
  );
}

function SectionTitle({
  title,
  onToggleCollapse,
  isCollapsed,
}: {
  title: string;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
}) {
  if (isCollapsed) {
    return (
      <div className="w-full flex justify-center transition-all duration-500" style={{ transitionTimingFunction: softSpringEasing }}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center justify-center rounded-lg size-10 min-w-10 transition-all duration-500 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
          style={{ transitionTimingFunction: softSpringEasing }}
          aria-label="Expand sidebar"
        >
          <span className="inline-block rotate-180">
            <ChevronDownIcon size={16} />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden transition-all duration-500" style={{ transitionTimingFunction: softSpringEasing }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center h-10">
          <div className="px-2 py-1">
            <div className="font-semibold text-[18px] text-neutral-900 leading-[27px]">{title}</div>
          </div>
        </div>
        <div className="pr-1">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center justify-center rounded-lg size-10 min-w-10 transition-all duration-500 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
            style={{ transitionTimingFunction: softSpringEasing }}
            aria-label="Collapse sidebar"
          >
            <ChevronDownIcon size={16} className="-rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  item,
  isExpanded,
  onToggle,
  onItemClick,
  isCollapsed,
}: {
  item: MenuItemT;
  isExpanded?: boolean;
  onToggle?: () => void;
  onItemClick?: () => void;
  isCollapsed?: boolean;
}) {
  const handleClick = () => {
    if (item.hasDropdown && onToggle) onToggle();
    else onItemClick?.();
  };

  return (
    <div
      className={`relative shrink-0 transition-all duration-500 ${
        isCollapsed ? "w-full flex justify-center" : "w-full"
      }`}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      <div
        className={`rounded-lg cursor-pointer transition-all duration-500 flex items-center relative ${
          item.isActive ? "bg-green-50 text-green-700" : "hover:bg-neutral-100"
        } ${isCollapsed ? "w-10 min-w-10 h-10 justify-center p-4" : "w-full h-10 px-4 py-2"}`}
        style={{ transitionTimingFunction: softSpringEasing }}
        onClick={handleClick}
        title={isCollapsed ? item.label : undefined}
      >
        <div className="flex items-center justify-center shrink-0">{item.icon}</div>

        <div
          className={`flex-1 relative transition-opacity duration-500 overflow-hidden ${
            isCollapsed ? "opacity-0 w-0" : "opacity-100 ml-3"
          }`}
          style={{ transitionTimingFunction: softSpringEasing }}
        >
          <div className={`text-[14px] leading-[20px] truncate ${item.isActive ? "font-medium text-green-700" : "text-neutral-900"}`}>
            {item.label}
          </div>
        </div>

        {item.hasDropdown && (
          <div
            className={`flex items-center justify-center shrink-0 transition-opacity duration-500 ${
              isCollapsed ? "opacity-0 w-0" : "opacity-100 ml-2"
            }`}
            style={{ transitionTimingFunction: softSpringEasing }}
          >
            <ChevronDownIcon
              size={16}
              className="text-neutral-900 transition-transform duration-500"
              style={{
                transitionTimingFunction: softSpringEasing,
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SubMenuItem({ item, onItemClick }: { item: MenuItemT; onItemClick?: () => void }) {
  return (
    <div className="w-full pl-9 pr-1 py-[1px]">
      <div
        className="h-10 w-full rounded-lg cursor-pointer transition-colors hover:bg-neutral-100 flex items-center px-3 py-1"
        onClick={onItemClick}
      >
        <div className="flex-1 min-w-0">
          <div className="text-[14px] text-neutral-700 leading-[18px] truncate">{item.label}</div>
        </div>
      </div>
    </div>
  );
}

function MenuSection({
  section,
  expandedItems,
  onToggleExpanded,
  isCollapsed,
  onNavigate,
}: {
  section: MenuSectionT;
  expandedItems: Set<string>;
  onToggleExpanded: (itemKey: string) => void;
  isCollapsed?: boolean;
  onNavigate: (route: string) => void;
}) {
  return (
    <div className="flex flex-col w-full">
      <div
        className={`relative shrink-0 w-full transition-all duration-500 overflow-hidden ${
          isCollapsed ? "h-0 opacity-0" : "h-10 opacity-100"
        }`}
        style={{ transitionTimingFunction: softSpringEasing }}
      >
        <div className="flex items-center h-10 px-4">
          <div className="text-[14px] text-neutral-600 font-medium">{section.title}</div>
        </div>
      </div>

      {section.items.map((item, index) => {
        const itemKey = `${section.title}-${index}`;
        const isExpanded = expandedItems.has(itemKey);
        return (
          <div key={itemKey} className="w-full flex flex-col">
            <MenuItem
              item={item}
              isExpanded={isExpanded}
              onToggle={() => onToggleExpanded(itemKey)}
              onItemClick={() => item.route && onNavigate(item.route)}
              isCollapsed={isCollapsed}
            />
            {isExpanded && item.children && !isCollapsed && (
              <div className="flex flex-col gap-1 mb-2">
                {item.children.map((child, childIndex) => (
                  <SubMenuItem
                    key={`${itemKey}-${childIndex}`}
                    item={child}
                    onItemClick={() => child.route && onNavigate(child.route)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailSidebar({
  activeSection,
  onLogout,
  userName,
  userEmail,
  userInitial,
}: {
  activeSection: string;
  onLogout: () => void;
  userName: string;
  userEmail: string;
  userInitial: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const content = getSidebarContent(activeSection, pathname);

  const toggleExpanded = (itemKey: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemKey)) next.delete(itemKey);
      else next.add(itemKey);
      return next;
    });
  };

  const toggleCollapse = () => setIsCollapsed((s) => !s);

  const handleNavigate = (route: string) => {
    router.push(route);
  };

  return (
    <aside
      className={`bg-white flex flex-col gap-4 items-start p-4 rounded-r-none transition-all duration-500 h-full border-r border-neutral-200 ${
        isCollapsed ? "w-16 min-w-16 !px-0 justify-center" : "w-64"
      }`}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      {!isCollapsed && <BrandBadge />}

      <SectionTitle title={content.title} onToggleCollapse={toggleCollapse} isCollapsed={isCollapsed} />
      <SearchContainer isCollapsed={isCollapsed} />

      <div
        className={`flex flex-col w-full flex-1 overflow-y-auto transition-all duration-500 ${
          isCollapsed ? "gap-2 items-center" : "gap-4 items-start"
        }`}
        style={{ transitionTimingFunction: softSpringEasing }}
      >
        {content.sections.map((section, index) => (
          <MenuSection
            key={`${activeSection}-${index}`}
            section={section}
            expandedItems={expandedItems}
            onToggleExpanded={toggleExpanded}
            isCollapsed={isCollapsed}
            onNavigate={handleNavigate}
          />
        ))}
      </div>

      {!isCollapsed && (
        <div className="w-full pt-2 border-t border-neutral-200">
          <div className="flex items-center gap-2 px-2 py-2">
            <AvatarCircle initial={userInitial} />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] text-neutral-900 font-medium truncate">{userName}</div>
              <div className="text-[12px] text-neutral-500 truncate">{userEmail}</div>
            </div>
            <button
              type="button"
              className="size-8 rounded-md flex items-center justify-center hover:bg-neutral-100 text-neutral-600 hover:text-red-600 transition-colors"
              aria-label="Logout"
              title="Logout"
              onClick={onLogout}
            >
              <Logout size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function TwoLevelSidebar({
  onLogout,
  userName,
  userEmail,
  userInitial,
}: {
  onLogout: () => void;
  userName: string;
  userEmail: string;
  userInitial: string;
}) {
  const [activeSection, setActiveSection] = useState("dashboard");

  return (
    <div className="flex flex-row h-full">
      <IconNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={onLogout}
        userInitial={userInitial}
      />
      <DetailSidebar
        activeSection={activeSection}
        onLogout={onLogout}
        userName={userName}
        userEmail={userEmail}
        userInitial={userInitial}
      />
    </div>
  );
}

export function DashboardSidebar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const userName = user?.name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";
  const userInitial = userName[0]?.toUpperCase() || "U";

  return (
    <div className="h-full flex items-stretch">
      <TwoLevelSidebar
        onLogout={handleLogout}
        userName={userName}
        userEmail={userEmail}
        userInitial={userInitial}
      />
    </div>
  );
}

export default DashboardSidebar;
