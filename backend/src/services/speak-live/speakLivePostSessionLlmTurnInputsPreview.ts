/**
 * Builds {@link LiveEvalLlmTurnInput} rows for the structured transcript LLM **without** waiting for
 * Azure pronunciation prep — used to overlap the session coaching call with the Azure speech lane.
 *
 * `azureSummary` is always `null` here so the dialogue model prompt stays parallel-safe (no race on
 * Azure text). Per-turn pronunciation scores, weak words, and timing from {@link assessUserTurnsSpeechBatch}
 * are merged **after** both lanes finish (see `mergeScenarioReportEvaluation` / orchestrator).
 */
import type { LiveEvalLlmTurnInput } from './liveSessionEvaluationLlm'
import type { PostSessionSpeechTurnInput } from './speakLiveNormalizedConversation'

export function buildPostSessionLlmTurnInputsPreview(
  userTurns: PostSessionSpeechTurnInput[],
  scenarioGoals: string[],
): LiveEvalLlmTurnInput[] {
  return userTurns.map(({ msg, assistant, index }) => {
    const meta = msg.metadata as Record<string, unknown> | null | undefined
    const transcriptRaw =
      typeof meta?.transcriptRaw === 'string' && meta.transcriptRaw.trim()
        ? meta.transcriptRaw.trim()
        : msg.content.trim()
    const transcriptNormalizedMeta =
      typeof meta?.transcriptNormalized === 'string' && meta.transcriptNormalized.trim()
        ? meta.transcriptNormalized.trim()
        : null
    const transcriptNormalized = (transcriptNormalizedMeta ?? transcriptRaw).trim() || transcriptRaw
    const blobPath = typeof meta?.learnerAudioBlobPath === 'string' ? meta.learnerAudioBlobPath.trim() : ''
    const hasLearnerAudio = Boolean(blobPath)
    return {
      turnId: msg.id,
      turnIndex: index,
      learnerTranscript: transcriptRaw,
      learnerTranscriptNormalized: transcriptNormalized,
      assistantReply: (assistant ?? '').trim().slice(0, 1200),
      hasLearnerAudio,
      sessionGoals: scenarioGoals,
      azureSummary: null,
    }
  })
}
