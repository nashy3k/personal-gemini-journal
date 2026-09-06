'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase/client';
import {
  subscribeToJournals,
  subscribeToMessages,
  createJournal,
  updateJournal,
  deleteJournal,
  addJournalMessage,
  subscribeToHabits,
  createHabit,
  deleteHabit,
  toggleHabitCompletion,
  clearAllUserData,
} from '@/lib/firebase/firestore';
import { Journal, Message, Persona, PersonaId, LocationContext, ActiveView, HabitItem, HabitCategory } from '@/lib/types/journal';
import { DEFAULT_PERSONAS } from '@/lib/constants/personas';
import { Navbar } from '@/components/Navbar';
import { JournalSidebar } from '@/components/JournalSidebar';
import { JournalChat } from '@/components/JournalChat';
import { PersonaSelector } from '@/components/PersonaSelector';
import { AuthModal } from '@/components/AuthModal';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { HabitsTracker } from '@/components/HabitsTracker';
import { Menu, X } from 'lucide-react';

export default function JournalApp() {
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Active View State ('journal' | 'analytics' | 'habits')
  const [activeView, setActiveView] = useState<ActiveView>('journal');

  // Persona State
  const [activePersona, setActivePersona] = useState<Persona>(DEFAULT_PERSONAS[0]);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);

  // Journal and Messages State
  const [journals, setJournals] = useState<Journal[]>([]);
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingJournals, setIsLoadingJournals] = useState(true);

  // Habits State
  const [habits, setHabits] = useState<HabitItem[]>([]);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  // UI Theme & Mobile/Desktop Sidebar State
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  // Current active user ID (real or demo)
  const currentUserId = user ? user.uid : 'demo-user-local';

  // 1. Dark Mode initialization
  useEffect(() => {
    const isDark =
      localStorage.getItem('theme') !== 'light' &&
      (localStorage.getItem('theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  // 2. Auth state subscription
  useEffect(() => {
    if (auth && isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          setIsDemoUser(false);
        }
      });
      return () => unsubscribe();
    } else {
      setIsDemoUser(true);
    }
  }, []);

  const hasAutoSeeded = useRef(false);

  // 3. Subscribe to user journals
  useEffect(() => {
    setIsLoadingJournals(true);
    const unsubscribe = subscribeToJournals(
      currentUserId,
      (fetchedJournals) => {
        setJournals(fetchedJournals);
        setIsLoadingJournals(false);

        // Auto-select first journal if none selected or if previously selected was deleted
        if (fetchedJournals.length > 0) {
          setSelectedJournalId((prevId) => {
            const exists = fetchedJournals.some((j) => j.id === prevId);
            return exists ? prevId : fetchedJournals[0].id;
          });
        } else if (
          !hasAutoSeeded.current &&
          currentUserId &&
          typeof window !== 'undefined' &&
          !localStorage.getItem('has_dismissed_welcome_seed')
        ) {
          hasAutoSeeded.current = true;
          createJournal(currentUserId, {
            title: '✨ Welcome Reflection',
            personaId: activePersona.id,
            initialMessage:
              'Welcome to your private AI sanctuary! Take a quiet breath and express whatever is on your mind today.',
          })
            .then((created) => {
              setSelectedJournalId(created.id);
            })
            .catch((err) => console.warn('Could not auto-seed welcome journal:', err));
        } else {
          setSelectedJournalId(null);
        }
      },
      (err) => {
        console.error('Error fetching journals:', err);
        setIsLoadingJournals(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserId, activePersona.id]);

  // 4. Subscribe to user habits
  useEffect(() => {
    const unsubscribe = subscribeToHabits(
      currentUserId,
      (fetchedHabits) => {
        setHabits(fetchedHabits);
      },
      (err) => {
        console.error('Error fetching habits:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  // 5. Sync active persona when selected journal changes
  const activeJournal = journals.find((j) => j.id === selectedJournalId);

  useEffect(() => {
    if (activeJournal?.personaId) {
      const matched = DEFAULT_PERSONAS.find((p) => p.id === activeJournal.personaId);
      if (matched) {
        setActivePersona(matched);
      }
    }
  }, [selectedJournalId, activeJournal?.personaId]);

  // 6. Subscribe to messages of active journal
  useEffect(() => {
    if (!selectedJournalId) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(
      currentUserId,
      selectedJournalId,
      (fetchedMessages) => {
        setMessages(fetchedMessages);
        // Approximate token calculation
        const totalChars = fetchedMessages.reduce((acc, m) => acc + m.content.length, 0);
        setEstimatedTokens(Math.round(totalChars / 4));
      }
    );

    return () => unsubscribe();
  }, [currentUserId, selectedJournalId]);

  // Create new journal action
  const handleCreateNewJournal = async () => {
    try {
      const newJournal = await createJournal(currentUserId, {
        title: `Reflection ${new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}`,
        personaId: activePersona.id,
      });
      setSelectedJournalId(newJournal.id);
      setActiveView('journal');
      setIsMobileSidebarOpen(false);
    } catch (err) {
      console.error('Failed to create journal:', err);
    }
  };

  // Delete journal action
  const handleDeleteJournal = async (journalId: string) => {
    await deleteJournal(currentUserId, journalId);
    if (selectedJournalId === journalId) {
      const remaining = journals.filter((j) => j.id !== journalId);
      setSelectedJournalId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Update journal title
  const handleUpdateTitle = async (newTitle: string) => {
    if (!selectedJournalId) return;
    await updateJournal(currentUserId, selectedJournalId, { title: newTitle });
  };

  // Persona selection handler
  const handleSelectPersona = async (persona: Persona) => {
    setActivePersona(persona);
    if (selectedJournalId) {
      await updateJournal(currentUserId, selectedJournalId, { personaId: persona.id });
    }
  };

  // Habit Actions
  const handleToggleHabit = async (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    let updatedTarget: HabitItem | undefined;

    // 1. Instant optimistic UI update
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const willBeCompleted = !h.completed;
        let streak = h.streakDays || 0;
        if (willBeCompleted) {
          if (h.lastCompletedDate !== today) streak += 1;
        } else {
          streak = Math.max(0, streak - 1);
        }
        updatedTarget = {
          ...h,
          completed: willBeCompleted,
          streakDays: streak,
          lastCompletedDate: willBeCompleted ? today : h.lastCompletedDate,
          updatedAt: Date.now(),
        };
        return updatedTarget;
      })
    );

    // 2. Persist to storage / cloud
    try {
      await toggleHabitCompletion(currentUserId, habitId, updatedTarget);
    } catch (err) {
      console.error('Failed to toggle habit:', err);
    }
  };

  const handleCreateHabit = async (data: {
    title: string;
    category?: HabitCategory;
    sourceJournalId?: string;
    sourceJournalTitle?: string;
  }) => {
    try {
      const created = await createHabit(currentUserId, {
        ...data,
        sourceJournalId: data.sourceJournalId || selectedJournalId || undefined,
        sourceJournalTitle: data.sourceJournalTitle || activeJournal?.title || undefined,
      });
      if (created) {
        setHabits((prev) => {
          const exists = prev.some((h) => h.id === created.id);
          return exists ? prev : [created, ...prev];
        });
      }
    } catch (err) {
      console.error('Failed to create habit:', err);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    try {
      await deleteHabit(currentUserId, habitId);
    } catch (err) {
      console.error('Failed to delete habit:', err);
    }
  };

  // Multi-turn message sending & SSE real-time streaming
  const handleSendMessage = async (content: string, location?: LocationContext | null) => {
    let targetJournalId = selectedJournalId;

    // If no journal exists yet, create one on the fly
    if (!targetJournalId) {
      const newJournal = await createJournal(currentUserId, {
        title: content.slice(0, 32) + (content.length > 32 ? '...' : ''),
        personaId: activePersona.id,
      });
      targetJournalId = newJournal.id;
      setSelectedJournalId(newJournal.id);
    }

    // 1. Add User message to Firestore (with location if provided)
    const userMsg: Omit<Message, 'id'> = {
      role: 'user',
      content,
      timestamp: Date.now(),
      personaId: activePersona.id,
      ...(location ? { location } : {}),
    };
    await addJournalMessage(currentUserId, targetJournalId, userMsg);

    // If location is provided and journal doesn't have location yet, update journal
    if (location && targetJournalId) {
      updateJournal(currentUserId, targetJournalId, { location }).catch((err) =>
        console.warn('Could not update journal location:', err)
      );
    }

    // Prepare message history payload for multi-turn context
    const currentHistory = [...messages, { id: 'temp-user', ...userMsg }];

    // 2. Start SSE Streaming
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentHistory,
          personaId: activePersona.id,
          location: location || activeJournal?.location || null,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to start streaming from API');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const rawChunk = decoder.decode(value, { stream: true });
        const lines = rawChunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', '').trim());
              if (data.text) {
                accumulatedText += data.text;
                setStreamingContent(accumulatedText);
              }
              if (data.done) {
                break;
              }
            } catch (jsonErr) {
              // Ignore partial JSON parse chunks
            }
          }
        }
      }

      // 3. Save completed model response to Firestore
      if (accumulatedText.trim()) {
        await addJournalMessage(currentUserId, targetJournalId, {
          role: 'model',
          content: accumulatedText.trim(),
          timestamp: Date.now(),
          personaId: activePersona.id,
        });
      }
    } catch (streamError) {
      console.error('Stream processing error:', streamError);
      // Fallback model message on error
      await addJournalMessage(currentUserId, targetJournalId, {
        role: 'model',
        content:
          'I am present with you, though there was a brief connection hiccup. Take a breath and feel free to continue when ready.',
        timestamp: Date.now(),
        personaId: activePersona.id,
      });
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Navigation */}
      <Navbar
        user={user}
        activePersona={activePersona}
        activeView={activeView}
        onViewChange={(view) => setActiveView(view)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onTogglePersonaModal={() => setIsPersonaModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        isStreaming={isStreaming}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Render based on activeView */}
        {activeView === 'journal' && (
          <>
            {/* Sidebar (Desktop + Mobile Drawer) */}
            <div
              className={`fixed inset-y-0 left-0 z-40 transform md:relative md:translate-x-0 transition-all duration-300 ease-in-out ${
                isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              } ${
                isDesktopSidebarCollapsed
                  ? 'md:w-0 md:opacity-0 md:pointer-events-none overflow-hidden'
                  : 'md:w-80 lg:w-96 md:opacity-100'
              }`}
            >
              <div className="h-full pt-16 md:pt-0 w-80 lg:w-96">
                <JournalSidebar
                  journals={journals}
                  selectedJournalId={selectedJournalId}
                  onSelectJournal={(id) => {
                    setSelectedJournalId(id);
                    setActiveView('journal');
                    setIsMobileSidebarOpen(false);
                  }}
                  onCreateNewJournal={handleCreateNewJournal}
                  onDeleteJournal={handleDeleteJournal}
                  isLoading={isLoadingJournals}
                  onToggleCollapse={() => setIsDesktopSidebarCollapsed(true)}
                />
              </div>
            </div>

            {/* Mobile backdrop */}
            {isMobileSidebarOpen && (
              <div
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-xs"
              />
            )}

            {/* Multi-turn Chat Area */}
            <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
              <JournalChat
                journalTitle={activeJournal?.title || 'New Reflection'}
                messages={messages}
                activePersona={activePersona}
                isStreaming={isStreaming}
                streamingContent={streamingContent}
                onSendMessage={handleSendMessage}
                onUpdateTitle={handleUpdateTitle}
                tokenCount={estimatedTokens}
                isSidebarCollapsed={isDesktopSidebarCollapsed}
                onToggleSidebar={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setIsMobileSidebarOpen(!isMobileSidebarOpen);
                  } else {
                    setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed);
                  }
                }}
                onOpenPersonaSelector={() => setIsPersonaModalOpen(true)}
              />
            </main>
          </>
        )}

        {activeView === 'analytics' && (
          <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
            <AnalyticsDashboard
              journals={journals}
              activePersona={activePersona}
              onNavigateToJournal={(id) => {
                if (id) setSelectedJournalId(id);
                setActiveView('journal');
              }}
              onCreateNewReflection={handleCreateNewJournal}
              onClearAllData={async () => {
                await clearAllUserData(currentUserId);
                setJournals([]);
                setMessages([]);
                setSelectedJournalId(null);
              }}
            />
          </main>
        )}

        {activeView === 'habits' && (
          <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
            <HabitsTracker
              habits={habits}
              onToggleHabit={handleToggleHabit}
              onCreateHabit={handleCreateHabit}
              onDeleteHabit={handleDeleteHabit}
              userDisplayName={user?.displayName || 'Journaler'}
              onCreateReflection={handleCreateNewJournal}
            />
          </main>
        )}
      </div>

      {/* Persona Selection Modal */}
      <PersonaSelector
        selectedPersonaId={activePersona.id}
        onSelectPersona={handleSelectPersona}
        asModal={true}
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onDemoLogin={() => {
          setIsDemoUser(true);
          setUser({
            uid: 'demo-user-local',
            displayName: 'Guest Journaler',
            email: 'guest@geminijournal.local',
            photoURL: null,
          } as unknown as User);
        }}
      />
    </div>
  );
}
