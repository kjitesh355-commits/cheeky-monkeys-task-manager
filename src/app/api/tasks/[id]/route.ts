import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../../_utils';
import { canModerate, createNotification, getUserRole, logTaskActivity, mapTask } from '../../_helpers';
import type { Task, TaskActivity } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  TO_DO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  NONE: 'None',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const task = demoStore.tasks.find(t => t.id === id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(task);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignees:task_assignees(user_id),
      subtasks(*),
      comments(*, author:profiles(*))
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const task = {
    ...mapTask(data),
    comments: data.comments?.map((c: { id: string; task_id: string; author_id: string; content: string; reactions: unknown; created_at: string; author: unknown }) => ({
      id: c.id,
      taskId: c.task_id,
      authorId: c.author_id,
      content: c.content,
      reactions: c.reactions,
      createdAt: c.created_at,
      author: c.author,
    })) || [],
  };

  return NextResponse.json(task);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  if (isDemoMode()) {
    const taskIndex = demoStore.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const previous = demoStore.tasks[taskIndex];
    const updatedTask = {
      ...previous,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Handle status -> progress mapping
    if (body.status === 'COMPLETED') updatedTask.progress = 100;
    else if (body.status === 'IN_PROGRESS') updatedTask.progress = 50;
    else if (body.status === 'TO_DO') updatedTask.progress = 0;

    demoStore.tasks[taskIndex] = updatedTask;

    // Notify newly added assignees (except the actor).
    if (Array.isArray(body.assigneeIds)) {
      const previousSet = new Set(previous.assigneeIds);
      const actorName =
        demoStore.users.find((u) => u.id === user.id)?.name ||
        user.email?.split('@')[0] ||
        'Someone';
      for (const userIdToAdd of updatedTask.assigneeIds) {
        if (previousSet.has(userIdToAdd) || userIdToAdd === user.id) continue;
        await createNotification(null, {
          userId: userIdToAdd,
          type: 'ASSIGNMENT',
          title: `${actorName} assigned you "${updatedTask.title}"`,
          message: 'You are now an assignee of this task.',
          actionUrl: `/?task=${updatedTask.id}`,
          targetType: 'TASK',
          targetId: updatedTask.id,
        });
      }
    }

    for (const entry of diffTaskActivity(previous, updatedTask, user.id, body)) {
      demoStore.taskActivity.unshift(entry);
    }

    return NextResponse.json(updatedTask);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: previousRow, error: prevError } = await supabase
    .from('tasks')
    .select('*, assignees:task_assignees(user_id), subtasks(*)')
    .eq('id', id)
    .single();

  if (prevError || !previousRow) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const previous = mapTask(previousRow);

  // Convert camelCase to snake_case for database
  const dbUpdates: Record<string, unknown> = {};
  const allowedFields = [
    'title', 'description', 'status', 'priority', 'project_id', 'department_id',
    'start_date', 'due_date', 'tags', 'progress', 'estimated_hours', 'logged_hours',
    'archived', 'parent_task_id',
  ];

  for (const key of allowedFields) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    if (body[camelKey] !== undefined) {
      dbUpdates[key] = body[camelKey];
    }
  }

  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Persist assignee changes to the junction table
  let assigneeIds = previous.assigneeIds;
  if (Array.isArray(body.assigneeIds)) {
    assigneeIds = body.assigneeIds;
    await supabase.from('task_assignees').delete().eq('task_id', id);
    if (assigneeIds.length > 0) {
      await supabase
        .from('task_assignees')
        .insert(assigneeIds.map((userId: string) => ({ task_id: id, user_id: userId })));
    }
  }

  const updated = mapTask({ ...previousRow, ...data, assignees: assigneeIds.map((u: string) => ({ user_id: u })) });

  // Notify newly added assignees (except the actor).
  if (Array.isArray(body.assigneeIds)) {
    const previousSet = new Set(previous.assigneeIds);
    const actorName = user.email?.split('@')[0] || 'Someone';
    for (const userIdToAdd of assigneeIds) {
      if (previousSet.has(userIdToAdd) || userIdToAdd === user.id) continue;
      await createNotification(supabase, {
        userId: userIdToAdd,
        type: 'ASSIGNMENT',
        title: `${actorName} assigned you "${updated.title}"`,
        message: 'You are now an assignee of this task.',
        actionUrl: `/?task=${updated.id}`,
        targetType: 'TASK',
        targetId: updated.id,
      });
    }
  }

  // Generate real activity entries from the actual change
  await logTaskDiffs(supabase, previous, updated, user.id, body);

  const { data: withRelations } = await supabase
    .from('tasks')
    .select('*, assignees:task_assignees(user_id), subtasks(*)')
    .eq('id', id)
    .single();

  return NextResponse.json(mapTask(withRelations || { ...previousRow, ...data, assignees: assigneeIds.map((u: string) => ({ user_id: u })) }));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const taskIndex = demoStore.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    demoStore.tasks.splice(taskIndex, 1);
    return NextResponse.json({ success: true });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const role = await getUserRole(supabase, user.id);
  const { data: task } = await supabase
    .from('tasks')
    .select('created_by_id, title')
    .eq('id', id)
    .single();

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.created_by_id !== user.id && !canModerate(role)) {
    return NextResponse.json({ error: 'You do not have permission to delete this task' }, { status: 403 });
  }

  const { error } = await supabase.from('tasks').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** Build demo-mode activity entries from a task diff. */
