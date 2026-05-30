/** Labels after `**Label:**` that are instructions, not dialogue to speak. */
const SKIP_SPEAKER_LABELS = new Set(
  [
    'gist check',
    'detail check',
    'listen & read',
    'listening focus',
    'reading focus',
    'what you’ll be able to do',
    "what you'll be able to do",
    'while you listen',
    'while you read',
    'transcript',
    'notice',
    'tip',
    'culture tip',
    'culture reminder',
    'culture snapshot — the netherlands',
    'example starter (you can change it)',
    'your turn (1–2 short sentences, dutch or mixed)',
    'your task',
    'try this',
    'model message (dutch)',
    'quick self-check',
    'script reminder',
  ].map((s) => s.toLowerCase())
)

/** Matches `**Speaker:** utterance` (markdown bold includes the colon before the closing `**`). */
const DIALOGUE_LINE = /^\*\*([^*]+?):\*\*\s*(.*)$/
const SPREKER_LINE = /^Spreker\s*(\d+)\s*:\s*(.+)$/i

export type SpeakableLine = {
  speaker: string
  utterance: string
}

function tryParseDialogueLine(line: string): SpeakableLine | null {
  const trimmed = line.trim()
  const m = trimmed.match(DIALOGUE_LINE)
  if (!m) return null
  const speaker = m[1].trim()
  const utterance = m[2].trim()
  if (!utterance) return null
  if (SKIP_SPEAKER_LABELS.has(speaker.toLowerCase())) return null
  return { speaker, utterance }
}

function tryParseTranscriptLine(line: string): SpeakableLine | null {
  const trimmed = line.trim()
  const m = trimmed.match(SPREKER_LINE)
  if (!m) return null
  const n = m[1]
  const utterance = m[2].trim()
  if (!utterance) return null
  return { speaker: `Spreker ${n}`, utterance }
}

/** Ordered speakable segments (utterances only), for play-all. */
export function extractSpeakableLines(text: string): SpeakableLine[] {
  const out: SpeakableLine[] = []
  for (const line of text.split('\n')) {
    const d = tryParseDialogueLine(line)
    if (d) {
      out.push(d)
      continue
    }
    const s = tryParseTranscriptLine(line)
    if (s) out.push(s)
  }
  return out
}

export function isListenFocusedStep(title: string, activityHead: string): boolean {
  const t = title.trim().toLowerCase()
  if (t.includes('listen')) return true
  if (t === 'listening') return true
  const head = activityHead.slice(0, 120).toLowerCase()
  if (head.includes('**listen & read**')) return true
  if (head.includes('**listening focus**')) return true
  if (head.includes('**reading focus**')) return true
  return false
}

export type LineSegment =
  | { kind: 'prose'; raw: string }
  | { kind: 'speak'; line: SpeakableLine }

/** Classify a single line (no newlines). */
export function classifyContentLine(line: string): LineSegment {
  const d = tryParseDialogueLine(line)
  if (d) return { kind: 'speak', line: d }
  const s = tryParseTranscriptLine(line)
  if (s) return { kind: 'speak', line: s }
  return { kind: 'prose', raw: line }
}

export function paragraphIsAllSpeak(para: string): boolean {
  const lines = para.split('\n')
  const classified = lines.map(classifyContentLine)
  const nonEmptyIdx = lines.map((_, i) => i).filter((i) => lines[i].trim().length > 0)
  if (nonEmptyIdx.length === 0) return false
  return nonEmptyIdx.every((i) => classified[i].kind === 'speak')
}

export type ActivityBlock =
  | { kind: 'prose'; text: string }
  | { kind: 'dialogue'; lines: SpeakableLine[] }

/** Split step `activity` into prose vs all-dialogue paragraphs (for listen / hide-text modes). */
export function segmentActivityBlocks(text: string): ActivityBlock[] {
  return text.split(/\n\n+/).map((para) => {
    if (paragraphIsAllSpeak(para)) {
      const lines: SpeakableLine[] = []
      for (const line of para.split('\n')) {
        if (!line.trim()) continue
        const c = classifyContentLine(line)
        if (c.kind === 'speak') lines.push(c.line)
      }
      return { kind: 'dialogue', lines }
    }
    return { kind: 'prose', text: para }
  })
}
