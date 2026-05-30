/**
 * Signals for ranking “From your day” in Today suggestions (mirrors backend {@link summarizeQuickCaptures}).
 */

export type FromYourDaySuggestionHints = {
  practiceReadyCount: number
  struggleCaptureCount: number
  maxSameTopicRepeats: number
  highValueCaptureCount: number
  suggestionPriorityScore: number
  previewFragments: string[]
  primarySnippets: string[]
}

export type QuickCaptureLikeForHints = {
  captureType: string
  status: string
  bodyPrimary: string | null
  bodySecondary: string | null
  enrichedJson: string | null
  transcript: string | null
  placeKind: string | null
  localCaptureDate: string
}

function parseScenarioSlugGuess(enrichedJson: string | null): string | null {
  if (!enrichedJson) return null
  try {
    const j = JSON.parse(enrichedJson) as { scenarioSlugGuess?: string | null }
    const s = typeof j.scenarioSlugGuess === 'string' ? j.scenarioSlugGuess.trim().toLowerCase() : ''
    return s.length ? s : null
  } catch {
    return null
  }
}

function placeKindPreviewLabel(placeKind: string | null): string | null {
  if (!placeKind?.trim()) return null
  const raw = placeKind.trim().toLowerCase().replace(/[_-]+/g, ' ')
  return raw.replace(/\b\w/g, (c) => c.toUpperCase())
}

function primaryText(r: QuickCaptureLikeForHints): string {
  const a = (r.bodyPrimary ?? '').trim()
  const b = (r.transcript ?? '').trim()
  return a.length ? a : b
}

export function hintsFromQuickCaptureApiSummary(raw: Record<string, unknown>): FromYourDaySuggestionHints | null {
  let practiceReadyCount = Number(raw.practiceReadyCount)
  if (!Number.isFinite(practiceReadyCount)) {
    const legacy = Number(raw.readyCount)
    if (!Number.isFinite(legacy)) return null
    practiceReadyCount = legacy
  }
  const struggleCaptureCount = Number.isFinite(Number(raw.struggleCaptureCount)) ? Number(raw.struggleCaptureCount) : 0
  const maxSameTopicRepeats = Number.isFinite(Number(raw.maxSameTopicRepeats)) ? Number(raw.maxSameTopicRepeats) : 1
  const highValueCaptureCount = Number.isFinite(Number(raw.highValueCaptureCount)) ? Number(raw.highValueCaptureCount) : 0
  const suggestionPriorityScore = Number.isFinite(Number(raw.suggestionPriorityScore))
    ? Number(raw.suggestionPriorityScore)
    : 0
  const previewFragments = Array.isArray(raw.previewFragments)
    ? (raw.previewFragments as unknown[]).map((x) => String(x)).filter(Boolean)
    : []
  const primarySnippets = Array.isArray(raw.primarySnippets)
    ? (raw.primarySnippets as unknown[]).map((x) => String(x)).filter(Boolean)
    : []
  return {
    practiceReadyCount,
    struggleCaptureCount,
    maxSameTopicRepeats,
    highValueCaptureCount,
    suggestionPriorityScore,
    previewFragments: previewFragments.slice(0, 3),
    primarySnippets: primarySnippets.slice(0, 4),
  }
}

/** Offline / client-only: derive the same hint shape from stored captures for a calendar day. */
export function computeFromYourDayHintsFromItems(
  items: QuickCaptureLikeForHints[],
  localDateYmd: string,
): FromYourDaySuggestionHints | null {
  const rows = items.filter((r) => r.localCaptureDate === localDateYmd)
  if (!rows.length) return null

  let practiceReadyCount = 0
  let struggleCaptureCount = 0
  let highValueCaptureCount = 0
  const placeKindCounts = new Map<string, number>()
  const scenarioCounts = new Map<string, number>()
  const primarySnippets: string[] = []

  for (const r of rows) {
    const text = primaryText(r)
    const usable = text.length > 0 && ['new', 'enriched', 'ready_for_practice'].includes(r.status)
    if (!usable) continue

    if (r.status === 'ready_for_practice' && text.length > 0) practiceReadyCount += 1

    if (r.captureType === 'log_struggle' && (text.length > 0 || (r.bodySecondary ?? '').trim().length > 0)) {
      struggleCaptureCount += 1
    }

    const hv =
      r.captureType === 'add_place' ||
      r.captureType === 'voice_note' ||
      r.captureType === 'log_struggle' ||
      r.captureType === 'save_phrase' ||
      r.captureType === 'photo_text' ||
      r.captureType === 'paste_text'
    if (hv) highValueCaptureCount += 1

    if (r.captureType === 'add_place' && r.placeKind?.trim()) {
      const k = r.placeKind.trim().toLowerCase()
      placeKindCounts.set(k, (placeKindCounts.get(k) ?? 0) + 1)
    }
    const slug = parseScenarioSlugGuess(r.enrichedJson)
    if (slug) scenarioCounts.set(slug, (scenarioCounts.get(slug) ?? 0) + 1)

    if (r.status === 'ready_for_practice' && primarySnippets.length < 4) {
      primarySnippets.push(text.slice(0, 56))
    }
  }

  let maxSameTopicRepeats = 1
  for (const c of placeKindCounts.values()) maxSameTopicRepeats = Math.max(maxSameTopicRepeats, c)
  for (const c of scenarioCounts.values()) maxSameTopicRepeats = Math.max(maxSameTopicRepeats, c)

  let suggestionPriorityScore = Math.min(26, practiceReadyCount * 8)
  suggestionPriorityScore += Math.min(36, struggleCaptureCount * 18)
  suggestionPriorityScore += Math.min(24, Math.max(0, maxSameTopicRepeats - 1) * 12)
  suggestionPriorityScore += Math.min(22, highValueCaptureCount * 4)
  suggestionPriorityScore = Math.min(100, Math.round(suggestionPriorityScore))

  const previewFragments: string[] = []
  const placeEntries = [...placeKindCounts.entries()].sort((a, b) => b[1] - a[1])
  for (const [pk] of placeEntries.slice(0, 2)) {
    const label = placeKindPreviewLabel(pk)
    if (label) previewFragments.push(label)
  }
  if (struggleCaptureCount >= 1) previewFragments.push('one phrase fix')
  else if (rows.some((r) => r.captureType === 'save_phrase' && primaryText(r))) previewFragments.push('real phrases')
  else if (rows.some((r) => r.captureType === 'voice_note' && primaryText(r))) previewFragments.push('voice moments')

  return {
    practiceReadyCount,
    struggleCaptureCount,
    maxSameTopicRepeats,
    highValueCaptureCount,
    suggestionPriorityScore,
    previewFragments: previewFragments.slice(0, 3),
    primarySnippets,
  }
}
