/**
 * When the global writing exam clock expires: score current draft + auto-submit empty for remaining tasks.
 */
import { evaluateWritingSimulationSubmission } from '@/lib/exam-prep/writing/writingSimulationEvaluationService'
import type { WritingSimulationSessionPlan } from '@/lib/exam-prep/writing/writingSimulationSessionBuilder'
import type { WritingSimulationTaskBundle } from '@/lib/exam-prep/writing/types'

export type WritingExamDraftSnapshot = {
  bodyText: string
  fieldValues?: Record<string, string>
  isForm: boolean
}

/**
 * Append bundles from `fromTaskIndex` onward. First task uses `draft` (timed out); later tasks empty + timed out.
 */
export function flushWritingSimulationFromTaskIndex(input: {
  plan: WritingSimulationSessionPlan
  fromTaskIndex: number
  draft: WritingExamDraftSnapshot
  taskStartedAtIso: string
  submittedAtIso: string
}): WritingSimulationTaskBundle[] {
  const { plan, fromTaskIndex, draft, taskStartedAtIso, submittedAtIso } = input
  const out: WritingSimulationTaskBundle[] = []

  for (let i = fromTaskIndex; i < plan.taskCount; i++) {
    const task = plan.tasks[i]!
    const item = task.item
    const isFirst = i === fromTaskIndex
    const startedAt = isFirst ? taskStartedAtIso : submittedAtIso

    if (isFirst) {
      if (draft.isForm) {
        out.push(
          evaluateWritingSimulationSubmission({
            item,
            bodyText: '',
            fieldValues: { ...draft.fieldValues },
            startedAtIso: startedAt,
            submittedAtIso: submittedAtIso,
            timedOut: true,
          })
        )
      } else {
        out.push(
          evaluateWritingSimulationSubmission({
            item,
            bodyText: draft.bodyText,
            fieldValues: undefined,
            startedAtIso: startedAt,
            submittedAtIso: submittedAtIso,
            timedOut: true,
          })
        )
      }
    } else {
      const emptyFields: Record<string, string> = {}
      for (const f of item.formFields ?? []) {
        emptyFields[f.id] = ''
      }
      const isForm = (item.formFields?.length ?? 0) > 0
      out.push(
        evaluateWritingSimulationSubmission({
          item,
          bodyText: '',
          fieldValues: isForm ? emptyFields : undefined,
          startedAtIso: submittedAtIso,
          submittedAtIso: submittedAtIso,
          timedOut: true,
        })
      )
    }
  }

  return out
}
