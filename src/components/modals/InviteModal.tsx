'use client';

import React, { useState } from 'react';
import { X, UserPlus, Mail, Shield, Check } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const InviteModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { toggleOnboardingStep } = useWorkspace();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [invited, setInvited] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setInvited(true);
    toggleOnboardingStep('ob-3'); // Mark 'Invite team members' onboarding step complete
    setTimeout(() => {
      setEmail('');
      setInvited(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <UserPlus size={18} className="text-indigo-600" />
            Invite Team Member
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {invited ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check size={24} />
            </div>
            <h3 className="text-sm font-bold text-foreground">Invitation Sent!</h3>
            <p className="text-xs text-muted-foreground">An invitation email has been dispatched to {email}.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-muted-foreground mb-1">Email Address *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-muted-foreground mb-1">Role & Permissions</label>
              <div className="relative">
                <Shield size={14} className="absolute left-3 top-3 text-muted-foreground" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ADMIN">Admin (Full Workspace Management)</option>
                  <option value="MEMBER">Member (Create & Edit Tasks/Projects)</option>
                  <option value="VIEWER">Viewer (Read-Only Access)</option>
                </select>
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
                Send Invitation
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
