'use client';

import React, { useState } from 'react';
import { X, Building2, Palette } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Department } from '../../types';

const DepartmentForm: React.FC<{
  editing: Department | null;
  onClose: () => void;
  onSaved: (dept: Department | null) => void;
}> = ({ editing, onClose, onSaved }) => {
  const { addDepartment, updateDepartment } = useWorkspace();

  const [name, setName] = useState(editing?.name ?? '');
  const [code, setCode] = useState(editing?.code ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [color, setColor] = useState(editing?.color ?? '#8B5CF6');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const payload = {
      name: name.trim(),
      code: (code || name.trim().substring(0, 3)).toUpperCase(),
      description,
      color,
    };
    try {
      if (editing) {
        await updateDepartment(editing.id, payload);
        onSaved({ ...editing, ...payload });
      } else {
        const created = await addDepartment({
          ...payload,
          icon: 'Building2',
        });
        onSaved(created ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the department. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const presetColors = ['#8B5CF6', '#10B981', '#3B82F6', '#EC4899', '#F59E0B', '#6366F1', '#14B8A6'];

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
      <div>
        <label className="block font-medium text-muted-foreground mb-1">Department Name *</label>
        <input
          type="text"
          placeholder="e.g. Finance, Legal, Customer Support"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div>
        <label className="block font-medium text-muted-foreground mb-1">Department Code (Short 3 Letters)</label>
        <input
          type="text"
          placeholder="e.g. FIN, LEG, SUP"
          value={code}
          maxLength={4}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary uppercase font-mono"
        />
      </div>

      <div>
        <label className="block font-medium text-muted-foreground mb-1">Description</label>
        <textarea
          rows={2}
          placeholder="Brief overview of department scope..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>

      <div>
        <label className="flex items-center gap-1 font-medium text-muted-foreground mb-2">
          <Palette size={13} /> Theme Accent Color
        </label>
        <div className="flex items-center gap-2">
          {presetColors.map((c) => (
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

      {error && (
        <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-60"
        >
          {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Department'}
        </button>
      </div>
    </form>
  );
};

export const DepartmentCreateModal: React.FC = () => {
  const {
    isDeptModalOpen,
    setDeptModalOpen,
    deptEditId,
    setDeptEditId,
    departments,
    setActiveDepartmentId,
    setActiveView,
  } = useWorkspace();

  if (!isDeptModalOpen) return null;

  const editing = deptEditId ? departments.find((d) => d.id === deptEditId) ?? null : null;

  const handleClose = () => {
    setDeptModalOpen(false);
    setDeptEditId(null);
  };

  const handleSaved = (dept: Department | null) => {
    handleClose();
    if (dept && !editing) {
      // Route straight into the newly created department's dashboard.
      setActiveView('DASHBOARD');
      setActiveDepartmentId(dept.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            {editing ? `Edit ${editing.name}` : 'Add New Department'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body — keyed so fields re-initialize per open/edit target */}
        <DepartmentForm key={editing?.id ?? 'new'} editing={editing} onClose={handleClose} onSaved={handleSaved} />
      </div>
    </div>
  );
};
