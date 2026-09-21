'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    tasks,
    projects,
    departments,
    documents,
    setActiveDepartmentId,
    setActiveProjectId,
    setActiveView,
    setSelectedTaskId,
    setTaskModalOpen,
    setDeptModalOpen,
    toggleTheme,
    theme,
  } = useWorkspace();

  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const filteredTasks = tasks.filter((t) => t.title.toLowerCase().includes(query.toLowerCase())).slice(0, 4);
  const filteredProjects = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3);
  const filteredDepts = departments.filter((d) => d.name.toLowerCase().includes(query.toLowerCase())).slice(0, 3);
  const filteredDocs = documents.filter((doc) => doc.title.toLowerCase().includes(query.toLowerCase())).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-background/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-border gap-3">
          <Search size={18} className="text-primary shrink-0" />
          <input
            type="text"
            placeholder="Type a command, search tasks, projects, docs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results Stream */}
        <div className="overflow-y-auto p-3 space-y-4 text-xs">
          {/* QUICK ACTIONS */}
          <div>
            <div className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Quick Actions
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setCommandPaletteOpen(false);
                  setTaskModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary text-foreground font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Plus size={15} className="text-primary" />
                  <span>Create New Task</span>
                </div>
                <kbd className="px-1.5 py-0.5 bg-secondary text-[10px] font-mono rounded text-muted-foreground">N</kbd>
              </button>

              <button
                onClick={() => {
                  setCommandPaletteOpen(false);
                  setDeptModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary text-foreground font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 size={15} className="text-indigo-400" />
                  <span>Create New Department</span>
                </div>
              </button>

              <button
                onClick={() => {
                  toggleTheme();
                  setCommandPaletteOpen(false);
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary text-foreground font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />}
                  <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
                </div>
              </button>
            </div>
          </div>

          {/* TASKS */}
          {filteredTasks.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Tasks ({filteredTasks.length})
              </div>
              <div className="space-y-1">
                {filteredTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary text-foreground transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <CheckSquare size={14} className="text-primary shrink-0" />
                      <span className="truncate font-medium">{task.title}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                      {task.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PROJECTS */}
          {filteredProjects.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Projects ({filteredProjects.length})
              </div>
              <div className="space-y-1">
                {filteredProjects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setActiveDepartmentId(proj.departmentId);
                      setActiveProjectId(proj.id);
                      setActiveView('LIST');
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Folder size={14} style={{ color: proj.color }} />
                      <span className="truncate font-medium">{proj.name}</span>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DEPARTMENTS */}
          {filteredDepts.length > 0 && (
            <div>
              <div className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Departments
              </div>
              <div className="space-y-1">
                {filteredDepts.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => {
                      setActiveDepartmentId(dept.id);
                      setActiveProjectId(null);
                      setActiveView('DASHBOARD');
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 size={14} style={{ color: dept.color }} />
                      <span className="font-medium">{dept.name} Space</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{dept.code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-secondary/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Navigate with ↑ ↓ keys</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
