/**
 * Bounded-concurrency Azure Speech assessment for **user** turns only.
 * Each turn is assessed independently; failures do not cancel sibling turns or the text LLM lane.
 */
import type { PostSessionSpeechTurnInput } from './speakLiveNormalizedConversation'
import type { PostSessionSpeechTurnResult } from './speakLivePostSessionSpeechAssessment'
import { buildPostSessionSpeechEmergencyResult } from './speakLivePostSessionSpeechAssessment'
import type { SpeakLiveAzureSpeechPhonemeIssueV1, SpeakLiveAzureSpeechWordTimingV1 } from './speakLiveAzureSpeechEvaluationArtifact.schema'
import { SPEAK_LIVE_AZURE_REQUIRED_MODE, type SpeakLiveAzureMode } from './liveVoiceEvaluationTypes'

const DEFAULT_CONCURRENCY = 4
const MIN_CONCURRENCY = 1
const MAX_CONCURRENCY = 5

function parseConcurrencyLimit(): number {
  const raw = process.env.SPEAK_LIVE_AZURE_SPEECH_BATCH_CONCURRENCY?.trim()
  const n = raw ? Number.parseInt(raw, 10) : NaN
  if (!Number.isFinite(n)) return DEFAULT_CONCURRENCY
  return Math.min(MAX_CONCURRENCY, Math.max(MIN_CONCURRENCY, n))
}

type AssessPostSessionUserTurn = (params: {
  threadId: string
  scenarioGoals: string[]
  turn: PostSessionSpeechTurnInput
}) => Promise<PostSessionSpeechTurnResult>

let cachedAssess: AssessPostSessionUserTurn | null = null
async function loadAssessPostSessionUserTurn(): Promise<AssessPostSessionUserTurn> {
  if (!cachedAssess) {
    const m = await import('./speakLivePostSessionSpeechAssessment')
    cachedAssess = m.assessPostSessionUserTurn
  }
  return cachedAssess
}

/** Vitest-only: clears cached `assessPostSessionUserTurn` so spies apply after `vi.spyOn`. */
export function resetAzureSpeechBatchAssessorCacheForTests(): void {
  cachedAssess = null
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const ret: R[] = new Array(items.length)
  let cursor = 0
  const pool = Math.min(Math.max(1, limit), Math.max(1, items.length))
  async function worker() {
    while (true) {
      const idx = cursor++
      if (idx >= items.length) break
      ret[idx] = await fn(items[idx]!, idx)
    }
  }
  await Promise.all(Array.from({ length: pool }, () => worker()))
  return ret
}

export type UserTurnSpeechWordLevelScore = {
  word: string
  accuracyScore: number
  errorType?: string
  startMs?: number | null
  endMs?: number | null
}

export type UserTurnSpeechPhonemeIssue = SpeakLiveAzureSpeechPhonemeIssueV1

/** Per-turn Azure / audio metrics for diagnostics and optional UI surfacing. */
export type UserTurnSpeechAssessmentMetrics = {
  turnId: string
  assessmentOk: boolean
  pronunciationScore: number
  fluencyScore: number
  prosodyScore: number | null
  completenessScore: number
  pacingScore: number
  speakingRate: number
  hesitationCount: number
  weakWords: string[]
  wordLevelScores: UserTurnSpeechWordLevelScore[]
  phonemeIssues: UserTurnSpeechPhonemeIssue[]
  /** True when there was no learner clip to score (blob missing or unusable). */
  skipped?: boolean
  error?: string
}

export type AzureSpeechBatchDiagnostics = {
  azureBatchMs: number
  assessedTurnCount: number
  skippedTurnCount: number
  failedTurnCount: number
  concurrencyLimit: number
  /**
   * Strict-live marker — Azure speech analysis ALWAYS runs live for the FluentCopilot scenario report.
   * Caches, mocks and precomputed results are explicitly forbidden by the evaluation contract.
   */
  azureMode: SpeakLiveAzureMode
  /**
   * Aggregate wall time spent inside Azure provider calls (sum across turns; bounded by concurrency
   * so it can exceed `azureBatchMs`).
   */
  providerRequestMs: number
}

export type AssessUserTurnsSpeechBatchResult = {
  turnResults: PostSessionSpeechTurnResult[]
  perTurnMetrics: UserTurnSpeechAssessmentMetrics[]
  batch: AzureSpeechBatchDiagnostics
}

