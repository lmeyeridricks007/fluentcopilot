/**
 * Exam-coach layer for writing training: per-category copy, selective corrections, rewritten draft, model answer.
 */
import { writingCoachOutputSchema } from '@/lib/schemas/exam/writingCoachOutput.schema'
import type { ExamScoringEngineOutput } from '@/lib/exam-scoring/types'
import type { WritingRawScores } from '@/lib/exam-scoring/types'
import {
  WRITING_CATEGORY_ORDER,
  WRITING_CATEGORY_LABELS,
  WRITING_MAX_BY_CATEGORY,
} from '@/lib/exam-scoring/writingScoringPolicy'
import { mistakeOrientedTagsFromWriting } from '@/lib/exam-scoring/integrationHints'
import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'
import type { WritingCoachOutput } from '@/lib/schemas/exam/writingCoachOutput.schema'
import type { NextBestAction } from '@/lib/schemas/exam/feedbackBlock.schema'
import type { WritingExerciseSubtype } from '@/lib/schemas/exam/writingExam.schema'
import { buildExamRecommendations } from '@/lib/exam-recommendations/examRecommendationEngine'
import { examRecommendationsToNextBestActions } from '@/lib/exam-recommendations/examRecommendationPresenter'
import { writingRecommendationInputFromEngine } from '@/lib/exam-recommendations/examRecommendationInputs'
import {
  buildWritingRewrittenDraft,
  extractWritingCorrectionsForDisplay,
} from '@/lib/exam-prep/writing/writingRewriter'

function scoresFromEngine(engine: ExamScoringEngineOutput): WritingRawScores {
  const out = {} as WritingRawScores
  for (const k of WRITING_CATEGORY_ORDER) {
    out[k] = engine.rubricScores.find((r) => r.categoryKey === k)?.score ?? 0
  }
  return out
}

function ratio(score: number, max: number): number {
  return max > 0 ? score / max : 0
}

function bandFeedbackNl(
  key: (typeof WRITING_CATEGORY_ORDER)[number],
  score: number,
  _max: number,
  baseRationale: string | undefined
): { primary: string; evidence?: string } {
  const base = baseRationale?.trim()

  if (key === 'execution') {
    if (score === 0)
      return {
        primary: 'Uw antwoord sluit nog niet goed aan bij de opdracht of is te kort om te beoordelen.',
        evidence: base,
      }
    if (score === 1)
      return {
        primary: 'U raakt de opdracht, maar één of meer verplichte punten ontbreken nog.',
        evidence: base,
      }
    if (score === 2)
      return {
        primary: 'U voert de opdracht grotendeels uit; controleer of elk bulletpunt echt in de tekst staat.',
        evidence: base,
      }
    return { primary: 'U voert de opdracht inhoudelijk sterk uit voor A2-schrijven.', evidence: base }
  }

  if (key === 'grammar') {
    if (score === 0)
      return {
        primary: 'Er zijn meerdere grammaticale fouten of mengvormen (NL/EN) die de tekst minder duidelijk maken.',
        evidence: base,
      }
    if (score === 1)
      return {
        primary: 'Uw grammatica is meestal begrijpelijk, maar woordvolgorde en vormen hebben nog aandacht nodig.',
        evidence: base,
      }
    return { primary: 'Grammatica ondersteunt uw boodschap goed op dit niveau.', evidence: base }
  }

  if (key === 'spelling') {
    if (score === 0)
      return {
        primary: 'Spelling- of tikfouten maken de tekst minder duidelijk voor de lezer.',
        evidence: base,
      }
    if (score === 1)
      return {
        primary: 'Veel frequente woorden zijn goed; er vallen nog enkele spellingpunten op.',
        evidence: base,
      }
    return { primary: 'Spelling is netjes en ondersteunt uw betekenis.', evidence: base }
  }

  if (key === 'clearness') {
    if (score === 0)
      return {
        primary: 'De structuur is nog dun: meer zinnen of duidelijke regels maken uw boodschap sterker.',
        evidence: base,
      }
    return {
      primary: 'Uw tekst heeft voldoende structuur en is als korte praktijktekst te begrijpen.',
      evidence: base,
    }
  }

  if (key === 'vocabulary') {
    if (score === 0)
      return {
        primary: 'Uw woordkeuze is nog erg algemeen of herhaalt vaak hetzelfde woord.',
        evidence: base,
      }
    if (score === 1)
      return {
        primary: 'U gebruikt eenvoudige maar passende woorden; iets meer variatie uit het thema helpt.',
        evidence: base,
      }
    return {
      primary: 'Goed gebruik van praktische woorden die bij deze opdracht horen.',
      evidence: base,
    }
  }

  return { primary: 'Feedback voor dit onderdeel.', evidence: base }
}

