'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Department,
  Project,
  Task,
  TaskStatus,
  TaskPriority,
  ViewMode,
  Document,
  Channel,
  Message,
  Notification,
  ActivityLog,
  Subtask,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_DEPARTMENTS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_DOCUMENTS,
  INITIAL_CHANNELS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACTIVITY_LOGS,
} from '../lib/initial-data';

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
  documents: Document[];
  channels: Channel[];
  messages: Message[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  onboardingSteps: OnboardingStep[];
  
  // Selection State
  activeDepartmentId: string | null;
  activeProjectId: string | null;
  activeView: ViewMode;
  selectedTaskId: string | null;
  activeChannelId: string | null;
  activeDocId: string | null;
  
  // UI & Dialog States
  theme: 'dark' | 'light';
  searchQuery: string;
  isSidebarCollapsed: boolean;
  isCommandPaletteOpen: boolean;
  isTaskModalOpen: boolean;
  isDeptModalOpen: boolean;
  isProjectModalOpen: boolean;
  isInviteOpen: boolean;
  isProfileOpen: boolean;
  isHelpOpen: boolean;
  isChannelModalOpen: boolean;
  isNotificationOpen: boolean;
  filterStatus: TaskStatus | 'ALL';
  filterPriority: TaskPriority | 'ALL';

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setActiveDepartmentId: (id: string | null) => void;
  setActiveProjectId: (id: string | null) => void;
  setActiveView: (view: ViewMode) => void;
  setSelectedTaskId: (id: string | null) => void;
  setActiveChannelId: (id: string | null) => void;
  setActiveDocId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: TaskStatus | 'ALL') => void;
  setFilterPriority: (priority: TaskPriority | 'ALL') => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setTaskModalOpen: (open: boolean) => void;
  setDeptModalOpen: (open: boolean) => void;
  setProjectModalOpen: (open: boolean) => void;
  setInviteOpen: (open: boolean) => void;
  setProfileOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setChannelModalOpen: (open: boolean) => void;
  setNotificationOpen: (open: boolean) => void;
  toggleOnboardingStep: (id: string) => void;

  // Data Mutations
  addTask: (task: Partial<Task>) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  addComment: (taskId: string, content: string) => void;
  addDepartment: (department: Partial<Department>) => void;
  addProject: (project: Partial<Project>) => void;
  addDocument: (doc: Partial<Document>) => void;
  sendMessage: (channelId: string, content: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser] = useState<User>(INITIAL_USERS[0]);
  const [users] = useState<User[]>(INITIAL_USERS);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS);

  const [theme, setThemeState] = useState<'dark' | 'light'>('light');

  // Navigation States
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>('DASHBOARD');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [isDeptModalOpen, setDeptModalOpen] = useState(false);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isChannelModalOpen, setChannelModalOpen] = useState(false);
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

  const addTask = (newTaskData: Partial<Task>) => {
    const defaultDept = activeDepartmentId || departments[0]?.id || 'dept-marketing';
    const defaultProj = activeProjectId || projects.find((p) => p.departmentId === defaultDept)?.id || 'proj-default';

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
      dueDate: newTaskData.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      tags: newTaskData.tags || ['General'],
      subtasks: newTaskData.subtasks || [],
      commentsCount: 0,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);
    logActivity('Created Task', 'TASK', newTask.title);

    setOnboardingSteps((prev) =>
      prev.map((s) => (s.id === 'ob-5' ? { ...s, completed: true } : s))
    );
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const isDone = status === 'COMPLETED';
          const newProgress = isDone ? 100 : status === 'IN_PROGRESS' ? 50 : t.progress;
          return { ...t, status, progress: newProgress, updatedAt: new Date().toISOString() };
        }
        return t;
      })
    );
    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask) {
      logActivity('Updated Status', 'TASK', targetTask.title, `Moved status to ${status}`);
    }
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t))
    );
  };

  const deleteTask = (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    if (targetTask) {
      logActivity('Deleted Task', 'TASK', targetTask.title);
    }
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
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
  };

  const addSubtask = (taskId: string, title: string) => {
    if (!title.trim()) return;
    const newSub: Subtask = {
      id: `sub-${Date.now()}`,
      taskId,
      title,
      completed: false,
      assigneeId: currentUser.id,
    };

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSubs = [...t.subtasks, newSub];
          return { ...t, subtasks: updatedSubs, updatedAt: new Date().toISOString() };
        }
        return t;
      })
    );
  };

  const addComment = (taskId: string, content: string) => {
    if (!content.trim()) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, commentsCount: t.commentsCount + 1 } : t))
    );
    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask) {
      logActivity('Added Comment', 'TASK', targetTask.title, content.substring(0, 40));
    }
  };

  const addDepartment = (deptData: Partial<Department>) => {
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
    setDepartments((prev) => [...prev, newDept]);
    logActivity('Created Department', 'DEPARTMENT', newDept.name);

    setOnboardingSteps((prev) =>
      prev.map((s) => (s.id === 'ob-2' ? { ...s, completed: true } : s))
    );
  };

  const addProject = (projectData: Partial<Project>) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: projectData.name || 'New Project',
      description: projectData.description || '',
      departmentId: projectData.departmentId || activeDepartmentId || departments[0].id,
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
    setProjects((prev) => [...prev, newProj]);
    logActivity('Created Project', 'PROJECT', newProj.name);

    setOnboardingSteps((prev) =>
      prev.map((s) => (s.id === 'ob-4' ? { ...s, completed: true } : s))
    );
  };

  const addDocument = (docData: Partial<Document>) => {
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: docData.title || 'Untitled Document',
      content: docData.content || '# Document Title\n\nStart typing documentation...',
      authorId: currentUser.id,
      category: docData.category || 'Company',
      departmentId: docData.departmentId || activeDepartmentId || undefined,
      updatedAt: new Date().toISOString().split('T')[0],
      icon: 'FileText',
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
  };

  const sendMessage = (channelId: string, content: string) => {
    if (!content.trim()) return;
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      channelId,
      senderId: currentUser.id,
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <WorkspaceContext.Provider
      value={{
        currentUser,
        users,
        departments,
        projects,
        tasks,
        documents,
        channels,
        messages,
        notifications,
        activityLogs,
        onboardingSteps,
        activeDepartmentId,
        activeProjectId,
        activeView,
        selectedTaskId,
        activeChannelId,
        activeDocId,
        theme,
        searchQuery,
        isSidebarCollapsed,
        isCommandPaletteOpen,
        isTaskModalOpen,
        isDeptModalOpen,
        isProjectModalOpen,
        isInviteOpen,
        isProfileOpen,
        isHelpOpen,
        isChannelModalOpen,
        isNotificationOpen,
        filterStatus,
        filterPriority,
        setTheme,
        toggleTheme,
        setActiveDepartmentId,
        setActiveProjectId,
        setActiveView,
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
        setProjectModalOpen,
        setInviteOpen,
        setProfileOpen,
        setHelpOpen,
        setChannelModalOpen,
        setNotificationOpen,
        toggleOnboardingStep,
        addTask,
        updateTaskStatus,
        updateTask,
        deleteTask,
        toggleSubtask,
        addSubtask,
        addComment,
        addDepartment,
        addProject,
        addDocument,
        sendMessage,
        markNotificationRead,
        markAllNotificationsRead,
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
