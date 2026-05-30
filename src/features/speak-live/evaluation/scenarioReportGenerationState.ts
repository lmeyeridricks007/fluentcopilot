import type { ApiLiveSessionEvaluationResponse, SpeakLiveEvaluationPipelinePhase } from '@/lib/api/apiTypes'
import type { SessionEvaluationReport } from './reportTypes'

/** UI-facing lifecycle for Speak Live scenario report generation (includes derived `partial`). */
export type ScenarioReportGenerationUiStatus =
  | SpeakLiveEvaluationPipelinePhase
  | 'partial'
  | 'complete'

export function isScenarioReportDevDiagnosticsEnabled(opts?: {
  nodeEnv?: string
  evalDevQuery?: string | null
}): boolean {
  const node = opts?.nodeEnv ?? (typeof process !== 'undefined' ? process.env.NODE_ENV : undefined)
  const q = opts?.evalDevQuery
  return node === 'development' || q === '1'
}

export function isOptimizedScenarioReportLane(phase: SpeakLiveEvaluationPipelinePhase | null | undefined): boolean {
  return phase === 'evaluating_dialogue'
}

export function deriveScenarioReportGenerationUiStatus(
  payload: ApiLiveSessionEvaluationResponse | null | undefined,
  rawEvaluation: Record<string, unknown> | null | undefined,
): ScenarioReportGenerationUiStatus | null {
  if (!payload) return 'queued'
  if (payload.status === 'failed') return 'failed'
  if (payload.status === 'complete' && payload.evaluation) {
    const raw = rawEvaluation ?? (payload.evaluation as Record<string, unknown>)
    if (isPartialOptimizedScenarioReport(raw)) {
      return 'partial'
    }
    return 'complete'
  }
  if (payload.status === 'pending' || payload.status === 'running') {
    const p = payload.evaluationPhase
    if (p && p !== 'completed') return p
    return 'queued'
  }
  return null
}

export function isPartialOptimizedScenarioReport(raw: Record<string, unknown> | null | undefined): boolean {
  if (!raw) return false
  const diag = raw.scenarioReportScoringDiagnosticsV1 as { speechQualityStatus?: string } | undefined
  if (diag?.speechQualityStatus === 'partial') return true
  const warnings = (raw.generationDiagnostics as { parallelOrchestrationV1?: { warnings?: string[] } } | undefined)
    ?.parallelOrchestrationV1?.warnings
  return Boolean(warnings?.some((w) => /speech quality partial|only \d+ of \d+ audio turns were azure-assessed/i.test(w)))
}

export function getScenarioReportLoadingHeadline(params: {
  verifying: boolean
  evaluationPhase: SpeakLiveEvaluationPipelinePhase | null | undefined
}): string {
  if (params.verifying) return 'Verifying your feedback'
  return 'Building your speaking report'
}

export function getScenarioReportLoadingSubtitle(params: {
  verifying: boolean
  qaSummary: string | null | undefined
  evaluationPhase: SpeakLiveEvaluationPipelinePhase | null | undefined
}): string {
  if (params.verifying) {
    return (
      params.qaSummary?.trim() ||
      "We're checking that the coaching matches what you actually said and recorded."
    )
  }
  switch (params.evaluationPhase) {
    case 'queued':
      return 'Your session is in line for analysis. This screen updates automatically — usually within a minute.'
    case 'evaluating_dialogue':
      return "We're reading your turns in context of the scenario goals, then we'll layer in voice feedback."
    case 'evaluating_transcript':
      return "We're reviewing what you said turn by turn before we score delivery."
    case 'evaluating_speech':
      return "We're analyzing your recordings for clarity, rhythm, and pronunciation."
    case 'composing_report':
      return "We're assembling your personalized coaching notes and scores."
    default:
      return "We're reviewing your recording and what you said. This will refresh on its own."
  }
}

export type ScenarioReportStageChipId = 'queued' | 'dialogue' | 'speech' | 'report' | 'qa'

export function activeScenarioReportStageChip(
  evaluationPhase: SpeakLiveEvaluationPipelinePhase | null | undefined,
  opts: { verifying: boolean; qaRunning: boolean },
): ScenarioReportStageChipId {
  if (opts.verifying || opts.qaRunning) return 'qa'
  switch (evaluationPhase) {
    case 'evaluating_dialogue':
    case 'evaluating_transcript':
      return 'dialogue'
    case 'evaluating_speech':
      return 'speech'
    case 'composing_report':
      return 'report'
    case 'queued':
    default:
      return 'queued'
  }
}

export function extractParallelScenarioReportDevSnapshot(
  report: SessionEvaluationReport | null | undefined,
  payload: ApiLiveSessionEvaluationResponse | null | undefined,
): {
  totalMs: number | undefined
  structuredLlmMs: number | undefined
  azureBatchMs: number | undefined
  referenceTtsMs: number | undefined
  persistMs: number | undefined
  warnings: string[]
  failedSubtasks: Array<{ task: string; reason: string }>
  modelName: string | undefined
  approximateInputTokens: number | undefined
  approximateOutputTokens: number | undefined
  fallbackUsed: boolean | undefined
} {
  const gen = report?.generationDiagnostics as Record<string, unknown> | undefined
  const parallel = gen?.parallelOrchestrationV1 as Record<string, unknown> | undefined
  const app = gen?.app as Record<string, unknown> | undefined
  const timings = payload?.evaluationDiagnostics?.timings

  const warningsRaw = parallel?.warnings
  const warnings = Array.isArray(warningsRaw)
    ? warningsRaw.filter((w): w is string => typeof w === 'string')
    : []

  const failedRaw = parallel?.failedSubtasks
  const failedSubtasks = Array.isArray(failedRaw)
    ? failedRaw
        .filter((x): x is { task: string; reason: string } => {
          if (!x || typeof x !== 'object') return false
          const o = x as Record<string, unknown>
          return typeof o.task === 'string' && typeof o.reason === 'string'
        })
        .map((x) => ({ task: x.task, reason: x.reason }))
    : []

  return {
    totalMs: typeof gen?.totalMs === 'number' ? gen.totalMs : timings?.totalMs,
    structuredLlmMs: typeof parallel?.structuredLlmMs === 'number' ? (parallel.structuredLlmMs as number) : undefined,
    azureBatchMs: typeof parallel?.azureBatchMs === 'number' ? (parallel.azureBatchMs as number) : undefined,
    referenceTtsMs: typeof parallel?.referenceTtsMs === 'number' ? (parallel.referenceTtsMs as number) : undefined,
    persistMs: typeof app?.persistMs === 'number' ? (app.persistMs as number) : timings?.persistMs,
    warnings,
    failedSubtasks,
    modelName: typeof parallel?.modelName === 'string' ? parallel.modelName : undefined,
    approximateInputTokens:
      typeof parallel?.approximateInputTokens === 'number' ? (parallel.approximateInputTokens as number) : undefined,
    approximateOutputTokens:
      typeof parallel?.approximateOutputTokens === 'number' ? (parallel.approximateOutputTokens as number) : undefined,
    fallbackUsed: typeof parallel?.fallbackUsed === 'boolean' ? parallel.fallbackUsed : undefined,
  }
}
