import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../../_utils';
import { canModerate, getUserRole } from '../../_helpers';

type ChannelRow = Record<string, unknown> & {
  id: string;
  department_id?: string;
  departmentId?: string;
  memberIds?: string[];
  member_rows?: { user_id: string }[];
  created_at?: string;
  createdAt?: string;
};

function mapChannel(row: ChannelRow) {
  return {
    ...row,
    departmentId: row.department_id ?? row.departmentId ?? null,
    memberIds: row.memberIds ?? row.member_rows?.map((m) => m.user_id) ?? [],
    createdAt: row.created_at ?? row.createdAt,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const channel = demoStore.channels.find((c) => c.id === id);
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    return NextResponse.json(channel);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('channels')
    .select('*, department:departments(*), member_rows:channel_members(user_id)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Channel not found' }, { status: 404 });
  }

  return NextResponse.json(mapChannel(data));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, type, departmentId } = body;

  if (isDemoMode()) {
    const channel = demoStore.channels.find((c) => c.id === id);
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    if (name !== undefined) channel.name = name;
    if (type !== undefined) channel.type = type;
    if (departmentId !== undefined) channel.departmentId = departmentId;
    return NextResponse.json(channel);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const role = await getUserRole(supabase, user.id);
  if (!canModerate(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (type !== undefined) updates.type = type;
  if (departmentId !== undefined) updates.department_id = departmentId;

  const { data, error } = await supabase.from('channels').update(updates).eq('id', id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapChannel(data));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const index = demoStore.channels.findIndex((c) => c.id === id);
    if (index === -1) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    demoStore.channels.splice(index, 1);
    demoStore.messages = demoStore.messages.filter((m) => m.channelId !== id);
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

  const { error } = await supabase.from('channels').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
