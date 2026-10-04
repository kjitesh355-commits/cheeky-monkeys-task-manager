import React, { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Heading,
  Italic,
  Link,
  List,
  ListOrdered,
  ListChecks,
  Eye,
  Pencil,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task } from '../../types';
import { renderRichText } from './utils';

interface ToolbarAction {
  icon: typeof Bold;
  label: string;
  apply: (value: string, start: number, end: number) => { text: string; cursor: number };
}

const ACTIONS: ToolbarAction[] = [
  {
    icon: Heading,
    label: 'Heading',
    apply: (v, s, e) => {
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const needsPrefix = !v.slice(lineStart, e).startsWith('## ');
      const line = v.slice(lineStart, e);
      const text = needsPrefix ? `${v.slice(0, lineStart)}## ${line}${v.slice(e)}` : `${v.slice(0, lineStart)}${line.replace(/^## /, '')}${v.slice(e)}`;
      return { text, cursor: lineStart + (needsPrefix ? 3 : 0) + line.length };
    },
  },
  {
    icon: Bold,
    label: 'Bold',
    apply: (v, s, e) => {
      const selected = v.slice(s, e) || 'bold text';
      const text = `${v.slice(0, s)}**${selected}**${v.slice(e)}`;
      return { text, cursor: s + 2 + selected.length + 2 };
    },
  },
  {
    icon: Italic,
    label: 'Italic',
    apply: (v, s, e) => {
      const selected = v.slice(s, e) || 'italic text';
      const text = `${v.slice(0, s)}*${selected}*${v.slice(e)}`;
      return { text, cursor: s + 1 + selected.length + 1 };
    },
  },
  {
    icon: List,
    label: 'Bullet list',
    apply: (v, s, e) => {
      const selected = v.slice(s, e) || 'list item';
      const text = `${v.slice(0, s)}- ${selected}${v.slice(e)}`;
      return { text, cursor: s + 2 + selected.length };
    },
  },
  {
    icon: ListOrdered,
    label: 'Numbered list',
    apply: (v, s, e) => {
      const selected = v.slice(s, e) || 'list item';
      const text = `${v.slice(0, s)}1. ${selected}${v.slice(e)}`;
      return { text, cursor: s + 3 + selected.length };
    },
  },
  {
    icon: ListChecks,
    label: 'Checklist',
    apply: (v, s, e) => {
      const selected = v.slice(s, e) || 'task';
      const text = `${v.slice(0, s)}- [ ] ${selected}${v.slice(e)}`;
      return { text, cursor: s + 6 + selected.length };
    },
  },
  {
    icon: Link,
    label: 'Link',
    apply: (v, s, e) => {
      const selected = v.slice(s, e) || 'link text';
      const text = `${v.slice(0, s)}[${selected}](https://)${v.slice(e)}`;
      return { text, cursor: s + selected.length + 3 + 8 };
    },
  },
];

export const TaskDescriptionEditor: React.FC<{ task: Task }> = ({ task }) => {
  const { updateTask, users } = useWorkspace();
  const [draft, setDraft] = useState(() => task.description || '');
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const persist = (value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaved(false);
    timerRef.current = setTimeout(async () => {
      await updateTask(task.id, { description: value });
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(true), 1500);
    }, 700);
  };

  const handleChange = (value: string) => {
    setDraft(value);
    persist(value);
  };

  const applyAction = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? draft.length;
    const end = textarea.selectionEnd ?? draft.length;
    const result = action.apply(draft, start, end);
    setDraft(result.text);
    persist(result.text);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = result.cursor;
      textarea.selectionEnd = result.cursor;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Description</span>
        <div className="flex items-center gap-1">
          <span className={`text-[10px] transition-opacity ${saved ? 'text-emerald-600' : 'text-amber-600'}`}>
            {saved ? 'Saved' : 'Saving…'}
          </span>
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={preview ? 'Edit' : 'Preview'}
          >
            {preview ? <Pencil size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>

      {!preview && (
        <div className="flex items-center gap-0.5 p-1 bg-secondary/50 border border-border rounded-lg w-fit">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => applyAction(action)}
                title={action.label}
                className="p-1.5 rounded hover:bg-card text-muted-foreground hover:text-primary transition-colors"
              >
                <Icon size={13} />
              </button>
            );
          })}
        </div>
      )}

      {preview ? (
        <div className="min-h-[80px] p-3 bg-secondary/30 border border-border rounded-xl">
          {draft.trim() ? (
            renderRichText(draft, users)
          ) : (
            <span className="text-xs text-muted-foreground italic">No description yet.</span>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          rows={5}
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Add comprehensive notes, requirements, or documentation…"
          className="w-full p-3 bg-secondary/30 border border-border rounded-xl text-xs text-foreground leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary resize-y"
        />
      )}
    </div>
  );
};
