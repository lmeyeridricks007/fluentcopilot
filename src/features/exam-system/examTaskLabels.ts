import type { ExamTaskType } from '@/lib/exam-system/types'

const LABELS: Record<ExamTaskType, string> = {
  practical_request: 'Practical request',
  short_response: 'Short response',
  roleplay: 'Role-play',
  describe_situation: 'Describe situation',
  explain_process: 'Explain process',
  give_opinion: 'Opinion',
  justify_reason: 'Justify / reason',
  follow_up_response: 'Follow-up',
  compare_options: 'Compare options',
  storytelling: 'Story',
  sequencing: 'Sequencing',
  read_aloud_exam: 'Read aloud',
  listening_response_exam: 'Listening response',
  listening_mcq_exam: 'Listening (multiple choice)',
  writing_task_exam: 'Writing',
  knowledge_mcq: 'KNM (multiple choice)',
}

export function examTaskTypeLabel(taskType: ExamTaskType): string {
  return LABELS[taskType] ?? taskType
}