function diffTaskActivity(previous: Task, updated: Task, userId: string, body: Partial<Task>) {
  const entries: TaskActivity[] = [];
  const push = (actionType: string, actionData: Record<string, unknown> = {}) => {
    entries.push({
      id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskId: updated.id,
      userId,
      actionType,
      actionData,
      createdAt: new Date().toISOString(),
      user: demoStore.users.find((u) => u.id === userId),
    });
  };

  if (body.status !== undefined && previous.status !== updated.status) {
    push('STATUS_CHANGED', { old_status: previous.status, new_status: updated.status });
    if (updated.status === 'COMPLETED') push('TASK_COMPLETED', {});
    if (previous.status === 'COMPLETED') push('TASK_REOPENED', {});
  }
  if (body.priority !== undefined && previous.priority !== updated.priority) {
    push('PRIORITY_CHANGED', { old_priority: previous.priority, new_priority: updated.priority });
  }
  if (body.dueDate !== undefined && previous.dueDate !== updated.dueDate) {
    push('DUE_DATE_CHANGED', { old_due_date: previous.dueDate, new_due_date: updated.dueDate });
  }
  if (body.startDate !== undefined && previous.startDate !== updated.startDate) {
    push('START_DATE_CHANGED', { old_start_date: previous.startDate, new_start_date: updated.startDate });
  }
  if (body.title !== undefined && previous.title !== updated.title) {
    push('TASK_UPDATED', { field: 'title', old_title: previous.title, new_title: updated.title });
  }
  if (body.description !== undefined && previous.description !== updated.description) {
    push('TASK_UPDATED', { field: 'description' });
  }
  if (Array.isArray(body.tags)) {
    const added = updated.tags.filter((t: string) => !previous.tags.includes(t));
    const removed = previous.tags.filter((t: string) => !updated.tags.includes(t));
    added.forEach((tag: string) => push('TAG_ADDED', { tag }));
    removed.forEach((tag: string) => push('TAG_REMOVED', { tag }));
  }
  if (Array.isArray(body.assigneeIds)) {
    const previousSet = new Set(previous.assigneeIds);
    const nextSet = new Set(updated.assigneeIds);
    const added = updated.assigneeIds.filter((u: string) => !previousSet.has(u));
    const removed = previous.assigneeIds.filter((u: string) => !nextSet.has(u));
    if (added.length > 0) push('TASK_ASSIGNED', { assigned_user_ids: added });
    if (removed.length > 0) push('TASK_REASSIGNED', { removed_user_ids: removed });
  }
  if (body.archived !== undefined && previous.archived !== updated.archived) {
    push('TASK_UPDATED', { field: 'archived', archived: updated.archived });
  }
  return entries;
}

