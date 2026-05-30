import type { UserLearningProfile } from './userLearningProfileDocument'
import {
  buildLanguageCoachPersonalizationBundle,
  buildLanguageCoachSessionSteerPlan,
} from './languageCoachProfilePersonalizationContext'
import { buildPracticeRecommendations } from './learningMemoryRecommendationService'
import {
  buildScenarioLivePersonalizationPayload,
  formatScenarioLiveMicroTail,
  formatScenarioLivePersonalizationForPrompt,
  type ScenarioLivePersonalizationPayload,
} from './scenarioLivePersonalizationPayload'
import { resolveReadAloudPassagePersonalization } from './readAloudPersonalizationFromProfile'

export type LearningPersonalizationForTurn = {
  /** Longer English block for Language Coach prompt. */
  coachPersistentEnglish: string
  /** Scenario adaptation (English) for structured Speak Live scenes. */
  scenarioAdaptationEnglish: string
  /** Ultra-compact hint for micro-lean prompts (<= ~200 chars). */
  scenarioMicroHintEnglish: string
  /** Structured adaptive layer for the active scenario (null for Language Coach / missing id). */
  scenarioLivePersonalization: ScenarioLivePersonalizationPayload | null
}

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function buildLearningPersonalizationForTurn(params: {
  profile: UserLearningProfile
  scenarioSlug: string
  /** DB scenario id — required for scenario-specific performance join. */
  scenarioId?: string | null
  isLanguageCoach: boolean
}): LearningPersonalizationForTurn {
  const rec = buildPracticeRecommendations(params.profile)
  const steer = buildLanguageCoachSessionSteerPlan(params.profile)
  const lcBundle = params.isLanguageCoach
    ? buildLanguageCoachPersonalizationBundle({
        profile: params.profile,
        scenarioSlug: params.scenarioSlug,
        rec,
        steer,
      })
    : null

  const weak = (params.profile.activeFocusAreas.length ? params.profile.activeFocusAreas : []).slice(0, 2).filter(Boolean)
  const strong = params.profile.strongestAreas.slice(0, 2)
  const themes = rec.recommendedFreeTalkThemes.slice(0, 2)

  const coachPersistentEnglish = lcBundle
    ? lcBundle.coachPersistentEnglish
    : [
        '--- Persistent learner memory (English; internal — never read as a list to the learner) ---',
        rec.coldStart
          ? 'Cold start: keep coaching exploratory; avoid implying long-term habits yet.'
          : [
              `Estimated focus (from recent sessions, not certain): ${weak.join(' · ') || 'general polish'}.`,
              strong.length ? `Relative strengths to lean on: ${strong.join(' · ')}.` : '',
              themes.length ? `Optional micro-themes for natural steering (max one idea / few turns): ${themes.join(', ')}.` : '',
              'Rules: at most 1–2 focus areas this session; prefer recasts and follow-up questions over blunt correction every turn.',
              'If flow is good for several turns, do not interrupt — let momentum run.',
              'Never dump weaknesses; never sound like a dashboard.',
            ]
              .filter(Boolean)
              .join(' '),
      ].join('\n')

  const challenge =
    params.profile.scenarioPerformance && Object.keys(params.profile.scenarioPerformance).length
      ? 'If scenario scores show struggle, shorten prompts first then add one layered follow-up. If scores are strong, allow one extra confirmation step.'
      : 'Default: match CEFR; keep challenge one notch below frustration.'

  let scenarioAdaptationEnglish = lcBundle
    ? lcBundle.scenarioAdaptationEnglish
    : [
        '--- Session adaptation (English; internal) ---',
        `Scene: ${params.scenarioSlug.replace(/_/g, ' ')}.`,
        weak.length ? `Learner tends to work on: ${weak.join(' · ')}.` : 'No stable weakness profile yet.',
        challenge,
        'Modes: reinforce (supportive scaffolding), stretch (one extra detail), recover (short sentences, more confirmation). Pick one implicitly from learner replies — do not announce the mode.',
      ].join('\n')

  const scenarioLivePersonalization =
    !params.isLanguageCoach && params.scenarioId?.trim()
      ? buildScenarioLivePersonalizationPayload(params.profile, params.scenarioId.trim(), params.scenarioSlug)
      : null

  if (scenarioLivePersonalization) {
    const adaptiveBlock = formatScenarioLivePersonalizationForPrompt(scenarioLivePersonalization)
    scenarioAdaptationEnglish = [scenarioAdaptationEnglish, adaptiveBlock].join('\n\n')
  }

  const microParts = [
    !rec.coldStart && weak[0] ? `subtle:${truncate(weak[0], 90)}` : '',
    themes[0] ? `nudge:${truncate(themes[0].replace(/_/g, ' '), 70)}` : '',
  ].filter(Boolean)
  const microBase = lcBundle
    ? lcBundle.scenarioMicroHintEnglish
    : truncate(microParts.join(' | ') || 'adaptive:match learner pace', 200)
  const scenarioMicroHintEnglish = scenarioLivePersonalization
    ? truncate([microBase, formatScenarioLiveMicroTail(scenarioLivePersonalization)].filter(Boolean).join(' · '), 200)
    : microBase

  if (params.isLanguageCoach) {
    return {
      coachPersistentEnglish: [coachPersistentEnglish, scenarioAdaptationEnglish].join('\n'),
      scenarioAdaptationEnglish,
      scenarioMicroHintEnglish,
      scenarioLivePersonalization: null,
    }
  }
  return {
    coachPersistentEnglish: '',
    scenarioAdaptationEnglish,
    scenarioMicroHintEnglish,
    scenarioLivePersonalization,
  }
}

export function buildReadAloudPersonalizationUserEnglish(doc: UserLearningProfile, profileId: string): string {
  const level: 'A1' | 'A2' | 'B1' | 'B2' =
    doc.levelEstimate === 'A1' || doc.levelEstimate === 'A2' || doc.levelEstimate === 'B1' || doc.levelEstimate === 'B2'
      ? doc.levelEstimate
      : 'A2'
  return resolveReadAloudPassagePersonalization({
    doc,
    level,
    genre: 'everyday_conversation',
    personalizationProfileOverride: profileId,
  }).personalizationEnglish
}
