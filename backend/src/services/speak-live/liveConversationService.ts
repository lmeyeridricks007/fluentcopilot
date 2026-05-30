/**
 * Fast live Speak Live conversation path — pipeline id + diagnostics only.
 * Transcript shaping lives in {@link liveSpeechTurnService}.
 */

import { normalizeTranscriptForLiveConversation } from './liveSpeechTurnService'

export const LIVE_CONVERSATION_PIPELINE_ID = 'fast_live_conversation' as const

/** @deprecated Prefer {@link normalizeTranscriptForLiveConversation} from `liveSpeechTurnService`. */
export function normalizeLearnerTranscriptForLive(raw: string): string {
  return normalizeTranscriptForLiveConversation(raw)
}

export function liveConversationPipelineDiagnostics(params: {
  sttMs?: number
  llmMs?: number
  moderationMs?: number
}): Record<string, unknown> {
  return {
    pipeline: LIVE_CONVERSATION_PIPELINE_ID,
    deepEvaluationOnCriticalPath: false,
    sttMs: params.sttMs ?? null,
    llmMs: params.llmMs ?? null,
    moderationMs: params.moderationMs ?? null,
    note: 'Pronunciation/grammar/fluency/CEFR coaching run only after session end.',
  }
}
