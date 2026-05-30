/**
 * Step 5 activities end with a --- delimiter and an "All four skills" block:
 * optional emoji + **Listening|Reading|Writing|Speaking:** sections, then optional italic footer.
 */

export type FourSkillsKey = 'listening' | 'reading' | 'writing' | 'speaking'

export type ParsedFourSkillsSection = {
  skill: FourSkillsKey
  body: string
}

export type ParsedFourSkillsBlock = {
  /** Text before the `\n---\n` that precedes the four-skills header (trimmed). */
  preamble: string
  /** Raw markdown line, e.g. **All four skills — …** */
  headerMarkdown: string
  sections: ParsedFourSkillsSection[]
  /** Trailing italic note, e.g. *(If this lesson…)* */
  footer: string
}

const BLOCK_SPLIT = /\n---\s*\n\s*(\*\*All four skills[\s\S]*?\*\*)\s*\n([\s\S]*)$/im

/** Optional emoji (any pictographic); heading is `**Listening:**` (colon inside bold) in generated JSON. */
const SECTION_HEAD =
  /(?:^|\n)(\s*\p{Extended_Pictographic}\uFE0F?\s*)?\*\*(Listening|Reading|Writing|Speaking):\*\*\s*/giu

function toSkill(label: string): FourSkillsKey | null {
  const m: Record<string, FourSkillsKey> = {
    Listening: 'listening',
    Reading: 'reading',
    Writing: 'writing',
    Speaking: 'speaking',
  }
  return m[label] ?? null
}

/**
 * If the activity contains the standard four-skills tail, returns preamble + parsed sections.
 * Otherwise returns null (caller uses the full string as a normal step).
 */
export function parseFourSkillsBlock(fullText: string): ParsedFourSkillsBlock | null {
  const normalized = fullText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const m = normalized.match(BLOCK_SPLIT)
  if (!m || m.index === undefined) return null

  const preamble = normalized.slice(0, m.index).trimEnd()
  const headerMarkdown = m[1].trim()
  const rest = m[2]

  const found = [...rest.matchAll(SECTION_HEAD)]
  if (found.length < 4) return null

  const sections: ParsedFourSkillsSection[] = []
  let footer = ''

  for (let i = 0; i < 4; i++) {
    const skill = toSkill(found[i][2])
    if (!skill) return null
    const start = found[i].index! + found[i][0].length
    const end = found[i + 1]?.index ?? rest.length
    let body = rest.slice(start, end).trim()
    if (i === 3) {
      const foot = body.match(/\n\n(\*\([\s\S]*?\)\*)\s*$/)
      if (foot) {
        body = body.slice(0, foot.index!).trim()
        footer = foot[1].trim()
      }
    }
    sections.push({ skill, body })
  }

  return { preamble, headerMarkdown, sections, footer }
}
