'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Square, Radio, AlertCircle } from 'lucide-react';

interface VoiceRecorderProps {
  /**
   * Called when speech is recognized.
   * `text` is the newly dictated chunk or accumulated transcript.
   * `isFinal` indicates whether the phrase segment is finalized.
   */
  onTranscript: (text: string, isFinal: boolean) => void;
  /**
   * Optional callback when recording status changes.
   */
  onListeningChange?: (isListening: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscript,
  onListeningChange,
  disabled = false,
  className = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(1);

  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef(false);

  // Check Web Speech API support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  // Update parent about listening status
  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  // Subtle audio wave animation simulation while recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening) {
      interval = setInterval(() => {
        setAudioLevel(Math.floor(Math.random() * 4) + 1);
      }, 150);
    } else {
      setAudioLevel(1);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        isManuallyStoppedRef.current = true;
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    setErrorMessage(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMessage('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        isManuallyStoppedRef.current = false;
      };

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript;
          } else {
            interimChunk += transcript;
          }
        }

        if (finalChunk.trim()) {
          onTranscript(finalChunk.trim(), true);
        } else if (interimChunk.trim()) {
          onTranscript(interimChunk.trim(), false);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[VoiceRecorder] Speech recognition event error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMessage('Microphone access denied. Please allow microphone permissions in your browser.');
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // No speech detected, graceful ignore
        } else if (event.error !== 'aborted') {
          setErrorMessage(`Speech recognition notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // If not stopped manually and still supposed to be listening, restart for continuous dictation
        if (!isManuallyStoppedRef.current && isListening) {
          try {
            recognition.start();
            return;
          } catch (err) {
            // fallback stop
          }
        }
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('[VoiceRecorder] Failed to start recognition:', err);
      setErrorMessage(err.message || 'Could not start microphone');
      setIsListening(false);
    }
  }, [isListening, onTranscript]);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore stop error
      }
    }
    setIsListening(false);
  }, []);

  const toggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Fallback state if browser does not support SpeechRecognition
  if (!isSupported) {
    return (
      <div className="relative inline-flex items-center group">
        <button
          type="button"
          disabled
          className={`p-2 rounded-xl text-muted-foreground/40 bg-muted/20 border border-border/40 cursor-not-allowed transition ${className}`}
          title="Voice dictation is not supported in this browser. Use Chrome, Edge, or Safari."
        >
          <MicOff className="w-4 h-4" />
        </button>
        <span className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 text-[10px] text-muted-foreground bg-popover border border-border rounded shadow-md whitespace-nowrap z-30">
          Voice dictation unsupported in this browser
        </span>
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      {/* Microphone Main Button with Animated Pulsing Waves */}
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled}
        aria-label={isListening ? 'Stop voice dictation' : 'Start voice dictation'}
        title={isListening ? 'Stop dictation (Listening...)' : 'Voice Dictation (Web Speech API)'}
        className={`relative p-2 rounded-xl transition-all duration-200 shrink-0 flex items-center justify-center ${
          isListening
            ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 scale-105 ring-2 ring-rose-400/50'
            : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 hover:border-indigo-500/40 active:scale-95'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {/* Pulsing Concentric Ripple Wave effect when listening */}
        {isListening && (
          <>
            <span className="absolute -inset-1 rounded-xl bg-rose-500/30 animate-ping pointer-events-none" />
            <span className="absolute -inset-2 rounded-xl bg-rose-500/15 animate-pulse pointer-events-none" />
          </>
        )}

        {isListening ? (
          <Square className="w-4 h-4 fill-current relative z-10" />
        ) : (
          <Mic className="w-4 h-4 relative z-10" />
        )}
      </button>

      {/* Live Recording Waves & Indicator Pill */}
      {isListening && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-medium animate-fade-in shadow-xs">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping mr-0.5" />
          <span className="font-mono text-[10px] tracking-wide">Listening</span>
          
          {/* Animated Equalizer Wave Bars */}
          <div className="flex items-center gap-0.5 ml-1 h-3">
            <span
              className="w-0.5 bg-rose-500 rounded-full transition-all duration-150"
              style={{ height: `${Math.max(4, audioLevel * 3)}px` }}
            />
            <span
              className="w-0.5 bg-rose-500 rounded-full transition-all duration-150"
              style={{ height: `${Math.max(4, ((audioLevel + 2) % 4 + 1) * 3)}px` }}
            />
            <span
              className="w-0.5 bg-rose-500 rounded-full transition-all duration-150"
              style={{ height: `${Math.max(4, ((audioLevel + 1) % 4 + 1) * 3)}px` }}
            />
          </div>
        </div>
      )}

      {/* Error Message Tooltip */}
      {errorMessage && (
        <div className="absolute bottom-full mb-2 left-0 p-2 text-[10px] bg-red-950 text-red-200 border border-red-800/60 rounded-lg shadow-lg flex items-center gap-1.5 max-w-xs z-30 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-xs opacity-70 hover:opacity-100 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