export function buildUserTurnSpeechMetricsFromResult(turn: PostSessionSpeechTurnResult): UserTurnSpeechAssessmentMetrics {
  const { turnEval, weakWordList, audioCtx, turnTiming } = turn
  const az = turnEval.azureSpeechEvaluation
  const timing = audioCtx?.timing
  const words = audioCtx?.words ?? []

  if (az) {
    const wordTimings: SpeakLiveAzureSpeechWordTimingV1[] = az.wordTimings ?? []
    return {
      turnId: turnEval.turnId,
      assessmentOk: turnTiming.assessmentOk,
      pronunciationScore: az.pronunciation,
      fluencyScore: az.fluency,
      prosodyScore: az.prosody,
      completenessScore: az.completeness,
      pacingScore: az.pacing,
      speakingRate: az.speakingRate,
      hesitationCount: az.hesitationCount,
      weakWords: az.weakWords?.length ? [...az.weakWords] : [...weakWordList],
      wordLevelScores: wordTimings.map((w) => ({
        word: w.word,
        accuracyScore: w.accuracyScore,
        errorType: w.errorType,
        startMs: w.startMs ?? null,
        endMs: w.endMs ?? null,
      })),
      phonemeIssues: [...(az.phonemeIssues ?? [])],
      skipped: turnTiming.skippedReason ? true : undefined,
    }
  }

  const a = turnEval.audioScores ?? {
    pronunciation: 0,
    fluency: 0,
    rhythm: 0,
    completeness: 0,
    clarity: 0,
  }
  return {
    turnId: turnEval.turnId,
    assessmentOk: turnTiming.assessmentOk,
    pronunciationScore: a.pronunciation,
    fluencyScore: a.fluency,
    prosodyScore: null,
    completenessScore: a.completeness,
    pacingScore: a.rhythm,
    speakingRate: timing?.estimatedWpm ?? 0,
    hesitationCount: timing?.hesitationMoments?.length ?? 0,
    weakWords: [...weakWordList],
    wordLevelScores: words.map((w) => ({
      word: w.word,
      accuracyScore: w.accuracyScore,
      errorType: w.errorType,
      startMs: w.startMs ?? null,
      endMs: w.endMs ?? null,
    })),
    phonemeIssues: [],
    skipped: turnTiming.skippedReason ? true : undefined,
    error: turnTiming.warning ?? turnTiming.errorCode,
  }
}

function finalizeBatchResult(
  turnResults: PostSessionSpeechTurnResult[],
  batchStarted: number,
  limit: number,
): AssessUserTurnsSpeechBatchResult {
  const sorted = turnResults.slice().sort((a, b) => a.turnEval.turnIndex - b.turnEval.turnIndex)
  const perTurnMetrics = sorted.map(buildUserTurnSpeechMetricsFromResult)
  let assessedTurnCount = 0
  let skippedTurnCount = 0
  let failedTurnCount = 0
  let providerRequestMs = 0
  for (const r of sorted) {
    const t = r.turnTiming
    if (t.skippedReason) {
      skippedTurnCount++
      continue
    }
    if (t.hadAudio && t.assessmentOk) assessedTurnCount++
    else if (t.hadAudio || (t.blobBytes ?? 0) >= 32) failedTurnCount++
    providerRequestMs += t.providerRequestMs ?? t.audioAssessmentMs ?? 0
  }
  return {
    turnResults: sorted,
    perTurnMetrics,
    batch: {
      azureBatchMs: Date.now() - batchStarted,
      assessedTurnCount,
      skippedTurnCount,
      failedTurnCount,
      concurrencyLimit: limit,
      azureMode: SPEAK_LIVE_AZURE_REQUIRED_MODE,
      providerRequestMs,
    },
  }
}

