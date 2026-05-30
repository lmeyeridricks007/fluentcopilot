import type { ConversationSummary } from '../../models/contracts'
import type { SpeakLivePersistedState } from './speakLiveFsm'

function normSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, '_')
}

/** User lines only — Dutch café ordering heuristics (conservative). */
export function inferOrderingFoodGoalLabelsFromUserText(scenarioGoals: string[], userMessageTexts: string[]): string[] {
  const blob = userMessageTexts.map((s) => s.trim()).filter(Boolean).join('\n').toLowerCase()
  if (!blob) return []

  const byLabel = new Map(scenarioGoals.map((g) => [g.toLowerCase(), g] as const))

  const hit = (labelFragment: string): string | undefined => {
    for (const g of scenarioGoals) {
      if (g.toLowerCase().includes(labelFragment)) return byLabel.get(g.toLowerCase())
    }
    return undefined
  }

  const found = new Set<string>()

  const hasItem =
    /(koffie|thee|espresso|cappuccino|latte|fris|sap|water|bier|wijn|brood|croissant|koek|ijs)/i.test(blob)
  const hasOrderCue =
    /(mag ik|ik wil|kan ik|graag|bestel|een portie|twee|een\s+(koffie|thee|sap|bier))/i.test(blob) ||
    /\b(een|twee)\s+(koffie|thee|cappuccino|latte)\b/i.test(blob)
  const specifiesDrink = /\b(met|zonder)\s+\S+/i.test(blob)
  if (hasItem && (hasOrderCue || specifiesDrink)) {
    const g = hit('clear order')
    if (g) found.add(g)
  }

  if (/(dank je|dank u|bedankt)/i.test(blob) || /(alstublieft|alsjeblieft)/i.test(blob)) {
    const g = hit('polite')
    if (g) found.add(g)
  }

  if (
    /(hoeveel|wat kost|wat kosten|prijs|kost het|euro|mag ik (de )?(bon|rekening)|betaal)/i.test(blob) ||
    (/\?/.test(blob) && /(hoeveel|wat|welke|mag dat)/i.test(blob))
  ) {
    const g = hit('follow-up')
    if (g) found.add(g)
  }

  if (
    /(met|zonder)\s+(melk|suiker|haver)/i.test(blob) ||
    /\bhavermelk\b/i.test(blob) ||
    /\b(soja|amandel)(melk)?\b/i.test(blob) ||
    /\b(volle|halfvol)(e)?\s+melk\b/i.test(blob) ||
    /\b(ijskoud|warm|groot|klein)\b/i.test(blob)
  ) {
    const g = hit('clarify') || hit('confirm')
    if (g) found.add(g)
  }

  return [...found]
}

/**
 * Train station has slot reconciliation; ordering food relied only on the recap LLM listing exact goal strings.
 * Merge FSM `goalsCompleted` indexes + light transcript inference so evaluation `taskOutcome` matches what happened.
 */
export function reconcileOrderingFoodLiveRecap(params: {
  summary: ConversationSummary
  scenarioSlug: string
  scenarioGoals: string[]
  slState: SpeakLivePersistedState | null | undefined
  userMessageTexts: string[]
}): ConversationSummary {
  if (normSlug(params.scenarioSlug) !== 'ordering_food') return params.summary

  const { summary, scenarioGoals, slState, userMessageTexts } = params
  const canonical = new Set(scenarioGoals.map((g) => g.toLowerCase()))

  const fromFsm = new Set<string>()
  for (const i of slState?.goalsCompleted ?? []) {
    if (typeof i !== 'number' || i < 0 || i >= scenarioGoals.length) continue
    fromFsm.add(scenarioGoals[i]!)
  }

  const inferred = inferOrderingFoodGoalLabelsFromUserText(scenarioGoals, userMessageTexts)

  const merged = new Set<string>()
  for (const g of summary.goalsCompleted ?? []) {
    if (typeof g !== 'string') continue
    if (canonical.has(g.toLowerCase())) merged.add(scenarioGoals.find((x) => x.toLowerCase() === g.toLowerCase()) ?? g)
  }
  for (const g of fromFsm) merged.add(g)
  for (const g of inferred) merged.add(g)

  const goalsCompleted = scenarioGoals.filter((g) => merged.has(g))
  const goalsMissed = scenarioGoals.filter((g) => !merged.has(g))

  return {
    ...summary,
    goalsCompleted,
    goalsMissed,
  }
}
