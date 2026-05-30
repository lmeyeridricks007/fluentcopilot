import { evaluateSpeakingSimulationSubmission } from '@/lib/exam-prep/speaking/speakingSimulationEvaluationService'
import type { SpeakingSimulationSessionPlan } from '@/lib/exam-prep/speaking/speakingSimulationSessionBuilder'
import type { SpeakingSimulationQuestionBundle } from '@/lib/exam-prep/speaking/types'

export type SpeakingExamDraftSnapshot = {
  text: string
  inputMode: 'voice' | 'type'
  transcriptConfidence?: number
}

/**
 * Session time expired: score current transcript (timed out) + empty timed-out answers for remaining questions.
 */
export function flushSpeakingSimulationFromQuestionIndex(input: {
  plan: SpeakingSimulationSessionPlan
  fromQuestionIndex: number
  draft: SpeakingExamDraftSnapshot
  questionStartedAtIso: string
  submittedAtIso: string
}): SpeakingSimulationQuestionBundle[] {
  const { plan, fromQuestionIndex, draft, questionStartedAtIso, submittedAtIso } = input
  const out: SpeakingSimulationQuestionBundle[] = []

  for (let i = fromQuestionIndex; i < plan.questionCount; i++) {
    const q = plan.questions[i]!
    const isFirst = i === fromQuestionIndex
    const startedAt = isFirst ? questionStartedAtIso : submittedAtIso
    if (isFirst) {
      out.push(
        evaluateSpeakingSimulationSubmission({
          item: q,
          responseText: draft.text,
          inputMode: draft.inputMode,
          transcriptConfidence: draft.transcriptConfidence,
          startedAtIso: startedAt,
          submittedAtIso: submittedAtIso,
          timedOut: true,
        })
      )
    } else {
      out.push(
        evaluateSpeakingSimulationSubmission({
          item: q,
          responseText: '',
          inputMode: 'type',
          startedAtIso: submittedAtIso,
          submittedAtIso: submittedAtIso,
          timedOut: true,
        })
      )
    }
  }

  return out
}
