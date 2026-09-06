export type PersonaId = 
  | 'mindful-guide'
  | 'stoic-philosopher'
  | 'socratic-mentor'
  | 'creative-muse'
  | 'executive-strategist';

export interface Persona {
  id: PersonaId;
  name: string;
  tagline: string;
  description: string;
  systemPrompt: string;
  iconName: string;
  accentColor: string;
  badge: string;
  sampleQuestions: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  personaId?: PersonaId;
  tokenCount?: number;
  location?: LocationContext | string;
}

export interface EnvironmentalTelemetry {
  temperature?: number; // °C
  humidity?: number; // %
  weatherCondition?: string; // e.g. 'Clear', 'Rainy', 'Cloudy', 'Thunderstorm'
  weatherCode?: number;
  aqi?: number; // Real ground station AQI or model AQI
  aqiCategory?: 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
  dominantPollutant?: string; // e.g. 'pm25'
  stationName?: string; // e.g. 'Malaysia Department of Environment (DOE)'
  dataSource?: 'aqicn' | 'open-meteo';
  localTime?: string; // e.g. "12:22 AM"
  localDate?: string; // e.g. "Sun, Sep 6"
  timezone?: string; // e.g. "Asia/Kuala_Lumpur"
  userConfirmed: boolean;
}

export interface LocationContext {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  formattedText?: string;
  weather?: string;
  environment?: EnvironmentalTelemetry;
}

export interface ActionItem {
  id: string;
  title: string;
  completed: boolean;
  category: string;
  dueDate?: string;
}

export interface JournalInsights {
  moodScores: {
    clarity: number;
    energy: number;
    stress: number;
    joy: number;
  };
  sentimentSummary: string;
  dominantEmotion: string;
  actionItems: ActionItem[];
  reflectionTopics: string[];
}

export interface Journal {
  id: string;
  userId: string;
  title: string;
  personaId: PersonaId;
  createdAt: number;
  updatedAt: number;
  previewText?: string;
  messageCount: number;
  tags?: string[];
  isFavorite?: boolean;
  location?: LocationContext;
  insights?: JournalInsights;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  defaultPersonaId?: PersonaId;
  createdAt: number;
  lastLoginAt: number;
}

export type ActiveView = 'journal' | 'analytics' | 'habits';

export type HabitCategory = 'mindfulness' | 'productivity' | 'wellness' | 'growth' | 'custom';

export interface HabitItem {
  id: string;
  userId: string;
  title: string;
  category: HabitCategory;
  sourceJournalId?: string;
  sourceJournalTitle?: string;
  completed: boolean;
  streakDays: number;
  lastCompletedDate?: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
}

export interface WellnessMetrics {
  clarity: number; // 0-100
  stress: number;  // 0-100 (lower is better or inverted)
  energy: number;  // 0-100
  joy: number;     // 0-100
}

export interface DayStreakInfo {
  date: string; // YYYY-MM-DD
  dayLabel: string; // Mon, Tue, etc.
  count: number;
  hasReflection: boolean;
  intensity: 0 | 1 | 2 | 3; // 0 = none, 1 = light, 2 = moderate, 3 = high
}

export interface TopicInsight {
  topic: string;
  count: number;
  sentiment: 'positive' | 'reflective' | 'challenging' | 'balanced';
  growthScore: number; // 0-100
  sampleExcerpt?: string;
}

export interface StreamChunkPayload {
  text?: string;
  done?: boolean;
  error?: string;
  tokenCount?: number;
}

