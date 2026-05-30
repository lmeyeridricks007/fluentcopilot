/**
 * Map exam outcomes → review surfaces (SRS / fix mistakes).
 */
import type { ExamRecCandidate, ExamRecommendationInput } from '@/lib/exam-recommendations/types'

export function reviewCandidatesForExam(input: ExamRecommendationInput): ExamRecCandidate[] {
  const out: ExamRecCandidate[] = []
  const grammarish =
    input.weakRubricKeys?.some((k) =>
      ['grammar', 'spelling', 'vocabulary', 'clearness'].includes(k)
    ) ?? false
  const needsSupport = !input.pass || input.normalizedPercent < 82

  if (needsSupport && grammarish) {
    out.push({
      kind: 'review',
      targetId: 'mistakes',
      title: 'Fix recent mistakes',
      reason: 'Clear the patterns we already saved from your practice — fast targeted reps.',
      rationaleSource: 'grammar_or_vocab_review',
      estimatedMinutes: 6,
      href: '/app/review/mistakes',
      ctaLabel: 'Open Fix mistakes',
      score: 54,
    })
  }

  out.push({
    kind: 'review',
    targetId: 'daily',
    title: 'Daily review',
    reason: 'Short SRS session — keeps weak items from your bank on track.',
    rationaleSource: 'review_maintenance',
    estimatedMinutes: 5,
    href: '/app/review/daily',
    ctaLabel: 'Start review',
    score: needsSupport ? 46 : 38,
  })

  return out
}
