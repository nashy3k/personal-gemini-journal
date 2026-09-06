'use client';

import React from 'react';
import { Persona, PersonaId } from '@/lib/types/journal';
import { DEFAULT_PERSONAS } from '@/lib/constants/personas';
import { 
  HeartHandshake, 
  Shield, 
  HelpCircle, 
  Sparkles, 
  Compass, 
  Check, 
  X,
  LucideIcon 
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  HeartHandshake,
  Shield,
  HelpCircle,
  Sparkles,
  Compass,
};

interface PersonaSelectorProps {
  selectedPersonaId: PersonaId;
  onSelectPersona: (persona: Persona) => void;
  isOpen?: boolean;
  onClose?: () => void;
  asModal?: boolean;
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  selectedPersonaId,
  onSelectPersona,
  isOpen = true,
  onClose,
  asModal = false,
}) => {
  if (asModal && !isOpen) return null;

  const content = (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-foreground">Choose Reflection Persona</h3>
          <p className="text-xs text-muted-foreground">
            Select the mindset and reflective style for your AI journaling companion.
          </p>
        </div>
        {asModal && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DEFAULT_PERSONAS.map((persona) => {
          const isSelected = persona.id === selectedPersonaId;
          const Icon = ICON_MAP[persona.iconName] || Sparkles;

          return (
            <div
              key={persona.id}
              onClick={() => {
                onSelectPersona(persona);
                if (asModal && onClose) onClose();
              }}
              className={`relative cursor-pointer rounded-xl p-4 transition-all duration-200 border text-left flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                  : 'bg-card/50 hover:bg-card border-border/70 hover:border-indigo-500/40 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border/50">
                    {persona.badge}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  {persona.name}
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                </h4>

                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5 line-clamp-1">
                  {persona.tagline}
                </p>

                <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                  {persona.description}
                </p>
              </div>

              {/* Sample question hint */}
              <div className="mt-3 pt-2 border-t border-border/40">
                <p className="text-[10px] text-muted-foreground italic line-clamp-1">
                  &ldquo;{persona.sampleQuestions[0]}&rdquo;
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (asModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="relative w-full max-w-3xl rounded-2xl glass-card p-6 bg-background/95 border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
