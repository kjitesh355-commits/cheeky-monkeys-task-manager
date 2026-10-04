import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/supabase/server';
import { demoStore, getUser, isDemoMode } from '../_utils';

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get('departmentId');
  const status = searchParams.get('status');

  if (isDemoMode()) {
    let projects = [...demoStore.projects];
    
    if (departmentId) projects = projects.filter(p => p.departmentId === departmentId);
    if (status && status !== 'ALL') projects = projects.filter(p => p.status === status);
    
    return NextResponse.json(projects);
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  let query = supabase.from('projects').select(`
    *,
    department:departments(*),
    owner:profiles(*),
    lists(*)
  `);

  if (departmentId) query = query.eq('department_id', departmentId);
  if (status && status !== 'ALL') query = query.eq('status', status);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const projects = data?.map(p => ({
    ...p,
    departmentId: p.department_id,
    teamId: p.team_id,
    ownerId: p.owner_id,
    startDate: p.start_date,
    dueDate: p.due_date,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    lists: p.lists?.map((l: { id: string; name: string; project_id: string; sort_order: number; color: string | null }) => ({
      id: l.id,
      name: l.name,
      projectId: l.project_id,
      order: l.sort_order,
      color: l.color,
    })) || [],
  })) || [];

  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, departmentId, teamId, status, startDate, dueDate, budget, color, icon } = body;

  if (isDemoMode()) {
    const newProject = {
      id: `proj-${Date.now()}`,
      name: name || 'New Project',
      description: description || '',
      departmentId: departmentId || demoStore.departments[0]?.id || 'dept-marketing',
      teamId: teamId || null,
      ownerId: user.id,
      memberIds: [user.id],
      status: status || 'ACTIVE',
      startDate: startDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      budget: budget || null,
      progress: 0,
      color: color || '#6366F1',
      icon: icon || 'Folder',
      lists: [
        { id: `list-to-do-${Date.now()}`, name: 'To Do', projectId: `proj-${Date.now()}`, order: 1 },
        { id: `list-in-prog-${Date.now()}`, name: 'In Progress', projectId: `proj-${Date.now()}`, order: 2 },
        { id: `list-done-${Date.now()}`, name: 'Done', projectId: `proj-${Date.now()}`, order: 3 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    demoStore.projects.unshift(newProject);
    return NextResponse.json(newProject, { status: 201 });
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name: name || 'New Project',
      description: description || '',
      department_id: departmentId || null,
      team_id: teamId,
      owner_id: user.id,
      status: status || 'ACTIVE',
      start_date: startDate,
      due_date: dueDate,
      budget: budget,
      color: color || '#6366F1',
      icon: icon || 'Folder',
      progress: 0,
    })
    .select()
    .single();

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 });
  }

  // Create default lists
  const lists = [
    { project_id: project.id, name: 'To Do', sort_order: 1 },
    { project_id: project.id, name: 'In Progress', sort_order: 2 },
    { project_id: project.id, name: 'Done', sort_order: 3 },
  ];
  await supabase.from('lists').insert(lists);

  return NextResponse.json({
    ...project,
    departmentId: project.department_id,
    teamId: project.team_id,
    ownerId: project.owner_id,
    startDate: project.start_date,
    dueDate: project.due_date,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    lists,
  }, { status: 201 });
}