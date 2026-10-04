import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../../_utils';
import { canModerate, getUserRole } from '../../_helpers';

type DocumentRow = Record<string, unknown> & {
  id: string;
  author_id?: string;
  authorId?: string;
  department_id?: string;
  departmentId?: string;
  project_id?: string;
  projectId?: string;
  folder_id?: string;
  folderId?: string;
  updated_at?: string;
  updatedAt?: string;
  created_at?: string;
  createdAt?: string;
};

function mapDocument(row: DocumentRow) {
  return {
    ...row,
    authorId: row.author_id ?? row.authorId,
    departmentId: row.department_id ?? row.departmentId,
    projectId: row.project_id ?? row.projectId,
    folderId: row.folder_id ?? row.folderId ?? null,
    updatedAt: row.updated_at ?? row.updatedAt,
    createdAt: row.created_at ?? row.createdAt,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const doc = demoStore.documents.find((d) => d.id === id);
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    return NextResponse.json(doc);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*, author:profiles(*), department:departments(*), project:projects(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Document not found' }, { status: 404 });
  }

  return NextResponse.json(mapDocument(data));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { title, content, category, departmentId, projectId, folderId, icon } = body;

  if (isDemoMode()) {
    const doc = demoStore.documents.find((d) => d.id === id);
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    if (title !== undefined) doc.title = title;
    if (content !== undefined) doc.content = content;
    if (category !== undefined) doc.category = category;
    if (departmentId !== undefined) doc.departmentId = departmentId;
    if (projectId !== undefined) doc.projectId = projectId;
    if (folderId !== undefined) doc.folderId = folderId;
    if (icon !== undefined) doc.icon = icon;
    doc.updatedAt = new Date().toISOString().split('T')[0];
    return NextResponse.json(doc);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('documents')
    .select('author_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const role = await getUserRole(supabase, user.id);
  if (existing.author_id !== user.id && !canModerate(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (category !== undefined) updates.category = category;
  if (departmentId !== undefined) updates.department_id = departmentId;
  if (projectId !== undefined) updates.project_id = projectId;
  if (folderId !== undefined) updates.folder_id = folderId;
  if (icon !== undefined) updates.icon = icon;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('documents').update(updates).eq('id', id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapDocument(data));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (isDemoMode()) {
    const index = demoStore.documents.findIndex((d) => d.id === id);
    if (index === -1) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    demoStore.documents.splice(index, 1);
    return NextResponse.json({ success: true });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('documents')
    .select('author_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const role = await getUserRole(supabase, user.id);
  if (existing.author_id !== user.id && !canModerate(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
