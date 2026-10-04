'use client';

import React, { useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const NotificationDrawer: React.FC = () => {
  const {
    isNotificationOpen,
    setNotificationOpen,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    dismissNotification,
    setSelectedTaskId,
  } = useWorkspace();

  useEffect(() => {
    if (!isNotificationOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotificationOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isNotificationOpen, setNotificationOpen]);

  if (!isNotificationOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-sm bg-card border-l border-border h-full shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/80">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            <h3 className="font-bold text-sm text-foreground">Notifications</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={markAllNotificationsRead}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Mark all read
            </button>
            <button
              onClick={() => setNotificationOpen(false)}
              aria-label="Close notifications"
              className="p-1 rounded hover:bg-secondary text-muted-foreground"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
          {notifications.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center pt-8">All caught up.</p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.read) markNotificationRead(n.id);
                if (n.taskId) setSelectedTaskId(n.taskId);
                setNotificationOpen(false);
              }}
              className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                n.read
                  ? 'bg-card border-border/60 text-muted-foreground'
                  : 'bg-primary/5 border-primary/30 text-foreground font-medium'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-primary font-bold pr-6">
                <span>{n.title}</span>
                <span className="text-muted-foreground">{n.createdAt}</span>
              </div>
              <p className="mt-1 text-xs">{n.message}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNotification(n.id);
                }}
                aria-label="Dismiss notification"
                className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary text-muted-foreground hover:text-foreground transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
