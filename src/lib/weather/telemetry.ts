import { EnvironmentalTelemetry } from '@/lib/types/journal';

export interface ReverseGeoResult {
  city: string;
  region: string;
  country: string;
  formattedLocation: string;
}

const DEFAULT_AQICN_TOKEN = process.env.NEXT_PUBLIC_AQICN_TOKEN || process.env.AQICN_TOKEN || '';

/**
 * Maps standard WMO Weather Codes to descriptive text and weather icons
 */
export function getWmoWeatherInfo(code: number): { condition: string; icon: string } {
  switch (code) {
    case 0:
      return { condition: 'Clear Sky', icon: '☀️' };
    case 1:
      return { condition: 'Mainly Clear', icon: '🌤️' };
    case 2:
      return { condition: 'Partly Cloudy', icon: '⛅' };
    case 3:
      return { condition: 'Overcast', icon: '☁️' };
    case 45:
    case 48:
      return { condition: 'Fog & Mist', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Gentle Drizzle', icon: '🌦️' };
    case 61:
    case 63:
    case 65:
      return { condition: 'Rain', icon: '🌧️' };
    case 71:
    case 73:
    case 75:
      return { condition: 'Snowfall', icon: '🌨️' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Rain Showers', icon: '🌧️' };
    case 95:
    case 96:
    case 99:
      return { condition: 'Thunderstorm', icon: '⛈️' };
    default:
      return { condition: 'Mild Weather', icon: '🌤️' };
  }
}

/**
 * Categorizes AQI numerical scores into health-protective tiers
 */
export function getAqiCategory(
  aqi: number
): EnvironmentalTelemetry['aqiCategory'] {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

/**
 * Returns color classes for Tailwind UI chips based on AQI value
 */
export function getAqiColorClass(aqi?: number): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  if (!aqi || aqi <= 50) {
    return {
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-500',
    };
  }
  if (aqi <= 100) {
    return {
      bg: 'bg-amber-500/10 dark:bg-amber-950/40',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-500',
    };
  }
  if (aqi <= 150) {
    return {
      bg: 'bg-orange-500/10 dark:bg-orange-950/40',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-500/30',
      dot: 'bg-orange-500',
    };
  }
  return {
    bg: 'bg-rose-500/10 dark:bg-rose-950/40',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
  };
}

/**
 * Reverse geocodes coordinates to city, administrative division, and country
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeoResult> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (!res.ok) throw new Error('Geocoding request failed');
    const data = await res.json();

    const city = data.city || data.locality || data.principalSubdivision || 'Unknown City';
    const region = data.principalSubdivision || '';
    const country = data.countryName || '';
    const formattedLocation = region && city !== region
      ? `${city}, ${region}, ${country}`
      : `${city}, ${country}`;

    return { city, region, country, formattedLocation };
  } catch {
    return {
      city: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
      region: '',
      country: '',
      formattedLocation: `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`,
    };
  }
}

/**
 * Fetches real ground-station AQI via AQICN with automatic fallback to Open-Meteo
 */
async function fetchAqiData(
  lat: number,
  lng: number
): Promise<{
  aqi?: number;
  dominantPollutant?: string;
  stationName?: string;
  dataSource: 'aqicn' | 'open-meteo';
}> {
  const token =
    process.env.NEXT_PUBLIC_AQICN_TOKEN ||
    process.env.AQICN_TOKEN ||
    DEFAULT_AQICN_TOKEN;

  // 1. Primary: AQICN Official Ground Station
  try {
    const aqicnUrl = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${token}`;
    const res = await fetch(aqicnUrl);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'ok' && typeof json.data?.aqi === 'number') {
        const attribution = json.data.attributions?.[0]?.name;
        const cityName = json.data.city?.name;
        const stationName = attribution || cityName || 'Official Ground Station';

        return {
          aqi: Math.round(json.data.aqi),
          dominantPollutant: json.data.dominentpol || 'pm25',
          stationName,
          dataSource: 'aqicn',
        };
      }
    }
  } catch (e) {
    console.warn('[Telemetry] AQICN ground station lookup failed, falling back to Open-Meteo:', e);
  }

  // 2. Fallback: Open-Meteo CAMS Model
  try {
    const meteoUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5`;
    const res = await fetch(meteoUrl);
    if (res.ok) {
      const json = await res.json();
      if (typeof json.current?.us_aqi === 'number') {
        return {
          aqi: Math.round(json.current.us_aqi),
          dominantPollutant: 'pm25',
          stationName: 'Open-Meteo CAMS Global Model',
          dataSource: 'open-meteo',
        };
      }
    }
  } catch (e) {
    console.warn('[Telemetry] Open-Meteo air quality fallback also failed:', e);
  }

  return { dataSource: 'open-meteo' };
}

/**
 * Fetches comprehensive environmental telemetry (weather, humidity, AQI, local astronomical time)
 */
export async function fetchEnvironmentalTelemetry(
  lat: number,
  lng: number
): Promise<EnvironmentalTelemetry> {
  // Run weather and AQI in parallel
  const [weatherPromise, aqiData] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
    ).then((r) => (r.ok ? r.json() : null)),
    fetchAqiData(lat, lng),
  ]);

  let temperature: number | undefined;
  let humidity: number | undefined;
  let weatherCondition = 'Clear Sky';
  let weatherCode = 0;
  let timezone = 'UTC';
  let localTime = '';
  let localDate = '';

  if (weatherPromise?.current) {
    temperature = Math.round(weatherPromise.current.temperature_2m * 10) / 10;
    humidity = Math.round(weatherPromise.current.relative_humidity_2m);
    weatherCode = weatherPromise.current.weather_code || 0;
    const wmoInfo = getWmoWeatherInfo(weatherCode);
    weatherCondition = wmoInfo.condition;
    timezone = weatherPromise.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
      const rawIso = weatherPromise.current.time; // e.g. "2026-09-06T00:20"
      const dateObj = new Date(rawIso);
      localTime = dateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      localDate = dateObj.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      localDate = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    }
  } else {
    // Fallback to client system clock
    localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    localDate = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const aqiCategory = aqiData.aqi !== undefined ? getAqiCategory(aqiData.aqi) : undefined;

  return {
    temperature,
    humidity,
    weatherCondition,
    weatherCode,
    aqi: aqiData.aqi,
    aqiCategory,
    dominantPollutant: aqiData.dominantPollutant,
    stationName: aqiData.stationName,
    dataSource: aqiData.dataSource,
    localTime,
    localDate,
    timezone,
    userConfirmed: false,
  };
}
