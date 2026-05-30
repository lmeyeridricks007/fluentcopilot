/**
 * API / domain contracts — mirror docs and future OpenAPI.
 */

import type { SpeakLiveSignals } from '../domain/speakLive/speakLiveFsm'

export type ConversationMode = 'guided' | 'free'
/**
 * Text thread vs Speak Live voice session. Stored as `ConversationSurface` on threads.
 * Product docs may call this the “text vs speak live” conversation mode; it is not `guided`/`free`.
 */
export type ConversationSurface = 'text' | 'speak_live'
/** Stored as turn | end (maps from product: after_each → turn, at_end → end) */
export type FeedbackMode = 'turn' | 'end'
export type ThreadStatus = 'active' | 'completed' | 'paused'

export type ScenarioSelectionOverrides = {
  subType?: string
  variation?: string
  /** Public transport / similar: destination label (e.g. city or station name). */
  destination?: string
  /**
   * Optional launcher/API focus string (max length enforced at HTTP layer).
   * - `booking_reservations`: booking detail bias (time_day, party_size, …).
   * - `doctor_pharmacy`: health/symptom bias (e.g. headache, cough, medicine_instructions).
   * - `store_service_issue`: issue-context bias (e.g. too_small, delayed_order, broken, refund_exchange).
   * - `work_colleague_interaction`: task-artifact bias (e.g. document, email, task_ticket, report, meeting_note).
   * - `housing_landlord`: issue or contract focus (e.g. heating, leak, mold_moisture, rent_due_date, deposit_borg, notice_period).
   * - `phone_call`: call-topic bias (e.g. opening_hours, appointment_slot, issue_report, availability_question).
   */
  detailFocus?: string
}

export type ScenarioRuntimeGoal = {
  id: string
  label: string
  weight: number
  required?: boolean
  skill: string
}

/** Speak Live: measurable session contract + recap/coaching hooks (e.g. public transport by variation). */
export type ScenarioEvaluationContract = {
  schemaVersion: 1
  variationId: string
  variationTitle: string
  userGoalSummary: string
  /** Goal ids (same as {@link ScenarioRuntimeGoal.id}) that must appear in recap `goalsCompleted` for “session contract met”. */
  completionRequiredPassGoalIds: readonly string[]
  recapHooksPositive: readonly string[]
  recapHooksImprove: readonly string[]
  coachingHooks: readonly string[]
  /** Optional rubric lines keyed by goal id for eval / prompt grounding. */
  goalRubrics?: Record<string, { pass: string; partial: string; fail: string }>
}

export type ScenarioAssistantBehavior = {
  pace: string
  register: string
  tone: string
  responseStyle: string[]
  frictionStyle: string[]
  openingVariants?: string[]
  recommendationStyle?: string
  frictionChance?: string
  guardrails?: string[]
}

export type ScenarioDifficultyAdjustments = {
  learnerLevel: string
  responsePacing: string
  vocabularyRange: string
  followUpStyle: string
  misunderstandingLevel: string
}

export type ScenarioRuntimeConfig = {
  id: string
  title: string
  category: string
  level: string
  subType: string
  variation: string
  context: string
  /** Product family id when a catalog slug maps to a broader runtime (e.g. public transport on train-station). */
  scenarioFamily?: string
  /** Human-readable destination / focus place for transport-style runs. */
  destinationDisplay?: string
  /** Short learner-facing situation (e.g. Speak Live “Your situation”). Full rubric stays in `context`. */
  learnerSituationSummary?: string
  goals: ScenarioRuntimeGoal[]
  weights: Record<string, number>
  assistantBehavior: ScenarioAssistantBehavior
  difficultyAdjustments: ScenarioDifficultyAdjustments
  hints?: string[]
  persona?: Record<string, string>
  coreSkills?: string[]
  openingLine?: string
  /**
   * Directions Speak Live only: increment when first-turn / learner-situation contract changes so active
   * threads are not reused with an outdated opening message.
   */
  directionsOpeningContractVersion?: number
  /**
   * Directions Speak Live: no seeded assistant message — the learner’s first Dutch utterance opens the scene.
   */
  directionsLearnerSpeaksFirst?: boolean
  /**
   * Public transport (train-station Speak Live) only: bump when first-turn / learner-situation contract changes
   * so active threads are not reused with an outdated opening pattern.
   */
  publicTransportOpeningContractVersion?: number
  /**
   * Public transport (train-station Speak Live): no seeded assistant message — the learner’s first Dutch
   * utterance opens the scene (route, ticket, or disruption question).
   */
  publicTransportLearnerSpeaksFirst?: boolean
  /**
   * Doctor / pharmacy Speak Live only: bump when the seeded first assistant line or opening pool changes
   * so active threads are not resumed with an outdated greeting.
   */
  doctorPharmacyOpeningContractVersion?: number
  /**
   * Store / service issue Speak Live only: bump when the seeded first assistant line or opening pool changes
   * so active threads are not resumed with an outdated greeting (e.g. receipt-first openings).
   */
  storeServiceIssueOpeningContractVersion?: number
  /** Optional evaluation / recap contract for dynamic scenarios (public transport, etc.). */
  evaluationContract?: ScenarioEvaluationContract
}

/** Speak Live only: lifecycle after the learner ends the session (evaluation job). */
export type SpeakLivePostSessionPhase = 'active' | 'ending' | 'evaluating' | 'verifying' | 'evaluated' | 'failed'
export type MessageSender = 'user' | 'assistant' | 'system' | 'coach'
export type MessageType = 'text' | 'system_banner'

