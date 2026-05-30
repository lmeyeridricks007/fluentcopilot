/**
 * Canonical tab roots for the behavior-driven IA (Talk · Coach · Exam · Library).
 * Deep practice routes remain under `/app/practice/*` for stable bookmarks and entitlements.
 */
export const APP_TALK_HUB = '/app/talk'

/** Streak, XP, and rolling activity — dedicated momentum surface. */
export const APP_MOMENTUM = '/app/momentum'

/** Unified history — sessions, scenarios, chats, read-aloud & listening reports. */
export const APP_HISTORY = '/app/history'

/** Sessions, paused threads, recaps, and report entry — full history lives here (not on Talk landing). */
export const APP_TALK_ACTIVITY = '/app/talk/activity'

/** Persistent speaking skills — strengths, focus, and calm next steps. */
export const APP_TALK_SKILLS = '/app/talk/skills'

/** Personalized training loop drill (post-session follow-up). */
export function appTalkTrainingLoopHref(loopId: string): string {
  return `/app/talk/training-loop/${encodeURIComponent(loopId)}`
}

/** Read Aloud — pronunciation & reading-accuracy studio (Speak area). */
export const APP_READ_ALOUD = '/app/talk/read-aloud'

export const APP_READ_ALOUD_SESSION = `${APP_READ_ALOUD}/session`

export const APP_READ_ALOUD_REPORT = `${APP_READ_ALOUD}/report`

/** Read aloud entry with optional passage personalization (matches `readAloudProfile` on the entry screen). */
export function readAloudEntryHref(passageProfile?: string | null): string {
  const p = passageProfile?.trim()
  if (!p) return APP_READ_ALOUD
  const q = new URLSearchParams()
  q.set('readAloudProfile', p)
  return `${APP_READ_ALOUD}?${q.toString()}`
}

/** Language Coach — free-form adaptive Dutch conversation (Speak area). */
export const APP_LANGUAGE_COACH = '/app/talk/language-coach'

/**
 * Deep-link to the Language Coach entry screen with optional presets. Powers the
 * "Continue Coach focused on …" CTA in the post-session "Plan your next session" surface:
 *
 *   - `goal` auto-selects the matching goal pill (and is forwarded as `lcGoal` to the run).
 *   - `pinnedFocusEnglish` is forwarded as `lcPinnedFocus`. The run page sends it on
 *     `LanguageCoachStartBody`, the backend seeds it into `learnerPinnedLessonFocusEnglish`,
 *     and the coach prompt builder ("Learner-pinned lesson spine") weaves the focus into
 *     every reply from turn 1 — no separate prompt plumbing.
 *
 * Returns the bare `APP_LANGUAGE_COACH` path when no presets are supplied.
 */
export function languageCoachStartHref(params?: {
  goal?:
    | 'general'
    | 'fluency'
    | 'pronunciation'
    | 'grammar'
    | 'confidence'
    | 'storytelling'
    | 'follow_up_questions'
    | null
  pinnedFocusEnglish?: string | null
}): string {
  const goal = params?.goal?.trim?.()
  const pinned = params?.pinnedFocusEnglish?.trim?.()
  if (!goal && !pinned) return APP_LANGUAGE_COACH
  const q = new URLSearchParams()
  if (goal) q.set('lcGoal', goal)
  /**
   * Cap to 320 chars to match the server-side Zod schema upper bound; the producer keeps it
   * ≤220, so this is just a defensive clamp against tampered URLs.
   */
  if (pinned) q.set('lcPinnedFocus', pinned.slice(0, 320))
  return `${APP_LANGUAGE_COACH}?${q.toString()}`
}

/** Listening mode — scenario-linked comprehension bursts (Speak area). */
export const APP_LISTENING_MODE = '/app/talk/listening'

/** Level + variation gate before the first drill set. */
export const APP_LISTENING_SETUP = `${APP_LISTENING_MODE}/setup`

