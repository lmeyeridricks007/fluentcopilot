export type SessionModality =
  | 'speak'
  | 'chat'
  | 'read_aloud'
  | 'listening'
  | 'personalized_practice'
  | 'exam_simulation'
  | 'exam_training'

/** Subtle session lifecycle — sentence case, never dominant headings. */
export type SessionHistoryStatus = 'paused' | 'active' | 'ended' | 'saved'

/** Filter tabs — core modalities plus aggregate and Fluent Exam. */
export type SessionFilterTab = 'all' | 'exam' | Exclude<SessionModality, 'exam_simulation' | 'exam_training'>

export function modalityMatchesTab(modality: SessionModality, tab: SessionFilterTab): boolean {
  if (tab === 'all') return true
  if (tab === 'exam') return modality === 'exam_simulation' || modality === 'exam_training'
  return tab === modality
}
