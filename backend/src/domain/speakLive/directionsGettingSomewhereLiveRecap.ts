import type { ConversationSummary } from '../../models/contracts'
import type { SpeakLivePersistedState } from './speakLiveFsm'
import {
  buildDirectionsRecapHookBundle,
  directionsCompletionContractSatisfied,
} from './directionsEvaluationContract'

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

/**
 * Heuristic: map learner Dutch to scenario goal **labels** (same strings as `scenario.goals`).
 */
export function inferDirectionsGoalLabelsFromUserText(
  scenarioGoals: string[],
  userMessageTexts: string[]
): string[] {
  const blob = userMessageTexts.map((s) => s.trim()).filter(Boolean).join('\n')
  if (!blob.trim()) return []

  const t = blob.toLowerCase()
  const out = new Set<string>()

  const addIfGoal = (predicate: (goalLower: string) => boolean) => {
    for (const goal of scenarioGoals) {
      if (predicate(goal.toLowerCase())) out.add(goal)
    }
  }

  // Variation A — asking
  addIfGoal((gl) => {
    if (!gl.includes('waar het is') && !gl.includes('hoe u er komt')) return false
    return /(waar is|waar ligt|waar vind|waar kan ik|hoe kom ik|hoe moet ik|route|naar het|naar de)/i.test(t)
  })
  addIfGoal((gl) => {
    if (!gl.includes('bestemming concreet')) return false
    return /(station|apotheek|centrum|museum|wc|toilet|bushalte|tramhalte|tram|supermarkt|kantoor|adres|perrong|uitgang|ingang)/i.test(t)
  })
  addIfGoal((gl) => {
    if (!gl.includes('natuurlijke opening') && !gl.includes('beleefd')) return false
    return /(pardon|excuse|mag ik|magi k|kunt u|sorry|goedendag|goedemorgen|goedemiddag)/i.test(t)
  })
  addIfGoal((gl) => {
    if (!gl.includes('vervolgvraag') && !gl.includes('na het antwoord')) return false
    return /(is het ver|hoe ver|links of rechts|dank u|bedankt|oké|oke|prima|begrepen|klopt|overstap|bus|tram)/i.test(t)
  })

  // Variation B — understanding
  addIfGoal((gl) => {
    if (!gl.includes('route-instructies') && !gl.includes('richting/taal')) return false
    return /(rechtdoor|rechts|links|stoplicht|tweede straat|om de hoek|naast|bij de|minuten|volg)/i.test(t)
  })
  addIfGoal((gl) => {
    if (!gl.includes('route-stap')) return false
    return /(\bdus\b|oké|oke|eerst|dan|daarna|hier|daar|rechts|links|stoplicht)/i.test(t)
  })
  addIfGoal((gl) => {
    if (!gl.includes('herhaling') && !gl.includes('verduidelijking')) return false
    return /(nog een keer|herhal|langzaam|bedoelt u|even rustig|wat bedoelt|snap het niet)/i.test(t)
  })
  addIfGoal((gl) => {
    if (!gl.includes('zelfde bestemming') && !gl.includes('in beeld')) return false
    return /(station|apotheek|centrum|museum|wc|toilet|bushalte|tram|supermarkt|kantoor|perrong|uitgang|ingang)/i.test(t)
  })

  // Variation C — confirming
  addIfGoal((gl) => {
    if (!gl.includes('route helder') && !gl.includes('klopt dat')) return false
    return /(dus |klopt|bevestig|snap|begrijp|goed zo|helder)/i.test(t)
  })
  addIfGoal((gl) => {
    if (!gl.includes('volgorde')) return false
    return /(eerst|dan|daarna|vervolgens)/i.test(t)
  })
  addIfGoal((gl) => {
    if (!gl.includes('twijfel')) return false
    return /(bedoelt u|welke|tweede|na de|bij de|of bedoelt)/i.test(t)
  })
  addIfGoal((gl) => {
    if (!gl.includes('bedank') && !gl.includes('bevestiging')) return false
    return /(dank|bedankt|fijne dag|tot ziens|prima|oké|oke)/i.test(t)
  })

  return [...out]
}

export function reconcileDirectionsGettingSomewhereLiveRecap(params: {
  summary: ConversationSummary
  scenarioSlug: string
  scenarioGoals: string[]
  slState: SpeakLivePersistedState | null | undefined
  userMessageTexts: string[]
}): ConversationSummary {
  if (normSlug(params.scenarioSlug) !== 'directions_getting_somewhere') return params.summary

  const { summary, scenarioGoals, slState, userMessageTexts } = params
  const canonical = new Set(scenarioGoals.map((g) => g.toLowerCase()))

  const fromFsm = new Set<string>()
  for (const i of slState?.goalsCompleted ?? []) {
    if (typeof i !== 'number' || i < 0 || i >= scenarioGoals.length) continue
    fromFsm.add(scenarioGoals[i]!)
  }

  const inferred = inferDirectionsGoalLabelsFromUserText(scenarioGoals, userMessageTexts)

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
  const variation = runtime?.variation
  const contractMet = directionsCompletionContractSatisfied(runtime, goalsCompleted)
  const hooks = buildDirectionsRecapHookBundle({
    variation,
    contractMet,
    completedGoalLabels: goalsCompleted,
    missedGoalLabels: goalsMissed,
    runtime,
  })

  const languageNoteLines = hooks.coachingHooks.map((h) => `coaching_hook:${h}`)
  const languageNotes = dedupeAppend(summary.languageNotes, languageNoteLines)

  const whatWentWell = hooks.positive.length
    ? dedupeAppend(summary.whatWentWell, hooks.positive)
    : summary.whatWentWell ?? []
  const whatToImprove = hooks.improve.length
    ? dedupeAppend(summary.whatToImprove, hooks.improve)
    : summary.whatToImprove ?? []

  return {
    ...summary,
    goalsCompleted,
    goalsMissed,
    whatWentWell,
    whatToImprove,
    languageNotes,
  }
}
