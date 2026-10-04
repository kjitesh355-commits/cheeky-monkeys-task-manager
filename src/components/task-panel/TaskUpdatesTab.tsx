import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AtSign, ChevronDown, ChevronUp, CornerDownRight, Pencil, Send, SmilePlus, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskUpdate, User } from '../../types';
import { Avatar } from './ui';
import { extractMentions, renderRichText, timeAgo } from './utils';
import { isModerator } from '../../lib/roles';

const REACTIONS = ['👍', '❤️', '🎉', '🔥', '✅'];

/* -------------------------------- composer -------------------------------- */

const UpdateComposer: React.FC<{
  onSubmit: (content: string, mentions: string[]) => void | Promise<void>;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  initial?: string;
  compact?: boolean;
}> = ({ onSubmit, placeholder = 'Write an update…', label, autoFocus, onCancel, initial = '', compact }) => {
  const { users } = useWorkspace();
  const [content, setContent] = useState(initial);
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const mentionQuery = useMemo(() => {
    const m = content.match(/@([\w-]*)$/);
    return m ? m[1].toLowerCase() : null;
  }, [content]);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    return users
      .filter((u) => {
        const first = u.name.split(' ')[0].toLowerCase();
        return u.name.toLowerCase().includes(mentionQuery) || first.startsWith(mentionQuery);
      })
      .slice(0, 5);
  }, [mentionQuery, users]);

  const insertMention = (user: User) => {
    const idx = content.lastIndexOf('@');
    const next = `${content.slice(0, idx)}@${user.name} `;
    setContent(next);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current!.selectionStart = ref.current!.selectionEnd = next.length;
    });
  };

  const submit = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSubmit(trimmed, extractMentions(trimmed, users));
      setContent('');
    } finally {
      setSending(false);
    }
  };

  const activeIndex = mentionMatches.length > 0 ? Math.min(mentionIndex, mentionMatches.length - 1) : 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
      return;
    }
    if (mentionMatches.length > 0 && mentionQuery !== null) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionMatches[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setContent((c) => c.replace(/@[\w-]*$/, ''));
        return;
      }
    }
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${compact ? '' : 'pt-1'}`}>
      {label && (
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
          <AtSign size={11} className="text-primary" /> {label}
        </span>
      )}
      <div className="flex items-end gap-2 bg-secondary/50 border border-border rounded-xl p-2 focus-within:ring-1 focus-within:ring-primary transition-shadow">
        <textarea
          ref={ref}
          rows={compact ? 2 : 3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent resize-none text-xs text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!content.trim() || sending}
            title="Send (Ctrl+Enter)"
            className="p-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-40"
          >
            <Send size={13} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1 px-1">
        <span className="text-[10px] text-muted-foreground">Use @ to mention · Markdown-lite supported</span>
        <span className="text-[10px] text-muted-foreground">Ctrl+Enter to send</span>
      </div>

      {mentionMatches.length > 0 && mentionQuery !== null && (
        <div className="absolute left-2 bottom-full mb-1 w-56 bg-card border border-border rounded-xl shadow-xl p-1.5 z-30 animate-fade-in">
          {mentionMatches.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(u);
              }}
              className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-left transition-colors ${
                i === activeIndex ? 'bg-primary/15' : 'hover:bg-secondary'
              }`}
            >
              <Avatar user={u} size={18} />
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-semibold text-foreground truncate">{u.name}</span>
                <span className="block text-[10px] text-muted-foreground truncate">{u.title}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ------------------------------- single update ---------------------------- */

