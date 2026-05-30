/**
 * Exam-coach layer: per-category learner copy, corrections, improved draft, next step.
 * Scores come from `ExamScoringEngineOutput` (already gated/clamped).
 */
import { speakingCoachOutputSchema } from '@/lib/schemas/exam/speakingCoachOutput.schema'
import type { ExamScoringEngineOutput } from '@/lib/exam-scoring/types'
import type { SpeakingRawScores } from '@/lib/exam-scoring/types'
import {
  SPEAKING_CATEGORY_ORDER,
  SPEAKING_CATEGORY_LABELS,
  SPEAKING_MAX_BY_CATEGORY,
} from '@/lib/exam-scoring/speakingScoringPolicy'
import { mistakeOrientedTagsFromSpeaking } from '@/lib/exam-scoring/integrationHints'
import type { SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import type { SpeakingCoachOutput } from '@/lib/schemas/exam/speakingCoachOutput.schema'
import type { NextBestAction } from '@/lib/schemas/exam/feedbackBlock.schema'
import type { SpeakingScenarioGroupId } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import { buildExamRecommendations } from '@/lib/exam-recommendations/examRecommendationEngine'
import { examRecommendationsToNextBestActions } from '@/lib/exam-recommendations/examRecommendationPresenter'
import { speakingRecommendationInputFromEngine } from '@/lib/exam-recommendations/examRecommendationInputs'
import {
  applyCorrectionsToText,
  extractSpeakingCorrections,
  polishSpeakingAnswerSurface,
} from '@/lib/exam-prep/speaking/speakingCorrections'

function scoresFromEngine(engine: ExamScoringEngineOutput): SpeakingRawScores {
  const out = {} as SpeakingRawScores
  for (const k of SPEAKING_CATEGORY_ORDER) {
    out[k] = engine.rubricScores.find((r) => r.categoryKey === k)?.score ?? 0
  }
  return out
}

function ratio(score: number, max: number): number {
  return max > 0 ? score / max : 0
}

/**
 * Extra learner line per category, aligned with score band (Dutch, concise).
 */
function bandFeedbackNl(
  key: (typeof SPEAKING_CATEGORY_ORDER)[number],
  score: number,
  _max: number,
  baseRationale: string | undefined
): { primary: string; evidence?: string } {
  const base = baseRationale?.trim()

  if (key === 'execution') {
    if (score === 0) return { primary: 'Je antwoord sluit niet duidelijk aan bij de vraag of is te kort om te beoordelen.' }
    if (score === 1)
      return {
        primary: 'Je raakt de vraag maar mist een belangrijk deel van de opdracht (bijvoorbeeld een reden of vergelijking).',
        evidence: base,
      }
    if (score === 2)
      return {
        primary: 'Je beantwoordt de vraag grotendeels; maak het nog iets completer of duidelijker.',
        evidence: base,
      }
    return { primary: 'Je voert de opdracht inhoudelijk goed uit voor A2.', evidence: base }
  }

  if (key === 'grammar') {
    if (score === 0) return { primary: 'Er vallen meerdere grammaticale fouten of mengvormen op — werk de belangrijkste eerst weg.', evidence: base }
    if (score === 1) return { primary: 'Globaal begrijpelijk, maar er zijn duidelijke grammaticale aandachtspunten.', evidence: base }
    return { primary: 'Grammatica ondersteunt je boodschap goed op dit niveau.', evidence: base }
  }

  if (key === 'vocabulary') {
    if (score === 0) return { primary: 'Woordkeuze is nog te algemeen of niet duidelijk verbonden met het onderwerp.', evidence: base }
    if (score === 1) return { primary: 'Basiswoordenschat klopt; voeg een paar concrete woorden uit het thema toe.', evidence: base }
    return { primary: 'Je woorden passen goed bij het onderwerp.', evidence: base }
  }

  if (key === 'fluency') {
    if (score === 0) return { primary: 'Het antwoord voelt erg brokkelig of te kort; bouw twee korte zinnen.', evidence: base }
    if (score === 1) return { primary: 'Redelijke doorloop; oefen iets langere zinnen en verbindingswoorden.', evidence: base }
    return { primary: 'Je antwoord loopt rustig en is examengericht.', evidence: base }
  }

  if (key === 'clearness') {
    if (score === 0) return { primary: 'Structuur is zwak: voeg een tweede zin of een verbandwoord toe (omdat, want, daarnaast).', evidence: base }
    return { primary: 'Je ideeën zijn goed te volgen.', evidence: base }
  }

  /* pronunciation */
  if (score === 0) return { primary: 'Verstaanbaarheid is zwak in dit signaal — spreek rustig en controleer het transcript.', evidence: base }
  if (score === 1) return { primary: 'Over het algemeen verstaanbaar; enkele momenten zijn minder helder.', evidence: base }
  return { primary: 'Goed verstaanbaar op basis van het beschikbare signaal.', evidence: base }
}

function buildNextStepNl(engine: ExamScoringEngineOutput, raw: SpeakingRawScores): string {
  if (engine.executionGatingApplied || raw.execution === 0) {
    return 'Volgende stap: lees de vraag hardop, noteer twee punten die je moet noemen, en antwoord in twee korte zinnen.'
  }
  const weakest = [...SPEAKING_CATEGORY_ORDER]
    .map((k) => ({ k, r: ratio(raw[k], SPEAKING_MAX_BY_CATEGORY[k]) }))
    .sort((a, b) => a.r - b.r)[0]
  if (!weakest) return 'Doe nog een vergelijkbare vraag en let op structuur: antwoord + korte reden.'

  switch (weakest.k) {
    case 'grammar':
      return 'Volgende stap: kies één fout uit de correcties en spreek de goede zin drie keer hardop.'
    case 'vocabulary':
      return 'Volgende stap: schrijf 5 themawoorden op en gebruik minstens twee in je volgende antwoord.'
    case 'fluency':
      return 'Volgende stap: antwoord met precies twee zinnen — eerst feit, daarna reden met “omdat” of “want”.'
    case 'clearness':
      return 'Volgende stap: gebruik “Eerst … Daarna …” of “Ik vind … omdat …” om je antwoord te structureren.'
    case 'pronunciation':
      return 'Volgende stap: neem op in een rustige omgeving en corrigeer het transcript vóór je indient.'
    case 'execution':
      return 'Volgende stap: herlees de vraag en check of je alle delen beantwoordt (voorkeur + reden, enz.).'
    default:
      return 'Volgende stap: herhaal een vergelijkbare oefenvraag en vergelijk je antwoord met het modelantwoord.'
  }
}

export function buildSpeakingNextBestActions(
  engine: ExamScoringEngineOutput,
  opts?: { scenarioGroupId?: SpeakingScenarioGroupId; mode?: 'training' | 'simulation' }
): NextBestAction[] {
  const input = speakingRecommendationInputFromEngine(engine, opts)
  const bundle = buildExamRecommendations(input)
  return examRecommendationsToNextBestActions(bundle, {
    source: `exam_speaking_${opts?.mode ?? 'training'}`,
  })
}

/**
 * Full coach payload for UI + optional persistence validation.
 */
export function buildSpeakingCoachOutput(input: {
  item: SpeakingTrainingItem
  answer: string
  engine: ExamScoringEngineOutput
}): SpeakingCoachOutput {
  const { item, answer, engine } = input
  const trimmed = answer.trim()
  const corrections = extractSpeakingCorrections(trimmed, 3)
  let improved = applyCorrectionsToText(trimmed, corrections)
  if (improved === polishSpeakingAnswerSurface(trimmed) && corrections.length === 0) {
    improved = polishSpeakingAnswerSurface(trimmed)
  }

  const raw = scoresFromEngine(engine)
  const mistakeOrientedTags = mistakeOrientedTagsFromSpeaking(raw)

  const categoryEntries = SPEAKING_CATEGORY_ORDER.map((key) => {
    const row = engine.rubricScores.find((r) => r.categoryKey === key)
    const max = SPEAKING_MAX_BY_CATEGORY[key]
    const score = row?.score ?? 0
    const rationale = engine.categoryRationales[key]

    if (engine.executionGatingApplied && key !== 'execution') {
      return {
        categoryKey: key,
        labelNl: SPEAKING_CATEGORY_LABELS[key].nl,
        score,
        maxScore: max,
        learnerFeedbackNl:
          'Niet apart beoordeeld: bij uitvoering 0 telt het examen andere onderdelen niet mee — focus eerst op de opdracht.',
        evidenceNl: undefined,
      }
    }

    const { primary, evidence } = bandFeedbackNl(key, score, max, rationale)
    return {
      categoryKey: key,
      labelNl: SPEAKING_CATEGORY_LABELS[key].nl,
      score,
      maxScore: max,
      learnerFeedbackNl: primary,
      evidenceNl: evidence && evidence !== primary ? evidence : rationale && rationale !== primary ? rationale : undefined,
    }
  })

  const improvedNote =
    corrections.length > 0
      ? 'Zelfde bedoeling als jouw antwoord, met de belangrijkste correcties toegepast (A2-niveau).'
      : 'Hoofdletter, leestekens en zinsopbouw opgeschoond — inhoudelijk hetzelfde gelaten.'

  return speakingCoachOutputSchema.parse({
    categoryEntries,
    corrections,
    improvedVersionDutch: improved.length > 0 ? improved : polishSpeakingAnswerSurface(trimmed) || trimmed,
    improvedVersionNoteNl: improvedNote,
    idealAnswerDutch: item.modelAnswerDutch,
    idealAnswerNoteEn: item.modelAnswerNoteEn,
    nextStepNl: buildNextStepNl(engine, raw),
    mistakeOrientedTags,
    metadata: {
      evaluator: 'coach-layer-v1',
      pass: engine.pass,
      normalizedPercent: engine.normalizedPercent,
    },
  })
}
