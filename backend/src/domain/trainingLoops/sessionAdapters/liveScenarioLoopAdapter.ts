import type { LiveSessionEvaluation } from '../../../services/speak-live/liveVoiceEvaluationTypes'
import type { SessionLoopAdapterHints, SessionAdapterResolutionInput, ScenarioContentTheme } from './sessionLoopAdapterTypes'
import type { TrainingLoopType } from '../trainingLoopTypes'
import { speakLiveComprehensionWeakForListeningLoops } from '../speakLiveComprehensionSignals'
import { LISTENING_TRAINING_LOOP_TYPES } from './listeningModalityLoopAdapter'

const SCENARIO_ALLOWED = new Set<TrainingLoopType>([
  'retry_sentence',
  'weak_words',
  'mini_scenario',
  'read_aloud_fix',
  'structure_drill',
  'pronunciation_drill',
  'storytelling_drill',
])

function normalizeSlug(slug: string | null): string {
  return (slug ?? '').toLowerCase().replace(/-/g, '_')
}

export function detectScenarioContentTheme(slug: string | null): ScenarioContentTheme {
  const s = normalizeSlug(slug)
  if (
    /transport|station|bus|tram|metro|train|route|ov|platform|ticket|direction|navigate|public_transport/.test(
      s,
    )
  )
    return 'transport'
  if (/opinion|debate|agree|disagree|because|reason|argument|stance|discuss/.test(s)) return 'opinions'
  if (/story|narrat|tale|memory|past_event|anecdote/.test(s)) return 'story'
  if (/order|food|restaurant|cafe|menu|waiter/.test(s)) return 'food_service'
  return 'general'
}

function scenarioMiniObjective(theme: ScenarioContentTheme, slug: string | null): string | null {
  switch (theme) {
    case 'transport':
      return 'Route mini-drill: one exchange to confirm platform, direction, or transfer—keep it short and clear.'
    case 'opinions':
      return 'Opinion mini-drill: one exchange where you give a stance plus a short reason (“omdat …” / “daarom …”).'
    case 'story':
      return 'Story mini-drill: replay the hardest beat—first what happened, then one feeling or outcome.'
    case 'food_service':
      return 'Service mini-drill: polite order + one clarification question in Dutch.'
    default:
      if (normalizeSlug(slug).includes('direction')) {
        return 'Directions mini-drill: confirm where to go next in one tight question–answer pair.'
      }
      return null
  }
}

function structureTailForTheme(theme: ScenarioContentTheme): string | null {
  switch (theme) {
    case 'opinions':
      return 'Second line: add one **because** clause (Dutch) that supports your opinion—keep it level-appropriate.'
    case 'story':
      return 'Second line: use clear sequencing (“eerst …”, “daarna …”, “tot slot …”) in Dutch.'
    case 'transport':
      return 'Second line: ask one precise follow-up about time, platform, or line number in Dutch.'
    default:
      return null
  }
}

function structureTitleHint(theme: ScenarioContentTheme): string | null {
  if (theme === 'opinions') return 'Reason-building structure rep'
  if (theme === 'story') return 'Sequencing structure rep'
  if (theme === 'transport') return 'Route-clarity structure rep'
  return null
}

function liveMicroReadFromEvaluation(ev: LiveSessionEvaluation | null): { passage: string | null; subtitle: string | null } {
  if (!ev) return { passage: null, subtitle: null }
  const ex = ev.focusArea?.exampleLine?.trim()
  if (ex && ex.length > 12) return { passage: ex.slice(0, 380), subtitle: 'Micro re-read from your session focus line.' }
  const turns = ev.turnEvaluations ?? []
  const t = turns.find((x) => (x.learnerTranscript ?? '').trim().length > 14)
  const line = t?.learnerTranscript?.trim()
  if (line) return { passage: line.slice(0, 380), subtitle: 'Micro re-read from a line you actually said.' }
  return { passage: null, subtitle: null }
}

function shouldOfferLiveMicroRead(params: {
  evaluation: LiveSessionEvaluation | null
  hesitationStrong: boolean
  pronunciationIssueCount: number
}): boolean {
  const ev = params.evaluation
  if (!ev) return params.hesitationStrong || params.pronunciationIssueCount >= 2
  const actions = ev.recommendedActions ?? []
  if (actions.some((a) => a.type === 'read_aloud')) return true
  const dims = ev.overall?.dimensions ?? []
  const flu = dims.find((d) => /fluency|rhythm|pacing/i.test(d.label ?? ''))
  if (typeof flu?.score === 'number' && flu.score < 62) return true
  return params.hesitationStrong || params.pronunciationIssueCount >= 2
}

export function buildLiveScenarioAdapterHints(
  input: SessionAdapterResolutionInput,
  opts: { hesitationStrong: boolean },
): SessionLoopAdapterHints {
  const theme = detectScenarioContentTheme(input.scenarioSlug)
  const mini = scenarioMiniObjective(theme, input.scenarioSlug)
  const micro = liveMicroReadFromEvaluation(input.speakLiveEvaluation)
  const liveRead =
    shouldOfferLiveMicroRead({
      evaluation: input.speakLiveEvaluation,
      hesitationStrong: opts.hesitationStrong,
      pronunciationIssueCount: input.insights.pronunciationIssues.length,
    }) && micro.passage
      ? micro
      : { passage: null, subtitle: null }

  const preferred: TrainingLoopType[] = []
  if (theme === 'transport' || theme === 'food_service') preferred.push('mini_scenario', 'structure_drill')
  if (theme === 'opinions') preferred.push('structure_drill', 'mini_scenario')
  if (theme === 'story') preferred.push('storytelling_drill', 'structure_drill', 'mini_scenario')
  if (liveRead.passage) preferred.push('read_aloud_fix')

  const earWeak = speakLiveComprehensionWeakForListeningLoops(input.speakLiveEvaluation)
  const allowed = new Set<TrainingLoopType>(SCENARIO_ALLOWED)
  if (earWeak) {
    for (const lt of LISTENING_TRAINING_LOOP_TYPES) allowed.add(lt)
    preferred.unshift('route_detail_drill', 'listening_burst')
  }

  return {
    adapterId: 'live_scenario',
    source: 'scenario',
    allowedLoopTypes: allowed,
    scenarioTheme: theme,
    miniScenarioObjectiveOverride: mini,
    structurePromptTail: structureTailForTheme(theme),
    structureDrillTitleHint: structureTitleHint(theme),
    questionDrillTitle: null,
    questionDrillSubtitle: null,
    questionDrillPrompts: null,
    questionDrillExampleQuestions: null,
    liveMicroReadPassage: liveRead.passage,
    liveMicroReadSubtitle: liveRead.subtitle,
    readAloudRetryPhrase: null,
    readAloudPacingFocusLabel: null,
    chatSpeakingTransferPrompts: null,
    preferredLoopTypesForSession: preferred,
  }
}
