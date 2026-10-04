import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';
import { createNotification, logTaskActivity } from '../_helpers';

function shapeUpdate(u: any) {
  return {
    ...u,
    taskId: u.task_id ?? u.taskId,
    userId: u.user_id ?? u.userId,
    parentUpdateId: u.parent_update_id ?? u.parentUpdateId ?? null,
    content: u.content,
    createdAt: u.created_at ?? u.createdAt,
    updatedAt: u.updated_at ?? u.updatedAt,
  };
}

function shapeReactionList(reactions: any[] | undefined) {
  return (reactions || []).reduce((acc: any, r: any) => {
    if (!acc[r.reaction]) acc[r.reaction] = [];
    acc[r.reaction].push(r.user_id ?? r.userId);
    return acc;
  }, {});
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 });
  }

  if (isDemoMode()) {
    const updates = (demoStore.taskUpdates || [])
      .filter((u: any) => u.taskId === taskId)
      .map((u: any) => ({
        ...u,
        replyCount: (demoStore.taskUpdates || []).filter((r: any) => r.parentUpdateId === u.id).length,
      }));
    return NextResponse.json(updates);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('task_updates')
    .select(`
      *,
      author:profiles(*),
      replies:task_updates!parent_update_id(*, author:profiles(*), reactions:task_update_reactions(*)),
      reactions:task_update_reactions(*),
      mentions:task_update_mentions(mentioned_user_id)
    `)
    .eq('task_id', taskId)
    .is('parent_update_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const updates = data?.map((u: any) => {
    const shapedReplies = (u.replies || []).map((r: any) => ({
      ...shapeUpdate(r),
      author: r.author,
      reactions: shapeReactionList(r.reactions),
      mentions: [],
      replyCount: 0,
    }));

    return {
      ...shapeUpdate(u),
      author: u.author,
      replies: shapedReplies,
      reactions: shapeReactionList(u.reactions),
      mentions: u.mentions?.map((m: any) => m.mentioned_user_id) || [],
      replyCount: shapedReplies.length,
    };
  }) || [];

  return NextResponse.json(updates);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { taskId, content, parentUpdateId, mentions, attachment } = body;

  if (!taskId || !content) {
    return NextResponse.json({ error: 'taskId and content required' }, { status: 400 });
  }

  if (isDemoMode()) {
    const newUpdate = {
      id: `update-${Date.now()}`,
      taskId,
      userId: user.id,
      parentUpdateId: parentUpdateId || null,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: demoStore.users.find((u: any) => u.id === user.id),
      replies: [],
      reactions: {},
      mentions: mentions || [],
      replyCount: 0,
    };

    if (!demoStore.taskUpdates) demoStore.taskUpdates = [];
    demoStore.taskUpdates.unshift(newUpdate);

    if (mentions && mentions.length > 0) {
      if (!demoStore.taskUpdateMentions) demoStore.taskUpdateMentions = [];
      for (const mentionedUserId of mentions) {
        demoStore.taskUpdateMentions.push({
          id: `mention-${Date.now()}-${mentionedUserId}`,
          updateId: newUpdate.id,
          mentionedUserId,
          createdAt: new Date().toISOString(),
        });
      }
    }

    await logTaskActivity(null, taskId, user.id, 'COMMENT_ADDED', { preview: content.substring(0, 120) });
    await notifyMentions(null, taskId, user.id, content, mentions || []);

    return NextResponse.json(newUpdate, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: update, error: updateError } = await supabase
    .from('task_updates')
    .insert({
      task_id: taskId,
      user_id: user.id,
      parent_update_id: parentUpdateId || null,
      content,
    })
    .select('*, author:profiles(*)')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const mentionList: string[] = Array.isArray(mentions) ? mentions.filter((m: unknown): m is string => typeof m === 'string') : [];
  const uniqueMentions: string[] = Array.from(new Set(mentionList.filter((id) => id && id !== user.id)));

  if (uniqueMentions.length > 0) {
    const mentionData = uniqueMentions.map((mentionedUserId: string) => ({
      update_id: update.id,
      mentioned_user_id: mentionedUserId,
    }));
    await supabase.from('task_update_mentions').insert(mentionData);
  }

  await logTaskActivity(supabase, taskId, user.id, 'COMMENT_ADDED', { preview: content.substring(0, 120) });
  await notifyMentions(supabase, taskId, user.id, content, uniqueMentions);

  return NextResponse.json({
    ...shapeUpdate(update),
    author: update.author,
    replies: [],
    reactions: {},
    mentions: uniqueMentions,
    replyCount: 0,
  }, { status: 201 });
}

/** Notify every mentioned user (except the author). */
async function notifyMentions(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServer>>> | null,
  taskId: string,
  authorId: string,
  content: string,
  mentions: string[]
) {
  const unique = Array.from(new Set(mentions.filter((id) => id && id !== authorId)));
  if (unique.length === 0) return;

  let authorName = 'A teammate';
  if (supabase) {
    const { data } = await supabase.from('profiles').select('name').eq('id', authorId).single();
    authorName = data?.name || authorName;
  } else {
    authorName = demoStore.users.find((u: any) => u.id === authorId)?.name || authorName;
  }

  let taskTitle = '';
  if (supabase) {
    const { data } = await supabase.from('tasks').select('title').eq('id', taskId).single();
    taskTitle = data?.title || '';
  } else {
    taskTitle = demoStore.tasks.find((t: any) => t.id === taskId)?.title || '';
  }

  const excerpt = content.replace(/\s+/g, ' ').substring(0, 100);

  for (const mentionedUserId of unique) {
    await createNotification(supabase, {
      userId: mentionedUserId,
      type: 'MENTION',
      title: `${authorName} mentioned you${taskTitle ? ` in "${taskTitle}"` : ''}`,
      message: excerpt,
      actionUrl: `/?task=${taskId}`,
      targetType: 'TASK',
      targetId: taskId,
    });
  }
}