/** Persist activity rows for a real task PATCH. */
async function logTaskDiffs(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServer>>>,
  previous: Task,
  updated: Task,
  userId: string,
  body: Partial<Task>
) {
  const log = (actionType: string, actionData: Record<string, unknown> = {}) =>
    logTaskActivity(supabase, updated.id, userId, actionType, actionData);

  const nameOf = async (table: 'projects' | 'departments', ids: string[]) => {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (unique.length === 0) return {} as Record<string, string>;
    const { data } = await supabase.from(table).select('id, name').in('id', unique);
    return Object.fromEntries((data || []).map((r: { id: string; name: string }) => [r.id, r.name]));
  };

  if (body.status !== undefined && previous.status !== updated.status) {
    await log('STATUS_CHANGED', {
      old_status: previous.status,
      new_status: updated.status,
      old_status_label: STATUS_LABELS[previous.status] || previous.status,
      new_status_label: STATUS_LABELS[updated.status] || updated.status,
    });
    if (updated.status === 'COMPLETED') await log('TASK_COMPLETED', {});
    if (previous.status === 'COMPLETED') await log('TASK_REOPENED', {});
  }
  if (body.priority !== undefined && previous.priority !== updated.priority) {
    await log('PRIORITY_CHANGED', {
      old_priority: previous.priority,
      new_priority: updated.priority,
      old_priority_label: PRIORITY_LABELS[previous.priority] || previous.priority,
      new_priority_label: PRIORITY_LABELS[updated.priority] || updated.priority,
    });
  }
  if (body.dueDate !== undefined && previous.dueDate !== updated.dueDate) {
    await log('DUE_DATE_CHANGED', { old_due_date: previous.dueDate, new_due_date: updated.dueDate });
  }
  if (body.startDate !== undefined && previous.startDate !== updated.startDate) {
    await log('START_DATE_CHANGED', { old_start_date: previous.startDate, new_start_date: updated.startDate });
  }
  if (body.title !== undefined && previous.title !== updated.title) {
    await log('TASK_UPDATED', { field: 'title', old_title: previous.title, new_title: updated.title });
  }
  if (body.description !== undefined && previous.description !== updated.description) {
    await log('TASK_UPDATED', { field: 'description' });
  }
  if (body.projectId !== undefined && previous.projectId !== updated.projectId) {
    const names = await nameOf('projects', [previous.projectId, updated.projectId].filter(Boolean));
    await log('PROJECT_CHANGED', {
      old_project_id: previous.projectId,
      new_project_id: updated.projectId,
      old_project_name: names[previous.projectId] || null,
      new_project_name: names[updated.projectId] || null,
    });
  }
  if (body.departmentId !== undefined && previous.departmentId !== updated.departmentId) {
    const names = await nameOf('departments', [previous.departmentId, updated.departmentId].filter(Boolean));
    await log('DEPARTMENT_CHANGED', {
      old_department_id: previous.departmentId,
      new_department_id: updated.departmentId,
      old_department_name: names[previous.departmentId] || null,
      new_department_name: names[updated.departmentId] || null,
    });
  }
  if (Array.isArray(body.tags)) {
    const added = updated.tags.filter((t: string) => !previous.tags.includes(t));
    const removed = previous.tags.filter((t: string) => !updated.tags.includes(t));
    for (const tag of added) await log('TAG_ADDED', { tag });
    for (const tag of removed) await log('TAG_REMOVED', { tag });
  }
  if (Array.isArray(body.assigneeIds)) {
    const previousSet = new Set(previous.assigneeIds);
    const nextSet = new Set(updated.assigneeIds);
    const added = updated.assigneeIds.filter((u: string) => !previousSet.has(u));
    const removed = previous.assigneeIds.filter((u: string) => !nextSet.has(u));
    for (const userIdToAdd of added) await log('TASK_ASSIGNED', { assigned_user_id: userIdToAdd });
    for (const userIdToRemove of removed) await log('TASK_REASSIGNED', { removed_user_id: userIdToRemove });
  }
  if (body.archived !== undefined && previous.archived !== updated.archived) {
    await log('TASK_UPDATED', { field: 'archived', archived: updated.archived });
  }
  if (body.parentTaskId !== undefined && previous.parentTaskId !== updated.parentTaskId) {
    await log('TASK_UPDATED', {
      field: 'parent',
      old_parent_task_id: previous.parentTaskId,
      new_parent_task_id: updated.parentTaskId,
    });
  }
}
