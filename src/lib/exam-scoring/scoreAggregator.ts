/**
 * End-to-end aggregation: guards → rubric rows → normalization → pass → engine output.
 */
import type { ExamRubricScoreRow } from '@/lib/schemas/exam/scoringResult.schema'
import type { ExamScoringResult } from '@/lib/schemas/exam/scoringResult.schema'
import type { ExamMode } from '@/lib/schemas/exam/examShared.schema'
import type { ExamScoringEngineOutput, SpeakingRawScores, WritingRawScores } from '@/lib/exam-scoring/types'
import {
  SPEAKING_CATEGORY_ORDER,
  SPEAKING_CATEGORY_LABELS,
  SPEAKING_MAX_BY_CATEGORY,
  SPEAKING_MAX_TOTAL,
  SPEAKING_RUBRIC_ID,
  SPEAKING_RUBRIC_VERSION,
  SPEAKING_EVALUATOR_VERSION,
  clampSpeakingScores,
} from '@/lib/exam-scoring/speakingScoringPolicy'
import {
  WRITING_CATEGORY_ORDER,
  WRITING_CATEGORY_LABELS,
  WRITING_MAX_BY_CATEGORY,
  WRITING_MAX_TOTAL,
  WRITING_RUBRIC_ID,
  WRITING_RUBRIC_VERSION,
  WRITING_EVALUATOR_VERSION,
  clampWritingScores,
} from '@/lib/exam-scoring/writingScoringPolicy'
import {
  applySpeakingExecutionGate,
  applyWritingExecutionGate,
  applyMinimumResponseGuardSpeaking,
  applyMinimumResponseGuardWriting,
  applyTranscriptConfidenceGuardSpeaking,
} from '@/lib/exam-scoring/scoringGuards'
import {
  normalizedPercent,
  toTenPointScale,
  readinessLabelFromPercent,
} from '@/lib/exam-scoring/scoringNormalizer'
import {
  exercisePass,
  exerciseOutcomeBand,
  passThresholdForMode,
} from '@/lib/exam-scoring/passFailPolicy'
import {
  weakTagsFromSpeakingScores,
  weakTagsFromWritingScores,
} from '@/lib/exam-scoring/integrationHints'

function levelKeyFromRatio(score: number, max: number): string {
  if (max <= 0) return 'n/a'
  const r = score / max
  if (r >= 0.85) return 'strong'
  if (r >= 0.55) return 'adequate'
  if (r > 0) return 'developing'
  return 'insufficient'
}

function rowsFromSpeaking(scores: SpeakingRawScores): ExamRubricScoreRow[] {
  return SPEAKING_CATEGORY_ORDER.map((k) => {
    const max = SPEAKING_MAX_BY_CATEGORY[k]
    const sc = scores[k]
    return {
      categoryKey: k,
      label: SPEAKING_CATEGORY_LABELS[k].en,
      score: sc,
      maxScore: max,
      levelKey: levelKeyFromRatio(sc, max),
      evidence: undefined,
    }
  })
}

function rowsFromWriting(scores: WritingRawScores): ExamRubricScoreRow[] {
  return WRITING_CATEGORY_ORDER.map((k) => {
    const max = WRITING_MAX_BY_CATEGORY[k]
    const sc = scores[k]
    return {
      categoryKey: k,
      label: WRITING_CATEGORY_LABELS[k].en,
      score: sc,
      maxScore: max,
      levelKey: levelKeyFromRatio(sc, max),
      evidence: undefined,
    }
  })
}

export type AggregateSpeakingInput = {
  mode: ExamMode
  scores: SpeakingRawScores
  responseText: string
  transcriptConfidence?: number
  categoryRationales?: Partial<Record<string, string>>
  certainty?: number
  summaryComment?: string
  evaluatorVersionOverride?: string
}

export function aggregateSpeakingAttempt(input: AggregateSpeakingInput): ExamScoringEngineOutput {
  let s = clampSpeakingScores(input.scores)
  s = applyMinimumResponseGuardSpeaking(input.responseText, s)
  s = applyTranscriptConfidenceGuardSpeaking(s, input.transcriptConfidence)
  const gateSp = applySpeakingExecutionGate(s)
  const finalSp = gateSp.scores
  const total = SPEAKING_CATEGORY_ORDER.reduce((acc, k) => acc + finalSp[k], 0)
  const pct = normalizedPercent(total, SPEAKING_MAX_TOTAL)
  const passThreshold = passThresholdForMode(input.mode)
  const pass = exercisePass(pct, passThreshold)
  const band = exerciseOutcomeBand(pct, passThreshold)

  return {
    examType: 'speaking',
    mode: input.mode,
    rubricDefinitionId: SPEAKING_RUBRIC_ID,
    rubricVersion: SPEAKING_RUBRIC_VERSION,
    evaluatorVersion: input.evaluatorVersionOverride ?? SPEAKING_EVALUATOR_VERSION,
    rubricScores: rowsFromSpeaking(finalSp),
    totalScore: total,
    maxScore: SPEAKING_MAX_TOTAL,
    normalizedPercent: pct,
    tenPointScale: toTenPointScale(total, SPEAKING_MAX_TOTAL),
    pass,
    exerciseOutcomeBand: band,
    readinessLabel: readinessLabelFromPercent(pct),
    executionGatingApplied: gateSp.gated,
    categoryRationales: input.categoryRationales ?? {},
    weakTags: weakTagsFromSpeakingScores(finalSp),
    certainty: input.certainty,
    summaryComment: input.summaryComment,
  }
}

