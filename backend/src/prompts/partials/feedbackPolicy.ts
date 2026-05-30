import type { FeedbackMode } from '../../models/contracts'

export function feedbackPolicyPartial(mode: FeedbackMode): string {
  if (mode === 'turn') {
    return (
      'Feedback policy: after_each — the learner expects coaching after every Dutch user message. ' +
      'You MUST return a non-null `feedback` object whenever the user wrote Dutch (mixed with English is fine). ' +
      'If the Dutch is already strong, still give one short tip: category "register" or "clarity", originalText = a brief user excerpt, ' +
      'correctedText = a natural alternative or the same line if truly optimal, explanation = one encouraging sentence in English. ' +
      'When there is a clear mistake, use "grammar" or "phrasing" with a concrete correctedText. ' +
      'Only use feedback null if the user message has no Dutch at all (e.g. only punctuation or English-only meta).'
    )
  }
  return (
    'Feedback policy: at_end — set `feedback` to null for this turn (defer coaching to recap); ' +
    'still populate saveWordCandidates if obvious.'
  )
}
