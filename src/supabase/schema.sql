-- WORKSPACE PostgreSQL Supabase Schema Migration
-- Enables UUID v4 generation and creates normalized relational structures with RLS policies

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  role TEXT DEFAULT 'MEMBER',
  title TEXT,
  department_id UUID,
  status TEXT DEFAULT 'online',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  accent_color TEXT DEFAULT '#8B5CF6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Building2',
  color TEXT DEFAULT '#8B5CF6',
  manager_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lead_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id),
  owner_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'ACTIVE',
  start_date DATE,
  due_date DATE,
  budget NUMERIC(12,2),
  progress INT DEFAULT 0,
  color TEXT DEFAULT '#8B5CF6',
  icon TEXT DEFAULT 'Folder',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Lists
CREATE TABLE IF NOT EXISTS public.lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'TO_DO',
  priority TEXT DEFAULT 'MEDIUM',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  list_id UUID REFERENCES public.lists(id),
  department_id UUID REFERENCES public.departments(id),
  created_by_id UUID REFERENCES public.profiles(id),
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  archived BOOLEAN DEFAULT FALSE,
  start_date DATE,
  due_date DATE,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  progress INT DEFAULT 0,
  estimated_hours NUMERIC(6,2),
  logged_hours NUMERIC(6,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upgrade columns for databases created before the task panel feature
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- 8. Task Assignees Junction
CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

-- 9. Subtasks
CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  assignee_id UUID REFERENCES public.profiles(id),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES public.profiles(id),
  department_id UUID REFERENCES public.departments(id),
  project_id UUID REFERENCES public.projects(id),
  category TEXT DEFAULT 'Company',
  icon TEXT DEFAULT 'FileText',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11b. Document folders (organizational containers for documents)
CREATE TABLE IF NOT EXISTS public.document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL;

-- 12. Channels & Messages
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'PUBLIC',
  department_id UUID REFERENCES public.departments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membership for PRIVATE / DIRECT channels (PUBLIC channels are open).
CREATE TABLE IF NOT EXISTS public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (channel_id, user_id)
);

-- 13. Activity Logs (general)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_title TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Task Updates (Discussion/Comments with threading)
CREATE TABLE IF NOT EXISTS public.task_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  parent_update_id UUID REFERENCES public.task_updates(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Task Update Mentions
CREATE TABLE IF NOT EXISTS public.task_update_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID REFERENCES public.task_updates(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Task Update Reactions
CREATE TABLE IF NOT EXISTS public.task_update_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID REFERENCES public.task_updates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(update_id, user_id, reaction)
);

-- 17. Task Files
CREATE TABLE IF NOT EXISTS public.task_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_provider TEXT DEFAULT 'supabase',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Task Activity (Detailed per-task activity log)
CREATE TABLE IF NOT EXISTS public.task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  action_type TEXT NOT NULL,
  action_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Task Dependencies (task_id is blocked by depends_on_task_id)
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);

-- 20. Notifications (mentions, assignments, status changes)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  action_url TEXT,
  target_type TEXT,
  target_id UUID,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_updates_task_id ON public.task_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_parent_update_id ON public.task_updates(parent_update_id);
CREATE INDEX IF NOT EXISTS idx_task_updates_user_id ON public.task_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_task_update_mentions_update_id ON public.task_update_mentions(update_id);
CREATE INDEX IF NOT EXISTS idx_task_update_mentions_mentioned_user_id ON public.task_update_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_task_update_reactions_update_id ON public.task_update_reactions(update_id);
CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON public.task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON public.task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_created_at ON public.task_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON public.tasks(archived);

