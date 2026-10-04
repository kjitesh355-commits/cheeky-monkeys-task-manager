import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';
import { logTaskActivity, mapTask } from '../_helpers';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const departmentId = searchParams.get('departmentId');
  const status = searchParams.get('status');
  const assigneeId = searchParams.get('assigneeId');
  const includeArchived = searchParams.get('includeArchived') === 'true';

  if (isDemoMode()) {
    let tasks = [...demoStore.tasks];

    if (projectId) tasks = tasks.filter(t => t.projectId === projectId);
    if (departmentId) tasks = tasks.filter(t => t.departmentId === departmentId);
    if (status && status !== 'ALL') tasks = tasks.filter(t => t.status === status);
    if (assigneeId) tasks = tasks.filter(t => t.assigneeIds?.includes(assigneeId));
    if (!includeArchived) tasks = tasks.filter(t => !t.archived);

    return NextResponse.json(tasks);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  let query = supabase.from('tasks').select(`
    *,
    assignees:task_assignees(user_id),
    subtasks(*),
    project:projects(*),
    department:departments(*)
  `);

  if (projectId) query = query.eq('project_id', projectId);
  if (departmentId) query = query.eq('department_id', departmentId);
  if (status && status !== 'ALL') query = query.eq('status', status);
  if (!includeArchived) query = query.eq('archived', false);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tasks = data?.map(mapTask) || [];

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, status, priority, projectId, departmentId, assigneeIds, startDate, dueDate, tags, subtasks } = body;

  if (isDemoMode()) {
    const newTask = {
      id: `task-${Date.now()}`,
      title: title || 'New Task',
      description: description || '',
      status: status || 'TO_DO',
      priority: priority || 'MEDIUM',
      projectId: projectId || demoStore.projects[0]?.id || 'proj-default',
      departmentId: departmentId || demoStore.departments[0]?.id || 'dept-marketing',
      assigneeIds: assigneeIds && assigneeIds.length > 0 ? assigneeIds : [user.id],
      createdById: user.id,
      archived: false,
      startDate: startDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || null,
      tags: tags || ['General'],
      subtasks: subtasks || [],
      commentsCount: 0,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    demoStore.tasks.unshift(newTask);
    await logTaskActivity(null, newTask.id, user.id, 'TASK_CREATED', { title: newTask.title });
    return NextResponse.json(newTask, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      title: title || 'New Task',
      description: description || '',
      status: status || 'TO_DO',
      priority: priority || 'MEDIUM',
      project_id: projectId || null,
      department_id: departmentId || null,
      created_by_id: user.id,
      start_date: startDate,
      due_date: dueDate,
      tags: tags || ['General'],
      progress: 0,
      archived: false,
    })
    .select()
    .single();

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }

  // Add assignees
  if (assigneeIds && assigneeIds.length > 0) {
    const assigneeData = assigneeIds.map((userId: string) => ({
      task_id: task.id,
      user_id: userId,
    }));
    await supabase.from('task_assignees').insert(assigneeData);
  }

  // Add subtasks
  if (subtasks && subtasks.length > 0) {
    const subtaskData = subtasks.map((s: { title: string; completed?: boolean; assigneeId?: string; dueDate?: string }) => ({
      task_id: task.id,
      title: s.title,
      completed: s.completed || false,
      assignee_id: s.assigneeId || user.id,
      due_date: s.dueDate,
    }));
    await supabase.from('subtasks').insert(subtaskData);
  }

  await logTaskActivity(supabase, task.id, user.id, 'TASK_CREATED', { title: task.title });

  const { data: withRelations } = await supabase
    .from('tasks')
    .select('*, assignees:task_assignees(user_id), subtasks(*)')
    .eq('id', task.id)
    .single();

  return NextResponse.json(mapTask(withRelations || task), { status: 201 });
}
