import type { ConversationSummary } from '../../models/contracts'
import type { SpeakLivePersistedState } from './speakLiveFsm'
import {
  buildStorytellingRecapHookBundle,
  inferStorytellingGoalLabelsFromUserText,
  storytellingCompletionContractSatisfied,
} from './storytellingEvaluationContract'

function normSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, '_')
}

function dedupeAppend(base: string[] | undefined, extra: string[]): string[] {
  const seen = new Set((base ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean))
  const out = [...(base ?? [])]
  for (const line of extra) {
    const k = line.trim().toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(line)
  }
  return out
}

export { inferStorytellingGoalLabelsFromUserText }

export function reconcileStorytellingLiveRecap(params: {
  summary: ConversationSummary
  scenarioSlug: string
  scenarioGoals: string[]
  slState: SpeakLivePersistedState | null | undefined
  userMessageTexts: string[]
}): ConversationSummary {
  if (normSlug(params.scenarioSlug) !== 'storytelling') return params.summary

  const { summary, scenarioGoals, slState, userMessageTexts } = params
  const canonical = new Set(scenarioGoals.map((g) => g.toLowerCase()))

  const fromFsm = new Set<string>()
  for (const i of slState?.goalsCompleted ?? []) {
    if (typeof i !== 'number' || i < 0 || i >= scenarioGoals.length) continue
    fromFsm.add(scenarioGoals[i]!)
  }

  const inferred = inferStorytellingGoalLabelsFromUserText(scenarioGoals, userMessageTexts)

  const merged = new Set<string>()
  for (const g of summary.goalsCompleted ?? []) {
    if (typeof g !== 'string') continue
    if (canonical.has(g.toLowerCase())) merged.add(scenarioGoals.find((x) => x.toLowerCase() === g.toLowerCase()) ?? g)
  }
  for (const g of fromFsm) merged.add(g)
  for (const g of inferred) merged.add(g)

  const goalsCompleted = scenarioGoals.filter((g) => merged.has(g))
  const goalsMissed = scenarioGoals.filter((g) => !merged.has(g))

  const runtime = slState?.scenarioRuntimeConfig ?? null
  const contractMet = storytellingCompletionContractSatisfied(runtime, goalsCompleted)
  const hooks = buildStorytellingRecapHookBundle({
    contractMet,
    completedGoalLabels: goalsCompleted,
    missedGoalLabels: goalsMissed,
  })

  const languageNoteLines = [
    ...hooks.coachingHooks.map((h) => `coaching_hook:${h}`),
    ...goalsMissed.map((g) => `story_part_hint:${g}`),
  ]
  const languageNotes = dedupeAppend(summary.languageNotes, languageNoteLines)

  const whatWentWell = hooks.positive.length ? dedupeAppend(summary.whatWentWell, hooks.positive) : summary.whatWentWell ?? []
  const whatToImprove = hooks.improve.length ? dedupeAppend(summary.whatToImprove, hooks.improve) : summary.whatToImprove ?? []

  return {
    ...summary,
    goalsCompleted,
    goalsMissed,
    languageNotes,
    whatWentWell,
    whatToImprove,
  }
}
