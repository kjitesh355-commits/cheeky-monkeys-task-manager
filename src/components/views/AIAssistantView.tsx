'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Bot, Send, Sparkles, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { Task, Department } from '../../types';

const WEEK_AHEAD = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

type Intent =
  | { kind: 'overdue' }
  | { kind: 'due-today' }
  | { kind: 'due-week' }
  | { kind: 'in-progress' }
  | { kind: 'workload' }
  | { kind: 'dept-summary'; query: string }
  | { kind: 'create-task'; title: string; deptQuery?: string }
  | { kind: 'assign'; taskQuery: string; userQuery: string }
  | { kind: 'move'; taskQuery: string; deptQuery: string }
  | { kind: 'help' }
  | { kind: 'unknown' };

type Answer =
  | { kind: 'tasks'; title: string; taskIds: string[] }
  | { kind: 'workload'; rows: { name: string; count: number }[] }
  | { kind: 'dept-summary'; deptId: string; lines: string[] }
  | { kind: 'confirm'; intent: Intent; summary: string }
  | { kind: 'text'; body: string }
  | { kind: 'done'; body: string };

interface Turn {
  id: string;
  question: string;
  answer: Answer;
}

const SUGGESTIONS = [
  'Show me my overdue tasks',
  "What's due today?",
  'What is everyone working on?',
];

function detectIntent(raw: string): Intent {
  const q = raw.trim().toLowerCase();
  if (!q) return { kind: 'help' };

  const create = raw.match(/^\s*(?:create|add|make)\s+(?:a\s+)?task(?:\s+(?:called|named|titled))?\s+(.+?)(?:\s+in\s+(?:the\s+)?(.+?))?\s*$/i);
  if (create) return { kind: 'create-task', title: create[1].trim(), deptQuery: create[2]?.trim() };

  const assign = raw.match(/^\s*assign\s+(.+?)\s+to\s+(.+?)\s*$/i);
  if (assign) return { kind: 'assign', taskQuery: assign[1].trim(), userQuery: assign[2].trim() };

  const move = raw.match(/^\s*move\s+(.+?)\s+to\s+(?:the\s+)?(.+?)(?:\s+department)?\s*$/i);
  if (move) return { kind: 'move', taskQuery: move[1].trim(), deptQuery: move[2].trim() };

  const summary = raw.match(/^\s*summar(?:y|ize|ise)\s+(?:of\s+|for\s+)?(?:the\s+)?(.+?)(?:\s+department)?\s*$/i);
  if (summary) return { kind: 'dept-summary', query: summary[1].trim() };

  if (/(overdue|past due|late)/.test(q)) return { kind: 'overdue' };
  if (/(due\s*today|today)/.test(q)) return { kind: 'due-today' };
  if (/(this\s*week|next\s*7\s*days|coming\s*up)/.test(q)) return { kind: 'due-week' };
  if (/(everyone|who).*(working|work\s+on)|(workload|currently\s+in\s+progress)/.test(q)) return { kind: 'workload' };
  if (/(in\s*progress|working\s*on)/.test(q)) return { kind: 'in-progress' };
  if (/(help|what can you do|commands)/.test(q)) return { kind: 'help' };
  return { kind: 'unknown' };
}

