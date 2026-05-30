/**
 * Selective, rule-based corrections for A2 Dutch speaking (training).
 * Not exhaustive — prioritises high-impact exam patterns. Max items enforced by caller.
 */
import type { SpeakingCorrectionItem } from '@/lib/schemas/exam/speakingCoachOutput.schema'

type Pattern = {
  find: RegExp
  replace: string
  explanationNl: string
}

const PATTERNS: Pattern[] = [
  {
    find: /\bmet auto\b/i,
    replace: 'met de auto',
    explanationNl: 'Na “met” hoort hier vaak “de”: met de auto.',
  },
  {
    find: /\bmet trein\b/i,
    replace: 'met de trein',
    explanationNl: 'Gebruik “met de trein”.',
  },
  {
    find: /\bmet bus\b/i,
    replace: 'met de bus',
    explanationNl: 'Gebruik “met de bus”.',
  },
  {
    find: /\bop werk\b/i,
    replace: 'op het werk',
    explanationNl: 'Vaste uitdrukking: op het werk.',
  },
  {
    find: /\bin weekend\b/i,
    replace: 'in het weekend',
    explanationNl: 'Vaste uitdrukking: in het weekend.',
  },
  {
    find: /\bomdat ik vind\b/i,
    replace: 'omdat ik het vind',
    explanationNl: 'Vaak: omdat ik het … vind (met “het”).',
  },
  {
    find: /\bnaar huis ga\b/i,
    replace: 'naar huis gaan',
    explanationNl: 'Infinitief: naar huis gaan.',
  },
]

const ENGLISH_WORDS: { en: RegExp; nl: string; explanationNl: string }[] = [
  { en: /\bbecause\b/i, nl: 'omdat', explanationNl: 'Engels “because” → gebruik “omdat” of “want” in het Nederlands.' },
  { en: /\bvery\b/i, nl: 'heel', explanationNl: 'Engels “very” → bijvoorbeeld “heel” of “erg”.' },
  { en: /\bthe\b/i, nl: 'de/het', explanationNl: 'Engels “the” → kies “de” of “het” (of weglaten waar dat kan).' },
  { en: /\band\b/i, nl: 'en', explanationNl: 'Engels “and” → “en”.' },
]

function firstMatchSlice(text: string, re: RegExp): string | null {
  const m = text.match(re)
  return m && m[0] ? m[0] : null
}

/**
 * Extract up to `max` corrections without overlapping the same span twice (best-effort).
 */
export function extractSpeakingCorrections(answer: string, max: number = 3): SpeakingCorrectionItem[] {
  const raw = answer.trim()
  if (raw.length < 2) return []
  const out: SpeakingCorrectionItem[] = []
  const usedRanges: { start: number; end: number }[] = []

  function overlaps(start: number, end: number): boolean {
    return usedRanges.some((r) => !(end <= r.start || start >= r.end))
  }

  function markRange(start: number, end: number) {
    usedRanges.push({ start, end })
  }

  for (const p of PATTERNS) {
    if (out.length >= max) break
    const re = new RegExp(p.find.source, p.find.flags.includes('g') ? p.find.flags : `${p.find.flags}g`)
    const m = re.exec(raw)
    if (!m || m[0] == null || m.index == null) continue
    const start = m.index
    const end = start + m[0].length
    if (overlaps(start, end)) continue
    out.push({
      originalFragment: m[0],
      correctedFragment: p.replace,
      explanationNl: p.explanationNl,
    })
    markRange(start, end)
  }

  for (const { en, nl, explanationNl } of ENGLISH_WORDS) {
    if (out.length >= max) break
    const slice = firstMatchSlice(raw, en)
    if (!slice) continue
    const start = raw.toLowerCase().indexOf(slice.toLowerCase())
    if (start < 0) continue
    const end = start + slice.length
    if (overlaps(start, end)) continue
    out.push({
      originalFragment: slice,
      correctedFragment: nl,
      explanationNl,
    })
    markRange(start, end)
  }

  return out.slice(0, max)
}

/**
 * Apply corrections sequentially (first occurrence each) for an improved draft.
 */
export function applyCorrectionsToText(answer: string, corrections: SpeakingCorrectionItem[]): string {
  let t = answer.trim()
  for (const c of corrections) {
    const idx = t.indexOf(c.originalFragment)
    if (idx >= 0) {
      t = t.slice(0, idx) + c.correctedFragment + t.slice(idx + c.originalFragment.length)
      continue
    }
    const lo = t.toLowerCase()
    const fo = c.originalFragment.toLowerCase()
    const j = lo.indexOf(fo)
    if (j >= 0) {
      t = t.slice(0, j) + c.correctedFragment + t.slice(j + c.originalFragment.length)
    }
  }
  return polishSpeakingAnswerSurface(t)
}

/** Capitalisation + spacing + closing punctuation (surface polish). */
export function polishSpeakingAnswerSurface(text: string): string {
  let t = text.replace(/\s+/g, ' ').trim()
  if (!t) return t
  const first = t[0]
  if (first && /[a-zà-ÿ]/.test(first)) {
    t = first.toUpperCase() + t.slice(1)
  }
  if (t.length > 0 && !/[.!?…]$/.test(t)) {
    t += '.'
  }
  return t
}