export function listeningTrackSetupHref(params: {
  trackId: string
  fromScenario?: string | null
  /** Pre-select level from Listening landing chips. */
  presetLevel?: 'A1' | 'A2' | 'B1' | null
}): string {
  const q = new URLSearchParams({ track: params.trackId })
  const from = params.fromScenario?.trim()
  if (from) q.set('from', from)
  const pl = params.presetLevel?.trim()
  if (pl === 'A1' || pl === 'A2' || pl === 'B1') q.set('level', pl)
  return `${APP_LISTENING_SETUP}?${q.toString()}`
}

export function listeningModeSessionHref(params: {
  packId: string
  level: 'A1' | 'A2' | 'B1'
  /** Scenario listening track id (setup flow provenance). */
  fromTrack?: string | null
  /** Subtype from setup. */
  variation?: string | null
  /** Practice scenario that suggested this warm-up. */
  fromScenario?: string | null
}): string {
  const q = new URLSearchParams({ pack: params.packId, level: params.level })
  const ft = params.fromTrack?.trim()
  if (ft) q.set('fromTrack', ft)
  const v = params.variation?.trim()
  if (v) q.set('variation', v)
  const fs = params.fromScenario?.trim()
  if (fs) q.set('fromScenario', fs)
  return `${APP_LISTENING_MODE}/session?${q.toString()}`
}

/** Launch URL for persisted listening-style training loops (payload from `GET` training loop). */
export function listeningTrainingLoopLaunchHref(payload: unknown): string | null {
  const p = payload as {
    packId?: string
    level?: string
    variation?: string | null
    scenarioKey?: string | null
  } | null
  if (!p || typeof p !== 'object') return null
  const packId = typeof p.packId === 'string' ? p.packId.trim() : ''
  if (!packId) return null
  const raw = (typeof p.level === 'string' ? p.level : 'A2').trim().toUpperCase()
  const level: 'A1' | 'A2' | 'B1' = raw === 'A1' || raw === 'B1' ? (raw as 'A1' | 'B1') : 'A2'
  const variation = typeof p.variation === 'string' && p.variation.trim() ? p.variation.trim() : null
  const fromScenario = typeof p.scenarioKey === 'string' && p.scenarioKey.trim() ? p.scenarioKey.trim() : null
  return listeningModeSessionHref({ packId, level, variation, fromScenario })
}

export function listeningModeReportHref(sessionId: string): string {
  return `${APP_LISTENING_MODE}/report?sessionId=${encodeURIComponent(sessionId)}`
}

/** Speak Live — fast selector (normal app chrome). */
export const APP_SPEAK_LIVE = '/app/talk/live'

/** Speak Live — immersive voice session (dedicated layout; exit returns to Talk). */
export const APP_SPEAK_LIVE_RUN = '/app/talk/live/run'

/** Live conversation run — scenario + level only (no Guided/Free). Optional `threadId` resumes a paused Speak Live thread. */
export function speakLiveRunHref(params: {
  scenarioId: string
  level: string
  threadId?: string
  /** Venue / setting override — ordering_food: cafe|restaurant|takeaway; supermarket_shop: supermarket|convenience_store|pharmacy_style|general_retail */
  subType?: string
  /** Task focus override — ordering_food: simple|dietary|recommendation…; supermarket_shop: asking_where_something_is|paying_checkout|product_questions */
  variation?: string
  /** train-station (public transport): destination label (e.g. Amsterdam Centraal). */
  destination?: string
  /** booking_reservations / store_service_issue: optional detail bias (e.g. time_day, too_small, broken). */
  detailFocus?: string
  /** `phone_call` and other flows: minimal audio-first chrome (`phone`) vs standard Speak Live layout (`standard`). */
  interactionUi?: 'phone' | 'standard'
}): string {
  const q = new URLSearchParams({
    scenarioId: params.scenarioId,
    level: params.level,
  })
  if (params.threadId?.trim()) q.set('threadId', params.threadId.trim())
  if (params.subType?.trim()) q.set('subType', params.subType.trim())
  if (params.variation?.trim()) q.set('variation', params.variation.trim())
  if (params.destination?.trim()) q.set('destination', params.destination.trim())
  if (params.detailFocus?.trim()) q.set('detailFocus', params.detailFocus.trim().slice(0, 64))
  if (params.interactionUi === 'phone' || params.interactionUi === 'standard') {
    q.set('interactionUi', params.interactionUi)
  }
  return `${APP_SPEAK_LIVE_RUN}?${q.toString()}`
}

