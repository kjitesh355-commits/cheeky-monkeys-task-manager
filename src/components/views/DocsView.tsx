'use client';

import React, { useState } from 'react';
import { FileText, Plus, BookOpen, Target, Search } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const DocsView: React.FC = () => {
  const { documents, activeDocId, setActiveDocId, addDocument, currentUser } = useWorkspace();

  const currentDoc = documents.find((d) => d.id === activeDocId) || documents[0];

  const handleCreateDoc = () => {
    addDocument({ title: 'New Enterprise SOP', content: '# New Standard Operating Procedure\n\nOutline SOP steps here...' });
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex select-none animate-fade-in">
      {/* Docs Sidebar */}
      <div className="w-64 border-r border-border bg-card/40 p-3 space-y-4 shrink-0 hidden md:block">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">Documentation Hub</h3>
          <button
            onClick={handleCreateDoc}
            className="p-1 rounded hover:bg-secondary text-primary"
            title="New Document"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="space-y-1">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setActiveDocId(doc.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                doc.id === currentDoc?.id
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <FileText size={15} className="shrink-0" />
              <span className="truncate">{doc.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Document View Pane */}
      <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto space-y-4">
        {currentDoc ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h1 className="text-2xl font-bold text-foreground">{currentDoc.title}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                {currentDoc.category}
              </span>
            </div>

            <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-line text-foreground/90 bg-card border border-border rounded-2xl p-6 shadow-sm">
              {currentDoc.content}
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12 text-xs">Select or create a document</div>
        )}
      </div>
    </div>
  );
};
