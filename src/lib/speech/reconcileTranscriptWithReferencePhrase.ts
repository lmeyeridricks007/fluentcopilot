function stripEdgePunct(tok: string): string {
  return tok
    .toLowerCase()
    .replace(/^[`'"ʼ]+/g, '')
    .replace(/[?.!,;…]+$/g, '')
}

function normalizedTokenLine(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(stripEdgePunct)
    .join(' ')
}

/**
 * When guided practice offers fixed starter lines, map a raw transcript to the single matching
 * starter when the normalized text matches exactly, or when all tokens after the first match
 * exactly one starter (handles Whisper writing Dutch "Is" as "s").
 */
export function pickMatchingStarterSuggestion(
  transcript: string,
  suggestions: readonly string[]
): string | null {
  if (!suggestions.length) return null
  const tNorm = normalizedTokenLine(transcript)
  if (!tNorm) return null

  const exact: string[] = []
  for (const sug of suggestions) {
    if (normalizedTokenLine(sug) === tNorm) exact.push(sug.trim())
  }
  if (exact.length === 1) return exact[0]!

  const tParts = transcript.trim().split(/\s+/).filter(Boolean)
  if (tParts.length < 2) return null
  const tRest = tParts.slice(1).map(stripEdgePunct).join(' ')

  const matches: string[] = []
  for (const sug of suggestions) {
    const sParts = sug.trim().split(/\s+/).filter(Boolean)
    if (sParts.length < 2) continue
    const sRest = sParts.slice(1).map(stripEdgePunct).join(' ')
    if (sRest === tRest) matches.push(sug.trim())
  }
  return matches.length === 1 ? matches[0]! : null
}

/**
 * When the learner repeats a known reference line, Whisper sometimes writes Dutch "Is" as "s"
 * (informal "'s" without the apostrophe). If every following token matches the reference, align
 * the first token with the reference surface form.
 */
export function reconcileTranscriptWithReferencePhrase(
  transcript: string,
  reference: string | null | undefined
): string {
  const t = transcript.trim()
  const r = reference?.trim()
  if (!t || !r) return t

  const tToks = t.split(/\s+/).filter(Boolean)
  const rToks = r.split(/\s+/).filter(Boolean)
  if (tToks.length < 2 || rToks.length < 2) return t

  const tRest = tToks.slice(1).map(stripEdgePunct).join(' ')
  const rRest = rToks.slice(1).map(stripEdgePunct).join(' ')
  if (tRest !== rRest) return t

  const t0 = stripEdgePunct(tToks[0])
  const r0 = stripEdgePunct(rToks[0])
  if (t0 === 's' && r0 === 'is') {
    const refFirst = r.match(/^\S+/)?.[0] ?? 'Is'
    const tail = t.replace(/^\s*\S+\s*/, '').trimStart()
    return tail ? `${refFirst} ${tail}` : refFirst
  }

  return t
}
