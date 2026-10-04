import { getSupabaseServer } from '@/supabase/server';
import { appMode } from '@/lib/env';
import type { Task, Project, Department, User, Document, DocumentFolder, Channel, Message, Notification, TaskUpdate, TaskFile, TaskActivity } from '@/types';
import { INITIAL_USERS } from '@/lib/initial-data';

// Demo data store (in-memory for demo mode)
const demoStore = {
  tasks: [] as Task[],
  projects: [] as Project[],
  departments: [] as Department[],
  users: [...INITIAL_USERS] as User[],
  documents: [] as Document[],
  folders: [] as DocumentFolder[],
  channels: [] as Channel[],
  messages: [] as Message[],
  notifications: [] as Notification[],
  taskUpdates: [] as TaskUpdate[],
  taskUpdateMentions: [] as { id: string; updateId: string; mentionedUserId: string; createdAt: string }[],
  taskUpdateReactions: [] as { id: string; updateId: string; userId: string; reaction: string; createdAt: string }[],
  taskFiles: [] as TaskFile[],
  taskActivity: [] as TaskActivity[],
  taskDependencies: [] as { id: string; taskId: string; dependsOnTaskId: string; createdBy?: string; createdAt: string }[],
};

// Initialize demo data
function initDemoData() {
  if (demoStore.tasks.length === 0) {
    // This will be populated from initial-data when needed
  }
}

// Helper to get user from request
async function getUser() {
  if (appMode === 'supabase') {
    const supabase = await getSupabaseServer();
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
  // Demo mode - return mock user
  return { id: 'usr-admin', email: 'admin@company.com' };
}

// Helper to check if demo mode
function isDemoMode(): boolean {
  return appMode !== 'supabase';
}

export { demoStore, getUser, isDemoMode, initDemoData };