/** Full-screen Speak Live session recap (after End + backend summary). */
export function appSpeakLiveThreadRecap(threadId: string): string {
  return `/app/talk/live/recap/${encodeURIComponent(threadId)}`
}

/** Speak Live voice coaching report (session + per-turn audio analysis). `sessionId` is the conversation thread id. */
export function appSpeakLiveSessionEvaluation(sessionId: string): string {
  return `/app/talk/live/session/${encodeURIComponent(sessionId)}/evaluation`
}

/** Feature 1 — train station text chat (canonical deep link). */
export function appTalkThread(threadId: string): string {
  return `/app/talk/thread/${encodeURIComponent(threadId)}`
}

export function appTalkThreadRecap(threadId: string): string {
  return `/app/talk/thread/${encodeURIComponent(threadId)}/recap`
}

/** @deprecated Use `appTalkThread` — `/app/talk/chat/*` redirects to `/app/talk/thread/*`. */
export function appTalkChatThread(threadId: string): string {
  return appTalkThread(threadId)
}

/** @deprecated Use `appTalkThreadRecap`. */
export function appTalkChatRecap(threadId: string): string {
  return appTalkThreadRecap(threadId)
}
export const APP_COACH_HUB = '/app/coach'
export const APP_LIBRARY_HUB = '/app/library'

/** Personalized micro-practice built from today’s Quick Captures. */
export const APP_LIBRARY_FROM_YOUR_DAY = '/app/library/from-your-day'

/** Structured recap for a completed personalized (From your day) practice pack. */
export function personalizedPracticeReportHref(packId: string): string {
  return `${APP_LIBRARY_FROM_YOUR_DAY}/report?packId=${encodeURIComponent(packId)}`
}

/** Reopen a generated day pack in the session runner (read-only replay of steps / interactive blocks). */
export function fromYourDayPackSessionHref(packId: string, localDateYmd: string): string {
  const q = new URLSearchParams()
  q.set('pack', packId)
  q.set('date', localDateYmd)
  return `${APP_LIBRARY_FROM_YOUR_DAY}?${q.toString()}`
}

/** Single Quick Capture detail (real-life item). */
export const APP_LIBRARY_CAPTURE = '/app/library/capture'

export function appLibraryCaptureDetailHref(captureId: string): string {
  return `${APP_LIBRARY_CAPTURE}/${encodeURIComponent(captureId)}`
}

export const APP_EXAM_HUB = '/app/exam-prep'

/** Fluent Exam — profile-driven simulation, training, readiness (separate from exam-prep skill hubs). */
export const APP_EXAM_SYSTEM = '/app/exam'

export const APP_EXAM_SIMULATION_SETUP = `${APP_EXAM_SYSTEM}/simulation/setup`

export const APP_EXAM_SIMULATION_RUN = `${APP_EXAM_SYSTEM}/simulation/run`

export const APP_EXAM_SIMULATION_REPORT = `${APP_EXAM_SYSTEM}/simulation/report`

export const APP_EXAM_TRAIN_SETUP = `${APP_EXAM_SYSTEM}/train/setup`

export const APP_EXAM_TRAINING_RUN = `${APP_EXAM_SYSTEM}/train/run`

export const APP_EXAM_TRAINING_REPORT = `${APP_EXAM_SYSTEM}/train/report`

export const APP_EXAM_READINESS = `${APP_EXAM_SYSTEM}/readiness`

export const APP_EXAM_HISTORY = `${APP_EXAM_SYSTEM}/history`

/** KNM items saved from exam simulation report — separate from library words/phrases. */
export const APP_KMN_SAVED_EXAM_QUESTIONS = '/app/exam-prep/kmn/saved'
