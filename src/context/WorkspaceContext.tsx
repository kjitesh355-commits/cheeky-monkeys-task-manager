'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  User,
  Department,
  Project,
  Task,
  TaskStatus,
  TaskPriority,
  ViewMode,
  TaskScope,
  Document,
  DocumentFolder,
  Channel,
  Message,
  Notification,
  ActivityLog,
  Subtask,
  TaskUpdate,
  TaskFile,
  TaskActivity,
  TaskRelations,
  Team,
} from '../types';
import { parseRoute, pathForView, type RouteState } from '../lib/routes';
import {
  INITIAL_USERS,
  INITIAL_DEPARTMENTS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_DOCUMENTS,
  INITIAL_FOLDERS,
  INITIAL_CHANNELS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACTIVITY_LOGS,
} from '../lib/initial-data';
import { appMode } from '../lib/env';
import { getSupabaseBrowser } from '../supabase/client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export interface OnboardingStep {
  id: string;
  number: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
}

interface WorkspaceContextType {
  currentUser: User;
  users: User[];
  departments: Department[];
  projects: Project[];
  tasks: Task[];
  scopedTasks: Task[];
  getTaskById: (id: string) => Task | undefined;
  documents: Document[];
  folders: DocumentFolder[];
  docsLoaded: boolean;
  workspaceLoaded: boolean;
  workspaceError: string | null;
  retryWorkspaceLoad: () => void;
  channels: Channel[];
  messages: Message[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  taskUpdates: TaskUpdate[];
  taskFiles: TaskFile[];
  taskActivity: TaskActivity[];
  taskRelations: TaskRelations | null;
  onboardingSteps: OnboardingStep[];
  
  // Selection State
  activeDepartmentId: string | null;
  activeProjectId: string | null;
  activeView: ViewMode;
  taskScope: TaskScope;
  selectedTaskId: string | null;
  activeChannelId: string | null;
  activeDocId: string | null;
  
  // UI & Dialog States
  theme: 'dark' | 'light';
  searchQuery: string;
  isSidebarCollapsed: boolean;
  isCommandPaletteOpen: boolean;
  isTaskModalOpen: boolean;
  taskModalDueDate: string | null;
  isDeptModalOpen: boolean;
  deptEditId: string | null;
  isProjectModalOpen: boolean;
  isInviteOpen: boolean;
  isProfileOpen: boolean;
  isHelpOpen: boolean;
  isChannelModalOpen: boolean;
  isDmModalOpen: boolean;
  isNotificationOpen: boolean;
  filterStatus: TaskStatus | 'ALL';
  filterPriority: TaskPriority | 'ALL';

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setActiveDepartmentId: (id: string | null) => void;
  setActiveProjectId: (id: string | null) => void;
  setActiveView: (view: ViewMode) => void;
  setTaskScope: (scope: TaskScope) => void;
  setSelectedTaskId: (id: string | null) => void;
  setActiveChannelId: (id: string | null) => void;
  setActiveDocId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: TaskStatus | 'ALL') => void;
  setFilterPriority: (priority: TaskPriority | 'ALL') => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setTaskModalOpen: (open: boolean, dueDate?: string) => void;
  setDeptModalOpen: (open: boolean) => void;
  setDeptEditId: (id: string | null) => void;
  setProjectModalOpen: (open: boolean) => void;
  setInviteOpen: (open: boolean) => void;
  setProfileOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setChannelModalOpen: (open: boolean) => void;
  setDmModalOpen: (open: boolean) => void;
  startDirectMessage: (otherUserId: string) => Promise<Channel>;
  setNotificationOpen: (open: boolean) => void;
  toggleOnboardingStep: (id: string) => void;

