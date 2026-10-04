import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';
import type { Channel } from '@/types';

type NestedMessageRow = {
  id: string;
  channel_id?: string;
  sender_id?: string;
  content: string;
  attachments?: string[];
  reactions?: Record<string, string[]>;
  created_at?: string;
  sender?: unknown;
};

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get('departmentId');

  if (isDemoMode()) {
    // PUBLIC channels are open; PRIVATE/DIRECT only to members.
    let channels = demoStore.channels.filter(
      (c) => (c.type ?? 'PUBLIC') === 'PUBLIC' || c.memberIds.includes(user.id),
    );
    if (departmentId) channels = channels.filter((c) => c.departmentId === departmentId);
    return NextResponse.json(channels);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  let query = supabase.from('channels').select(`
    *,
    department:departments(*),
    member_rows:channel_members(user_id),
    messages(*, sender:profiles(*))
  `);

  if (departmentId) query = query.eq('department_id', departmentId);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: myMemberships } = await supabase.from('channel_members').select('channel_id').eq('user_id', user.id);
  const myChannelIds = new Set((myMemberships ?? []).map((m) => m.channel_id));

  const channels = data
    ?.filter((c) => c.type === 'PUBLIC' || myChannelIds.has(c.id))
    .map((c) => ({
      ...c,
      departmentId: c.department_id,
      createdAt: c.created_at,
      memberIds: (c.member_rows ?? []).map((m: { user_id: string }) => m.user_id),
      messages: c.messages?.map((m: NestedMessageRow) => ({
        id: m.id,
        channelId: m.channel_id,
        senderId: m.sender_id,
        content: m.content,
        attachments: m.attachments,
        reactions: m.reactions,
        createdAt: m.created_at,
        sender: m.sender,
      })) || [],
    })) || [];

  return NextResponse.json(channels);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, type, departmentId, otherUserId } = body;

  // Direct messages: canonical name `dm:<userA>:<userB>` enables find-or-create.
  if (type === 'DIRECT' && otherUserId && otherUserId !== user.id) {
    const members = [user.id, otherUserId].sort();
    const dmName = `dm:${members.join(':')}`;

    if (isDemoMode()) {
      const existing = demoStore.channels.find((c) => c.type === 'DIRECT' && c.name === dmName);
      if (existing) return NextResponse.json(existing);
      const newChannel: Channel = {
        id: `ch-${Date.now()}`,
        name: dmName,
        type: 'DIRECT',
        departmentId: undefined,
        memberIds: members,
        createdAt: new Date().toISOString(),
      };
      demoStore.channels.unshift(newChannel);
      return NextResponse.json(newChannel, { status: 201 });
    }

    const supabase = await getSupabaseServer();
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

    const { data: existing } = await supabase
      .from('channels')
      .select('*, member_rows:channel_members(user_id)')
      .eq('name', dmName)
      .eq('type', 'DIRECT')
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        ...existing,
        departmentId: existing.department_id,
        createdAt: existing.created_at,
        memberIds: (existing.member_rows ?? []).map((m: { user_id: string }) => m.user_id),
      });
    }

    const { data: created, error } = await supabase
      .from('channels')
      .insert({ name: dmName, type: 'DIRECT' })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { error: memberError } = await supabase
      .from('channel_members')
      .insert(members.map((userId) => ({ channel_id: created.id, user_id: userId })));
    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

    return NextResponse.json(
      { ...created, departmentId: created.department_id, createdAt: created.created_at, memberIds: members },
      { status: 201 },
    );
  }

  if (isDemoMode()) {
    const newChannel = {
      id: `ch-${Date.now()}`,
      name: name || 'New Channel',
      type: type || 'PUBLIC',
      departmentId: departmentId || null,
      memberIds: [user.id],
      createdAt: new Date().toISOString(),
    };
    demoStore.channels.unshift(newChannel);
    return NextResponse.json(newChannel, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('channels')
    .insert({
      name: name || 'New Channel',
      type: type || 'PUBLIC',
      department_id: departmentId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: memberError } = await supabase
    .from('channel_members')
    .insert({ channel_id: data.id, user_id: user.id });
  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({
    ...data,
    departmentId: data.department_id,
    createdAt: data.created_at,
    memberIds: [user.id],
  }, { status: 201 });
}