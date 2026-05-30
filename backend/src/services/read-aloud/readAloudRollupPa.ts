import type { NormalizedPronunciationAssessment } from '../speech/pronunciationAssessmentContracts'

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Weighted average of sentence-level Azure assessments for overall report rows.
 */
export function rollupPronunciationAssessment(input: {
  targetText: string
  recognizedText: string
  segments: Array<{ pa: NormalizedPronunciationAssessment | null; weightSec: number }>
}): NormalizedPronunciationAssessment | null {
  const parts = input.segments.filter((s) => s.pa && s.weightSec > 0)
  if (!parts.length) return null
  const wsum = parts.reduce((a, s) => a + s.weightSec, 0) || 1

  const avg = (pick: (p: NormalizedPronunciationAssessment) => number) =>
    clamp100(parts.reduce((acc, s) => acc + pick(s.pa!) * s.weightSec, 0) / wsum)

  const pronunciationScore = avg((p) => p.pronunciationScore)
  const accuracyScore = avg((p) => p.accuracyScore)
  const fluencyScore = avg((p) => p.fluencyScore)
  const completenessScore = avg((p) => p.completenessScore)
  const prosodyParts = parts.filter((s) => s.pa!.prosodyScore != null)
  const prosodyScore =
    prosodyParts.length > 0
      ? clamp100(prosodyParts.reduce((acc, s) => acc + (s.pa!.prosodyScore as number) * s.weightSec, 0) / prosodyParts.reduce((a, s) => a + s.weightSec, 0))
      : null
  const overallScore = avg((p) => p.overallScore)

  const words = parts
    .flatMap((s) => s.pa!.words.map((w) => ({ ...w })))
    .sort((a, b) => a.accuracyScore - b.accuracyScore)
    .slice(0, 200)

  const first = parts[0]!.pa!
  const caveatNotes = [...(first.caveatNotes ?? [])]
  if (!caveatNotes.some((c) => c.includes('rolled up'))) {
    caveatNotes.push('Overall pronunciation scores here are rolled up from each scored audio slice.')
  }
  return {
    pronunciationScore,
    accuracyScore,
    fluencyScore,
    completenessScore,
    prosodyScore,
    overallScore,
    recognizedText: input.recognizedText,
    referenceTextUsed: input.targetText,
    assessmentMode: first.assessmentMode,
    referenceAlignment: first.referenceAlignment,
    words,
    actionNotes: first.actionNotes ?? [],
    caveatNotes,
  }
}
