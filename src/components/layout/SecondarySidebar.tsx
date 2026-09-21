'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Hash,
  Megaphone,
  TrendingUp,
  Cpu,
  Users,
  Building2,
  CheckCircle2,
  FolderPlus,
  Folder,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const SecondarySidebar: React.FC = () => {
  const {
    departments,
    projects,
    channels,
    activeDepartmentId,
    setActiveDepartmentId,
    activeProjectId,
    setActiveProjectId,
    activeView,
    setActiveView,
    setDeptModalOpen,
    setChannelModalOpen,
    setFilterStatus,
  } = useWorkspace();

  const [searchTree, setSearchTree] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    HOME: true,
    DEPARTMENTS: true,
    CHANNELS: true,
    DIRECT: true,
  });

  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({
    'dept-marketing': true,
    'dept-sales': false,
    'dept-ops': false,
    'dept-hr': false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleDept = (deptId: string) => {
    setExpandedDepts((prev) => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const getDeptIcon = (iconName: string) => {
    switch (iconName) {
      case 'Megaphone':
        return Megaphone;
      case 'TrendingUp':
        return TrendingUp;
      case 'Cpu':
        return Cpu;
      case 'Users':
        return Users;
      default:
        return Building2;
    }
  };

  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(searchTree.toLowerCase())
  );

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen select-none shrink-0 hidden md:flex">
      {/* Header Search Tree */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search departments..."
            value={searchTree}
            onChange={(e) => setSearchTree(e.target.value)}
            className="w-full bg-secondary text-foreground text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary border border-border placeholder:text-muted-foreground transition-all"
          />
        </div>
      </div>

      {/* Hierarchical Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* SECTION 1: WORKSPACE HOME */}
        <div>
          <button
            onClick={() => toggleSection('HOME')}
            className="w-full flex items-center justify-between text-[11px] font-bold text-muted-foreground hover:text-foreground tracking-wider uppercase px-2 py-1 transition-colors"
          >
            <span>Workspace Home</span>
            {expandedSections.HOME ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {expandedSections.HOME && (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => {
                  setActiveDepartmentId(null);
                  setActiveProjectId(null);
                  setActiveView('DASHBOARD');
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeDepartmentId === null && activeProjectId === null && activeView === 'DASHBOARD'
                    ? 'bg-secondary text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <Building2 size={15} className="text-primary" />
                <span>Company Overview</span>
              </button>

              <button
                onClick={() => {
                  setActiveDepartmentId(null);
                  setActiveProjectId(null);
                  setFilterStatus('ALL');
                  setActiveView('LIST');
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeView === 'LIST' && activeDepartmentId === null
                    ? 'bg-secondary text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <CheckCircle2 size={15} className="text-emerald-500" />
                <span>My Assigned Tasks</span>
              </button>
            </div>
          )}
        </div>

        {/* SECTION 2: DEPARTMENTS */}
        <div>
          <div className="flex items-center justify-between px-2 py-1">
            <button
              onClick={() => toggleSection('DEPARTMENTS')}
              className="text-[11px] font-bold text-muted-foreground hover:text-foreground tracking-wider uppercase flex items-center gap-1 transition-colors"
            >
              <span>Departments</span>
              {expandedSections.DEPARTMENTS ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>

            <button
              onClick={() => setDeptModalOpen(true)}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
              title="Add Department"
            >
              <Plus size={14} />
            </button>
          </div>

          {expandedSections.DEPARTMENTS && (
            <div className="mt-1 space-y-1">
              {filteredDepts.map((dept) => {
                const DeptIcon = getDeptIcon(dept.icon);
                const isDeptActive = activeDepartmentId === dept.id;
                const isExpanded = expandedDepts[dept.id];
                const deptProjects = projects.filter((p) => p.departmentId === dept.id);

                return (
                  <div key={dept.id} className="space-y-0.5">
                    <div
                      className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isDeptActive && activeProjectId === null
                          ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setActiveDepartmentId(dept.id);
                          setActiveProjectId(null);
                          setActiveView('DASHBOARD');
                        }}
                        className="flex items-center gap-2 flex-1 truncate text-left"
                      >
                        <DeptIcon size={15} style={{ color: dept.color }} />
                        <span className="truncate">{dept.name}</span>
                      </button>

                      <button
                        onClick={() => toggleDept(dept.id)}
                        className="p-0.5 hover:text-foreground text-muted-foreground"
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    </div>

                    {/* Structural Sub-Teams & Projects */}
                    {isExpanded && (
                      <div className="ml-4 pl-2 border-l border-border space-y-0.5">
                        {dept.teams.map((team) => (
                          <div
                            key={team.id}
                            className="px-2 py-1 text-[11px] text-muted-foreground flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-border" />
                            <span className="truncate">{team.name}</span>
                          </div>
                        ))}

                        {deptProjects.map((proj) => (
                          <button
                            key={proj.id}
                            onClick={() => {
                              setActiveDepartmentId(dept.id);
                              setActiveProjectId(proj.id);
                              setActiveView('LIST');
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            <Folder size={13} style={{ color: proj.color }} />
                            <span className="truncate">{proj.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => setDeptModalOpen(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-primary font-medium hover:bg-primary/10 rounded-lg transition-colors mt-1"
              >
                <FolderPlus size={14} />
                <span>+ Add Department</span>
              </button>
            </div>
          )}
        </div>

        {/* SECTION 3: CHANNELS */}
        <div>
          <button
            onClick={() => toggleSection('CHANNELS')}
            className="w-full flex items-center justify-between text-[11px] font-bold text-muted-foreground hover:text-foreground tracking-wider uppercase px-2 py-1 transition-colors"
          >
            <span>Channels</span>
            {expandedSections.CHANNELS ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {expandedSections.CHANNELS && (
            <div className="mt-1 space-y-1">
              {channels.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground italic">No channels yet.</div>
              ) : (
                channels.map((chan) => (
                  <button
                    key={chan.id}
                    onClick={() => setActiveView('CHAT')}
                    className="w-full flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    <Hash size={14} />
                    <span>{chan.name}</span>
                  </button>
                ))
              )}

              <button
                onClick={() => setChannelModalOpen(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground font-medium hover:bg-secondary rounded-lg transition-colors"
              >
                <Plus size={14} />
                <span>+ Create Channel</span>
              </button>
            </div>
          )}
        </div>

        {/* SECTION 4: DIRECT MESSAGES */}
        <div>
          <button
            onClick={() => toggleSection('DIRECT')}
            className="w-full flex items-center justify-between text-[11px] font-bold text-muted-foreground hover:text-foreground tracking-wider uppercase px-2 py-1 transition-colors"
          >
            <span>Direct Messages</span>
            {expandedSections.DIRECT ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {expandedSections.DIRECT && (
            <div className="mt-1 space-y-1">
              <div className="px-2 py-1.5 text-xs text-muted-foreground italic">No conversations yet.</div>
              <button
                onClick={() => setActiveView('CHAT')}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground font-medium hover:bg-secondary rounded-lg transition-colors"
              >
                <Plus size={14} />
                <span>+ New Message</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
