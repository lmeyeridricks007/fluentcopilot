import type {
  ConversationMessage,
  ConversationMode,
  FeedbackMode,
  PersonaConfig,
  ScenarioConfig,
} from '../../../models/contracts'
import type { SpeakLivePersistedState } from '../../../domain/speakLive/speakLiveFsm'
import type { ScenarioLivePersonalizationPayload } from '../../../domain/learningMemory/scenarioLivePersonalizationPayload'

/**
 * Provider-agnostic input for a single conversation turn (Feature 1 + future features).
 * No raw SDK or HTTP shapes.
 */
export type AiConversationTurnRequest = {
  /** Optional tracing — HTTP correlation id when available */
  correlationId?: string
  threadId?: string
  scenario: ScenarioConfig
  persona: PersonaConfig
  mode: ConversationMode
  feedbackMode: FeedbackMode
  threadSummary: string | null
  recentMessages: ConversationMessage[]
  userText: string
  /** When set, reply-only prompt includes Speak Live FSM block (structured session). */
  speakLive?: {
    state: SpeakLivePersistedState
    goalTitles: string[]
    scenarioTitle: string
    /** Injected into Speak Live FSM block — deterministic transcript grounding. */
    verifiedGroundingBlock?: string | null
    /** Persisted user message id for this turn (Train Station orchestration + GoalHit ids). */
    userMessageId?: string
    /** CEFR band for ultra-lean live prompt (no coaching — register hint only). */
    learnerLevelCefr?: string | null
  } | null
  /** Cross-session personalization (English system text; internal). */
  learningPersonalization?: {
    coachBlockEnglish: string
    scenarioBlockEnglish: string
    scenarioMicroHintEnglish: string
    /** Structured adaptive layer for dedicated scenarios (optional; mirrors prompt text where relevant). */
    scenarioLivePersonalization?: ScenarioLivePersonalizationPayload | null
  } | null
}