  // Data Mutations
  addTask: (task: Partial<Task>) => Promise<Task | void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  duplicateTask: (taskId: string) => Promise<Task | null>;
  refreshTask: (taskId: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  updateSubtask: (subtaskId: string, updates: Partial<Subtask>) => Promise<void>;
  deleteSubtask: (subtaskId: string) => Promise<void>;
  addComment: (taskId: string, content: string) => Promise<void>;
  addDepartment: (department: Partial<Department>) => Promise<Department | void>;
  updateDepartment: (id: string, updates: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  addDepartmentMember: (departmentId: string, userId: string) => Promise<void>;
  removeDepartmentMember: (departmentId: string, userId: string) => Promise<void>;
  addTeam: (departmentId: string, name: string, leadId?: string | null) => Promise<Team>;
  removeTeam: (departmentId: string, teamId: string) => Promise<void>;
  addProject: (project: Partial<Project>) => Promise<Project | void>;
  addDocument: (doc: Partial<Document>) => Promise<Document | void>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addFolder: (name: string) => Promise<DocumentFolder | void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  sendMessage: (channelId: string, content: string) => Promise<void>;
  addChannel: (channelData: { name: string; type?: Channel['type']; departmentId?: string }) => Promise<Channel>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  globalSearch: (q: string) => Promise<{
    query: string;
    tasks: Task[];
    projects: Project[];
    departments: Department[];
    documents: Document[];
    messages: Message[];
    users: User[];
  }>;
  
  // Task Updates (Comments/Discussion)
  loadTaskUpdates: (taskId: string) => Promise<void>;
  addTaskUpdate: (taskId: string, content: string, parentUpdateId?: string, mentions?: string[]) => Promise<void>;
  updateTaskUpdate: (updateId: string, content: string) => Promise<void>;
  deleteTaskUpdate: (updateId: string) => Promise<void>;
  addTaskUpdateReaction: (updateId: string, reaction: string) => Promise<void>;
  
  // Task Files
  loadTaskFiles: (taskId: string) => Promise<void>;
  uploadTaskFile: (taskId: string, file: File, onProgress?: (percent: number) => void) => Promise<TaskFile | void>;
  deleteTaskFile: (fileId: string) => Promise<void>;
  
  // Task Activity
  loadTaskActivity: (taskId: string) => Promise<void>;
  logTaskActivity: (taskId: string, actionType: string, actionData?: Record<string, any>) => Promise<void>;

  // Task Relationships (parent, dependencies)
  loadTaskRelations: (taskId: string) => Promise<void>;
  clearTaskRelations: () => void;
  addTaskDependency: (taskId: string, dependsOnTaskId: string) => Promise<void>;
  removeTaskDependency: (taskId: string, dependsOnTaskId: string) => Promise<void>;
  setParentTask: (taskId: string, parentTaskId: string | null) => Promise<void>;
  
  // Data Loading
  loadTasks: (params?: { projectId?: string; departmentId?: string; status?: string; assigneeId?: string }) => Promise<boolean>;
  loadProjects: (params?: { departmentId?: string; status?: string }) => Promise<boolean>;
  loadDepartments: () => Promise<boolean>;
  loadUsers: () => Promise<boolean>;
  loadDocuments: (params?: { departmentId?: string; projectId?: string; category?: string }) => Promise<boolean>;
  loadFolders: () => Promise<boolean>;
  loadChannels: (params?: { departmentId?: string }) => Promise<boolean>;
  loadNotifications: () => Promise<boolean>;

  // Current user
  updateCurrentUser: (updates: Partial<User>) => Promise<User>;
  inviteMember: (payload: {
    email: string;
    name?: string;
    role?: string;
    departmentId?: string | null;
  }) => Promise<{ success: boolean; user?: User; message?: string }>;
  
  // Demo mode flag
  isDemoMode: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const isDemoMode = appMode !== 'supabase';

async function apiGet(endpoint: string, params?: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const url = `/api/${endpoint}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost(endpoint: string, body: any) {
  const res = await fetch(`/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPatch(endpoint: string, body: any) {
  const res = await fetch(`/api/${endpoint}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete(endpoint: string, body?: unknown) {
  const res = await fetch(`/api/${endpoint}`, {
    method: 'DELETE',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [folders, setFolders] = useState<DocumentFolder[]>(INITIAL_FOLDERS);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [initialLoadKey, setInitialLoadKey] = useState(0);
  // Supabase mode only fetches workspace data for signed-in users; the provider
  // is mounted globally (including on /login and /signup), so loads must wait
  // for a session instead of firing unauthenticated 401s.
  const [authed, setAuthed] = useState(isDemoMode);
  const [channels, setChannels] = useState<Channel[]>(isDemoMode ? INITIAL_CHANNELS : []);
  const [messages, setMessages] = useState<Message[]>(isDemoMode ? INITIAL_MESSAGES : []);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  // Demo-only bookkeeping so data-derived notifications honor read/dismiss.
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS);
  const [taskUpdates, setTaskUpdates] = useState<TaskUpdate[]>([]);
  const [taskFiles, setTaskFiles] = useState<TaskFile[]>([]);
  const [taskActivity, setTaskActivity] = useState<TaskActivity[]>([]);
  const [taskRelations, setTaskRelations] = useState<TaskRelations | null>(null);

  const [theme, setThemeState] = useState<'dark' | 'light'>('light');

  // Navigation States
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
  const route = useMemo(() => parseRoute(pathname, searchParams.toString()), [pathname, searchParams]);

  const [activeDepartmentId, setActiveDepartmentIdState] = useState<string | null>(() => route?.deptId ?? null);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => route?.projectId ?? null);
  const [activeView, setActiveViewState] = useState<ViewMode>(() => route?.view ?? 'DASHBOARD');
  const [taskScope, setTaskScopeState] = useState<TaskScope>(() => route?.scope ?? 'all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  // URL <-> state navigation machinery.
  // State updates instantly (no loading flash), the URL is pushed right after,
  // batched so handlers that call several setters produce a single navigation.
  const navStateRef = useRef({ view: activeView, deptId: activeDepartmentId, projectId: activeProjectId, scope: taskScope });
  navStateRef.current = { view: activeView, deptId: activeDepartmentId, projectId: activeProjectId, scope: taskScope };
  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;
  const pendingNavRef = useRef<Partial<RouteState> | null>(null);
  const navTargetRef = useRef<string | null>(null);
  const navScheduledRef = useRef(false);
  const prevPathRef = useRef(currentPath);

  const flushNavigation = useCallback(() => {
    const pending = pendingNavRef.current;
    pendingNavRef.current = null;
    if (!pending) return;
    const merged: RouteState = {
      view: pending.view ?? navStateRef.current.view,
      deptId: pending.deptId !== undefined ? pending.deptId : navStateRef.current.deptId,
      projectId: pending.projectId !== undefined ? pending.projectId : navStateRef.current.projectId,
      scope: pending.scope ?? navStateRef.current.scope,
    };
    let path = pathForView(merged.view, merged);
    // Keep an open task panel deep-link across navigations.
    try {
      const openTask = new URLSearchParams(window.location.search).get('task');
      if (openTask && !path.includes('task=')) {
        path += `${path.includes('?') ? '&' : '?'}task=${encodeURIComponent(openTask)}`;
      }
    } catch {
      // no window during SSR
    }
    if (path === currentPathRef.current) return;
    navTargetRef.current = path;
    router.push(path, { scroll: false });
  }, [router]);

  const queueNavigation = useCallback(
    (delta: Partial<RouteState>) => {
      pendingNavRef.current = { ...(pendingNavRef.current ?? {}), ...delta };
      if (navScheduledRef.current) return;
      navScheduledRef.current = true;
      queueMicrotask(() => {
        navScheduledRef.current = false;
        flushNavigation();
      });
    },
    [flushNavigation]
  );

  const setActiveView = (view: ViewMode) => {
    setActiveViewState(view);
    queueNavigation({ view });
  };

  const setActiveDepartmentId = (id: string | null) => {
    setActiveDepartmentIdState(id);
    if (id) {
      setTaskScopeState('all');
      queueNavigation({ deptId: id, scope: 'all' });
    } else {
      queueNavigation({ deptId: id });
    }
  };

  const setActiveProjectId = (projectId: string | null) => {
    setActiveProjectIdState(projectId);
    queueNavigation({ projectId });
  };

  const setTaskScope = (scope: TaskScope) => {
    setTaskScopeState(scope);
    queueNavigation({ scope });
  };

  // Apply URL -> state on real navigations (sidebar links, back/forward, direct load).
  if (prevPathRef.current !== currentPath) {
    prevPathRef.current = currentPath;
    navTargetRef.current = null;
  }
  if (!navTargetRef.current && !pendingNavRef.current && route) {
    if (route.view !== activeView) setActiveViewState(route.view);
    if (route.deptId !== activeDepartmentId) setActiveDepartmentIdState(route.deptId);
    if (route.projectId !== activeProjectId) setActiveProjectIdState(route.projectId);
    if (route.scope !== taskScope) setTaskScopeState(route.scope);
  }

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalDueDate, setTaskModalDueDate] = useState<string | null>(null);
  // Opening with a dueDate prefills the create form (calendar day clicks).
  const setTaskModalOpen = useCallback((open: boolean, dueDate?: string) => {
    setIsTaskModalOpen(open);
    setTaskModalDueDate(open ? dueDate ?? null : null);
  }, []);
  const [isDeptModalOpen, setDeptModalOpen] = useState(false);
  const [deptEditId, setDeptEditId] = useState<string | null>(null);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isChannelModalOpen, setChannelModalOpen] = useState(false);
  const [isDmModalOpen, setDmModalOpen] = useState(false);
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'ALL'>('ALL');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'ALL'>('ALL');

  // Onboarding Checklist
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([
    { id: 'ob-1', number: '01', title: 'Complete your profile', description: 'Review and complete your profile information.', completed: true },
    { id: 'ob-2', number: '02', title: 'Create your first department', description: 'Structure your organization with custom departments.', completed: false },
    { id: 'ob-3', number: '03', title: 'Invite team members', description: 'Collaborate by inviting real team members to WORKSPACE.', completed: false },
    { id: 'ob-4', number: '04', title: 'Create your first project', description: 'Group tasks and goals inside a department project.', completed: false },
    { id: 'ob-5', number: '05', title: 'Create your first task', description: 'Start organizing work and assigning deadlines.', completed: false },
  ]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const toggleOnboardingStep = (id: string) => {
    setOnboardingSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, completed: !step.completed } : step))
    );
  };

  const logActivity = (action: string, targetType: ActivityLog['targetType'], targetTitle: string, details?: string) => {
    const newLog: ActivityLog = {
      id: `act-${Date.now()}`,
      userId: currentUser.id,
      action,
      targetType,
      targetTitle,
      details,
      createdAt: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev]);
  };

  // Data Loading Functions. Each returns true on success so the initial-load
  // effect can tell "workspace is empty" apart from "workspace failed to load".
  const loadTasks = useCallback(async (params?: { projectId?: string; departmentId?: string; status?: string; assigneeId?: string }): Promise<boolean> => {
    if (isDemoMode) return true;
    try {
      const data = await apiGet('tasks', { ...(params as Record<string, string>), includeArchived: 'true' });
      setTasks(data);
      return true;
    } catch (error) {
      console.error('Failed to load tasks:', error);
      return false;
    }
  }, []);

  const loadProjects = useCallback(async (params?: { departmentId?: string; status?: string }): Promise<boolean> => {
    if (isDemoMode) return true;
    try {
      const data = await apiGet('projects', params as Record<string, string>);
      setProjects(data);
      return true;
    } catch (error) {
      console.error('Failed to load projects:', error);
      return false;
    }
  }, []);

  const loadDepartments = useCallback(async (): Promise<boolean> => {
    if (isDemoMode) return true;
    try {
      const data = await apiGet('departments');
      setDepartments(data);
      return true;
    } catch (error) {
      console.error('Failed to load departments:', error);
      return false;
    }
  }, []);

  const loadUsers = useCallback(async (): Promise<boolean> => {
    // Loads in demo too: the server-side demo store keeps invited teammates
    // alive across page reloads (all other demo state stays session-local).
    try {
      const data = await apiGet('users');
      if (Array.isArray(data) && data.length) setUsers(data);
      return true;
    } catch (error) {
      console.error('Failed to load users:', error);
      return false;
    }
  }, []);

  const loadDocuments = useCallback(async (params?: { departmentId?: string; projectId?: string; category?: string }): Promise<boolean> => {
    try {
      const data = await apiGet('documents', params as Record<string, string>);
      if (Array.isArray(data)) setDocuments(data);
      return true;
    } catch (error) {
      console.error('Failed to load documents:', error);
      return false;
    } finally {
      setDocsLoaded(true);
    }
  }, []);

  const loadFolders = useCallback(async (): Promise<boolean> => {
    try {
      const data = await apiGet('folders');
      if (Array.isArray(data)) setFolders(data);
      return true;
    } catch (error) {
      console.error('Failed to load folders:', error);
      return false;
    }
  }, []);

  const loadChannels = useCallback(async (params?: { departmentId?: string }): Promise<boolean> => {
    try {
      if (isDemoMode) {
        // Demo stores channels/messages server-side too (so they survive reloads).
        const [channelRows, messageRows] = await Promise.all([
          apiGet('channels', params as Record<string, string>) as Promise<(Channel & { messages?: Message[] })[]>,
          apiGet('messages') as Promise<Message[]>,
        ]);
        if (Array.isArray(channelRows) && channelRows.length) {
          setChannels((prev) => {
            const byId = new Map(prev.map((c) => [c.id, c]));
            for (const c of channelRows) byId.set(c.id, c);
            return Array.from(byId.values());
          });
        }
        if (Array.isArray(messageRows) && messageRows.length) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            return [...prev, ...messageRows.filter((m) => !seen.has(m.id))];
          });
        }
        return true;
      }

      const data = (await apiGet('channels', params as Record<string, string>)) as Array<Channel & { messages?: Message[] }>;
      setChannels((prev) => {
        const byId = new Map(prev.map((c) => [c.id, c]));
        for (const c of data) byId.set(c.id, c);
        return Array.from(byId.values());
      });
      // Channels are returned with their message history nested — seed the
      // flat messages state so ChatView can render without a second fetch.
      const flat: Message[] = data.flatMap((c) => c.messages || []);
      if (flat.length) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...flat.filter((m) => !seen.has(m.id))];
        });
      }
      return true;
    } catch (error) {
      console.error('Failed to load channels:', error);
      return false;
    }
  }, []);

  const loadNotifications = useCallback(async (): Promise<boolean> => {
    try {
      const data = await apiGet('notifications');
      if (Array.isArray(data)) setNotifications(data);
      return true;
    } catch (error) {
      console.error('Failed to load notifications:', error);
      return false;
    }
  }, []);

  // First-load orchestration: tracks success/failure so views can show a
  // loading gate instead of flashing empty states, and a banner on failure.
  const runInitialLoad = useCallback(async () => {
    const loads: Promise<boolean>[] = [loadUsers(), loadChannels(), loadDocuments(), loadFolders(), loadNotifications()];
    if (!isDemoMode) loads.push(loadTasks(), loadProjects(), loadDepartments());
    const results = await Promise.all(loads);
    const ok = results.every(Boolean);
    setWorkspaceError(ok ? null : 'Workspace data could not be loaded.');
    setWorkspaceLoaded(true);
  }, [loadTasks, loadProjects, loadDepartments, loadUsers, loadDocuments, loadFolders, loadChannels, loadNotifications]);

  const retryWorkspaceLoad = useCallback(() => {
    setWorkspaceError(null);
    setWorkspaceLoaded(false);
    setInitialLoadKey((k) => k + 1);
  }, []);

  // Track the auth session so data loads only run when signed in (supabase
  // mode). Demo mode is always considered authenticated.
  useEffect(() => {
    if (isDemoMode) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    void supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => setAuthed(!!session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setAuthed(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Resolve the signed-in user's real profile once users arrive. State starts
  // as the demo seed user; without this every mine-scoped query (assignee
  // filters, "My Tasks", planner, AI context) matches against a wrong id.
  useEffect(() => {
    if (isDemoMode || !authed || !users.length) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!user) return;
      const profile = users.find((u) => u.id === user.id);
      if (profile) setCurrentUser(profile);
    });
  }, [authed, users]);

  // Load initial data once authenticated. Chat stays live: supabase mode
  // streams via realtime, demo mode polls the shared demo store (also picks
  // up other tabs).
  useEffect(() => {
    if (!authed) return;
    runInitialLoad();
    if (!isDemoMode) {
      const supabase = getSupabaseBrowser();
      const chatRT = supabase
        .channel('workspace-chat-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          loadChannels();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, () => {
          loadChannels();
        })
        .subscribe();

      // Notifications have no realtime channel — poll them.
      const notifPoll = setInterval(() => loadNotifications(), 8000);
      return () => {
        supabase.removeChannel(chatRT);
        clearInterval(notifPoll);
      };
    }

    const chatPoll = setInterval(() => {
      loadChannels();
      loadNotifications();
    }, 8000);
    return () => clearInterval(chatPoll);
  }, [authed, runInitialLoad, loadChannels, loadNotifications, initialLoadKey]);

  // Demo mode: derive notifications from real workspace state (overdue and
  // due-today tasks, plus a one-time workspace welcome). Mirrors what the
  // backend would generate in supabase mode.
  const demoDerivedNotifs = useMemo<Notification[]>(() => {
    if (!isDemoMode) return [];
    const today = new Date().toISOString().split('T')[0];
    const derived: Notification[] = [];

    if (!dismissedNotifIds.includes('notif-welcome')) {
      derived.push({
        id: 'notif-welcome',
        userId: currentUser.id,
        title: 'WELCOME',
        message: 'Welcome to WORKSPACE! Create a department to get your team started.',
        type: 'SYSTEM',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    for (const t of tasks) {
      if (t.archived || !t.dueDate || t.status === 'COMPLETED' || t.status === 'APPROVED') continue;
      const id = `notif-due-${t.id}`;
      if (dismissedNotifIds.includes(id)) continue;
      if (t.dueDate < today) {
        derived.push({
          id,
          userId: currentUser.id,
          title: 'OVERDUE',
          message: `"${t.title}" was due ${t.dueDate}.`,
          type: 'DUE_DATE',
          read: false,
          taskId: t.id,
          createdAt: t.dueDate,
        });
      } else if (t.dueDate === today) {
        derived.push({
          id,
          userId: currentUser.id,
          title: 'DUE TODAY',
          message: `"${t.title}" is due today.`,
          type: 'DUE_DATE',
          read: false,
          taskId: t.id,
          createdAt: today,
        });
      }
    }

    return derived;
  }, [tasks, currentUser.id, dismissedNotifIds]);

  // What the notification drawer shows: derived demo notifications merged with
  // locally created ones, honoring read/dismiss state.
  const visibleNotifications = useMemo(() => {
    if (!isDemoMode) return notifications;
    const locals = notifications.filter((n) => !dismissedNotifIds.includes(n.id));
    return [...demoDerivedNotifs, ...locals].map((n) =>
      readNotifIds.includes(n.id) ? { ...n, read: true } : n
    );
  }, [notifications, demoDerivedNotifs, dismissedNotifIds, readNotifIds]);

  // Data Mutations
  const addTask = async (newTaskData: Partial<Task>) => {
    const defaultDept = activeDepartmentId || departments[0]?.id || '';
    const defaultProj = activeProjectId || projects.find((p) => p.departmentId === defaultDept)?.id || '';

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskData.title || 'New Task',
      description: newTaskData.description || '',
      status: newTaskData.status || 'TO_DO',
      priority: newTaskData.priority || 'MEDIUM',
      projectId: newTaskData.projectId || defaultProj,
      departmentId: newTaskData.departmentId || defaultDept,
      assigneeIds: newTaskData.assigneeIds && newTaskData.assigneeIds.length > 0 ? newTaskData.assigneeIds : [currentUser.id],
      createdById: currentUser.id,
      startDate: newTaskData.startDate || new Date().toISOString().split('T')[0],
      dueDate: newTaskData.dueDate || null,
      tags: newTaskData.tags || ['General'],
      subtasks: newTaskData.subtasks || [],
      commentsCount: 0,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isDemoMode) {
      setTasks((prev) => [newTask, ...prev]);
      logActivity('Created Task', 'TASK', newTask.title);
      setOnboardingSteps((prev) => prev.map((s) => (s.id === 'ob-5' ? { ...s, completed: true } : s)));
      return newTask;
    }

    try {
      const created = await apiPost('tasks', newTask);
      setTasks((prev) => [created, ...prev]);
      logActivity('Created Task', 'TASK', created.title);
      setOnboardingSteps((prev) => prev.map((s) => (s.id === 'ob-5' ? { ...s, completed: true } : s)));
      return created;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const isDone = status === 'COMPLETED';
    const newProgress = isDone ? 100 : status === 'IN_PROGRESS' ? 50 : 0;

    if (isDemoMode) {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            return { ...t, status, progress: newProgress, updatedAt: new Date().toISOString() };
          }
          return t;
        })
      );
      const targetTask = tasks.find((t) => t.id === taskId);
      if (targetTask) {
        logActivity('Updated Status', 'TASK', targetTask.title, `Moved status to ${status}`);
      }
      return;
    }

    try {
      await apiPatch(`tasks/${taskId}`, { status, progress: newProgress });
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            return { ...t, status, progress: newProgress, updatedAt: new Date().toISOString() };
          }
          return t;
        })
      );
      const targetTask = tasks.find((t) => t.id === taskId);
      if (targetTask) {
        logActivity('Updated Status', 'TASK', targetTask.title, `Moved status to ${status}`);
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (isDemoMode) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
      );
      return;
    }

    try {
      const updated = await apiPatch(`tasks/${taskId}`, updates);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updated, updatedAt: new Date().toISOString() } : t))
      );
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    
    if (isDemoMode) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTaskId === taskId) setSelectedTaskId(null);
      if (targetTask) {
        logActivity('Deleted Task', 'TASK', targetTask.title);
      }
      return;
    }

    try {
      await apiDelete(`tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTaskId === taskId) setSelectedTaskId(null);
      if (targetTask) {
        logActivity('Deleted Task', 'TASK', targetTask.title);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  /** Re-fetch a single task (with subtasks/assignees) and merge it into state. */
  const refreshTask = useCallback(async (taskId: string) => {
    if (isDemoMode) return;
    try {
      const fresh = await apiGet(`tasks/${taskId}`);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...fresh } : t)));
    } catch (error) {
      console.error('Failed to refresh task:', error);
    }
  }, []);

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    const targetSub = targetTask?.subtasks.find((s) => s.id === subtaskId);
    if (!targetSub) return;

    if (isDemoMode) {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            const updatedSubtasks = t.subtasks.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s));
            const completedCount = updatedSubtasks.filter((s) => s.completed).length;
            const totalCount = updatedSubtasks.length;
            const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : t.progress;

