'use client';

import React from 'react';
import {
  Search,
  Bell,
  Plus,
  Sun,
  Moon,
  Command,
  LayoutList,
  Kanban,
  Calendar,
  BarChart2,
  FileText,
  MessageSquare,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const TopHeader: React.FC = () => {
  const {
    departments,
    projects,
    activeDepartmentId,
    activeProjectId,
    activeView,
    setActiveView,
    theme,
    toggleTheme,
    setCommandPaletteOpen,
    setTaskModalOpen,
    notifications,
    setNotificationOpen,
    setProfileOpen,
    currentUser,
  } = useWorkspace();

  const currentDept = departments.find((d) => d.id === activeDepartmentId);
  const currentProj = projects.find((p) => p.id === activeProjectId);

  const viewTabs = [
    { id: 'LIST', label: 'List', icon: LayoutList },
    { id: 'BOARD', label: 'Board', icon: Kanban },
    { id: 'CALENDAR', label: 'Calendar', icon: Calendar },
    { id: 'TIMELINE', label: 'Timeline', icon: SlidersHorizontal },
    { id: 'DASHBOARD', label: 'Analytics', icon: BarChart2 },
    { id: 'DOCS', label: 'Docs', icon: FileText },
    { id: 'CHAT', label: 'Chat', icon: MessageSquare },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 z-20 select-none shrink-0">
      {/* Left Breadcrumbs & Active Location */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <span className="font-semibold text-foreground">Company</span>
          <ChevronRight size={13} className="text-muted-foreground/60" />

          {currentDept ? (
            <span className="font-medium text-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentDept.color }} />
              {currentDept.name}
            </span>
          ) : (
            <span className="font-medium text-foreground">All Departments</span>
          )}

          {currentProj && (
            <>
              <ChevronRight size={13} className="text-muted-foreground/60" />
              <span className="font-medium text-indigo-600 truncate">{currentProj.name}</span>
            </>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="hidden lg:flex items-center bg-secondary p-0.5 rounded-lg border border-border ml-4">
          {viewTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-card text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-indigo-600' : 'text-muted-foreground'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Search, Quick Actions, Theme & Notifications */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Cmd+K Search Bar Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground text-xs px-3 py-1.5 rounded-lg transition-all"
        >
          <Search size={14} className="text-indigo-600" />
          <span className="hidden sm:inline">Search tasks, projects, people...</span>
          <span className="inline sm:hidden">Search...</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 bg-card border border-border px-1.5 py-0.5 rounded font-mono text-[10px] text-muted-foreground">
            <Command size={10} /> K
          </kbd>
        </button>

        {/* Quick Create Task Button */}
        <button
          onClick={() => setTaskModalOpen(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-sm active:scale-95 transition-all"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Task</span>
        </button>

        {/* Theme Mode Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={17} className="text-amber-500" /> : <Moon size={17} className="text-indigo-600" />}
        </button>

        {/* Notifications Drawer Toggle */}
        <button
          onClick={() => setNotificationOpen(true)}
          className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Notifications Center"
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 text-[10px] font-bold bg-indigo-600 text-white rounded-full px-1">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Avatar */}
        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2 pl-1 border-l border-border hover:opacity-80 transition-opacity"
          title="View Profile"
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-600/20"
          />
        </button>
      </div>
    </header>
  );
};
