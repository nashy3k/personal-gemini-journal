'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Persona, LocationContext } from '@/lib/types/journal';
import { VoiceRecorder } from './VoiceRecorder';
import { LocationBadge } from './LocationBadge';
import { 
  Send, 
  Sparkles, 
  User as UserIcon, 
  Bot, 
  Cpu, 
  Copy, 
  Check, 
  ArrowDown, 
  Lightbulb, 
  CheckSquare,
  Brain,
  MapPin,
  Menu,
  SlidersHorizontal,
  PanelLeft
} from 'lucide-react';

interface JournalChatProps {
  journalTitle: string;
  messages: Message[];
  activePersona: Persona;
  isStreaming: boolean;
  streamingContent: string;
  onSendMessage: (content: string, location?: LocationContext | null) => Promise<void>;
  onUpdateTitle?: (newTitle: string) => void;
  tokenCount?: number;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenPersonaSelector?: () => void;
}

export const JournalChat: React.FC<JournalChatProps> = ({
  journalTitle,
  messages,
  activePersona,
  isStreaming,
  streamingContent,
  onSendMessage,
  onUpdateTitle,
  tokenCount = 0,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenPersonaSelector,
}) => {
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(journalTitle);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [attachedLocation, setAttachedLocation] = useState<LocationContext | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync title input
  useEffect(() => {
    setTitleInput(journalTitle);
  }, [journalTitle]);

  // Auto-scroll handler
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, streamingContent]);

  // Handle scroll position detection for "jump to bottom" button
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isFarFromBottom);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceTranscript = (text: string, isFinal: boolean) => {
    if (isFinal) {
      setInput((prev) => {
        const trimmed = prev.trim();
        const next = trimmed ? `${trimmed} ${text}` : text;
        return next;
      });
      setTimeout(adjustTextareaHeight, 50);
    }
  };

  const handleSubmit = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isStreaming) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSendMessage(text, attachedLocation);
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && onUpdateTitle && titleInput !== journalTitle) {
      onUpdateTitle(titleInput.trim());
    }
  };

  const handleGenerateActionItems = () => {
    if (isStreaming) return;
    const prompt = messages.length > 0
      ? 'Please review our conversation so far and generate a clear, structured list of actionable next steps, priorities, and habits for me.'
      : 'Please guide me in structuring actionable goals, habits, and next steps for today.';
    handleSubmit(prompt);
  };

  const handleGenerateMoodInsights = () => {
    if (isStreaming) return;
    const prompt = messages.length > 0
      ? 'Please analyze the emotional tone, cognitive patterns, and mood dynamics from our reflections, and offer gentle psychological observations and mindfulness insights.'
      : 'Please guide me through a mindful emotional check-in to explore my mood and inner feelings today.';
    handleSubmit(prompt);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Top Chat Header */}
      <div className="px-3.5 py-3 border-b border-border/60 glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 z-10">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Sidebar Toggle Button (Mobile drawer + Desktop expand when collapsed) */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`p-2 rounded-xl glass-card border border-border text-foreground hover:bg-muted/80 transition shrink-0 active:scale-95 shadow-xs ${
                isSidebarCollapsed ? 'flex' : 'md:hidden flex'
              }`}
              title={isSidebarCollapsed ? 'Expand Reflections Panel' : 'Toggle Reflections Panel'}
            >
              {isSidebarCollapsed ? (
                <PanelLeft className="w-4 h-4 text-indigo-500" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          )}

          <div className="min-w-0 flex-1">
            {isEditingTitle ? (
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                autoFocus
                className="font-bold text-sm bg-muted/60 px-2 py-0.5 rounded border border-border focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full max-w-md"
              />
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="font-bold text-sm sm:text-base text-foreground truncate cursor-pointer hover:text-indigo-600 transition flex items-center gap-1.5"
                title="Click to rename entry"
              >
                <span className="truncate">{journalTitle || 'Untitled Reflection'}</span>
                <span className="text-[10px] font-normal text-muted-foreground opacity-60 shrink-0">
                  (Click to edit)
                </span>
              </h2>
            )}

            {/* Active Persona Descriptive Badge */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/70" />
                <span className="font-medium text-foreground/80">{activePersona.name}</span>
                <span className="hidden md:inline text-muted-foreground/60">• {activePersona.tagline}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick-Action Header Buttons & Model Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          {/* Quick-Action 1: Action Items */}
          <button
            type="button"
            onClick={handleGenerateActionItems}
            disabled={isStreaming}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-xl bg-indigo-500/10 dark:bg-indigo-950/50 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 transition shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Generate structured action items and next steps"
          >
            <CheckSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px]">Action Items</span>
          </button>

          {/* Quick-Action 2: Mood Insights */}
          <button
            type="button"
            onClick={handleGenerateMoodInsights}
            disabled={isStreaming}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-xl bg-purple-500/10 dark:bg-purple-950/50 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 transition shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Analyze emotional tone and mood insights"
          >
            <Brain className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px]">Mood Insights</span>
          </button>

          {/* Token & Model Indicator - Visible on mobile landscape & portrait */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground bg-muted/40 px-2 sm:px-2.5 py-1 rounded-xl border border-border/50 shrink-0">
            <Cpu className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-500 shrink-0" />
            <span className="hidden sm:inline">Gemini 3.8 Flash</span>
            <span className="sm:hidden">3.8 Flash</span>
            {tokenCount > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="font-mono text-[9px] sm:text-[10px]">~{tokenCount}t</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
      >
        {messages.length === 0 && !isStreaming ? (
          /* Empty State / Persona Prompter */
          <div className="max-w-xl mx-auto my-auto py-12 flex flex-col items-center text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Begin your reflection with {activePersona.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md leading-relaxed">
              {activePersona.description}
            </p>

            {/* Suggested reflection prompts */}
            <div className="w-full mt-6 space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground mb-3">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Suggested prompts for reflection</span>
              </div>
              <div className="grid gap-2">
                {activePersona.sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(q)}
                    className="p-3 rounded-xl glass-card text-left text-xs font-medium text-foreground/90 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500/40 transition duration-150 flex items-center justify-between group shadow-sm"
                  >
                    <span>&ldquo;{q}&rdquo;</span>
                    <Send className="w-3 h-3 text-muted-foreground group-hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const locationText =
                typeof msg.location === 'string'
                  ? msg.location
                  : msg.location?.formattedText || msg.location?.locationName || msg.location?.city;

              return (
                <div
                  key={msg.id || index}
                  className={`flex items-start gap-3 max-w-3xl ${
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border text-xs shadow-sm ${
                      isUser
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20'
                        : 'bg-card text-indigo-600 dark:text-indigo-400 border-border'
                    }`}
                  >
                    {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`relative group rounded-2xl px-4 py-3 text-xs leading-relaxed max-w-[85%] ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/10'
                        : 'glass-card text-foreground rounded-tl-sm border border-border/80'
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed break-words">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {/* Footer / Location & Copy Button */}
                    <div
                      className={`flex items-center justify-between gap-2 mt-2 pt-1 border-t text-[10px] ${
                        isUser
                          ? 'border-indigo-400/30 text-indigo-100'
                          : 'border-border/40 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {locationText && (
                          <span className="flex items-center gap-1 opacity-90 font-medium">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate max-w-[140px]">{locationText}</span>
                            {typeof msg.location === 'object' && msg.location?.environment && (
                              <span className="opacity-80 text-[9px] font-mono">
                                ({msg.location.environment.temperature}°C • AQI {msg.location.environment.aqi})
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {!isUser && (
                        <button
                          onClick={() => copyToClipboard(msg.content, index)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"
                          title="Copy response"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Live Streaming Response Bubble */}
            {isStreaming && (
              <div className="flex items-start gap-3 max-w-3xl mr-auto animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-card text-indigo-600 dark:text-indigo-400 border border-border flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>

                <div className="glass-card text-foreground rounded-2xl rounded-tl-sm px-4 py-3 text-xs leading-relaxed max-w-[85%] border border-indigo-500/30 shadow-md">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed break-words">
                    <ReactMarkdown>{streamingContent || 'Thinking and reflecting...'}</ReactMarkdown>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                    <span>Synthesizing insight...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Jump to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-28 right-6 p-2 rounded-full glass-card border border-border shadow-lg text-muted-foreground hover:text-foreground hover:scale-105 transition active:scale-95 z-20"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Input Form Bar with Voice Dictation & Location Toolbar */}
      <div className="p-4 border-t border-border/60 glass-panel z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="max-w-4xl mx-auto flex flex-col bg-muted/40 rounded-2xl p-2 border border-border/70 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm"
        >
          {/* Main Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={`Express your thoughts to ${activePersona.name}... (Enter to send, Shift+Enter for newline)`}
            className="w-full bg-transparent border-0 resize-none px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none max-h-44 min-h-[38px] leading-relaxed"
          />

          {/* Toolbar with VoiceRecorder, LocationBadge, and Send */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30 mt-1 px-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <VoiceRecorder
                onTranscript={handleVoiceTranscript}
                onListeningChange={setIsVoiceRecording}
                disabled={isStreaming}
              />
              <LocationBadge
                location={attachedLocation}
                onLocationChange={setAttachedLocation}
                disabled={isStreaming}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-30 disabled:hover:bg-indigo-600 transition shadow-sm active:scale-95 shrink-0 flex items-center justify-center"
                title="Send reflection"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Footer Context Caption */}
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] text-muted-foreground/80 mt-2 px-2">
          <div className="flex items-center gap-2">
            <span>Private, encrypted multi-turn AI journaling.</span>
            {attachedLocation && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium hidden sm:inline">
                • {attachedLocation.formattedText || attachedLocation.city} attached
              </span>
            )}
          </div>
          <span>End-to-End Context Grounding</span>
        </div>
      </div>
    </div>
  );
};
