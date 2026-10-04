import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';
import { logTaskActivity, mapTask } from '../_helpers';

function demoDependencies(taskId: string) {
  const deps = demoStore.taskDependencies || [];
  return {
    blockedBy: deps
      .filter((d: any) => d.taskId === taskId)
      .map((d: any) => demoStore.tasks.find((t: any) => t.id === d.dependsOnTaskId))
      .filter(Boolean),
    blocking: deps
      .filter((d: any) => d.dependsOnTaskId === taskId)
      .map((d: any) => demoStore.tasks.find((t: any) => t.id === d.taskId))
      .filter(Boolean),
  };
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 });
  }

  if (isDemoMode()) {
    const task = demoStore.tasks.find((t: any) => t.id === taskId);
    const parentTask = task?.parentTaskId
      ? demoStore.tasks.find((t: any) => t.id === task.parentTaskId) || null
      : null;
    const { blockedBy, blocking } = demoDependencies(taskId);
    return NextResponse.json({ parentTask, blockedBy, blocking });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const taskSelect = '*, assignees:task_assignees(user_id), subtasks(*)';

  const { data: task } = await supabase
    .from('tasks')
    .select('id, parent_task_id')
    .eq('id', taskId)
    .single();

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  let parentTask = null;
  if (task.parent_task_id) {
    const { data } = await supabase.from('tasks').select(taskSelect).eq('id', task.parent_task_id).single();
    parentTask = data ? mapTask(data) : null;
  }

  const [{ data: blockedRows }, { data: blockingRows }] = await Promise.all([
    supabase.from('task_dependencies').select('depends_on_task_id').eq('task_id', taskId),
    supabase.from('task_dependencies').select('task_id').eq('depends_on_task_id', taskId),
  ]);

  const blockedIds = (blockedRows || []).map((r: any) => r.depends_on_task_id);
  const blockingIds = (blockingRows || []).map((r: any) => r.task_id);

  const [blockedRes, blockingRes] = await Promise.all([
    blockedIds.length
      ? supabase.from('tasks').select(taskSelect).in('id', blockedIds)
      : Promise.resolve({ data: [] }),
    blockingIds.length
      ? supabase.from('tasks').select(taskSelect).in('id', blockingIds)
      : Promise.resolve({ data: [] }),
  ]);

  return NextResponse.json({
    parentTask,
    blockedBy: (blockedRes.data || []).map(mapTask),
    blocking: (blockingRes.data || []).map(mapTask),
  });
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { taskId, dependsOnTaskId } = await request.json();

  if (!taskId || !dependsOnTaskId) {
    return NextResponse.json({ error: 'taskId and dependsOnTaskId required' }, { status: 400 });
  }
  if (taskId === dependsOnTaskId) {
    return NextResponse.json({ error: 'A task cannot depend on itself' }, { status: 400 });
  }

  if (isDemoMode()) {
    demoStore.taskDependencies = demoStore.taskDependencies || [];
    const exists = demoStore.taskDependencies.find(
      (d: any) => d.taskId === taskId && d.dependsOnTaskId === dependsOnTaskId
    );
    if (!exists) {
      demoStore.taskDependencies.push({
        id: `dep-${Date.now()}`,
        taskId,
        dependsOnTaskId,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      });
      const blockedTask = demoStore.tasks.find((t: any) => t.id === dependsOnTaskId);
      await logTaskActivity(null, taskId, user.id, 'DEPENDENCY_ADDED', {
        depends_on_task_id: dependsOnTaskId,
        depends_on_title: blockedTask?.title,
      });
    }
    return NextResponse.json({ success: true }, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('task_dependencies')
    .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId, created_by: user.id })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Dependency already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: blockedTask } = await supabase.from('tasks').select('title').eq('id', dependsOnTaskId).single();

  await logTaskActivity(supabase, taskId, user.id, 'DEPENDENCY_ADDED', {
    depends_on_task_id: dependsOnTaskId,
    depends_on_title: blockedTask?.title,
  });

  return NextResponse.json({ id: data.id, success: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { taskId, dependsOnTaskId } = await request.json();

  if (!taskId || !dependsOnTaskId) {
    return NextResponse.json({ error: 'taskId and dependsOnTaskId required' }, { status: 400 });
  }

  if (isDemoMode()) {
    demoStore.taskDependencies = (demoStore.taskDependencies || []).filter(
      (d: any) => !(d.taskId === taskId && d.dependsOnTaskId === dependsOnTaskId)
    );
    await logTaskActivity(null, taskId, user.id, 'DEPENDENCY_REMOVED', { depends_on_task_id: dependsOnTaskId });
    return NextResponse.json({ success: true });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('task_id', taskId)
    .eq('depends_on_task_id', dependsOnTaskId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logTaskActivity(supabase, taskId, user.id, 'DEPENDENCY_REMOVED', { depends_on_task_id: dependsOnTaskId });

  return NextResponse.json({ success: true });
}
