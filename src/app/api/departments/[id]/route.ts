import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../../_utils';
import { canModerate, getUserRole } from '../../_helpers';

type TeamRow = {
  id: string;
  name: string;
  department_id?: string;
  lead_id?: string | null;
  member_ids?: string[];
};

type DepartmentRow = Record<string, unknown> & {
  id: string;
  manager_id?: string | null;
  managerId?: string;
  teams?: TeamRow[];
};

function mapDepartment(row: DepartmentRow) {
  return {
    ...row,
    managerId: row.manager_id ?? row.managerId,
    teams:
      row.teams?.map((t) => ({
        id: t.id,
        name: t.name,
        departmentId: t.department_id ?? row.id,
        leadId: t.lead_id,
        memberIds: t.member_ids || [],
      })) || [],
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const dept = demoStore.departments.find((d) => d.id === id);
    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    return NextResponse.json(dept);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('departments')
    .select('*, manager:profiles(*), teams(*, lead:profiles(*))')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Department not found' }, { status: 404 });
  }

  return NextResponse.json(mapDepartment(data));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, code, description, icon, color, managerId } = body;

  if (isDemoMode()) {
    const dept = demoStore.departments.find((d) => d.id === id);
    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    if (name !== undefined) dept.name = name;
    if (code !== undefined) dept.code = code;
    if (description !== undefined) dept.description = description;
    if (icon !== undefined) dept.icon = icon;
    if (color !== undefined) dept.color = color;
    if (managerId !== undefined) dept.managerId = managerId;
    return NextResponse.json(dept);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('departments')
    .select('manager_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 });
  }

  const role = await getUserRole(supabase, user.id);
  if (existing.manager_id !== user.id && !canModerate(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (code !== undefined) updates.code = code;
  if (description !== undefined) updates.description = description;
  if (icon !== undefined) updates.icon = icon;
  if (color !== undefined) updates.color = color;
  if (managerId !== undefined) updates.manager_id = managerId;

  const { data, error } = await supabase.from('departments').update(updates).eq('id', id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapDepartment(data));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const index = demoStore.departments.findIndex((d) => d.id === id);
    if (index === -1) return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    demoStore.departments.splice(index, 1);
    return NextResponse.json({ success: true });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const role = await getUserRole(supabase, user.id);
  if (!canModerate(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('departments')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 });
  }

  // Clear FK references that would otherwise block the delete (tasks/documents
  // have no ON DELETE clause); projects/teams/channels cascade.
  await supabase.from('tasks').update({ department_id: null }).eq('department_id', id);
  await supabase.from('documents').update({ department_id: null }).eq('department_id', id);
  await supabase.from('profiles').update({ department_id: null }).eq('department_id', id);

  const { error } = await supabase.from('departments').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
