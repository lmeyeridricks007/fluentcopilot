import type { ExamScoringEngineOutput } from '@/lib/exam-scoring/types'
import {
  SPEAKING_CATEGORY_ORDER,
  SPEAKING_CATEGORY_LABELS,
  SPEAKING_MAX_BY_CATEGORY,
} from '@/lib/exam-scoring/speakingScoringPolicy'
import type { SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import type { FeedbackBlock } from '@/lib/schemas/exam/feedbackBlock.schema'
import type { SpeakingTrainingFeedbackUi } from '@/lib/exam-prep/speaking/types'
import type { SpeakingCoachOutput } from '@/lib/schemas/exam/speakingCoachOutput.schema'
import { buildSpeakingNextBestActions } from '@/lib/exam-prep/speaking/speakingCoachLayer'

function readinessHeadline(engine: ExamScoringEngineOutput): string {
  const pct = Math.round(engine.normalizedPercent)
  if (engine.pass) {
    return `Goed bezig — ${pct}% op deze oefenvraag`
  }
  if (engine.exerciseOutcomeBand === 'close') {
    return `Bijna — ${pct}% (nog een kleine stap)`
  }
  return `Nog oefenen — ${pct}% (dit is training)`
}

function readinessSubline(engine: ExamScoringEngineOutput): string {
  const labels: Record<ExamScoringEngineOutput['readinessLabel'], string> = {
    needs_work: 'Focus op een duidelijk antwoord + korte reden.',
    improving: 'Je zit op de goede weg; verfijn woorden en structuur.',
    nearly_ready: 'Sterk antwoord voor dit niveau; blijf variëren.',
    strong: 'Zeer bruikbaar antwoord voor A2 — houd dit tempo vast.',
  }
  return labels[engine.readinessLabel]
}

function ratio(score: number, max: number): number {
  return max > 0 ? score / max : 0
}

function strengthsFromCoach(coach: SpeakingCoachOutput, engine: ExamScoringEngineOutput): string[] {
  const out: string[] = []
  for (const e of coach.categoryEntries) {
    const r = ratio(e.score, e.maxScore)
    if (r >= 0.85) out.push(e.learnerFeedbackNl)
  }
  if (out.length === 0 && engine.pass) {
    out.push('Je antwoord sluit aan bij de opdracht en is bruikbaar voor examenoefening.')
  }
  if (out.length === 0) {
    out.push('Je hebt geprobeerd te antwoorden — in training telt meedoen.')
  }
  return [...new Set(out)].slice(0, 3)
}

function improvementsFromCoach(coach: SpeakingCoachOutput, engine: ExamScoringEngineOutput): string[] {
  const rows = [...coach.categoryEntries].sort(
    (a, b) => ratio(a.score, a.maxScore) - ratio(b.score, b.maxScore)
  )
  const out: string[] = []
  for (const e of rows) {
    if (out.length >= 4) break
    if (engine.executionGatingApplied && e.categoryKey !== 'execution') continue
    const r = ratio(e.score, e.maxScore)
    if (r >= 0.75) continue
    out.push(e.learnerFeedbackNl)
  }
  return [...new Set(out)].slice(0, 3)
}

export function buildSpeakingTrainingFeedbackUi(
  engine: ExamScoringEngineOutput,
  item: SpeakingTrainingItem,
  coach: SpeakingCoachOutput
): SpeakingTrainingFeedbackUi {
  const categoryRows = SPEAKING_CATEGORY_ORDER.map((key) => {
    const row = engine.rubricScores.find((r) => r.categoryKey === key)
    const max = SPEAKING_MAX_BY_CATEGORY[key]
    const score = row?.score ?? 0
    const ce = coach.categoryEntries.find((c) => c.categoryKey === key)
    return {
      key,
      label: SPEAKING_CATEGORY_LABELS[key].en,
      labelNl: SPEAKING_CATEGORY_LABELS[key].nl,
      score,
      max,
      detail: engine.categoryRationales[key],
      learnerFeedbackNl: ce?.learnerFeedbackNl ?? '',
      evidenceNl: ce?.evidenceNl,
    }
  })

  return {
    headline: readinessHeadline(engine),
    subline: readinessSubline(engine),
    readinessLabel: engine.readinessLabel,
    normalizedPercent: engine.normalizedPercent,
    tenPointScale: engine.tenPointScale,
    pass: engine.pass,
    strengths: strengthsFromCoach(coach, engine),
    improvements: improvementsFromCoach(coach, engine),
    categoryRows,
    modelAnswerDutch: item.modelAnswerDutch,
    modelAnswerNoteEn: item.modelAnswerNoteEn,
    executionGatedNote: engine.executionGatingApplied
      ? 'Formele regel: bij uitvoering 0 worden andere rubrieken op 0 gezet — zo werkt ook het examenmodel.'
      : undefined,
    learnerAnswerPreview: undefined,
  }
}

export function buildSpeakingTrainingFeedbackBlock(input: {
  ids: { feedbackBlockId: string; attemptId: string }
  item: SpeakingTrainingItem
  engine: ExamScoringEngineOutput
  coach: SpeakingCoachOutput
}): FeedbackBlock {
  const ui = buildSpeakingTrainingFeedbackUi(input.engine, input.item, input.coach)
  const grammarNotes = input.coach.corrections.map((c, i) => ({
    id: `corr-${i}`,
    pattern: c.explanationNl,
    exampleWrong: c.originalFragment,
    exampleRight: c.correctedFragment,
    metadata: {},
  }))

  return {
    id: input.ids.feedbackBlockId,
    examAttemptId: input.ids.attemptId,
    examExerciseId: input.item.id,
    mode: 'training',
    summary: ui.headline,
    strengths: ui.strengths,
    improvements: ui.improvements,
    rubricFeedback: input.coach.categoryEntries.map((e) => ({
      categoryKey: e.categoryKey,
      headline: e.labelNl,
      detail: e.evidenceNl ?? e.learnerFeedbackNl,
      metadata: { score: e.score, maxScore: e.maxScore },
    })),
    correctedVersion: input.coach.improvedVersionDutch,
    betterPhrasing: undefined,
    grammarNotes: grammarNotes.length ? grammarNotes : undefined,
    nextBestActions: buildSpeakingNextBestActions(input.engine, {
      scenarioGroupId: input.item.scenarioGroupId,
      mode: 'training',
    }),
    reviewCandidates:
      input.engine.weakTags.length > 0
        ? [
            {
              reviewItemType: 'speaking' as const,
              prompt: input.item.promptDutch,
              expectedAnswer: input.item.modelAnswerDutch,
              tags: [...input.engine.weakTags, ...(input.coach.mistakeOrientedTags ?? [])],
              metadata: { source: 'exam_prep_speaking_training' },
            },
          ]
        : input.coach.mistakeOrientedTags?.length
          ? [
              {
                reviewItemType: 'speaking' as const,
                prompt: input.item.promptDutch,
                expectedAnswer: input.item.modelAnswerDutch,
                tags: input.coach.mistakeOrientedTags,
                metadata: { source: 'exam_prep_speaking_training' },
              },
            ]
          : undefined,
    showDetail: true,
    metadata: {
      normalizedPercent: input.engine.normalizedPercent,
      readinessLabel: input.engine.readinessLabel,
      weakTags: input.engine.weakTags,
      mistakeOrientedTags: input.coach.mistakeOrientedTags,
      improvedVersionNoteNl: input.coach.improvedVersionNoteNl,
    },
  }
}
