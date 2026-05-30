/**
 * Feature 1 — Text conversation (mocked vertical slice).
 * Types are stable for future API/LLM replacement.
 */

import type { SpeakingCoachingResult } from '@/lib/speech/speakingCoachingTypes'
import type { ConversationSurface } from '@/lib/conversation/conversationSurface'

export type FeedbackMode = 'after_each' | 'at_end'

export type ConversationMode = 'guided' | 'free'

export type ThreadStatus = 'active' | 'completed' | 'paused'

export type ChatSender = 'user' | 'ai' | 'system' | 'coach'

export type ChatMessageType = 'text' | 'system_banner'

export interface ScenarioConfig {
  id: string
  /** Scenario slug accepted by `POST /conversations/start` (e.g. `train-station`). */
  slug?: string
  title: string
  description: string
  userRole: string
  personaId: string
  goals: string[]
  starterSuggestions: string[]
  difficulty: 'A1' | 'A2' | 'B1'
  tags: string[]
}

export interface PersonaConfig {
  id: string
  displayName: string
  role: string
  avatarEmoji: string
  tone: string
  introLine: string
}

export interface FeedbackItem {
  id: string
  linkedUserMessageId: string
  original: string
  corrected: string
  explanation: string
  saveCandidates: string[]
  /** Coach category label — may be any string from the API. */
  category: string
}

/** Saved lexeme metadata — Library uses `SavedWordItem` in mocks; this mirrors coach/chat origin. */
export interface ChatSavedLexemeMeta {
  text: string
  meaning?: string
  sourceType: 'chat_ai' | 'chat_feedback'
  sourceScenarioId: string
  sourceThreadId: string
  sourceMessageId: string
  createdAt: string
}

export interface ConversationSummary {
  threadId: string
  handledWell: string[]
  improvePhrases: { original: string; corrected: string; note: string }[]
  usefulPhrase?: string
  usefulWord?: string
  nextStep: string
  /** Populated when feedbackMode was at_end */
  deferredFeedback?: FeedbackItem[]
}

/** Deferred transcript-based speaking coaching rows (client-held until recap when feedbackMode is at_end). */
export type SpeakingCoachingRecapItem = {
  userMessageId: string
  coaching: SpeakingCoachingResult
}

export type PronunciationHighlightView = {
  phrase: string
  tip: string
}

export type LiveRecapYouAskedItem = {
  goalId?: string
  label: string
  quote?: string
}

/** Normalized recap payload for `ConversationRecapView` (mock + API). */
export type ConversationRecapViewModel = {
  handledWell: string[]
  improvePhrases: { original: string; corrected: string; note: string }[]
  whatToImprove: string[]
  usefulPhrase?: string
  usefulWord?: string
  nextStep: string
  /** Speak Live / voice: session-grounded pronunciation tips */
  pronunciationHighlights?: PronunciationHighlightView[]
  /** Mock-only: deferred items count for at_end UX */
  deferredFeedbackCount?: number
  /** Transcript-based speaking coach moments (often from deferred at_end flow). */
  speakingCoachingRecap?: SpeakingCoachingRecapItem[]
  /** Grounded Speak Live recap — populated when API sends structured goal + evidence fields */
  youAskedAbout?: LiveRecapYouAskedItem[]
  youCouldStillAdd?: string[]
  tryNext?: string
  dutchUpgradeLines?: string[]
}

export type MockIntent =
  | 'ask_platform'
  | 'ask_on_time'
  | 'ask_delay'
  | 'ask_transfer'
  | 'confirm_destination'
  | 'thank_close'
  | 'unclear'

export interface MockIntentResult {
  intent: MockIntent
  confidence: number
}

export type ConversationStage =
  | 'opening'
  | 'platform_ok'
  | 'timing_ok'
  | 'route_ok'
  | 'closing'
  | 'ended'

export interface ChatMessage {
  id: string
  threadId: string
  sender: ChatSender
  content: string
  createdAt: string
  type: ChatMessageType
  linkedMessageId?: string
  metadata?: {
    feedbackId?: string
    intent?: MockIntent
    translationHint?: string
    saveWordCandidates?: string[]
    /** When set (e.g. from API), prefer this URL for playback over TTS fetch / Web Speech. */
    audioUrl?: string
    inputMode?: 'text' | 'speech'
    originalTranscript?: string
    audioReference?: string | null
  }
}

export interface ConversationThread {
  id: string
  scenarioId: string
  personaId: string
  mode: ConversationMode
  /**
   * Text thread vs Speak Live. Distinct from `mode` (guided/free).
   * Older persisted mocks may omit — UI defaults to `text`.
   */
  conversationSurface?: ConversationSurface
  feedbackMode: FeedbackMode
  status: ThreadStatus
  summary: ConversationSummary | null
  currentStage: ConversationStage
  messages: ChatMessage[]
  pendingFeedback: FeedbackItem[]
  assistantTyping: boolean
  contextDismissed: boolean
  /** Accumulated for recap — which scenario beats were touched */
  stagesReached?: ConversationStage[]
  createdAt: string
  updatedAt: string
}

export interface EngineTurnInput {
  thread: ConversationThread
  userText: string
  scenario: ScenarioConfig
  persona: PersonaConfig
}

export interface EngineTurnOutput {
  assistantMessage: string
  assistantTranslationHint?: string
  nextStage: ConversationStage
  feedback: FeedbackItem | null
  detectedIntent: MockIntent
}