async function assessUserTurnsSpeechSequential(params: {
  threadId: string
  scenarioGoals: string[]
  userTurns: PostSessionSpeechTurnInput[]
  concurrencyLimit: number
  batchStarted: number
}): Promise<AssessUserTurnsSpeechBatchResult> {
  try {
    const assess = await loadAssessPostSessionUserTurn()
    const out: PostSessionSpeechTurnResult[] = []
    for (const turn of params.userTurns) {
      out.push(
        await safeAssessOne({
          assess,
          threadId: params.threadId,
          scenarioGoals: params.scenarioGoals,
          turn,
        }),
      )
    }
    return finalizeBatchResult(out, params.batchStarted, params.concurrencyLimit)
  } catch (e) {
    console.error('[SpeechBatch] Sequential lane failed; using emergency text-only stubs.', e)
    const reason = e instanceof Error ? e.message : String(e)
    const out = params.userTurns.map((turn) =>
      buildPostSessionSpeechEmergencyResult({
        threadId: params.threadId,
        scenarioGoals: params.scenarioGoals,
        turn,
        reason,
      }),
    )
    return finalizeBatchResult(out, params.batchStarted, params.concurrencyLimit)
  }
}

/** When the whole batch pipeline fails, still return one stub per user turn so the report composer can run. */
export function buildEmergencyUserTurnsSpeechBatchResult(params: {
  threadId: string
  scenarioGoals: string[]
  userTurns: PostSessionSpeechTurnInput[]
  batchStarted: number
  error: unknown
}): AssessUserTurnsSpeechBatchResult {
  const reason = params.error instanceof Error ? params.error.message : String(params.error)
  const out = params.userTurns.map((turn) =>
    buildPostSessionSpeechEmergencyResult({
      threadId: params.threadId,
      scenarioGoals: params.scenarioGoals,
      turn,
      reason,
    }),
  )
  return finalizeBatchResult(out, params.batchStarted, 1)
}

async function safeAssessOne(params: {
  assess: AssessPostSessionUserTurn
  threadId: string
  scenarioGoals: string[]
  turn: PostSessionSpeechTurnInput
}): Promise<PostSessionSpeechTurnResult> {
  try {
    return await params.assess({
      threadId: params.threadId,
      scenarioGoals: params.scenarioGoals,
      turn: params.turn,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[SpeechBatch] Unexpected error assessing turn', params.turn.msg.id, msg)
    const meta = (params.turn.msg.metadata ?? {}) as Record<string, unknown>
    const clone: PostSessionSpeechTurnInput = {
      ...params.turn,
      msg: {
        ...params.turn.msg,
        metadata: { ...meta, learnerAudioBlobPath: undefined, learnerAudioMimeType: meta.learnerAudioMimeType },
      },
    }
    try {
      return await params.assess({
        threadId: params.threadId,
        scenarioGoals: params.scenarioGoals,
        turn: clone,
      })
    } catch (e2) {
      const msg2 = e2 instanceof Error ? e2.message : String(e2)
      console.error('[SpeechBatch] Text-only fallback failed', params.turn.msg.id, msg2)
      return buildPostSessionSpeechEmergencyResult({
        threadId: params.threadId,
        scenarioGoals: params.scenarioGoals,
        turn: params.turn,
        reason: `${msg} | ${msg2}`.slice(0, 900),
      })
    }
  }
}

/**
 * Assess each user turn with Azure Speech (when audio exists), with bounded parallelism.
 * Order of `turnResults` matches `userTurns` after sorting by `turnIndex` (same as prior `Promise.all` behavior).
 */
export async function assessUserTurnsSpeechBatch(params: {
  threadId: string
  scenarioGoals: string[]
  userTurns: PostSessionSpeechTurnInput[]
  /** Override env `SPEAK_LIVE_AZURE_SPEECH_BATCH_CONCURRENCY` (clamped 1–5). */
  concurrencyLimit?: number
}): Promise<AssessUserTurnsSpeechBatchResult> {
  const batchStarted = Date.now()
  const limit = Math.min(
    MAX_CONCURRENCY,
    Math.max(MIN_CONCURRENCY, params.concurrencyLimit ?? parseConcurrencyLimit()),
  )
  try {
    const assess = await loadAssessPostSessionUserTurn()
    const results = await mapWithConcurrency(params.userTurns, limit, async (turn) =>
      safeAssessOne({ assess, threadId: params.threadId, scenarioGoals: params.scenarioGoals, turn }),
    )
    return finalizeBatchResult(results, batchStarted, limit)
  } catch (e) {
    console.error('[SpeechBatch] Concurrent assessment failed; retrying sequential lane.', e)
    return assessUserTurnsSpeechSequential({
      threadId: params.threadId,
      scenarioGoals: params.scenarioGoals,
      userTurns: params.userTurns,
      concurrencyLimit: 1,
      batchStarted,
    })
  }
}