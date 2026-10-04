import React from 'react';
import {
  Circle,
  ArrowRightCircle,
  Eye,
  CheckCircle2,
  UserPlus,
  Flag,
  Calendar,
  Folder,
  Building2,
  Tag,
  ListChecks,
  MessageSquare,
  Paperclip,
  Trash2,
  Link2,
  Archive,
  RotateCcw,
  Plus,
  Pencil,
  GitBranch,
} from 'lucide-react';
import type { User } from '../../types';

/* ---------------------------- labels & colors ---------------------------- */

export const STATUS_LABELS: Record<string, string> = {
  TO_DO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
};

export const STATUS_COLORS: Record<string, string> = {
  TO_DO: 'bg-slate-500/10 text-slate-500 border-slate-500/30',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  IN_REVIEW: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  APPROVED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  BLOCKED: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  COMPLETED: 'bg-emerald-600/10 text-emerald-700 border-emerald-600/30',
};

export const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  NONE: 'None',
};

export const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'text-rose-600 bg-rose-500/10',
  HIGH: 'text-amber-600 bg-amber-500/10',
  MEDIUM: 'text-yellow-600 bg-yellow-500/10',
  LOW: 'text-blue-600 bg-blue-500/10',
  NONE: 'text-muted-foreground bg-secondary',
};

/* ------------------------------- formatting ------------------------------ */

export function timeAgo(dateInput?: string | null): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  return formatDate(dateInput);
}

export function formatDate(dateInput?: string | null): string {
  if (!dateInput) return 'Not set';
  const date = new Date(dateInput.length === 10 ? `${dateInput}T00:00:00` : dateInput);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export function fileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toUpperCase() : '';
}

export function isImageType(type: string): boolean {
  return type.startsWith('image/');
}

export function isPdfType(type: string): boolean {
  return type === 'application/pdf';
}

/* --------------------------- mention parsing ----------------------------- */

/** Extract user ids mentioned as @Full Name (or @first-name) in content. */
export function extractMentions(content: string, users: User[]): string[] {
  const found = new Set<string>();
  const sorted = [...users].sort((a, b) => b.name.length - a.name.length);
  for (const user of sorted) {
    const escaped = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const first = user.name.split(' ')[0];
    const firstEscaped = first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`@(${escaped}|${firstEscaped})(?![\\w-])`, 'i');
    if (pattern.test(content)) found.add(user.id);
  }
  return Array.from(found);
}

/* ---------------------------- rich text render --------------------------- */

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|@[A-Za-z][\w .-]*)/g;

function renderInline(text: string, users: User[], keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const parts = text.split(INLINE_PATTERN).filter((p) => p !== undefined && p !== '');

  parts.forEach((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(<strong key={key} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>);
      return;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      nodes.push(<em key={key} className="italic">{part.slice(1, -1)}</em>);
      return;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      nodes.push(
        <code key={key} className="px-1 py-0.5 rounded bg-secondary text-[11px] font-mono">{part.slice(1, -1)}</code>
      );
      return;
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      nodes.push(
        <a
          key={key}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline break-all"
        >
          {linkMatch[1]}
        </a>
      );
      return;
    }
    if (part.startsWith('@')) {
      const name = part.slice(1).trim();
      const match = users.find(
        (u) => u.name.toLowerCase() === name.toLowerCase() || u.name.split(' ')[0].toLowerCase() === name.toLowerCase()
      );
      if (match) {
        nodes.push(
          <span key={key} className="px-1 py-0.5 rounded bg-primary/15 text-primary font-semibold">
            @{match.name}
          </span>
        );
        return;
      }
    }
    nodes.push(<span key={key}>{part}</span>);
  });

  return nodes;
}

