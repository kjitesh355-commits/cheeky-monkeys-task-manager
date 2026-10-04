import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../../_utils';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name } = body;
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
  }

  if (isDemoMode()) {
    const folder = demoStore.folders.find((f) => f.id === id);
    if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    folder.name = trimmed;
    folder.updatedAt = new Date().toISOString();
    return NextResponse.json(folder);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('document_folders')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

  return NextResponse.json({
    ...data,
    departmentId: data.department_id,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const index = demoStore.folders.findIndex((f) => f.id === id);
    if (index === -1) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    demoStore.folders.splice(index, 1);
    // Mirrors ON DELETE SET NULL on the documents.folder_id FK.
    for (const doc of demoStore.documents) {
      if (doc.folderId === id) doc.folderId = null;
    }
    return NextResponse.json({ success: true });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { error } = await supabase.from('document_folders').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
