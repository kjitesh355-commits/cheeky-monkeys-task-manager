'use client';

import React from 'react';
import { SlidersHorizontal, ChevronRight } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const TaskTimelineView: React.FC = () => {
  const { tasks, projects, setSelectedTaskId } = useWorkspace();

  return (
    <div className="p-6 max-w-7xl mx-auto select-none animate-fade-in space-y-6">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <SlidersHorizontal size={20} className="text-primary" />
          <h2 className="text-base font-bold text-foreground">Gantt & Timeline Schedule</h2>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm overflow-x-auto">
        <div className="min-w-[800px] space-y-4">
          {/* Header Dates */}
          <div className="grid grid-cols-6 gap-2 border-b border-border pb-3 text-xs font-bold text-muted-foreground">
            <div>Project / Task</div>
            <div>Sep 01 - 05</div>
            <div>Sep 06 - 10</div>
            <div>Sep 11 - 15</div>
            <div>Sep 16 - 25</div>
            <div>Sep 26 - 30</div>
          </div>

          {/* Rows */}
          {tasks.slice(0, 6).map((task, idx) => (
            <div
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              className="grid grid-cols-6 gap-2 items-center py-2.5 hover:bg-secondary/40 rounded-xl transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-foreground truncate">{task.title}</div>
              <div className="col-span-5 relative h-7 bg-secondary/30 rounded-lg overflow-hidden flex items-center px-2">
                <div
                  className="absolute h-5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 shadow-sm flex items-center px-2 text-[10px] text-white font-bold truncate"
                  style={{
                    left: `${(idx * 15) % 60}%`,
                    width: `${30 + (idx % 3) * 15}%`,
                  }}
                >
                  {task.progress}% - {task.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
