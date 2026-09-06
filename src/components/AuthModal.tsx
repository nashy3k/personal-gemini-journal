'use client';

import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { ensureFirebaseInitialized, googleProvider, isFirebaseAvailable } from '@/lib/firebase/client';
import { X, Mail, Lock, User as UserIcon, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDemoLogin?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onDemoLogin,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      ensureFirebaseInitialized().then(({ auth: activeAuth }) => {
        setIsConfigured(Boolean(activeAuth));
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getFriendlyError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password combination.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in was cancelled.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network error. Please check your connection.';
    }
    return err?.message || 'Authentication failed. Please try again.';
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const { auth: activeAuth } = await ensureFirebaseInitialized();
      if (!activeAuth) {
        if (onDemoLogin) {
          onDemoLogin();
          onClose();
          return;
        }
        throw new Error('Firebase environment variables are not configured.');
      }
      await signInWithPopup(activeAuth, googleProvider);
      onClose();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { auth: activeAuth } = await ensureFirebaseInitialized();
      if (!activeAuth) {
        if (onDemoLogin) {
          onDemoLogin();
          onClose();
          return;
        }
        throw new Error('Firebase environment variables are not configured.');
      }

      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(activeAuth, email, password);
        if (name.trim() && userCred.user) {
          await updateProfile(userCred.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(activeAuth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl glass-card p-6 md:p-8 bg-background/95 border border-border shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-3 border border-indigo-500/20 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {isSignUp ? 'Create your Journal' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isSignUp
              ? 'Begin your guided AI reflection journey across all your devices.'
              : 'Sign in to access your synchronized reflections & insights.'}
          </p>
        </div>

        {/* Firebase Warning or Offline Demo Info */}
        {!isConfigured && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Demo Sandbox Mode</p>
              <p className="text-[11px] opacity-90 mb-2">
                Firebase keys are not configured. You can continue as a Demo User with local storage persistence.
              </p>
              {onDemoLogin && (
                <button
                  type="button"
                  onClick={() => { onDemoLogin(); onClose(); }}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
                >
                  Continue as Demo User
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/80 font-medium text-xs transition duration-150 disabled:opacity-50 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative my-5 flex items-center justify-center">
          <div className="border-t border-border w-full" />
          <span className="bg-background px-3 text-[11px] text-muted-foreground uppercase font-semibold">
            Or with email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Your Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  required={isSignUp}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/50 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/50 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/50 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition duration-150 shadow-md shadow-indigo-500/20 disabled:opacity-50"
          >
            <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Toggle Sign in / Sign up */}
        <div className="mt-5 text-center text-xs text-muted-foreground">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Sign Up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
