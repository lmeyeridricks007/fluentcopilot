import type { ApiConversationMessage } from '@/lib/api/apiTypes'

/** Client-side Speak Live session UI state (maps loosely to backend thread). */
/**
 * Assistant line media lifecycle (text vs neural voice). Does not block transcript / thread render.
 * @see docs/live-tts-decoupling.md
 */
export type LiveAssistantMediaPhase =
  | 'idle'
  | 'assistant_text_ready'
  | 'assistant_audio_loading'
  | 'assistant_audio_ready'

export type LiveSessionStatus =
  | 'idle'
  /** Waiting for the learner to speak again. */
  | 'listening'
  /** Finalizing speech-to-text after the mic closes (Azure finalize or recorder flush). */
  | 'transcribing'
  /** Transcript committed — "Got it…" shown briefly before LLM starts. */
  | 'got_it'
  /** Assistant turn in flight (LLM + TTS on server). */
  | 'thinking'
  /** Assistant text is on-screen; neural voice is still generating or about to play. */
  | 'replying'
  /** Playing neural TTS for the latest assistant line. */
  | 'speaking'
  | 'paused'
  | 'ended'
  | 'error'

export type LiveTurnRole = 'user' | 'assistant'

export type LiveTurn = {
  id: string
  role: LiveTurnRole
  text: string
  createdAt: number
  /** True while user utterance is interim (browser Azure STT). */
  partial?: boolean
}

export type TranscriptChunk = {
  id: string
  text: string
  role: LiveTurnRole
  partial: boolean
  at: number
}

export type AssistantTurnResponse = {
  transcript: string
  assistantReply: string
  audioUrl: string
  mimeType: string
  perf: Record<string, number>
  speakLiveDebug?: Record<string, unknown>
}

export type LiveSpeakSessionMedia = {
  assistantPresentation: 'male' | 'female'
  ttsProvider: 'azure' | 'openai'
  ttsVoice: string
}

export type LiveSessionBootstrap = {
  threadId: string
  messages: ApiConversationMessage[]
  personaDisplayName?: string | null
  /** Full runtime `context` (scene + director rubric) — inference, parity with API. */
  scenarioContext?: string | null
  /** Server `scenario.description` (often short learner copy when runtime is applied). */
  scenarioDescription?: string | null
  /** When present, prefer for “Your situation” instead of `scenarioContext`. */
  learnerSituationSummary?: string | null
  speakLive?: LiveSpeakSessionMedia | null
}

export function messagesToLiveTurns(messages: ApiConversationMessage[]): LiveTurn[] {
  const out: LiveTurn[] = []
  for (const m of messages) {
    if (m.sender !== 'user' && m.sender !== 'assistant') continue
    const role: LiveTurnRole = m.sender === 'assistant' ? 'assistant' : 'user'
    const text = (m.content ?? '').trim()
    if (!text) continue
    out.push({
      id: m.id,
      role,
      text,
      createdAt: Date.parse(m.createdAt) || Date.now(),
      partial: false,
    })
  }
  return out
}
