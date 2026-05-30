import type { ExamTaskInstance } from './types'

/** Spoken passage: dialogue / scenario only (no question stem or answer labels). */
export function listeningMcqDialogueLine(task: Pick<ExamTaskInstance, 'listeningScriptNl'>): string {
  return task.listeningScriptNl?.trim() ?? ''
}

const NL_OPTION_ORDER_LABELS = [
  'Eerste keuze',
  'Tweede keuze',
  'Derde keuze',
  'Vierde keuze',
  'Vijfde keuze',
  'Zesde keuze',
] as const

/**
 * Text for TTS: Dutch question plus each option read in order (no letters A–D — those sound
 * like dialogue speakers when combined with scenario audio).
 */
export function listeningMcqQuestionAndOptionsLine(
  task: Pick<ExamTaskInstance, 'promptNl' | 'mcq'>,
): string {
  const q = task.promptNl.trim()
  const opts = task.mcq?.options ?? []
  const lines = [`De vraag luidt: ${q}`]
  opts.forEach((o, idx) => {
    const intro = NL_OPTION_ORDER_LABELS[idx] ?? `Keuze ${idx + 1}`
    lines.push(`${intro}: ${o.label.trim()}`)
  })
  return lines.join('\n\n')
}
