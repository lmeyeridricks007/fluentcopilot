import type { ListeningLevel } from './listeningLevel'
import type { ListeningScenarioId } from './listeningScenarioId'

export type ListeningDimensionScores = {
  gist?: number
  detailAccuracy?: number
  fastSpeech?: number
  naturalReply?: number
  responseReadiness?: number
}

export type ListeningReportWeakArea = {
  key: string
  label: string
  hint: string
}

export type ListeningReportMissedDetail = {
  facet: string
  coachLine: string
}

export type ListeningRecommendedNext = {
  kind: 'track' | 'scenario' | 'speak_live' | 'coach_copy'
  title: string
  subtitle?: string | null
  targetId?: string | null
}

export type ListeningRelatedPracticeLoop = {
  loopId: string | null
  title: string
  reason: string
}

export type ListeningReport = {
  sessionId: string
  userId: string
  level: ListeningLevel
  scenarioId: ListeningScenarioId | null
  topSummary: string
  dimensionScores: ListeningDimensionScores
  weakAreas: ListeningReportWeakArea[]
  missedDetails: ListeningReportMissedDetail[]
  recommendedNext: ListeningRecommendedNext[]
  relatedPracticeLoops: ListeningRelatedPracticeLoop[]
  createdAt: string
}
