/**
 * Report-time speaking samples when the task bank has no `example` field.
 * Delegates to `inferSpeakingModelAnswerNl` for prompt-specific, level-calibrated answers.
 */
import type { ExamLevel, ExamTaskType } from './types'
import { inferSpeakingModelAnswerNl } from './speakingPromptModelAnswer'

export type SynthesizedSpeakingExample = { text: string; isScaffold: boolean }

const SPEAKING_TASK_TYPES = new Set<ExamTaskType>([
  'practical_request',
  'short_response',
  'roleplay',
  'describe_situation',
  'explain_process',
  'give_opinion',
  'justify_reason',
  'follow_up_response',
  'compare_options',
  'storytelling',
  'sequencing',
])

export function isSynthesizableSpeakingTaskType(t: ExamTaskType): boolean {
  return SPEAKING_TASK_TYPES.has(t)
}

export function synthesizeSpeakingReportExampleNl(task: {
  taskType: ExamTaskType
  promptNl: string
  level: ExamLevel
}): SynthesizedSpeakingExample {
  return inferSpeakingModelAnswerNl({
    taskType: task.taskType,
    promptNl: task.promptNl,
    level: task.level,
  })
}