function buildNextStepNl(engine: ExamScoringEngineOutput, raw: WritingRawScores): string {
  if (engine.executionGatingApplied || raw.execution === 0) {
    return 'Volgende stap: schrijf steekwoorden per bullet en zet daarna één zin per punt; controleer vóór u indient.'
  }
  const weakest = [...WRITING_CATEGORY_ORDER]
    .map((k) => ({ k, r: ratio(raw[k], WRITING_MAX_BY_CATEGORY[k]) }))
    .sort((a, b) => a.r - b.r)[0]
  if (!weakest) return 'Schrijf nog een vergelijkbare opdracht en vergelijk met het modelantwoord.'

  switch (weakest.k) {
    case 'execution':
      return 'Volgende stap: herschrijf met de bullets als checklist — één zin per punt.'
    case 'grammar':
      return 'Volgende stap: pas één correctie toe en schrijf de hele zin opnieuw.'
    case 'spelling':
      return 'Volgende stap: lees hardop, onderstreep twijfels en gebruik eenvoudige woorden die u zeker kent.'
    case 'vocabulary':
      return 'Volgende stap: noteer vijf woorden uit het onderwerp en gebruik er minstens drie.'
    case 'clearness':
      return 'Volgende stap: gebruik korte zinnen en een vaste aanhef (Beste …) en afsluiting (Met vriendelijke groet).'
    default:
      return 'Volgende stap: herhaal de opdracht en tick elk bullet af voordat u indient.'
  }
}

export function buildWritingNextBestActions(
  engine: ExamScoringEngineOutput,
  opts?: { writingSubtype?: WritingExerciseSubtype; mode?: 'training' | 'simulation' }
): NextBestAction[] {
  const input = writingRecommendationInputFromEngine(engine, opts)
  const bundle = buildExamRecommendations(input)
  return examRecommendationsToNextBestActions(bundle, {
    source: `exam_writing_${opts?.mode ?? 'training'}`,
  })
}

export function buildWritingCoachOutput(input: {
  item: WritingTrainingItem
  answer: string
  engine: ExamScoringEngineOutput
}): WritingCoachOutput {
  const { item, answer, engine } = input
  const trimmed = answer.trim()
  const corrections = extractWritingCorrectionsForDisplay(trimmed)
  const { text: improved, noteNl: rewrittenNoteNl } = buildWritingRewrittenDraft({
    item,
    answer: trimmed,
    engine,
  })

  const raw = scoresFromEngine(engine)
  const mistakeOrientedTags = mistakeOrientedTagsFromWriting(raw)

  const categoryEntries = WRITING_CATEGORY_ORDER.map((key) => {
    const row = engine.rubricScores.find((r) => r.categoryKey === key)
    const max = WRITING_MAX_BY_CATEGORY[key]
    const score = row?.score ?? 0
    const rationale = engine.categoryRationales[key]

    if (engine.executionGatingApplied && key !== 'execution') {
      return {
        categoryKey: key,
        labelNl: WRITING_CATEGORY_LABELS[key].nl,
        score,
        maxScore: max,
        learnerFeedbackNl:
          'Niet apart beoordeeld: bij uitvoering 0 telt het examen andere rubrieken niet mee — werk eerst de opdracht af.',
        evidenceNl: undefined,
      }
    }

    const { primary, evidence } = bandFeedbackNl(key, score, max, rationale)
    const evidenceNl = evidence && evidence !== primary ? evidence : undefined

    return {
      categoryKey: key,
      labelNl: WRITING_CATEGORY_LABELS[key].nl,
      score,
      maxScore: max,
      learnerFeedbackNl: primary,
      evidenceNl,
    }
  })

  return writingCoachOutputSchema.parse({
    categoryEntries,
    corrections,
    improvedVersionDutch: improved.length > 0 ? improved : trimmed,
    improvedVersionNoteNl: rewrittenNoteNl,
    idealAnswerDutch: item.modelAnswerDutch,
    idealAnswerNoteEn: item.modelAnswerNoteEn,
    nextStepNl: buildNextStepNl(engine, raw),
    mistakeOrientedTags,
    metadata: {
      evaluator: 'writing-coach-layer-v2',
      pass: engine.pass,
      normalizedPercent: engine.normalizedPercent,
    },
  })
}
