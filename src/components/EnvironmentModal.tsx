'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LocationContext, EnvironmentalTelemetry } from '@/lib/types/journal';
import {
  fetchEnvironmentalTelemetry,
  reverseGeocode,
  getAqiColorClass,
} from '@/lib/weather/telemetry';
import {
  MapPin,
  X,
  Check,
  RefreshCw,
  Clock,
  Thermometer,
  Droplets,
  Wind,
  ShieldCheck,
  Compass,
  AlertCircle
} from 'lucide-react';

interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationContext | null;
  onConfirm: (confirmedLocation: LocationContext) => void;
}

export const EnvironmentModal: React.FC<EnvironmentModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onConfirm,
}) => {
  // Default coordinates (Kuala Lumpur default if nothing provided)
  const defaultLat = currentLocation?.latitude ?? 3.139;
  const defaultLng = currentLocation?.longitude ?? 101.6869;

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: defaultLat,
    lng: defaultLng,
  });
  const [cityInfo, setCityInfo] = useState<{ city: string; formatted: string }>({
    city: currentLocation?.city || 'Detecting city...',
    formatted: currentLocation?.locationName || 'Detecting area...',
  });
  const [telemetry, setTelemetry] = useState<EnvironmentalTelemetry | null>(
    currentLocation?.environment || null
  );
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Sync coords when modal opens with new currentLocation
  useEffect(() => {
    if (isOpen) {
      const lat = currentLocation?.latitude ?? defaultLat;
      const lng = currentLocation?.longitude ?? defaultLng;
      setCoords({ lat, lng });
      loadTelemetryForCoords(lat, lng);
    }
  }, [isOpen]);

  // Load telemetry and reverse geocode
  const loadTelemetryForCoords = async (lat: number, lng: number) => {
    setIsLoadingTelemetry(true);
    try {
      const [geo, tel] = await Promise.all([
        reverseGeocode(lat, lng),
        fetchEnvironmentalTelemetry(lat, lng),
      ]);
      setCityInfo({
        city: geo.city,
        formatted: geo.formattedLocation,
      });
      setTelemetry(tel);
    } catch (e) {
      console.error('[EnvironmentModal] Failed to load telemetry:', e);
    } finally {
      setIsLoadingTelemetry(false);
    }
  };

  // Initialize Leaflet map safely client-side
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isSubscribed = true;

    // Dynamically load Leaflet CSS if not already injected
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((leafletModule) => {
      if (!isSubscribed || !mapContainerRef.current) return;
      const L = leafletModule.default || leafletModule;

      // Clean up previous map instance if it exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Configure default marker icons
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 13,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      // Add draggable marker
      const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.bindPopup('<b>Your Reflection Sanctuary</b><br>Drag pin or click map to adjust.').openPopup();

      // Handle marker drag
      marker.on('dragend', (event: any) => {
        const { lat, lng } = event.target.getLatLng();
        setCoords({ lat, lng });
        loadTelemetryForCoords(lat, lng);
      });

      // Handle map click
      map.on('click', (event: any) => {
        const { lat, lng } = event.latlng;
        marker.setLatLng([lat, lng]);
        setCoords({ lat, lng });
        loadTelemetryForCoords(lat, lng);
      });

      // Invalidate map size after modal animation
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);
    });

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Request browser GPS
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setIsGpsLoading(false);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 14);
          markerRef.current.setLatLng([lat, lng]);
        }
        loadTelemetryForCoords(lat, lng);
      },
      (err) => {
        console.warn('GPS detection error:', err);
        setIsGpsLoading(false);
        alert('Could not retrieve GPS location. You can click on the map to pinpoint your location.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Confirm and attach location
  const handleConfirm = () => {
    if (!telemetry) return;

    const confirmedLocation: LocationContext = {
      latitude: coords.lat,
      longitude: coords.lng,
      city: cityInfo.city,
      locationName: cityInfo.formatted,
      timezone: telemetry.timezone,
      weather: telemetry.weatherCondition,
      environment: {
        ...telemetry,
        userConfirmed: true,
      },
    };

    onConfirm(confirmedLocation);
    onClose();
  };

  if (!isOpen) return null;

  const aqiColors = getAqiColorClass(telemetry?.aqi);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-background rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <span>Environmental & Somatic Grounding</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  Human-in-the-Loop
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Verify or adjust your location on the map to ground your reflection in real atmospheric telemetry.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Map Container */}
          <div className="relative rounded-xl overflow-hidden border border-border/80 shadow-inner">
            <div
              ref={mapContainerRef}
              className="w-full h-52 sm:h-60 bg-slate-900/10 z-0"
            />
            {/* GPS re-center floating button */}
            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={isGpsLoading}
              className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/95 hover:bg-background text-foreground text-xs font-semibold shadow-md border border-border backdrop-blur-md transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${isGpsLoading ? 'animate-spin' : ''}`} />
              <span>{isGpsLoading ? 'Detecting...' : 'Use Current GPS'}</span>
            </button>
            <div className="absolute bottom-2 left-2 z-10 text-[10px] bg-background/90 px-2 py-0.5 rounded-md border border-border/60 text-muted-foreground">
              💡 Tip: Click anywhere on map or drag pin to relocate
            </div>
          </div>

          {/* Current Location Pin Details */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-xs text-foreground truncate">
                  {cityInfo.city}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {cityInfo.formatted}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 text-[10px] font-mono text-muted-foreground">
              {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°
            </div>
          </div>

          {/* Live Environmental Telemetry Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>Atmospheric Telemetry</span>
                {isLoadingTelemetry && (
                  <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin" />
                )}
              </span>
              {telemetry?.stationName && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[240px]">
                  Station: <strong>{telemetry.stationName}</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Card 1: True Local Time */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Local Time</span>
                </div>
                <div className="font-bold text-sm sm:text-base text-foreground">
                  {telemetry?.localTime || '--:--'}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {telemetry?.localDate || 'Today'}
                </div>
              </div>

              {/* Card 2: Temperature & Weather */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                  <span>Weather</span>
                </div>
                <div className="font-bold text-sm sm:text-base text-foreground">
                  {telemetry?.temperature !== undefined ? `${telemetry.temperature}°C` : '--°C'}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {telemetry?.weatherCondition || 'Mild'}
                </div>
              </div>

              {/* Card 3: Relative Humidity */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Droplets className="w-3.5 h-3.5 text-sky-500" />
                  <span>Humidity</span>
                </div>
                <div className="font-bold text-sm sm:text-base text-foreground">
                  {telemetry?.humidity !== undefined ? `${telemetry.humidity}%` : '--%'}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {telemetry?.humidity && telemetry.humidity > 75
                    ? 'High Moisture'
                    : telemetry?.humidity && telemetry.humidity < 40
                    ? 'Dry Air'
                    : 'Comfortable'}
                </div>
              </div>

              {/* Card 4: Air Quality (AQICN / Open-Meteo) */}
              <div className={`p-3 rounded-xl border space-y-1 ${aqiColors.bg} ${aqiColors.border}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                    <Wind className="w-3.5 h-3.5" />
                    <span>Air Quality</span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${aqiColors.dot}`} />
                </div>
                <div className="font-bold text-sm sm:text-base text-foreground flex items-baseline gap-1">
                  <span>{telemetry?.aqi !== undefined ? telemetry.aqi : '--'}</span>
                  <span className="text-[10px] font-normal opacity-80">AQI</span>
                </div>
                <div className={`text-[10px] font-semibold truncate ${aqiColors.text}`}>
                  {telemetry?.aqiCategory || 'Detecting...'}
                </div>
              </div>
            </div>
          </div>

          {/* Somatic Psychology Insight Box */}
          <div className="p-3 rounded-xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20 text-xs flex gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground">Why Environmental Grounding Matters</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Circadian hour, high humidity, or elevated PM2.5 particulate levels frequently induce subtle somatic lethargy or brain fog. Confirming these atmospheric conditions empowers Gemini to differentiate true emotional exhaustion from ambient physical stressors.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-border/70 flex items-center justify-between bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoadingTelemetry}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Attach to Reflection</span>
          </button>
        </div>
      </div>
    </div>
  );
};