            return {
              ...t,
              subtasks: updatedSubtasks,
              progress: newProgress,
              status: newProgress === 100 ? 'COMPLETED' : t.status,
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        })
      );
      await logTaskActivity(
        taskId,
        targetSub.completed ? 'TASK_UPDATED' : 'SUBTASK_COMPLETED',
        targetSub.completed ? { field: 'subtask_reopened', title: targetSub.title } : { title: targetSub.title }
      );
      return;
    }

    try {
      await apiPatch(`subtasks/${subtaskId}`, { completed: !targetSub.completed });
      await refreshTask(taskId);
      await loadTaskActivity(taskId);
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
      throw error;
    }
  };

  const addSubtask = async (taskId: string, title: string) => {
    if (!title.trim()) return;

    if (isDemoMode) {
      const newSub: Subtask = {
        id: `sub-${Date.now()}`,
        taskId,
        title,
        completed: false,
        assigneeId: currentUser.id,
      };
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, subtasks: [...t.subtasks, newSub], updatedAt: new Date().toISOString() } : t))
      );
      await logTaskActivity(taskId, 'SUBTASK_CREATED', { title });
      return;
    }

    try {
      await apiPost(`tasks/${taskId}/subtasks`, { title });
      await refreshTask(taskId);
      await loadTaskActivity(taskId);
    } catch (error) {
      console.error('Failed to add subtask:', error);
      throw error;
    }
  };

  const updateSubtask = async (subtaskId: string, updates: Partial<Subtask>) => {
    const targetTask = tasks.find((t) => t.subtasks.some((s) => s.id === subtaskId));

    if (isDemoMode) {
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, ...updates } : s)),
        }))
      );
      return;
    }

    try {
      await apiPatch(`subtasks/${subtaskId}`, updates);
      if (targetTask) await refreshTask(targetTask.id);
    } catch (error) {
      console.error('Failed to update subtask:', error);
      throw error;
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    const targetTask = tasks.find((t) => t.subtasks.some((s) => s.id === subtaskId));

    if (isDemoMode) {
      setTasks((prev) =>
        prev.map((t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) }))
      );
      if (targetTask) await logTaskActivity(targetTask.id, 'TASK_UPDATED', { field: 'subtask_removed' });
      return;
    }

    try {
      await apiDelete(`subtasks/${subtaskId}`);
      if (targetTask) {
        await refreshTask(targetTask.id);
        await loadTaskActivity(targetTask.id);
      }
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      throw error;
    }
  };

  /** Duplicate a task including its subtasks. Returns the new task. */
  const duplicateTask = async (taskId: string): Promise<Task | null> => {
    const source = tasks.find((t) => t.id === taskId);
    if (!source) return null;

    try {
      const created = (await apiPost('tasks', {
        title: `${source.title} (copy)`,
        description: source.description,
        status: source.status,
        priority: source.priority,
        projectId: source.projectId,
        departmentId: source.departmentId,
        assigneeIds: source.assigneeIds,
        startDate: source.startDate,
        dueDate: source.dueDate,
        tags: source.tags,
        subtasks: source.subtasks.map((s, i) => ({
          id: `sub-${Date.now()}-${i}`,
          title: s.title,
          assigneeId: s.assigneeId,
          dueDate: s.dueDate,
        })),
      })) as Task;

      const withSubtasks: Task = {
        ...created,
        subtasks: created.subtasks?.length
          ? created.subtasks
          : source.subtasks.map((s, i) => ({
              ...s,
              id: `sub-${Date.now()}-${i}`,
              taskId: created.id,
              completed: false,
            })),
      };
      setTasks((prev) => [withSubtasks, ...prev]);
      return withSubtasks;
    } catch (error) {
      console.error('Failed to duplicate task:', error);
      throw error;
    }
  };

  const addComment = async (taskId: string, content: string) => {
    if (!content.trim()) return;
    
    if (isDemoMode) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, commentsCount: t.commentsCount + 1 } : t))
      );
      const targetTask = tasks.find((t) => t.id === taskId);
      if (targetTask) {
        logActivity('Added Comment', 'TASK', targetTask.title, content.substring(0, 40));
      }
      return;
    }

    // For Supabase mode, we'd call the comments API
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, commentsCount: t.commentsCount + 1 } : t))
    );
    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask) {
      logActivity('Added Comment', 'TASK', targetTask.title, content.substring(0, 40));
    }
  };

  const addDepartment = async (deptData: Partial<Department>) => {
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: deptData.name || 'New Department',
      code: deptData.code || 'NEW',
      description: deptData.description || 'Custom department',
      icon: deptData.icon || 'FolderPlus',
      color: deptData.color || '#6366F1',
      managerId: currentUser.id,
      teams: [],
      projectsCount: 0,
      tasksCount: 0,
    };

    if (isDemoMode) {
      setDepartments((prev) => [...prev, newDept]);
      logActivity('Created Department', 'DEPARTMENT', newDept.name);
      setOnboardingSteps((prev) => prev.map((s) => (s.id === 'ob-2' ? { ...s, completed: true } : s)));
      return newDept;
    }

    try {
      const created = await apiPost('departments', deptData);
      const normalized = { ...created, teams: created.teams ?? [] };
      setDepartments((prev) => [...prev, normalized]);
      logActivity('Created Department', 'DEPARTMENT', normalized.name);
      setOnboardingSteps((prev) => prev.map((s) => (s.id === 'ob-2' ? { ...s, completed: true } : s)));
      return normalized;
    } catch (error) {
      console.error('Failed to create department:', error);
      throw error;
    }
  };

  const updateDepartment = async (id: string, updates: Partial<Department>) => {
    if (isDemoMode) {
      setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
      return;
    }

    try {
      const updated = await apiPatch(`departments/${id}`, updates);
      setDepartments((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (error) {
      console.error('Failed to update department:', error);
      throw error;
    }
  };

  const deleteDepartment = async (id: string) => {
    if (isDemoMode) {
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      if (activeDepartmentId === id) setActiveDepartmentId(null);
      return;
    }

    try {
      await apiDelete(`departments/${id}`);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      if (activeDepartmentId === id) setActiveDepartmentId(null);
    } catch (error) {
      console.error('Failed to delete department:', error);
      throw error;
    }
  };

  const addDepartmentMember = async (departmentId: string, userId: string) => {
    try {
      const saved = await apiPost(`departments/${departmentId}/members`, { userId });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, departmentId, ...saved } : u)));
    } catch (error) {
      console.error('Failed to add department member:', error);
      throw error;
    }
  };

  const removeDepartmentMember = async (departmentId: string, userId: string) => {
    try {
      await apiDelete(`departments/${departmentId}/members`, { userId });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, departmentId: undefined } : u)));
    } catch (error) {
      console.error('Failed to remove department member:', error);
      throw error;
    }
  };

  const addTeam = async (departmentId: string, name: string, leadId?: string | null): Promise<Team> => {
    const team: Team = {
      id: `team-${Date.now()}`,
      name: name.trim(),
      departmentId,
      leadId: leadId ?? currentUser.id,
      memberIds: [],
    };

    if (isDemoMode) {
      setDepartments((prev) => prev.map((d) => (d.id === departmentId ? { ...d, teams: [...d.teams, team] } : d)));
      return team;
    }

    try {
      const created = await apiPost('teams', { departmentId, name: name.trim(), leadId: leadId ?? currentUser.id });
      const saved: Team = {
        id: created.id,
        name: created.name ?? team.name,
        departmentId,
        leadId: created.leadId ?? team.leadId,
        memberIds: created.memberIds ?? [],
      };
      setDepartments((prev) => prev.map((d) => (d.id === departmentId ? { ...d, teams: [...d.teams, saved] } : d)));
      return saved;
    } catch (error) {
      console.error('Failed to create team:', error);
      throw error;
    }
  };

  const removeTeam = async (departmentId: string, teamId: string) => {
    if (isDemoMode) {
      setDepartments((prev) =>
        prev.map((d) => (d.id === departmentId ? { ...d, teams: d.teams.filter((t) => t.id !== teamId) } : d))
      );
      return;
    }

    try {
      await apiDelete(`teams/${teamId}`);
      setDepartments((prev) =>
        prev.map((d) => (d.id === departmentId ? { ...d, teams: d.teams.filter((t) => t.id !== teamId) } : d))
      );
    } catch (error) {
      console.error('Failed to remove team:', error);
      throw error;
    }
  };

  const addProject = async (projectData: Partial<Project>) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: projectData.name || 'New Project',
      description: projectData.description || '',
      departmentId: projectData.departmentId || activeDepartmentId || departments[0]?.id || '',
      ownerId: currentUser.id,
      memberIds: [currentUser.id],
      status: 'ACTIVE',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      progress: 0,
      color: projectData.color || '#6366F1',
      icon: projectData.icon || 'Folder',
      lists: [
        { id: `list-to-do-${Date.now()}`, name: 'To Do', projectId: `proj-${Date.now()}`, order: 1 },
        { id: `list-in-prog-${Date.now()}`, name: 'In Progress', projectId: `proj-${Date.now()}`, order: 2 },
        { id: `list-done-${Date.now()}`, name: 'Done', projectId: `proj-${Date.now()}`, order: 3 },
      ],
    };

    if (isDemoMode) {
      setProjects((prev) => [...prev, newProj]);
      logActivity('Created Project', 'PROJECT', newProj.name);
      setOnboardingSteps((prev) => prev.map((s) => (s.id === 'ob-4' ? { ...s, completed: true } : s)));
      return newProj;
    }

    try {
      const created = await apiPost('projects', projectData);
      setProjects((prev) => [...prev, created]);
      logActivity('Created Project', 'PROJECT', created.name);
      setOnboardingSteps((prev) => prev.map((s) => (s.id === 'ob-4' ? { ...s, completed: true } : s)));
      return created;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  const addDocument = async (docData: Partial<Document>) => {
    try {
      const payload: Partial<Document> = {
        ...docData,
        departmentId: docData.departmentId ?? activeDepartmentId ?? undefined,
      };
      const created = await apiPost('documents', payload);
      setDocuments((prev) => [created, ...prev]);
      setActiveDocId(created.id);
      return created;
    } catch (error) {
      console.error('Failed to create document:', error);
      throw error;
    }
  };

  const updateDocument = async (id: string, updates: Partial<Document>) => {
    try {
      const updated = await apiPatch(`documents/${id}`, updates);
      setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (error) {
      console.error('Failed to update document:', error);
      throw error;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await apiDelete(`documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (activeDocId === id) setActiveDocId(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw error;
    }
  };

  const addFolder = async (name: string) => {
    try {
      const created: DocumentFolder = await apiPost('folders', {
        name,
        departmentId: activeDepartmentId ?? undefined,
      });
      setFolders((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return created;
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  };

  const renameFolder = async (id: string, name: string) => {
    try {
      const updated: DocumentFolder = await apiPatch(`folders/${id}`, { name });
      setFolders((prev) => prev.map((f) => (f.id === id ? updated : f)).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Failed to rename folder:', error);
      throw error;
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      await apiDelete(`folders/${id}`);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      // Mirrors ON DELETE SET NULL: docs in the deleted folder become unfiled.
      setDocuments((prev) => prev.map((d) => (d.folderId === id ? { ...d, folderId: null } : d)));
    } catch (error) {
      console.error('Failed to delete folder:', error);
      throw error;
    }
  };

  /** Cross-entity search (tasks, projects, departments, docs, messages, people). */
  const globalSearch = useCallback(async (q: string) => {
    const query = q.trim();
    const empty = { query, tasks: [] as Task[], projects: [] as Project[], departments: [] as Department[], documents: [] as Document[], messages: [] as Message[], users: [] as User[] };
    if (!query) return empty;

    if (isDemoMode) {
      const n = query.toLowerCase();
      return {
        query,
        tasks: tasks.filter((t) => t.title.toLowerCase().includes(n)).slice(0, 8),
        projects: projects.filter((p) => p.name.toLowerCase().includes(n)).slice(0, 8),
        departments: departments.filter((d) => d.name.toLowerCase().includes(n) || d.code.toLowerCase().includes(n)).slice(0, 8),
        documents: documents.filter((d) => d.title.toLowerCase().includes(n)).slice(0, 8),
        messages: messages.filter((m) => m.content.toLowerCase().includes(n)).slice(0, 8),
        users: users.filter((u) => u.name.toLowerCase().includes(n) || u.email.toLowerCase().includes(n)).slice(0, 8),
      };
    }

    try {
      return await apiGet('search', { q: query });
    } catch (error) {
      console.error('Failed to search:', error);
      return empty;
    }
  }, [tasks, projects, departments, documents, messages, users]);

  const sendMessage = async (channelId: string, content: string) => {
    if (!content.trim()) return;

    try {
      // Always persist server-side (demo store included) so messages survive
      // reloads and show up for other clients via poll/realtime.
      const created = await apiPost('messages', { channelId, content: content.trim() });
      setMessages((prev) =>
        prev.some((m) => m.id === created.id)
          ? prev
          : [...prev, { ...created, sender: created.sender ?? currentUser }],
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const addChannel = async (channelData: { name: string; type?: Channel['type']; departmentId?: string }): Promise<Channel> => {
    try {
      const created = await apiPost('channels', {
        name: channelData.name,
        type: channelData.type || 'PUBLIC',
        departmentId: channelData.departmentId,
      });
      const chan: Channel = { ...created, memberIds: created.memberIds?.length ? created.memberIds : [currentUser.id] };
      setChannels((prev) => (prev.some((c) => c.id === chan.id) ? prev : [chan, ...prev]));
      return chan;
    } catch (error) {
      console.error('Failed to create channel:', error);
      throw error;
    }
  };

  // Opens (or creates) the one-on-one DIRECT channel between me and otherUserId.
  const startDirectMessage = async (otherUserId: string): Promise<Channel> => {
    try {
      const created = await apiPost('channels', { type: 'DIRECT', otherUserId });
      const chan: Channel = {
        ...created,
        type: 'DIRECT',
        memberIds: created.memberIds?.length ? created.memberIds : [currentUser.id, otherUserId],
      };
      setChannels((prev) => (prev.some((c) => c.id === chan.id) ? prev : [chan, ...prev]));
      setActiveChannelId(chan.id);
      setActiveView('CHAT');
      return chan;
    } catch (error) {
      console.error('Failed to start direct message:', error);
      throw error;
    }
  };

  const markNotificationRead = async (id: string) => {
    if (isDemoMode) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setReadNotifIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      // Server-backed notifications (mentions, assignments) persist too;
      // client-derived ones 404 and are safely ignored.
      apiPatch('notifications', { notificationId: id, read: true }).catch(() => undefined);
      return;
    }

    try {
      await apiPatch('notifications', { notificationId: id, read: true });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  };

  const markAllNotificationsRead = async () => {
    if (isDemoMode) {
      const ids = visibleNotifications.map((n) => n.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setReadNotifIds((prev) => Array.from(new Set([...prev, ...ids])));
      apiPatch('notifications', { all: true }).catch(() => undefined);
      return;
    }

    try {
      await apiPatch('notifications', { all: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
    }
  };

  const dismissNotification = async (id: string) => {
    if (isDemoMode) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setDismissedNotifIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      apiDelete('notifications', { notificationId: id }).catch(() => undefined);
      return;
    }

    try {
      await apiDelete('notifications', { notificationId: id });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const updateCurrentUser = async (updates: Partial<User>): Promise<User> => {
    const saved = await apiPatch(`users/${currentUser.id}`, updates);
    const merged: User = { ...currentUser, ...updates, ...saved };
    setCurrentUser(merged);
    setUsers((prev) => prev.map((u) => (u.id === merged.id ? { ...u, ...updates, ...saved } : u)));
    return merged;
  };

  const inviteMember = async (payload: {
    email: string;
    name?: string;
    role?: string;
    departmentId?: string | null;
  }): Promise<{ success: boolean; user?: User; message?: string }> => {
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to send invitation');
    const invitedUser = data?.user as User | undefined;
    if (invitedUser) {
      setUsers((prev) => (prev.some((u) => u.id === invitedUser.id) ? prev : [...prev, invitedUser]));
    }
    return data;
  };

  // Task Updates
  const loadTaskUpdates = useCallback(async (taskId: string) => {
    if (isDemoMode) return;
    try {
      const data = await apiGet(`task-updates`, { taskId });
      setTaskUpdates(data);
    } catch (error) {
      console.error('Failed to load task updates:', error);
    }
  }, []);

  const addTaskUpdate = async (taskId: string, content: string, parentUpdateId?: string, mentions?: string[]) => {
    if (isDemoMode) {
      const newUpdate: TaskUpdate = {
        id: `update-${Date.now()}`,
        taskId,
        userId: currentUser.id,
        parentUpdateId,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: currentUser,
        replies: [],
        reactions: {},
        mentions: mentions || [],
        replyCount: 0,
      };
      setTaskUpdates((prev) => [newUpdate, ...prev]);
      // Demo: notify the current user when they are mentioned in an update.
      if (mentions?.includes(currentUser.id)) {
        const mentionedTask = tasks.find((t) => t.id === taskId);
        setNotifications((prev) => [
          {
            id: `notif-mention-${newUpdate.id}`,
            userId: currentUser.id,
            title: 'MENTION',
            message: `You were mentioned in "${mentionedTask?.title ?? 'a task'}".`,
            type: 'MENTION',
            read: false,
            taskId,
            createdAt: newUpdate.createdAt,
          },
          ...prev,
        ]);
      }
      return;
    }

    try {
      const created = await apiPost('task-updates', { taskId, content, parentUpdateId, mentions });
      setTaskUpdates((prev) => [created, ...prev]);
      await loadTaskActivity(taskId);
    } catch (error) {
      console.error('Failed to add task update:', error);
      throw error;
    }
  };

  const updateTaskUpdate = async (updateId: string, content: string) => {
    if (isDemoMode) {
      setTaskUpdates((prev) =>
        prev.map((u) => (u.id === updateId ? { ...u, content, updatedAt: new Date().toISOString() } : u))
      );
      return;
    }

    try {
      await apiPatch(`task-updates/${updateId}`, { content });
      setTaskUpdates((prev) =>
        prev.map((u) => (u.id === updateId ? { ...u, content, updatedAt: new Date().toISOString() } : u))
      );
    } catch (error) {
      console.error('Failed to update task update:', error);
      throw error;
    }
  };

  const deleteTaskUpdate = async (updateId: string) => {
    if (isDemoMode) {
      setTaskUpdates((prev) => prev.filter((u) => u.id !== updateId));
      return;
    }

    try {
      await apiDelete(`task-updates/${updateId}`);
      setTaskUpdates((prev) => prev.filter((u) => u.id !== updateId));
    } catch (error) {
      console.error('Failed to delete task update:', error);
      throw error;
    }
  };

  const addTaskUpdateReaction = async (updateId: string, reaction: string) => {
    if (isDemoMode) {
      setTaskUpdates((prev) =>
        prev.map((u) => {
          if (u.id === updateId) {
            const reactions = { ...u.reactions };
            const userReactions = reactions[reaction] || [];
            if (userReactions.includes(currentUser.id)) {
              reactions[reaction] = userReactions.filter((id) => id !== currentUser.id);
            } else {
              reactions[reaction] = [...userReactions, currentUser.id];
            }
            return { ...u, reactions };
          }
          return u;
        })
      );
      return;
    }

    try {
      await apiPatch(`task-updates/${updateId}`, { reaction });
      setTaskUpdates((prev) =>
        prev.map((u) => {
          if (u.id === updateId) {
            const reactions = { ...u.reactions };
            const userReactions = reactions[reaction] || [];
            if (userReactions.includes(currentUser.id)) {
              reactions[reaction] = userReactions.filter((id) => id !== currentUser.id);
            } else {
              reactions[reaction] = [...userReactions, currentUser.id];
            }
            return { ...u, reactions };
          }
          return u;
        })
      );
    } catch (error) {
      console.error('Failed to add reaction:', error);
      throw error;
    }
  };

  // Task Files
  const loadTaskFiles = useCallback(async (taskId: string) => {
    if (isDemoMode) return;
    try {
      const data = await apiGet(`task-files`, { taskId });
      setTaskFiles(data);
    } catch (error) {
      console.error('Failed to load task files:', error);
    }
  }, []);

  const uploadTaskFile = (
    taskId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<TaskFile | void> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('taskId', taskId);
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/task-files');
      xhr.withCredentials = true;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const created: TaskFile = JSON.parse(xhr.responseText);
            if (onProgress) onProgress(100);
            setTaskFiles((prev) => [created, ...prev]);
            resolve(created);
          } catch {
            resolve(undefined);
          }
        } else {
          let message = 'Unable to upload file. Try again.';
          try {
            message = JSON.parse(xhr.responseText)?.error || message;
          } catch { /* keep default */ }
          reject(new Error(message));
        }
      };

      xhr.onerror = () => reject(new Error('Unable to upload file. Check your connection and try again.'));
      xhr.onabort = () => reject(new Error('Upload cancelled.'));

      xhr.send(formData);
    });
  };

  const deleteTaskFile = async (fileId: string) => {
    const targetFile = taskFiles.find((f) => f.id === fileId);

    if (isDemoMode) {
      setTaskFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (targetFile) await logTaskActivity(targetFile.taskId, 'FILE_DELETED', { file_name: targetFile.fileName });
      return;
    }

    try {
      await apiDelete(`task-files/${fileId}`);
      setTaskFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (targetFile) await loadTaskActivity(targetFile.taskId);
    } catch (error) {
      console.error('Failed to delete task file:', error);
      throw error;
    }
  };

  // Task Activity
  const loadTaskActivity = useCallback(async (taskId: string) => {
    if (isDemoMode) return;
    try {
      const data = await apiGet(`task-activity`, { taskId });
      setTaskActivity(data);
    } catch (error) {
      console.error('Failed to load task activity:', error);
    }
  }, []);

  const logTaskActivity = async (taskId: string, actionType: string, actionData?: Record<string, any>) => {
    if (isDemoMode) {
      const newActivity: TaskActivity = {
        id: `activity-${Date.now()}`,
        taskId,
        userId: currentUser.id,
        actionType,
        actionData: actionData || {},
        createdAt: new Date().toISOString(),
        user: currentUser,
      };
      setTaskActivity((prev) => [newActivity, ...prev]);
      return;
    }

    try {
      await apiPost('task-activity', { taskId, actionType, actionData });
      const newActivity: TaskActivity = {
        id: `activity-${Date.now()}`,
        taskId,
        userId: currentUser.id,
        actionType,
        actionData: actionData || {},
        createdAt: new Date().toISOString(),
        user: currentUser,
      };
      setTaskActivity((prev) => [newActivity, ...prev]);
    } catch (error) {
      console.error('Failed to log task activity:', error);
    }
  };

  // Task Relationships
  const loadTaskRelations = useCallback(async (taskId: string) => {
    try {
      const data = await apiGet('task-relations', { taskId });
      setTaskRelations(data);
    } catch (error) {
      console.error('Failed to load task relations:', error);
    }
  }, []);

  const clearTaskRelations = useCallback(() => setTaskRelations(null), []);

  const addTaskDependency = async (taskId: string, dependsOnTaskId: string) => {
    await apiPost('task-relations', { taskId, dependsOnTaskId });
    await loadTaskRelations(taskId);
    await loadTaskActivity(taskId);
  };

  const removeTaskDependency = async (taskId: string, dependsOnTaskId: string) => {
    const res = await fetch('/api/task-relations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, dependsOnTaskId }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(await res.text());
    await loadTaskRelations(taskId);
    await loadTaskActivity(taskId);
  };

  const setParentTask = async (taskId: string, parentTaskId: string | null) => {
    await updateTask(taskId, { parentTaskId });
    await loadTaskRelations(taskId);
  };

  // Archived tasks stay in state (so they can be restored from a deep link)
  // but are hidden from every view via the exposed `tasks` value.
  const visibleTasks = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);
  // Tasks as seen by the active scope: "mine" only includes tasks assigned to the current user.
  const scopedTasks = useMemo(
    () => (taskScope === 'mine' ? visibleTasks.filter((t) => t.assigneeIds.includes(currentUser.id)) : visibleTasks),
    [visibleTasks, taskScope, currentUser.id]
  );
  const getTaskById = useCallback((id: string) => tasks.find((t) => t.id === id), [tasks]);

  return (
    <WorkspaceContext.Provider
      value={{
        currentUser,
        users,
        departments,
        projects,
        tasks: visibleTasks,
        getTaskById,
        documents,
        folders,
        docsLoaded,
        workspaceLoaded,
        workspaceError,
        retryWorkspaceLoad,
        channels,
        messages,
        notifications: visibleNotifications,
        activityLogs,
        taskUpdates,
        taskFiles,
        taskActivity,
        taskRelations,
        onboardingSteps,
  activeDepartmentId,
  activeProjectId,
  activeView,
  taskScope,
  scopedTasks,
  selectedTaskId,
        activeChannelId,
        activeDocId,
        theme,
        searchQuery,
        isSidebarCollapsed,
        isCommandPaletteOpen,
        isTaskModalOpen,
        taskModalDueDate,
        isDeptModalOpen,
  deptEditId,
        isProjectModalOpen,
        isInviteOpen,
        isProfileOpen,
        isHelpOpen,
        isChannelModalOpen,
        isDmModalOpen,
        isNotificationOpen,
        filterStatus,
        filterPriority,
        setTheme,
        toggleTheme,
        setActiveDepartmentId,
        setActiveProjectId,
  setActiveView,
  setTaskScope,
  setSelectedTaskId,
        setActiveChannelId,
        setActiveDocId,
        setSearchQuery,
        setFilterStatus,
        setFilterPriority,
        toggleSidebar,
        setCommandPaletteOpen,
        setTaskModalOpen,
        setDeptModalOpen,
  setDeptEditId,
        setProjectModalOpen,
        setInviteOpen,
        setProfileOpen,
        setHelpOpen,
        setChannelModalOpen,
        setDmModalOpen,
        startDirectMessage,
        setNotificationOpen,
        toggleOnboardingStep,
        addTask,
        updateTaskStatus,
        updateTask,
        deleteTask,
        duplicateTask,
        refreshTask,
        toggleSubtask,
        addSubtask,
        updateSubtask,
        deleteSubtask,
        addComment,
        addDepartment,
  updateDepartment,
  deleteDepartment,
  addDepartmentMember,
  removeDepartmentMember,
  addTeam,
  removeTeam,
        addProject,
        addDocument,
        updateDocument,
        deleteDocument,
        addFolder,
        renameFolder,
        deleteFolder,
        sendMessage,
        addChannel,
        markNotificationRead,
        markAllNotificationsRead,
        dismissNotification,
        globalSearch,
        loadTasks,
        loadProjects,
        loadDepartments,
        loadUsers,
        loadDocuments,
        loadFolders,
        loadChannels,
        loadNotifications,
        updateCurrentUser,
        inviteMember,
        loadTaskUpdates,
        addTaskUpdate,
        updateTaskUpdate,
        deleteTaskUpdate,
        addTaskUpdateReaction,
        loadTaskFiles,
        uploadTaskFile,
        deleteTaskFile,
        loadTaskActivity,
        logTaskActivity,
        loadTaskRelations,
        clearTaskRelations,
        addTaskDependency,
        removeTaskDependency,
        setParentTask,
        isDemoMode,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};