/**
 * FluentCopilot persistent Skill System — canonical types (API + dbo.UserLearningProfiles.ProfileJson.userSkillProfile).
 */

export const USER_SKILL_PROFILE_SCHEMA_VERSION = 1 as const

export type SkillGroup = 'speaking' | 'conversation' | 'structure' | 'language' | 'listening' | 'advanced'

export type SkillId =
  | 'pronunciation'
  | 'fluency'
  | 'pacing'
  | 'asking_questions'
  | 'reacting'
  | 'keeping_flow'
  | 'follow_up_questions'
  | 'repair_clarification'
  | 'turn_taking'
  | 'explaining'
  | 'storytelling'
  | 'sequencing'
  | 'step_by_step_speaking'
  | 'response_structure'
  | 'grammar'
  | 'vocabulary'
  | 'sentence_structure'
  | 'word_choice'
  | 'natural_dutch'
  | 'opinions'
  | 'reasoning'
  | 'nuance'
  | 'contrast_comparison'
  | 'softer_disagreement'
  | 'gist_understanding'
  | 'detail_recognition'
  | 'instruction_following'
  | 'response_readiness'
  | 'fast_speech_handling'
  | 'reduced_spoken_dutch'
  | 'filler_tolerance'
  | 'speaker_variation'
  | 'numbers_and_times'
  | 'route_words'
  | 'service_replies'
  | 'quantities_and_items'

/** Stored + computed proficiency band. */
export type SkillState = 'needs_work' | 'building' | 'improving' | 'solid' | 'strong'

/** Internal trend; UI maps to improving / steady / slipping / not enough data. */
export type SkillTrend = 'up' | 'flat' | 'down' | 'unstable'

export type SkillConfidence = 'low' | 'medium' | 'high'

export type SkillPolarity = 'positive' | 'negative' | 'neutral'

export type SkillEvidence = {
  id: string
  sessionId: string
  at: string
  /** speak_live | text_conversation | read_aloud | listening */
  sessionType: string
  skillIds: SkillId[]
  polarity: SkillPolarity
  /** 0–1 signal strength after weighting (not raw severity). */
  magnitude: number
  source: string
  weight: number
  note?: string | null
}

export type SkillMetric = {
  skillId: SkillId
  group: SkillGroup
  /** Primary display score 0–100. */
  score: number
  state: SkillState
  trend: SkillTrend
  confidence: SkillConfidence
  evidenceCount: number
  lastUpdatedAt: string
  sourceMix: string[]
  /**
   * Slower EMA for stable trend detection (optional for backward compatibility).
   * Not required for clients that only render `score` + `trend`.
   */
  baselineScore?: number
  /** Score before the most recent merge (optional; supports “since last session” without exposing raw deltas). */
  priorScore?: number
  /** Session observation blended into `score` last (0–100), for diagnostics / future UI. */
  lastSessionObservedScore?: number
}

export type SkillSnapshot = {
  capturedAt: string
  overallSkillScore: number | null
  metrics: Partial<Record<SkillId, Pick<SkillMetric, 'score' | 'state' | 'trend'>>>
}

export type SkillRecommendationKind =
  | 'scenario'
  | 'read_aloud'
  | 'coach'
  | 'encouragement'
  | 'skill_focus'
  /** Compact steer surfaced from skills + practice memory (not a navigation target). */
  | 'focus_chip'

export type LanguageCoachStyleHint = 'supportive' | 'balanced' | 'challenging'

export type SkillRecommendation = {
  kind: SkillRecommendationKind
  title: string
  subtitle: string
  reason: string
  targetId: string | null
  relatedSkillIds: SkillId[]
  priorityScore: number
  /** When `kind === 'coach'`, optional steer for Language Coach session style. */
  coachStyleHint?: LanguageCoachStyleHint
}

/** Presentation flags — numeric scores can be hidden later without schema churn. */
export type UserSkillProfileDisplayPreferences = {
  /** When false, clients should prefer state/trend labels over raw numbers. Default true if absent. */
  showNumericScores: boolean
}

export type UserSkillProfile = {
  schemaVersion: typeof USER_SKILL_PROFILE_SCHEMA_VERSION
  userId: string
  overallSkillScore: number | null
  strongestSkills: SkillId[]
  weakestSkills: SkillId[]
  currentFocusSkills: SkillId[]
  metrics: Partial<Record<SkillId, SkillMetric>>
  lastRecomputedAt: string
  /** Ring buffer tail (most recent last); capped in merge. */
  recentEvidence: SkillEvidence[]
  /** Optional light history for trend charts later; keep small. */
  snapshots: SkillSnapshot[]
  recommendations: {
    primary: SkillRecommendation | null
    secondary: SkillRecommendation | null
    encouragement: SkillRecommendation | null
    /** Optional fourth slot — skill + practice focus line for hubs / Skills UI. */
    focusChip?: SkillRecommendation | null
    generatedAt: string
  } | null
  /** Optional UX flags (persisted with profile JSON). */
  displayPreferences?: UserSkillProfileDisplayPreferences | null
}

export const ALL_SKILL_IDS: readonly SkillId[] = [
  'pronunciation',
  'fluency',
  'pacing',
  'asking_questions',
  'reacting',
  'keeping_flow',
  'follow_up_questions',
  'repair_clarification',
  'turn_taking',
  'explaining',
  'storytelling',
  'sequencing',
  'step_by_step_speaking',
  'response_structure',
  'grammar',
  'vocabulary',
  'sentence_structure',
  'word_choice',
  'natural_dutch',
  'opinions',
  'reasoning',
  'nuance',
  'contrast_comparison',
  'softer_disagreement',
  'gist_understanding',
  'detail_recognition',
  'instruction_following',
  'response_readiness',
  'fast_speech_handling',
  'reduced_spoken_dutch',
  'filler_tolerance',
  'speaker_variation',
  'numbers_and_times',
  'route_words',
  'service_replies',
  'quantities_and_items',
] as const

export function skillGroupForId(id: SkillId): SkillGroup {
  switch (id) {
    case 'pronunciation':
    case 'fluency':
    case 'pacing':
      return 'speaking'
    case 'asking_questions':
    case 'reacting':
    case 'keeping_flow':
    case 'follow_up_questions':
    case 'repair_clarification':
    case 'turn_taking':
      return 'conversation'
    case 'explaining':
    case 'storytelling':
    case 'sequencing':
    case 'step_by_step_speaking':
    case 'response_structure':
      return 'structure'
    case 'grammar':
    case 'vocabulary':
    case 'sentence_structure':
    case 'word_choice':
    case 'natural_dutch':
      return 'language'
    case 'gist_understanding':
    case 'detail_recognition':
    case 'instruction_following':
    case 'response_readiness':
    case 'fast_speech_handling':
    case 'reduced_spoken_dutch':
    case 'filler_tolerance':
    case 'speaker_variation':
    case 'numbers_and_times':
    case 'route_words':
    case 'service_replies':
    case 'quantities_and_items':
      return 'listening'
    default:
      return 'advanced'
  }
}
