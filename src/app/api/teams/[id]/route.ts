import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../../_utils';
import { canModerate, getUserRole } from '../../_helpers';

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof getSupabaseServer>>>;

async function findDemoTeam(teamId: string) {
  for (const dept of demoStore.departments as Array<{ id: string; teams: Array<{ id: string; name: string; departmentId: string; leadId: string; memberIds: string[] }> }>) {
    const team = dept.teams.find((t) => t.id === teamId);
    if (team) return { dept, team };
  }
  return null;
}

async function authorize(supabase: SupabaseClient | null, userId: string, departmentId: string | null) {
  const role = await getUserRole(supabase, userId);
  if (canModerate(role)) return true;
  if (!supabase || !departmentId) return false;
  const { data } = await supabase
    .from('departments')
    .select('manager_id')
    .eq('id', departmentId)
    .single();
  return Boolean(data && data.manager_id === userId);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, leadId } = body ?? {};

  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
  }

  if (isDemoMode()) {
    const found = await findDemoTeam(id);
    if (!found) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    if (!(await authorize(null, user.id, found.dept.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (name !== undefined) found.team.name = String(name).trim();
    if (leadId !== undefined) found.team.leadId = leadId;
    return NextResponse.json(found.team);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: existing } = await supabase.from('teams').select('department_id').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (!(await authorize(supabase, user.id, existing.department_id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (leadId !== undefined) updates.lead_id = leadId;

  const { data, error } = await supabase.from('teams').update(updates).eq('id', id).select().single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Team not found' }, { status: error ? 500 : 404 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    departmentId: data.department_id,
    leadId: data.lead_id,
    memberIds: [],
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const found = await findDemoTeam(id);
    if (!found) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    if (!(await authorize(null, user.id, found.dept.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    found.dept.teams = found.dept.teams.filter((t) => t.id !== id);
    return NextResponse.json({ success: true });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: existing } = await supabase.from('teams').select('department_id').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (!(await authorize(supabase, user.id, existing.department_id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
