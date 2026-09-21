'use client';

import React, { useState } from 'react';
import { X, Hash, Plus } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const ChannelCreateModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { channels, setActiveChannelId, setActiveView, currentUser } = useWorkspace();
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formattedName = name.toLowerCase().replace(/\s+/g, '-');
    const newChan = {
      id: `chan-${Date.now()}`,
      name: formattedName,
      type: 'PUBLIC' as const,
      memberIds: [currentUser.id],
    };

    channels.push(newChan);
    setActiveChannelId(newChan.id);
    setActiveView('CHAT');
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Hash size={18} className="text-indigo-600" />
            Create Team Channel
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
            <label className="block font-semibold text-muted-foreground mb-1">Channel Name *</label>
            <div className="relative">
              <Hash size={14} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="e.g. marketing-updates"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

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
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
