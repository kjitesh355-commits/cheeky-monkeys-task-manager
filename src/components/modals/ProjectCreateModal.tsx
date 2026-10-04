'use client';

import React, { useState } from 'react';
import { X, Folder, Palette } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const ProjectCreateModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  // The wrapper stays mounted (AppShell renders modals unconditionally); the
  // form mounts only while open so its state seeds from live workspace context.
  if (!isOpen) return null;
  return <ProjectForm onClose={onClose} />;
};

const ProjectForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { departments, addProject, activeDepartmentId } = useWorkspace();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState(activeDepartmentId || departments[0]?.id || '');
  const [color, setColor] = useState('#6366F1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addProject({
      name,
      description,
      departmentId,
      color,
    });

    setName('');
    setDescription('');
    onClose();
  };

  const colors = ['#6366F1', '#10B981', '#3B82F6', '#EC4899', '#F59E0B', '#8B5CF6'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Folder size={18} className="text-indigo-600" />
            Create New Project
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-muted-foreground mb-1">Project Name *</label>
            <input
              type="text"
              placeholder="e.g. Q4 Website Redesign & Brand Launch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-semibold text-muted-foreground mb-1">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-muted-foreground mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Project goals, milestones and brief notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 font-semibold text-muted-foreground mb-2">
              <Palette size={13} /> Project Accent Color
            </label>
            <div className="flex items-center gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'ring-2 ring-foreground scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
