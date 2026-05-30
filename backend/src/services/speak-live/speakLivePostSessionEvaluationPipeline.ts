/**
 * Post-session evaluation pipeline entry — transcript (OpenAI) + speech (Azure) + merge + report.
 * Execution is **asynchronous relative to the browser**: the HTTP handler returns quickly while
 * work continues on the server; the UI polls evaluation status (see `liveSessionEvaluationAppService`).
 */
import type { ConversationMessage, ScenarioConfig } from '../../models/contracts'
import type { LiveSessionEvaluation } from './liveVoiceEvaluationTypes'
import { buildLiveSessionEvaluationRecord } from './liveSessionEvaluationOrchestrator'
import { buildNormalizedSpeakLiveSession } from './speakLiveNormalizedConversation'
import { buildSpeakLivePostSessionWorkItemStub } from './speakLivePostSessionEvaluationPipelineTypes'
import type { SpeakLiveEvaluationProgressReporter } from './speakLiveAsyncEvaluationProgress'

export type SpeakLivePostSessionPipelineInput = {
  threadId: string
  scenario: ScenarioConfig
  learnerLevel: string
  messages: ConversationMessage[]
  summaryText: string | null | undefined
  speakLiveStateJson?: string | null
  /** When set, builds a queue work-item stub for observability (no external queue wired yet). */
  externalUserId?: string | null
}

export async function runSpeakLivePostSessionEvaluationPipeline(
  input: SpeakLivePostSessionPipelineInput & {
    evaluationProgressReporter?: SpeakLiveEvaluationProgressReporter
  },
): Promise<LiveSessionEvaluation> {
  const normalized = buildNormalizedSpeakLiveSession({
    threadId: input.threadId,
    scenario: input.scenario,
    learnerLevel: input.learnerLevel,
    messages: input.messages,
  })

  if (process.env.SPEAK_LIVE_EVAL_PIPELINE_DEBUG === '1' && input.externalUserId) {
    const workItem = buildSpeakLivePostSessionWorkItemStub({
      threadId: input.threadId,
      externalUserId: input.externalUserId,
      scenario: normalized.scenario,
      level: normalized.level,
      session: normalized.session,
    })
    console.log('[PostSessionPipeline] workItem(stub)', workItem.correlationId)
  }

  return buildLiveSessionEvaluationRecord({
    threadId: input.threadId,
    scenario: input.scenario,
    learnerLevel: input.learnerLevel,
    messages: input.messages,
    summaryText: input.summaryText,
    speakLiveStateJson: input.speakLiveStateJson,
    evaluationProgressReporter: input.evaluationProgressReporter,
  })
}
