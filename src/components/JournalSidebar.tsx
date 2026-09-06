'use client';

import React, { useState, useMemo } from 'react';
import { Journal } from '@/lib/types/journal';
import { 
  Plus, 
  Search, 
  Trash2, 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  Clock, 
  Check, 
  X,
  Sparkles,
  PanelLeftClose
} from 'lucide-react';

interface JournalSidebarProps {
  journals: Journal[];
  selectedJournalId: string | null;
  onSelectJournal: (journalId: string) => void;
  onCreateNewJournal: () => void;
  onDeleteJournal: (journalId: string) => Promise<void>;
  isLoading?: boolean;
  onToggleCollapse?: () => void;
}

export const JournalSidebar: React.FC<JournalSidebarProps> = ({
  journals,
  selectedJournalId,
  onSelectJournal,
  onCreateNewJournal,
  onDeleteJournal,
  isLoading = false,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredJournals = useMemo(() => {
    if (!searchQuery.trim()) return journals;
    const q = searchQuery.toLowerCase();
    return journals.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.previewText && j.previewText.toLowerCase().includes(q))
    );
  }, [journals, searchQuery]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const confirmDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await onDeleteJournal(id);
      setDeletingId(null);
    } catch (err) {
      console.error('Delete journal error:', err);
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col h-full glass-panel border-r border-border/60 select-none">
      {/* Sidebar Header & New Journal Action */}
      <div className="p-4 border-b border-border/60 space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateNewJournal}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition duration-150 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Reflection</span>
          </button>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-2.5 rounded-xl glass-card border border-border/70 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition active:scale-95 shrink-0"
              title="Collapse Reflections Panel"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past reflections..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-muted/40 border border-border/60 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition placeholder:text-muted-foreground/70"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Journal List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-16 rounded-xl bg-muted/40 animate-pulse border border-border/40"
              />
            ))}
          </div>
        ) : filteredJournals.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <BookOpen className="w-10 h-10 mb-2 opacity-30 text-indigo-500" />
            <p className="text-xs font-semibold text-foreground">
              {searchQuery ? 'No matching reflections' : 'No reflections yet'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
              {searchQuery
                ? 'Try a different search term or clear the filter.'
                : 'Start your first thoughtful journal entry with Gemini.'}
            </p>
          </div>
        ) : (
          filteredJournals.map((journal) => {
            const isSelected = journal.id === selectedJournalId;
            const isConfirmingDelete = deletingId === journal.id;

            return (
              <div
                key={journal.id}
                onClick={() => onSelectJournal(journal.id)}
                className={`group relative rounded-xl p-3 cursor-pointer transition-all duration-150 border ${
                  isSelected
                    ? 'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/50 shadow-sm'
                    : 'bg-card/40 hover:bg-card/90 border-transparent hover:border-border/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-foreground line-clamp-1 flex-1">
                    {journal.title || 'Untitled Entry'}
                  </h4>

                  {/* Date & Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(journal.updatedAt || journal.createdAt)}
                    </span>

                    {/* Delete trigger */}
                    {!isConfirmingDelete ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(journal.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition"
                        title="Delete journal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-background/90 p-0.5 rounded border border-red-500/30">
                        <button
                          onClick={(e) => confirmDelete(e, journal.id)}
                          className="p-1 rounded bg-red-500 text-white hover:bg-red-600 transition"
                          title="Confirm Delete"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(null);
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-foreground"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview text */}
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {journal.previewText || 'No conversation preview...'}
                </p>

                {/* Footer metadata */}
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                  <span className="capitalize px-1.5 py-0.5 rounded bg-muted/60 text-indigo-600 dark:text-indigo-400 font-medium">
                    {journal.personaId ? journal.personaId.replace('-', ' ') : 'Mindful Guide'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {journal.messageCount || 0}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
