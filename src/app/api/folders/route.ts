import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';
import type { DocumentFolder } from '@/types';

type FolderRow = Record<string, unknown> & {
  id: string;
  name: string;
  department_id?: string;
  departmentId?: string;
  created_by?: string;
  createdBy?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

function mapFolder(row: FolderRow): DocumentFolder {
  return {
    ...row,
    departmentId: row.department_id ?? row.departmentId ?? null,
    createdBy: row.created_by ?? row.createdBy,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  } as DocumentFolder;
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get('departmentId');

  if (isDemoMode()) {
    let folders = [...demoStore.folders];
    if (departmentId) folders = folders.filter((f) => (f.departmentId || null) === departmentId);
    return NextResponse.json(folders);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  let query = supabase.from('document_folders').select('*');
  if (departmentId) query = query.eq('department_id', departmentId);

  const { data, error } = await query.order('name', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data || []).map(mapFolder));
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, departmentId } = body;
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
  }

  if (isDemoMode()) {
    const now = new Date().toISOString();
    const newFolder: DocumentFolder = {
      id: `folder-${Date.now()}`,
      name: trimmed,
      departmentId: departmentId || null,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    demoStore.folders.push(newFolder);
    return NextResponse.json(newFolder, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('document_folders')
    .insert({ name: trimmed, department_id: departmentId || null, created_by: user.id })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapFolder(data), { status: 201 });
}
