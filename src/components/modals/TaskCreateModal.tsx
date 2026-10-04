'use client';

import React, { useState } from 'react';
import { X, Calendar, User, Tag, Flag, Folder, Layers } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TaskPriority, TaskStatus } from '../../types';

const TaskForm: React.FC = () => {
  const {
    setTaskModalOpen,
    addTask,
    departments,
    projects,
    users,
    activeDepartmentId,
    activeProjectId,
    taskModalDueDate,
  } = useWorkspace();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState(activeDepartmentId || departments[0]?.id || '');
  const [projectId, setProjectId] = useState(activeProjectId || projects[0]?.id || '');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('TO_DO');
  const [assigneeId, setAssigneeId] = useState(users[0]?.id || '');
  const [dueDate, setDueDate] = useState(taskModalDueDate || '');
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean);

    addTask({
      title,
      description,
      departmentId,
      projectId,
      priority,
      status,
      assigneeIds: [assigneeId],
      dueDate: dueDate || undefined,
      tags: tags.length > 0 ? tags : ['General'],
    });

    setTitle('');
    setDescription('');
    setTagInput('');
    setTaskModalOpen(false);
  };

  const filteredProjects = projects.filter((p) => p.departmentId === departmentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Create New Task
          </h2>
          <button
            onClick={() => setTaskModalOpen(false)}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-muted-foreground mb-1">Task Title *</label>
            <input
              type="text"
              placeholder="e.g. September Social Media Campaign Creative"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Add key deliverables, brief details, or context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 font-medium text-muted-foreground mb-1">
                <Layers size={13} /> Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  const firstProj = projects.find((p) => p.departmentId === e.target.value);
                  if (firstProj) setProjectId(firstProj.id);
                }}
                className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 font-medium text-muted-foreground mb-1">
                <Folder size={13} /> Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {filteredProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="flex items-center gap-1 font-medium text-muted-foreground mb-1">
                <Flag size={13} /> Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="URGENT">🔴 Urgent</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">🔵 Low</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 font-medium text-muted-foreground mb-1">
                <User size={13} /> Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 font-medium text-muted-foreground mb-1">
                <Calendar size={13} /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1 font-medium text-muted-foreground mb-1">
              <Tag size={13} /> Tags (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Campaign, Instagram, Urgently"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setTaskModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:from-violet-500 hover:to-indigo-500 transition-all"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const TaskCreateModal: React.FC = () => {
  const { isTaskModalOpen } = useWorkspace();
  if (!isTaskModalOpen) return null;
  // Remount per open so every field starts fresh (due date, priority, ...).
  return <TaskForm key="task-form" />;
};
