import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';

type MessageRow = {
  id: string;
  channel_id?: string;
  channelId?: string;
  sender_id?: string;
  senderId?: string;
  content: string;
  attachments?: string[];
  reactions?: Record<string, string[]>;
  created_at?: string;
  createdAt?: string;
  sender?: unknown;
};

function mapMessage(row: MessageRow) {
  return {
    id: row.id,
    channelId: row.channel_id ?? row.channelId,
    senderId: row.sender_id ?? row.senderId,
    content: row.content,
    attachments: row.attachments ?? [],
    reactions: row.reactions ?? {},
    createdAt: row.created_at ?? row.createdAt,
    sender: row.sender,
  };
}

// PUBLIC channels are open; PRIVATE/DIRECT channels require membership.
async function channelGate(channelId: string, user: { id: string }) {
  if (isDemoMode()) {
    const channel = demoStore.channels.find((c) => c.id === channelId);
    if (!channel) return { error: 'Channel not found', status: 404 };
    if ((channel.type ?? 'PUBLIC') !== 'PUBLIC' && !channel.memberIds.includes(user.id)) {
      return { error: 'Not a member of this channel', status: 403 };
    }
    return null;
  }

  const supabase = await getSupabaseServer();
  if (!supabase) return { error: 'Supabase not configured', status: 500 };
  const { data: channel } = await supabase
    .from('channels')
    .select('id, type, member_rows:channel_members(user_id)')
    .eq('id', channelId)
    .maybeSingle();
  if (!channel) return { error: 'Channel not found', status: 404 };
  if (channel.type !== 'PUBLIC') {
    const memberIds = (channel.member_rows ?? []).map((r: { user_id: string }) => r.user_id);
    if (!memberIds.includes(user.id)) return { error: 'Not a member of this channel', status: 403 };
  }
  return null;
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');

  if (channelId) {
    const gate = await channelGate(channelId, user);
    if (gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (isDemoMode()) {
    let messages = [...demoStore.messages];
    if (channelId) messages = messages.filter((m) => m.channelId === channelId);
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return NextResponse.json(messages.map(mapMessage));
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  let query = supabase.from('messages').select('*, sender:profiles(*)');
  if (channelId) query = query.eq('channel_id', channelId);

  const { data, error } = await query.order('created_at', { ascending: true }).limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data || []).map(mapMessage));
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { channelId, content, attachments } = body;

  if (!channelId || !content || !String(content).trim()) {
    return NextResponse.json({ error: 'channelId and content are required' }, { status: 400 });
  }

  const gate = await channelGate(channelId, user);
  if (gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  if (isDemoMode()) {
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      channelId,
      senderId: user.id,
      content: String(content).trim(),
      attachments: attachments || [],
      reactions: {},
      createdAt: new Date().toISOString(),
    };
    demoStore.messages.push(newMessage);
    return NextResponse.json(newMessage, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      channel_id: channelId,
      sender_id: user.id,
      content: String(content).trim(),
      attachments: attachments || [],
    })
    .select('*, sender:profiles(*)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapMessage(data), { status: 201 });
}
