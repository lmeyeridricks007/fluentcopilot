/**
 * Rule-based writing corrections (A2 exam prep). Selective, high-impact patterns.
 * @see extractWritingCorrections — max enforced by caller (display vs rewrite depth).
 */
import type { SpeakingCorrectionItem } from '@/lib/schemas/exam/speakingCoachOutput.schema'

type Pattern = { find: RegExp; replace: string; explanationNl: string }

const PATTERNS: Pattern[] = [
  {
    find: /\bik heb ga\b/i,
    replace: 'ik ga',
    explanationNl: 'Gebruik “ik ga”, niet “ik heb ga”.',
  },
  {
    find: /\bik kan niet (de |het )?opdracht\b/i,
    replace: 'ik kan de opdracht niet',
    explanationNl: 'Woordvolgorde: “ik kan de opdracht niet …” klinkt natuurlijker.',
  },
  {
    find: /\bniet opdracht\b/i,
    replace: 'de opdracht niet',
    explanationNl: 'Vaak: “ik kan de opdracht niet …” met “de opdracht”.',
  },
  {
    find: /\bmet trein\b/i,
    replace: 'met de trein',
    explanationNl: 'Vaste uitdrukking: met de trein.',
  },
  {
    find: /\bmet bus\b/i,
    replace: 'met de bus',
    explanationNl: 'Vaste uitdrukking: met de bus.',
  },
  {
    find: /\bnaar huis ga\b/i,
    replace: 'naar huis gaan',
    explanationNl: 'Infinitief: naar huis gaan.',
  },
  {
    find: /\bin weekend\b/i,
    replace: 'in het weekend',
    explanationNl: 'Vaste uitdrukking: in het weekend.',
  },
  {
    find: /\bop werk\b/i,
    replace: 'op het werk',
    explanationNl: 'Vaste uitdrukking: op het werk.',
  },
  {
    find: /\bveel bedankt\b/i,
    replace: 'hartelijk bedankt',
    explanationNl: '“Hartelijk bedankt” of “heel erg bedankt” is gebruikelijker in een bericht.',
  },
  {
    find: /\bziek gewest\b/i,
    replace: 'ziek geweest',
    explanationNl: 'Spelling: “geweest” met dubbele e.',
  },
  {
    find: /\bgeen kan\b/i,
    replace: 'kan niet',
    explanationNl: 'Vaak: ik kan niet / het kan niet.',
  },
]

const ENGLISH_SLIPS: { en: RegExp; nl: string; explanationNl: string }[] = [
  { en: /\bbecause\b/i, nl: 'omdat', explanationNl: 'Engels “because” → “omdat” of “want”.' },
  { en: /\bvery\b/i, nl: 'heel', explanationNl: 'Engels “very” → “heel” of “erg”.' },
  { en: /\bsorry for\b/i, nl: 'sorry dat', explanationNl: 'Vaak: sorry dat … / mijn excuses.' },
  { en: /\bplease\b/i, nl: 'alstublieft', explanationNl: '“Please” → “alstublieft” of “wil je …”.' },
  { en: /\bthank you\b/i, nl: 'dank u', explanationNl: 'Engels “thank you” → “dank u” / “bedankt”.' },
  { en: /\bthe\b/i, nl: 'de/het', explanationNl: 'Engels “the” → “de” of “het” (of weglaten).' },
  { en: /\band\b/i, nl: 'en', explanationNl: 'Engels “and” → “en”.' },
  { en: /\bhello\b/i, nl: 'hallo', explanationNl: 'Engels “hello” → “hallo” / “goedemiddag”.' },
]

export function extractWritingCorrections(answer: string, max: number = 5): SpeakingCorrectionItem[] {
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
    const m = raw.match(p.find)
    if (!m || m.index === undefined) continue
    const start = m.index
    const end = start + m[0].length
    if (overlaps(start, end)) continue
    if (m[0] === p.replace) continue
    out.push({
      originalFragment: m[0],
      correctedFragment: p.replace,
      explanationNl: p.explanationNl,
    })
    markRange(start, end)
  }

  for (const e of ENGLISH_SLIPS) {
    if (out.length >= max) break
    const m = raw.match(e.en)
    if (!m || m.index === undefined) continue
    const start = m.index
    const end = start + m[0].length
    if (overlaps(start, end)) continue
    out.push({
      originalFragment: m[0],
      correctedFragment: e.nl,
      explanationNl: e.explanationNl,
    })
    markRange(start, end)
  }

  return out
}

export function applyWritingCorrectionsToText(text: string, corrections: SpeakingCorrectionItem[]): string {
  let t = text
  for (const c of corrections) {
    if (c.originalFragment && t.includes(c.originalFragment)) {
      t = t.replace(c.originalFragment, c.correctedFragment)
    }
  }
  return t.trim()
}

/** Light surface polish for free text (not for form field values with numbers). */
export function polishWritingSurface(text: string): string {
  let t = text.trim()
  if (!t) return t
  t = t.replace(/\s+/g, ' ')
  const first = t.charAt(0).toUpperCase()
  if (t.length > 1) t = first + t.slice(1)
  if (!/[.!?]$/.test(t)) t += '.'
  return t
}
