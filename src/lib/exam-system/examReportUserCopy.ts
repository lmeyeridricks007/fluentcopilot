import type { ExamScoringDimension } from './types'

/** Learner-facing labels for scoring areas (not internal “rubric dimension” jargon). */
export function examDimensionLabelFriendly(dim: ExamScoringDimension | string): string {
  const map: Partial<Record<ExamScoringDimension, string>> = {
    task_completion: 'Task completion',
    completeness: 'Completeness',
    structure: 'Structure & layout',
    grammar_control: 'Grammar & spelling',
    relevance: 'Fit to the question',
    natural_wording: 'Word choice',
    politeness: 'Tone & greetings',
    pronunciation_delivery: 'Pronunciation & delivery',
    understandability: 'How clear you sound',
    listening_accuracy: 'Listening accuracy',
    responsiveness: 'Responding to cues',
    continuation: 'Keeping the conversation going',
    directness: 'Getting to the point',
    completion: 'Finishing the request',
    stance: 'Stating your view',
    reason: 'Giving reasons',
    sequence: 'Order of events',
    clarity: 'Clarity',
    tense_flow: 'Time markers',
  }
  const key = dim as ExamScoringDimension
  return map[key] ?? String(dim).replace(/_/g, ' ')
}

/** Title line on score breakdown cards: `Grammar & spelling (49%)`. */
export function dimensionScoreCardTitle(dim: ExamScoringDimension, percent: number): string {
  return `${examDimensionLabelFriendly(dim)} (${Math.round(percent)}%)`
}

/** Multi-line tips grouped under one form line (report cards + field tips). */
export function formatGroupedFieldNotesBody(
  notes: readonly { fieldLabel: string; message: string }[],
  maxItems = 6,
): string {
  const short = (label: string) => (label.length <= 44 ? label : `${label.slice(0, 41)}…`)
  const byField = new Map<string, string[]>()
  for (const n of notes.slice(0, maxItems)) {
    const key = short(n.fieldLabel)
    const arr = byField.get(key) ?? []
    arr.push(n.message)
    byField.set(key, arr)
  }
  const blocks: string[] = []
  for (const [field, messages] of byField) {
    blocks.push(`On “${field}”`)
    for (const m of messages) blocks.push(`• ${m}`)
  }
  return blocks.join('\n')
}