export const AIAssistantView: React.FC = () => {
  const {
    tasks,
    users,
    departments,
    currentUser,
    addTask,
    updateTask,
    setSelectedTaskId,
  } = useWorkspace();

  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const turnSeqRef = useRef(0);

  const today = new Date().toISOString().slice(0, 10);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const findTask = (query: string): Task | undefined => {
    const q = query.toLowerCase().replace(/^["']|["']$/g, '');
    return (
      tasks.find((t) => t.title.toLowerCase() === q) ||
      tasks.find((t) => t.title.toLowerCase().includes(q)) ||
      undefined
    );
  };

  const findUser = (query: string) => {
    const q = query.toLowerCase();
    return users.find((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  };

  const findDept = (query: string): Department | undefined => {
    const q = query.toLowerCase();
    return departments.find((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase() === q);
  };

  const evaluate = (intent: Intent): Answer => {
    switch (intent.kind) {
      case 'overdue': {
        const list = tasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'COMPLETED');
        const mine = list.filter((t) => t.assigneeIds.includes(currentUser.id));
        const ids = (mine.length > 0 ? mine : list).map((t) => t.id);
        return {
          kind: 'tasks',
          title: mine.length > 0 ? 'Your overdue tasks' : 'Overdue tasks',
          taskIds: ids,
        };
      }
      case 'due-today': {
        const list = tasks.filter((t) => t.dueDate === today && t.status !== 'COMPLETED');
        return { kind: 'tasks', title: 'Due today', taskIds: list.map((t) => t.id) };
      }
      case 'due-week': {
        const list = tasks.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= WEEK_AHEAD && t.status !== 'COMPLETED');
        return { kind: 'tasks', title: 'Due in the next 7 days', taskIds: list.map((t) => t.id) };
      }
      case 'in-progress': {
        const list = tasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW');
        return { kind: 'tasks', title: 'Currently in progress', taskIds: list.map((t) => t.id) };
      }
      case 'workload': {
        const active = tasks.filter((t) => t.status !== 'COMPLETED');
        const rows = users
          .map((u) => ({ name: u.name, count: active.filter((t) => t.assigneeIds.includes(u.id)).length }))
          .filter((r) => r.count > 0)
          .sort((a, b) => b.count - a.count);
        return { kind: 'workload', rows };
      }
      case 'dept-summary': {
        const dept = findDept(intent.query);
        if (!dept) return { kind: 'text', body: `I couldn't find a department matching "${intent.query}".` };
        const deptTasks = tasks.filter((t) => t.departmentId === dept.id);
        const completed = deptTasks.filter((t) => t.status === 'COMPLETED').length;
        const overdue = deptTasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'COMPLETED').length;
        const activeProjects = new Set(
          deptTasks.filter((t) => t.status !== 'COMPLETED').map((t) => t.projectId)
        ).size;
        const lines = [
          `${deptTasks.length} tasks (${completed} completed, ${deptTasks.length - completed} open)`,
          `${activeProjects} projects with open work`,
          overdue > 0 ? `${overdue} overdue tasks` : 'No overdue tasks',
        ];
        return { kind: 'dept-summary', deptId: dept.id, lines };
      }
      case 'create-task': {
        const dept = intent.deptQuery ? findDept(intent.deptQuery) : departments[0];
        const summary = `Create task "${intent.title}"${dept ? ` in ${dept.name}` : ''}`;
        return { kind: 'confirm', intent, summary };
      }
      case 'assign': {
        const task = findTask(intent.taskQuery);
        const user = findUser(intent.userQuery);
        if (!task) return { kind: 'text', body: `I couldn't find a task matching "${intent.taskQuery}".` };
        if (!user) return { kind: 'text', body: `I couldn't find a team member matching "${intent.userQuery}".` };
        return {
          kind: 'confirm',
          intent,
          summary: `Assign "${task.title}" to ${user.name}`,
        };
      }
      case 'move': {
        const task = findTask(intent.taskQuery);
        const dept = findDept(intent.deptQuery);
        if (!task) return { kind: 'text', body: `I couldn't find a task matching "${intent.taskQuery}".` };
        if (!dept) return { kind: 'text', body: `I couldn't find a department matching "${intent.deptQuery}".` };
        return { kind: 'confirm', intent, summary: `Move "${task.title}" to ${dept.name}` };
      }
      case 'help':
        return {
          kind: 'text',
          body: 'I can answer questions about your workspace and perform actions with your confirmation. Try: "Show me my overdue tasks", "What\u2019s due today?", "What is everyone working on?", "Summarize the Marketing department", "Create a task called September Campaign", "Assign Website Redesign to Alex", or "Move Website Redesign to the Design department".',
        };
      default:
        return {
          kind: 'text',
          body: 'I didn\u2019t understand that. Try asking about overdue tasks, today\u2019s deadlines, team workload, or a department summary.',
        };
    }
  };

  const execute = async (intent: Intent): Promise<string> => {
    switch (intent.kind) {
      case 'create-task': {
        const dept = intent.deptQuery ? findDept(intent.deptQuery) : departments[0];
        const created = await addTask({ title: intent.title, ...(dept ? { departmentId: dept.id } : {}) });
        return `Task "${created?.title ?? intent.title}" created.`;
      }
      case 'assign': {
        const task = findTask(intent.taskQuery);
        const user = findUser(intent.userQuery);
        if (!task || !user) return 'The task or team member no longer exists.';
        const assigneeIds = task.assigneeIds.includes(user.id)
          ? task.assigneeIds
          : [...task.assigneeIds, user.id];
        await updateTask(task.id, { assigneeIds });
        return `Assigned "${task.title}" to ${user.name}.`;
      }
      case 'move': {
        const task = findTask(intent.taskQuery);
        const dept = findDept(intent.deptQuery);
        if (!task || !dept) return 'The task or department no longer exists.';
        await updateTask(task.id, { departmentId: dept.id });
        return `Moved "${task.title}" to ${dept.name}.`;
      }
      default:
        return 'Nothing to perform.';
    }
  };

  const ask = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const intent = detectIntent(trimmed);
    const answer = evaluate(intent);
    turnSeqRef.current += 1;
    const turn: Turn = { id: `turn-${turnSeqRef.current}`, question: trimmed, answer };
    setTurns((prev) => [...prev, turn]);
    setInput('');
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  const resolveConfirm = async (turnId: string, intent: Intent, accept: boolean) => {
    if (!accept) {
      setTurns((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, answer: { kind: 'text', body: 'Cancelled \u2014 no changes made.' } } : t))
      );
      return;
    }
    setTurns((prev) =>
      prev.map((t) => (t.id === turnId ? { ...t, answer: { kind: 'text', body: 'Working on it\u2026' } } : t))
    );
    try {
      const body = await execute(intent);
      toast.success(body);
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, answer: { kind: 'done', body } } : t)));
    } catch {
      toast.error('Action failed');
      setTurns((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, answer: { kind: 'text', body: 'The action failed. Please try again.' } } : t))
      );
    }
  };

  const renderTaskRows = (ids: string[]) => {
    const list = ids.map((id) => taskById.get(id)).filter(Boolean) as Task[];
    if (list.length === 0) {
      return <p className="text-sm text-muted-foreground">Nothing to show — you’re all caught up.</p>;
    }
    return (
      <div className="space-y-1.5">
        {list.map((task) => {
          const dept = departments.find((d) => d.id === task.departmentId);
          const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'COMPLETED';
          return (
            <button
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition-colors text-left"
            >
              <ChevronRight size={13} className="text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground truncate flex-1">{task.title}</span>
              {dept && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                  {dept.name}
                </span>
              )}
              {task.dueDate && (
                <span className={`text-xs shrink-0 ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                  {task.dueDate}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderAnswer = (turn: Turn) => {
    const answer = turn.answer;
    switch (answer.kind) {
      case 'tasks':
        return (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{answer.title}</p>
            {renderTaskRows(answer.taskIds)}
          </div>
        );
      case 'workload':
        if (answer.rows.length === 0) return <p className="text-sm text-muted-foreground">No active tasks assigned yet.</p>;
        return (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Who is working on what</p>
            {answer.rows.map((row) => (
              <div key={row.name} className="flex items-center gap-3 text-sm">
                <span className="text-foreground w-40 truncate">{row.name}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, (row.count / answer.rows[0].count) * 100)}%` }}
                  />
                </div>
                <span className="text-muted-foreground text-xs w-16 text-right">{row.count} open</span>
              </div>
            ))}
          </div>
        );
      case 'dept-summary':
        return (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {departments.find((d) => d.id === answer.deptId)?.name} summary
            </p>
            <ul className="space-y-1">
              {answer.lines.map((line) => (
                <li key={line} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        );
      case 'confirm':
        return (
          <div className="rounded-xl border border-primary/30 bg-accent/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
              <Sparkles size={14} />
              Confirm action
            </div>
            <p className="text-sm text-foreground">{answer.summary}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => resolveConfirm(turn.id, answer.intent, true)}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <CheckCircle2 size={13} />
                Confirm
              </button>
              <button
                onClick={() => resolveConfirm(turn.id, answer.intent, false)}
                className="flex items-center gap-1.5 bg-card hover:bg-secondary text-foreground text-xs font-medium px-3 py-1.5 rounded-lg border border-border transition-colors"
              >
                <XCircle size={13} />
                Cancel
              </button>
            </div>
          </div>
        );
      case 'done':
        return (
          <p className="text-sm text-success font-medium flex items-center gap-2">
            <CheckCircle2 size={14} />
            {answer.body}
          </p>
        );
      default:
        return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{answer.body}</p>;
    }
  };

  return (
    <div className="h-full flex flex-col max-w-[900px] mx-auto w-full">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Bot size={20} className="text-primary" />
          AI Workspace Assistant
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask anything about your workspace. Actions always require your confirmation.
        </p>
      </div>

      {/* Conversation */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-6 space-y-5">
        {turns.length === 0 && (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
              <Sparkles size={20} className="text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">How can I help?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              I answer from your real workspace data — no guessing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
              {[...SUGGESTIONS, 'Summarize the Marketing department'].map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn) => (
          <div key={turn.id} className="space-y-3">
            <div className="flex justify-end">
              <div className="bg-primary text-white text-sm px-4 py-2 rounded-xl rounded-br-sm max-w-[75%]">
                {turn.question}
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="clean-card rounded-xl p-4 max-w-[85%] flex-1">{renderAnswer(turn)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="p-4 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Try "Show me my overdue tasks" or "Create a task called September Campaign"'
            className="flex-1 text-sm px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Send size={14} />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
