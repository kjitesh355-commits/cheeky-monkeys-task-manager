'use client';

import React, { useState } from 'react';
import { Plus, CheckSquare, Clock, AlertTriangle, MoreVertical, MessageSquare } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskStatus } from '../../types';

export const TaskBoardView: React.FC = () => {
  const {
    tasks,
    activeDepartmentId,
    activeProjectId,
    users,
    updateTaskStatus,
    setSelectedTaskId,
    setTaskModalOpen,
  } = useWorkspace();

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  let filteredTasks = tasks;
  if (activeDepartmentId) {
    filteredTasks = filteredTasks.filter((t) => t.departmentId === activeDepartmentId);
  }
  if (activeProjectId) {
    filteredTasks = filteredTasks.filter((t) => t.projectId === activeProjectId);
  }

  const columns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'TO_DO', label: 'TO DO', color: 'border-slate-500' },
    { status: 'IN_PROGRESS', label: 'IN PROGRESS', color: 'border-blue-500' },
    { status: 'IN_REVIEW', label: 'IN REVIEW', color: 'border-purple-500' },
    { status: 'APPROVED', label: 'APPROVED', color: 'border-emerald-500' },
    { status: 'COMPLETED', label: 'COMPLETED', color: 'border-emerald-600' },
  ];

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId') || draggedTaskId;
    if (taskId) {
      updateTaskStatus(taskId, targetStatus);
      setDraggedTaskId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto select-none animate-fade-in overflow-x-auto">
      <div className="flex items-start gap-4 min-w-[1000px]">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) =>
            col.status === 'IN_REVIEW' ? t.status === 'IN_REVIEW' || t.status === 'APPROVED' : t.status === col.status
          );

          return (
            <div
              key={col.status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.status)}
              className="flex-1 min-w-[240px] bg-card/60 border border-border/80 rounded-2xl p-3 space-y-3 flex flex-col max-h-[80vh] shadow-sm"
            >
              {/* Column Header */}
              <div className={`flex items-center justify-between pb-2 border-b-2 ${col.color}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">{col.label}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold">
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => setTaskModalOpen(true)}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colTasks.map((task) => {
                  const taskAssignees = users.filter((u) => task.assigneeIds.includes(u.id));
                  const subtaskCount = task.subtasks.length;
                  const completedSubs = task.subtasks.filter((s) => s.completed).length;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="p-3.5 rounded-xl bg-card border border-border hover:border-primary/50 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all space-y-3 group"
                    >
                      {/* Tags & Priority */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                            task.priority === 'URGENT'
                              ? 'bg-rose-500/10 text-rose-500'
                              : task.priority === 'HIGH'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {task.priority}
                        </span>

                        <span className="text-[10px] text-muted-foreground">{task.dueDate || 'No Date'}</span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {task.title}
                      </h4>

                      {/* Progress bar if subtasks exist */}
                      {subtaskCount > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>Subtasks</span>
                            <span className="font-mono">{completedSubs}/{subtaskCount}</span>
                          </div>
                          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all duration-300"
                              style={{ width: `${(completedSubs / subtaskCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer: Assignees & Comments */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MessageSquare size={12} />
                          <span>{task.commentsCount}</span>
                        </div>

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
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
