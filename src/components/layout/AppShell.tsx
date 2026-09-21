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
import { CommandPalette } from '../modals/CommandPalette';
import { TaskCreateModal } from '../modals/TaskCreateModal';
import { DepartmentCreateModal } from '../modals/DepartmentCreateModal';
import { ProjectCreateModal } from '../modals/ProjectCreateModal';
import { InviteModal } from '../modals/InviteModal';
import { ProfileModal } from '../modals/ProfileModal';
import { HelpModal } from '../modals/HelpModal';
import { ChannelCreateModal } from '../modals/ChannelCreateModal';
import { TaskDetailDrawer } from '../views/TaskDetailDrawer';
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
  } = useWorkspace();

  const renderMainContent = () => {
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
      <TaskDetailDrawer />
      <NotificationDrawer />
    </div>
  );
};