-- ROW LEVEL SECURITY (RLS) POLICIES
--
-- Design:
--   * Every table has RLS enabled and every policy is scoped TO authenticated
--     (anon gets nothing).
--   * Reads are workspace-wide — this is a small-team workspace app.
--   * Writes for workspace data are role-checked in the /api routes
--     (moderator actions: delete/department/channel/user management), NOT
--     here: the browser never writes directly (it only uses the Supabase
--     client for realtime subscriptions and sign-out), so the API layer is
--     the single write path.
--   * Two tables get row-level guarantees even against direct PostgREST
--     access: profiles (self-or-moderator writes, plus a trigger that stops
--     non-moderators from escalating their own role) and notifications
--     (read/update/delete own rows only).
--   * Notifications INSERT stays open to any authenticated user because the
--     server notifies *other* users on your behalf (@mentions, assignments).
--   * Everything below is idempotent — re-running this file never fails.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_update_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_update_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helper: a profiles policy that queried profiles directly
-- would recurse infinitely; running as the function owner bypasses RLS for
-- the lookup. auth.uid() IS NULL means a service-role/admin client — treated
-- as moderator so seeding and admin tools keep working.
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NULL OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('SUPER_ADMIN', 'ADMIN', 'DEPARTMENT_MANAGER', 'TEAM_LEAD')
  );
$$;

-- Guard: only moderators (or admin/service clients) may change a role.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_moderator() THEN
    RAISE EXCEPTION 'Only moderators can change profile roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- Drop the legacy (pre-hardening) policies: they had no TO clause, so they
-- also applied to anon, and notifications allowed any user full access.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT * FROM (VALUES
      ('profiles', 'Allow authenticated read profiles'),
      ('departments', 'Allow authenticated read departments'),
      ('projects', 'Allow authenticated read projects'),
      ('tasks', 'Allow authenticated read tasks'),
      ('tasks', 'Allow authenticated all tasks'),
      ('subtasks', 'Allow authenticated all subtasks'),
      ('comments', 'Allow authenticated all comments'),
      ('task_updates', 'Allow authenticated all task_updates'),
      ('task_update_mentions', 'Allow authenticated all task_update_mentions'),
      ('task_update_reactions', 'Allow authenticated all task_update_reactions'),
      ('task_files', 'Allow authenticated all task_files'),
      ('task_activity', 'Allow authenticated all task_activity'),
      ('task_dependencies', 'Allow authenticated all task_dependencies'),
      ('notifications', 'Allow authenticated all notifications')
    ) AS legacy(tbl, name)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.name, pol.tbl);
  END LOOP;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- New policy set (idempotent via duplicate_object).
DO $$
BEGIN
  -- profiles: read all; insert any authenticated (API checks moderator);
  -- update/delete self-or-moderator (role changes additionally guarded by
  -- the protect_profile_role trigger above).
  BEGIN CREATE POLICY "profiles read" ON public.profiles FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "profiles insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "profiles update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_moderator()) WITH CHECK (id = auth.uid() OR public.is_moderator()); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "profiles delete" ON public.profiles FOR DELETE TO authenticated USING (public.is_moderator()); EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- Workspace data: authenticated read/write. Role enforcement (who may
  -- delete tasks, manage departments, ...) lives in the API routes.
  BEGIN CREATE POLICY "workspaces access" ON public.workspaces FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "departments access" ON public.departments FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "teams access" ON public.teams FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "projects access" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "lists access" ON public.lists FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "tasks access" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "task_assignees access" ON public.task_assignees FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "subtasks access" ON public.subtasks FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "comments access" ON public.comments FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "documents access" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
BEGIN CREATE POLICY "document_folders access" ON public.document_folders FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "channels access" ON public.channels FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "messages access" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "channel_members access" ON public.channel_members FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "activity_logs access" ON public.activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "task_updates access" ON public.task_updates FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "task_update_mentions access" ON public.task_update_mentions FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "task_update_reactions access" ON public.task_update_reactions FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "task_files access" ON public.task_files FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "task_activity access" ON public.task_activity FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "task_dependencies access" ON public.task_dependencies FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- notifications: own rows for read/update/delete; insert open so the server
  -- can notify other users (mentions, assignments) through the user's session.
  BEGIN CREATE POLICY "notifications read own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "notifications update own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "notifications delete own" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN CREATE POLICY "notifications insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- REALTIME — makes task panel data stream to open clients.
-- Safe to re-run: already-published tables are skipped.
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['tasks', 'task_updates', 'task_update_reactions', 'task_files', 'task_activity', 'task_dependencies', 'subtasks', 'notifications', 'messages', 'channels', 'channel_members']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
EXCEPTION
  WHEN undefined_object THEN NULL; -- publication not present (local/self-hosted)
  WHEN duplicate_object THEN NULL;
END $$;
