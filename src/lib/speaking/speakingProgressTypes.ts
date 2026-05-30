/** Mirrors `GET /api/speaking/progression` JSON (coarse trends — not lab precision). */

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

export type SpeakingProgressionResponse = {
  enabled: boolean
  summary: SpeakingProgressSummary
}
