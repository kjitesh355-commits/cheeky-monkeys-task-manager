import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../../../_utils';
import { logTaskActivity, mapSubtask } from '../../../_helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: taskId } = await params;
  const body = await request.json();
  const { title, assigneeId, dueDate } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }

  if (isDemoMode()) {
    const task = demoStore.tasks.find((t: any) => t.id === taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const newSub = {
      id: `sub-${Date.now()}`,
      taskId,
      title: title.trim(),
      completed: false,
      assigneeId: assigneeId || user.id,
      dueDate,
      createdAt: new Date().toISOString(),
    };
    task.subtasks = [...(task.subtasks || []), newSub];
    task.updatedAt = new Date().toISOString();
    await logTaskActivity(null, taskId, user.id, 'SUBTASK_CREATED', { title: newSub.title });
    return NextResponse.json(newSub, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('subtasks')
    .insert({
      task_id: taskId,
      title: title.trim(),
      completed: false,
      assignee_id: assigneeId || user.id,
      due_date: dueDate || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logTaskActivity(supabase, taskId, user.id, 'SUBTASK_CREATED', { title: data.title });

  return NextResponse.json(mapSubtask(data), { status: 201 });
}
