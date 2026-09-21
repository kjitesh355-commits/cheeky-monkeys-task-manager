'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Plus,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskStatus, TaskPriority } from '../../types';

export const TaskListView: React.FC = () => {
  const {
    tasks,
    departments,
    users,
    activeDepartmentId,
    activeProjectId,
    updateTaskStatus,
    setSelectedTaskId,
    setTaskModalOpen,
    filterStatus,
    setFilterStatus,
    filterPriority,
    setFilterPriority,
  } = useWorkspace();

  const [localSearch, setLocalSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  let filteredTasks = tasks;
  if (activeDepartmentId) {
    filteredTasks = filteredTasks.filter((t) => t.departmentId === activeDepartmentId);
  }
  if (activeProjectId) {
    filteredTasks = filteredTasks.filter((t) => t.projectId === activeProjectId);
  }
  if (filterStatus !== 'ALL') {
    filteredTasks = filteredTasks.filter((t) => t.status === filterStatus);
  }
  if (filterPriority !== 'ALL') {
    filteredTasks = filteredTasks.filter((t) => t.priority === filterPriority);
  }
  if (localSearch.trim()) {
    filteredTasks = filteredTasks.filter((t) => t.title.toLowerCase().includes(localSearch.toLowerCase()));
  }

  const groups: { status: TaskStatus; label: string; color: string; items: Task[] }[] = [
    { status: 'TO_DO', label: 'TO DO', color: 'text-slate-500 bg-slate-100', items: filteredTasks.filter((t) => t.status === 'TO_DO') },
    { status: 'IN_PROGRESS', label: 'IN PROGRESS', color: 'text-blue-600 bg-blue-50', items: filteredTasks.filter((t) => t.status === 'IN_PROGRESS') },
    { status: 'IN_REVIEW', label: 'IN REVIEW', color: 'text-purple-600 bg-purple-50', items: filteredTasks.filter((t) => t.status === 'IN_REVIEW' || t.status === 'APPROVED') },
    { status: 'COMPLETED', label: 'COMPLETED', color: 'text-emerald-600 bg-emerald-50', items: filteredTasks.filter((t) => t.status === 'COMPLETED') },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto select-none animate-fade-in">
      {/* Toolbar */}
      <div className="clean-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter tasks..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="bg-secondary text-foreground text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary border border-border"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-secondary text-foreground text-xs rounded-lg px-2.5 py-1.5 focus:outline-none border border-border"
            >
              <option value="ALL">All Statuses</option>
              <option value="TO_DO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="bg-secondary text-foreground text-xs rounded-lg px-2.5 py-1.5 focus:outline-none border border-border"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setTaskModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm active:scale-95 transition-all self-start md:self-auto"
        >
          <Plus size={16} />
          <span>+ Create Task</span>
        </button>
      </div>

      {/* Main Empty State if ZERO tasks exist overall */}
      {filteredTasks.length === 0 ? (
        <div className="clean-card p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">No tasks yet</h3>
            <p className="text-xs text-muted-foreground">
              Create your first task to start organizing your team&apos;s work.
            </p>
          </div>
          <button
            onClick={() => setTaskModalOpen(true)}
            className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-all active:scale-95"
          >
            + Create Task
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const isCollapsed = collapsedGroups[group.status];
            return (
              <div key={group.status} className="clean-card overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.status)}
                  className="w-full flex items-center justify-between p-3.5 bg-secondary/30 hover:bg-secondary/60 transition-colors border-b border-border text-xs font-bold"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    <span className={`uppercase tracking-wider px-2 py-0.5 rounded-md text-[10px] ${group.color}`}>
                      {group.label} ({group.items.length})
                    </span>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-border/60">
                    {group.items.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground italic">
                        No tasks in {group.label.toLowerCase()}
                      </div>
                    ) : (
                      group.items.map((task) => {
                        const isDone = task.status === 'COMPLETED';
                        const taskAssignees = users.filter((u) => task.assigneeIds.includes(u.id));

                        return (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-3.5 hover:bg-secondary/40 transition-colors gap-3 cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTaskStatus(task.id, isDone ? 'TO_DO' : 'COMPLETED');
                                }}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-border hover:border-indigo-600 text-transparent'
                                }`}
                              >
                                <CheckCircle2 size={13} />
                              </button>

                              <div
                                onClick={() => setSelectedTaskId(task.id)}
                                className="min-w-0 flex-1"
                              >
                                <div
                                  className={`text-xs font-semibold truncate group-hover:text-indigo-600 transition-colors ${
                                    isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                                  }`}
                                >
                                  {task.title}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                  <span>{departments.find((d) => d.id === task.departmentId)?.name}</span>
                                </div>
                              </div>
                            </div>

                            <div
                              onClick={() => setSelectedTaskId(task.id)}
                              className="flex items-center gap-4 text-xs shrink-0"
                            >
                              <span className="text-[10px] text-muted-foreground">
                                {task.dueDate || 'No Date'}
                              </span>

                              <div className="flex -space-x-1.5 overflow-hidden">
                                {taskAssignees.map((u) => (
                                  <img
                                    key={u.id}
                                    src={u.avatar}
                                    alt={u.name}
                                    className="w-5 h-5 rounded-full object-cover ring-2 ring-card"
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
