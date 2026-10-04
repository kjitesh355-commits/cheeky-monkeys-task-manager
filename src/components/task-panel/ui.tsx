import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { User } from '../../types';

export const Avatar: React.FC<{ user?: User | null; size?: number; className?: string }> = ({ user, size = 24, className = '' }) => {
  const [failed, setFailed] = React.useState(false);
  const style = { width: size, height: size };
  if (!user) {
    return (
      <div
        style={style}
        className={`rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 ${className}`}
      >
        ?
      </div>
    );
  }
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (!user.avatar || failed) {
    return (
      <div
        style={style}
        title={user.name}
        className={`rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 ${className}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={user.avatar}
      alt={user.name}
      title={user.name}
      style={style}
      onError={() => setFailed(true)}
      className={`rounded-full object-cover border border-border shrink-0 ${className}`}
    />
  );
};

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'Confirm', destructive = true, onConfirm, onCancel }) => {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div data-confirm-dialog className="fixed inset-0 z-[70] flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-4 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl shrink-0 ${destructive ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'}`}>
            <AlertTriangle size={18} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <div className="text-xs text-muted-foreground leading-relaxed">{message}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/70 text-xs font-semibold text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            autoFocus
            onClick={onConfirm}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors ${
              destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
