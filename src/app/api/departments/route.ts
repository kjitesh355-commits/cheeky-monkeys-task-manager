import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';
import { canModerate, getUserRole } from '../_helpers';

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isDemoMode()) {
    return NextResponse.json(demoStore.departments);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('departments')
    .select(`
      *,
      manager:profiles(*),
      teams(*, lead:profiles(*))
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const departments = data?.map(d => ({
    ...d,
    managerId: d.manager_id,
    teams: d.teams?.map((t: { id: string; name: string; department_id: string | null; lead_id: string | null; member_ids: string[] | null }) => ({
      id: t.id,
      name: t.name,
      departmentId: t.department_id,
      leadId: t.lead_id,
      memberIds: t.member_ids || [],
    })) || [],
  })) || [];

  return NextResponse.json(departments);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseForRole = await getSupabaseServer();
  const callerRole = await getUserRole(supabaseForRole ?? null, user.id);
  if (!canModerate(callerRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, code, description, icon, color, managerId } = body;

  if (isDemoMode()) {
    const newDept = {
      id: `dept-${Date.now()}`,
      name: name || 'New Department',
      code: code || 'NEW',
      description: description || 'Custom department',
      icon: icon || 'FolderPlus',
      color: color || '#6366F1',
      managerId: managerId || user.id,
      teams: [],
      projectsCount: 0,
      tasksCount: 0,
    };
    demoStore.departments.unshift(newDept);
    return NextResponse.json(newDept, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('departments')
    .insert({
      name: name || 'New Department',
      code: code || 'NEW',
      description: description || 'Custom department',
      icon: icon || 'FolderPlus',
      color: color || '#6366F1',
      manager_id: managerId || user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ...data,
    managerId: data.manager_id,
    teams: [],
    projectsCount: 0,
    tasksCount: 0,
  }, { status: 201 });
}