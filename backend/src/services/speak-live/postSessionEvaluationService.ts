/**
 * Post-session Speak Live evaluation — consumes persisted turns + learner audio blobs.
 * Invoked when the session is completed (typically via HTTP run + poll).
 */
import type { LiveSessionEvaluation } from './liveVoiceEvaluationTypes'
import { runSpeakLivePostSessionEvaluationPipeline } from './speakLivePostSessionEvaluationPipeline'
import type { ScenarioConfig } from '../../models/contracts'
import type { ConversationMessage } from '../../models/contracts'

import type { SpeakLiveEvaluationProgressReporter } from './speakLiveAsyncEvaluationProgress'

export async function buildPostSessionEvaluationReport(input: {
  threadId: string
  scenario: ScenarioConfig
  learnerLevel: string
  messages: ConversationMessage[]
  summaryText: string | null | undefined
  speakLiveStateJson?: string | null
  /** Optional — used for pipeline debug / future queue correlation only. */
  externalUserId?: string | null
  evaluationProgressReporter?: SpeakLiveEvaluationProgressReporter
}): Promise<LiveSessionEvaluation> {
  return runSpeakLivePostSessionEvaluationPipeline({
    threadId: input.threadId,
    scenario: input.scenario,
    learnerLevel: input.learnerLevel,
    messages: input.messages,
    summaryText: input.summaryText,
    speakLiveStateJson: input.speakLiveStateJson,
    externalUserId: input.externalUserId,
    evaluationProgressReporter: input.evaluationProgressReporter,
  })
}
