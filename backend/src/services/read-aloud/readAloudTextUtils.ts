/** Normalize for Dutch-ish comparison: lowercase, collapse whitespace, strip most punctuation. */
export function normalizeForCompare(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[^\p{L}\p{N}\s'-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizeWords(s: string): string[] {
  const n = normalizeForCompare(s)
  if (!n) return []
  return n.split(/\s+/).filter(Boolean)
}

/**
 * Split into sentences for display/analysis. Naive but stable for learner-authored Dutch text.
 */
export function splitSentences(text: string): string[] {
  const t = text.replace(/\r\n/g, '\n').trim()
  if (!t) return []
  const parts = t.split(/(?<=[.!?…])\s+/u)
  const out: string[] = []
  for (const p of parts) {
    const s = p.trim()
    if (s) out.push(s)
  }
  return out.length > 0 ? out : [t]
}
