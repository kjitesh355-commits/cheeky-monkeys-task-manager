import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { Avatar } from './ui';
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from './utils';

const STATUSES: TaskStatus[] = ['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'BLOCKED', 'COMPLETED'];
const PRIORITIES: TaskPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'];

function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOutside]);
  return ref;
}

const FieldShell: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <div className={className}>
    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">{label}</span>
    {children}
  </div>
);

const selectClass =
  'w-full bg-secondary/60 border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-secondary transition-colors';

export const TaskPanelFields: React.FC<{ task: Task }> = ({ task }) => {
  const { users, projects, departments, updateTask, updateTaskStatus } = useWorkspace();
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const assigneeRef = useClickOutside<HTMLDivElement>(() => setAssigneeOpen(false));

  const taskAssignees = users.filter((u) => task.assigneeIds?.includes(u.id));
  const department = departments.find((d) => d.id === task.departmentId);
  const availableProjects = projects.filter((p) => !task.departmentId || p.departmentId === task.departmentId);

  const toggleAssignee = (userId: string) => {
    const next = task.assigneeIds.includes(userId)
      ? task.assigneeIds.filter((id) => id !== userId)
      : [...task.assigneeIds, userId];
    updateTask(task.id, { assigneeIds: next });
  };

  const addTag = () => {
    const tag = tagDraft.trim();
    if (!tag || task.tags.includes(tag)) return;
    updateTask(task.id, { tags: [...task.tags, tag] });
    setTagDraft('');
  };

  const removeTag = (tag: string) => {
    updateTask(task.id, { tags: task.tags.filter((t) => t !== tag) });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <FieldShell label="Status">
        <div className="relative">
          <select
            value={task.status}
            onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
            className={`${selectClass} appearance-none pr-7`}
            style={{
              backgroundImage: 'none',
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </FieldShell>

      <FieldShell label="Priority">
        <div className="relative">
          <select
            value={task.priority}
            onChange={(e) => updateTask(task.id, { priority: e.target.value as TaskPriority })}
            className={`${selectClass} appearance-none pr-7`}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </FieldShell>

      <FieldShell label="Assignee" className="relative">
        <div ref={assigneeRef}>
          <button
            type="button"
            onClick={() => setAssigneeOpen((v) => !v)}
            className={`${selectClass} flex items-center justify-between gap-1.5 text-left`}
          >
            <span className="flex items-center gap-1.5 min-w-0">
              {taskAssignees[0] ? (
                <>
                  <Avatar user={taskAssignees[0]} size={16} />
                  <span className="truncate">{taskAssignees[0].name.split(' ')[0]}</span>
                  {taskAssignees.length > 1 && (
                    <span className="text-[9px] text-muted-foreground">+{taskAssignees.length - 1}</span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground font-medium">Unassigned</span>
              )}
            </span>
            <ChevronDown size={12} className="text-muted-foreground shrink-0" />
          </button>

          {assigneeOpen && (
            <div className="absolute z-40 mt-1 w-56 max-h-56 overflow-y-auto bg-card border border-border rounded-xl shadow-xl p-1.5 animate-fade-in">
              {users.map((user) => {
                const checked = task.assigneeIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleAssignee(user.id)}
                    className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary text-left transition-colors"
                  >
                    <Avatar user={user} size={20} />
                    <span className="flex-1 truncate text-xs font-medium text-foreground">{user.name}</span>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      checked ? 'bg-primary border-primary text-white' : 'border-border'
                    }`}>
                      {checked && <Check size={11} />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </FieldShell>

      <FieldShell label="Due Date">
        <input
          type="date"
          value={(task.dueDate || '').slice(0, 10)}
          onChange={(e) => updateTask(task.id, { dueDate: e.target.value || null })}
          className={selectClass}
        />
      </FieldShell>

      <FieldShell label="Start Date">
        <input
          type="date"
          value={(task.startDate || '').slice(0, 10)}
          onChange={(e) => updateTask(task.id, { startDate: e.target.value || null })}
          className={selectClass}
        />
      </FieldShell>

      <FieldShell label="Project">
        <div className="relative">
          <select
            value={task.projectId || ''}
            onChange={(e) => updateTask(task.id, { projectId: e.target.value })}
            className={`${selectClass} appearance-none pr-7`}
          >
            <option value="">No project</option>
            {availableProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </FieldShell>

      <FieldShell label="Department">
        <div className="relative">
          <select
            value={task.departmentId || ''}
            onChange={(e) => updateTask(task.id, { departmentId: e.target.value })}
            className={`${selectClass} appearance-none pr-7`}
          >
            <option value="">No department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </FieldShell>

      <FieldShell label="Tags">
        <div className="min-h-[30px] w-full bg-secondary/60 border border-border rounded-lg px-2 py-1 flex flex-wrap items-center gap-1">
          {task.tags?.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-rose-500 transition-colors"
                aria-label={`Remove tag ${tag}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder={task.tags?.length ? '+' : 'Add tag'}
            className="flex-1 min-w-[48px] bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none py-0.5"
          />
        </div>
      </FieldShell>

      {/* Current state chips */}
      <div className="col-span-2 md:col-span-4 flex flex-wrap items-center gap-2 pt-0.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[task.status] || ''}`}>
          {STATUS_LABELS[task.status] || task.status}
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ${PRIORITY_COLORS[task.priority] || ''}`}>
          {PRIORITY_LABELS[task.priority] || task.priority}
        </span>
        {department && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: department.color }} />
            {department.name}
          </span>
        )}
      </div>
    </div>
  );
};
