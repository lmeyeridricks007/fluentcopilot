import type { AutosaveDomain } from '@/lib/autosave/types'

export type ResumeFlowKind =
  | 'onboarding'
  | 'schema_lesson'
  | 'writing_simulation'
  | 'speaking_simulation'
  | 'listening_practice_exam'
  | 'reading_practice_exam'

export type ResumeRestartPayload =
  | { type: 'lesson'; lessonId: string }
  | { type: 'autosave'; logicalKey: string; domain: AutosaveDomain; entityId: string }

/** Single resumable continuation surface (deterministic, UI-ready). */
export type ResumableFlow = {
  kind: ResumeFlowKind
  /** Higher = surfaced first when multiple candidates exist */
  priorityRank: number
  title: string
  summary: string
  lastUpdatedAt: string | null
  continueHref: string
  allowRestart: boolean
  restartPayload?: ResumeRestartPayload
}

export type ResumeSurface = 'home' | 'exam_prep' | 'learn' | 'shell'

export type ResumeUserContext = {
  userId: string
  /** When false, onboarding may be the highest-priority resumable (e.g. shell / bootstrap helpers). */
  onboardingComplete: boolean
  completedLessonIds: string[]
}
