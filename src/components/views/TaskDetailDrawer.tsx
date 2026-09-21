'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Calendar,
  User,
  Tag,
  Flag,
  CheckSquare,
  Paperclip,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TaskStatus, TaskPriority } from '../../types';

export const TaskDetailDrawer: React.FC = () => {
  const {
    selectedTaskId,
    setSelectedTaskId,
    tasks,
    users,
    updateTaskStatus,
    updateTask,
    deleteTask,
    toggleSubtask,
    addSubtask,
    addComment,
    currentUser,
  } = useWorkspace();

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [commentText, setCommentText] = useState('');

  if (!selectedTaskId) return null;

  const task = tasks.find((t) => t.id === selectedTaskId);
  if (!task) return null;

  const taskAssignees = users.filter((u) => task.assigneeIds.includes(u.id));
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : task.progress || 0;

  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    addSubtask(task.id, newSubtaskTitle);
    setNewSubtaskTitle('');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(task.id, commentText);
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-2xl bg-card border-l border-border h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-card/80">
          <div className="flex items-center gap-3">
            {/* Status Dropdown */}
            <select
              value={task.status}
              onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
              className="bg-primary/10 border border-primary/30 text-primary font-bold text-xs rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="TO_DO">TO DO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="IN_REVIEW">IN REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>

            {/* Priority Dropdown */}
            <select
              value={task.priority}
              onChange={(e) => updateTask(task.id, { priority: e.target.value as TaskPriority })}
              className="bg-secondary border border-border text-muted-foreground font-semibold text-xs rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="URGENT">🔴 Urgent</option>
              <option value="HIGH">🟠 High</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="LOW">🔵 Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => deleteTask(task.id)}
              className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
              title="Delete Task"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setSelectedTaskId(null)}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Body Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Title */}
          <div>
            <input
              type="text"
              value={task.title}
              onChange={(e) => updateTask(task.id, { title: e.target.value })}
              className="w-full text-lg font-bold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none py-1"
            />
          </div>

          {/* Key Attributes Row */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-secondary/40 border border-border/50">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Assignees</span>
              <div className="flex items-center gap-2">
                {taskAssignees.map((u) => (
                  <div key={u.id} className="flex items-center gap-1.5">
                    <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                    <span className="font-semibold text-foreground">{u.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Due Date</span>
              <span className="font-semibold text-foreground">{task.dueDate || 'Not set'}</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Description</label>
            <textarea
              rows={4}
              value={task.description || ''}
              onChange={(e) => updateTask(task.id, { description: e.target.value })}
              placeholder="Add comprehensive notes, requirements, or documentation..."
              className="w-full bg-secondary/30 border border-border/60 rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Custom Fields (Sales Lead / Design Specs if present) */}
          {task.customFields && Object.keys(task.customFields).length > 0 && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Custom Fields</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(task.customFields).map(([key, val]) => (
                  <div key={key}>
                    <span className="text-muted-foreground capitalize">{key}: </span>
                    <span className="font-semibold text-foreground">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks Section with Animated Progress Bar */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <label className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <CheckSquare size={14} className="text-primary" /> Subtasks ({completedSubtasks}/{totalSubtasks})
              </label>
              <span className="font-mono text-xs font-bold text-primary">{progressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>

            {/* Subtask items list */}
            <div className="space-y-1.5">
              {task.subtasks.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => toggleSubtask(task.id, sub.id)}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/60 cursor-pointer transition-colors border border-border/40"
                >
                  <input
                    type="checkbox"
                    checked={sub.completed}
                    onChange={() => {}}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span className={`flex-1 text-xs font-medium ${sub.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Add Subtask Form */}
            <form onSubmit={handleAddSub} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Add a new subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary font-bold text-xs transition-colors"
              >
                Add
              </button>
            </form>
          </div>

          {/* Attachments Section */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <label className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Paperclip size={14} /> File Attachments
              </label>
              <div className="grid grid-cols-2 gap-2">
                {task.attachments.map((att) => (
                  <div key={att.id} className="p-2.5 rounded-lg bg-secondary/40 border border-border/50 flex items-center justify-between">
                    <div className="truncate">
                      <div className="font-semibold text-foreground truncate">{att.name}</div>
                      <div className="text-[10px] text-muted-foreground">{att.size}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <label className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <MessageSquare size={14} className="text-primary" /> Task Comments & Discussion
            </label>

            <form onSubmit={handleAddComment} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Write a comment or @mention a team member..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
