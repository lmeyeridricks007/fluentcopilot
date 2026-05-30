import type { ConversationSummary } from '../../models/contracts'
import type { SpeakLivePersistedState } from './speakLiveFsm'

function normSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, '_')
}

export function inferSupermarketShopGoalLabelsFromUserText(
  scenarioGoals: string[],
  userMessageTexts: string[]
): string[] {
  const blob = userMessageTexts.map((s) => s.trim()).filter(Boolean).join('\n').toLowerCase()
  if (!blob) return []

  const addIf = (pred: (g: string) => boolean, found: Set<string>) => {
    for (const g of scenarioGoals) {
      if (pred(g.toLowerCase())) found.add(g)
    }
  }

  const found = new Set<string>()

  if (/(waar is|waar ligt|waar vind|waar kan ik|gangpad|schap|links|rechts|achterin)/i.test(blob)) {
    addIf((gl) => gl.includes('waar') && gl.includes('product'), found)
    addIf((gl) => gl.includes('locatie') || gl.includes('gangpad') || gl.includes('schap'), found)
  }

  if (/(dank|bedank|alstublieft|alsjeblieft|mag ik)/i.test(blob)) {
    addIf((gl) => gl.includes('beleefd') || gl.includes('beleef'), found)
  }

  if (/(pin|pinnen|contactloos|bon|tasje|totaal|euro|betaal|kassa)/i.test(blob)) {
    addIf((gl) => gl.includes('kassa') || gl.includes('betaalwijze') || gl.includes('transactie'), found)
    addIf((gl) => gl.includes('tas') || gl.includes('bon'), found)
    addIf((gl) => gl.includes('natuurlijke transactie'), found)
    addIf((gl) => gl.includes('beleefd af'), found)
  }

  if (/(hoeveel|kost|prijs|goedkoper|groter|zonder suiker|vegetarisch|lactose|variant|inhoud)/i.test(blob)) {
    addIf((gl) => gl.includes('product') || gl.includes('prijs') || gl.includes('vergelijk'), found)
    addIf((gl) => gl.includes('woordenschat') || gl.includes('woorden'), found)
    addIf((gl) => gl.includes('verduidelijk'), found)
  }

  if (/\?/.test(blob) && /(welke|hoe|is dat|bedoelt u)/i.test(blob)) {
    addIf((gl) => gl.includes('vervolg') || gl.includes('verduidelijk'), found)
  }

  return [...found]
}

export function reconcileSupermarketShopLiveRecap(params: {
  summary: ConversationSummary
  scenarioSlug: string
  scenarioGoals: string[]
  slState: SpeakLivePersistedState | null | undefined
  userMessageTexts: string[]
}): ConversationSummary {
  if (normSlug(params.scenarioSlug) !== 'supermarket_shop') return params.summary

  const { summary, scenarioGoals, slState, userMessageTexts } = params
  const canonical = new Set(scenarioGoals.map((g) => g.toLowerCase()))

  const fromFsm = new Set<string>()
  for (const i of slState?.goalsCompleted ?? []) {
    if (typeof i !== 'number' || i < 0 || i >= scenarioGoals.length) continue
    fromFsm.add(scenarioGoals[i]!)
  }

  const inferred = inferSupermarketShopGoalLabelsFromUserText(scenarioGoals, userMessageTexts)

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
