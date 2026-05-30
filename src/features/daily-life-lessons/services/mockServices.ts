/**
 * FD-09 — mock services for daily life lessons.
 */

import type { DailyLessonSummary, DailyLessonPreferences, DailyLessonGenerationStatus } from '../types'
import { MOCK_TODAY_ACTIVITIES } from '../mocks/activities'
import { MOCK_GENERATED_LESSON, MOCK_LESSON_HISTORY, getMockLessonById } from '../mocks/lessons'
import type { DailyActivityEvent, CaptureMomentInput } from '../types'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

let activities = [...MOCK_TODAY_ACTIVITIES]
let generationStatus: DailyLessonGenerationStatus = { status: 'idle' }
let preferences: DailyLessonPreferences = {
  enabled: true,
  useLocation: true,
  usePhotoAnalysis: false,
  useVoiceNotes: false,
  manualOnlyMode: false,
  autoGenerateAtEndOfDay: false,
  historyRetentionDays: 90,
}
let permissionState: 'not_requested' | 'granted' | 'denied' | 'blocked' | 'unsupported' = 'granted'

export const dailyLessonService = {
  async getTodaySummary() {
    await delay(200)
    const eventCount = activities.length
    const canGenerate = eventCount >= 1
    const todayLesson = generationStatus.status === 'ready' ? MOCK_GENERATED_LESSON : undefined
    return {
      date: new Date().toISOString().slice(0, 10),
      lessonId: todayLesson?.lessonId,
      eventCount,
      canGenerate,
      generationStatus: generationStatus.status,
      todayLesson,
    } as DailyLessonSummary
  },
  async getTodayLesson() {
    await delay(150)
    if (generationStatus.status !== 'ready') return null
    return { ...MOCK_GENERATED_LESSON, sourceEvents: activities }
  },
  async getLessonById(lessonId: string) {
    await delay(150)
    const lesson = getMockLessonById(lessonId)
    return lesson ? { ...lesson } : null
  },
  async getLessonHistory() {
    await delay(180)
    return MOCK_LESSON_HISTORY.map((l) => ({
      lessonId: l.lessonId,
      date: l.date,
      title: l.title,
      scenariosIncluded: l.scenarios.map((s) => s.title),
      completionStatus: l.completionStatus,
      isSaved: false,
    }))
  },
}

export const dailyActivityService = {
  async getTodayActivities() {
    await delay(150)
    return [...activities]
  },
  async captureMoment(input: CaptureMomentInput) {
    await delay(300)
    const event: DailyActivityEvent = {
      eventId: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sourceType: 'manual',
      venueType: input.venueType,
      title: input.title,
      note: input.note,
      hasPhoto: input.hasPhoto ?? false,
      hasVoice: input.hasVoice ?? false,
      removable: true,
    }
    activities = [event, ...activities]
    return event
  },
  async removeActivityEvent(eventId: string) {
    await delay(200)
    activities = activities.filter((e) => e.eventId !== eventId)
  },
}

export const dailyLessonGenerationService = {
  async requestLessonGeneration() {
    await delay(100)
    generationStatus = { status: 'generating', startedAt: new Date().toISOString() }
    await delay(2500)
    generationStatus = { status: 'ready', completedAt: new Date().toISOString() }
    return { status: generationStatus }
  },
  async getGenerationStatus() {
    await delay(50)
    return { ...generationStatus }
  },
  setMockStatus(s: DailyLessonGenerationStatus) {
    generationStatus = s
  },
}

export const dailyLessonPreferencesService = {
  async getPreferences() {
    await delay(80)
    return { ...preferences }
  },
  async updatePreferences(prefs: Partial<DailyLessonPreferences>) {
    await delay(120)
    preferences = { ...preferences, ...prefs }
  },
}

export const dailyLessonPermissionsService = {
  async getPermissionStatus() {
    await delay(50)
    return permissionState
  },
  async requestPermissions() {
    await delay(400)
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      return new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            permissionState = 'granted'
            resolve(true)
          },
          () => {
            permissionState = 'denied'
            resolve(false)
          },
          { timeout: 5000 }
        )
      })
    }
    permissionState = 'unsupported'
    return false
  },
  setMockStatus(s: typeof permissionState) {
    permissionState = s
  },
}

export const dailyLessonHistoryService = {
  async getHistory() {
    await delay(100)
    return dailyLessonService.getLessonHistory()
  },
  async deleteHistory() {
    await delay(300)
  },
}
