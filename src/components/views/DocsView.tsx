'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Folder as FolderIcon, FolderPlus, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { Document, DocumentFolder } from '../../types';

type SaveState = 'idle' | 'saving' | 'saved';

const DocEditor: React.FC<{
  doc: Document;
  folders: DocumentFolder[];
  onUpdate: (id: string, updates: Partial<Document>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}> = ({ doc, folders, onUpdate, onDelete }) => {
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(doc.content || '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const scheduleSave = (patch: Partial<Document>) => {
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await onUpdate(doc.id, patch);
        setSaveState('saved');
      } catch {
        setSaveState('idle');
      }
    }, 700);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete document "${doc.title}"?`)) return;
    try {
      await onDelete(doc.id);
    } catch {
      /* keep document on failure */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave({ title: e.target.value || 'Untitled Document' });
          }}
          className="flex-1 min-w-0 bg-transparent text-2xl font-bold text-foreground focus:outline-none p-0 border-0"
          aria-label="Document title"
        />
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground" data-testid="doc-save-state">
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : ''}
          </span>
          <select
            value={doc.category}
            onChange={(e) => onUpdate(doc.id, { category: e.target.value as Document['category'] })}
            className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold border-0 focus:outline-none cursor-pointer"
            aria-label="Document category"
          >
            <option value="Company">Company</option>
            <option value="Department">Department</option>
            <option value="Project">Project</option>
            <option value="SOP">SOP</option>
          </select>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
            title="Delete document"
            aria-label="Delete document"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Updated {doc.updatedAt}</span>
        <label className="flex items-center gap-2">
          <span>Folder</span>
          <select
            value={doc.folderId || ''}
            onChange={(e) => onUpdate(doc.id, { folderId: e.target.value || null })}
            className="bg-secondary/60 border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            aria-label="Move to folder"
          >
            <option value="">Unfiled</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          scheduleSave({ content: e.target.value });
        }}
        placeholder="Start writing documentation..."
        className="w-full min-h-[55vh] text-xs leading-relaxed text-foreground/90 bg-card border border-border rounded-2xl p-6 shadow-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary/50"
        aria-label="Document content"
      />
    </div>
  );
};

export const DocsView: React.FC = () => {
  const {
    documents,
    folders,
    docsLoaded,
    activeDocId,
    setActiveDocId,
    addDocument,
    updateDocument,
    deleteDocument,
    addFolder,
    renameFolder,
    deleteFolder,
  } = useWorkspace();

  const [query, setQuery] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const currentDoc = documents.find((d) => d.id === activeDocId) || documents[0] || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) => d.title.toLowerCase().includes(q) || (d.content || '').toLowerCase().includes(q)
    );
  }, [documents, query]);

  const groups = useMemo(() => {
    const byFolder = new Map<string, Document[]>();
    for (const doc of filtered) {
      const key = doc.folderId || '';
      const bucket = byFolder.get(key);
      if (bucket) bucket.push(doc);
      else byFolder.set(key, [doc]);
    }
    return byFolder;
  }, [filtered]);

  const unfiled = groups.get('') || [];

  const handleCreateDoc = async (folderId?: string | null) => {
    try {
      await addDocument({
        title: 'Untitled Document',
        folderId: folderId !== undefined ? folderId : currentDoc?.folderId ?? null,
      });
    } catch {
      /* stay on current doc on failure */
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    setNewFolderName('');
    setCreatingFolder(false);
    if (!name) return;
    try {
      await addFolder(name);
    } catch {
      /* keep prior state on failure */
    }
  };

  const handleRenameFolder = async (id: string) => {
    const name = renameValue.trim();
    setRenamingFolderId(null);
    if (!name) return;
    try {
      await renameFolder(id, name);
    } catch {
      /* revert silently */
    }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!window.confirm(`Delete folder "${name}"? Documents inside it will become unfiled.`)) return;
    try {
      await deleteFolder(id);
    } catch {
      /* keep folder on failure */
    }
  };

  const renderDocButton = (doc: Document) => (
    <button
      key={doc.id}
      onClick={() => setActiveDocId(doc.id)}
      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
        currentDoc?.id === doc.id
          ? 'bg-primary/15 text-primary font-semibold'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
      }`}
    >
      <FileText size={14} className="shrink-0" />
      <span className="truncate">{doc.title}</span>
    </button>
  );

  const renderFolderRow = (folderId: string, name: string, count: number) => {
    const isRenaming = renamingFolderId === folderId;
    return (
      <div key={folderId || 'unfiled'} className="group/folder flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-secondary/50">
        <FolderIcon size={14} className="shrink-0 text-muted-foreground" />
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => handleRenameFolder(folderId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameFolder(folderId);
              if (e.key === 'Escape') setRenamingFolderId(null);
            }}
            className="flex-1 min-w-0 bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        ) : (
          <span className="flex-1 min-w-0 truncate text-xs font-medium text-foreground/90">{name}</span>
        )}
        <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
        {folderId && (
          <span className="hidden group-hover/folder:flex items-center gap-0.5">
            <button
              onClick={() => {
                setRenamingFolderId(folderId);
                setRenameValue(name);
              }}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              title="Rename folder"
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={() => handleDeleteFolder(folderId, name)}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive"
              title="Delete folder"
            >
              <Trash2 size={11} />
            </button>
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex select-none animate-fade-in">
      {/* Docs Sidebar */}
      <div className="w-64 border-r border-border bg-card/40 p-3 space-y-4 shrink-0 hidden md:flex md:flex-col">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">Documentation Hub</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCreatingFolder(true)}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary"
              title="New Folder"
            >
              <FolderPlus size={14} />
            </button>
            <button
              onClick={() => handleCreateDoc()}
              className="p-1 rounded hover:bg-secondary text-primary"
              title="New Document"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-secondary/60 border border-border rounded-lg pl-8 pr-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            aria-label="Search documents"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
          {!docsLoaded && (
            <div className="px-2.5 py-3 text-xs text-muted-foreground animate-pulse">Loading documents...</div>
          )}

          {docsLoaded && documents.length === 0 && !creatingFolder && (
            <div className="px-2.5 py-3 text-xs text-muted-foreground">
              No documents yet. Click + to create one.
            </div>
          )}

          {creatingFolder && (
            <div className="px-1 py-1">
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={handleCreateFolder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') {
                    setCreatingFolder(false);
                    setNewFolderName('');
                  }
                }}
                placeholder="Folder name..."
                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          )}

          {docsLoaded && folders.map((folder) => {
            const docs = groups.get(folder.id) || [];
            return (
              <div key={folder.id} className="space-y-0.5">
                {renderFolderRow(folder.id, folder.name, docs.length)}
                <div className="pl-3 space-y-0.5">{docs.map(renderDocButton)}</div>
              </div>
            );
          })}

          {docsLoaded && unfiled.length > 0 && (
            <div className="space-y-0.5 pt-1">
              {renderFolderRow('', 'Unfiled', unfiled.length)}
              <div className="pl-3 space-y-0.5">{unfiled.map(renderDocButton)}</div>
            </div>
          )}

          {docsLoaded && documents.length > 0 && filtered.length === 0 && (
            <div className="px-2.5 py-3 text-xs text-muted-foreground">No documents match your search.</div>
          )}
        </div>
      </div>

      {/* Document View / Edit Pane */}
      <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto space-y-4">
        {!docsLoaded ? (
          <div className="text-center text-muted-foreground py-12 text-xs animate-pulse">Loading documents...</div>
        ) : currentDoc ? (
          <DocEditor
            key={currentDoc.id}
            doc={currentDoc}
            folders={folders}
            onUpdate={updateDocument}
            onDelete={deleteDocument}
          />
        ) : (
          <div className="text-center py-16 space-y-3">
            <FileText size={28} className="mx-auto text-dim" />
            <div className="text-sm font-medium text-foreground">No documents yet</div>
            <p className="text-xs text-muted-foreground">Create your first document to get started.</p>
            <button
              onClick={() => handleCreateDoc()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              New Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
