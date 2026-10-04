'use client';

import React from 'react';
import { X, HelpCircle } from 'lucide-react';

export const HelpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + K', action: 'Open Global Command Palette' },
    { key: 'N', action: 'Create New Task' },
    { key: 'Esc', action: 'Close Modal or Drawer' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <HelpCircle size={18} className="text-indigo-600" />
            Help & Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <h3 className="font-bold text-foreground mb-2 uppercase tracking-wider text-[11px] text-muted-foreground">
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2">
              {shortcuts.map((sc) => (
                <div key={sc.key} className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-xl">
                  <span className="text-muted-foreground">{sc.action}</span>
                  <kbd className="px-2 py-0.5 bg-card border border-border rounded text-[10px] font-mono font-bold text-foreground">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-2 uppercase tracking-wider text-[11px] text-muted-foreground">
              Platform Overview
            </h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              WORKSPACE allows your company to organize departments, teams, projects, and tasks cleanly without clutter.
            </p>
          </div>

          <div className="pt-3 border-t border-border text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
