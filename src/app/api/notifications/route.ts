import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isDemoMode()) {
    const notifications = demoStore.notifications
      .filter(n => n.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(notifications);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const notifications = data?.map(n => ({
    ...n,
    userId: n.user_id,
    taskId: n.target_type === 'TASK' ? (n.target_id ?? undefined) : undefined,
    projectId: n.target_type === 'PROJECT' ? (n.target_id ?? undefined) : undefined,
    createdAt: n.created_at,
  })) || [];

  return NextResponse.json(notifications);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { type, title, message, actionUrl, targetType, targetId } = body;

  if (isDemoMode()) {
    const newNotif = {
      id: `notif-${Date.now()}`,
      userId: user.id,
      type: type || 'SYSTEM',
      title: title || 'Notification',
      message: message || '',
      actionUrl: actionUrl || null,
      targetType: targetType || null,
      targetId: targetId || null,
      taskId: String(targetType || '').toUpperCase() === 'TASK' ? (targetId ?? undefined) : undefined,
      projectId: String(targetType || '').toUpperCase() === 'PROJECT' ? (targetId ?? undefined) : undefined,
      read: false,
      createdAt: new Date().toISOString(),
    };
    demoStore.notifications.unshift(newNotif);
    return NextResponse.json(newNotif, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      type: type || 'info',
      title: title || 'Notification',
      message: message || '',
      action_url: actionUrl,
      target_type: targetType,
      target_id: targetId,
      read: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ...data,
    userId: data.user_id,
    actionUrl: data.action_url,
    targetType: data.target_type,
    targetId: data.target_id,
    createdAt: data.created_at,
  }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { notificationId, read, all } = body;

  // Batch: mark every unread notification for this user as read.
  if (all === true) {
    if (isDemoMode()) {
      demoStore.notifications = demoStore.notifications.map((n) =>
        n.userId === user.id ? { ...n, read: true } : n
      );
      return NextResponse.json({ success: true });
    }

    const supabaseAll = await getSupabaseServer();
    if (!supabaseAll) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }
    const { error } = await supabaseAll.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (!notificationId) {
    return NextResponse.json({ error: 'notificationId is required' }, { status: 400 });
  }

  if (isDemoMode()) {
    const notifIndex = demoStore.notifications.findIndex(n => n.id === notificationId && n.userId === user.id);
    if (notifIndex === -1) {
      // Idempotent: client-derived notifications don't exist server-side.
      return NextResponse.json({ success: true });
    }
    demoStore.notifications[notifIndex].read = read ?? true;
    return NextResponse.json(demoStore.notifications[notifIndex]);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ read: read ?? true })
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ...data,
    userId: data.user_id,
    actionUrl: data.action_url,
    targetType: data.target_type,
    targetId: data.target_id,
    createdAt: data.created_at,
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { notificationId, all } = body || {};

  if (isDemoMode()) {
    if (all === true) {
      demoStore.notifications = demoStore.notifications.filter((n) => n.userId !== user.id);
      return NextResponse.json({ success: true });
    }
    const index = demoStore.notifications.findIndex((n) => n.id === notificationId && n.userId === user.id);
    if (index === -1) {
      // Idempotent: client-derived notifications don't exist server-side.
      return NextResponse.json({ success: true });
    }
    demoStore.notifications.splice(index, 1);
    return NextResponse.json({ success: true });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  if (all === true) {
    const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (!notificationId) {
    return NextResponse.json({ error: 'notificationId is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}