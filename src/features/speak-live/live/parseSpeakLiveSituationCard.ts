export type SituationEmphasis = { title: string; body: string }

export type ParsedSpeakLiveSituation =
  | { kind: 'plain'; text: string }
  | {
      kind: 'structured'
      intro: string
      setting: string
      bullets: string[]
      emphasis?: SituationEmphasis
    }

const EMPHASIS_MARKERS: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /\s+Kern van deze run:\s*/i, title: 'Focus for this session' },
  { pattern: /\s+Jouw situatie in deze run:\s*/i, title: 'This session' },
  { pattern: /\s+Jouw voorkeur in deze run:\s*/i, title: 'Your preference' },
]

function splitTailSentences(tail: string): string[] {
  return tail
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Turns a single Dutch learner summary (often `… Setting: …`) into labelled blocks
 * for clearer hierarchy on Speak Live.
 */
export function parseSpeakLiveSituationCard(raw: string): ParsedSpeakLiveSituation {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (!text) return { kind: 'plain', text: '' }

  const settingSep = /\s+Setting:\s+/i.exec(text)
  if (!settingSep) return { kind: 'plain', text }

  const intro = text.slice(0, settingSep.index).trim()
  const tail = text.slice(settingSep.index + settingSep[0].length).trim()
  if (!tail) {
    return intro ? { kind: 'structured', intro, setting: '', bullets: [] } : { kind: 'plain', text }
  }

  for (const { pattern, title } of EMPHASIS_MARKERS) {
    const m = pattern.exec(tail)
    if (m && m.index !== undefined) {
      const before = tail.slice(0, m.index).trim()
      const body = tail.slice(m.index + m[0].length).trim()
      return {
        kind: 'structured',
        intro,
        setting: before,
        bullets: [],
        emphasis: body ? { title, body } : undefined,
      }
    }
  }

  const sentences = splitTailSentences(tail)
  if (sentences.length <= 1) {
    return { kind: 'structured', intro, setting: tail.replace(/\.\s*$/, '').trim() || tail, bullets: [] }
  }

  const [first, ...rest] = sentences
  return {
    kind: 'structured',
    intro,
    setting: first ?? tail,
    bullets: rest,
  }
}
