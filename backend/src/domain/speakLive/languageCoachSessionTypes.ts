export type LanguageCoachConversationGoal =
  | 'general'
  | 'fluency'
  | 'pronunciation'
  | 'grammar'
  | 'confidence'
  | 'storytelling'
  | 'follow_up_questions'

export type LanguageCoachFeedbackStyle = 'subtle_and_end' | 'at_end_only' | 'every_turn'

export type LanguageCoachStyle = 'supportive' | 'balanced' | 'challenging'

export type LanguageCoachPersonaStyle = 'local' | 'coach' | 'casual'

/**
 * Who the learner is talking to — shapes tone, follow-ups, and correction density.
 * Orthogonal to `personaStyle` (voice/presentation); combined in prompts.
 */
export type LanguageCoachConversationRole = 'friend' | 'colleague' | 'dutch_local' | 'date' | 'coach'

const LANGUAGE_COACH_ROLE_IDS = new Set<string>(['friend', 'colleague', 'dutch_local', 'date', 'coach'])

/** Normalize API / URL / persisted values; default `coach` for strongest learning path. */
export function normalizeLanguageCoachConversationRole(raw: unknown): LanguageCoachConversationRole {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase().replace(/-/g, '_') : ''
  if (v === 'dutchlocal') return 'dutch_local'
  if (LANGUAGE_COACH_ROLE_IDS.has(v)) return v as LanguageCoachConversationRole
  return 'coach'
}

/** Canonical issue labels for nudges + reporting (mapped from heuristic tags). */
export type LanguageCoachIssueType =
  | 'tense_issue'
  | 'word_order_issue'
  | 'article_preposition_issue'
  | 'question_form_issue'
  | 'weak_follow_up'
  | 'simple_structure_overuse'
  | 'word_choice_issue'
  | 'low_clarity'

export type LanguageCoachNudgeType = 'RECAST' | 'CLARIFY' | 'EXPAND' | 'MODEL'

export type LanguageCoachNudgeSeverity = 'minor' | 'medium' | 'major'

export type LanguageCoachGuideRepeatMode = 'start' | 'retry'

/** One applied nudge (filled after assistant reply). */
export type LanguageCoachNudgeEvent = {
  nudgeType: LanguageCoachNudgeType
  learnerOriginal: string
  coachResponse: string
  detectedIssueTypes: LanguageCoachIssueType[]
  severity: LanguageCoachNudgeSeverity
  /** Set on a later learner turn when heuristics suggest the prior issue eased or persisted. */
  learnerRecoveredLater: boolean | null
  /** Which coach reply this was (0-based, matches `coachTurnIndex` at emit time). */
  coachTurnIndex: number
  createdAt: string
}

/** Planned nudge for the upcoming coach reply (cleared after assistant persist). */
export type LanguageCoachPendingNudgePlan = {
  nudgeType: LanguageCoachNudgeType
  learnerOriginal: string
  detectedIssueTypes: LanguageCoachIssueType[]
  severity: LanguageCoachNudgeSeverity
  /** Coach turn index this reply will complete (before increment). */
  coachTurnIndexBeforeReply: number
  /** English-only steering for the reply model (not learner-facing). */
  promptDirective: string
  /** Coach guide loop: start or retry a bounded correction-repeat cycle. */
  guideRepeatMode?: LanguageCoachGuideRepeatMode
  /** Number of explicit repeat prompts already issued for this same correction. */
  guideRepeatCount?: number
}

/** Active coach-guide correction loop waiting for the learner to repeat a corrected line. */
export type LanguageCoachGuideCorrectionLoop = {
  targetLine: string
  issueTypes: LanguageCoachIssueType[]
  severity: LanguageCoachNudgeSeverity
  /** Number of coach repeat prompts already used for this same correction target. */
  repeatCount: number
  sourceLearnerOriginal: string
  coachTurnIndexStarted: number
}

/** Persisted inside Speak Live JSON for `language_coach` threads. */
export type LanguageCoachPersistedBlob = {
  conversationGoal: LanguageCoachConversationGoal
  feedbackStyle: LanguageCoachFeedbackStyle
  coachStyle: LanguageCoachStyle
  personaStyle: LanguageCoachPersonaStyle
  /** Role mode — conversation behavior layer (default coach for strongest learning path). */
  conversationRole: LanguageCoachConversationRole
  /**
   * Coach role only: more explicit mid-conversation phrasing help, simpler questions, faster rescue.
   * Ignored for other roles (always false in persisted state).
   */
  coachGuideWhileSpeaking: boolean
  learnerFactLinesEnglish: string[]
  weaknessHits: Record<string, number>
  coachTurnIndex: number
  sessionFocusChip: string | null
  /**
   * Learner-requested micro-topic for this session (English, internal prompt only).
   * When set, prompts steer the Dutch dialogue back here across turns until cleared explicitly.
   */
  learnerPinnedLessonFocusEnglish: string | null
  /** Structured nudge log for debrief / analytics. */
  nudgeEvents: LanguageCoachNudgeEvent[]
  pendingNudgePlan: LanguageCoachPendingNudgePlan | null
  /** Coach turn index of the last finalized nudge; -1 if none. */
  lastNudgeCoachTurnIndex: number
  /** Guide-on only: active correction loop awaiting a repeat before continuing. */
  activeGuideCorrection?: LanguageCoachGuideCorrectionLoop | null
  /**
   * Aggregated session signals for steering + debrief (integers; bumped on each learner line).
   * Keys: grammar_instability, tense_repeat, word_order_repeat, very_short_answer, weak_follow_up,
   * hesitation_fragmentation, speech_fragmentation_hint, low_initiative, clean_natural_turn, fluent_stretch_turn, …
   */
  sessionSignals: Record<string, number>
  /** Distinct content tokens (lowercase) the learner has touched — avoid repetitive topic resets. */
  topicsTokensMentioned: string[]
  /** First ~56 chars of recent coach replies — avoid repeating the same openers. */
  recentCoachLeadIns: string[]
  /** Running counts of stems (length ≥4) to spot narrow vocabulary. */
  vocabStemHits: Record<string, number>
}

export type LanguageCoachStartPayload = {
  conversationGoal: LanguageCoachConversationGoal
  feedbackStyle: LanguageCoachFeedbackStyle
  coachStyle: LanguageCoachStyle
  personaStyle: LanguageCoachPersonaStyle
  conversationRole: LanguageCoachConversationRole
  /** Coach role only; default false (natural conversation first). */
  coachGuideWhileSpeaking: boolean
  /**
   * Optional English instruction seeded from the previous session's "Plan your next session"
   * deep-link. When non-empty, `buildLanguageCoachSpeakLiveInit` writes this into
   * `learnerPinnedLessonFocusEnglish`, which the coach prompt builder already weaves into
   * every reply as a "Learner-pinned lesson spine". Empty/missing means "no preset focus".
   */
  pinnedFocusEnglish?: string | null
}

export const LANGUAGE_COACH_SCENARIO_SLUG = 'language_coach'
