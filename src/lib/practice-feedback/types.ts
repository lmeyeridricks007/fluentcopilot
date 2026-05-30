import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import type { ProficiencyBand } from '@/lib/schemas/practice/practiceShared.schema'
import type { ScoringResult } from '@/lib/schemas/practice/scoringResult.schema'
import type { ReviewItem } from '@/lib/schemas/reviewItem.schema'
import type { NextPracticeSuggestion } from '@/lib/schemas/practice/practiceFeedback.schema'

export type SessionOutcome = 'success' | 'partial' | 'needs_practice'

export type SupportUsageSummary = {
  /** Rough count of support interactions (caller supplies when tracked). */
  estimatedToolUses?: number
  easierModeUsed?: boolean
}

export type NormalizedPracticeMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type GuidedEvaluationOverlay = {
  wentWellBullets: string[]
  improveBullets: string[]
  betterPhrases: Array<{ nl: string; en?: string }>
  nextActions: Array<{ label: string; href: string; variant?: 'primary' | 'secondary' | 'ghost' }>
}

/**
 * Unified input for post-conversation feedback (guided / semi / free).
 */
export type PostConversationFeedbackInput = {
  mode: PracticeConversationMode
  scenarioId: string
  scenarioTitle?: string
  scenarioGoal?: string
  messages: NormalizedPracticeMessage[]
  keyPhrases: Array<{ phrase: string; translation?: string; context?: string }>
  /** When omitted, derived from heuristics (open modes). */
  sessionOutcome?: SessionOutcome
  /** Guided: branch qualities per user turn */
  branchQualities?: Array<'strong' | 'ok' | 'weak'>
  supportUsage?: SupportUsageSummary
  entitlementTier?: 'free' | 'trial' | 'premium'
  /** Guided: merge authored evaluation with analyzer */
  guidedOverlay?: GuidedEvaluationOverlay
}

/** Raw signals for extractors — no learner-facing copy yet. */
export type SessionPerformanceSignals = {
  mode: PracticeConversationMode
  userTurnCount: number
  userMessages: string[]
  combinedUserText: string
  normalizedUserText: string
  assistantTurnCount: number
  hasPoliteness: boolean
  hasQuestion: boolean
  englishTokensDetected: boolean
  wordOrderRisk: boolean
  /** Key phrases from scenario not clearly echoed in user text */
  missedKeyPhrases: Array<{ phrase: string; translation?: string }>
  usedKeyPhraseCount: number
  weakBranchCount: number
  strongBranchCount: number
  okBranchCount: number
  sessionOutcome: SessionOutcome
  supportHeavy: boolean
  avgUserTurnLength: number
}

export type GrammarIssueVm = {
  id: string
  message: string
  quickFix?: string
}

export type WordOrderNoteVm = {
  id: string
  message: string
  modelSentence?: string
}

export type PhrasingUpgradeVm = {
  learnerSaid: string
  betterNl: string
  why?: string
}

export type VocabSuggestionVm = {
  nl: string
  en?: string
  note?: string
}

export type PracticeFeedbackCta = {
  id: string
  label: string
  href: string
  variant: 'primary' | 'secondary' | 'ghost'
}

/**
 * Mobile-first presenter model — selective sections (omit empty in UI).
 */
export type PracticeFeedbackPresenterModel = {
  scenarioId: string
  scenarioTitle?: string
  mode: PracticeConversationMode
  outcome: SessionOutcome
  headline: string
  subline: string
  confidencePercent: number
  confidenceLabel: string
  proficiencyBand: ProficiencyBand
  strengths: string[]
  improvements: string[]
  grammarNotes: GrammarIssueVm[]
  wordOrderNotes: WordOrderNoteVm[]
  phrasingUpgrades: PhrasingUpgradeVm[]
  vocabSuggestions: VocabSuggestionVm[]
  nextPractice: NextPracticeSuggestion
  reviewTeaser: string
  /** How many items we attempted to queue (side effect) */
  reviewQueuedCount: number
  ctas: PracticeFeedbackCta[]
  /** Premium sees fuller phrasing / vocab / notes */
  premiumDepth: boolean
  scoringResult: ScoringResult
  /** Feeds weakness-driven practice (persisted lightly on feedback view). */
  personalizationTags?: string[]
}

export type PracticeFeedbackSideEffects = {
  xpAmount: number
  reviewLemmas: string[]
  /** Lemmas paired with English meaning when known — preferred over `reviewLemmas` for ingest. */
  reviewVocabEntries?: { lemma: string; translation?: string }[]
  reviewGrammarLabel?: string
  weakTags: string[]
  stage4Items: ReviewItem[]
  qualifiesStreak: boolean
  /** For retention / unlock guardrails */
  userTurnCount: number
  supportHeavy: boolean
}

export type PracticeFeedbackBuildResult = {
  presenter: PracticeFeedbackPresenterModel
  sideEffects: PracticeFeedbackSideEffects
}
