'use client';

import React, { useState } from 'react';
import {
  Folder,
  Plus,
  Building2,
  PieChart as PieIcon,
  Users,
  Pencil,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Avatar, ConfirmDialog } from '../task-panel/ui';
import { isModerator } from '../../lib/roles';

const STATUS_STYLE: Record<string, { label: string; bar: string; chip: string }> = {
  COMPLETED: { label: 'Completed', bar: 'bg-[#12B76A]', chip: 'bg-[#E9F9F1] text-[#12B76A]' },
  APPROVED: { label: 'Approved', bar: 'bg-[#12B76A]', chip: 'bg-[#E9F9F1] text-[#12B76A]' },
  IN_PROGRESS: { label: 'In Progress', bar: 'bg-[#5B4BFF]', chip: 'bg-[#F0EEFF] text-[#5B4BFF]' },
  IN_REVIEW: { label: 'In Review', bar: 'bg-[#F79009]', chip: 'bg-[#FFF4E5] text-[#F79009]' },
  BLOCKED: { label: 'Blocked', bar: 'bg-[#F04438]', chip: 'bg-[#FEECEB] text-[#F04438]' },
  TO_DO: { label: 'To Do', bar: 'bg-[#98A2B3]', chip: 'bg-[#F0F1F6] text-[#667085]' },
};

const statusMeta = (status: string) =>
  STATUS_STYLE[status] ?? { label: status, bar: 'bg-[#98A2B3]', chip: 'bg-[#F0F1F6] text-[#667085]' };

