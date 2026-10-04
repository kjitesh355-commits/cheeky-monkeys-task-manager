import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  File as FileIcon,
  FileImage,
  FileText,
  Film,
  Music,
  Paperclip,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Task, TaskFile } from '../../types';
import { ConfirmDialog } from './ui';
import { fileExtension, formatFileSize, isImageType, isPdfType, timeAgo } from './utils';

const ACCEPTED = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.md';

function fileVisual(file: TaskFile) {
  const type = file.fileType || '';
  if (isImageType(type)) return { icon: FileImage, tint: 'text-sky-600 bg-sky-500/10' };
  if (isPdfType(type)) return { icon: FileText, tint: 'text-rose-600 bg-rose-500/10' };
  if (type.startsWith('video/')) return { icon: Film, tint: 'text-purple-600 bg-purple-500/10' };
  if (type.startsWith('audio/')) return { icon: Music, tint: 'text-emerald-600 bg-emerald-500/10' };
  return { icon: FileIcon, tint: 'text-slate-500 bg-slate-500/10' };
}

export const TaskFilesTab: React.FC<{ task: Task }> = ({ task }) => {
  const { taskFiles, loadTaskFiles, uploadTaskFile, deleteTaskFile } = useWorkspace();
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<Record<string, { name: string; pct: number }>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<TaskFile | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadTaskFiles(task.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const startUpload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploadError(null);
    for (const file of list) {
      const key = `${file.name}-${Date.now()}-${Math.random()}`;
      setProgress((p) => ({ ...p, [key]: { name: file.name, pct: 0 } }));
      try {
        await uploadTaskFile(task.id, file, (percent) =>
          setProgress((p) => ({ ...p, [key]: { name: file.name, pct: percent } }))
        );
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
      } finally {
        setProgress((p) => {
          const next = { ...p };
          delete next[key];
          return next;
        });
      }
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return taskFiles;
    return taskFiles.filter((f) => f.fileName.toLowerCase().includes(q));
  }, [taskFiles, query]);

  const totalSize = taskFiles.reduce((sum, f) => sum + (f.fileSize || 0), 0);
  const uploading = Object.keys(progress).length > 0;

  const openFile = (file: TaskFile) => {
    if (file.downloadUrl) window.open(file.downloadUrl, '_blank', 'noopener');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer?.files?.length) startUpload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={`rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors ${
          dragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-secondary/40'
        }`}
      >
        <UploadCloud size={22} className={`mx-auto mb-1.5 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className="text-xs font-semibold text-foreground">Drag & drop files here</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          or click to browse · max 50 MB per file
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) startUpload(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {uploadError && (
        <p className="text-[11px] text-rose-600 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          {uploadError}
        </p>
      )}

      {/* in-flight uploads */}
      {uploading && (
        <div className="space-y-2">
          {Object.entries(progress).map(([key, item]) => (
            <div key={key} className="bg-secondary/50 border border-border rounded-lg p-2.5">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-foreground font-medium truncate">{item.name}</span>
                <span className="text-muted-foreground font-bold">{item.pct}%</span>
              </div>
              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-200"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* header + search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            className="w-full bg-secondary/50 border border-border rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {taskFiles.length} file{taskFiles.length === 1 ? '' : 's'} · {formatFileSize(totalSize)}
        </span>
      </div>

      {/* image previews */}
      {!query && filtered.some((f) => isImageType(f.fileType || '')) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {filtered
            .filter((f) => isImageType(f.fileType || ''))
            .map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => openFile(file)}
                className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary"
                title={file.fileName}
              >
                {file.downloadUrl ? (
                  <img src={file.downloadUrl} alt={file.fileName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileImage size={22} className="text-sky-600" />
                  </div>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-background/80 backdrop-blur-sm text-[9px] text-foreground px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.fileName}
                </span>
              </button>
            ))}
        </div>
      )}

      {/* file list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <Paperclip size={18} className="mx-auto mb-1.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {query ? 'No files match your search.' : 'No files attached yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((file) => {
            const Visual = fileVisual(file);
            const previewable = isImageType(file.fileType || '') || isPdfType(file.fileType || '');
            return (
              <div
                key={file.id}
                className="group flex items-center gap-3 p-2 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary/60 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${Visual.tint}`}>
                  <Visual.icon size={15} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{file.fileName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                    {fileExtension(file.fileName) && ` · ${fileExtension(file.fileName)}`}
                    {' · '}
                    {file.uploader?.name || 'Unknown'} · {timeAgo(file.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {previewable && file.downloadUrl && (
                    <button
                      type="button"
                      onClick={() => openFile(file)}
                      title="Preview"
                      className="p-1.5 rounded hover:bg-card text-muted-foreground hover:text-primary transition-colors"
                    >
                      <FileText size={13} />
                    </button>
                  )}
                  <a
                    href={file.downloadUrl || file.filePath || '#'}
                    download={file.fileName}
                    target={file.downloadUrl ? '_blank' : undefined}
                    rel="noreferrer"
                    title="Download"
                    className="p-1.5 rounded hover:bg-card text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Download size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(file)}
                    title="Delete"
                    className="p-1.5 rounded hover:bg-card text-muted-foreground hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete file?"
        message={
          <>
            <span className="font-semibold text-foreground">{pendingDelete?.fileName}</span> will be permanently
            removed from this task.
          </>
        }
        confirmLabel="Delete file"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await deleteTaskFile(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
};