export interface ScenarioConfig {
  id: string
  slug: string
  title: string
  description: string
  userRole: string
  goals: string[]
  starterSuggestions: string[]
  difficultyBand: string
  tags: string[]
  allowedModes: ConversationMode[]
  openingMessage: string | null
  runtimeConfig?: ScenarioRuntimeConfig | null
}

export interface PersonaConfig {
  id: string
  slug: string
  displayName: string
  role: string
  tone: string
  styleRules: string[]
  avatarKey: string | null
  introLine: string
}

export interface ConversationThread {
  id: string
  userId: string
  scenarioId: string
  personaId: string
  mode: ConversationMode
  /** `speak_live` when the learner is in the Speak Live experience; default `text`. */
  conversationSurface: ConversationSurface
  feedbackMode: FeedbackMode
  status: ThreadStatus
  summaryText: string | null
  currentStage: string | null
  /** JSON: Speak Live FSM + rolling summary (`SpeakLivePersistedState`). */
  speakLiveStateJson: string | null
  /** Set for `speak_live` threads: post-session evaluation pipeline state. */
  speakLivePostSessionPhase?: SpeakLivePostSessionPhase | null
  createdAt: string
  updatedAt: string
  lastUserMessageAt: string | null
}

export interface ConversationMessage {
  id: string
  threadId: string
  sender: MessageSender
  messageType: MessageType
  content: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface FeedbackItem {
  id: string
  threadId: string
  linkedMessageId: string
  category: string
  originalText: string
  correctedText: string
  explanation: string
  severity: string
  createdAt: string
}

export interface SavedWordItem {
  id: string
  userId: string
  text: string
  normalizedText: string
  meaning: string | null
  sourceType: string
  sourceThreadId: string | null
  sourceMessageId: string | null
  sourceScenarioId: string | null
  exampleSentence: string | null
  createdAt: string
}

export interface PronunciationHighlight {
  /** Phrase or word the learner said (often from STT), for grounding. */
  phrase: string
  /** Short actionable tip (stress, vowel, consonant cluster, etc.). */
  tip: string
}

/** Passed into end-summary generation so recaps stay scenario- and session-specific. */
export type ConversationRecapGenerationContext = {
  conversationSurface: ConversationSurface
  scenarioTitle: string
  scenarioGoals: string[]
  speakLiveRollingSummary?: string
  threadCurrentStage?: string | null
  /** Speak Live FSM: which scenario goal indices were marked completed (deterministic + model). */
  speakLiveGoalsCompletedIndexes?: number[]
  /** Train Station Speak Live: compact slot summary for recap grounding. */
  trainStationSlotRecapSummary?: string | null
  /**
   * Train Station Speak Live: authoritative structured state for recap (JSON string of LiveScenarioRecapInput).
   * When set, recap prompts treat this as primary grounding; rolling summary is demoted.
   */
  trainStationLiveRecapInputJson?: string | null
}

export type LiveRecapTranscriptEvidence = {
  goalId: string
  quote: string
}

export interface ConversationSummary {
  threadId: string
  whatWentWell: string[]
  whatToImprove: string[]
  correctedPhrases: { original: string; corrected: string; note: string }[]
  suggestedNextAction: string
  saveWordCandidates: string[]
  /** Voice sessions: tips tied to what the learner actually said (may be empty). */
  pronunciationHighlights?: PronunciationHighlight[]
  /** Scenario goal ids satisfied this session (Speak Live / train station). */
  goalsCompleted?: string[]
  /** Scenario goal ids not yet satisfied (engine truth; do not contradict achievedGoals in structured input). */
  goalsMissed?: string[]
  /** Coaching / phrasing notes (language quality), separate from scenario completion. */
  languageNotes?: string[]
  /** Exact learner lines tied to goal ids (grounding for UI + copy). */
  transcriptEvidence?: LiveRecapTranscriptEvidence[]
  /** Optional alias for suggestedNextAction from newer recap prompts. */
  recommendedNextStep?: string
  /** Short Dutch-upgrade bullets (may mirror language coaching). */
  dutchUpgrade?: string[]
}

export interface AIResponseEnvelope {
  assistantReply: string
  feedback: {
    category: string
    originalText: string
    correctedText: string
    explanation: string
    severity?: string
  } | null
  saveWordCandidates: string[]
  scenarioProgress: { stage: string; notes?: string } | null
  shouldConversationEnd: boolean
  updatedSummary: string
}

/** Train Station Speak Live — optional structured meta returned with reply-only JSON. */
export type TrainTurnResponse = {
  answeredGoals: string[]
  unresolvedGoals: string[]
  nextLikelyGoal?: string | null
  newGoalSuggestions?: string[]
  followUpIntentOptional?: string | null
  coachNotesOptional?: string
}

/** Stage A — persona reply only (fast path, small JSON). */
export interface AssistantReplyEnvelope {
  assistantReply: string
  scenarioProgress: { stage: string; notes?: string } | null
  shouldConversationEnd: boolean
  /** Speak Live: model hints for the structured FSM (optional for text threads). */
  speakLiveSignals?: SpeakLiveSignals | null
  /** Train Station: model self-report of which slots this reply covered (validated). */
  trainTurnResponse?: TrainTurnResponse | null
}

/** Stage B — coaching + lexical + summary (async / second request). */
export interface TurnEnrichmentEnvelope {
  feedback: AIResponseEnvelope['feedback']
  saveWordCandidates: string[]
  updatedSummary: string
  /** Optional — used to backfill stage when Stage A was plain-text streaming. */
  scenarioProgress?: { stage: string; notes?: string } | null
  /** Optional structured hints for analytics / future coaching signals. */
  evaluation?: Record<string, unknown> | null
}
