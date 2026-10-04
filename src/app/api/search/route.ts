import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';

/** Sanitize user input before embedding it in an `.or(ilike...)` filter. */
function sanitize(q: string): string {
  return q.replace(/[%_,()]/g, ' ').trim().slice(0, 100);
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    return NextResponse.json({ query: '', tasks: [], projects: [], departments: [], documents: [], messages: [], users: [] });
  }

  if (isDemoMode()) {
    const needle = q.toLowerCase();
    return NextResponse.json({
      query: q,
      tasks: demoStore.tasks.filter((t) => t.title.toLowerCase().includes(needle)).slice(0, 8),
      projects: demoStore.projects.filter((p) => p.name.toLowerCase().includes(needle)).slice(0, 8),
      departments: demoStore.departments.filter((d) => d.name.toLowerCase().includes(needle) || d.code.toLowerCase().includes(needle)).slice(0, 8),
      documents: demoStore.documents.filter((d) => d.title.toLowerCase().includes(needle)).slice(0, 8),
      messages: demoStore.messages.filter((m) => m.content.toLowerCase().includes(needle)).slice(0, 8),
      users: demoStore.users.filter((u) => u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle)).slice(0, 8),
    });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const term = sanitize(q);
  if (!term) {
    return NextResponse.json({ query: q, tasks: [], projects: [], departments: [], documents: [], messages: [], users: [] });
  }

  const [tasks, projects, departments, documents, messages, users] = await Promise.all([
    supabase.from('tasks').select('id, title, status, priority, project_id, department_id').or(`title.ilike.%${term}%`).eq('archived', false).limit(8),
    supabase.from('projects').select('id, name, status, department_id, color, icon').or(`name.ilike.%${term}%`).limit(8),
    supabase.from('departments').select('id, name, code, icon, color').or(`name.ilike.%${term}%,code.ilike.%${term}%`).limit(8),
    supabase.from('documents').select('id, title, category, department_id, project_id, icon').or(`title.ilike.%${term}%`).limit(8),
    supabase.from('messages').select('id, channel_id, content, created_at').or(`content.ilike.%${term}%`).order('created_at', { ascending: false }).limit(8),
    supabase.from('profiles').select('id, name, email, avatar, role, title').or(`name.ilike.%${term}%,email.ilike.%${term}%`).limit(8),
  ]);

  return NextResponse.json({
    query: q,
    tasks: (tasks.data || []).map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, projectId: t.project_id, departmentId: t.department_id })),
    projects: (projects.data || []).map((p) => ({ id: p.id, name: p.name, status: p.status, departmentId: p.department_id, color: p.color, icon: p.icon })),
    departments: departments.data || [],
    documents: (documents.data || []).map((d) => ({ id: d.id, title: d.title, category: d.category, departmentId: d.department_id, projectId: d.project_id, icon: d.icon })),
    messages: (messages.data || []).map((m) => ({ id: m.id, channelId: m.channel_id, content: m.content, createdAt: m.created_at })),
    users: users.data || [],
  });
}
