'use client';

import React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const TaskCalendarView: React.FC = () => {
  const { tasks, setSelectedTaskId, setTaskModalOpen } = useWorkspace();

  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="p-6 max-w-7xl mx-auto select-none animate-fade-in space-y-6">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <CalendarIcon size={20} className="text-primary" />
          <h2 className="text-base font-bold text-foreground">September 2026 Planner</h2>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-semibold px-3 py-1 bg-secondary rounded-lg">Today</span>
          <button className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2 bg-card border border-border rounded-2xl p-3 shadow-sm">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-[11px] font-bold text-muted-foreground py-2 uppercase">
            {day}
          </div>
        ))}

        {daysInMonth.map((day) => {
          const formattedDate = `2026-09-${day < 10 ? '0' + day : day}`;
          const dayTasks = tasks.filter((t) => t.dueDate === formattedDate);

          return (
            <div
              key={day}
              className="min-h-[100px] p-2 rounded-xl bg-secondary/30 border border-border/40 hover:border-primary/40 transition-colors flex flex-col justify-between"
            >
              <span className="text-xs font-semibold text-foreground">{day}</span>

              <div className="space-y-1 mt-1 overflow-y-auto max-h-[80px]">
                {dayTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className="w-full text-left px-1.5 py-0.5 rounded bg-primary/15 hover:bg-primary/25 border border-primary/20 text-[10px] text-primary font-medium truncate block"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
