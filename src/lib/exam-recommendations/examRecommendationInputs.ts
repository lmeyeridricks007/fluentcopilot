/**
 * Build ExamRecommendationInput from scoring engines and exam surfaces.
 */
import type { ExamScoringEngineOutput } from '@/lib/exam-scoring/types'
import type { SpeakingScenarioGroupId } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import type { WritingExerciseSubtype } from '@/lib/schemas/exam/writingExam.schema'
import type { KmnTopicId } from '@/lib/exam-prep/kmn/types'
import type { ListeningQuestionType } from '@/lib/schemas/exam/listeningTrainingItem.schema'
import type { ExamRecommendationInput } from '@/lib/exam-recommendations/types'

function weakRubricKeysFromEngine(engine: ExamScoringEngineOutput, threshold = 0.55): string[] {
  return [...engine.rubricScores]
    .map((r) => ({
      key: r.categoryKey,
      ratio: r.score / Math.max(1, r.maxScore),
    }))
    .filter((x) => x.ratio < threshold)
    .sort((a, b) => a.ratio - b.ratio)
    .map((x) => x.key)
}

export function speakingRecommendationInputFromEngine(
  engine: ExamScoringEngineOutput,
  opts?: { scenarioGroupId?: SpeakingScenarioGroupId; mode?: 'training' | 'simulation' }
): ExamRecommendationInput {
  return {
    examType: 'speaking',
    mode: opts?.mode ?? 'training',
    normalizedPercent: Math.round(engine.normalizedPercent),
    pass: engine.pass,
    weakTags: [...engine.weakTags],
    weakRubricKeys: weakRubricKeysFromEngine(engine),
    speakingScenarioGroupId: opts?.scenarioGroupId,
  }
}

export function writingRecommendationInputFromEngine(
  engine: ExamScoringEngineOutput,
  opts?: { writingSubtype?: WritingExerciseSubtype; mode?: 'training' | 'simulation' }
): ExamRecommendationInput {
  return {
    examType: 'writing',
    mode: opts?.mode ?? 'training',
    normalizedPercent: Math.round(engine.normalizedPercent),
    pass: engine.pass,
    weakTags: [...engine.weakTags],
    weakRubricKeys: weakRubricKeysFromEngine(engine),
    writingSubtype: opts?.writingSubtype,
  }
}

export function listeningRecommendationInput(input: {
  correct: boolean
  questionType: ListeningQuestionType
  replayCount: number
  maxReplay: number
}): ExamRecommendationInput {
  const replayHeavy = input.maxReplay > 0 && input.replayCount / input.maxReplay >= 0.66
  return {
    examType: 'listening',
    mode: 'training',
    normalizedPercent: input.correct ? 88 : 52,
    pass: input.correct,
    weakTags: input.correct ? [] : [`exam-listening-${input.questionType}-miss`],
    weakRubricKeys: input.correct ? [] : [input.questionType],
    listeningQuestionType: input.questionType,
    replayHeavy,
  }
}

export function readingRecommendationInput(input: {
  correct: boolean
  readingSkill: 'scanning' | 'comprehension'
}): ExamRecommendationInput {
  return {
    examType: 'reading',
    mode: 'training',
    normalizedPercent: input.correct ? 88 : 52,
    pass: input.correct,
    weakTags: input.correct ? [] : [`exam-reading-${input.readingSkill}-miss`],
    weakRubricKeys: input.correct ? [] : [input.readingSkill],
    readingSkill: input.readingSkill,
  }
}

export function kmnRecommendationInput(input: {
  topicId: KmnTopicId
  correct: boolean
}): ExamRecommendationInput {
  return {
    examType: 'kmn',
    mode: 'training',
    normalizedPercent: input.correct ? 90 : 48,
    pass: input.correct,
    weakTags: input.correct ? [] : [`kmn-${input.topicId}-quiz-miss`, `exam-kmn-${input.topicId}-quiz-gap`],
    kmnTopicId: input.topicId,
  }
}
