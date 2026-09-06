'use client';

import React, { useState } from 'react';
import { MapPin, X, SlidersHorizontal, Sparkles } from 'lucide-react';
import { LocationContext } from '@/lib/types/journal';
import { EnvironmentModal } from './EnvironmentModal';
import { getAqiColorClass } from '@/lib/weather/telemetry';

interface LocationBadgeProps {
  location: LocationContext | null;
  onLocationChange: (location: LocationContext | null) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export const LocationBadge: React.FC<LocationBadgeProps> = ({
  location,
  onLocationChange,
  disabled = false,
  className = '',
  compact = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const env = location?.environment;
  const aqiColors = getAqiColorClass(env?.aqi);

  return (
    <>
      <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
        {location ? (
          /* Attached Location with Environmental Telemetry Chip */
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 dark:bg-indigo-950/40 border border-indigo-500/30 text-xs font-medium animate-fade-in shadow-xs group"
          >
            {/* Clickable body to re-open interactive map & telemetry */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={disabled}
              className="flex items-center gap-1.5 text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer text-left"
              title="Click to view or adjust environmental grounding on map"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="font-semibold truncate max-w-[90px] sm:max-w-[130px]">
                {location.city || location.locationName || 'Location'}
              </span>

              {/* Environmental metrics snippets */}
              {env?.temperature !== undefined && (
                <span className="text-muted-foreground hidden xs:inline">
                  • {env.temperature}°C
                </span>
              )}

              {env?.aqi !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-semibold border ${aqiColors.bg} ${aqiColors.text} ${aqiColors.border}`}
                  title={`Air Quality: AQI ${env.aqi} (${env.aqiCategory || 'Score'})`}
                >
                  AQI {env.aqi}
                </span>
              )}

              {env?.localTime && (
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  • {env.localTime}
                </span>
              )}

              <SlidersHorizontal className="w-3 h-3 text-muted-foreground/60 ml-0.5 group-hover:text-indigo-500 transition" />
            </button>

            {/* Detach button */}
            <button
              type="button"
              onClick={() => onLocationChange(null)}
              disabled={disabled}
              aria-label="Detach location"
              title="Detach location context"
              className="ml-0.5 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          /* Detached State Toggle Button: Opens Interactive Grounding Modal */
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={disabled}
            aria-label="Attach environmental grounding and map location"
            title="Attach verified location, weather, and air quality"
            className={`p-2 rounded-xl transition-all duration-200 shrink-0 flex items-center justify-center gap-1.5 text-xs font-medium bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 hover:border-indigo-500/40 active:scale-95 ${
              disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <MapPin className="w-4 h-4 shrink-0 text-indigo-500" />
            {!compact && (
              <span className="text-[11px] hidden sm:inline">Ground Atmosphere</span>
            )}
          </button>
        )}
      </div>

      {/* Interactive Map & Telemetry Confirmation Modal */}
      <EnvironmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentLocation={location}
        onConfirm={(confirmedLoc) => onLocationChange(confirmedLoc)}
      />
    </>
  );
};
