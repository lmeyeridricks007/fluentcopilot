/** Mirrors `POST /api/speech/speaking-coaching` response shape (`coaching` field). */

export type SpeakingCoachingRank = 'strong' | 'ok' | 'needs_work'

export type SpeakingCoachingResult = {
  shortVerdict: string
  naturalnessSuggestion: string | null
  correctedAlternative: string | null
  whyItMatters: string | null
  cefrLevelAppropriateness: 'below_level' | 'on_level' | 'above_level'
  coachNote: string
  encouragement: string
  intentMatch: SpeakingCoachingRank
  naturalness: SpeakingCoachingRank
  clarity: SpeakingCoachingRank
  levelFit: SpeakingCoachingRank
  savePhraseCandidates: { phrase: string; contextNote?: string }[]
  coachingSignals: string[]
  scenarioIntentMet?: boolean
  evaluationScope?: 'transcript_only'
}

export type SpeakingCoachingRequestBody = {
  transcript: string
  scenarioId: string
  scenarioTitle: string
  scenarioDescription?: string | null
  scenarioGoals?: string[]
  learnerLevelCefr: 'A1' | 'A2' | 'B1'
  feedbackMode: 'after_each' | 'at_end' | 'turn' | 'end'
  conversationTurnIndex: number
  lastAssistantTurn?: string | null
  threadSummary?: string | null
  expectedIntent?: string | null
}
