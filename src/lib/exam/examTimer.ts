/**
 * Global exam clock helpers (DUO-style pooled time).
 */
export {
  remainingSecondsFromDeadline,
  formatCountdownMmSs,
  urgencyToneClass,
} from '@/lib/exam-session/examTimerService'

import {
  DUO_KNM_DURATION_SEC,
  DUO_LISTENING_DURATION_SEC,
  DUO_READING_DURATION_SEC,
  DUO_SPEAKING_2025_DURATION_SEC,
  DUO_WRITING_DURATION_SEC,
} from '@/lib/exam/duoExamStructure'
import type { ExamTypeId } from '@/lib/exam-session/examSessionState'

export function defaultTotalDurationSecForExamType(examType: ExamTypeId): number {
  switch (examType) {
    case 'reading':
      return DUO_READING_DURATION_SEC
    case 'listening':
      return DUO_LISTENING_DURATION_SEC
    case 'writing':
      return DUO_WRITING_DURATION_SEC
    case 'speaking':
      return DUO_SPEAKING_2025_DURATION_SEC
    case 'kmn':
      return DUO_KNM_DURATION_SEC
    default:
      return 30 * 60
  }
}
