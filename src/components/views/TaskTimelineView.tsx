'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { Task, TaskPriority } from '../../types';

const DAY_MS = 86400000;
const LABEL_W = 220;
const COL_W = 44;
const PRIORITY_ORDER: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };

const pad = (n: number) => String(n).padStart(2, '0');
const parseIso = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const isoOfMs = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

const barColor = (t: Task, overdue: boolean) => {
  if (t.status === 'COMPLETED') return 'linear-gradient(to right, #10B981, #059669)';
  if (overdue) return 'linear-gradient(to right, #F04438, #D92D20)';
  switch (t.priority) {
    case 'URGENT': return 'linear-gradient(to right, #F04438, #EF4444)';
    case 'HIGH': return 'linear-gradient(to right, #F79009, #F59E0B)';
    case 'LOW': return 'linear-gradient(to right, #38BDF8, #0EA5E9)';
    default: return 'linear-gradient(to right, #6D28D9, #4F46E5)';
  }
};

interface Segment {
  key: string;
  label: string;
  startIdx: number;
  endIdx: number;
}

export const TaskTimelineView: React.FC = () => {
  const { scopedTasks, projects, setSelectedTaskId } = useWorkspace();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [todayIso] = useState(() => isoOfMs(Date.now()));
  const todayMs = parseIso(todayIso);

  const { days, totalDays, rangeLabel, scheduled, unscheduled, todayIdx, monthSegments } = useMemo(() => {
    const toSchedule: Task[] = [];
    const noDates: Task[] = [];
    for (const t of scopedTasks) {
      if (t.dueDate || t.startDate) toSchedule.push(t);
      else noDates.push(t);
    }

    let minMs = todayMs;
    let maxMs = todayMs;
    for (const t of toSchedule) {
      if (t.startDate) minMs = Math.min(minMs, parseIso(t.startDate));
      if (t.dueDate) maxMs = Math.max(maxMs, parseIso(t.dueDate));
      if (t.startDate) maxMs = Math.max(maxMs, parseIso(t.startDate));
      if (t.dueDate) minMs = Math.min(minMs, parseIso(t.dueDate));
    }
    minMs -= 3 * DAY_MS;
    maxMs += 3 * DAY_MS;
    if (maxMs - minMs < 13 * DAY_MS) maxMs = minMs + 13 * DAY_MS;

    const total = Math.round((maxMs - minMs) / DAY_MS) + 1;
    const days = Array.from({ length: total }, (_, i) => {
      const ms = minMs + i * DAY_MS;
      return { ms, iso: isoOfMs(ms), dow: new Date(ms).getUTCDay(), dom: new Date(ms).getUTCDate() };
    });

    const monthSegments: Segment[] = [];
    days.forEach((d, i) => {
      const dt = new Date(d.ms);
      const key = `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`;
      const last = monthSegments[monthSegments.length - 1];
      if (last && last.key === key) last.endIdx = i;
      else
        monthSegments.push({
          key,
          label: dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
          startIdx: i,
          endIdx: i,
        });
    });

    const fmt = (iso: string) =>
      new Date(parseIso(iso)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

    return {
      days,
      totalDays: total,
      rangeLabel: `${fmt(isoOfMs(minMs))} – ${fmt(isoOfMs(maxMs))}`,
      scheduled: toSchedule,
      unscheduled: noDates,
      todayIdx: Math.round((todayMs - minMs) / DAY_MS),
      monthSegments,
    };
  }, [scopedTasks, todayMs]);

  const bars = useMemo(() => {
    const rangeStart = todayMs - todayIdx * DAY_MS;
    return scheduled
      .map((t) => {
        const dueIdx = t.dueDate ? Math.round((parseIso(t.dueDate) - rangeStart) / DAY_MS) : null;
        const startIdx = t.startDate ? Math.round((parseIso(t.startDate) - rangeStart) / DAY_MS) : null;
        let s = startIdx ?? (dueIdx !== null ? Math.max(0, dueIdx - 2) : 0);
        let e = dueIdx ?? Math.min(totalDays - 1, (startIdx ?? 0) + 2);
        s = Math.max(0, Math.min(s, totalDays - 1));
        e = Math.max(s, Math.min(e, totalDays - 1));
        const overdue = !!t.dueDate && t.dueDate < todayIso && t.status !== 'COMPLETED';
        return { task: t, s, e, overdue };
      })
      .sort((a, b) => a.s - b.s || PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority]);
  }, [scheduled, todayIdx, todayMs, totalDays, todayIso]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = Math.max(0, todayIdx * COL_W - 320);
  }, [todayIdx, totalDays]);

  const overdueCount = scheduled.filter((t) => t.dueDate && t.dueDate < todayIso && t.status !== 'COMPLETED').length;
  const projectLabel = (t: Task) => projects.find((p) => p.id === t.projectId)?.name ?? 'No project';

  return (
    <div className="p-6 max-w-7xl mx-auto select-none animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <SlidersHorizontal size={20} className="text-primary" />
          <div>
            <h2 className="text-base font-bold text-foreground">Gantt & Timeline Schedule</h2>
            <p className="text-[11px] text-muted-foreground">
              {rangeLabel} · {scheduled.length} scheduled · {overdueCount} overdue
            </p>
          </div>
        </div>
      </div>

      {scheduled.length === 0 && unscheduled.length === 0 ? (
        <div className="clean-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No tasks to schedule yet. Create a task to see it on the timeline.</p>
        </div>
      ) : (
        <div ref={scrollRef} className="bg-card border border-border rounded-2xl shadow-sm overflow-x-auto">
          <div className="relative" style={{ minWidth: LABEL_W + totalDays * COL_W }}>
            {/* Month band */}
            <div className="grid sticky top-0 z-20 bg-card h-9" style={{ gridTemplateColumns: `${LABEL_W}px repeat(${totalDays}, ${COL_W}px)` }}>
              <div className="sticky left-0 z-30 bg-card border-b border-border px-3 text-xs font-bold text-muted-foreground flex items-center">
                Task
              </div>
              {monthSegments.map((seg) => (
                <div
                  key={seg.key}
                  className="border-b border-border px-2 text-xs font-bold text-muted-foreground whitespace-nowrap flex items-center"
                  style={{ gridColumn: `${seg.startIdx + 2} / ${seg.endIdx + 3}` }}
                >
                  {seg.label}
                </div>
              ))}
            </div>

            {/* Day header */}
            <div className="grid sticky top-9 z-20 bg-card" style={{ gridTemplateColumns: `${LABEL_W}px repeat(${totalDays}, ${COL_W}px)` }}>
              <div className="sticky left-0 z-30 bg-card border-b border-border" />
              {days.map((d, i) => (
                <div
                  key={d.iso}
                  className={`border-b border-border text-center text-[10px] py-1.5 ${
                    i === todayIdx
                      ? 'bg-red-500/15 text-red-500 font-bold'
                      : d.dow === 0 || d.dow === 6
                        ? 'text-muted-foreground/60 font-semibold'
                        : 'text-muted-foreground font-semibold'
                  }`}
                >
                  {d.dom}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div>
              {bars.map(({ task, s, e, overdue }) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="grid group items-center hover:bg-secondary/40 rounded-none transition-colors cursor-pointer border-b border-border/40 last:border-b-0"
                  style={{ gridTemplateColumns: `${LABEL_W}px repeat(${totalDays}, ${COL_W}px)` }}
                >
                  <div className="sticky left-0 z-10 bg-card group-hover:bg-secondary/40 px-3 py-2 min-w-0 transition-colors">
                    <p className="text-xs font-semibold text-foreground truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {projectLabel(task)} · {task.status.replace(/_/g, ' ').toLowerCase()}
                    </p>
                  </div>
                  <div
                    className="py-1.5 pr-1"
                    style={{ gridColumn: `${s + 2} / ${e + 3}` }}
                    title={`${task.startDate ?? '—'} → ${task.dueDate ?? '—'}`}
                  >
                    <div
                      className="relative h-5 rounded-md shadow-sm flex items-center px-2 overflow-hidden"
                      style={{ background: barColor(task, overdue) }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-white/25"
                        style={{ width: `${Math.max(0, Math.min(100, task.progress ?? 0))}%` }}
                      />
                      <span className="relative text-[10px] text-white font-bold truncate">
                        {task.progress ?? 0}% · {task.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Today marker */}
            {todayIdx >= 0 && todayIdx < totalDays && (
              <div
                className="absolute top-0 bottom-0 w-px bg-red-500/70 pointer-events-none z-10"
                style={{ left: LABEL_W + todayIdx * COL_W }}
                aria-hidden
              />
            )}
          </div>
        </div>
      )}

      {unscheduled.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase">Unscheduled ({unscheduled.length})</p>
          {unscheduled
            .slice()
            .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTaskId(t.id)}
                className="w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
              >
                <span className="text-xs font-semibold text-foreground truncate">{t.title}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {projectLabel(t)} · no dates
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
