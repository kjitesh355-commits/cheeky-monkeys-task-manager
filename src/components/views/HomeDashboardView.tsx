'use client';

import React from 'react';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  FolderKanban,
  Plus,
  Building2,
  Sparkles,
  Check,
  ChevronRight,
  CalendarClock,
  ListChecks,
  Inbox,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { timeAgo } from '../task-panel/utils';

type FeedItem = {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
};

const PRIORITY_STYLE: Record<string, string> = {
  URGENT: 'bg-[#FEECEB] text-[#F04438]',
  HIGH: 'bg-[#FEECEB] text-[#F04438]',
  MEDIUM: 'bg-[#FFF4E5] text-[#F79009]',
  LOW: 'bg-[#F0F1F6] text-[#667085]',
  NONE: 'bg-[#F0F1F6] text-[#667085]',
};

const PRIORITY_LABEL: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  NONE: 'None',
};

export const HomeDashboardView: React.FC = () => {
  const {
    currentUser,
    users,
    tasks,
    projects,
    departments,
    activityLogs,
    onboardingSteps,
    toggleOnboardingStep,
    setTaskModalOpen,
    setDeptModalOpen,
    setProjectModalOpen,
    setInviteOpen,
    setProfileOpen,
    setActiveView,
    setActiveDepartmentId,
    setActiveProjectId,
    setSelectedTaskId,
  } = useWorkspace();

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];

  const openTasks = tasks.filter((t) => t.status !== 'COMPLETED');
  const myTasks = openTasks.filter((t) => t.assigneeIds.includes(currentUser.id));
  const dueTodayTasks = myTasks.filter((t) => t.dueDate === today);
  const overdueTasks = myTasks.filter((t) => t.dueDate && t.dueDate < today);
  const activeProjects = projects.filter((p) => p.status !== 'COMPLETED');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
  const completionPct = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const metrics = [
    { label: 'My Tasks', value: myTasks.length, icon: CheckSquare, fg: '#5B4BFF', bg: '#F0EEFF' },
    { label: 'Due Today', value: dueTodayTasks.length, icon: Clock, fg: '#F79009', bg: '#FFF4E5' },
    { label: 'Overdue', value: overdueTasks.length, icon: AlertTriangle, fg: '#F04438', bg: '#FEECEB' },
    { label: 'Active Projects', value: activeProjects.length, icon: FolderKanban, fg: '#12B76A', bg: '#E9F9F1' },
  ];

  // Onboarding progress is derived from real workspace state, never hard-coded.
  const stepState: Record<string, boolean> = {
    'ob-1': Boolean(currentUser && currentUser.email),
    'ob-2': departments.length > 0,
    'ob-3': users.length > 1,
    'ob-4': projects.length > 0,
    'ob-5': tasks.length > 0,
  };
  const steps = onboardingSteps.map((step) => ({
    ...step,
    completed: stepState[step.id] ?? step.completed,
  }));
  const completedStepsCount = steps.filter((s) => s.completed).length;
  const onboardingDone = completedStepsCount === steps.length && steps.length > 0;

  const handleStepClick = (stepId: string) => {
    switch (stepId) {
      case 'ob-1':
        setProfileOpen(true);
        break;
      case 'ob-2':
        setDeptModalOpen(true);
        break;
      case 'ob-3':
        setInviteOpen(true);
        break;
      case 'ob-4':
        setProjectModalOpen(true);
        break;
      case 'ob-5':
        setTaskModalOpen(true);
        break;
      default:
        toggleOnboardingStep(stepId);
        break;
    }
  };

  const deadlines = openTasks
    .filter((t) => t.dueDate)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : 0))
    .slice(0, 5);

  const dueLabel = (date: string) => {
    if (date === today) return 'Today';
    if (date === tomorrow) return 'Tomorrow';
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const nameOf = (id?: string | null) =>
    id ? users.find((u) => u.id === id)?.name ?? 'Unassigned' : 'Unassigned';

  // Real activity feed: logged workspace activity, otherwise real task/project events.
  const loggedFeed: FeedItem[] = activityLogs.map((log) => ({
    id: log.id,
    actor: users.find((u) => u.id === log.userId)?.name ?? 'Someone',
    action: log.action,
    target: log.targetTitle,
    at: log.createdAt,
  }));

  const taskFeed: FeedItem[] = tasks.flatMap((task) => {
    const creator = nameOf(task.createdById);
    const items: FeedItem[] = [
      {
        id: `created-${task.id}`,
        actor: creator,
        action: 'created a task',
        target: task.title,
        at: task.createdAt,
      },
    ];
    if (task.status === 'COMPLETED') {
      items.push({
        id: `completed-${task.id}`,
        actor: nameOf(task.assigneeIds[0] || task.createdById),
        action: 'completed a task',
        target: task.title,
        at: task.updatedAt,
      });
    }
    return items;
  });

  const feed = [...loggedFeed, ...taskFeed]
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, 6);

  const workloadByDept = departments
    .map((dept) => ({
      dept,
      count: tasks.filter((t) => t.departmentId === dept.id).length,
    }))
    .sort((a, b) => b.count - a.count);
  const maxWorkload = Math.max(1, ...workloadByDept.map((w) => w.count));
  const hasChartData = tasks.length > 0 || projects.length > 0;

  return (
    <div className="max-w-[1280px] mx-auto p-6 lg:p-8 space-y-6 select-none animate-fade-in">
      {/* Welcome hero */}
      <section className="hero-surface border border-border rounded-xl px-6 py-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <h1 className="text-[27px] leading-9 font-semibold tracking-tight text-foreground">
            Welcome to WORKSPACE
          </h1>
          <p className="text-sm text-muted-foreground">
            Your company&apos;s central place to organize projects, tasks and teamwork.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setDeptModalOpen(true)}
            className="flex items-center gap-2 bg-card border border-border text-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Building2 size={16} className="text-primary" />
            <span>Add Department</span>
          </button>
          <button
            onClick={() => setTaskModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span>Create Task</span>
          </button>
        </div>
      </section>

      {/* Compact real-data metrics */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="clean-card px-4 py-3.5 flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: metric.bg, color: metric.fg }}
              >
                <Icon size={17} />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] text-muted-foreground truncate">{metric.label}</div>
                <div className="text-xl leading-7 font-semibold text-foreground">{metric.value}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Get Started (auto-hides once every step is complete) */}
          {!onboardingDone && (
            <section className="clean-card p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    Get Started
                  </h2>
                  <p className="text-[13px] text-muted-foreground">
                    Set up your company workspace by completing these initial steps.
                  </p>
                </div>
                <span className="text-[13px] font-medium text-primary whitespace-nowrap">
                  {completedStepsCount} of {steps.length} completed
                </span>
              </div>

              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${(completedStepsCount / steps.length) * 100}%` }}
                />
              </div>

              <div className="space-y-1.5">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(step.id)}
                    className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/70 transition-colors text-left"
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[11px] font-semibold ${
                        step.completed ? 'bg-[#12B76A] text-white' : 'border border-border text-dim'
                      }`}
                    >
                      {step.completed ? <Check size={13} /> : step.number.replace(/^0/, '')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-medium ${
                          step.completed ? 'text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {step.title}
                      </span>
                      <span className="block text-[13px] text-dim truncate">{step.description}</span>
                    </span>
                    <ChevronRight
                      size={15}
                      className="text-dim group-hover:text-primary transition-colors shrink-0"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Deadlines */}
          <section className="clean-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <CalendarClock size={16} className="text-primary" />
                  Upcoming Deadlines
                </h2>
                <p className="text-[13px] text-muted-foreground">
                  The next tasks due across your workspace.
                </p>
              </div>
              <button
                onClick={() => setActiveView('CALENDAR')}
                className="text-[13px] font-medium text-primary hover:underline shrink-0"
              >
                View calendar
              </button>
            </div>

            {deadlines.length === 0 ? (
              <div className="py-6 text-center space-y-1">
                <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
                <p className="text-[13px] text-dim">
                  Tasks with a due date will show up here.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {deadlines.map((task) => {
                  const isOverdue = task.dueDate! < today;
                  const project = projects.find((p) => p.id === task.projectId);
                  return (
                    <button
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/70 transition-colors text-left"
                    >
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="block text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {task.title}
                        </span>
                        <span className="block text-[13px] text-dim truncate">
                          {project ? project.name : 'No project'} · {nameOf(task.assigneeIds[0])}
                        </span>
                      </span>

                      <span
                        className={`text-[13px] font-medium px-2 py-0.5 rounded-md shrink-0 ${
                          isOverdue
                            ? 'bg-[#FEECEB] text-[#F04438]'
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {isOverdue ? `Due ${dueLabel(task.dueDate!)}` : dueLabel(task.dueDate!)}
                      </span>

                      <span
                        className={`hidden sm:inline-block text-[13px] px-2 py-0.5 rounded-md shrink-0 ${
                          PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.NONE
                        }`}
                      >
                        {PRIORITY_LABEL[task.priority] ?? task.priority}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent Activity */}
          <section className="clean-card p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <ListChecks size={16} className="text-primary" />
                Recent Activity
              </h2>
              <p className="text-[13px] text-muted-foreground">
                What has happened in your workspace lately.
              </p>
            </div>

            {feed.length === 0 ? (
              <div className="py-6 text-center space-y-1">
                <p className="text-sm text-muted-foreground">No activity yet.</p>
                <p className="text-[13px] text-dim">
                  Activity will appear as your team starts working.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {feed.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <p className="text-sm text-muted-foreground leading-5">
                      <span className="font-medium text-foreground">{item.actor}</span> {item.action}{' '}
                      <span className="font-medium text-foreground">{item.target}</span>
                      <span className="text-dim"> · {timeAgo(item.at)}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Departments */}
          <section className="clean-card p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Building2 size={16} className="text-primary" />
                Structural Departments
              </h2>
              <p className="text-[13px] text-muted-foreground">
                Open a department to work inside its space.
              </p>
            </div>

            {departments.length === 0 ? (
              <div className="py-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">No departments yet.</p>
                <p className="text-[13px] text-dim">Create your first department to organize teams.</p>
                <button
                  onClick={() => setDeptModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
                >
                  <Plus size={14} /> Add Department
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {departments.map((dept) => {
                  const teamNames = dept.teams.map((t) => t.name).join(' · ');
                  const deptTasks = tasks.filter((t) => t.departmentId === dept.id).length;
                  const deptProjects = projects.filter((p) => p.departmentId === dept.id).length;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => {
                        setActiveDepartmentId(dept.id);
                        setActiveProjectId(null);
                        setActiveView('DASHBOARD');
                      }}
                      className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/70 transition-colors text-left"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: dept.color }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {dept.name}
                        </span>
                        <span className="block text-[13px] text-dim leading-4">
                          {teamNames || dept.description || 'No teams yet'}
                        </span>
                        <span className="block text-[13px] text-muted-foreground">
                          {deptTasks} task{deptTasks === 1 ? '' : 's'} · {deptProjects} project
                          {deptProjects === 1 ? '' : 's'}
                        </span>
                      </span>
                      <ChevronRight
                        size={15}
                        className="text-dim group-hover:text-primary transition-colors shrink-0"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Workspace Overview */}
          <section className="clean-card p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Inbox size={16} className="text-primary" />
                Workspace Overview
              </h2>
              <p className="text-[13px] text-muted-foreground">
                A lightweight look at how work is moving.
              </p>
            </div>

            {!hasChartData ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No data available yet.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Task completion</span>
                    <span className="font-medium text-foreground">{completionPct}%</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-success h-full rounded-full transition-all duration-500"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <p className="text-[13px] text-dim">
                    {completedTasks.length} of {tasks.length} tasks completed
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
                  <span className="text-muted-foreground">Active projects</span>
                  <span className="font-medium text-foreground">{activeProjects.length}</span>
                </div>

                <div className="space-y-2.5 border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">Department workload</span>
                  {workloadByDept.map(({ dept, count }) => (
                    <div key={dept.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-foreground truncate pr-2">{dept.name}</span>
                        <span className="text-dim shrink-0">{count}</span>
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(count / maxWorkload) * 100}%`,
                            backgroundColor: dept.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
