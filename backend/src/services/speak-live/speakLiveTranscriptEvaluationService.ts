/**
 * OpenAI transcript / language-coaching lane for post-session Speak Live.
 * Operates on **user** turn facts only; assistant text is embedded per turn as context.
 */
import {
  runLiveSessionEvaluationLlm,
  type LiveEvalLlmResult,
  type LiveEvalLlmTurnInput,
} from './liveSessionEvaluationLlm'

export type SpeakLiveTranscriptCoachInput = {
  scenarioTitle: string
  scenarioSlug?: string | null
  scenarioGoals: string[]
  learnerLevel: string
  recapGoalsCompleted: string[]
  recapGoalsMissed: string[]
  recapWhatWentWell: string[]
  recapWhatToImprove: string[]
  turns: LiveEvalLlmTurnInput[]
}

/** Session-level OpenAI coaching over learner transcripts (+ Azure summaries per turn). */
export async function evaluateSpeakLiveTranscriptsWithOpenAI(
  input: SpeakLiveTranscriptCoachInput,
  structuredOpts?: import('./speakLiveStructuredTranscriptEvaluationService').SpeakLiveStructuredTranscriptEvalOptions,
): Promise<LiveEvalLlmResult> {
  return runLiveSessionEvaluationLlm({
    scenarioTitle: input.scenarioTitle,
    scenarioSlug: input.scenarioSlug,
    scenarioGoals: input.scenarioGoals,
    learnerLevel: input.learnerLevel,
    recapGoalsCompleted: input.recapGoalsCompleted,
    recapGoalsMissed: input.recapGoalsMissed,
    recapWhatWentWell: input.recapWhatWentWell,
    recapWhatToImprove: input.recapWhatToImprove,
    turns: input.turns,
    structuredTranscriptEvalOptions: structuredOpts,
  })
}
