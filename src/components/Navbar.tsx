'use client';

import React from 'react';
import { User, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase/client';
import { Persona, ActiveView } from '@/lib/types/journal';
import { 
  Sparkles, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  Moon, 
  Sun, 
  Cloud, 
  CloudOff, 
  SlidersHorizontal,
  BookOpen,
  BarChart3,
  CheckSquare
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  activePersona: Persona;
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  onOpenAuth: () => void;
  onTogglePersonaModal?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isStreaming?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activePersona,
  activeView,
  onViewChange,
  onOpenAuth,
  onTogglePersonaModal,
  isDarkMode,
  onToggleDarkMode,
  isStreaming = false,
}) => {
  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  const navItems = [
    { id: 'journal' as ActiveView, label: 'Journal', icon: BookOpen },
    { id: 'analytics' as ActiveView, label: 'Analytics', icon: BarChart3 },
    { id: 'habits' as ActiveView, label: 'Action Items', icon: CheckSquare },
  ];

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-border/60 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Branding */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-sm sm:text-base tracking-tight bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-700 dark:from-white dark:via-indigo-200 dark:to-slate-300 bg-clip-text text-transparent">
              Gemini Journal
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
              <span>AI Sanctuary</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="flex items-center gap-1">
                {isFirebaseConfigured ? (
                  <>
                    <Cloud className="w-2.5 h-2.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Sync</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-2.5 h-2.5 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">Local</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Center: View Switcher Tabs */}
        <nav className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/70 shadow-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-background text-indigo-600 dark:text-indigo-400 shadow-xs border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                <span className="hidden xs:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Persona Badge & Actions (Theme, Auth) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Active Persona Badge on larger screens */}
          <button
            onClick={onTogglePersonaModal}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/80 bg-background/50 hover:bg-muted/60 transition text-xs font-medium backdrop-blur-md shadow-xs"
            title="Switch Active Persona"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="text-foreground font-semibold truncate max-w-[110px]">{activePersona.name}</span>
            <SlidersHorizontal className="w-3 h-3 text-muted-foreground ml-0.5" />
          </button>

          {isStreaming && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-medium animate-pulse border border-indigo-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="hidden md:inline">Reflecting...</span>
            </div>
          )}

          {/* Theme Switcher */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition"
            title={isDarkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Persona selector for small screens */}
          <button
            onClick={onTogglePersonaModal}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition"
            title="Select Persona"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-border/60">
              <div className="flex items-center gap-1.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-500/20">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                  </div>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
