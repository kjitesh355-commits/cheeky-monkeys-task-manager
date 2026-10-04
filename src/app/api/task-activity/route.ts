import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';

type TaskActivityRow = {
  id: string;
  task_id: string;
  user_id: string;
  action_type: string;
  action_data: Record<string, unknown> | null;
  created_at: string;
  user?: unknown;
};

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 });
  }

  if (isDemoMode()) {
    const activity = demoStore.taskActivity?.filter((a) => a.taskId === taskId) || [];
    return NextResponse.json(activity);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('task_activity')
    .select(`
      *,
      user:profiles(*)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const activity = data?.map((a: TaskActivityRow) => ({
    ...a,
    taskId: a.task_id,
    userId: a.user_id,
    actionType: a.action_type,
    actionData: a.action_data,
    createdAt: a.created_at,
    user: a.user,
  })) || [];

  return NextResponse.json(activity);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { taskId, actionType, actionData } = body;

  if (!taskId || !actionType) {
    return NextResponse.json({ error: 'taskId and actionType required' }, { status: 400 });
  }

  if (isDemoMode()) {
    const newActivity = {
      id: `activity-${Date.now()}`,
      taskId,
      userId: user.id,
      actionType,
      actionData: actionData || {},
      createdAt: new Date().toISOString(),
      user: demoStore.users.find((u) => u.id === user.id),
    };
    
    if (!demoStore.taskActivity) demoStore.taskActivity = [];
    demoStore.taskActivity.unshift(newActivity);
    
    return NextResponse.json(newActivity, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('task_activity')
    .insert({
      task_id: taskId,
      user_id: user.id,
      action_type: actionType,
      action_data: actionData || {},
    })
    .select(`
      *,
      user:profiles(*)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ...data,
    taskId: data.task_id,
    userId: data.user_id,
    actionType: data.action_type,
    actionData: data.action_data,
    createdAt: data.created_at,
    user: data.user,
  }, { status: 201 });
}