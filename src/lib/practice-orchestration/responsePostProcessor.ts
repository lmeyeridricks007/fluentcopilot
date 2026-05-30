import type { A2DifficultyBand } from '@/lib/practice-orchestration/types'
import { postProcessForA2 } from '@/lib/practice-orchestration/cefrGuardrails'

const ASSISTANT_META_PHRASES = [
  /als (je )?taalcoach/i,
  /ik ben (een )?assistent/i,
  /laten we (nu )?grammatica/i,
]

/**
 * Strip obvious “generic assistant” leakage while staying conservative (A2-safe).
 */
export function stripAssistantDrift(text: string): string {
  let t = text
  for (const re of ASSISTANT_META_PHRASES) {
    if (re.test(t)) {
      t = t.replace(re, '').trim()
    }
  }
  return t
}

export function finalizeAssistantResponse(text: string, band: A2DifficultyBand): string {
  return postProcessForA2(stripAssistantDrift(text), band)
}
