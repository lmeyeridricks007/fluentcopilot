import type { SpeakingProgressRecordV1 } from './speakingProgressRecord'

export type ProgressTrend = 'improving' | 'steady' | 'unclear' | 'needs_more_data'

export type ProgressTrust = 'limited' | 'moderate' | 'needs_more_data'

export type SpeakingProgressSummary = {
  sampleSize: number
  trust: ProgressTrust
  pronunciation: { trend: ProgressTrend; note: string }
  rhythm: { trend: ProgressTrend; note: string }
  naturalness: { trend: ProgressTrend; note: string }
  dutchSounding: { trend: ProgressTrend; recentExamples: string[]; note: string }
  commonWeakWords: { word: string; count: number }[]
  commonWeakPatterns: { pattern: string; count: number }[]
  improvingAreas: string[]
  repeatedWeakAreas: string[]
  recommendedNextTrack: string
}

function trustFromN(n: number): ProgressTrust {
  if (n < 5) return 'needs_more_data'
  if (n < 12) return 'limited'
  return 'moderate'
}

function mean(nums: (number | null | undefined)[]): number | null {
  const xs = nums.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  if (!xs.length) return null
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
}

function trendFromSeries(values: number[], n: number): ProgressTrend {
  if (n < 5 || values.length < 5) return 'needs_more_data'
  const third = Math.max(2, Math.floor(values.length / 3))
  const early = values.slice(0, third)
  const late = values.slice(-third)
  const a = mean(early)
  const b = mean(late)
  if (a == null || b == null) return 'unclear'
  const d = b - a
  if (d > 3) return 'improving'
  if (d < -3) return 'steady'
  return 'steady'
}

function trendNote(trend: ProgressTrend, label: string): string {
  if (trend === 'needs_more_data') return `Not enough clips yet to judge ${label} — keep practising and check back.`
  if (trend === 'improving') return `${label} looks a bit stronger in your recent clips than in your earlier ones (coarse average — not a precise score).`
  if (trend === 'unclear') return `${label} is mixed across clips — stay consistent for a clearer read.`
  return `${label} has been fairly steady — small wins still count.`
}

export function computeSpeakingProgressSummary(records: SpeakingProgressRecordV1[]): SpeakingProgressSummary {
  const sorted = [...records].sort((x, y) => x.createdAtUtc.localeCompare(y.createdAtUtc))
  const n = sorted.length
  const trust = trustFromN(n)

  const pron = sorted.map((r) => r.rawScores.pronunciation)
  const rhythm = sorted.map((r) => r.derivedScores.rhythm ?? r.rawScores.fluency)
  const nat = sorted.map((r) => r.derivedScores.naturalness ?? r.rawScores.overall)

  const pt = trendFromSeries(pron, n)
  const rt = trendFromSeries(rhythm, n)
  const nt = trendFromSeries(nat, n)

  const wordCounts = new Map<string, number>()
  for (const r of sorted) {
    for (const w of r.weakWordsTop) {
      const k = w.trim().toLowerCase()
      if (!k) continue
      wordCounts.set(k, (wordCounts.get(k) ?? 0) + 1)
    }
  }
  const commonWeakWords = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }))

  const phraseCounts = new Map<string, number>()
  for (const r of sorted) {
    for (const p of r.phraseSnippets) {
      const k = p.trim().toLowerCase()
      if (k.length < 2) continue
      phraseCounts.set(k, (phraseCounts.get(k) ?? 0) + 1)
    }
  }
  const commonWeakPatterns = [...phraseCounts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([pattern, count]) => ({ pattern, count }))

  const labels = sorted
    .map((r) => r.dutchSoundingLabel?.trim())
    .filter((x): x is string => Boolean(x))
  const recentExamples = labels.slice(-5)

  const dutchTrend: ProgressTrend =
    n < 5 ? 'needs_more_data' : labels.length < 3 ? 'unclear' : 'steady'

  const improvingAreas: string[] = []
  if (pt === 'improving') improvingAreas.push('Pronunciation / word clarity')
  if (rt === 'improving') improvingAreas.push('Rhythm / pace')
  if (nt === 'improving') improvingAreas.push('Overall flow & naturalness')

  const repeatedWeakAreas: string[] = []
  for (const { word, count } of commonWeakWords.slice(0, 3)) {
    if (count >= 2) repeatedWeakAreas.push(`“${word}” showed up in ${count} clips`)
  }
  for (const { pattern, count } of commonWeakPatterns.slice(0, 2)) {
    if (count >= 2) repeatedWeakAreas.push(`Phrase chunk “${pattern}” — ${count} times`)
  }

  let recommendedNextTrack =
    'Keep short Dutch reps in one scenario this week so we can see a clearer trend (same context, similar lines).'
  const top = commonWeakWords[0]
  if (top) {
    recommendedNextTrack = `Spend a few minutes on “${top.word}” in short sentences — it repeats across your clips.`
  } else if (commonWeakPatterns[0]) {
    recommendedNextTrack = `Try a mini-drill on “${commonWeakPatterns[0].pattern}” until it feels easy, then speed up slightly.`
  }

  return {
    sampleSize: n,
    trust,
    pronunciation: { trend: pt, note: trendNote(pt, 'Pronunciation') },
    rhythm: { trend: rt, note: trendNote(rt, 'Rhythm') },
    naturalness: { trend: nt, note: trendNote(nt, 'Naturalness') },
    dutchSounding: {
      trend: dutchTrend,
      recentExamples,
      note:
        dutchTrend === 'needs_more_data'
          ? 'We need a few more labelled clips before commenting on how “Dutch” you sound overall.'
          : 'Labels are coach language, not a scientific curve — treat them as gentle orientation.',
    },
    commonWeakWords: commonWeakWords.slice(0, 8),
    commonWeakPatterns: commonWeakPatterns.slice(0, 6),
    improvingAreas: improvingAreas.slice(0, 4),
    repeatedWeakAreas: repeatedWeakAreas.slice(0, 5),
    recommendedNextTrack,
  }
}
