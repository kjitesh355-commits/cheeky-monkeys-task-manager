'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, CheckCircle2, Clock, AlertTriangle, FolderKanban, ListChecks } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { TaskStatus } from '../../types';

const STATUS_COLORS: Record<TaskStatus, string> = {
  TO_DO: '#98A2B3',
  IN_PROGRESS: '#5B4BFF',
  IN_REVIEW: '#F79009',
  APPROVED: '#12B76A',
  COMPLETED: '#12B76A',
  BLOCKED: '#F04438',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  TO_DO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  BLOCKED: 'Blocked',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#F04438',
  HIGH: '#F79009',
  MEDIUM: '#5B4BFF',
  LOW: '#12B76A',
  NONE: '#98A2B3',
};

export const AnalyticsView: React.FC = () => {
  const { tasks, projects, departments } = useWorkspace();
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  const scoped = useMemo(
    () => (departmentFilter === 'ALL' ? tasks : tasks.filter((t) => t.departmentId === departmentFilter)),
    [tasks, departmentFilter]
  );

  const scopedProjects = useMemo(
    () => (departmentFilter === 'ALL' ? projects : projects.filter((p) => p.departmentId === departmentFilter)),
    [projects, departmentFilter]
  );

  const stats = useMemo(() => {
    const total = scoped.length;
    const completed = scoped.filter((t) => t.status === 'COMPLETED').length;
    const inProgress = scoped.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW').length;
    const today = new Date().toISOString().slice(0, 10);
    const overdue = scoped.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'COMPLETED').length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
    const activeProjects = scopedProjects.filter((p) => p.status !== 'COMPLETED').length;
    return { total, completed, inProgress, overdue, completionRate, activeProjects };
  }, [scoped, scopedProjects]);

  const byStatus = useMemo(() => {
    const counts = new Map<TaskStatus, number>();
    scoped.forEach((t) => counts.set(t.status, (counts.get(t.status) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([status, count]) => ({ name: STATUS_LABELS[status], count, color: STATUS_COLORS[status] }))
      .sort((a, b) => b.count - a.count);
  }, [scoped]);

  const byPriority = useMemo(() => {
    const order = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'];
    return order
      .map((priority) => ({
        name: priority === 'NONE' ? 'No priority' : priority.charAt(0) + priority.slice(1).toLowerCase(),
        value: scoped.filter((t) => t.priority === priority).length,
        color: PRIORITY_COLORS[priority],
      }))
      .filter((entry) => entry.value > 0);
  }, [scoped]);

  const byDepartment = useMemo(() => {
    const rows = departments.map((dept) => {
      const deptTasks = scoped.filter((t) => t.departmentId === dept.id);
      return {
        name: dept.name,
        total: deptTasks.length,
        completed: deptTasks.filter((t) => t.status === 'COMPLETED').length,
      };
    });
    return rows.filter((row) => row.total > 0);
  }, [departments, scoped]);

  const kpis = [
    { label: 'Total Tasks', value: stats.total, icon: ListChecks, accent: 'text-primary bg-primary/10' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, accent: 'text-success bg-success/10' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, accent: 'text-primary bg-primary/10' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, accent: 'text-destructive bg-destructive/10' },
    { label: 'Completion Rate', value: `${stats.completionRate}%`, icon: BarChart3, accent: 'text-warning bg-warning/10' },
    { label: 'Active Projects', value: stats.activeProjects, icon: FolderKanban, accent: 'text-primary bg-primary/10' },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            Executive Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time performance across the workspace</p>
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="ALL">All departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {tasks.length === 0 ? (
        <div className="clean-card rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={22} className="text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No data available yet.</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Analytics will populate as soon as your workspace has tasks and projects.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="clean-card rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.accent}`}>
                      <Icon size={15} />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-3">{kpi.value}</div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="clean-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Tasks by Status</h3>
              {byStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No data available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byStatus} margin={{ top: 0, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E9F0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(91,75,255,0.06)' }}
                      contentStyle={{ borderRadius: 10, border: '1px solid #E7E9F0', fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {byStatus.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="clean-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Tasks by Priority</h3>
              {byPriority.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No data available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={byPriority}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {byPriority.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid #E7E9F0', fontSize: 12 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="clean-card rounded-xl p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-foreground mb-4">Workload by Department</h3>
              {byDepartment.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No data available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={byDepartment} margin={{ top: 0, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E9F0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(91,75,255,0.06)' }}
                      contentStyle={{ borderRadius: 10, border: '1px solid #E7E9F0', fontSize: 12 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="total" name="Total tasks" fill="#5B4BFF" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#12B76A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
