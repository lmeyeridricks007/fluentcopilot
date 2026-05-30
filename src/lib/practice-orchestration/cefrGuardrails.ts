/**
 * CEFR A2 guardrails — rules text for prompts + light post-processing on model/mock output.
 */
import { clampAssistantReplyDutch } from '@/lib/practice/conversation/a2ResponsePolicy'
import type { A2DifficultyBand } from '@/lib/practice-orchestration/types'
import { getDifficultyConstraints } from '@/lib/practice-orchestration/difficultyPolicy'

/** Non-exhaustive markers of complexity drift (Dutch). */
const COMPLEXITY_MARKERS = [
  /\b(niettemin|derhalve|althans|desalniettemin|dientengevolge)\b/i,
  /\b(wellicht|desondanks|hoewel)\b.*\b(omdat|zodat|mits)\b/i,
]

export function cefrA2GuardrailPromptBlock(): string {
  return [
    'CEFR target: A2 Dutch for practical real-life situations.',
    'Use common, high-frequency vocabulary. Avoid idioms unless they are very common and scene-appropriate.',
    'Stay concrete: places, objects, actions, times, prices, simple symptoms, simple admin steps.',
    'Do not sound like a textbook or essay. No long abstract explanations.',
    'Do not switch to meta-tutor mode: you are the character in the scenario, not a general assistant.',
    'If you must use a harder word, keep the rest of the sentence very simple.',
    'Avoid heavy formal or legal Dutch unless the scene is clearly an official desk (e.g. gemeente).',
  ].join('\n')
}

export function detectComplexityDrift(text: string): boolean {
  const t = text.trim()
  if (t.length > 320) return true
  return COMPLEXITY_MARKERS.some((re) => re.test(t))
}

/**
 * Final shaping: length clamp + optional trim when drift detected.
 */
export function postProcessForA2(text: string, band: A2DifficultyBand): string {
  const c = getDifficultyConstraints(band)
  let out = clampAssistantReplyDutch(text, c.maxCharsSoft)
  if (detectComplexityDrift(out)) {
    const sentences = out.split(/(?<=[.!?])\s+/).filter(Boolean)
    out = sentences.slice(0, c.maxSentencesPerTurn).join(' ')
    out = clampAssistantReplyDutch(out, c.maxCharsSoft)
  }
  return out
}
