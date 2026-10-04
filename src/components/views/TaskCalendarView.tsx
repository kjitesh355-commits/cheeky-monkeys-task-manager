'use client';

import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { Task, TaskPriority } from '../../types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PRIORITY_ORDER: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  URGENT: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  HIGH: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
  LOW: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  NONE: 'bg-muted text-muted-foreground border-border',
};

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

const MAX_VISIBLE = 3;

interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  tasks: Task[];
}

export const TaskCalendarView: React.FC = () => {
  const { scopedTasks, setSelectedTaskId, setTaskModalOpen } = useWorkspace();

  const todayIso = isoOf(new Date());
  const [cursor, setCursor] = useState(() => {
    const t = new Date();
    return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1 };
  });

  const shiftMonth = (delta: number) =>
    setCursor((c) => {
      const d = new Date(Date.UTC(c.year, c.month - 1 + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    });

  const goToday = () => {
    const t = new Date();
    setCursor({ year: t.getUTCFullYear(), month: t.getUTCMonth() + 1 });
  };

  const { cells, monthCount, completedCount, overdueCount } = useMemo(() => {
    const prefix = `${cursor.year}-${pad(cursor.month)}`;
    const monthTasks = scopedTasks.filter((t) => t.dueDate && t.dueDate.startsWith(prefix));
    const completedCount = monthTasks.filter((t) => t.status === 'COMPLETED').length;
    const overdueCount = monthTasks.filter((t) => t.status !== 'COMPLETED' && (t.dueDate as string) < todayIso).length;

    const byDate = new Map<string, Task[]>();
    for (const t of scopedTasks) {
      if (!t.dueDate) continue;
      const list = byDate.get(t.dueDate);
      if (list) list.push(t);
      else byDate.set(t.dueDate, [t]);
    }

    const first = new Date(Date.UTC(cursor.year, cursor.month - 1, 1));
    const offset = (first.getUTCDay() + 6) % 7; // Monday-first grid
    const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
    const weeks = Math.ceil((offset + daysInMonth) / 7);
    const startMs = Date.UTC(cursor.year, cursor.month - 1, 1 - offset);

    const cells: DayCell[] = Array.from({ length: weeks * 7 }, (_, i) => {
      const d = new Date(startMs + i * 86400000);
      const iso = isoOf(d);
      const tasks = (byDate.get(iso) ?? []).slice().sort((a, b) => {
        if ((a.status === 'COMPLETED') !== (b.status === 'COMPLETED')) return a.status === 'COMPLETED' ? 1 : -1;
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      });
      return {
        iso,
        day: d.getUTCDate(),
        inMonth: d.getUTCMonth() + 1 === cursor.month,
        isToday: iso === todayIso,
        tasks,
      };
    });

    return { cells, monthCount: monthTasks.length, completedCount, overdueCount };
  }, [scopedTasks, cursor, todayIso]);

  return (
    <div className="p-6 max-w-7xl mx-auto select-none animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <CalendarIcon size={20} className="text-primary" />
          <div>
            <h2 className="text-base font-bold text-foreground">
              {MONTH_NAMES[cursor.month - 1]} {cursor.year} Planner
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {monthCount} due · {completedCount} completed · {overdueCount} overdue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTaskModalOpen(true, todayIso)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:from-violet-500 hover:to-indigo-500 transition-all"
          >
            <Plus size={14} /> New Task
          </button>
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="text-xs font-semibold px-3 py-1 bg-secondary rounded-lg hover:bg-secondary/80 text-muted-foreground"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2 bg-card border border-border rounded-2xl p-3 shadow-sm">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[11px] font-bold text-muted-foreground py-2 uppercase">
            {day}
          </div>
        ))}

        {cells.map((cell) => {
          const visible = cell.tasks.slice(0, MAX_VISIBLE);
          const hidden = cell.tasks.length - visible.length;
          return (
            <div
              key={cell.iso}
              role="button"
              tabIndex={0}
              aria-label={`Create task on ${cell.iso}`}
              onClick={() => setTaskModalOpen(true, cell.iso)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTaskModalOpen(true, cell.iso);
                }
              }}
              className={`min-h-[88px] md:min-h-[104px] p-2 rounded-xl border transition-colors flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                cell.isToday
                  ? 'bg-primary/10 border-primary/50'
                  : cell.inMonth
                    ? 'bg-secondary/30 border-border/40 hover:border-primary/40'
                    : 'bg-secondary/10 border-border/20 hover:border-primary/30'
              }`}
            >
              <span
                className={`text-xs font-semibold ${
                  cell.isToday ? 'text-primary' : cell.inMonth ? 'text-foreground' : 'text-muted-foreground/60'
                }`}
              >
                {cell.day}
              </span>

              <div className="space-y-1 mt-1 overflow-y-auto max-h-[76px]">
                {visible.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTaskId(t.id);
                    }}
                    className={`w-full text-left px-1.5 py-0.5 rounded border text-[10px] font-medium truncate block hover:opacity-80 ${
                      PRIORITY_STYLES[t.priority] ?? PRIORITY_STYLES.NONE
                    } ${t.status === 'COMPLETED' ? 'line-through opacity-60' : ''}`}
                  >
                    {t.title}
                  </button>
                ))}
                {hidden > 0 && (
                  <span className="block px-1.5 text-[10px] font-semibold text-muted-foreground">+{hidden} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {monthCount === 0 && (
        <div className="clean-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No tasks due in {MONTH_NAMES[cursor.month - 1]} {cursor.year}. Click any day to schedule one.
          </p>
        </div>
      )}
    </div>
  );
};
