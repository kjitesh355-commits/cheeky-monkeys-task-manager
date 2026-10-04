'use client';

import React, { useState } from 'react';
import { X, Search, MessageSquare } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const DirectMessageModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { users, currentUser, startDirectMessage } = useWorkspace();
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const candidates = users
    .filter((u) => u.id !== currentUser.id)
    .filter((u) => u.name.toLowerCase().includes(query.trim().toLowerCase()));

  const openWith = async (userId: string) => {
    if (pendingId) return;
    setPendingId(userId);
    setError(null);
    try {
      await startDirectMessage(userId);
      setQuery('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open conversation');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in select-none" role="dialog" aria-label="New Direct Message">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-600" />
            New Direct Message
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search people..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1">
            {candidates.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No people found.</p>
            ) : (
              candidates.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => openWith(u.id)}
                  disabled={!!pendingId}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary/70 transition-colors text-left disabled:opacity-60"
                >
                  <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.role?.replace(/_/g, ' ') ?? ''}</p>
                  </div>
                  {pendingId === u.id && <span className="ml-auto text-[10px] text-primary font-semibold">Opening…</span>}
                </button>
              ))
            )}
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        </div>
      </div>
    </div>
  );
};
