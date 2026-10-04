'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  ChevronDown,
  SlidersHorizontal,
  Folder,
  Building2,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { ViewMode } from '../../types';

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
    setProjectModalOpen,
    setDeptModalOpen,
    setChannelModalOpen,
    addDocument,
    notifications,
    setNotificationOpen,
    setProfileOpen,
    currentUser,
  } = useWorkspace();

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!createMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!createMenuRef.current?.contains(e.target as Node)) setCreateMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [createMenuOpen]);

  const currentDept = departments.find((d) => d.id === activeDepartmentId);
  const currentProj = projects.find((p) => p.id === activeProjectId);

  const viewTabs: Array<{ id: ViewMode; label: string; icon: React.ElementType }> = [
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
        <div className="hidden 2xl:flex items-center gap-1.5 text-xs text-muted-foreground truncate">
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
              <span className="font-medium text-primary truncate">{currentProj.name}</span>
            </>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="hidden lg:flex items-center bg-secondary p-0.5 rounded-lg ml-4">
          {viewTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-card text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Search, Quick Actions, Theme & Notifications */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Cmd+K Search Bar Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 bg-secondary hover:bg-[#E9EAF0] text-muted-foreground hover:text-foreground text-sm px-3.5 py-2 rounded-lg transition-colors"
        >
          <Search size={14} className="text-primary" />
          <span className="hidden min-[1800px]:inline">Search tasks, projects, people...</span>
          <span className="hidden sm:inline min-[1800px]:hidden">Search...</span>
          <span className="sm:hidden">Search</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 bg-card border border-border px-1.5 py-0.5 rounded font-mono text-[10px] text-muted-foreground">
            <Command size={10} /> K
          </kbd>
        </button>

        {/* Quick Create: Task button + create menu for other entities */}
        <div className="relative flex items-center" ref={createMenuRef}>
          <button
            onClick={() => setTaskModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-3.5 py-2 rounded-l-lg transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Task</span>
          </button>
          <button
            onClick={() => setCreateMenuOpen((o) => !o)}
            aria-label="Create more"
            aria-haspopup="menu"
            aria-expanded={createMenuOpen}
            title="Create project, department, document or channel"
            className="flex items-center bg-primary hover:bg-primary/90 text-white text-sm font-medium px-1.5 py-2 rounded-r-lg border-l border-white/20 transition-colors"
          >
            <ChevronDown size={14} />
          </button>

          {createMenuOpen && (
            <div
              role="menu"
              aria-label="Create menu"
              className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in"
            >
              <button
                role="menuitem"
                onClick={() => {
                  setCreateMenuOpen(false);
                  setProjectModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <Folder size={14} className="text-amber-500" />
                New Project
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setCreateMenuOpen(false);
                  setDeptModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <Building2 size={14} className="text-indigo-500" />
                New Department
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setCreateMenuOpen(false);
                  void addDocument({ title: 'Untitled Document' }).then(() => setActiveView('DOCS'));
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <FileText size={14} className="text-sky-500" />
                New Document
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setCreateMenuOpen(false);
                  setChannelModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <MessageSquare size={14} className="text-emerald-500" />
                New Channel
              </button>
            </div>
          )}
        </div>

        {/* Theme Mode Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={17} className="text-amber-500" /> : <Moon size={17} className="text-primary" />}
        </button>

        {/* Notifications Drawer Toggle */}
        <button
          onClick={() => setNotificationOpen(true)}
          className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title="Notifications Center"
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 text-[10px] font-bold bg-primary text-white rounded-full px-1">
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
            className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20"
          />
        </button>
      </div>
    </header>
  );
};
