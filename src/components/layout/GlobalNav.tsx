'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Layers,
  CheckSquare,
  Calendar,
  MessageSquare,
  FileText,
  BarChart3,
  Bot,
  UserPlus,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const GlobalNav: React.FC = () => {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    currentUser,
    notifications,
    selectedTaskId,
    setInviteOpen,
    setHelpOpen,
    setProfileOpen,
  } = useWorkspace();
  const pathname = usePathname();

  // Keep an open task panel deep-linked (?task=...) across sidebar navigation.
  const withTask = (href: string) =>
    selectedTaskId ? `${href}${href.includes('?') ? '&' : '?'}task=${encodeURIComponent(selectedTaskId)}` : href;

  // Every sidebar item is a real route (see src/lib/routes.ts).
  const navItems = [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/departments', label: 'Department Spaces', icon: Layers },
    { href: '/my-tasks', label: 'My Tasks', icon: CheckSquare },
    { href: '/planner', label: 'Planner & Calendar', icon: Calendar },
    { href: '/timeline', label: 'Timeline & Gantt', icon: LayoutGrid },
    { href: '/communication', label: 'Team Communication', icon: MessageSquare },
    { href: '/docs', label: 'Documentation & SOPs', icon: FileText },
    { href: '/analytics', label: 'Executive Analytics', icon: BarChart3 },
    { href: '/ai-assistant', label: 'AI Workspace Assistant', icon: Bot },
  ];

  const isActive = (href: string) => {
    if (href === '/home') return pathname === '/home' || pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <aside
      className={`relative z-30 flex flex-col justify-between border-r border-border transition-all duration-300 select-none ${
        isSidebarCollapsed ? 'w-16' : 'w-16 lg:w-56'
      } bg-card h-screen shrink-0`}
    >
      {/* Top Branding & Workspace Title */}
      <div>
        <div className="flex items-center justify-between h-14 px-3 border-b border-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-white font-bold shadow-sm shrink-0">
              W
            </div>
            {!isSidebarCollapsed && (
              <div className="hidden lg:flex flex-col truncate">
                <span className="font-bold text-sm tracking-tight text-foreground">
                  WORKSPACE
                </span>
                <span className="text-[11px] text-muted-foreground truncate">Company Workspace</span>
              </div>
            )}
          </div>

          <button
            onClick={toggleSidebar}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Global Navigation Links */}
        <nav className="p-2 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={withTask(item.href)}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative ${
                  active
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                title={item.label}
              >
                <Icon
                  size={18}
                  className={`shrink-0 transition-transform group-hover:scale-105 ${
                    active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  }`}
                />
                {!isSidebarCollapsed && <span className="hidden lg:inline truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls */}
      <div className="p-2 border-t border-border space-y-1">
        <button
          onClick={() => setInviteOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all relative group"
        >
          <div className="relative shrink-0">
            <UserPlus size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
            )}
          </div>
          {!isSidebarCollapsed && <span className="hidden lg:inline">Invite Team</span>}
        </button>

        <button
          onClick={() => setHelpOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all group"
        >
          <HelpCircle size={18} className="shrink-0" />
          {!isSidebarCollapsed && <span className="hidden lg:inline">Help & Resources</span>}
        </button>

        <button
          onClick={() => setProfileOpen(true)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary transition-all text-left mt-2 group"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20 shrink-0"
          />
          {!isSidebarCollapsed && (
            <div className="hidden lg:flex flex-col truncate">
              <span className="text-xs font-semibold text-foreground truncate">{currentUser.name}</span>
              <span className="text-[10px] text-muted-foreground truncate">{currentUser.title}</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
