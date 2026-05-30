/**
 * Turn raw OCR lines into clean reading text while keeping paragraph breaks where possible.
 */

function isLikelyNoiseLine(line: string): boolean {
  const t = line.trim()
  if (t.length === 0) return true
  // Page numbers, lone bullets, or mostly non-letters (URLs, UI chrome)
  if (t.length <= 2 && !/\p{L}/u.test(t)) return true
  const letters = (t.match(/\p{L}/gu) ?? []).length
  const digits = (t.match(/\p{N}/gu) ?? []).length
  const alnum = letters + digits
  if (t.length >= 4 && alnum / t.length < 0.25) return true
  return false
}

/** Collapse runs of blank lines to at most one paragraph break (double newline → single when excessive). */
export function postProcessOcrLines(rawLines: string[]): string {
  const cleaned: string[] = []
  for (const line of rawLines) {
    const t = line.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim()
    if (!t) continue
    if (isLikelyNoiseLine(t)) continue
    cleaned.push(t)
  }
  if (cleaned.length === 0) return ''

  // Preserve line breaks between lines; merge only when lines are very short continuations (broken words) — skip aggressive merge for v1
  let text = cleaned.join('\n')
  // Normalize 3+ newlines to double (paragraph max)
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

/** Heuristic: image may not be text (icons, scenery) — lots of symbols, almost no letters. */
export function looksLikeUnsupportedTextContent(text: string): boolean {
  const t = text.trim()
  if (t.length < 8) return true
  const letters = (t.match(/\p{L}/gu) ?? []).length
  if (letters < 4) return true
  if (letters / t.length < 0.12 && t.length > 40) return true
  return false
}
