/**
 * Deterministic support copy tied to orchestration constraints (A2 bands, post-processing).
 * Used by in-conversation support tools — not a substitute for future LLM-backed support.
 */
import type { A2DifficultyBand } from '@/lib/practice-orchestration/types'
import { finalizeAssistantResponse } from '@/lib/practice-orchestration/responsePostProcessor'

export type KeyPhraseEntry = { phrase: string; translation?: string; context?: string }

export function stepEasierDifficulty(current: A2DifficultyBand): A2DifficultyBand | null {
  if (current === 'a2_upper') return 'a2_mid'
  if (current === 'a2_mid') return 'a2_lower'
  return null
}

/** First clause or up to ~8 words — “key phrase” without translating the whole turn. */
export function extractKeyPhraseChunk(nl: string): string {
  const trimmed = nl.trim()
  if (!trimmed) return ''
  const firstClause = trimmed.split(/(?<=[,;])/)[0]?.trim() ?? trimmed
  const oneSentence = firstClause.split(/(?<=[.!?])\s+/)[0]?.trim() ?? firstClause
  const words = oneSentence.split(/\s+/).slice(0, 10).join(' ')
  return words || oneSentence
}

export function buildSimplerAssistantReplay(originalNl: string): string {
  const trimmed = originalNl.trim()
  if (!trimmed) return 'Geen regel om te vereenvoudigen.'
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean)
  const shorter = sentences.slice(0, 1).join(' ').trim() || trimmed
  const polished = finalizeAssistantResponse(shorter, 'a2_lower')
  return `Langzamer, eenvoudiger: ${polished}`
}

export function buildKeyPhraseTranslation(
  assistantLine: string,
  keyPhrases: KeyPhraseEntry[]
): { chunkNl: string; glossEn: string } {
  const lower = assistantLine.toLowerCase()
  for (const kp of keyPhrases) {
    const p = kp.phrase.trim()
    if (p.length >= 3 && lower.includes(p.toLowerCase())) {
      return {
        chunkNl: p,
        glossEn:
          kp.translation?.trim() ||
          'Common service Dutch — reuse the sound pattern in your reply.',
      }
    }
  }
  const chunkNl = extractKeyPhraseChunk(assistantLine)
  return {
    chunkNl,
    glossEn: chunkNl
      ? `Key chunk: “${chunkNl}”. Keep going in short Dutch; you don’t need to mirror every word.`
      : 'No clear chunk yet — wait for the next assistant line.',
  }
}

export function buildContextualMeaningEn(assistantLine: string, scenarioGoal?: string): string {
  const t = assistantLine.trim()
  if (!t) return 'Nothing to explain yet.'
  const preview = t.length > 96 ? `${t.slice(0, 94)}…` : t
  const goal = scenarioGoal?.trim()
  const goalBit = goal
    ? ` Stay aligned with: ${goal.length > 72 ? `${goal.slice(0, 70)}…` : goal}.`
    : ''
  return `In context, they’re moving the scene forward with: “${preview}”.${goalBit} Answer with one clear idea — you don’t need perfect grammar.`
}

export function buildNaturalizedDutchSuggestion(
  userNl: string,
  keyPhrases: KeyPhraseEntry[]
): string {
  const trimmed = userNl.trim()
  if (!trimmed) return 'Type iets in het Nederlands — zelfs een paar woorden — dan stellen we het bij.'
  const lower = trimmed.toLowerCase()
  const match = keyPhrases.find((kp) => {
    const p = kp.phrase.toLowerCase()
    return p.length >= 4 && (lower.includes(p) || p.includes(lower.slice(0, Math.min(lower.length, 12))))
  })
  if (match) {
    const hint = match.translation ? ` (${match.translation})` : ''
    return `Natuurlijker in deze situatie: “${match.phrase}”.${hint} Pas aan met jouw detail.`
  }
  if (/^ik wil /i.test(trimmed)) {
    return 'Natuurlijker: “Ik zou graag … willen” of “Mag ik …?” — kies wat bij de setting past.'
  }
  if (/\b(please|sorry|thanks)\b/i.test(trimmed)) {
    return 'Natuurlijker: vervang Engels door korte NL — bijv. “alstublieft”, “sorry”, “dank u”.'
  }
  return `Natuurlijker: maak het korter en direct. Bijvoorbeeld: “${trimmed.slice(0, 48)}${trimmed.length > 48 ? '…' : ''}” → één zin met “Ik …” of “Kunt u …?”.`
}

export function buildOpenPracticeHint(input: {
  mode: 'semi_guided' | 'free'
  scenarioGoal?: string
  priorUserTurns: number
  /** When learner repeatedly opens hint / very short turns — escalate slightly. */
  supportDepth: 'light' | 'deeper'
}): string {
  const g = input.scenarioGoal?.trim()
  if (input.supportDepth === 'deeper' && g) {
    return `Hint: answer in one sentence tied to the goal — ${g.length > 100 ? `${g.slice(0, 98)}…` : g}`
  }
  if (g) {
    return `Hint: one clear reply about “${g.length > 70 ? `${g.slice(0, 68)}…` : g}”. Reuse a chunk you heard.`
  }
  return input.mode === 'free'
    ? 'Hint: one idea per message; polite and short. If stuck, name what you want in simple Dutch.'
    : 'Hint: mirror the setting (u/je) and answer in one sentence — subject + verb + one detail.'
}
