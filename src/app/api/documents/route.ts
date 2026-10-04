import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get('departmentId');
  const projectId = searchParams.get('projectId');
  const category = searchParams.get('category');
  const folderId = searchParams.get('folderId');

  if (isDemoMode()) {
    let documents = [...demoStore.documents];
    
    if (departmentId) documents = documents.filter(d => d.departmentId === departmentId);
    if (projectId) documents = documents.filter(d => d.projectId === projectId);
    if (category && category !== 'ALL') documents = documents.filter(d => d.category === category);
    if (folderId) documents = documents.filter(d => (d.folderId || null) === folderId);
    
    return NextResponse.json(documents);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  let query = supabase.from('documents').select(`
    *,
    author:profiles(*),
    department:departments(*),
    project:projects(*)
  `);

  if (departmentId) query = query.eq('department_id', departmentId);
  if (projectId) query = query.eq('project_id', projectId);
  if (category && category !== 'ALL') query = query.eq('category', category);
  if (folderId) query = query.eq('folder_id', folderId);

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const documents = data?.map(d => ({
    ...d,
    authorId: d.author_id,
    departmentId: d.department_id,
    projectId: d.project_id,
    folderId: d.folder_id,
    updatedAt: d.updated_at,
    createdAt: d.created_at,
  })) || [];

  return NextResponse.json(documents);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, content, category, departmentId, projectId, folderId } = body;

  if (isDemoMode()) {
    const newDoc = {
      id: `doc-${Date.now()}`,
      title: title || 'Untitled Document',
      content: content || '# Document Title\n\nStart typing documentation...',
      authorId: user.id,
      category: category || 'Company',
      departmentId: departmentId || null,
      projectId: projectId || null,
      folderId: folderId || null,
      icon: 'FileText',
      updatedAt: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
    };
    demoStore.documents.unshift(newDoc);
    return NextResponse.json(newDoc, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      title: title || 'Untitled Document',
      content: content || '# Document Title\n\nStart typing documentation...',
      author_id: user.id,
      category: category || 'Company',
      department_id: departmentId,
      project_id: projectId,
      folder_id: folderId || null,
      icon: 'FileText',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ...data,
    authorId: data.author_id,
    departmentId: data.department_id,
    projectId: data.project_id,
    folderId: data.folder_id,
    updatedAt: data.updated_at,
    createdAt: data.created_at,
  }, { status: 201 });
}