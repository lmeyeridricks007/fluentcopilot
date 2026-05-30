export type PracticePackMode = 'quick_rep' | 'standard' | 'deeper_debrief'

/** Tier ranges for personalized pack XP (stable with {@link computePersonalizedPackXp}). */
export const PERSONALIZED_PACK_XP_BANDS: Record<PracticePackMode, readonly [number, number]> = {
  quick_rep: [15, 20],
  standard: [20, 30],
  deeper_debrief: [25, 35],
}

/** Server-aligned tier band for UI copy only (exact award uses session id + same-day decay). */
export function personalizedPackXpBand(mode: PracticePackMode): { min: number; max: number } {
  const [min, max] = PERSONALIZED_PACK_XP_BANDS[mode] ?? PERSONALIZED_PACK_XP_BANDS.standard
  return { min, max }
}

export type PersonalizedPackXpBreakdown = {
  base: number
  completion: number
  effort: number
  improvement: number
  recovery: number
  streak: number
}

function hashToUint(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Inclusive integer in [lo, hi] derived from sessionId (stable per completion). */
function bandPick(lo: number, hi: number, sessionId: string): number {
  if (hi <= lo) return lo
  const span = hi - lo + 1
  return lo + (hashToUint(sessionId) % span)
}

function nonEmpty(xs: string[] | undefined): string[] {
  if (!xs?.length) return []
  return xs.filter((s) => typeof s === 'string' && s.trim().length > 0)
}

/**
 * Meaningful XP for completing a personalized Quick Capture pack (progression).
 * Bands: quick 15–20, standard 20–30, deeper 25–35; weakness + improvement bonuses;
 * soft decay for multiple completions the same calendar day (anti-farm).
 */
export function computePersonalizedPackXp(input: {
  mode: PracticePackMode
  sessionId: string
  weaknessesTargeted: string[]
  improvements?: string[]
  /** Number of *prior* same-day from_your_day completions already in state (this session not included). */
  sameDayPriorFromYourDayCompletions: number
}): { totalXP: number; breakdown: PersonalizedPackXpBreakdown } {
  const w = nonEmpty(input.weaknessesTargeted)
  const imp = nonEmpty(input.improvements)

  const [lo, hi] = PERSONALIZED_PACK_XP_BANDS[input.mode] ?? PERSONALIZED_PACK_XP_BANDS.standard
  const base = bandPick(lo, hi, input.sessionId)
  const weaknessBonus = Math.min(10, w.length * 3)
  const improvementBonus = Math.min(5, imp.length * 2)
  let total = base + weaknessBonus + improvementBonus

  const decay = Math.pow(0.88, Math.max(0, input.sameDayPriorFromYourDayCompletions))
  total = Math.floor(total * decay)
  const maxWithBonus = hi + 12
  total = Math.max(lo, Math.min(maxWithBonus, total))

  const breakdown: PersonalizedPackXpBreakdown = {
    base: total,
    completion: 0,
    effort: 0,
    improvement: 0,
    recovery: 0,
    streak: 0,
  }
  return { totalXP: total, breakdown }
}
