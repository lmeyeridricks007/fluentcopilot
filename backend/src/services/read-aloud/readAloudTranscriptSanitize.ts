import { splitSentences, tokenizeWords } from './readAloudTextUtils'

/** Strip scripts that should not appear in a Dutch read-aloud (Whisper hallucinations). */
function stripNonDutchScripts(s: string): string {
  return s
    .replace(/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]+/g, ' ') // Hangul
    .replace(/[\u3040-\u309F\u30A0-\u30FF]+/g, ' ') // Kana
    .replace(/[\u4E00-\u9FFF\u3400-\u4DBF]+/g, ' ') // CJK
    .replace(/\s+/g, ' ')
    .trim()
}

function normTok(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFC')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
}

/**
 * Whisper often emits long runs of the same word on silence/noise (e.g. "Nederlands" ×10).
 * Collapse consecutive identical tokens to at most `maxConsecutive` (default 1).
 */
function collapseRepeatedTokens(text: string, maxConsecutive: number): string {
  const parts = text.trim().split(/\s+/)
  if (parts.length === 0) return ''
  const out: string[] = []
  let lastKey = ''
  let run = 0
  for (const tok of parts) {
    const k = normTok(tok)
    if (!k) {
      out.push(tok)
      continue
    }
    if (k === lastKey) {
      run++
      if (run <= maxConsecutive) out.push(tok)
    } else {
      lastKey = k
      run = 1
      out.push(tok)
    }
  }
  return out.join(' ').trim()
}

/**
 * Drop leading tokens until the transcript begins like the **first sentence** of the passage.
 * Trimming on “any word that appears somewhere in the passage” wrongly keeps mid-story words
 * (e.g. “kijken”) as the start and breaks every sentence line.
 */
function trimLeadingUntilPassageStart(recognized: string, targetText: string): string {
  const sentences = splitSentences(targetText)
    .map((s) => s.trim())
    .filter(Boolean)
  const first = sentences[0]
  if (!first) return recognized.trim()

  const starters = tokenizeWords(first).filter((w) => w.length >= 1).slice(0, 10)
  if (!starters.length) return recognized.trim()

  const parts = recognized.trim().split(/\s+/)
  if (!parts.length) return ''

  const needAligned = starters.length >= 2 ? 2 : 1

  for (let i = 0; i < Math.min(parts.length, 200); i++) {
    const fromI = tokenizeWords(parts.slice(i).join(' '))
    let matched = 0
    for (; matched < starters.length && matched < fromI.length; matched++) {
      if (fromI[matched] !== starters[matched]!) break
    }
    if (matched >= needAligned) return parts.slice(i).join(' ').trim()
  }

  return recognized.trim()
}

/**
 * Light cleanup after STT for read-aloud: removes obvious garbage, does not rewrite Dutch content.
 * When `targetText` is set, drops leading tokens that do not appear in the passage (prefix hallucinations).
 */
export function sanitizeReadAloudTranscript(raw: string, targetText?: string): { text: string; changed: boolean } {
  const t0 = raw.trim()
  if (!t0) return { text: '', changed: false }

  let t = stripNonDutchScripts(t0)
  t = collapseRepeatedTokens(t, 1)
  if (targetText && t) {
    const trimmed = trimLeadingUntilPassageStart(t, targetText)
    if (trimmed.length > 0 && trimmed !== t) t = trimmed
  }

  const changed = t !== t0
  if (!t) return { text: t0, changed: false }
  return { text: t, changed }
}

/** Heuristic: transcript may still be unusable for matching (many junk tokens vs target). */
export function transcriptHasHallucinationRisk(recognized: string, targetText: string): boolean {
  const rt = tokenizeWords(recognized)
  const tt = new Set(tokenizeWords(targetText).map((w) => w.toLowerCase()))
  if (rt.length < 12) return false
  let overlap = 0
  for (const w of rt) {
    if (tt.has(w.toLowerCase())) overlap++
  }
  const ratio = overlap / rt.length
  return ratio < 0.25
}
