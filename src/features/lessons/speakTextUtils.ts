/** Plain text for TTS from lesson markdown fragments. */
export function stripMarkdownForTts(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim()
}

/** Gap markers become a short pause cue for listen-along. */
export function textForGapTaskTts(s: string): string {
  return stripMarkdownForTts(s).replace(/_{3,}/g, ' … ')
}

/** Avoid TTS on obviously English-only feedback in mixed UI. */
export function looksLikeDutch(s: string): boolean {
  const t = stripMarkdownForTts(s).toLowerCase()
  if (!t) return false
  return /\b(het|een|de|dat|die|dit|niet|ik|je|jij|u|wij|jullie|zij|zijn|ben|is|hebben|heeft|had|voor|met|van|naar|hier|daar|waar|hoe|wat|welke|wie|waarom|kan|kun|kunt|wil|moet|mag|ga|gaat|gaan|vandaag|morgen|gisteren|graag|alsjeblieft|bedankt|alstublieft|maar|omdat|want|als|dan|ook|nog|al|veel|weinig|goed|slecht|lekker|mooi)\b/.test(
    t
  )
}

/**
 * For four-skills “Listen” cards: Dutch is often inside *italics* while the rest is English instructions.
 */
export function extractDutchSnippetForTts(text: string): string | null {
  const collapsed = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  let best = ''
  const starRe = /\*([^*]+)\*/g
  let m: RegExpExecArray | null
  while ((m = starRe.exec(collapsed)) !== null) {
    const seg = m[1].trim()
    if (looksLikeDutch(seg) && seg.length > best.length) best = seg
  }
  if (best) return stripMarkdownForTts(best)

  const plain = stripMarkdownForTts(collapsed.replace(/\n\n+/g, ' '))
  if (looksLikeDutch(plain)) return plain
  return null
}
