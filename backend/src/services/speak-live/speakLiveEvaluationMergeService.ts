/**
 * Merge lane: combines Azure speech metrics with OpenAI coaching outputs at turn granularity.
 *
 * The synchronous merge + enrich steps still live in {@link ./liveSessionEvaluationOrchestrator.ts}
 * to avoid a risky mega-refactor in one pass. This module holds contracts for future extraction
 * (e.g. parallel merge workers or skill-evidence hooks).
 */
import type { TurnEvaluation } from './liveVoiceEvaluationTypes'
import type { NormalizedSpeakLiveSession } from './speakLiveNormalizedConversation'

export type SpeakLiveMergeStageId = 'coach_merge' | 'reference_tts' | 'feedback_build' | 'enrich_turns' | 'premium_scoring'

export type SpeakLiveMergeServiceContext = {
  normalized: NormalizedSpeakLiveSession
  /** Only user turns appear here; assistant context is already on each row where applicable. */
  turnEvaluations: TurnEvaluation[]
}

/** Placeholder for skill-tracking hooks — call after coach merge once merge moves here. */
export function emitMergeStageTelemetry(_stage: SpeakLiveMergeStageId, _ctx: SpeakLiveMergeServiceContext): void {
  // Intentionally empty — wire to metrics / learning-memory when those pipelines consume merge events.
}
