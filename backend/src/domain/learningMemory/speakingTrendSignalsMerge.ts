import type { SessionLearningInsights } from './sessionLearningInsightTypes'
import {
  SpeakLiveSpeakingTrendSignalsV1Schema,
  type SpeakLiveSpeakingTrendSignalsV1,
} from './speakLiveLearningEvaluationArtifacts.schema'
import type { UserLearningProfile } from './userLearningProfileDocument'

const MAX_SERIES = 24

function pushSeries(series: number[], next: number): number[] {
  return [...series, next].slice(-MAX_SERIES)
}

function pushNullable(series: (number | null)[], next: number | null): (number | null)[] {
  return [...series, next].slice(-MAX_SERIES)
}

function deltaLastVsPriorMean(nums: number[]): number | null {
  if (nums.length < 2) return null
  const last = nums[nums.length - 1]
  const prior = nums.slice(0, -1)
  const m = prior.reduce((a, b) => a + b, 0) / prior.length
  return Math.round((last - m) * 10) / 10
}

/**
 * Rolls bounded score series + simple deltas for pronunciation / pacing / confidence / grammar trends.
 */
export function mergeSpeakingTrendSignalsIntoProfile(
  base: UserLearningProfile,
  insights: SessionLearningInsights,
  nowIso: string,
): UserLearningProfile {
  if (insights.sessionType !== 'speak_live') return base
  const a = insights.speakingEvaluationArtifactsV1
  if (!a) return base

  const snap = a.sessionScoreSnapshot
  const prev = base.speakingTrendSignalsV1
  const seed: SpeakLiveSpeakingTrendSignalsV1 =
    prev && SpeakLiveSpeakingTrendSignalsV1Schema.safeParse(prev).success
      ? SpeakLiveSpeakingTrendSignalsV1Schema.parse(prev)
      : {
          version: 1,
          updatedAt: nowIso,
          overallVoiceScoreSeries: [],
          pronunciationScoreSeries: [],
          pacingScoreSeries: [],
          confidenceEstimateSeries: [],
          grammarSessionScoreSeries: [],
          pronunciationDeltaLastVsPriorMean: null,
          pacingDeltaLastVsPriorMean: null,
          confidenceDeltaLastVsPriorMean: null,
          grammarDeltaLastVsPriorMean: null,
          recentWeakWordKeys: [],
        }

  const overallVoiceScoreSeries = pushSeries(seed.overallVoiceScoreSeries, snap.overallVoiceScore)
  const pronunciationScoreSeries = pushNullable(seed.pronunciationScoreSeries, snap.pronunciationScore)
  const pacingScoreSeries = pushNullable(seed.pacingScoreSeries, snap.pacingScore)
  const confidenceEstimateSeries = pushNullable(seed.confidenceEstimateSeries, snap.confidenceEstimate)
  const grammarSessionScoreSeries = pushNullable(seed.grammarSessionScoreSeries, snap.grammarSessionScore)

  const pronNums = pronunciationScoreSeries.filter((x): x is number => x != null)
  const paceNums = pacingScoreSeries.filter((x): x is number => x != null)
  const confNums = confidenceEstimateSeries.filter((x): x is number => x != null)
  const gramNums = grammarSessionScoreSeries.filter((x): x is number => x != null)

  const wordKeys = a.weakWords.map((w) => w.trim().toLowerCase()).filter(Boolean)
  const recentWeakWordKeys = [...new Set([...seed.recentWeakWordKeys, ...wordKeys])].slice(-36)

  const speakingTrendSignalsV1: SpeakLiveSpeakingTrendSignalsV1 = {
    version: 1,
    updatedAt: nowIso,
    overallVoiceScoreSeries,
    pronunciationScoreSeries,
    pacingScoreSeries,
    confidenceEstimateSeries,
    grammarSessionScoreSeries,
    pronunciationDeltaLastVsPriorMean: pronNums.length >= 2 ? deltaLastVsPriorMean(pronNums) : null,
    pacingDeltaLastVsPriorMean: paceNums.length >= 2 ? deltaLastVsPriorMean(paceNums) : null,
    confidenceDeltaLastVsPriorMean: confNums.length >= 2 ? deltaLastVsPriorMean(confNums) : null,
    grammarDeltaLastVsPriorMean: gramNums.length >= 2 ? deltaLastVsPriorMean(gramNums) : null,
    recentWeakWordKeys,
  }

  return { ...base, speakingTrendSignalsV1 }
}
