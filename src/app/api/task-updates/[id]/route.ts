import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../../_utils';
import { canModerate, getUserRole, logTaskActivity } from '../../_helpers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { content, reaction } = body;

  if (isDemoMode()) {
    const updateIndex = demoStore.taskUpdates?.findIndex((u) => u.id === id);
    if (updateIndex === undefined || updateIndex === -1) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    const existing = demoStore.taskUpdates[updateIndex];
    const isAuthor = existing.userId === user.id;
    const role = await getUserRole(null, user.id);

    if (reaction) {
      if (!demoStore.taskUpdateReactions) demoStore.taskUpdateReactions = [];
      const existingReaction = demoStore.taskUpdateReactions.find(
        (r) => r.updateId === id && r.userId === user.id && r.reaction === reaction
      );
      if (existingReaction) {
        demoStore.taskUpdateReactions = demoStore.taskUpdateReactions.filter(
          (r) => !(r.updateId === id && r.userId === user.id && r.reaction === reaction)
        );
      } else {
        demoStore.taskUpdateReactions.push({
          id: `reaction-${Date.now()}`,
          updateId: id,
          userId: user.id,
          reaction,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (content !== undefined) {
      if (!isAuthor && !canModerate(role)) {
        return NextResponse.json({ error: 'You can only edit your own updates' }, { status: 403 });
      }
      demoStore.taskUpdates[updateIndex] = {
        ...existing,
        content,
        updatedAt: new Date().toISOString(),
      };
      await logTaskActivity(null, existing.taskId, user.id, 'COMMENT_EDITED', { preview: content.substring(0, 120) });
    }

    return NextResponse.json(demoStore.taskUpdates[updateIndex]);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  if (reaction) {
    const { data: existingReaction } = await supabase
      .from('task_update_reactions')
      .select('*')
      .eq('update_id', id)
      .eq('user_id', user.id)
      .eq('reaction', reaction)
      .single();

    if (existingReaction) {
      await supabase
        .from('task_update_reactions')
        .delete()
        .eq('update_id', id)
        .eq('user_id', user.id)
        .eq('reaction', reaction);
    } else {
      await supabase
        .from('task_update_reactions')
        .insert({
          update_id: id,
          user_id: user.id,
          reaction,
        });
    }
  }

  if (content !== undefined) {
    const { data: existing } = await supabase
      .from('task_updates')
      .select('id, task_id, user_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    const role = await getUserRole(supabase, user.id);
    if (existing.user_id !== user.id && !canModerate(role)) {
      return NextResponse.json({ error: 'You can only edit your own updates' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('task_updates')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, author:profiles(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logTaskActivity(supabase, existing.task_id, user.id, 'COMMENT_EDITED', { preview: content.substring(0, 120) });

    return NextResponse.json({
      id: data.id,
      taskId: data.task_id,
      userId: data.user_id,
      parentUpdateId: data.parent_update_id,
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      author: data.author,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const existing = demoStore.taskUpdates?.find((u) => u.id === id);
    if (!existing) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    const role = await getUserRole(null, user.id);
    if (existing.userId !== user.id && !canModerate(role)) {
      return NextResponse.json({ error: 'You can only delete your own updates' }, { status: 403 });
    }

    demoStore.taskUpdates = demoStore.taskUpdates.filter((u) => u.id !== id);
    demoStore.taskUpdateMentions = demoStore.taskUpdateMentions.filter((m) => m.updateId !== id);
    demoStore.taskUpdateReactions = demoStore.taskUpdateReactions.filter((r) => r.updateId !== id);
    await logTaskActivity(null, existing.taskId, user.id, 'COMMENT_DELETED', { preview: existing.content.substring(0, 120) });

    return NextResponse.json({ success: true });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from('task_updates')
    .select('id, task_id, user_id, content')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Update not found' }, { status: 404 });
  }

  const role = await getUserRole(supabase, user.id);
  if (existing.user_id !== user.id && !canModerate(role)) {
    return NextResponse.json({ error: 'You can only delete your own updates' }, { status: 403 });
  }

  const { error } = await supabase.from('task_updates').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logTaskActivity(supabase, existing.task_id, user.id, 'COMMENT_DELETED', { preview: existing.content.substring(0, 120) });

  return NextResponse.json({ success: true });
}
