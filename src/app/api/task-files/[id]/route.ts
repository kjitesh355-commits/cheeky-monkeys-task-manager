import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../../_utils';
import { canModerate, getUserRole, logTaskActivity } from '../../_helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const file = demoStore.taskFiles?.find((f: any) => f.id === id);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json(file);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('task_files')
    .select(`
      *,
      uploader:profiles(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const { data: signedUrl } = await supabase.storage
    .from('task-files')
    .createSignedUrl(data.file_path, 3600);

  return NextResponse.json({
    ...data,
    taskId: data.task_id,
    uploadedBy: data.uploaded_by,
    fileName: data.file_name,
    filePath: data.file_path,
    fileType: data.file_type,
    fileSize: data.file_size,
    storageProvider: data.storage_provider,
    createdAt: data.created_at,
    uploader: data.uploader,
    downloadUrl: signedUrl?.signedUrl,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const file = demoStore.taskFiles?.find((f: any) => f.id === id);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const role = await getUserRole(null, user.id);
    if (file.uploadedBy !== user.id && !canModerate(role)) {
      return NextResponse.json({ error: 'You do not have permission to delete this file' }, { status: 403 });
    }
    demoStore.taskFiles = demoStore.taskFiles.filter((f: any) => f.id !== id);
    await logTaskActivity(null, file.taskId, user.id, 'FILE_DELETED', { file_name: file.fileName });
    return NextResponse.json({ success: true });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: file, error: fetchError } = await supabase
    .from('task_files')
    .select('file_path, file_name, task_id, uploaded_by')
    .eq('id', id)
    .single();

  if (fetchError || !file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const role = await getUserRole(supabase, user.id);
  if (file.uploaded_by !== user.id && !canModerate(role)) {
    return NextResponse.json({ error: 'You do not have permission to delete this file' }, { status: 403 });
  }

  const { error: deleteError } = await supabase.from('task_files').delete().eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await supabase.storage.from('task-files').remove([file.file_path]);
  await logTaskActivity(supabase, file.task_id, user.id, 'FILE_DELETED', { file_name: file.file_name });

  return NextResponse.json({ success: true });
}