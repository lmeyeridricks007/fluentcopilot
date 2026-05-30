/**
 * Structured exam → practice recommendations (scenarios, drills, lessons, review).
 * Reusable from exam screens, Practice Hub, dashboard.
 */

export type ExamRecommendationExamType = 'speaking' | 'writing' | 'listening' | 'reading' | 'kmn'

export type ExamRecommendationMode = 'training' | 'simulation'

/** Fine-grained tag for analytics / debugging (e.g. low_grammar, weak_execution). */
export type ExamRationaleSource = string

export type ExamRecommendationKind = 'scenario' | 'drill' | 'lesson' | 'review'

/** Internal candidate before ranking (includes score). */
export type ExamRecCandidate = {
  kind: ExamRecommendationKind
  targetId: string
  title: string
  reason: string
  rationaleSource: ExamRationaleSource
  estimatedMinutes?: number
  href: string
  ctaLabel: string
  score: number
}

/** Final ranked recommendation (UI + persistence). */
export type ExamRecommendation = {
  kind: ExamRecommendationKind
  targetId: string
  title: string
  reason: string
  rationaleSource: ExamRationaleSource
  priority: 1 | 2 | 3
  estimatedMinutes?: number
  href: string
  ctaLabel: string
}

export type ExamRecommendationInput = {
  examType: ExamRecommendationExamType
  mode: ExamRecommendationMode
  normalizedPercent: number
  pass: boolean
  /** Engine + mistake layer weak tags (substring match is OK). */
  weakTags: string[]
  /** Rubric rows with ratio < threshold, worst-first. */
  weakRubricKeys?: string[]
  speakingScenarioGroupId?: string
  writingSubtype?: 'form' | 'message' | 'text_to_audience'
  listeningQuestionType?: 'gist' | 'detail' | 'intent'
  /** Listening: high replay ratio on attempt */
  replayHeavy?: boolean
  readingSkill?: 'scanning' | 'comprehension'
  kmnTopicId?: string
  recentScenarioIds?: string[]
  recentTrackIds?: string[]
}

export type ExamRecommendationBundle = {
  input: ExamRecommendationInput
  recommendations: ExamRecommendation[]
  /** Score band for analytics */
  scoreBand: 'strong' | 'ok' | 'weak'
}
