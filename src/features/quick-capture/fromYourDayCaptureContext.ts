import type { QuickCaptureItem } from '@/lib/api/quickCaptureClient'

const SCENARIO_LABELS: Record<string, string> = {
  'train-station': 'after the station',
  'ordering-food': 'around ordering food',
  'supermarket-shop': 'from the supermarket',
  'doctor-pharmacy': 'around health or pharmacy',
  'gemeente-style': 'from admin or gemeente',
}

function scenarioPhrase(enrichedJson: string | null): string | null {
  if (!enrichedJson) return null
  try {
    const j = JSON.parse(enrichedJson) as { scenarioSlugGuess?: string | null }
    const slug = typeof j.scenarioSlugGuess === 'string' ? j.scenarioSlugGuess.trim().toLowerCase() : ''
    if (!slug) return null
    return SCENARIO_LABELS[slug] ?? `from a “${slug.replace(/-/g, ' ')}” moment`
  } catch {
    return null
  }
}

/** One calm line tying a step to the real capture (premium “why you’re seeing this”). */
export function contextLineForCapture(c: QuickCaptureItem | undefined): string | null {
  if (!c) return null
  const scen = scenarioPhrase(c.enrichedJson)
  switch (c.captureType) {
    case 'save_word':
      return scen ? `You saved this word ${scen}.` : 'You saved this word from your day.'
    case 'save_phrase':
      return scen ? `You saved this phrase ${scen}.` : 'You saved this phrase to reuse later.'
    case 'paste_text':
      return 'This came from something you pasted — chat, mail, or a screen.'
    case 'photo_text':
      return 'You caught this Dutch from a photo in the wild.'
    case 'add_place':
      return c.bodyPrimary?.trim()
        ? `You pinned “${c.bodyPrimary.trim().slice(0, 48)}${c.bodyPrimary.length > 48 ? '…' : ''}” for real-world practice.`
        : 'You added a place you actually go — we’re weighting practice for that context.'
    case 'log_struggle':
      return 'This came from a moment that felt hard — we’re turning it into something calm you can reuse.'
    case 'voice_note':
      return 'From a voice note you recorded — your own Dutch, tidied for practice.'
    default:
      return null
  }
}

export function contextLineForStep(
  captureId: string,
  byId: Map<string, QuickCaptureItem>,
): string | null {
  if (captureId === 'meta') return null
  return contextLineForCapture(byId.get(captureId))
}
