export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'DEPARTMENT_MANAGER' | 'TEAM_LEAD' | 'MEMBER' | 'VIEWER';

export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'APPROVED' | 'COMPLETED' | 'BLOCKED';

export type TaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export type ViewMode = 'LIST' | 'BOARD' | 'CALENDAR' | 'TIMELINE' | 'DASHBOARD' | 'DOCS' | 'CHAT';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  title: string;
  departmentId?: string;
  status?: 'online' | 'busy' | 'away' | 'offline';
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'currency' | 'user';
  value: any;
  options?: string[];
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
  dueDate?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  reactions?: Record<string, string[]>;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: string;
  type: string;
  uploadedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  listId?: string;
  departmentId: string;
  assigneeIds: string[];
  createdById: string;
  startDate?: string;
  dueDate?: string;
  tags: string[];
  subtasks: Subtask[];
  checklist?: ChecklistItem[];
  customFields?: Record<string, any>;
  attachments?: Attachment[];
  commentsCount: number;
  progress?: number;
  estimatedHours?: number;
  loggedHours?: number;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  name: string;
  projectId: string;
  order: number;
  color?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  departmentId: string;
  teamId?: string;
  ownerId: string;
  memberIds: string[];
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'PLANNING';
  startDate?: string;
  dueDate?: string;
  budget?: number;
  progress: number;
  lists: List[];
  color?: string;
  icon?: string;
}

export interface Team {
  id: string;
  name: string;
  departmentId: string;
  leadId: string;
  memberIds: string[];
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  color: string;
  managerId: string;
  teams: Team[];
  projectsCount: number;
  tasksCount: number;
}

export interface Workspace {
  id: string;
  name: string;
  logoUrl?: string;
  accentColor: string;
  departments: Department[];
  members: User[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ASSIGNMENT' | 'MENTION' | 'COMMENT' | 'STATUS_CHANGE' | 'DUE_DATE' | 'APPROVAL';
  read: boolean;
  taskId?: string;
  projectId?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  targetType: 'TASK' | 'PROJECT' | 'DEPARTMENT' | 'COMMENT' | 'DOC';
  targetTitle: string;
  details?: string;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  authorId: string;
  departmentId?: string;
  projectId?: string;
  updatedAt: string;
  icon?: string;
  category: 'Company' | 'Department' | 'Project' | 'SOP';
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: string;
  attachments?: string[];
  reactions?: Record<string, string[]>;
}

export interface Channel {
  id: string;
  name: string;
  type: 'PUBLIC' | 'PRIVATE' | 'DIRECT';
  departmentId?: string;
  projectId?: string;
  memberIds: string[];
  unreadCount?: number;
}
