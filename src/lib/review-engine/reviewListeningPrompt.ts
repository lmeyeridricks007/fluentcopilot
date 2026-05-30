import type { ReviewItem } from '@/lib/schemas/reviewItem.schema'

const YOU_HEAR_LEAD_IN = /^(You hear|You heard):\s*/i

function stripYouHearLeadIn(prompt: string): string {
  return prompt.replace(YOU_HEAR_LEAD_IN, '').trim()
}

/**
 * Parse prompts like: You hear: “Twee koffie, alstublieft.” What did they order?
 * Supports curly or straight quotes (opening and closing may differ).
 */
export function parseYouHearPrompt(prompt: string): { snippet: string; instruction: string } | null {
  const trimmed = prompt.trim()
  const re =
    /^(You hear|You heard):\s*(["'\u201c\u2018])([\s\S]*?)(["'\u201d\u2019])\s+(.+)$/i
  const m = re.exec(trimmed)
  if (!m) return null
  return { snippet: m[3].trim(), instruction: m[5].trim() }
}

function extractAnyQuotedSnippet(prompt: string): string | null {
  const curly = /\u201c([^\u201d]+)\u201d/.exec(prompt)
  if (curly) return curly[1].trim()
  const straight = /"([^"]+)"/.exec(prompt)
  if (straight) return straight[1].trim()
  const single = /'([^']+)'/.exec(prompt)
  if (single) return single[1].trim()
  return null
}

function stripQuotedSegments(prompt: string): string {
  return prompt
    .replace(/\u201c[^\u201d]+\u201d/g, ' ')
    .replace(/"[^"]+"/g, ' ')
    .replace(/'[^']+'/g, ' ')
    .replace(YOU_HEAR_LEAD_IN, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function expectedAsString(expected: string | string[]): string {
  return Array.isArray(expected) ? expected[0] : expected
}

/**
 * Dutch line for TTS plus the on-screen instruction (English or mixed), without the heard transcript.
 */
export function listeningPromptParts(item: ReviewItem): { listeningTextNl: string; displayPrompt: string } {
  const meta =
    item.metadata && typeof item.metadata === 'object'
      ? (item.metadata as Record<string, unknown>)
      : {}
  const explicitNl =
    typeof meta.listeningNl === 'string' && meta.listeningNl.trim().length > 0
      ? meta.listeningNl.trim()
      : undefined
  const explicitInstruction =
    typeof meta.listeningInstruction === 'string' && meta.listeningInstruction.trim().length > 0
      ? meta.listeningInstruction.trim()
      : undefined

  if (explicitNl) {
    const parsed = parseYouHearPrompt(item.prompt)
    const displayPrompt =
      explicitInstruction ??
      parsed?.instruction ??
      (stripQuotedSegments(item.prompt) || item.prompt)
    return { listeningTextNl: explicitNl, displayPrompt }
  }

  const parsed = parseYouHearPrompt(item.prompt)
  if (parsed) {
    return { listeningTextNl: parsed.snippet, displayPrompt: parsed.instruction }
  }

  const loose = extractAnyQuotedSnippet(item.prompt)
  if (loose) {
    const rest = stripQuotedSegments(item.prompt)
    return {
      listeningTextNl: loose,
      displayPrompt: rest.length > 0 ? rest : 'Listen to the line, then choose the best answer.',
    }
  }

  const correct = expectedAsString(item.expectedAnswer)
  return {
    listeningTextNl: correct,
    displayPrompt: stripYouHearLeadIn(item.prompt) || 'Listen to the line, then choose the best answer.',
  }
}