const UpdateItem: React.FC<{
  update: TaskUpdate;
  users: User[];
  currentUserId: string;
  isRoot: boolean;
}> = ({ update, users, currentUserId, isRoot }) => {
  const { updateTaskUpdate, deleteTaskUpdate, addTaskUpdateReaction, currentUser, addTaskUpdate } = useWorkspace();
  const [showReplies, setShowReplies] = useState(isRoot ? true : false);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(update.content);

  const author = update.author || users.find((u) => u.id === update.userId);
  const own = update.userId === currentUserId;
  const canModerate = isModerator(currentUser.role);
  const canEdit = own || canModerate;

  const deleted = update.content === '_deleted_';
  const replies = update.replies || [];
  const reactions = update.reactions || {};

  const submitEdit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === update.content) {
      setEditing(false);
      setDraft(update.content);
      return;
    }
    await updateTaskUpdate(update.id, trimmed);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (replies.length > 0) {
      await updateTaskUpdate(update.id, '_deleted_');
      return;
    }
    await deleteTaskUpdate(update.id);
  };

  if (deleted || update.content === '_deleted_') {
    return (
      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-secondary/30 border border-border/50">
        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] text-muted-foreground shrink-0">
          <Trash2 size={12} />
        </div>
        <p className="text-xs italic text-muted-foreground self-center">This update was deleted.</p>
      </div>
    );
  }

  return (
    <div className={`group/update flex items-start gap-2.5 ${isRoot ? '' : 'pl-4 border-l-2 border-border/60 ml-3.5'}`}>
      <Avatar user={author} size={28} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-foreground">{author?.name || 'Unknown'}</span>
          <span className="text-[10px] text-muted-foreground" title={new Date(update.createdAt).toLocaleString()}>
            {timeAgo(update.createdAt)}
          </span>
          {update.updatedAt && update.updatedAt !== update.createdAt && (
            <span className="text-[10px] text-muted-foreground italic">(edited)</span>
          )}
          <span className="ml-auto flex items-center gap-1 opacity-0 group-hover/update:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => setReplying(true)}
              title="Reply"
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
            >
              <CornerDownRight size={12} />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setDraft(update.content);
                  setEditing(true);
                }}
                title="Edit"
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
              >
                <Pencil size={12} />
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={handleDelete}
                title="Delete"
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-rose-500 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            )}
          </span>
        </div>

        {editing ? (
          <div className="mt-1.5">
            <textarea
              autoFocus
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  submitEdit();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
              className="w-full p-2 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={submitEdit}
                className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white text-[11px] font-semibold transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-2.5 py-1 rounded-lg border border-border bg-secondary hover:bg-secondary/70 text-[11px] font-semibold text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-1">{renderRichText(update.content, users)}</div>
        )}

        {/* reactions */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {Object.entries(reactions).map(([emoji, ids]) => {
            const mine = ids.includes(currentUserId);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => addTaskUpdateReaction(update.id, emoji)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[11px] transition-colors ${
                  mine
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-secondary border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                <span>{emoji}</span>
                <span className="font-bold">{ids.length}</span>
              </button>
            );
          })}
          <div className="relative group/reaction">
            <button
              type="button"
              title="Add reaction"
              className="p-1 rounded-full border border-transparent hover:border-border text-muted-foreground hover:text-primary transition-colors"
            >
              <SmilePlus size={13} />
            </button>
            <div className="absolute left-0 bottom-full mb-1 hidden group-hover/reaction:flex gap-1 bg-card border border-border rounded-lg shadow-lg p-1 z-20">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addTaskUpdateReaction(update.id, emoji)}
                  className="p-1 rounded hover:bg-secondary text-sm transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* replies */}
        {replies.length > 0 && (
          <button
            type="button"
            onClick={() => setShowReplies((v) => !v)}
            className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showReplies ? 'Hide' : 'View'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </button>
        )}

        {showReplies && replies.length > 0 && (
          <div className="mt-2 space-y-2.5">
            {replies.map((reply) => (
              <UpdateItem
                key={reply.id}
                update={reply}
                users={users}
                currentUserId={currentUserId}
                isRoot={false}
              />
            ))}
          </div>
        )}

        {replying && (
          <div className="mt-2">
            <UpdateComposer
              compact
              autoFocus
              placeholder={`Reply to ${author?.name || 'this update'}…`}
              onCancel={() => setReplying(false)}
              onSubmit={async (content, mentions) => {
                await addTaskUpdate(update.taskId, content, update.id, mentions);
                setReplying(false);
                setShowReplies(true);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------ root composer ----------------------------- */

export const TaskUpdatesComposer: React.FC<{ task: Task }> = ({ task }) => {
  const { addTaskUpdate } = useWorkspace();
  return (
    <UpdateComposer
      label="Add Update"
      placeholder="Share progress, decisions, or blockers… @mention teammates to notify them"
      onSubmit={(content, mentions) => addTaskUpdate(task.id, content, undefined, mentions)}
    />
  );
};

/* --------------------------------- tab ------------------------------------ */

export const TaskUpdatesTab: React.FC<{ task: Task }> = ({ task }) => {
  const { taskUpdates, users, currentUser, loadTaskUpdates } = useWorkspace();

  useEffect(() => {
    loadTaskUpdates(task.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const rootUpdates = useMemo(
    () => taskUpdates.filter((u) => !u.parentUpdateId).slice().sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)),
    [taskUpdates]
  );

  const total = rootUpdates.reduce((sum, u) => sum + 1 + (u.replies?.length || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Thread</span>
        <span className="text-[10px] text-muted-foreground">
          {total} {total === 1 ? 'update' : 'updates'}
        </span>
      </div>

      {rootUpdates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-xs text-muted-foreground">No updates yet. Start the conversation from the composer below.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rootUpdates.map((update) => (
            <UpdateItem key={update.id} update={update} users={users} currentUserId={currentUser.id} isRoot />
          ))}
        </div>
      )}
    </div>
  );
};
