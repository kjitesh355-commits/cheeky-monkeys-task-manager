import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../../../_utils';
import { canModerate, getUserRole } from '../../../_helpers';

type ProfileRow = Record<string, unknown> & {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role?: string;
  title?: string | null;
  department_id?: string | null;
  departmentId?: string | null;
  status?: string;
};

function mapProfile(row: ProfileRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    role: row.role,
    title: row.title,
    departmentId: row.department_id ?? row.departmentId ?? null,
    status: row.status,
  };
}

/** Department membership is modeled via profiles.department_id (schema has no join table). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const members = demoStore.users.filter((u) => u.departmentId === id);
    return NextResponse.json(members);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('department_id', id)
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data || []).map(mapProfile));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  if (isDemoMode()) {
    const member = demoStore.users.find((u) => u.id === userId);
    if (!member) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    member.departmentId = id;
    return NextResponse.json(member);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const role = await getUserRole(supabase, user.id);
  const { data: dept } = await supabase.from('departments').select('manager_id').eq('id', id).single();
  if (!dept || (dept.manager_id !== user.id && !canModerate(role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ department_id: id })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapProfile(data), { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  if (isDemoMode()) {
    const member = demoStore.users.find((u) => u.id === userId && u.departmentId === id);
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    member.departmentId = undefined;
    return NextResponse.json({ success: true });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const role = await getUserRole(supabase, user.id);
  const { data: dept } = await supabase.from('departments').select('manager_id').eq('id', id).single();
  if (!dept || (dept.manager_id !== user.id && !canModerate(role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('profiles').update({ department_id: null }).eq('id', userId).eq('department_id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
