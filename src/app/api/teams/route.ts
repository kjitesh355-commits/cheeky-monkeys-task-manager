import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';
import { canModerate, getUserRole } from '../_helpers';

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { departmentId, name, leadId } = body ?? {};

  if (!departmentId || !name || !String(name).trim()) {
    return NextResponse.json({ error: 'departmentId and name are required' }, { status: 400 });
  }

  const supabaseForRole = await getSupabaseServer();
  const callerRole = await getUserRole(supabaseForRole ?? null, user.id);
  const moderator = canModerate(callerRole);
  const isDeptManager =
    !moderator && Boolean(supabaseForRole) && (await isManagerOf(supabaseForRole!, user.id, departmentId));
  if (!moderator && !isDeptManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (isDemoMode()) {
    const dept = demoStore.departments.find((d: { id: string }) => d.id === departmentId) as
      | { teams: unknown[] }
      | undefined;
    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    const team = {
      id: `team-${Date.now()}`,
      name: String(name).trim(),
      departmentId,
      leadId: leadId || user.id,
      memberIds: [] as string[],
    };
    dept.teams.push(team);
    return NextResponse.json(team, { status: 201 });
  }

  const supabase = supabaseForRole ?? (await getSupabaseServer());
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('teams')
    .insert({
      name: String(name).trim(),
      department_id: departmentId,
      lead_id: leadId || null,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create team' }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: data.id,
      name: data.name,
      departmentId: data.department_id,
      leadId: data.lead_id,
      memberIds: [],
    },
    { status: 201 }
  );
}

async function isManagerOf(supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServer>>>, userId: string, departmentId: string) {
  const { data } = await supabase
    .from('departments')
    .select('manager_id')
    .eq('id', departmentId)
    .single();
  return Boolean(data && data.manager_id === userId);
}