/** Render task update / description markdown-lite into safe React nodes. */
export function renderRichText(content: string, users: User[] = []): React.ReactNode {
  if (!content) return null;
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: { type: 'ul' | 'ol' | 'check'; text: string; checked?: boolean }[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    const items = listItems;
    listItems = [];
    const type = items[0].type;
    if (type === 'check') {
      blocks.push(
        <ul key={key++} className="space-y-1 my-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                item.checked ? 'bg-primary border-primary text-white' : 'border-border'
              }`}>
                {item.checked && (
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2 6l3 3 5-6" />
                  </svg>
                )}
              </span>
              <span className={item.checked ? 'line-through text-muted-foreground' : ''}>{renderInline(item.text, users, `c${key}-${i}`)}</span>
            </li>
          ))}
        </ul>
      );
    } else if (type === 'ol') {
      blocks.push(
        <ol key={key++} className="list-decimal list-inside space-y-1 my-1.5 marker:text-muted-foreground">
          {items.map((item, i) => (
            <li key={i}>{renderInline(item.text, users, `o${key}-${i}`)}</li>
          ))}
        </ol>
      );
    } else {
      blocks.push(
        <ul key={key++} className="list-disc list-inside space-y-1 my-1.5 marker:text-muted-foreground">
          {items.map((item, i) => (
            <li key={i}>{renderInline(item.text, users, `u${key}-${i}`)}</li>
          ))}
        </ul>
      );
    }
  };

  lines.forEach((line) => {
    const check = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (check) {
      listItems.push({ type: 'check', text: check[2], checked: check[1].toLowerCase() === 'x' });
      return;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      listItems.push({ type: 'ul', text: bullet[1] });
      return;
    }
    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ordered) {
      listItems.push({ type: 'ol', text: ordered[1] });
      return;
    }

    flushList();

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const cls = level === 1 ? 'text-base' : level === 2 ? 'text-sm' : 'text-xs';
      blocks.push(
        <p key={key++} className={`${cls} font-bold text-foreground my-1`}>
          {renderInline(heading[2], users, `h${key}`)}
        </p>
      );
      return;
    }
    if (line.trim() === '') {
      blocks.push(<div key={key++} className="h-2" />);
      return;
    }
    blocks.push(
      <p key={key++} className="my-0.5 leading-relaxed">
        {renderInline(line, users, `p${key}`)}
      </p>
    );
  });

  flushList();
  return <div className="text-xs text-foreground whitespace-pre-wrap break-words">{blocks}</div>;
}

/* ------------------------------ activity log ----------------------------- */

interface ActivityData {
  field?: string;
  old_status?: string;
  new_status?: string;
  old_status_label?: string;
  new_status_label?: string;
  old_priority?: string;
  new_priority?: string;
  old_priority_label?: string;
  new_priority_label?: string;
  new_due_date?: string | null;
  new_start_date?: string | null;
  new_project_name?: string;
  new_department_name?: string;
  tag?: string;
  title?: string;
  file_name?: string;
  depends_on_title?: string;
  archived?: boolean;
  new_title?: string;
  [key: string]: unknown;
}

const statusLabel = (value?: string) => (value ? STATUS_LABELS[value] || value : undefined);

const ACTIVITY_META: Record<
  string,
  { label: (d?: ActivityData, name?: string) => string; icon: typeof Circle; color: string }
> = {
  TASK_CREATED: { label: () => 'Created this task', icon: Plus, color: 'text-emerald-600 bg-emerald-500/10' },
  TASK_UPDATED: {
    label: (d) => {
      if (d?.field === 'title') return `Renamed the task to "${d.new_title}"`;
      if (d?.field === 'description') return 'Updated the description';
      if (d?.field === 'archived') return d.archived ? 'Archived this task' : 'Restored this task';
      if (d?.field === 'subtask_removed') return `Removed subtask "${d.title || ''}"`.trim();
      if (d?.field === 'subtask_reopened') return `Reopened subtask "${d.title || ''}"`.trim();
      if (d?.field === 'parent') return 'Changed the parent task';
      return 'Updated this task';
    },
    icon: Pencil,
    color: 'text-slate-500 bg-slate-500/10',
  },
  TASK_ASSIGNED: { label: () => 'Updated assignees', icon: UserPlus, color: 'text-indigo-600 bg-indigo-500/10' },
  TASK_REASSIGNED: { label: (): string => 'Removed an assignee', icon: UserPlus, color: 'text-indigo-600 bg-indigo-500/10' },
  STATUS_CHANGED: { label: (d) => `Changed status from "${d?.old_status_label || statusLabel(d?.old_status) || d?.old_status || ''}" to "${d?.new_status_label || statusLabel(d?.new_status) || d?.new_status || ''}"`, icon: ArrowRightCircle, color: 'text-blue-600 bg-blue-500/10' },
  PRIORITY_CHANGED: { label: (d) => `Changed priority from "${d?.old_priority_label || d?.old_priority}" to "${d?.new_priority_label || d?.new_priority}"`, icon: Flag, color: 'text-amber-600 bg-amber-500/10' },
  DUE_DATE_CHANGED: { label: (d) => d?.new_due_date ? `Changed due date to ${formatDate(d.new_due_date)}` : 'Removed the due date', icon: Calendar, color: 'text-rose-600 bg-rose-500/10' },
  START_DATE_CHANGED: { label: (d) => d?.new_start_date ? `Changed start date to ${formatDate(d.new_start_date)}` : 'Removed the start date', icon: Calendar, color: 'text-rose-600 bg-rose-500/10' },
  PROJECT_CHANGED: { label: (d) => `Moved to project "${d?.new_project_name || 'Unknown'}"`, icon: Folder, color: 'text-sky-600 bg-sky-500/10' },
  DEPARTMENT_CHANGED: { label: (d) => `Moved to department "${d?.new_department_name || 'Unknown'}"`, icon: Building2, color: 'text-violet-600 bg-violet-500/10' },
  TAG_ADDED: { label: (d) => `Added tag "${d?.tag}"`, icon: Tag, color: 'text-teal-600 bg-teal-500/10' },
  TAG_REMOVED: { label: (d) => `Removed tag "${d?.tag}"`, icon: Tag, color: 'text-teal-600 bg-teal-500/10' },
  SUBTASK_CREATED: { label: (d) => `Added subtask "${d?.title}"`, icon: ListChecks, color: 'text-indigo-600 bg-indigo-500/10' },
  SUBTASK_COMPLETED: { label: (d) => `Completed subtask "${d?.title}"`, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10' },
  COMMENT_ADDED: { label: () => 'Added an update', icon: MessageSquare, color: 'text-primary bg-primary/10' },
  COMMENT_EDITED: { label: () => 'Edited an update', icon: Pencil, color: 'text-slate-500 bg-slate-500/10' },
  COMMENT_DELETED: { label: () => 'Deleted an update', icon: Trash2, color: 'text-rose-600 bg-rose-500/10' },
  FILE_UPLOADED: { label: (d) => `Uploaded "${d?.file_name || 'a file'}"`, icon: Paperclip, color: 'text-sky-600 bg-sky-500/10' },
  FILE_DELETED: { label: (d) => `Deleted "${d?.file_name || 'a file'}"`, icon: Trash2, color: 'text-rose-600 bg-rose-500/10' },
  DEPENDENCY_ADDED: { label: (d) => d?.depends_on_title ? `Blocked by "${d.depends_on_title}"` : 'Added a dependency', icon: GitBranch, color: 'text-amber-600 bg-amber-500/10' },
  DEPENDENCY_REMOVED: { label: () => 'Removed a dependency', icon: GitBranch, color: 'text-amber-600 bg-amber-500/10' },
  TASK_COMPLETED: { label: () => 'Completed this task', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10' },
  TASK_REOPENED: { label: () => 'Reopened this task', icon: RotateCcw, color: 'text-amber-600 bg-amber-500/10' },
};

export function getActivityMeta(actionType: string) {
  return (
    ACTIVITY_META[actionType] || {
      label: () => actionType.replace(/_/g, ' ').toLowerCase(),
      icon: Circle,
      color: 'text-muted-foreground bg-secondary',
    }
  );
}

export { Archive, Link2, Eye };
