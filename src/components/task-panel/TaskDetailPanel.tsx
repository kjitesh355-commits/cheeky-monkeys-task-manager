'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Archive,
  Check,
  ChevronDown,
  Copy,
  FileStack,
  History,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TaskStatus } from '../../types';
import { getSupabaseBrowser } from '../../supabase/client';
import { appMode } from '../../lib/env';
import { isModerator } from '../../lib/roles';
import { Avatar, ConfirmDialog } from './ui';
import { TaskPanelFields } from './TaskPanelFields';
import { TaskDescriptionEditor } from './TaskDescriptionEditor';
import { TaskSubtasks } from './TaskSubtasks';
import { TaskRelationships } from './TaskRelationships';
import { TaskUpdatesTab, TaskUpdatesComposer } from './TaskUpdatesTab';
import { TaskFilesTab } from './TaskFilesTab';
import { TaskActivityTab } from './TaskActivityTab';
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_LABELS } from './utils';

type Tab = 'UPDATES' | 'FILES' | 'ACTIVITY';

const STATUS_OPTIONS: TaskStatus[] = ['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'BLOCKED', 'COMPLETED'];

export const TaskDetailPanel: React.FC = () => {
  const {
    selectedTaskId,
    setSelectedTaskId,
    getTaskById,
    users,
    currentUser,
    updateTask,
    updateTaskStatus,
    duplicateTask,
    deleteTask,
    taskUpdates,
    taskFiles,
    taskActivity,
    refreshTask,
    loadTaskUpdates,
    loadTaskFiles,
    loadTaskActivity,
  } = useWorkspace();

  const [tab, setTab] = useState<Tab>('UPDATES');
  const [navStack, setNavStack] = useState<string[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [copied, setCopied] = useState(false);

  const moreRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  const task = useMemo(
    () => (selectedTaskId ? getTaskById(selectedTaskId) ?? null : null),
    [getTaskById, selectedTaskId]
  );

  /* --------------------------- deep link handling -------------------------- */

  useEffect(() => {
    const applyFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('task');
      if (id && id !== selectedTaskId) setSelectedTaskId(id);
      if (!id && selectedTaskId) setSelectedTaskId(null);
    };
    applyFromUrl();
    window.addEventListener('popstate', applyFromUrl);
    return () => window.removeEventListener('popstate', applyFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedTaskId) url.searchParams.set('task', selectedTaskId);
    else url.searchParams.delete('task');
    window.history.replaceState(window.history.state, '', url.toString());
  }, [selectedTaskId]);

  /* -------------------------------- shortcuts ------------------------------ */

  // Lock background scroll while the panel is open.
  useEffect(() => {
    if (!selectedTaskId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selectedTaskId]);

  const closePanel = useCallback(() => {
    setMoreOpen(false);
    setMoveOpen(false);
    setEditingTitle(false);
    setTab('UPDATES');
    setNavStack([]);
    setSelectedTaskId(null);
  }, [setSelectedTaskId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-confirm-dialog]')) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (moreOpen) {
        setMoreOpen(false);
        setMoveOpen(false);
        return;
      }
      closePanel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closePanel, moreOpen]);

  /* ------------------------------ click outside ---------------------------- */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
        setMoveOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* -------------------------------- realtime ------------------------------- */

  useEffect(() => {
    if (!selectedTaskId || appMode !== 'supabase') return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    try {
      const channel = supabase
        .channel(`task-panel:${selectedTaskId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `id=eq.${selectedTaskId}` }, () => {
          refreshTask(selectedTaskId);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_updates', filter: `task_id=eq.${selectedTaskId}` }, () => {
          loadTaskUpdates(selectedTaskId);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_files', filter: `task_id=eq.${selectedTaskId}` }, () => {
          loadTaskFiles(selectedTaskId);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_activity', filter: `task_id=eq.${selectedTaskId}` }, () => {
          loadTaskActivity(selectedTaskId);
        })
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch {
          /* noop */
        }
      };
    } catch {
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskId, appMode]);

  /* --------------------------------- data load ----------------------------- */

  useEffect(() => {
    if (!selectedTaskId) return;
    loadTaskUpdates(selectedTaskId);
    loadTaskFiles(selectedTaskId);
    loadTaskActivity(selectedTaskId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskId]);

  /* ------------------------------- navigation ------------------------------ */

  const navigateInPanel = useCallback(
    (taskId: string) => {
      if (taskId === selectedTaskId) return;
      setNavStack((stack) => [...stack, selectedTaskId!]);
      setSelectedTaskId(taskId);
    },
    [selectedTaskId, setSelectedTaskId]
  );

  const goBack = useCallback(() => {
    const prev = navStack[navStack.length - 1];
    if (prev) setSelectedTaskId(prev);
    setNavStack((stack) => stack.slice(0, -1));
  }, [navStack, setSelectedTaskId]);

  /* ------------------------------- title editing --------------------------- */

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (!task) return;
    if (!trimmed || trimmed === task.title) {
      setTitleDraft(task.title);
      setEditingTitle(false);
      return;
    }
    updateTask(task.id, { title: trimmed });
    setEditingTitle(false);
  };

  /* --------------------------------- actions -------------------------------- */

  const copyLink = async () => {
    if (!task) return;
    const url = `${window.location.origin}${window.location.pathname}?task=${task.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success('Task link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
    setMoreOpen(false);
  };

  const handleDuplicate = async () => {
    if (!task) return;
    setMoreOpen(false);
    const copy = await duplicateTask(task.id);
    if (copy) {
      toast.success('Task duplicated');
      navigateInPanel(copy.id);
    } else {
      toast.error('Could not duplicate task');
    }
  };

  const handleArchive = async () => {
    if (!task) return;
    setMoreOpen(false);
    await updateTask(task.id, { archived: !task.archived });
    toast.success(task.archived ? 'Task restored' : 'Task archived');
    if (!task.archived) closePanel();
  };

  const handleDelete = async () => {
    if (!task) return;
    await deleteTask(task.id);
    setConfirmDelete(false);
    closePanel();
    toast.success('Task deleted');
  };

  /* --------------------------------- render --------------------------------- */

  if (!selectedTaskId || !task) return null;

  const updatesCount = taskUpdates.length;
  const filesCount = taskFiles.length;
  const activityCount = taskActivity.length;

  const tabs: { key: Tab; label: string; icon: typeof MessageSquare; count: number }[] = [
    { key: 'UPDATES', label: 'Updates', icon: MessageSquare, count: updatesCount },
    { key: 'FILES', label: 'Files', icon: FileStack, count: filesCount },
    { key: 'ACTIVITY', label: 'Activity', icon: History, count: activityCount },
  ];

  const canModerate = isModerator(currentUser.role);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close task panel"
        onClick={closePanel}
        className="absolute inset-0 bg-background/60 backdrop-blur-sm animate-fade-in cursor-default"
      />

      {/* panel */}
      <aside
        role="dialog"
        aria-label={`Task detail: ${task.title}`}
        className="relative w-full md:w-[70%] lg:w-1/2 xl:w-1/2 xl:max-w-[720px] h-full bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right overflow-hidden"
      >
        {/* ---------- sticky header ---------- */}
        <header className="shrink-0 border-b border-border bg-card/95 backdrop-blur px-4 pt-3 pb-3 sm:px-5">
          <div className="flex items-center gap-2">
            {navStack.length > 0 && (
              <button
                type="button"
                onClick={goBack}
                title="Back to previous task"
                className="p-1.5 -ml-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
            )}

            <span className="inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide shrink-0">
              <span className={`mr-1.5 w-1.5 h-1.5 rounded-full ${task.status === 'COMPLETED' ? 'bg-emerald-500' : task.status === 'BLOCKED' ? 'bg-rose-500' : 'bg-primary'}`} />
              {STATUS_LABELS[task.status]}
            </span>

            <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ${PRIORITY_COLORS[task.priority]}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>

            <span className="text-[10px] text-muted-foreground font-mono truncate">
              #{task.id.slice(0, 8)}
            </span>

            <div className="ml-auto flex items-center gap-1">
              {/* more actions */}
              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen((v) => !v);
                    setMoveOpen(false);
                  }}
                  title="More actions"
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MoreHorizontal size={16} />
                </button>

                {moreOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-xl p-1.5 z-40 animate-fade-in">
                    {!moveOpen ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setMoreOpen(false);
                            setTitleDraft(task.title);
                            setEditingTitle(true);
                            setTimeout(() => titleRef.current?.focus(), 50);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                        >
                          <Pencil size={13} className="text-muted-foreground" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={handleDuplicate}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                        >
                          <Copy size={13} className="text-muted-foreground" /> Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => setMoveOpen(true)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                        >
                          <ChevronDown size={13} className="text-muted-foreground" /> Move to…
                          <span className="ml-auto text-muted-foreground">›</span>
                        </button>
                        <button
                          type="button"
                          onClick={copyLink}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                        >
                          <Link2 size={13} className="text-muted-foreground" />
                          {copied ? 'Copied!' : 'Copy link'}
                        </button>
                        <div className="h-px bg-border my-1" />
                        <button
                          type="button"
                          onClick={handleArchive}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                        >
                          <Archive size={13} className="text-muted-foreground" />
                          {task.archived ? 'Restore' : 'Archive'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMoreOpen(false);
                            setConfirmDelete(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 size={13} /> Delete task
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between px-2.5 py-1.5">
                          <button
                            type="button"
                            onClick={() => setMoveOpen(false)}
                            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <ArrowLeft size={11} /> Back
                          </button>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Move to</span>
                        </div>
                        {STATUS_OPTIONS.map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={async () => {
                              setMoreOpen(false);
                              setMoveOpen(false);
                              if (status !== task.status) {
                                await updateTaskStatus(task.id, status);
                                toast.success(`Moved to ${STATUS_LABELS[status]}`);
                              }
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium hover:bg-secondary transition-colors ${
                              status === task.status ? 'text-primary' : 'text-foreground'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${status === task.status ? 'bg-primary' : 'bg-border'}`} />
                            {STATUS_LABELS[status]}
                            {status === task.status && <Check size={12} className="ml-auto" />}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={closePanel}
                title="Close (Esc)"
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* title */}
          <div className="mt-2 flex items-start gap-2.5">
            <div className="pt-0.5">
              <Avatar user={users.find((u) => u.id === task.assigneeIds[0])} size={26} />
            </div>
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  ref={titleRef}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitTitle();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setTitleDraft(task.title);
                      setEditingTitle(false);
                    }
                  }}
                  autoFocus
                  className="w-full text-lg font-bold text-foreground bg-transparent border-b border-primary focus:outline-none pb-0.5"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(task.title);
                    setEditingTitle(true);
                  }}
                  className="group text-left w-full"
                  title="Click to edit title"
                >
                  <h2 className="text-lg font-bold text-foreground leading-snug break-words group-hover:text-primary transition-colors">
                    {task.title}
                    <Pencil size={12} className="inline ml-1.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </h2>
                </button>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {task.dueDate && (
                  <span className="text-[10px] font-semibold text-muted-foreground">Due {task.dueDate.slice(0, 10)}</span>
                )}
                {task.tags?.map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase">
                    {tag}
                  </span>
                ))}
                {task.archived && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[9px] font-bold uppercase">
                    Archived
                  </span>
                )}
              </div>
            </div>
            {canModerate && task.status !== 'COMPLETED' && (
              <button
                type="button"
                onClick={() => updateTaskStatus(task.id, 'COMPLETED')}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-700 text-[11px] font-bold transition-colors"
              >
                <Check size={13} /> Complete
              </button>
            )}
          </div>
        </header>

        {/* ---------- scrollable body ---------- */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-5 space-y-5">
            <TaskPanelFields task={task} />
            <TaskDescriptionEditor key={task.id} task={task} />
            <div className="pt-3 border-t border-border/60">
              <TaskSubtasks task={task} />
            </div>
            <div className="pt-3 border-t border-border/60">
              <TaskRelationships task={task} onNavigate={navigateInPanel} />
            </div>

            <div className="pt-3 border-t border-border/60">
              {tab === 'UPDATES' && <TaskUpdatesTab task={task} />}
              {tab === 'FILES' && <TaskFilesTab task={task} />}
              {tab === 'ACTIVITY' && <TaskActivityTab task={task} />}
            </div>

            <div className="h-2" />
          </div>
        </div>

        {/* ---------- sticky footer: composer + tabs ---------- */}
        <footer className="shrink-0 border-t border-border bg-card/95 backdrop-blur px-4 sm:px-5 pt-2.5 pb-2">
          {tab === 'UPDATES' && (
            <div className="mb-2.5">
              <TaskUpdatesComposer task={task} />
            </div>
          )}

          <nav className="flex items-center gap-1">
            {tabs.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                    active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${active ? 'bg-primary/20' : 'bg-secondary'}`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </footer>

        <ConfirmDialog
          open={confirmDelete}
          title="Delete this task?"
          message={
            <>
              <span className="font-semibold text-foreground">{task.title}</span> and all of its updates, files and
              activity history will be permanently removed. This cannot be undone.
            </>
          }
          confirmLabel="Delete task"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      </aside>
    </div>
  );
};
