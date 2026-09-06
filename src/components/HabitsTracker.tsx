'use client';

import React, { useState, useMemo } from 'react';
import { HabitItem, HabitCategory } from '@/lib/types/journal';
import {
  CheckSquare,
  Plus,
  Trash2,
  Flame,
  Sparkles,
  Share2,
  Search,
  Check,
  X,
  Send,
  Copy,
  AlertCircle,
  ListTodo,
  Zap,
} from 'lucide-react';

interface HabitsTrackerProps {
  habits: HabitItem[];
  onToggleHabit: (habitId: string) => Promise<void>;
  onCreateHabit: (data: {
    title: string;
    category?: HabitCategory;
    sourceJournalId?: string;
    sourceJournalTitle?: string;
  }) => Promise<void>;
  onDeleteHabit: (habitId: string) => Promise<void>;
  userDisplayName?: string;
  onCreateReflection?: () => void;
}

const CATEGORY_STYLES: Record<
  HabitCategory,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  mindfulness: {
    label: 'Mindfulness',
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/20',
    dot: 'bg-indigo-500',
  },
  productivity: {
    label: 'Productivity',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500',
  },
  wellness: {
    label: 'Wellness',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  growth: {
    label: 'Growth',
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20',
    dot: 'bg-purple-500',
  },
  custom: {
    label: 'Custom',
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/20',
    dot: 'bg-slate-500',
  },
};

const SUGGESTED_MICRO_HABITS = [
  { title: 'Pause for 3 deep breaths before replying to tense emails', category: 'mindfulness' as HabitCategory },
  { title: 'Write 3 daily must-win priorities during morning focus window', category: 'productivity' as HabitCategory },
  { title: 'Take a 10-minute mindful outdoor walk without screens', category: 'wellness' as HabitCategory },
  { title: 'Log 1 stoic observation regarding what was outside my control', category: 'growth' as HabitCategory },
  { title: 'Read 5 pages of philosophy or reflective literature', category: 'growth' as HabitCategory },
];

