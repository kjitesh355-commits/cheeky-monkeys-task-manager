'use client';

import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { GlobalNav } from './GlobalNav';
import { SecondarySidebar } from './SecondarySidebar';
import { TopHeader } from './TopHeader';
import { HomeDashboardView } from '../views/HomeDashboardView';
import { DepartmentDashboardView } from '../views/DepartmentDashboardView';
import { TaskListView } from '../views/TaskListView';
import { TaskBoardView } from '../views/TaskBoardView';
import { TaskCalendarView } from '../views/TaskCalendarView';
import { TaskTimelineView } from '../views/TaskTimelineView';
import { ChatView } from '../views/ChatView';
import { DocsView } from '../views/DocsView';
import { AnalyticsView } from '../views/AnalyticsView';
import { AIAssistantView } from '../views/AIAssistantView';
import { DepartmentSpacesView } from '../views/DepartmentSpacesView';
import { CommandPalette } from '../modals/CommandPalette';
import { TaskCreateModal } from '../modals/TaskCreateModal';
import { DepartmentCreateModal } from '../modals/DepartmentCreateModal';
import { ProjectCreateModal } from '../modals/ProjectCreateModal';
import { InviteModal } from '../modals/InviteModal';
import { ProfileModal } from '../modals/ProfileModal';
import { HelpModal } from '../modals/HelpModal';
import { ChannelCreateModal } from '../modals/ChannelCreateModal';
import { DirectMessageModal } from '../modals/DirectMessageModal';
import { TaskDetailPanel } from '../task-panel/TaskDetailPanel';
import { NotificationDrawer } from '../views/NotificationDrawer';

export const AppShell: React.FC = () => {
  const {
    activeView,
    activeDepartmentId,
    activeProjectId,
    isProjectModalOpen,
    setProjectModalOpen,
    isInviteOpen,
    setInviteOpen,
    isProfileOpen,
    setProfileOpen,
    isHelpOpen,
    setHelpOpen,
    isChannelModalOpen,
    setChannelModalOpen,
    isDmModalOpen,
    setDmModalOpen,
    workspaceLoaded,
    workspaceError,
    retryWorkspaceLoad,
  } = useWorkspace();

  const renderMainContent = () => {
    if (!workspaceLoaded) {
      return (
        <div
          className="h-[calc(100vh-3.5rem)] flex items-center justify-center select-none"
          data-testid="workspace-loading"
          role="status"
          aria-label="Loading workspace"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
              aria-hidden="true"
            />
            Loading workspace…
          </div>
        </div>
      );
    }

    if (activeView === 'DASHBOARD') {
      if (activeDepartmentId === null && activeProjectId === null) {
        return <HomeDashboardView />;
      }
      return <DepartmentDashboardView />;
    }

    switch (activeView) {
      case 'LIST':
        return <TaskListView />;
      case 'BOARD':
        return <TaskBoardView />;
      case 'CALENDAR':
        return <TaskCalendarView />;
      case 'TIMELINE':
        return <TaskTimelineView />;
      case 'CHAT':
        return <ChatView />;
      case 'DOCS':
        return <DocsView />;
      case 'ANALYTICS':
        return <AnalyticsView />;
      case 'AI':
        return <AIAssistantView />;
      case 'DEPARTMENTS':
        return <DepartmentSpacesView />;
      default:
        return <HomeDashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 1. Primary Left Navigation */}
      <GlobalNav />

      {/* 2. Secondary Hierarchical Sidebar */}
      <SecondarySidebar />

      {/* 3. Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopHeader />
        {workspaceError && (
          <div
            role="alert"
            data-testid="workspace-error-banner"
            className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
          >
            <span>{workspaceError}</span>
            <button
              type="button"
              onClick={retryWorkspaceLoad}
              className="shrink-0 rounded-md border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto bg-background">{renderMainContent()}</main>
      </div>

      {/* Modals & Overlays */}
      <CommandPalette />
      <TaskCreateModal />
      <DepartmentCreateModal />
      <ProjectCreateModal isOpen={isProjectModalOpen} onClose={() => setProjectModalOpen(false)} />
      <InviteModal isOpen={isInviteOpen} onClose={() => setInviteOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setProfileOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setHelpOpen(false)} />
      <ChannelCreateModal isOpen={isChannelModalOpen} onClose={() => setChannelModalOpen(false)} />
      <DirectMessageModal isOpen={isDmModalOpen} onClose={() => setDmModalOpen(false)} />
      <TaskDetailPanel />
      <NotificationDrawer />
    </div>
  );
};
