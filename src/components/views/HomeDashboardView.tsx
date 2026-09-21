'use client';

import React from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  Folder,
  Plus,
  Building2,
  Sparkles,
  TrendingUp,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const HomeDashboardView: React.FC = () => {
  const {
    currentUser,
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
  } = useWorkspace();

  const myTasks = tasks.filter((t) => t.assigneeIds.includes(currentUser.id));
  const dueTodayTasks = myTasks.filter((t) => t.dueDate && t.dueDate === new Date().toISOString().split('T')[0]);
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');

  const completedStepsCount = onboardingSteps.filter((s) => s.completed).length;
  const onboardingProgress = Math.round((completedStepsCount / onboardingSteps.length) * 100);

  const topCards = [
    { label: 'My Tasks', count: myTasks.length, icon: CheckSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Projects', count: projects.length, icon: Folder, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Due Today', count: dueTodayTasks.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completed', count: completedTasks.length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

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

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto select-none animate-fade-in">
      {/* Header Banner */}
      <div className="clean-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Welcome to WORKSPACE
          </h1>
          <p className="text-xs text-muted-foreground">
            Your company&apos;s central place to organize projects, tasks and teamwork.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setTaskModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>Create Task</span>
          </button>
          <button
            onClick={() => setDeptModalOpen(true)}
            className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium px-4 py-2 rounded-xl border border-border transition-all"
          >
            <Building2 size={16} className="text-indigo-600" />
            <span>Add Dept</span>
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="clean-card p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-muted-foreground">{card.label}</span>
                <div className="text-2xl font-bold text-foreground">{card.count}</div>
              </div>
              <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: GET STARTED Onboarding Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="clean-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600" />
                  Get Started
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set up your company workspace by completing these initial steps.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-600 font-mono bg-indigo-50 px-2.5 py-1 rounded-lg">
                {onboardingProgress}% Completed
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-500"
                style={{ width: `${onboardingProgress}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-2 pt-1">
              {onboardingSteps.map((step) => (
                <div
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    step.completed
                      ? 'bg-emerald-50/40 border-emerald-200 text-muted-foreground'
                      : 'bg-card border-border hover:border-indigo-300 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOnboardingStep(step.id);
                      }}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all font-mono text-xs font-bold ${
                        step.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-border text-muted-foreground group-hover:border-indigo-600'
                      }`}
                    >
                      {step.completed ? <Check size={14} /> : step.number}
                    </button>
                    <div>
                      <div className={`text-xs font-semibold ${step.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {step.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{step.description}</div>
                    </div>
                  </div>

                  <ChevronRight size={14} className="text-muted-foreground group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col */}
        <div className="space-y-6">
          {/* Department Quick List */}
          <div className="clean-card p-4 space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground">
              Structural Departments
            </h3>
            <div className="space-y-1.5">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => {
                    setActiveDepartmentId(dept.id);
                    setActiveView('DASHBOARD');
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/60 transition-all text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.color }} />
                    <span className="text-xs font-semibold text-foreground">{dept.name}</span>
                  </div>
                  <ChevronRight size={13} className="text-muted-foreground group-hover:text-indigo-600" />
                </button>
              ))}
            </div>
          </div>

          {/* Activity Empty State */}
          <div className="clean-card p-5 space-y-3 text-center">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1.5">
              <TrendingUp size={14} className="text-indigo-600" /> Recent Activity
            </h3>
            {activityLogs.length === 0 ? (
              <div className="py-4 space-y-1">
                <p className="text-xs text-muted-foreground">No activity yet.</p>
                <p className="text-[11px] text-muted-foreground/70">Activity will appear here as real users complete tasks.</p>
              </div>
            ) : (
              <div className="space-y-2 text-left">
                {activityLogs.slice(0, 3).map((act) => (
                  <div key={act.id} className="text-xs border-b border-border/40 pb-2">
                    <span className="font-semibold text-foreground">{act.action}</span> - <span className="text-muted-foreground">{act.targetTitle}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
