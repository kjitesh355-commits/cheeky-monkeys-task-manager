import React, { useState } from 'react';
import { CheckSquare, ChevronDown, ChevronRight, Plus, Trash2, User, Calendar } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task } from '../../types';
import { Avatar } from './ui';

export const TaskSubtasks: React.FC<{ task: Task }> = ({ task }) => {
  const { users, toggleSubtask, addSubtask, updateSubtask, deleteSubtask } = useWorkspace();
  const [newTitle, setNewTitle] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const subtasks = task.subtasks || [];
  const completed = subtasks.filter((s) => s.completed).length;
  const total = subtasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addSubtask(task.id, newTitle.trim());
    setNewTitle('');
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CheckSquare size={12} className="text-primary" /> Subtasks
        </span>
        <span className="text-[11px] font-bold text-muted-foreground">
          {completed} / {total} completed
        </span>
      </div>

      {total > 0 && (
        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${percent === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      <div className="space-y-1.5">
        {subtasks.map((sub) => {
          const assignee = users.find((u) => u.id === sub.assigneeId);
          const expanded = expandedId === sub.id;
          return (
            <div key={sub.id} className="rounded-lg border border-border/60 bg-secondary/30 overflow-hidden">
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => toggleSubtask(task.id, sub.id)}
                  aria-label={sub.completed ? 'Mark incomplete' : 'Mark complete'}
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                    sub.completed
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-border hover:border-primary text-transparent'
                  }`}
                >
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2 6l3 3 5-6" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : sub.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <span className={`text-xs font-medium block truncate ${sub.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {sub.title}
                  </span>
                </button>

                {sub.dueDate && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{sub.dueDate.slice(0, 10)}</span>
                )}

                {assignee && <Avatar user={assignee} size={16} />}

                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : sub.id)}
                  className="p-0.5 rounded hover:bg-secondary text-muted-foreground shrink-0"
                  aria-label="Open subtask details"
                >
                  {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              </div>

              {expanded && (
                <div className="px-2.5 pb-2.5 pt-1 border-t border-border/50 grid grid-cols-2 gap-2 animate-fade-in">
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <User size={10} /> Assignee
                    </span>
                    <select
                      value={sub.assigneeId || ''}
                      onChange={(e) => updateSubtask(sub.id, { assigneeId: e.target.value })}
                      className="w-full bg-card border border-border rounded-md px-2 py-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 mb-1">
                      <Calendar size={10} /> Due date
                    </span>
                    <input
                      type="date"
                      value={(sub.dueDate || '').slice(0, 10)}
                      onChange={(e) => updateSubtask(sub.id, { dueDate: e.target.value || null })}
                      className="w-full bg-card border border-border rounded-md px-2 py-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSubtask(sub.id)}
                    className="col-span-2 justify-self-start flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors"
                  >
                    <Trash2 size={11} /> Delete subtask
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {total === 0 && (
          <p className="text-[11px] text-muted-foreground italic">No subtasks yet. Break this task down below.</p>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Add a subtask…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1 bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-xs font-bold transition-colors disabled:opacity-40"
        >
          <Plus size={13} /> Add
        </button>
      </form>
    </div>
  );
};
