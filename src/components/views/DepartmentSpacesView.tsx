'use client';

import React from 'react';
import { Building2, Plus, Users, FolderKanban, CheckSquare, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const DepartmentSpacesView: React.FC = () => {
  const { departments, projects, tasks, users, setDeptModalOpen, setActiveDepartmentId, setActiveProjectId } =
    useWorkspace();

  const statsFor = (departmentId: string) => {
    const deptProjects = projects.filter((p) => p.departmentId === departmentId);
    const deptTasks = tasks.filter((t) => t.departmentId === departmentId);
    const openTasks = deptTasks.filter((t) => t.status !== 'COMPLETED').length;
    return { deptProjects, deptTasks, openTasks };
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 size={20} className="text-primary" />
            Department Spaces
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {departments.length === 0
              ? 'Organize your company into departments.'
              : `${departments.length} department${departments.length === 1 ? '' : 's'} across the workspace`}
          </p>
        </div>
        <button
          onClick={() => setDeptModalOpen(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Create Department
        </button>
      </div>

      {/* Department Cards */}
      {departments.length === 0 ? (
        <div className="clean-card rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Building2 size={22} className="text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No departments yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            Create your first department to start structuring your workspace.
          </p>
          <button
            onClick={() => setDeptModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Create Department
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {departments.map((dept) => {
            const manager = users.find((u) => u.id === dept.managerId);
            const { deptProjects, deptTasks, openTasks } = statsFor(dept.id);
            return (
              <button
                key={dept.id}
                onClick={() => {
                  setActiveProjectId(null);
                  setActiveDepartmentId(dept.id);
                }}
                className="clean-card rounded-xl p-5 text-left hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: dept.color }}
                    >
                      {dept.code?.slice(0, 2).toUpperCase() || dept.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground truncate">{dept.name}</h3>
                        <span className="text-[10px] font-mono font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
                          {dept.code}
                        </span>
                      </div>
                      {manager && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">Led by {manager.name}</p>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    size={15}
                    className="text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-1"
                  />
                </div>

                <p className="text-xs text-muted-foreground mt-3 line-clamp-2 min-h-[32px]">
                  {dept.description || 'No description yet.'}
                </p>

                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/70 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users size={13} className="text-muted-foreground/70" />
                    {dept.teams?.length ?? 0} teams
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FolderKanban size={13} className="text-muted-foreground/70" />
                    {deptProjects.length} projects
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckSquare size={13} className="text-muted-foreground/70" />
                    {deptTasks.length} tasks
                  </span>
                  <span className="ml-auto font-medium text-foreground">{openTasks} open</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
