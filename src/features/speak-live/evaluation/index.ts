export { clipStatus, num, strArr } from './evaluationUtils'
export type { AudioLoadStatus } from './evaluationUtils'
export { LearnerAudioPlayer } from './LearnerAudioPlayer'
export { ReferenceAudioPlayer } from './ReferenceAudioPlayer'
export { ScoreChipRow } from './ScoreChipRow'
export { LearnerFacingMetricStrip } from './LearnerFacingMetricStrip'
export { LocalDutchPhrasingComparison } from './LocalDutchPhrasingComparison'
export {
  bandForScore,
  buildFallbackDutchLikenessNarrative,
  buildLearnerFacingTurnMetrics,
  buildSessionDutchSoundSummary,
} from './evaluationHumanCopy'
export type { LearnerFacingMetric, ScoreBand } from './evaluationHumanCopy'
export { ImprovementHighlightList } from './ImprovementHighlightList'
export { SaveForLaterActions } from './SaveForLaterActions'
export type { SaveActionItem } from './SaveForLaterActions'
export { TurnComparisonCard } from './TurnComparisonCard'
export { buildMergedTurnSaveActions } from './buildMergedTurnSaveActions'
export { EvidenceBadge, EvidenceStatusIndicator } from './EvidenceBadge'
export { parseEvaluationReport, buildEvidenceStatusRows } from './reportTypes'
export type {
  SessionEvaluationReport,
  TurnEvaluation as ReportTurnEvaluation,
  EvidenceSummary,
  ScoredDimension,
  EvidenceType,
  ConfidenceLevel,
  RecommendedAction,
  AudioCoaching,
  TranscriptCoaching,
  WordAssessmentResult,
  NaturalRewrite,
  GoalEvidence,
  TaskOutcome,
  EvidenceStatusRow,
  PhoneCallPerformance,
  PhoneCallSentenceMoment,
} from './reportTypes'