export type AggregateWritingInput = {
  mode: ExamMode
  scores: WritingRawScores
  responseText: string
  categoryRationales?: Partial<Record<string, string>>
  certainty?: number
  summaryComment?: string
  evaluatorVersionOverride?: string
}

export function aggregateWritingAttempt(input: AggregateWritingInput): ExamScoringEngineOutput {
  let s = clampWritingScores(input.scores)
  s = applyMinimumResponseGuardWriting(input.responseText, s)
  const gateWr = applyWritingExecutionGate(s)
  const finalWr = gateWr.scores
  const total = WRITING_CATEGORY_ORDER.reduce((acc, k) => acc + finalWr[k], 0)
  const pct = normalizedPercent(total, WRITING_MAX_TOTAL)
  const passThreshold = passThresholdForMode(input.mode)
  const pass = exercisePass(pct, passThreshold)
  const band = exerciseOutcomeBand(pct, passThreshold)

  return {
    examType: 'writing',
    mode: input.mode,
    rubricDefinitionId: WRITING_RUBRIC_ID,
    rubricVersion: WRITING_RUBRIC_VERSION,
    evaluatorVersion: input.evaluatorVersionOverride ?? WRITING_EVALUATOR_VERSION,
    rubricScores: rowsFromWriting(finalWr),
    totalScore: total,
    maxScore: WRITING_MAX_TOTAL,
    normalizedPercent: pct,
    tenPointScale: toTenPointScale(total, WRITING_MAX_TOTAL),
    pass,
    exerciseOutcomeBand: band,
    readinessLabel: readinessLabelFromPercent(pct),
    executionGatingApplied: gateWr.gated,
    categoryRationales: input.categoryRationales ?? {},
    weakTags: weakTagsFromWritingScores(finalWr),
    certainty: input.certainty,
    summaryComment: input.summaryComment,
  }
}

/** Attach evidence strings to rubric rows (e.g. from AI per category). */
export function mergeEvidenceIntoRows(
  rows: ExamRubricScoreRow[],
  evidenceByKey: Partial<Record<string, string>>
): ExamRubricScoreRow[] {
  return rows.map((r) => ({
    ...r,
    evidence: evidenceByKey[r.categoryKey] ?? r.evidence,
  }))
}

/**
 * Build persisted `ExamScoringResult` (+ optional typed mirrors for dashboards).
 */
export function engineOutputToExamScoringResult(
  engine: ExamScoringEngineOutput,
  ids: { id: string; examAttemptId: string; examExerciseId: string }
): ExamScoringResult {
  const rationales = engine.categoryRationales
  const rows =
    Object.keys(rationales).length > 0
      ? mergeEvidenceIntoRows(engine.rubricScores, rationales)
      : engine.rubricScores

  const base: ExamScoringResult = {
    id: ids.id,
    examAttemptId: ids.examAttemptId,
    examExerciseId: ids.examExerciseId,
    examType: engine.examType,
    rubricDefinitionId: engine.rubricDefinitionId,
    rubricVersion: engine.rubricVersion,
    rubricScores: rows,
    exerciseExecutionScore: rows.find((r) => r.categoryKey === 'execution')?.score,
    totalScore: engine.totalScore,
    maxScore: engine.maxScore,
    pass: engine.pass,
    confidence: engine.certainty,
    evaluatorVersion: engine.evaluatorVersion,
    summaryComment: engine.summaryComment,
    metadata: {
      normalizedPercent: engine.normalizedPercent,
      tenPointScale: engine.tenPointScale,
      readinessLabel: engine.readinessLabel,
      exerciseOutcomeBand: engine.exerciseOutcomeBand,
      executionGatingApplied: engine.executionGatingApplied,
      weakTags: engine.weakTags,
      scoringEngine: 'exam-scoring-v1',
      ...engine.metadata,
    },
  }

  if (engine.examType === 'speaking') {
    const m: Record<string, { score: number; maxScore: number; levelKey?: string; evidence?: string }> = {}
    for (const r of rows) {
      m[r.categoryKey] = {
        score: r.score,
        maxScore: r.maxScore,
        levelKey: r.levelKey,
        evidence: r.evidence,
      }
    }
    return { ...base, speakingRubricScores: m as ExamScoringResult['speakingRubricScores'] }
  }

  if (engine.examType === 'writing') {
    const m: Record<string, { score: number; maxScore: number; levelKey?: string; evidence?: string }> = {}
    for (const r of rows) {
      m[r.categoryKey] = {
        score: r.score,
        maxScore: r.maxScore,
        levelKey: r.levelKey,
        evidence: r.evidence,
      }
    }
    return { ...base, writingRubricScores: m as ExamScoringResult['writingRubricScores'] }
  }

  return base
}
