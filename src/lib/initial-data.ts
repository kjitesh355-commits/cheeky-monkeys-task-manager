import { User, Department, Project, Task, Document, DocumentFolder, Channel, Message, Notification, ActivityLog } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin',
    name: 'Your Profile',
    email: 'admin@company.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'SUPER_ADMIN',
    title: 'Workspace Admin',
    status: 'online',
  },
];

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-marketing',
    name: 'Marketing',
    code: 'MKT',
    description: 'Digital marketing campaigns, social media, paid ads, content, and design creatives.',
    icon: 'Megaphone',
    color: '#6366F1', // Indigo
    managerId: 'usr-admin',
    teams: [
      {
        id: 'team-mkt-digital',
        name: 'Digital Marketing',
        departmentId: 'dept-marketing',
        leadId: 'usr-admin',
        memberIds: ['usr-admin'],
      },
      {
        id: 'team-mkt-design',
        name: 'Design & Creative',
        departmentId: 'dept-marketing',
        leadId: 'usr-admin',
        memberIds: ['usr-admin'],
      },
    ],
    projectsCount: 0,
    tasksCount: 0,
  },
  {
    id: 'dept-sales',
    name: 'Sales',
    code: 'SLS',
    description: 'Lead management, client outreach, follow-ups, proposals, and deal negotiations.',
    icon: 'TrendingUp',
    color: '#10B981', // Emerald
    managerId: 'usr-admin',
    teams: [
      {
        id: 'team-sls-core',
        name: 'Sales Operations',
        departmentId: 'dept-sales',
        leadId: 'usr-admin',
        memberIds: ['usr-admin'],
      },
    ],
    projectsCount: 0,
    tasksCount: 0,
  },
  {
    id: 'dept-ops',
    name: 'Operations',
    code: 'OPS',
    description: 'Daily operations, branch logistics, maintenance, inventory, events, and incident tracking.',
    icon: 'Cpu',
    color: '#3B82F6', // Blue
    managerId: 'usr-admin',
    teams: [
      {
        id: 'team-ops-core',
        name: 'Core Operations',
        departmentId: 'dept-ops',
        leadId: 'usr-admin',
        memberIds: ['usr-admin'],
      },
    ],
    projectsCount: 0,
    tasksCount: 0,
  },
  {
    id: 'dept-hr',
    name: 'Human Resources',
    code: 'HR',
    description: 'Talent recruitment, employee onboarding, documents, leave requests, and employee services.',
    icon: 'Users',
    color: '#EC4899', // Pink
    managerId: 'usr-admin',
    teams: [
      {
        id: 'team-hr-talent',
        name: 'HR & Onboarding',
        departmentId: 'dept-hr',
        leadId: 'usr-admin',
        memberIds: ['usr-admin'],
      },
    ],
    projectsCount: 0,
    tasksCount: 0,
  },
];

export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_DOCUMENTS: Document[] = [];
export const INITIAL_FOLDERS: DocumentFolder[] = [];
export const INITIAL_CHANNELS: Channel[] = [];
export const INITIAL_MESSAGES: Message[] = [];
export const INITIAL_NOTIFICATIONS: Notification[] = [];
export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];
