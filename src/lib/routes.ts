import type { ViewMode, TaskScope } from '@/types';

/**
 * URL <-> workspace-state mapping.
 *
 * Every sidebar destination is a real route:
 *   /home, /departments, /departments/:id, /my-tasks, /planner,
 *   /timeline, /communication, /docs, /analytics, /ai-assistant
 *
 * List/Board/Calendar/Timeline can additionally be addressed with ?view=
 * (scoped either to the workspace, to "my tasks", or to a department).
 */

export interface RouteState {
  view: ViewMode;
  deptId: string | null;
  projectId: string | null;
  scope: TaskScope;
}

export interface NavContext {
  deptId?: string | null;
  projectId?: string | null;
  scope?: TaskScope;
}

const ALL_VIEWS: ViewMode[] = [
  'LIST',
  'BOARD',
  'CALENDAR',
  'TIMELINE',
  'DASHBOARD',
  'DOCS',
  'CHAT',
  'ANALYTICS',
  'AI',
  'DEPARTMENTS',
];

function parseView(value: string | null): ViewMode | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return ALL_VIEWS.find((view) => view === normalized) ?? null;
}

const BASE_FOR: Record<ViewMode, string> = {
  DASHBOARD: '/home',
  LIST: '/home',
  BOARD: '/home',
  CALENDAR: '/planner',
  TIMELINE: '/timeline',
  CHAT: '/communication',
  DOCS: '/docs',
  ANALYTICS: '/analytics',
  AI: '/ai-assistant',
  DEPARTMENTS: '/departments',
};

const DEFAULT_VIEW: Record<string, ViewMode> = {
  '/home': 'DASHBOARD',
  '/my-tasks': 'LIST',
  '/planner': 'CALENDAR',
  '/timeline': 'TIMELINE',
  '/communication': 'CHAT',
  '/docs': 'DOCS',
  '/analytics': 'ANALYTICS',
  '/ai-assistant': 'AI',
  '/departments': 'DEPARTMENTS',
};

/** Views that have a "mine" (assignee = current user) scoped home. */
const MINE_VIEWS: ViewMode[] = ['LIST', 'BOARD', 'CALENDAR', 'TIMELINE'];

export function pathForView(view: ViewMode, ctx: NavContext = {}): string {
  const scope = ctx.scope ?? 'all';

  // Department context always wins: /departments/:id?view=...&project=...
  if (ctx.deptId) {
    const params = new URLSearchParams();
    if (view !== 'DASHBOARD') params.set('view', view.toLowerCase());
    if (ctx.projectId) params.set('project', ctx.projectId);
    const qs = params.toString();
    return qs ? `/departments/${encodeURIComponent(ctx.deptId)}?${qs}` : `/departments/${encodeURIComponent(ctx.deptId)}`;
  }

  const base = scope === 'mine' && MINE_VIEWS.includes(view) ? '/my-tasks' : BASE_FOR[view];
  const params = new URLSearchParams();
  if (view !== DEFAULT_VIEW[base]) params.set('view', view.toLowerCase());
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function parseRoute(pathname: string, search: string | URLSearchParams): RouteState | null {
  const params = typeof search === 'string' ? new URLSearchParams(search) : new URLSearchParams(search.toString());
  const viewParam = parseView(params.get('view'));
  const project = params.get('project');

  const single = (view: ViewMode, scope: TaskScope): RouteState => ({
    view,
    deptId: null,
    projectId: project,
    scope,
  });

  switch (pathname) {
    case '/':
    case '/home':
      return single(viewParam ?? 'DASHBOARD', 'all');
    case '/my-tasks':
      return single(viewParam ?? 'LIST', 'mine');
    case '/planner':
      return single('CALENDAR', 'all');
    case '/timeline':
      return single('TIMELINE', 'all');
    case '/communication':
      return single('CHAT', 'all');
    case '/docs':
      return single('DOCS', 'all');
    case '/analytics':
      return single('ANALYTICS', 'all');
    case '/ai-assistant':
      return single('AI', 'all');
    case '/departments':
      return single('DEPARTMENTS', 'all');
    default:
      break;
  }

  const deptMatch = pathname.match(/^\/departments\/([^/]+)$/);
  if (deptMatch) {
    return {
      view: viewParam ?? 'DASHBOARD',
      deptId: decodeURIComponent(deptMatch[1]),
      projectId: project,
      scope: 'all',
    };
  }

  return null;
}
