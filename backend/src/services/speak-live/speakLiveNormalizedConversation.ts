/**
 * Canonical post-session conversation view for Speak Live voice scenarios.
 * Assistant turns are retained for context; only user turns participate in scoring surfaces.
 */
import type { ConversationMessage, ScenarioConfig } from '../../models/contracts'

export type ConversationTurn = {
  id: string
  speaker: 'assistant' | 'user'
  text: string
  audioUrl?: string
  startedAtMs?: number
  endedAtMs?: number
}

export type SpeakLiveScenarioMetadata = {
  scenarioId: string
  slug: string
  title: string
  goals: string[]
}

export type SpeakLiveLevelMetadata = {
  /** Level string used for coaching prompts (CEFR-style). */
  learnerLevel: string
}

export type SpeakLiveSessionEnvelopeMetadata = {
  threadId: string
  /** ISO timestamps from first / last message when available. */
  sessionStartedAt?: string
  sessionEndedAt?: string
  sessionDurationSeconds?: number
}

export type NormalizedSpeakLiveSession = {
  scenario: SpeakLiveScenarioMetadata
  level: SpeakLiveLevelMetadata
  session: SpeakLiveSessionEnvelopeMetadata
  /** Full transcript ordering (user + assistant). */
  turns: ConversationTurn[]
  /** Convenience: user-only turns in speak order (same subset the scoring pipeline uses). */
  userTurns: ConversationTurn[]
}

function parseCreatedAtMs(createdAt: string | undefined): number | undefined {
  if (!createdAt?.trim()) return undefined
  const t = Date.parse(createdAt)
  return Number.isFinite(t) ? t : undefined
}

function messageToConversationTurn(msg: ConversationMessage): ConversationTurn {
  const meta = msg.metadata as Record<string, unknown> | null | undefined
  const blobPath = typeof meta?.learnerAudioBlobPath === 'string' ? meta.learnerAudioBlobPath.trim() : ''
  const startedAtMs = parseCreatedAtMs(msg.createdAt)
  const text = (msg.content ?? '').trim()
  if (msg.sender === 'user') {
    const threadId = msg.threadId
    const audioUrl = blobPath ? `speak-live/session/${threadId}/learner-audio/${msg.id}` : undefined
    return {
      id: msg.id,
      speaker: 'user',
      text,
      audioUrl,
      startedAtMs,
    }
  }
  return {
    id: msg.id,
    speaker: 'assistant',
    text,
    startedAtMs,
  }
}

export function buildNormalizedSpeakLiveSession(params: {
  threadId: string
  scenario: ScenarioConfig
  learnerLevel: string
  messages: ConversationMessage[]
}): NormalizedSpeakLiveSession {
  const ordered = params.messages
  const turns = ordered.map(messageToConversationTurn)
  const userTurns = turns.filter((t) => t.speaker === 'user')
  const t0 = parseCreatedAtMs(ordered[0]?.createdAt)
  const t1 = parseCreatedAtMs(ordered[ordered.length - 1]?.createdAt)
  const sessionDurationSeconds =
    t0 != null && t1 != null ? Math.max(0, Math.round((t1 - t0) / 1000)) : undefined
  return {
    scenario: {
      scenarioId: params.scenario.id,
      slug: params.scenario.slug,
      title: params.scenario.title,
      goals: params.scenario.goals,
    },
    level: { learnerLevel: params.learnerLevel },
    session: {
      threadId: params.threadId,
      sessionStartedAt: ordered[0]?.createdAt,
      sessionEndedAt: ordered[ordered.length - 1]?.createdAt,
      sessionDurationSeconds,
    },
    turns,
    userTurns,
  }
}

/** User messages with nearest preceding assistant line — Azure + OpenAI scoring inputs. */
export type PostSessionSpeechTurnInput = {
  msg: ConversationMessage
  assistant: string | null
  index: number
}

export function buildPostSessionUserTurnsForSpeechScoring(messages: ConversationMessage[]): PostSessionSpeechTurnInput[] {
  const userTurns: PostSessionSpeechTurnInput[] = []
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    if (m.sender !== 'user') continue
    let asst: string | null = null
    for (let j = i - 1; j >= 0; j--) {
      if (messages[j].sender === 'assistant') {
        asst = messages[j].content
        break
      }
    }
    userTurns.push({ msg: m, assistant: asst, index: userTurns.length })
  }
  return userTurns
}
