/**
 * FD-09 — daily life lesson service contracts.
 */

import type {
  DailyActivityEvent,
  DailyLessonSummary,
  GeneratedDailyLesson,
  DailyLessonHistoryItem,
  CaptureMomentInput,
  DailyLessonPreferences,
  DailyLessonGenerationStatus,
  PermissionState,
} from '../types'

export interface DailyLessonService {
  getTodaySummary(): Promise<DailyLessonSummary>
  getTodayLesson(): Promise<GeneratedDailyLesson | null>
  getLessonById(lessonId: string): Promise<GeneratedDailyLesson | null>
  getLessonHistory(): Promise<DailyLessonHistoryItem[]>
}

export interface DailyActivityService {
  getTodayActivities(): Promise<DailyActivityEvent[]>
  captureMoment(input: CaptureMomentInput): Promise<DailyActivityEvent>
  removeActivityEvent(eventId: string): Promise<void>
}

export interface DailyLessonGenerationService {
  requestLessonGeneration(): Promise<{ status: DailyLessonGenerationStatus }>
  getGenerationStatus(): Promise<DailyLessonGenerationStatus>
}

export interface DailyLessonPreferencesService {
  getPreferences(): Promise<DailyLessonPreferences>
  updatePreferences(prefs: Partial<DailyLessonPreferences>): Promise<void>
}

export interface DailyLessonPermissionsService {
  getPermissionStatus(): Promise<PermissionState>
  requestPermissions(): Promise<boolean>
}

export interface DailyLessonHistoryService {
  getHistory(): Promise<DailyLessonHistoryItem[]>
  deleteHistory(): Promise<void>
}
