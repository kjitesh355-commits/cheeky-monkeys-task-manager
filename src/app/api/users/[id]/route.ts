import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../../_utils';
import { canModerate, getUserRole } from '../../_helpers';

type ProfileRow = Record<string, unknown> & {
  id: string;
  department_id?: string | null;
  departmentId?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

function mapProfile(row: ProfileRow) {
  return {
    ...row,
    departmentId: row.department_id ?? row.departmentId,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const found = demoStore.users.find((u: { id: string }) => u.id === id);
    if (!found) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(found);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'User not found' }, { status: error ? 500 : 404 });
  }

  return NextResponse.json(mapProfile(data));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabaseForRole = await getSupabaseServer();
  const callerRole = await getUserRole(supabaseForRole ?? null, user.id);
  const isSelf = user.id === id;
  const moderator = canModerate(callerRole);
  if (!isSelf && !moderator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, title, email, avatar, status, role, departmentId } = body ?? {};

  // Privilege fields (role/department placement) are moderator-only, even self-edit.
  if ((role !== undefined || departmentId !== undefined) && !moderator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (title !== undefined) updates.title = title;
  if (email !== undefined) updates.email = email;
  if (avatar !== undefined) updates.avatar = avatar;
  if (status !== undefined) updates.status = status;
  if (role !== undefined) updates.role = role;
  if (departmentId !== undefined) updates.department_id = departmentId;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  if (isDemoMode()) {
    const found = demoStore.users.find((u: { id: string }) => u.id === id) as
      | (Record<string, unknown> & { id: string })
      | undefined;
    if (!found) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    Object.assign(found, updates);
    if ('department_id' in updates) found.departmentId = updates.department_id;
    found.updatedAt = new Date().toISOString();
    return NextResponse.json(found);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'User not found' }, { status: error ? 500 : 404 });
  }

  return NextResponse.json(mapProfile(data));
}