export const HabitsTracker: React.FC<HabitsTrackerProps> = ({
  habits,
  onToggleHabit,
  onCreateHabit,
  onDeleteHabit,
  userDisplayName = 'Journaler',
  onCreateReflection,
}) => {
  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // New Habit Modal / Form State
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<HabitCategory>('growth');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [exportPlatform, setExportPlatform] = useState<'auto' | 'discord' | 'slack' | 'custom'>('auto');
  const [exportNotes, setExportNotes] = useState('Daily habit reflection progress dispatch.');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Filtered habits list
  const filteredHabits = useMemo(() => {
    return habits.filter((h) => {
      // Search
      const matchesSearch =
        !searchQuery.trim() ||
        h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.category.toLowerCase().includes(searchQuery.toLowerCase());

      // Category
      const matchesCategory =
        selectedCategory === 'all' || h.category === selectedCategory;

      // Status
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'completed'
          ? h.completed
          : !h.completed;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [habits, searchQuery, selectedCategory, statusFilter]);

  // Summary Metrics
  const totalCount = habits.length;
  const completedCount = habits.filter((h) => h.completed).length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const maxStreak = habits.reduce((max, h) => Math.max(max, h.streakDays || 0), 0);

  // Form submit handler
  const handleCreateSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim() || isSubmittingNew) return;

    setIsSubmittingNew(true);
    try {
      await onCreateHabit({
        title: newTitle.trim(),
        category: newCategory,
      });
      setNewTitle('');
      setIsAddingHabit(false);
    } catch (err) {
      console.error('Failed to create habit:', err);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Add suggested habit handler
  const handleAddSuggested = async (suggested: { title: string; category: HabitCategory }) => {
    try {
      await onCreateHabit({
        title: suggested.title,
        category: suggested.category,
      });
    } catch (err) {
      console.error('Failed to add suggested habit:', err);
    }
  };

  // Dispatch Webhook Export
  const handleDispatchExport = async () => {
    if (!webhookUrl.trim() || isExporting) return;

    setIsExporting(true);
    setExportStatus({ type: 'idle', message: '' });

    try {
      const res = await fetch('/api/export/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim(),
          platform: exportPlatform,
          habits,
          userDisplayName,
          notes: exportNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Webhook dispatch failed');
      }

      setExportStatus({
        type: 'success',
        message: `Successfully dispatched ${habits.length} habits to ${data.platform || 'webhook'}!`,
      });
    } catch (err: any) {
      setExportStatus({
        type: 'error',
        message: err.message || 'Error sending webhook. Verify your webhook URL format.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Copy raw export payload to clipboard
  const handleCopyPayload = () => {
    const markdown = `# 🌱 Action Items & Micro-Habits Progress\n**Progress:** ${completedCount}/${totalCount} completed (${completionPercent}%)\n**Top Streak:** 🔥 ${maxStreak} days\n\n${habits
      .map(
        (h) =>
          `${h.completed ? '✅' : '⬜'} ${h.title} ${
            h.streakDays > 0 ? `(🔥 ${h.streakDays}d)` : ''
          }`
      )
      .join('\n')}`;

    navigator.clipboard.writeText(markdown);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              AI Action Items & Micro-Habits Tracker
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Turn reflective insights into daily actionable momentum with AI micro-habits.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setExportStatus({ type: 'idle', message: '' });
              setIsExportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card border border-border/80 hover:border-indigo-500/40 text-xs font-semibold text-foreground transition active:scale-95 shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Export to Discord / Slack</span>
          </button>

          <button
            onClick={() => setIsAddingHabit(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Habit</span>
          </button>
        </div>
      </div>

      {/* Progress & Streak Overview Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Metric Card */}
        <div className="glass-card p-4 rounded-2xl border border-border/80 flex items-center gap-4">
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted stroke-current"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500 stroke-current transition-all duration-700 ease-out"
                strokeDasharray={`${completionPercent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-black text-foreground">
              {completionPercent}%
            </span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Daily Progress</h3>
            <p className="text-lg font-black text-foreground mt-0.5">
              {completedCount} <span className="text-xs font-normal text-muted-foreground">of {totalCount} completed</span>
            </p>
          </div>
        </div>

        {/* Highest Streak Card */}
        <div className="glass-card p-4 rounded-2xl border border-border/80 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Longest Streak</h3>
            <p className="text-lg font-black text-foreground mt-0.5">
              {maxStreak} <span className="text-xs font-normal text-muted-foreground">Days Momentum</span>
            </p>
          </div>
        </div>

        {/* Active Habits Breakdown Card */}
        <div className="glass-card p-4 rounded-2xl border border-border/80 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Active Focus</h3>
            <p className="text-lg font-black text-foreground mt-0.5">
              {totalCount - completedCount} <span className="text-xs font-normal text-muted-foreground">pending today</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-2.5 rounded-2xl border border-border/60">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-medium">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-xl transition ${
              selectedCategory === 'all'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {(['mindfulness', 'productivity', 'wellness', 'growth', 'custom'] as HabitCategory[]).map(
            (cat) => {
              const style = CATEGORY_STYLES[cat];
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border transition ${
                    isSelected
                      ? `${style.bg} ${style.text} ${style.border} font-semibold shadow-xs`
                      : 'border-transparent bg-muted/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  <span>{style.label}</span>
                </button>
              );
            }
          )}
        </div>

        {/* Search & Status Controls */}
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-background border border-border/80 text-xs rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search habits..."
              className="pl-8 pr-3 py-1.5 bg-background rounded-xl border border-border/80 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* Add Habit Inline Form Drawer */}
      {isAddingHabit && (
        <form
          onSubmit={handleCreateSubmit}
          className="glass-card p-4 rounded-2xl border border-indigo-500/40 shadow-md space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              <span>Create New Micro-Habit / Action Item</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingHabit(false)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. 5-minute evening breathwork or daily priority review..."
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as HabitCategory)}
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 capitalize"
              >
                <option value="mindfulness">Mindfulness</option>
                <option value="productivity">Productivity</option>
                <option value="wellness">Wellness</option>
                <option value="growth">Growth</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingHabit(false)}
              className="px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim() || isSubmittingNew}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-40 transition shadow-xs"
            >
              {isSubmittingNew ? 'Saving...' : 'Add Habit'}
            </button>
          </div>
        </form>
      )}

      {/* Habits Checklist Grid */}
      <div className="space-y-2.5">
        {filteredHabits.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl border border-border/80 text-center space-y-3">
            <ListTodo className="w-10 h-10 mx-auto text-indigo-500/40" />
            <h3 className="text-sm font-bold text-foreground">
              {searchQuery ? 'No habits match your query' : 'No habits tracked in this view'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create a custom habit or choose from AI-recommended micro-habits below.
            </p>
          </div>
        ) : (
          filteredHabits.map((habit) => {
            const style = CATEGORY_STYLES[habit.category] || CATEGORY_STYLES.growth;

            return (
              <div
                key={habit.id}
                className={`group glass-card p-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 ${
                  habit.completed
                    ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
                    : 'border-border/80 hover:border-indigo-500/40'
                }`}
              >
                {/* Left: Checkbox & Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => onToggleHabit(habit.id)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                      habit.completed
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                        : 'border-border/80 bg-muted/40 hover:border-indigo-500 text-transparent hover:text-muted-foreground'
                    }`}
                    title={habit.completed ? 'Mark incomplete' : 'Mark completed'}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-semibold leading-relaxed transition-all ${
                        habit.completed
                          ? 'line-through text-muted-foreground'
                          : 'text-foreground'
                      }`}
                    >
                      {habit.title}
                    </p>

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span
                        className={`px-2 py-0.5 rounded-md border font-medium ${style.bg} ${style.text} ${style.border}`}
                      >
                        {style.label}
                      </span>
                      {habit.sourceJournalTitle && (
                        <span className="truncate max-w-[140px] opacity-75">
                          From: {habit.sourceJournalTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Streak counter & Delete */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Streak Badge */}
                  <div
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl border ${
                      habit.streakDays > 0
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-muted/40 text-muted-foreground border-border/50'
                    }`}
                  >
                    <Flame
                      className={`w-3.5 h-3.5 ${
                        habit.streakDays > 0 ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'
                      }`}
                    />
                    <span>{habit.streakDays}d</span>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => onDeleteHabit(habit.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition"
                    title="Delete habit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Micro-Habits Recommendation Section */}
      <div className="glass-card p-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold text-foreground">
              AI-Recommended Micro-Habits for Today
            </h3>
          </div>
          <span className="text-[10px] text-muted-foreground">
            Tap (+) to track
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SUGGESTED_MICRO_HABITS.map((s, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl glass-panel border border-border/60 flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-foreground font-medium truncate">{s.title}</span>
              </div>
              <button
                onClick={() => handleAddSuggested(s)}
                className="p-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 hover:text-white transition shrink-0"
                title="Add to daily checklist"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card bg-background max-w-lg w-full rounded-2xl border border-border/80 shadow-2xl p-6 space-y-4 relative">
            <button
              onClick={() => setIsExportModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Export Action Items & Habits
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Dispatch formatted updates directly to Discord or Slack webhooks.
                </p>
              </div>
            </div>

            {/* Platform Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Platform Format</label>
              <div className="grid grid-cols-3 gap-2">
                {(['auto', 'discord', 'slack'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setExportPlatform(p)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition ${
                      exportPlatform === p
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p === 'auto' ? '⚡ Auto-Detect' : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Webhook URL Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Webhook URL</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/..."
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Reflection Notes (Optional)</label>
              <input
                type="text"
                value={exportNotes}
                onChange={(e) => setExportNotes(e.target.value)}
                placeholder="Brief summary or message for the channel..."
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Status alert message */}
            {exportStatus.type !== 'idle' && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  exportStatus.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                }`}
              >
                {exportStatus.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{exportStatus.message}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={handleCopyPayload}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground p-1.5 rounded-lg"
              >
                {copiedPayload ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Copied Markdown</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleDispatchExport}
                  disabled={!webhookUrl.trim() || isExporting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 disabled:opacity-40 transition active:scale-95"
                >
                  {isExporting ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Webhook</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
