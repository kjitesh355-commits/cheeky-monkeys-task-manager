import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, GitBranch, Link2, Plus, Search, Unlink, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task } from '../../types';
import { STATUS_COLORS, STATUS_LABELS, timeAgo } from './utils';

const TaskChip: React.FC<{ task: Task; onClick: () => void; onRemove?: () => void; badge?: React.ReactNode }> = ({
  task,
  onClick,
  onRemove,
  badge,
}) => (
  <div className="group flex items-center gap-2 p-2 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary/60 transition-colors">
    <button type="button" onClick={onClick} className="flex-1 min-w-0 text-left">
      <span className="flex items-center gap-1.5">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border shrink-0 ${STATUS_COLORS[task.status] || ''}`}>
          {STATUS_LABELS[task.status] || task.status}
        </span>
        <span className="text-xs font-semibold text-foreground truncate">{task.title}</span>
      </span>
      <span className="block text-[10px] text-muted-foreground mt-0.5 truncate">
        {task.dueDate ? `Due ${timeAgo(task.dueDate)}` : 'No due date'}
      </span>
    </button>
    {badge}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        title="Remove link"
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-card text-muted-foreground hover:text-rose-500 transition-all shrink-0"
      >
        <X size={13} />
      </button>
    )}
  </div>
);

const TaskPicker: React.FC<{
  mode: 'dependency' | 'parent';
  onSelect: (taskId: string) => void;
  onCancel: () => void;
  excludeIds: string[];
  linkedIds: string[];
}> = ({ mode, onSelect, onCancel, excludeIds, linkedIds }) => {
  const { tasks } = useWorkspace();
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onCancel();
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onCancel]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => !excludeIds.includes(t.id) && (!q || t.title.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [tasks, query, excludeIds]);

  return (
    <div ref={rootRef} className="bg-card border border-border rounded-xl shadow-xl p-2 animate-fade-in">
      <div className="relative mb-1.5">
        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks…"
          className="w-full bg-secondary/60 border border-border rounded-lg pl-7 pr-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="max-h-44 overflow-y-auto space-y-1">
        {candidates.length === 0 && <p className="text-[11px] text-muted-foreground p-2">No matching tasks.</p>}
        {candidates.map((candidate) => {
          const linked = linkedIds.includes(candidate.id);
          return (
            <button
              key={candidate.id}
              type="button"
              disabled={linked}
              onClick={() => onSelect(candidate.id)}
              className="w-full flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-secondary text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0 ${STATUS_COLORS[candidate.status] || ''}`}>
                  {STATUS_LABELS[candidate.status]}
                </span>
                <span className="text-xs text-foreground truncate">{candidate.title}</span>
              </span>
              {linked ? (
                <span className="text-[10px] text-muted-foreground shrink-0">Linked</span>
              ) : (
                <ChevronRight size={13} className="text-muted-foreground shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 px-1 border-t border-border/60 pt-1.5">
        {mode === 'parent' ? 'Select the parent task this belongs to.' : 'Select a task this one depends on.'}
      </p>
    </div>
  );
};

export const TaskRelationships: React.FC<{ task: Task; onNavigate: (taskId: string) => void }> = ({
  task,
  onNavigate,
}) => {
  const { taskRelations, loadTaskRelations, clearTaskRelations, addTaskDependency, removeTaskDependency, setParentTask } =
    useWorkspace();
  const [pickerMode, setPickerMode] = useState<'dependency' | 'parent' | null>(null);

  useEffect(() => {
    loadTaskRelations(task.id);
    return () => clearTaskRelations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const relations = taskRelations;
  const blockedBy = relations?.blockedBy || [];
  const blocking = relations?.blocking || [];

  const selectCandidate = async (candidateId: string) => {
    if (pickerMode === 'parent') {
      await setParentTask(task.id, candidateId);
    } else if (pickerMode === 'dependency') {
      await addTaskDependency(task.id, candidateId);
    }
    setPickerMode(null);
  };

  return (
    <div className="space-y-3">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <GitBranch size={12} className="text-primary" /> Relationships
      </span>

      {/* Parent */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Parent task</span>
          {relations?.parentTask && (
            <button
              type="button"
              onClick={() => setParentTask(task.id, null)}
              className="text-[10px] font-semibold text-muted-foreground hover:text-rose-500 transition-colors flex items-center gap-1"
            >
              <Unlink size={10} /> Unlink
            </button>
          )}
        </div>
        {relations?.parentTask ? (
          <TaskChip task={relations.parentTask} onClick={() => onNavigate(relations.parentTask!.id)} />
        ) : pickerMode === 'parent' ? (
          <TaskPicker
            mode="parent"
            onSelect={selectCandidate}
            onCancel={() => setPickerMode(null)}
            excludeIds={[task.id]}
            linkedIds={[]}
          />
        ) : (
          <button
            type="button"
            onClick={() => setPickerMode('parent')}
            className="w-full flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus size={12} /> Set a parent task
          </button>
        )}
      </div>

      {/* Blocked by */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Blocked by</span>
        {blockedBy.length ? (
          <div className="space-y-1.5">
            {blockedBy.map((dep) => (
              <TaskChip
                key={dep.id}
                task={dep}
                onClick={() => onNavigate(dep.id)}
                onRemove={() => removeTaskDependency(task.id, dep.id)}
                badge={
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[9px] font-bold uppercase">
                    Blocked
                  </span>
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">No blockers.</p>
        )}
      </div>

      {/* Blocking */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">This task is blocking</span>
        {blocking.length ? (
          <div className="space-y-1.5">
            {blocking.map((dep) => (
              <TaskChip
                key={dep.id}
                task={dep}
                onClick={() => onNavigate(dep.id)}
                onRemove={() => removeTaskDependency(dep.id, task.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">Not blocking anything.</p>
        )}
      </div>

      {/* Add dependency / parent picker */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setPickerMode((m) => (m === 'dependency' ? null : 'dependency'))}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-xs font-semibold text-foreground transition-colors"
        >
          <Link2 size={13} /> Add dependency
        </button>
        {pickerMode === 'dependency' && (
          <TaskPicker
            mode="dependency"
            onSelect={selectCandidate}
            onCancel={() => setPickerMode(null)}
            excludeIds={[task.id, ...blocking.map((b) => b.id)]}
            linkedIds={blockedBy.map((b) => b.id)}
          />
        )}
      </div>
    </div>
  );
};
