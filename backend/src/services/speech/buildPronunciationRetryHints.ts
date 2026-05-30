import type {
  NormalizedPronunciationAssessment,
  PronunciationRetryHints,
  PronunciationRetryPhraseTarget,
} from './pronunciationAssessmentContracts'

/**
 * Deterministic retry hints from Azure word scores (no LLM).
 * Aligns FE with `phraseTargets` / `coaching.retryTarget` shape used by full speaking assessment.
 */
export function buildPronunciationRetryHints(a: NormalizedPronunciationAssessment): PronunciationRetryHints {
  const sorted = [...a.words].sort((x, y) => x.accuracyScore - y.accuracyScore)
  const weak = sorted.filter((w) => w.accuracyScore < 72).slice(0, 8)

  const phraseTargets: PronunciationRetryPhraseTarget[] = weak.map((w) => ({
    text: w.word.trim(),
    reason:
      w.accuracyScore < 58
        ? 'This token scored low for clarity in your clip.'
        : 'Room to tighten this sound in context.',
    priority: (w.accuracyScore < 58 ? 'high' : 'medium') as 'high' | 'medium',
  }))

  for (let i = 0; i < sorted.length - 1; i++) {
    const a0 = sorted[i]!
    const a1 = sorted[i + 1]!
    if (a0.accuracyScore >= 70 && a1.accuracyScore >= 70) continue
    const pair = `${a0.word.trim()} ${a1.word.trim()}`.trim()
    if (pair.length < 3) continue
    if (phraseTargets.some((p) => p.text.toLowerCase() === pair.toLowerCase())) continue
    phraseTargets.push({
      text: pair,
      reason: 'Two neighbouring words both dipped — practise them as one mini-phrase.',
      priority: 'medium',
    })
    break
  }

  const weakest = weak[0]
  const retryTarget = weakest?.word?.trim() || null
  const retryWhy = retryTarget
    ? `Lowest clarity in this recording is on “${retryTarget}” — isolate it for a few clean reps.`
    : null

  return {
    phraseTargets: phraseTargets.slice(0, 10),
    coaching: { retryTarget, retryWhy },
  }
}
