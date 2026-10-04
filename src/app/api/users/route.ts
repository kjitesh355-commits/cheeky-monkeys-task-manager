import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';
import { canModerate, getUserRole } from '../_helpers';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isDemoMode()) {
    return NextResponse.json(demoStore.users);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = data?.map(u => ({
    ...u,
    departmentId: u.department_id,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  })) || [];

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseForRole = await getSupabaseServer();
  const callerRole = await getUserRole(supabaseForRole ?? null, user.id);
  if (!canModerate(callerRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { email, name, title, role, departmentId } = body;

  if (isDemoMode()) {
    const newUser = {
      id: `usr-${Date.now()}`,
      name: name || 'New User',
      email: email || `user${Date.now()}@company.com`,
      avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 100)}?w=150&auto=format&fit=crop&q=80`,
      role: role || 'MEMBER',
      title: title || '',
      departmentId: departmentId || null,
      status: 'online' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    demoStore.users.push(newUser);
    return NextResponse.json(newUser, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      name: name || 'New User',
      email: email || `user${Date.now()}@company.com`,
      title: title || '',
      role: role || 'MEMBER',
      department_id: departmentId || null,
      status: 'online',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ...data,
    departmentId: data.department_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }, { status: 201 });
}