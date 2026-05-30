/**
 * FD-09 Daily Life AI Lesson Generator — types.
 */

export type DailyActivitySource =
  | 'manual'
  | 'location'
  | 'prompt'
  | 'saved_phrase'
  | 'note'
  | 'photo'
  | 'voice_note'

export type VenueType =
  | 'cafe'
  | 'restaurant'
  | 'supermarket'
  | 'train_station'
  | 'pharmacy'
  | 'office'
  | 'school_daycare'
  | 'municipality'
  | 'doctor'
  | 'other'

export interface DailyActivityEvent {
  eventId: string
  timestamp: string
  sourceType: DailyActivitySource
  venueType?: VenueType
  title: string
  note?: string
  hasPhoto: boolean
  hasVoice: boolean
  confidence?: number
  removable: boolean
}

export interface CaptureMomentInput {
  title: string
  venueType?: VenueType
  note?: string
  hasPhoto?: boolean
  hasVoice?: boolean
}

export type GenerationStatus = 'idle' | 'pending' | 'generating' | 'ready' | 'failed'

export interface DailyLessonGenerationStatus {
  status: GenerationStatus
  startedAt?: string
  completedAt?: string
  error?: string
}

export interface GeneratedDailyLessonModule {
  moduleId: string
  type: 'phrases' | 'vocabulary' | 'quiz' | 'scenario_recap' | 'pronunciation' | 'practice'
  title: string
  description?: string
  itemCount?: number
  scenarioId?: string
}

export interface GeneratedDailyLesson {
  lessonId: string
  date: string
  title: string
  sourceEvents: DailyActivityEvent[]
  scenarios: { scenarioId: string; title: string; venueType?: VenueType }[]
  modules: GeneratedDailyLessonModule[]
  phrases: { dutch: string; translation: string }[]
  vocabulary: { dutch: string; translation: string }[]
  completionStatus: 'not_started' | 'in_progress' | 'completed'
  premiumRequired: boolean
  generationStatus: DailyLessonGenerationStatus
}

export interface DailyLessonSummary {
  date: string
  lessonId?: string
  eventCount: number
  canGenerate: boolean
  generationStatus: GenerationStatus
  todayLesson?: GeneratedDailyLesson
}

export interface DailyLessonHistoryItem {
  lessonId: string
  date: string
  title: string
  scenariosIncluded: string[]
  completionStatus: GeneratedDailyLesson['completionStatus']
  isSaved?: boolean
}

export interface DailyLessonPreferences {
  enabled: boolean
  useLocation: boolean
  usePhotoAnalysis: boolean
  useVoiceNotes: boolean
  manualOnlyMode: boolean
  autoGenerateAtEndOfDay: boolean
  historyRetentionDays?: number
}

export type PermissionState = 'not_requested' | 'granted' | 'denied' | 'blocked' | 'unsupported'
