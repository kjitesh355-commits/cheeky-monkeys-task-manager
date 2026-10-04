export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'DEPARTMENT_MANAGER' | 'TEAM_LEAD' | 'MEMBER' | 'VIEWER';

export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'APPROVED' | 'COMPLETED' | 'BLOCKED';

export type TaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export type ViewMode =
  | 'LIST'
  | 'BOARD'
  | 'CALENDAR'
  | 'TIMELINE'
  | 'DASHBOARD'
  | 'DOCS'
  | 'CHAT'
  | 'ANALYTICS'
  | 'AI'
  | 'DEPARTMENTS';

export type TaskScope = 'all' | 'mine';

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
  value: unknown;
  options?: string[];
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  assigneeId?: string | null;
  dueDate?: string | null;
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
  parentTaskId?: string | null;
  archived?: boolean;
  startDate?: string | null;
  dueDate?: string | null;
  tags: string[];
  subtasks: Subtask[];
  checklist?: ChecklistItem[];
  customFields?: Record<string, unknown>;
  attachments?: Attachment[];
  commentsCount: number;
  progress?: number;
  estimatedHours?: number;
  loggedHours?: number;
  createdAt: string;
  updatedAt: string;
  updates?: TaskUpdate[];
  files?: TaskFile[];
  activity?: TaskActivity[];
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdBy?: string;
  createdAt: string;
  dependsOnTask?: Task;
}

export interface TaskRelations {
  parentTask: Task | null;
  blockedBy: Task[];
  blocking: Task[];
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
  type: 'ASSIGNMENT' | 'MENTION' | 'COMMENT' | 'STATUS_CHANGE' | 'DUE_DATE' | 'APPROVAL' | 'SYSTEM';
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

export interface TaskUpdate {
  id: string;
  taskId: string;
  userId: string;
  parentUpdateId?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
  replies?: TaskUpdate[];
  reactions?: Record<string, string[]>;
  mentions?: string[];
  replyCount?: number;
}

export interface TaskFile {
  id: string;
  taskId: string;
  uploadedBy: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  storageProvider: string;
  createdAt: string;
  uploader?: User;
  downloadUrl?: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  userId: string;
  actionType: string;
  actionData: Record<string, unknown>;
  createdAt: string;
  user?: User;
}

export type TaskActivityType = 
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_ASSIGNED'
  | 'TASK_REASSIGNED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'DUE_DATE_CHANGED'
  | 'START_DATE_CHANGED'
  | 'PROJECT_CHANGED'
  | 'DEPARTMENT_CHANGED'
  | 'TAG_ADDED'
  | 'TAG_REMOVED'
  | 'SUBTASK_CREATED'
  | 'SUBTASK_COMPLETED'
  | 'COMMENT_ADDED'
  | 'COMMENT_EDITED'
  | 'COMMENT_DELETED'
  | 'FILE_UPLOADED'
  | 'FILE_DELETED'
  | 'DEPENDENCY_ADDED'
  | 'DEPENDENCY_REMOVED'
  | 'TASK_COMPLETED'
  | 'TASK_REOPENED';

export interface Document {
  id: string;
  title: string;
  content: string;
  authorId: string;
  departmentId?: string;
  projectId?: string;
  folderId?: string | null;
  updatedAt: string;
  icon?: string;
  category: 'Company' | 'Department' | 'Project' | 'SOP';
}

export interface DocumentFolder {
  id: string;
  name: string;
  departmentId?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
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
  createdAt?: string;
}
