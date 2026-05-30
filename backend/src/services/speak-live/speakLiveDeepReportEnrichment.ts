/**
 * Optional **deep** scenario evaluation pass — runs ASYNCHRONOUSLY in the background after the
 * synchronous fast report has already been returned to the learner. Never blocks initial report
 * display.
 *
 * Triggered by {@link isReportDeepEnrichmentEnabled} (env: `REPORT_ENABLE_DEEP_REPORT_ENRICHMENT`).
 * The pass produces a deep {@link ScenarioDialogueStructuredOutput} and merges it into the stored
 * evaluation safely (only enriches non-blocking detail surfaces; does not overwrite headline
 * scoring established by the FAST + Azure merge).
 *
 * Hard contract:
 * - Skip silently when disabled.
 * - Never throw — surface failures via aiLogError so the fast report stays the source of truth.
 * - Never widen the {@link LiveSessionEvaluation} contract; merges into existing optional fields.
 */
import { aiLogError } from '../ai/logging/aiRunLogger'
import { isReportDeepEnrichmentEnabled } from '../ai/config/aiProviderConfig'
import type { ConversationMessage } from '../../models/contracts'
import type { LiveEvalLlmTurnInput } from './liveSessionEvaluationLlm'
import {
  buildScenarioDialogueStructuredEvalInputFromMessages,
  evaluateScenarioDialogueStructured,
} from './speakLiveScenarioDialogueStructuredEvaluator'
import type { ScenarioDialogueStructuredOutput } from './speakLiveScenarioDialogueStructured.schema'
import type { LiveSessionEvaluation } from './liveVoiceEvaluationTypes'

export type SpeakLiveDeepEnrichmentInput = {
  threadId: string
  scenarioTitle: string
  scenarioSlug: string
  scenarioGoals: string[]
  learnerLevel: string
  recapGoalsCompleted: string[]
  recapGoalsMissed: string[]
  recapWhatWentWell: string[]
  recapWhatToImprove: string[]
  messages: ConversationMessage[]
  /** User-turn previews (same shape used by the fast lane). */
  userTurnInputs: LiveEvalLlmTurnInput[]
}

export type SpeakLiveDeepEnrichmentResult =
  | { ok: true; structured: ScenarioDialogueStructuredOutput; deepMs: number }
  | { ok: false; reason: string; deepMs: number }

/**
 * Run the DEEP scenario evaluator. Caller is responsible for scheduling this **off the synchronous
 * report path** — typically via {@link scheduleDeepEnrichmentBackground}.
 */
export async function runDeepReportEnrichment(
  input: SpeakLiveDeepEnrichmentInput,
): Promise<SpeakLiveDeepEnrichmentResult> {
  const startedAt = Date.now()
  const dialogueEval = buildScenarioDialogueStructuredEvalInputFromMessages({
    threadId: input.threadId,
    scenarioTitle: input.scenarioTitle,
    scenarioSlug: input.scenarioSlug,
    scenarioGoals: input.scenarioGoals,
    learnerLevel: input.learnerLevel,
    messages: input.messages,
    recapGoalsCompleted: input.recapGoalsCompleted,
    recapGoalsMissed: input.recapGoalsMissed,
    recapWhatWentWell: input.recapWhatWentWell,
    recapWhatToImprove: input.recapWhatToImprove,
  })
  const result = await evaluateScenarioDialogueStructured(
    {
      dialogue: dialogueEval,
      userTurnInputs: input.userTurnInputs,
      scenarioTitle: input.scenarioTitle,
      scenarioGoals: input.scenarioGoals,
      learnerLevel: input.learnerLevel,
    },
    {
      mode: 'deep',
      attemptJsonRepair: true,
    },
  )
  const deepMs = Date.now() - startedAt
  if (result.ok) {
    return { ok: true, structured: result.structured, deepMs }
  }
  return { ok: false, reason: result.reason, deepMs }
}

/**
 * Merge the deep-enrichment output into a stored {@link LiveSessionEvaluation} without overwriting
 * headline scores or per-turn merged scoring. Only enriches narrative surfaces:
 * - `overallSummary.coachSummary` if the deep summary is longer / richer
 * - per-turn `dutchLikenessNarrative` if blank
 * - per-turn `chunkingRhythmSuggestion` if blank
 *
 * IMPORTANT: this MUST be a safe no-op when fields are already populated (FAST has priority).
 */
export function mergeDeepEnrichmentIntoEvaluation(params: {
  evaluation: LiveSessionEvaluation
  deep: ScenarioDialogueStructuredOutput
}): void {
  const { evaluation: ev, deep } = params
  if (
    typeof ev.overallSummary?.coachSummary === 'string' &&
    ev.overallSummary.coachSummary.length < deep.overall.summary.length &&
    deep.overall.summary.length <= 2000
  ) {
    ev.overallSummary = {
      ...ev.overallSummary,
      coachSummary: deep.overall.summary,
    }
  }
  const byId = new Map(deep.turns.map((t) => [t.turnId, t]))
  for (const row of ev.turnEvaluations ?? []) {
    const d = byId.get(row.turnId)
    if (!d) continue
    if (!row.dutchLikenessNarrative?.trim() && d.weakPatterns.length) {
      const ls = d.languageScores
      row.dutchLikenessNarrative =
        `Grammar ${ls.grammar} · vocab ${ls.vocabulary} · naturalness ${ls.naturalness} · task fit ${ls.taskRelevance}.`
    }
    if (!row.chunkingRhythmSuggestion?.trim() && d.practiceNext?.trim()) {
      row.chunkingRhythmSuggestion = d.practiceNext.trim().slice(0, 1200)
    }
  }
}

/**
 * Fire-and-forget deep enrichment. Returns immediately. The caller passes a `persist` callback that
 * is invoked once the deep pass succeeds; failure is logged via {@link aiLogError} and never
 * propagates.
 *
 * Default behavior (when {@link isReportDeepEnrichmentEnabled} is `false`): no-op. The synchronous
 * fast report is the source of truth and the function returns immediately without scheduling work.
 */
export function scheduleDeepEnrichmentBackground(params: {
  input: SpeakLiveDeepEnrichmentInput
  persist: (deep: ScenarioDialogueStructuredOutput) => Promise<void>
  /** Optional explicit override for the env flag — used by tests. */
  enabled?: boolean
}): { scheduled: boolean } {
  const enabled = params.enabled ?? isReportDeepEnrichmentEnabled()
  if (!enabled) return { scheduled: false }
  /**
   * Fire and forget — `void` the promise so we never block the initial report. Failures are logged
   * via aiLogError so the fast report stays the source of truth.
   */
  void runDeepReportEnrichment(params.input)
    .then(async (r) => {
      if (!r.ok) {
        aiLogError('speak_live_deep_enrichment_failed', new Error(r.reason), {
          threadId: params.input.threadId,
        })
        return
      }
      try {
        await params.persist(r.structured)
      } catch (e) {
        aiLogError('speak_live_deep_enrichment_persist_failed', e, {
          threadId: params.input.threadId,
        })
      }
    })
    .catch((e) => {
      aiLogError('speak_live_deep_enrichment_unhandled', e, { threadId: params.input.threadId })
    })
  return { scheduled: true }
}
