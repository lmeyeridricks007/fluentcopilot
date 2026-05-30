import type { ConversationSummary } from '../../models/contracts'
import type { SpeakLivePersistedState } from './speakLiveFsm'

function normSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, '_')
}

export function inferDoctorPharmacyGoalLabelsFromUserText(
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

  if (/(hoofdpijn|keel|buik|koorts|hoest|misselijk|duizel|moe|allerg|pijn)/i.test(blob)) {
    addIf((gl) => gl.includes('symptoom') || gl.includes('probleem'), found)
    addIf((gl) => gl.includes('lichaamwoord') || gl.includes('lichaamwoorden'), found)
    addIf((gl) => gl.includes('tijd') || gl.includes('ernst'), found)
  }

  if (/(help|kunt u|alstublieft|medicijn|recept|afspraak|wat moet|advies)/i.test(blob)) {
    addIf((gl) => gl.includes('duidelijk om hulp'), found)
    addIf((gl) => gl.includes('soort hulp') || gl.includes('medicijn, afspraak'), found)
    addIf((gl) => gl.includes('symptoomcontext'), found)
  }

  if (/(twee keer|na het eten|tabletten|ochtend|avond|bevestig|dus |begrijp|verduidelijk)/i.test(blob)) {
    addIf((gl) => gl.includes('instructie') || gl.includes('hoeveelheid'), found)
    addIf((gl) => gl.includes('verduidelijk'), found)
  }

  if (/(dank|bedank|prima|oké|ja,)/i.test(blob)) {
    addIf((gl) => gl.includes('reageer natuurlijk') || gl.includes('bedank'), found)
  }

  if (/\?/.test(blob)) {
    addIf((gl) => gl.includes('verduidelijk'), found)
  }

  return [...found]
}

export function reconcileDoctorPharmacyLiveRecap(params: {
  summary: ConversationSummary
  scenarioSlug: string
  scenarioGoals: string[]
  slState: SpeakLivePersistedState | null | undefined
  userMessageTexts: string[]
}): ConversationSummary {
  if (normSlug(params.scenarioSlug) !== 'doctor_pharmacy') return params.summary

  const { summary, scenarioGoals, slState, userMessageTexts } = params
  const canonical = new Set(scenarioGoals.map((g) => g.toLowerCase()))

  const fromFsm = new Set<string>()
  for (const i of slState?.goalsCompleted ?? []) {
    if (typeof i !== 'number' || i < 0 || i >= scenarioGoals.length) continue
    fromFsm.add(scenarioGoals[i]!)
  }

  const inferred = inferDoctorPharmacyGoalLabelsFromUserText(scenarioGoals, userMessageTexts)

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
