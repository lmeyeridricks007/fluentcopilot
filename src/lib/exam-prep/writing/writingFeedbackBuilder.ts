import type { ExamScoringEngineOutput } from '@/lib/exam-scoring/types'
import {
  WRITING_CATEGORY_ORDER,
  WRITING_CATEGORY_LABELS,
  WRITING_MAX_BY_CATEGORY,
} from '@/lib/exam-scoring/writingScoringPolicy'
import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'
import type { FeedbackBlock } from '@/lib/schemas/exam/feedbackBlock.schema'
import type { WritingTrainingFeedbackUi } from '@/lib/exam-prep/writing/types'
import type { WritingCoachOutput } from '@/lib/schemas/exam/writingCoachOutput.schema'
import { buildWritingNextBestActions } from '@/lib/exam-prep/writing/writingCoachLayer'

function readinessHeadline(engine: ExamScoringEngineOutput): string {
  const pct = Math.round(engine.normalizedPercent)
  if (engine.pass) {
    return `Goed bezig — ${pct}% op deze schrijfopdracht`
  }
  if (engine.exerciseOutcomeBand === 'close') {
    return `Bijna — ${pct}% (nog een kleine stap)`
  }
  return `Nog oefenen — ${pct}% (dit is training)`
}

function readinessSubline(engine: ExamScoringEngineOutput): string {
  const labels: Record<ExamScoringEngineOutput['readinessLabel'], string> = {
    needs_work: 'Focus op alle bulletpunten en korte, duidelijke zinnen.',
    improving: 'Je zit op de goede weg; verfijn spelling en grammatica.',
    nearly_ready: 'Sterke tekst voor dit niveau; blijf oefenen met andere opdrachttypes.',
    strong: 'Zeer bruikbaar voor A2-schrijven — houd dit tempo vast.',
  }
  return labels[engine.readinessLabel]
}

function ratio(score: number, max: number): number {
  return max > 0 ? score / max : 0
}

function strengthsFromCoach(coach: WritingCoachOutput, engine: ExamScoringEngineOutput): string[] {
  const out: string[] = []
  for (const e of coach.categoryEntries) {
    const r = ratio(e.score, e.maxScore)
    if (r >= 0.85) out.push(e.learnerFeedbackNl)
  }
  if (out.length === 0 && engine.pass) {
    out.push('Je tekst sluit aan bij de opdracht en is bruikbaar voor examenoefening.')
  }
  if (out.length === 0) {
    out.push('Je hebt geprobeerd de opdracht te maken — in training telt meedoen.')
  }
  return [...new Set(out)].slice(0, 3)
}

function improvementsFromCoach(coach: WritingCoachOutput, engine: ExamScoringEngineOutput): string[] {
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

export function buildWritingTrainingFeedbackUi(
  engine: ExamScoringEngineOutput,
  item: WritingTrainingItem,
  coach: WritingCoachOutput
): WritingTrainingFeedbackUi {
  const categoryRows = WRITING_CATEGORY_ORDER.map((key) => {
    const row = engine.rubricScores.find((r) => r.categoryKey === key)
    const max = WRITING_MAX_BY_CATEGORY[key]
    const score = row?.score ?? 0
    const ce = coach.categoryEntries.find((c) => c.categoryKey === key)
    return {
      key,
      label: WRITING_CATEGORY_LABELS[key].en,
      labelNl: WRITING_CATEGORY_LABELS[key].nl,
      score,
      max,
      detail: row?.evidence ?? engine.categoryRationales[key],
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
      ? 'Formele regel: bij uitvoering 0 worden grammatica, spelling, duidelijkheid en woordenschat op 0 gezet — zo werkt ook het examenmodel.'
      : undefined,
    learnerAnswerPreview: undefined,
  }
}

export function buildWritingTrainingFeedbackBlock(input: {
  ids: { feedbackBlockId: string; attemptId: string }
  item: WritingTrainingItem
  engine: ExamScoringEngineOutput
  coach: WritingCoachOutput
}): FeedbackBlock {
  const ui = buildWritingTrainingFeedbackUi(input.engine, input.item, input.coach)
  const grammarNotes = input.coach.corrections.map((c, i) => ({
    id: `w-corr-${i}`,
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
    nextBestActions: buildWritingNextBestActions(input.engine, {
      writingSubtype: input.item.subtype,
      mode: 'training',
    }),
    reviewCandidates:
      input.engine.weakTags.length > 0
        ? [
            {
              reviewItemType: 'grammar' as const,
              prompt: `${input.item.titleNl}: ${input.item.scenarioNl.slice(0, 120)}`,
              expectedAnswer: input.item.modelAnswerDutch,
              tags: [...input.engine.weakTags, ...(input.coach.mistakeOrientedTags ?? [])],
              metadata: { source: 'exam_prep_writing_training', modality: 'writing' },
            },
          ]
        : input.coach.mistakeOrientedTags?.length
          ? [
              {
                reviewItemType: 'grammar' as const,
                prompt: input.item.titleNl,
                expectedAnswer: input.item.modelAnswerDutch,
                tags: input.coach.mistakeOrientedTags,
                metadata: { source: 'exam_prep_writing_training', modality: 'writing' },
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
