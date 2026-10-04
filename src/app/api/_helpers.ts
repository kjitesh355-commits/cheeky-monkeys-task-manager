import { getSupabaseServer } from '@/supabase/server';
import { demoStore } from './_utils';

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof getSupabaseServer>>>;

/** Map a raw `tasks` row (with relations) into the app's camelCase Task shape. */
export function mapTask(row: any): any {
  return {
    ...row,
    assigneeIds: row.assignees?.map((a: any) => a.user_id) ?? row.assigneeIds ?? [],
    projectId: row.project_id ?? row.projectId,
    departmentId: row.department_id ?? row.departmentId,
    createdById: row.created_by_id ?? row.createdById,
    parentTaskId: row.parent_task_id ?? row.parentTaskId ?? null,
    archived: row.archived ?? false,
    startDate: row.start_date ?? row.startDate,
    dueDate: row.due_date ?? row.dueDate,
    tags: row.tags ?? [],
    estimatedHours: row.estimated_hours ?? row.estimatedHours,
    loggedHours: row.logged_hours ?? row.loggedHours,
    commentsCount: row.commentsCount ?? row.comments?.length ?? 0,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    subtasks: (row.subtasks ?? row.subtaskRows ?? []).map(mapSubtask),
  };
}

export function mapSubtask(row: any) {
  return {
    id: row.id,
    taskId: row.task_id ?? row.taskId,
    title: row.title,
    completed: row.completed ?? false,
    assigneeId: row.assignee_id ?? row.assigneeId,
    dueDate: row.due_date ?? row.dueDate,
    createdAt: row.created_at ?? row.createdAt,
  };
}

/** Persist a task activity entry (real DB action, never fake data). */
export async function logTaskActivity(
  supabase: SupabaseClient | null,
  taskId: string,
  userId: string,
  actionType: string,
  actionData: Record<string, any> = {}
): Promise<void> {
  try {
    if (!supabase) {
      demoStore.taskActivity.unshift({
        id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        taskId,
        userId,
        actionType,
        actionData,
        createdAt: new Date().toISOString(),
        user: demoStore.users.find((u: any) => u.id === userId),
      });
      return;
    }
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: userId,
      action_type: actionType,
      action_data: actionData,
    });
  } catch (error) {
    console.error('Failed to log task activity:', error);
  }
}

const MODERATOR_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_MANAGER', 'TEAM_LEAD']);

/** Fetch a user's workspace role (null when the profile row is missing). */
export async function getUserRole(supabase: SupabaseClient | null, userId: string): Promise<string | null> {
  if (!supabase) return 'ADMIN';
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
  return data?.role ?? null;
}

export function canModerate(role: string | null): boolean {
  return Boolean(role && MODERATOR_ROLES.has(role));
}

/** Create a notification row for a user (mentions, assignments, ...). */
export async function createNotification(
  supabase: SupabaseClient | null,
  params: {
    userId: string;
    type: string;
    title: string;
    message?: string;
    actionUrl?: string | null;
    targetType?: string | null;
    targetId?: string | null;
  }
): Promise<void> {
  try {
    if (!supabase) {
      demoStore.notifications.unshift({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId: params.userId,
        type: params.type as any,
        title: params.title,
        message: params.message || '',
        read: false,
        taskId: params.targetType === 'TASK' ? params.targetId || undefined : undefined,
        createdAt: new Date().toISOString(),
      });
      return;
    }
    await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message || '',
      action_url: params.actionUrl ?? null,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      read: false,
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
