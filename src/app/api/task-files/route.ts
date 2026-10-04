import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';
import { logTaskActivity } from '../_helpers';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const PREVIEWABLE = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf',
]);

function shapeFile(f: any) {
  return {
    ...f,
    taskId: f.task_id ?? f.taskId,
    uploadedBy: f.uploaded_by ?? f.uploadedBy,
    fileName: f.file_name ?? f.fileName,
    filePath: f.file_path ?? f.filePath,
    fileType: f.file_type ?? f.fileType,
    fileSize: f.file_size ?? f.fileSize,
    storageProvider: f.storage_provider ?? f.storageProvider,
    createdAt: f.created_at ?? f.createdAt,
    uploader: f.uploader,
    downloadUrl: f.downloadUrl,
  };
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
    const files = demoStore.taskFiles?.filter((f: any) => f.taskId === taskId) || [];
    return NextResponse.json(files);
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
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Signed URLs for previewable files (images / PDFs)
  const files = await Promise.all((data || []).map(async (f: any) => {
    let downloadUrl: string | undefined;
    if (PREVIEWABLE.has(f.file_type)) {
      const { data: signed } = await supabase.storage
        .from('task-files')
        .createSignedUrl(f.file_path, 3600);
      downloadUrl = signed?.signedUrl;
    }
    return shapeFile({ ...f, downloadUrl });
  }));

  return NextResponse.json(files);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const taskId = formData.get('taskId') as string;
  const file = formData.get('file') as File;

  if (!taskId || !file) {
    return NextResponse.json({ error: 'taskId and file required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
  }

  if (isDemoMode()) {
    const newFile = {
      id: `file-${Date.now()}`,
      taskId,
      uploadedBy: user.id,
      fileName: file.name,
      filePath: `/demo/${file.name}`,
      fileType: file.type,
      fileSize: file.size,
      storageProvider: 'demo',
      createdAt: new Date().toISOString(),
      uploader: demoStore.users.find((u: any) => u.id === user.id),
    };

    if (!demoStore.taskFiles) demoStore.taskFiles = [];
    demoStore.taskFiles.unshift(newFile);
    await logTaskActivity(null, taskId, user.id, 'FILE_UPLOADED', { file_name: file.name, file_size: file.size });

    return NextResponse.json(newFile, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const fileExt = file.name.split('.').pop() || 'bin';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `task-files/${taskId}/${fileName}`;

  let { error: uploadError } = await supabase.storage
    .from('task-files')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  // Best effort: create the bucket on first upload if it does not exist yet.
  if (uploadError && /bucket/i.test(uploadError.message || '')) {
    const { error: bucketError } = await supabase.storage.createBucket('task-files', {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
    });
    if (!bucketError) {
      const retry = await supabase.storage
        .from('task-files')
        .upload(filePath, file, { contentType: file.type, upsert: false });
      uploadError = retry.error;
    }
  }

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: fileRecord, error: dbError } = await supabase
    .from('task_files')
    .insert({
      task_id: taskId,
      uploaded_by: user.id,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      storage_provider: 'supabase',
    })
    .select(`
      *,
      uploader:profiles(*)
    `)
    .single();

  if (dbError) {
    await supabase.storage.from('task-files').remove([filePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  await logTaskActivity(supabase, taskId, user.id, 'FILE_UPLOADED', {
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
  });

  return NextResponse.json(shapeFile(fileRecord), { status: 201 });
}
