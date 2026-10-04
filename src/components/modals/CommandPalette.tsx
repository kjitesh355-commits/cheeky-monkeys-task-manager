'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  CheckSquare,
  Folder,
  Building2,
  FileText,
  Plus,
  Moon,
  Sun,
  X,
  ChevronRight,
  Users,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { Task, Project, Department, Document, Message, User } from '../../types';

type SearchResults = {
  query: string;
  tasks: Task[];
  projects: Project[];
  departments: Department[];
  documents: Document[];
  messages: Message[];
  users: User[];
};

const EMPTY_RESULTS: SearchResults = {
  query: '',
  tasks: [],
  projects: [],
  departments: [],
  documents: [],
  messages: [],
  users: [],
};

interface PaletteItem {
  id: string;
  group: string;
  label: string;
  detail?: string;
  icon: React.ReactNode;
  run: () => void;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    currentUser,
    globalSearch,
    setActiveDepartmentId,
    setActiveProjectId,
    setActiveView,
    setSelectedTaskId,
    setActiveDocId,
    setTaskModalOpen,
    setDeptModalOpen,
    startDirectMessage,
    toggleTheme,
    theme,
  } = useWorkspace();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounced search against the real workspace index (client-side in demo
  // mode, /api/search in supabase mode).
  useEffect(() => {
    if (!isCommandPaletteOpen) return;
    const q = query.trim();
    if (!q) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await globalSearch(q);
      if (!cancelled) setResults(found);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isCommandPaletteOpen, globalSearch]);

  const activeResults = useMemo(() => {
    const q = query.trim();
    if (!q || results.query !== q) return EMPTY_RESULTS;
    return results;
  }, [query, results]);

  const close = () => setCommandPaletteOpen(false);

  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      {
        id: 'qa-task',
        group: 'Quick Actions',
        label: 'Create New Task',
        icon: <Plus size={15} className="text-primary" />,
        run: () => setTaskModalOpen(true),
      },
      {
        id: 'qa-dept',
        group: 'Quick Actions',
        label: 'Create New Department',
        icon: <Building2 size={15} className="text-indigo-400" />,
        run: () => setDeptModalOpen(true),
      },
      {
        id: 'qa-theme',
        group: 'Quick Actions',
        label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        icon: theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />,
        run: () => toggleTheme(),
      },
    ];

    for (const task of activeResults.tasks) {
      list.push({
        id: `task-${task.id}`,
        group: 'Tasks',
        label: task.title,
        detail: task.status,
        icon: <CheckSquare size={14} className="text-primary shrink-0" />,
        run: () => setSelectedTaskId(task.id),
      });
    }
    for (const proj of activeResults.projects) {
      list.push({
        id: `project-${proj.id}`,
        group: 'Projects',
        label: proj.name,
        icon: <Folder size={14} style={{ color: proj.color }} />,
        run: () => {
          setActiveDepartmentId(proj.departmentId);
          setActiveProjectId(proj.id);
          setActiveView('LIST');
        },
      });
    }
    for (const dept of activeResults.departments) {
      list.push({
        id: `dept-${dept.id}`,
        group: 'Departments',
        label: `${dept.name} Space`,
        detail: dept.code,
        icon: <Building2 size={14} style={{ color: dept.color }} />,
        run: () => {
          setActiveDepartmentId(dept.id);
          setActiveProjectId(null);
          setActiveView('DASHBOARD');
        },
      });
    }
    for (const doc of activeResults.documents) {
      list.push({
        id: `doc-${doc.id}`,
        group: 'Documents',
        label: doc.title,
        icon: <FileText size={14} className="text-sky-400 shrink-0" />,
        run: () => {
          setActiveDocId(doc.id);
          setActiveView('DOCS');
        },
      });
    }
    for (const person of activeResults.users) {
      list.push({
        id: `person-${person.id}`,
        group: 'People',
        label: person.name,
        detail: person.email,
        icon: <Users size={14} className="text-emerald-400 shrink-0" />,
        run: () => {
          if (person.id !== currentUser.id) {
            void startDirectMessage(person.id).catch(() => undefined);
          }
        },
      });
    }
    return list;
  }, [
    activeResults,
    theme,
    currentUser.id,
    setTaskModalOpen,
    setDeptModalOpen,
    toggleTheme,
    setSelectedTaskId,
    setActiveDepartmentId,
    setActiveProjectId,
    setActiveView,
    setActiveDocId,
    startDirectMessage,
  ]);

  const safeIndex = Math.min(selectedIndex, Math.max(0, items.length - 1));
  const hasQuery = query.trim().length > 0;
  const noResults = hasQuery && items.length === 3; // only quick actions

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
        return;
      }
      if (!isCommandPaletteOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setCommandPaletteOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[safeIndex];
        if (item) {
          close();
          item.run();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCommandPaletteOpen, setCommandPaletteOpen, items, safeIndex]);

  useEffect(() => {
    if (!isCommandPaletteOpen) return;
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [safeIndex, isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const groups: { name: string; entries: PaletteItem[] }[] = [];
  for (const item of items) {
    let bucket = groups.find((g) => g.name === item.group);
    if (!bucket) {
      bucket = { name: item.group, entries: [] };
      groups.push(bucket);
    }
    bucket.entries.push(item);
  }

  const groupIcon = (name: string) => {
    switch (name) {
      case 'Tasks':
        return <CheckSquare size={11} className="text-primary" />;
      case 'Projects':
        return <Folder size={11} className="text-amber-400" />;
      case 'Departments':
        return <Building2 size={11} className="text-indigo-400" />;
      case 'Documents':
        return <FileText size={11} className="text-sky-400" />;
      case 'People':
        return <Users size={11} className="text-emerald-400" />;
      default:
        return <Plus size={11} className="text-primary" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-background/80 backdrop-blur-md p-4 animate-fade-in"
    >
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-border gap-3">
          <Search size={18} className="text-primary shrink-0" />
          <input
            type="text"
            placeholder="Type a command, search tasks, projects, people, docs..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
            className="w-full bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={close}
            aria-label="Close command palette"
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results Stream */}
        <div ref={listRef} className="overflow-y-auto p-3 space-y-4 text-xs">
          {noResults && (
            <p className="text-sm text-muted-foreground px-2 py-4 text-center">
              No results for “{query.trim()}”
            </p>
          )}

          {groups.map((group) => (
            <div key={group.name}>
              <div className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                {groupIcon(group.name)}
                <span>
                  {group.name}
                  {group.name !== 'Quick Actions' ? ` (${group.entries.length})` : ''}
                </span>
              </div>
              <div className="space-y-1">
                {group.entries.map((item) => {
                  const index = items.indexOf(item);
                  const active = index === safeIndex;
                  return (
                    <button
                      key={item.id}
                      data-active={active}
                      onClick={() => {
                        close();
                        item.run();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-foreground transition-colors group ${
                        active ? 'bg-secondary' : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {item.icon}
                        <span className="truncate font-medium">{item.label}</span>
                      </div>
                      {item.detail ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground shrink-0">
                          {item.detail}
                        </span>
                      ) : item.group === 'Quick Actions' || item.group === 'Projects' ? (
                        <ChevronRight size={14} className="text-muted-foreground" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-secondary/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Navigate with ↑ ↓ keys, Enter to open</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
