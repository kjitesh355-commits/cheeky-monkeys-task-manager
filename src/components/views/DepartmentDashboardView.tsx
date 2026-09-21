'use client';

import React from 'react';
import {
  Folder,
  Plus,
  Building2,
  PieChart as PieIcon,
  Users,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const DepartmentDashboardView: React.FC = () => {
  const {
    departments,
    projects,
    tasks,
    activeDepartmentId,
    setActiveProjectId,
    setActiveView,
    setTaskModalOpen,
    setProjectModalOpen,
    setInviteOpen,
  } = useWorkspace();

  const currentDept = departments.find((d) => d.id === activeDepartmentId) || departments[0];
  const deptProjects = projects.filter((p) => p.departmentId === currentDept.id);
  const deptTasks = tasks.filter((t) => t.departmentId === currentDept.id);

  const completedTasks = deptTasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressTasks = deptTasks.filter((t) => t.status === 'IN_PROGRESS').length;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto select-none animate-fade-in">
      {/* Department Banner */}
      <div className="clean-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-sm shrink-0"
            style={{ backgroundColor: currentDept.color }}
          >
            {currentDept.code}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{currentDept.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-secondary font-mono text-muted-foreground">
                {deptProjects.length} Projects
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{currentDept.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setProjectModalOpen(true)}
            className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium px-3.5 py-2 rounded-xl border border-border transition-all"
          >
            <Plus size={15} />
            <span>Create Project</span>
          </button>
          <button
            onClick={() => setTaskModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Structural Work Areas Grid */}
      <div className="clean-card p-5 space-y-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground">
          {currentDept.name} Work Areas & Teams
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {currentDept.teams.map((team) => (
            <div key={team.id} className="p-3.5 rounded-xl bg-secondary/40 border border-border/60">
              <span className="text-xs font-bold text-foreground">{team.name}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Structural Work Area</p>
            </div>
          ))}
        </div>
      </div>

      {/* Real Data Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="clean-card p-4">
          <span className="text-[11px] font-semibold text-muted-foreground">Total Tasks</span>
          <div className="text-2xl font-bold text-foreground mt-0.5">{deptTasks.length}</div>
        </div>
        <div className="clean-card p-4">
          <span className="text-[11px] font-semibold text-muted-foreground">In Progress</span>
          <div className="text-2xl font-bold text-foreground mt-0.5">{inProgressTasks}</div>
        </div>
        <div className="clean-card p-4">
          <span className="text-[11px] font-semibold text-muted-foreground">Completed</span>
          <div className="text-2xl font-bold text-foreground mt-0.5">{completedTasks}</div>
        </div>
        <div className="clean-card p-4">
          <span className="text-[11px] font-semibold text-muted-foreground">Active Projects</span>
          <div className="text-2xl font-bold text-foreground mt-0.5">{deptProjects.length}</div>
        </div>
      </div>

      {/* Empty State Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status */}
        <div className="clean-card p-6 space-y-4 text-center flex flex-col items-center justify-center min-h-[220px]">
          <div className="p-3 rounded-full bg-indigo-50 text-indigo-600">
            <PieIcon size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Task Status</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              No task activity yet. Create your first task to start seeing task status analytics.
            </p>
          </div>
          <button
            onClick={() => setTaskModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all"
          >
            + Create Task
          </button>
        </div>

        {/* Team Workload */}
        <div className="clean-card p-6 space-y-4 text-center flex flex-col items-center justify-center min-h-[220px]">
          <div className="p-3 rounded-full bg-blue-50 text-blue-600">
            <Users size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Team Workload</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              No workload data yet. Invite team members and assign tasks to begin tracking workload.
            </p>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-xs font-medium hover:bg-secondary/80 transition-all"
          >
            + Invite Team
          </button>
        </div>
      </div>

      {/* Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">
            {currentDept.name} Projects
          </h2>
          <button
            onClick={() => setProjectModalOpen(true)}
            className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
          >
            <Plus size={14} /> New Project
          </button>
        </div>

        {deptProjects.length === 0 ? (
          <div className="clean-card p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Folder size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">No projects in {currentDept.name} yet</h4>
              <p className="text-xs text-muted-foreground">Create a project to organize tasks, deadlines and team work.</p>
            </div>
            <button
              onClick={() => setProjectModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-all"
            >
              + Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deptProjects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => {
                  setActiveProjectId(proj.id);
                  setActiveView('LIST');
                }}
                className="clean-card p-5 hover:border-indigo-300 transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder size={18} style={{ color: proj.color }} />
                    <span className="font-bold text-sm text-foreground truncate">{proj.name}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{proj.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
