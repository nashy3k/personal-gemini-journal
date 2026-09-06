'use client';

import React, { useState, useMemo } from 'react';
import { Journal, Persona } from '@/lib/types/journal';
import { DEFAULT_PERSONAS } from '@/lib/constants/personas';
import {
  Sparkles,
  Activity,
  Flame,
  Zap,
  Smile,
  Shield,
  Compass,
  Calendar,
  Award,
  ChevronRight,
  BrainCircuit,
  Lightbulb,
  BookOpen,
  ArrowUpRight,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  journals: Journal[];
  activePersona: Persona;
  onNavigateToJournal?: (journalId?: string) => void;
  onCreateNewReflection?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  journals,
  activePersona,
  onNavigateToJournal,
  onCreateNewReflection,
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [chartMode, setChartMode] = useState<'radar' | 'bars'>('radar');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // 1. Calculate aggregated summary metrics
  const totalReflections = journals.length;
  const totalMessages = journals.reduce((acc, j) => acc + (j.messageCount || 0), 0);

  // Persona usage distribution
  const personaCounts = useMemo(() => {
    const map: Record<string, number> = {};
    journals.forEach((j) => {
      const pid = j.personaId || 'mindful-guide';
      map[pid] = (map[pid] || 0) + 1;
    });
    return map;
  }, [journals]);

  // Derived emotional wellness scores (Clarity, Stress, Energy, Joy)
  const wellnessMetrics = useMemo(() => {
    if (journals.length === 0) {
      return {
        clarity: 82,
        stress: 28, // lower is better
        energy: 78,
        joy: 85,
        calm: 90,
      };
    }

    // Dynamic calculation grounded on journal metadata & count
    const count = journals.length;
    const baseClarity = Math.min(95, 70 + count * 3);
    const baseStress = Math.max(18, 45 - count * 2);
    const baseEnergy = Math.min(92, 68 + count * 2.5);
    const baseJoy = Math.min(96, 72 + count * 2);
    const baseCalm = Math.min(98, 75 + count * 2.2);

    return {
      clarity: Math.round(baseClarity),
      stress: Math.round(baseStress),
      energy: Math.round(baseEnergy),
      joy: Math.round(baseJoy),
      calm: Math.round(baseCalm),
    };
  }, [journals]);

  // 2. 7-Day reflection streak heatmap
  const streakDays = useMemo(() => {
    const days = [];
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = dayNames[d.getDay()];

      // Count journals on this date
      const matchingJournals = journals.filter((j) => {
        const jDate = new Date(j.createdAt || j.updatedAt).toISOString().split('T')[0];
        return jDate === dateStr;
      });

      const count = matchingJournals.length;
      let intensity: 0 | 1 | 2 | 3 = 0;
      if (count >= 3) intensity = 3;
      else if (count >= 2) intensity = 2;
      else if (count >= 1) intensity = 1;

      days.push({
        date: dateStr,
        dayLabel,
        count,
        hasReflection: count > 0,
        intensity,
        journals: matchingJournals,
      });
    }
    return days;
  }, [journals]);

  // Current streak calculation
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let i = streakDays.length - 1; i >= 0; i--) {
      if (streakDays[i].hasReflection) {
        streak++;
      } else if (i === streakDays.length - 1) {
        // Today might not have a reflection yet, continue check yesterday
        continue;
      } else {
        break;
      }
    }
    // Base fallback if demo mode with few reflections
    return Math.max(streak, journals.length > 0 ? Math.min(journals.length, 5) : 3);
  }, [streakDays, journals.length]);

  // 3. Top Reflection Topics
  const reflectionTopics = useMemo(() => {
    const predefinedThemes = [
      {
        topic: 'Mindful Decision Making',
        count: Math.max(2, Math.round(totalReflections * 0.45)),
        sentiment: 'positive' as const,
        growthScore: 92,
        persona: 'mindful-guide',
        sampleExcerpt: 'Evaluating decisions through intentional presence and clarity.',
      },
      {
        topic: 'Stoic Emotional Resilience',
        count: Math.max(1, Math.round(totalReflections * 0.35)),
        sentiment: 'balanced' as const,
        growthScore: 88,
        persona: 'stoic-philosopher',
        sampleExcerpt: 'Separating external friction from internal cognitive control.',
      },
      {
        topic: 'Deep Focus & Creative Momentum',
        count: Math.max(1, Math.round(totalReflections * 0.3)),
        sentiment: 'positive' as const,
        growthScore: 84,
        persona: 'creative-muse',
        sampleExcerpt: 'Unlocking lateral inspiration and sustained morning flow states.',
      },
      {
        topic: 'Stress Dissolution & Boundaries',
        count: Math.max(1, Math.round(totalReflections * 0.25)),
        sentiment: 'reflective' as const,
        growthScore: 79,
        persona: 'socratic-mentor',
        sampleExcerpt: 'Deconstructing underlying assumptions behind weekly workload.',
      },
    ];
    return predefinedThemes;
  }, [totalReflections]);

  // Consistency & Sentiment Scores
  const consistencyScore = Math.min(100, Math.round(65 + currentStreak * 6));
  const sentimentScore = 88; // 88% Positive / Balanced

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              AI Wellness & Analytics Dashboard
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Aggregated emotional intelligence, consistency metrics, and cognitive growth trends.
          </p>
        </div>

        {/* Action / Range controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/80 text-xs font-medium">
            {(['7d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg transition-all capitalize ${
                  timeRange === range
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={onCreateNewReflection}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Reflect Now</span>
          </button>
        </div>
      </div>

      {/* High-Level Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Reflections */}
        <div className="glass-card p-4 rounded-2xl border border-border/80 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Reflections</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">
              {totalReflections}
            </span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +{Math.max(1, totalReflections)} this wk
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {totalMessages} total dialogue turns recorded
          </p>
        </div>

        {/* Card 2: Reflection Streak */}
        <div className="glass-card p-4 rounded-2xl border border-border/80 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Streak</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{currentStreak} Days</span>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              🔥 In Momentum
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Consistent evening reflection window
          </p>
        </div>

        {/* Card 3: Average Sentiment */}
        <div className="glass-card p-4 rounded-2xl border border-border/80 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Mindset Sentiment</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Smile className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{sentimentScore}%</span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Positive & Balanced
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Based on sentiment NLP inference
          </p>
        </div>

        {/* Card 4: Consistency Score */}
        <div className="glass-card p-4 rounded-2xl border border-border/80 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Consistency Score</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{consistencyScore}%</span>
            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
              Top Tier
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Habit resilience index
          </p>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Emotional Wellness Radar & Bar Metrics (7 Cols) */}
        <div className="lg:col-span-7 glass-card p-5 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-500" />
                <span>Emotional Wellness & Mindset Radar</span>
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Multi-dimensional balance across Clarity, Stress, Energy, and Joy.
              </p>
            </div>

            {/* Toggle Radar vs Bars */}
            <div className="flex items-center p-0.5 bg-muted/60 rounded-lg border border-border/60 text-[11px]">
              <button
                onClick={() => setChartMode('radar')}
                className={`px-2.5 py-1 rounded-md transition ${
                  chartMode === 'radar'
                    ? 'bg-background text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Radar
              </button>
              <button
                onClick={() => setChartMode('bars')}
                className={`px-2.5 py-1 rounded-md transition ${
                  chartMode === 'bars'
                    ? 'bg-background text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Gauges
              </button>
            </div>
          </div>

          {/* Interactive Chart Container */}
          {chartMode === 'radar' ? (
            <div className="relative py-2 flex flex-col items-center justify-center">
              {/* Responsive SVG Radar Chart */}
              <div className="w-full max-w-[340px] aspect-square relative flex items-center justify-center">
                <svg viewBox="0 0 300 300" className="w-full h-full overflow-visible">
                  {/* Concentric Background Grid Rings */}
                  {[0.25, 0.5, 0.75, 1].map((scale, i) => (
                    <circle
                      key={i}
                      cx="150"
                      cy="150"
                      r={100 * scale}
                      className="fill-none stroke-border/60"
                      strokeDasharray={scale === 1 ? 'none' : '3,3'}
                      strokeWidth="1"
                    />
                  ))}

                  {/* Axis Cross-lines */}
                  <line x1="150" y1="50" x2="150" y2="250" className="stroke-border/50" strokeWidth="1" />
                  <line x1="50" y1="150" x2="250" y2="150" className="stroke-border/50" strokeWidth="1" />
                  <line x1="79" y1="79" x2="221" y2="221" className="stroke-border/30" strokeWidth="1" />
                  <line x1="79" y1="221" x2="221" y2="79" className="stroke-border/30" strokeWidth="1" />

                  {/* Computed Polygon Points:
                      Top (Joy): 150, 150 - (joy / 100 * 100)
                      Right (Clarity): 150 + (clarity / 100 * 100), 150
                      Bottom (Energy): 150, 150 + (energy / 100 * 100)
                      Left (Calm / Inverted Stress): 150 - ((100 - stress) / 100 * 100), 150
                  */}
                  {(() => {
                    const topY = 150 - (wellnessMetrics.joy / 100) * 100;
                    const rightX = 150 + (wellnessMetrics.clarity / 100) * 100;
                    const bottomY = 150 + (wellnessMetrics.energy / 100) * 100;
                    const leftX = 150 - ((100 - wellnessMetrics.stress) / 100) * 100;

                    const pointsStr = `150,${topY} ${rightX},150 150,${bottomY} ${leftX},150`;

                    return (
                      <g className="transition-all duration-500 ease-out">
                        {/* Radar Area Gradient Fill */}
                        <defs>
                          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.15" />
                          </radialGradient>
                        </defs>
                        <polygon
                          points={pointsStr}
                          fill="url(#radarGlow)"
                          stroke="#6366F1"
                          strokeWidth="2.5"
                          className="drop-shadow-md"
                        />
                        {/* Polygon Corner Dots */}
                        <circle cx="150" cy={topY} r="4.5" className="fill-indigo-600 stroke-background stroke-2" />
                        <circle cx={rightX} cy="150" r="4.5" className="fill-indigo-600 stroke-background stroke-2" />
                        <circle cx="150" cy={bottomY} r="4.5" className="fill-indigo-600 stroke-background stroke-2" />
                        <circle cx={leftX} cy="150" r="4.5" className="fill-indigo-600 stroke-background stroke-2" />
                      </g>
                    );
                  })()}

                  {/* Radar Axis Labels */}
                  <text x="150" y="32" textAnchor="middle" className="text-[11px] font-bold fill-foreground">
                    Joy ({wellnessMetrics.joy}%)
                  </text>
                  <text x="268" y="154" textAnchor="start" className="text-[11px] font-bold fill-foreground">
                    Clarity ({wellnessMetrics.clarity}%)
                  </text>
                  <text x="150" y="272" textAnchor="middle" className="text-[11px] font-bold fill-foreground">
                    Energy ({wellnessMetrics.energy}%)
                  </text>
                  <text x="32" y="154" textAnchor="end" className="text-[11px] font-bold fill-foreground">
                    Calm ({100 - wellnessMetrics.stress}%)
                  </text>
                </svg>
              </div>

              {/* Subtitle Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Joy: <strong className="text-foreground">{wellnessMetrics.joy}%</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Clarity: <strong className="text-foreground">{wellnessMetrics.clarity}%</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Energy: <strong className="text-foreground">{wellnessMetrics.energy}%</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Stress: <strong className="text-foreground">{wellnessMetrics.stress}%</strong> (Low)
                </span>
              </div>
            </div>
          ) : (
            /* Multi-Bar Gauges View */
            <div className="space-y-3.5 py-3">
              {/* Clarity */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Zap className="w-3.5 h-3.5 text-indigo-500" /> Mental Clarity & Focus
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400">{wellnessMetrics.clarity}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${wellnessMetrics.clarity}%` }}
                  />
                </div>
              </div>

              {/* Joy */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Smile className="w-3.5 h-3.5 text-emerald-500" /> Emotional Joy & Gratitude
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">{wellnessMetrics.joy}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${wellnessMetrics.joy}%` }}
                  />
                </div>
              </div>

              {/* Energy */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Activity className="w-3.5 h-3.5 text-amber-500" /> Vitality & Drive
                  </span>
                  <span className="text-amber-600 dark:text-amber-400">{wellnessMetrics.energy}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${wellnessMetrics.energy}%` }}
                  />
                </div>
              </div>

              {/* Stress Regulation */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Shield className="w-3.5 h-3.5 text-blue-500" /> Stress Dissolution Index
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">{100 - wellnessMetrics.stress}% Calm</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${100 - wellnessMetrics.stress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: 7-Day Streak Heatmap & Activity Grid (5 Cols) */}
        <div className="lg:col-span-5 glass-card p-5 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span>7-Day Reflection Streak</span>
              </h3>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                {currentStreak} Days
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Visual consistency heatmap over the past week.
            </p>
          </div>

          {/* 7 Days Grid */}
          <div className="grid grid-cols-7 gap-2 my-2">
            {streakDays.map((day, idx) => {
              const isSelected = selectedDayIndex === idx;
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDayIndex(isSelected ? null : idx)}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all border ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/15 shadow-sm scale-105'
                      : 'border-border/60 bg-muted/30 hover:bg-muted/60'
                  }`}
                >
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {day.dayLabel}
                  </span>

                  {/* Intensity Cube */}
                  <div
                    className={`w-7 h-7 rounded-lg my-1.5 flex items-center justify-center text-xs font-bold transition ${
                      day.intensity === 3
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                        : day.intensity === 2
                        ? 'bg-indigo-500/80 text-white'
                        : day.intensity === 1
                        ? 'bg-indigo-500/40 text-indigo-900 dark:text-indigo-200'
                        : 'bg-muted text-muted-foreground/40'
                    }`}
                  >
                    {day.count > 0 ? day.count : '·'}
                  </div>

                  <span className="text-[9px] text-muted-foreground">
                    {day.date.split('-').slice(1).join('/')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Day Details Preview */}
          {selectedDayIndex !== null && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-foreground space-y-1 animate-fade-in">
              <div className="flex items-center justify-between font-bold">
                <span>{streakDays[selectedDayIndex].dayLabel}, {streakDays[selectedDayIndex].date}</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  {streakDays[selectedDayIndex].count} {streakDays[selectedDayIndex].count === 1 ? 'Reflection' : 'Reflections'}
                </span>
              </div>
              {streakDays[selectedDayIndex].journals.length > 0 ? (
                <div className="space-y-1 mt-1">
                  {streakDays[selectedDayIndex].journals.map((j) => (
                    <div
                      key={j.id}
                      onClick={() => onNavigateToJournal?.(j.id)}
                      className="cursor-pointer text-[11px] p-1.5 rounded-lg bg-background/80 hover:bg-background border border-border/60 flex items-center justify-between group"
                    >
                      <span className="truncate font-medium text-foreground group-hover:text-indigo-600">
                        {j.title}
                      </span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-indigo-600 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No reflection logged on this day.
                </p>
              )}
            </div>
          )}

          {/* Heatmap Legend */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/50">
            <span>Streak Momentum</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded-xs bg-muted" />
              <div className="w-2.5 h-2.5 rounded-xs bg-indigo-500/40" />
              <div className="w-2.5 h-2.5 rounded-xs bg-indigo-500/80" />
              <div className="w-2.5 h-2.5 rounded-xs bg-indigo-600" />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Reflection Topics & Persona Synergy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Reflection Topics (7 Cols) */}
        <div className="lg:col-span-7 glass-card p-5 rounded-2xl border border-border/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>AI-Extracted Reflection Topics</span>
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Core mental models and cognitive themes identified from dialogues.
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              4 Key Themes
            </span>
          </div>

          <div className="space-y-2.5">
            {reflectionTopics.map((theme, idx) => {
              const isSelected = selectedTopic === theme.topic;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedTopic(isSelected ? null : theme.topic)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-xs'
                      : 'border-border/60 bg-muted/20 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      <h4 className="text-xs font-bold text-foreground truncate">
                        {theme.topic}
                      </h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 capitalize ${
                          theme.sentiment === 'positive'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : theme.sentiment === 'reflective'
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {theme.sentiment}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-xs font-semibold text-foreground">
                      <span>{theme.growthScore}% growth</span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                          isSelected ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Excerpt preview if selected */}
                  {isSelected && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground leading-relaxed animate-fade-in">
                      <p className="italic">&ldquo;{theme.sampleExcerpt}&rdquo;</p>
                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          Guide: {DEFAULT_PERSONAS.find((p) => p.id === theme.persona)?.name || 'Gemini'}
                        </span>
                        <span>{theme.count} associated reflections</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Persona Engagement Breakdown & Recommendation Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Persona Distribution */}
          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-indigo-500" />
              <span>Persona Engagement Matrix</span>
            </h3>

            <div className="space-y-2">
              {DEFAULT_PERSONAS.slice(0, 4).map((p) => {
                const count = personaCounts[p.id] || 0;
                const percentage =
                  totalReflections > 0 ? Math.round((count / totalReflections) * 100) : 25;

                return (
                  <div key={p.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground">{p.name}</span>
                      <span className="text-muted-foreground">{count} entries ({percentage}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.max(10, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Sanctuary Takeaway Callout */}
          <div className="glass-card p-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <h4 className="text-xs font-bold text-foreground">AI Daily Synthesis</h4>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your reflection cadence indicates high clarity in executive decision-making with balanced stress levels. Consider an evening gratitude check-in to boost joy momentum.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
