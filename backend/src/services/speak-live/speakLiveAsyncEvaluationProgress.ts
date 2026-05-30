/**
 * FluentCopilot post-session evaluation pipeline phases (persisted in `LiveSessionEvaluations.ProgressJson`).
 * Maps to poll-friendly UX while the async worker runs.
 */
export const SPEAK_LIVE_EVALUATION_PHASES = [
  'queued',
  /** Structured scenario dialogue + coaching (parallel optimized lane). */
  'evaluating_dialogue',
  'evaluating_transcript',
  'evaluating_speech',
  'composing_report',
  'completed',
  'failed',
] as const

export type SpeakLiveEvaluationPipelinePhase = (typeof SPEAK_LIVE_EVALUATION_PHASES)[number]

export type SpeakLiveEvaluationProgressPartialV1 = {
  /** Normalized learner turns ready for scoring / LLM */
  learnerTurnCount?: number
  /** Turns in normalized session envelope */
  normalizedTurnCount?: number
  sessionDurationSeconds?: number
  /** Narrow stage within transcript-related work */
  transcriptEvalStage?: 'normalized' | 'openai'
  assessTurnsMs?: number
  llmMs?: number
  llmSource?: 'llm' | 'deterministic'
  /** Short learner-facing lines when available early */
  insightPreview?: string[]
}

export type SpeakLiveEvaluationProgressV1 = {
  version: 1
  phase: SpeakLiveEvaluationPipelinePhase
  updatedAt: string
  partial?: SpeakLiveEvaluationProgressPartialV1
}

export type SpeakLiveEvaluationProgressReporter = (update: SpeakLiveEvaluationProgressV1) => void | Promise<void>

export function buildSpeakLiveEvaluationProgressV1(
  phase: SpeakLiveEvaluationPipelinePhase,
  partial?: SpeakLiveEvaluationProgressPartialV1,
): SpeakLiveEvaluationProgressV1 {
  return {
    version: 1,
    phase,
    updatedAt: new Date().toISOString(),
    ...(partial && Object.keys(partial).length ? { partial } : {}),
  }
}

export function parseSpeakLiveEvaluationProgressV1(raw: string | null | undefined): SpeakLiveEvaluationProgressV1 | null {
  if (!raw?.trim()) return null
  try {
    const o = JSON.parse(raw) as SpeakLiveEvaluationProgressV1
    if (o?.version !== 1 || typeof o.phase !== 'string') return null
    const phases = SPEAK_LIVE_EVALUATION_PHASES as readonly string[]
    if (!phases.includes(o.phase)) return null
    return o
  } catch {
    return null
  }
}
