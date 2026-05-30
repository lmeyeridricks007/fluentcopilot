/**
 * Clause-based TTS for Speak Live — generates audio for individual speakable
 * clauses so the client can overlap TTS with LLM streaming.
 *
 * Instead of waiting for the full assistant reply, the client fires a TTS
 * request as soon as the first sentence boundary appears in the streamed text.
 */

import { generateSpeakLiveAssistantSpeech } from './speakLiveTtsGateway'
import type { GenerateSpeechResult } from '../audio/textToSpeechContracts'

const MIN_CLAUSE_CHARS = 12
const SENTENCE_END = /[.?!;]\s*/
const CLAUSE_BOUNDARY = /,\s+/

/**
 * Split text into speakable clauses suitable for incremental TTS.
 *
 * Rules:
 * - Split on sentence-ending punctuation (`.` `?` `!` `;`)
 * - Split on comma boundaries when the resulting clause is >= 15 chars
 * - Merge tiny fragments (< MIN_CLAUSE_CHARS) into the previous clause
 * - Return at least one clause if input is non-empty
 */
export function splitIntoSpeakableClauses(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const sentences = trimmed.split(SENTENCE_END).filter((s) => s.trim())
  if (sentences.length === 0) return [trimmed]

  const clauses: string[] = []
  for (const sentence of sentences) {
    const parts = sentence.split(CLAUSE_BOUNDARY).filter((s) => s.trim())
    for (const part of parts) {
      const cleaned = part.trim()
      if (!cleaned) continue
      if (clauses.length > 0 && cleaned.length < MIN_CLAUSE_CHARS) {
        clauses[clauses.length - 1] += ', ' + cleaned
      } else {
        clauses.push(cleaned)
      }
    }
  }

  if (clauses.length === 0) return [trimmed]
  return clauses
}

/**
 * Detect completed clauses from a growing stream of text.
 * Returns the portion of text that forms complete clauses and the remaining tail.
 */
export function extractCompletedClauses(accumulatedText: string): {
  completedText: string
  remaining: string
  clauses: string[]
} {
  const trimmed = accumulatedText.trim()
  if (!trimmed) return { completedText: '', remaining: '', clauses: [] }

  const lastSentenceEnd = Math.max(
    trimmed.lastIndexOf('.'),
    trimmed.lastIndexOf('?'),
    trimmed.lastIndexOf('!'),
    trimmed.lastIndexOf(';'),
  )

  if (lastSentenceEnd < 0) {
    return { completedText: '', remaining: trimmed, clauses: [] }
  }

  const completed = trimmed.slice(0, lastSentenceEnd + 1).trim()
  const remaining = trimmed.slice(lastSentenceEnd + 1).trim()
  const clauses = splitIntoSpeakableClauses(completed)

  return { completedText: completed, remaining, clauses }
}

export async function generateTtsForClause(input: {
  text: string
  threadId?: string
  chunkIndex: number
}): Promise<GenerateSpeechResult & { chunkIndex: number }> {
  const result = await generateSpeakLiveAssistantSpeech({
    text: input.text,
    threadId: input.threadId,
    language: 'nl',
  })
  return { ...result, chunkIndex: input.chunkIndex }
}
