import type { ExamTaskInstance } from './types'

/** How formal the writing task expects the learner to sound. */
export type WritingExamRegister = 'informal_app' | 'formal_mail' | 'neutral_work' | 'short_note' | 'general'

export function writingExamRegisterFromTask(task: ExamTaskInstance): WritingExamRegister {
  const p = task.promptNl ?? ''
  const stratum = task.writingExamStratum

  if (stratum === 'informal_social' || /app-bericht|kort app-bericht/i.test(p)) {
    return 'informal_app'
  }
  if (
    stratum === 'formal_email' ||
    /Situatie \(wonen\)|Je richt je tot\s+.+\.\s*Je hebt het volgende nodig/i.test(p) ||
    /korte mail.*verhuurder|Geachte heer/i.test(p)
  ) {
    return 'formal_mail'
  }
  if (stratum === 'short_note' || /één formele zin|Schrijf één\b/i.test(p)) {
    return 'short_note'
  }
  if (/Situatie \(werk\)|weekvergadering|naar je team/i.test(p)) {
    return 'neutral_work'
  }
  return 'general'
}

export function writingPromptIsInformalApp(promptNl: string): boolean {
  return /app-bericht|kort app-bericht/i.test(promptNl)
}
