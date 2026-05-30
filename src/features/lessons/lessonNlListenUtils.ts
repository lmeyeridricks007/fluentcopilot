import { stripMarkdownForTts } from './speakTextUtils'

/** `• NL: …` or `NL: …` (one line). Body may contain several fragments separated by `/`. */
const NL_BULLET_LINE = /^\s*[•\u2022*-]?\s*NL:\s*(.+)$/i
const EN_BULLET_LINE = /^\s*[•\u2022*-]?\s*EN:\s*(.+)$/i

export function parseNlBulletLine(line: string): string[] | null {
  const m = line.match(NL_BULLET_LINE)
  if (!m) return null
  const body = m[1].trim()
  if (!body) return null
  return body
    .split(/\s*\/\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function parseEnBulletLine(line: string): string[] | null {
  const m = line.match(EN_BULLET_LINE)
  if (!m) return null
  const body = m[1].trim()
  if (!body) return null
  return body
    .split(/\s*\/\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/** All Dutch snippets from `NL:` lines, top to bottom, for “play all”. */
export function extractAllNlUtterances(text: string): string[] {
  const out: string[] = []
  for (const line of text.split('\n')) {
    const parts = parseNlBulletLine(line)
    if (!parts) continue
    for (const p of parts) {
      const t = stripMarkdownForTts(p)
      if (t) out.push(t)
    }
  }
  return out
}

export function textHasNlBulletLines(text: string): boolean {
  return extractAllNlUtterances(text).length > 0
}
