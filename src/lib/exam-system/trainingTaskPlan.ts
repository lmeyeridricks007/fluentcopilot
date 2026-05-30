import type { ExamTaskInstance, ExamTaskType, ExamTrainingEntryMode } from './types'

/** Task types we bias toward first for weakness / adaptive training (harder / exam-critical first). */
const WEAKNESS_PRIORITY: ExamTaskType[] = [
  'knowledge_mcq',
  'compare_options',
  'justify_reason',
  'follow_up_response',
  'give_opinion',
  'explain_process',
  'storytelling',
  'roleplay',
  'describe_situation',
  'practical_request',
  'short_response',
  'sequencing',
  'read_aloud_exam',
  'listening_response_exam',
  'listening_mcq_exam',
  'writing_task_exam',
]

function priority(tt: ExamTaskType): number {
  const i = WEAKNESS_PRIORITY.indexOf(tt)
  return i === -1 ? 99 : i
}

export function shapeTrainingTasks(
  tasks: ExamTaskInstance[],
  entryMode: ExamTrainingEntryMode,
  focusTaskType: ExamTaskType | undefined,
): ExamTaskInstance[] {
  const copy = [...tasks]
  if (entryMode === 'by_task_type' && focusTaskType) {
    const filtered = copy.filter((t) => t.taskType === focusTaskType)
    if (filtered.length >= 2) return filtered
    if (filtered.length === 1) return filtered
    return copy
  }
  if (entryMode === 'by_weakness' || entryMode === 'adaptive') {
    copy.sort((a, b) => priority(a.taskType) - priority(b.taskType))
    if (entryMode === 'adaptive') {
      const head = copy.slice(0, Math.min(4, copy.length))
      const tail = copy.slice(Math.min(4, copy.length))
      tail.sort(() => Math.random() - 0.5)
      return [...head, ...tail]
    }
    return copy
  }
  return copy
}