export const DepartmentDashboardView: React.FC = () => {
  const {
    currentUser,
    departments,
    projects,
    tasks,
    users,
    activeDepartmentId,
    setActiveProjectId,
    setActiveView,
    setActiveDepartmentId,
    setTaskModalOpen,
    setProjectModalOpen,
    setInviteOpen,
    setDeptModalOpen,
    setDeptEditId,
    deleteDepartment,
    addDepartmentMember,
    removeDepartmentMember,
    addTeam,
    removeTeam,
  } = useWorkspace();

  const [memberToAdd, setMemberToAdd] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamBusy, setTeamBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeptDelete, setConfirmDeptDelete] = useState(false);
  const [confirmTeamId, setConfirmTeamId] = useState<string | null>(null);

  const moderator = isModerator(currentUser.role);
  const currentDept = departments.find((d) => d.id === activeDepartmentId) ?? null;

  // Deleted or unknown department: render a recovery card instead of crashing.
  if (!currentDept) {
    return (
      <div className="p-6 max-w-2xl mx-auto select-none animate-fade-in">
        <div className="clean-card p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto">
            <Building2 size={22} className="text-muted-foreground" />
          </div>
          <h1 className="text-base font-semibold text-foreground">Department not found</h1>
          <p className="text-sm text-muted-foreground">
            It may have been deleted, or this link is out of date.
          </p>
          <button
            onClick={() => {
              setActiveDepartmentId(null);
              setActiveView('DEPARTMENTS');
            }}
            className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Back to Department Spaces
          </button>
        </div>
      </div>
    );
  }

  const deptProjects = projects.filter((p) => p.departmentId === currentDept.id);
  const deptTasks = tasks.filter((t) => t.departmentId === currentDept.id);
  const completedTasks = deptTasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressTasks = deptTasks.filter((t) => t.status === 'IN_PROGRESS').length;

  // Members = department membership (profiles.department_id) ∪ team rosters.
  const teamMemberIds = new Set<string>();
  currentDept.teams.forEach((t) => (t.memberIds ?? []).forEach((id) => teamMemberIds.add(id)));
  const deptMemberIds = new Set(
    users.filter((u) => u.departmentId === currentDept.id).map((u) => u.id)
  );
  const memberIds = new Set([...deptMemberIds, ...teamMemberIds]);
  const deptMembers = users.filter((u) => memberIds.has(u.id));
  const candidates = users.filter((u) => !memberIds.has(u.id));

  // Real status breakdown across this department's tasks.
  const statusCounts = new Map<string, number>();
  deptTasks.forEach((t) => statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1));
  const statusRows = [...statusCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxStatus = Math.max(1, ...statusRows.map(([, count]) => count));

  // Real workload: open tasks per member.
  const workload = deptMembers
    .map((m) => {
      const assigned = deptTasks.filter((t) => t.assigneeIds.includes(m.id));
      return {
        user: m,
        open: assigned.filter((t) => t.status !== 'COMPLETED').length,
        total: assigned.length,
      };
    })
    .sort((a, b) => b.open - a.open);
  const maxOpen = Math.max(1, ...workload.map((w) => w.open));
  const hasWorkload = workload.some((w) => w.total > 0);

  const runGuarded = async (fn: () => Promise<unknown>): Promise<boolean> => {
    setActionError(null);
    try {
      await fn();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      return false;
    }
  };

  const handleAddMember = async () => {
    if (!memberToAdd) return;
    const ok = await runGuarded(() => addDepartmentMember(currentDept.id, memberToAdd));
    if (ok) setMemberToAdd('');
  };

  const handleAddTeam = async () => {
    const name = teamName.trim();
    if (!name || teamBusy) return;
    setTeamBusy(true);
    const ok = await runGuarded(() => addTeam(currentDept.id, name));
    setTeamBusy(false);
    if (ok) setTeamName('');
  };

  const handleDeleteDept = async () => {
    const ok = await runGuarded(() => deleteDepartment(currentDept.id));
    setConfirmDeptDelete(false);
    if (ok) {
      setActiveDepartmentId(null);
      setActiveView('DEPARTMENTS');
    }
  };

  const nameOf = (id?: string | null) =>
    id ? users.find((u) => u.id === id)?.name ?? 'Unassigned' : 'Unassigned';

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto select-none animate-fade-in">
      {/* Department Banner */}
      <div className="clean-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-sm shrink-0"
            style={{ backgroundColor: currentDept.color }}
          >
            {currentDept.code}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{currentDept.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-secondary font-mono text-muted-foreground">
                {deptProjects.length} Projects
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{currentDept.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {moderator && (
            <>
              <button
                onClick={() => {
                  setDeptEditId(currentDept.id);
                  setDeptModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium px-3.5 py-2 rounded-xl border border-border transition-all"
              >
                <Pencil size={14} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => setConfirmDeptDelete(true)}
                className="flex items-center gap-1.5 text-[#F04438] hover:bg-[#FEECEB] text-xs font-medium px-3.5 py-2 rounded-xl border border-[#FEECEB] transition-all"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </>
          )}
          <button
            onClick={() => setProjectModalOpen(true)}
            className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium px-3.5 py-2 rounded-xl border border-border transition-all"
          >
            <Plus size={15} />
            <span>Create Project</span>
          </button>
          <button
            onClick={() => setTaskModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {actionError && (
        <p className="text-xs text-[#F04438] bg-[#FEECEB] border border-[#FBD5D2] rounded-lg px-3 py-2">
          {actionError}
        </p>
      )}

      {/* Structural Work Areas Grid */}
      <div className="clean-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground">
            {currentDept.name} Work Areas &amp; Teams
          </h3>
          {moderator && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTeam();
                }}
                placeholder="New team name"
                className="w-40 bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleAddTeam}
                disabled={teamBusy || !teamName.trim()}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                <Plus size={13} /> Add Team
              </button>
            </div>
          )}
        </div>

        {currentDept.teams.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No teams yet.{moderator ? ' Add the first work area for this department.' : ''}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {currentDept.teams.map((team) => (
              <div
                key={team.id}
                className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 flex items-start justify-between gap-2 group"
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground block truncate">{team.name}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    Lead: {nameOf(team.leadId)}
                    {(team.memberIds?.length ?? 0) > 0 && ` · ${team.memberIds.length} member${team.memberIds.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                {moderator && (
                  <button
                    onClick={() => setConfirmTeamId(team.id)}
                    aria-label={`Remove team ${team.name}`}
                    className="p-1 rounded-md text-dim hover:text-[#F04438] hover:bg-[#FEECEB] transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real Data Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="clean-card p-4">
          <span className="text-[11px] font-semibold text-muted-foreground">Total Tasks</span>
          <div className="text-2xl font-bold text-foreground mt-0.5">{deptTasks.length}</div>
        </div>
        <div className="clean-card p-4">
          <span className="text-[11px] font-semibold text-muted-foreground">In Progress</span>
          <div className="text-2xl font-bold text-foreground mt-0.5">{inProgressTasks}</div>
        </div>
        <div className="clean-card p-4">
          <span className="text-[11px] font-semibold text-muted-foreground">Completed</span>
          <div className="text-2xl font-bold text-foreground mt-0.5">{completedTasks}</div>
        </div>
        <div className="clean-card p-4">
          <span className="text-[11px] font-semibold text-muted-foreground">Active Projects</span>
          <div className="text-2xl font-bold text-foreground mt-0.5">{deptProjects.length}</div>
        </div>
      </div>

      {/* Members */}
      <div className="clean-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users size={13} /> Members ({deptMembers.length})
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              People working in {currentDept.name}.
            </p>
          </div>
          {moderator && candidates.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={memberToAdd}
                onChange={(e) => setMemberToAdd(e.target.value)}
                className="bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[180px]"
              >
                <option value="">Add a member...</option>
                {candidates.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!memberToAdd}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                <UserPlus size={13} /> Add
              </button>
            </div>
          )}
        </div>

        {deptMembers.length === 0 ? (
          <div className="py-5 text-center space-y-2">
            <p className="text-sm text-muted-foreground">No members yet.</p>
            <button
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
            >
              <UserPlus size={14} /> Invite teammates
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {deptMembers.map((member) => {
              const viaDept = deptMemberIds.has(member.id);
              const teamOnly = !viaDept;
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
                >
                  <Avatar user={member} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{member.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium shrink-0">
                        {member.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-dim truncate">{member.title || member.email}</p>
                  </div>
                  {teamOnly && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0EEFF] text-[#5B4BFF] font-medium shrink-0">
                      via team
                    </span>
                  )}
                  {moderator && viaDept && (
                    <button
                      onClick={() => runGuarded(() => removeDepartmentMember(currentDept.id, member.id))}
                      aria-label={`Remove ${member.name} from department`}
                      className="p-1 rounded-md text-dim hover:text-[#F04438] hover:bg-[#FEECEB] transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Real analytics: status breakdown + workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status */}
        <div className="clean-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <PieIcon size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Task Status</h3>
              <p className="text-[11px] text-muted-foreground">Breakdown of {currentDept.name} tasks.</p>
            </div>
          </div>

          {statusRows.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                No task activity yet. Create your first task to start seeing task status analytics.
              </p>
              <button
                onClick={() => setTaskModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all"
              >
                + Create Task
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {statusRows.map(([status, count]) => {
                const meta = statusMeta(status);
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-1.5 py-0.5 rounded font-medium ${meta.chip}`}>{meta.label}</span>
                      <span className="font-semibold text-foreground">{count}</span>
                    </div>
                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${meta.bar}`}
                        style={{ width: `${(count / maxStatus) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Team Workload */}
        <div className="clean-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Team Workload</h3>
              <p className="text-[11px] text-muted-foreground">Open tasks per member right now.</p>
            </div>
          </div>

          {!hasWorkload ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {deptMembers.length === 0
                  ? 'No workload data yet. Add members and assign tasks to begin tracking workload.'
                  : 'No tasks are assigned yet. Assign tasks to members to see their workload.'}
              </p>
              <button
                onClick={() => setInviteOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-xs font-medium hover:bg-secondary/80 transition-all"
              >
                + Invite Team
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {workload.map(({ user, open, total }) => (
                <div key={user.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground truncate pr-2">{user.name}</span>
                    <span className="text-dim shrink-0">
                      {open} open · {total} total
                    </span>
                  </div>
                  <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#5B4BFF] transition-all duration-500"
                      style={{ width: `${(open / maxOpen) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">
            {currentDept.name} Projects
          </h2>
          <button
            onClick={() => setProjectModalOpen(true)}
            className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
          >
            <Plus size={14} /> New Project
          </button>
        </div>

        {deptProjects.length === 0 ? (
          <div className="clean-card p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Folder size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">No projects in {currentDept.name} yet</h4>
              <p className="text-xs text-muted-foreground">Create a project to organize tasks, deadlines and team work.</p>
            </div>
            <button
              onClick={() => setProjectModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-all"
            >
              + Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deptProjects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => {
                  setActiveProjectId(proj.id);
                  setActiveView('LIST');
                }}
                className="clean-card p-5 hover:border-indigo-300 transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder size={18} style={{ color: proj.color }} />
                    <span className="font-bold text-sm text-foreground truncate">{proj.name}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{proj.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeptDelete}
        title="Delete department?"
        message={
          <>
            <span>
              <strong>{currentDept.name}</strong> and its teams will be removed. Tasks in this
              department will be unassigned from it. This cannot be undone.
            </span>
          </>
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteDept}
        onCancel={() => setConfirmDeptDelete(false)}
      />

      <ConfirmDialog
        open={Boolean(confirmTeamId)}
        title="Remove team?"
        message="This work area will be removed from the department."
        confirmLabel="Remove"
        onConfirm={async () => {
          const teamId = confirmTeamId;
          setConfirmTeamId(null);
          if (teamId) await runGuarded(() => removeTeam(currentDept.id, teamId));
        }}
        onCancel={() => setConfirmTeamId(null)}
      />
    </div>
  );
};
