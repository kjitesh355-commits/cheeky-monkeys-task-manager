import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../../_utils';
import { logTaskActivity, mapSubtask } from '../../_helpers';

/** Recompute task progress from subtasks and sync completion status. */
async function syncTaskProgress(supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServer>>> | null, taskId: string, userId: string) {
  const rows = supabase
    ? (await supabase.from('subtasks').select('*').eq('task_id', taskId)).data || []
    : demoStore.tasks.find((t: any) => t.id === taskId)?.subtasks || [];

  const total = rows.length;
  const completed = rows.filter((s: any) => s.completed).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : undefined;

  if (!supabase) {
    const task = demoStore.tasks.find((t: any) => t.id === taskId);
    if (task) {
      const before = task.status;
      if (progress !== undefined) task.progress = progress;
      if (total > 0 && completed === total) task.status = 'COMPLETED';
      task.updatedAt = new Date().toISOString();
      if (before !== task.status) {
        await logTaskActivity(null, taskId, userId, 'STATUS_CHANGED', { old_status: before, new_status: task.status });
        if (task.status === 'COMPLETED') await logTaskActivity(null, taskId, userId, 'TASK_COMPLETED', {});
      }
    }
    return;
  }

  const { data: task } = await supabase.from('tasks').select('id, status').eq('id', taskId).single();
  if (!task) return;

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (progress !== undefined) updates.progress = progress;

  let newStatus = task.status;
  if (total > 0 && completed === total && task.status !== 'COMPLETED') {
    newStatus = 'COMPLETED';
    updates.status = 'COMPLETED';
  }

  await supabase.from('tasks').update(updates).eq('id', taskId);

  if (newStatus !== task.status) {
    await logTaskActivity(supabase, taskId, userId, 'STATUS_CHANGED', { old_status: task.status, new_status: newStatus });
    if (newStatus === 'COMPLETED') await logTaskActivity(supabase, taskId, userId, 'TASK_COMPLETED', {});
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  if (isDemoMode()) {
    let target: any = null;
    for (const task of demoStore.tasks) {
      const sub = task.subtasks?.find((s: any) => s.id === id);
      if (sub) {
        target = sub;
        break;
      }
    }
    if (!target) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    const wasCompleted = target.completed;
    if (body.title !== undefined) target.title = body.title;
    if (body.assigneeId !== undefined) target.assigneeId = body.assigneeId;
    if (body.dueDate !== undefined) target.dueDate = body.dueDate;
    if (body.completed !== undefined) target.completed = body.completed;

    if (body.completed === true && !wasCompleted) {
      await logTaskActivity(null, target.taskId, user.id, 'SUBTASK_COMPLETED', { title: target.title });
    }
    await syncTaskProgress(null, target.taskId, user.id);

    return NextResponse.json(target);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('subtasks')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  const updates: Record<string, any> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.assigneeId !== undefined) updates.assignee_id = body.assigneeId;
  if (body.dueDate !== undefined) updates.due_date = body.dueDate;
  if (body.completed !== undefined) updates.completed = body.completed;

  const { data, error } = await supabase
    .from('subtasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.completed === true && !existing.completed) {
    await logTaskActivity(supabase, existing.task_id, user.id, 'SUBTASK_COMPLETED', { title: data.title });
  }

  await syncTaskProgress(supabase, existing.task_id, user.id);

  return NextResponse.json(mapSubtask(data));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    for (const task of demoStore.tasks) {
      const before = task.subtasks?.length || 0;
      task.subtasks = (task.subtasks || []).filter((s: any) => s.id !== id);
      if (task.subtasks.length !== before) {
        await logTaskActivity(null, task.id, user.id, 'TASK_UPDATED', { field: 'subtask_removed' });
        await syncTaskProgress(null, task.id, user.id);
        return NextResponse.json({ success: true });
      }
    }
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: existing } = await supabase.from('subtasks').select('*').eq('id', id).single();
  if (!existing) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  const { error } = await supabase.from('subtasks').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logTaskActivity(supabase, existing.task_id, user.id, 'TASK_UPDATED', { field: 'subtask_removed', title: existing.title });
  await syncTaskProgress(supabase, existing.task_id, user.id);

  return NextResponse.json({ success: true });
}
