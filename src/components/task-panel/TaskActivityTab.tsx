import React, { useEffect, useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task } from '../../types';
import { Avatar } from './ui';
import { getActivityMeta, timeAgo } from './utils';

type Filter = 'ALL' | 'STATUS' | 'PEOPLE' | 'FILES' | 'COMMENTS' | 'STRUCTURE';

const FILTERS: { value: Filter; label: string; match: (t: string) => boolean }[] = [
  { value: 'ALL', label: 'All activity', match: () => true },
  {
    value: 'STATUS',
    label: 'Status & fields',
    match: (t) =>
      ['STATUS_CHANGED', 'PRIORITY_CHANGED', 'DUE_DATE_CHANGED', 'START_DATE_CHANGED'].includes(t),
  },
  {
    value: 'PEOPLE',
    label: 'People',
    match: (t) => ['TASK_ASSIGNED', 'TASK_REASSIGNED'].includes(t),
  },
  { value: 'FILES', label: 'Files', match: (t) => t.startsWith('FILE_') },
  {
    value: 'COMMENTS',
    label: 'Updates',
    match: (t) => t.startsWith('COMMENT_'),
  },
  {
    value: 'STRUCTURE',
    label: 'Structure',
    match: (t) =>
      [
        'TASK_CREATED',
        'TASK_UPDATED',
        'TASK_COMPLETED',
        'TASK_REOPENED',
        'SUBTASK_CREATED',
        'SUBTASK_COMPLETED',
        'DEPENDENCY_ADDED',
        'DEPENDENCY_REMOVED',
        'PROJECT_CHANGED',
        'DEPARTMENT_CHANGED',
        'TAG_ADDED',
        'TAG_REMOVED',
      ].includes(t),
  },
];

function dayKey(dateInput: string): string {
  const d = new Date(dateInput);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(dateInput: string): string {
  const d = new Date(dateInput);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(dateInput) === dayKey(today.toISOString())) return 'Today';
  if (dayKey(dateInput) === dayKey(yesterday.toISOString())) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export const TaskActivityTab: React.FC<{ task: Task }> = ({ task }) => {
  const { taskActivity, loadTaskActivity, users } = useWorkspace();
  const [filter, setFilter] = useState<Filter>('ALL');

  useEffect(() => {
    loadTaskActivity(task.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const activeFilter = FILTERS.find((f) => f.value === filter)!;

  const filtered = useMemo(
    () => taskActivity.filter((a) => activeFilter.match(a.actionType)),
    [taskActivity, activeFilter]
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    [...filtered]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .forEach((item) => {
        const key = dayKey(item.createdAt);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
      });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <History size={12} className="text-primary" /> Real activity log
        </span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          className="bg-secondary/60 border border-border rounded-lg px-2 py-1 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-xs text-muted-foreground">No activity matches this filter yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([key, items]) => (
            <div key={key}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                {dayLabel(items[0].createdAt)}
              </p>
              <div className="relative pl-4">
                <span className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
                <div className="space-y-3">
                  {items.map((entry) => {
                    const meta = getActivityMeta(entry.actionType);
                    const Icon = meta.icon;
                    const actor = entry.user || users.find((u) => u.id === entry.userId);
                    return (
                      <div key={entry.id} className="relative flex items-start gap-2.5">
                        <span className={`absolute -left-4 top-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-background ${meta.color}`} />
                        <div className={`mt-0.5 p-1 rounded-md shrink-0 ${meta.color}`}>
                          <Icon size={11} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground leading-snug break-words">
                            <span className="font-bold">{actor?.name || 'Someone'}</span>{' '}
                            {meta.label(entry.actionData || {}, actor?.name || '')}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5" title={new Date(entry.createdAt).toLocaleString()}>
                            {timeAgo(entry.createdAt)}
                          </p>
                        </div>
                        <Avatar user={actor} size={18} className="mt-0.5" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
