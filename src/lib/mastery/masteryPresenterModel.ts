import { ABILITY_DEFINITIONS, getAbilityDefinition } from '@/lib/mastery/abilityRegistry'
import {
  buildAbilityNextPractice,
  secondaryAbilityPractice,
  type AbilityNextPracticeVm,
} from '@/lib/mastery/abilityRecommendationBuilder'
import { computeAbilityDisplayScore, scoreToMasteryBand } from '@/lib/mastery/abilityScorer'
import { computeAbilityTrendUi } from '@/lib/mastery/abilityTrendCalculator'
import { loadAbilityMasteryState } from '@/lib/mastery/abilityMasteryStorage'
import type { AbilityMapGroupId, MasteryMapBuildInput } from '@/lib/mastery/types'
import type { DemoScenario } from '@/demo-data/types'
import type { AbilityMasteryBand, AbilityConfidenceTrendUi } from '@/lib/schemas/practice/abilityMasteryState.schema'
import { getPracticeScenarioHref } from '@/lib/practice/getPracticeScenarioHref'

const GROUP_ORDER: AbilityMapGroupId[] = [
  'daily_life',
  'work',
  'health',
  'admin',
  'social',
  'recovery',
  'other',
]

export const ABILITY_MAP_GROUP_LABEL: Record<AbilityMapGroupId, string> = {
  daily_life: 'Daily life',
  work: 'Work',
  health: 'Health',
  admin: 'Administration',
  social: 'Social',
  recovery: 'Recovery & fixes',
  other: 'Other',
}

function bandCopy(b: AbilityMasteryBand): string {
  if (b === 'weak') return 'Weak'
  if (b === 'improving') return 'Improving'
  return 'Strong'
}

function trendCopy(t: AbilityConfidenceTrendUi): string {
  if (t === 'improving') return 'Trend: improving'
  if (t === 'slipping') return 'Trend: needs a tune-up'
  if (t === 'needs_refresh') return 'Trend: time for a refresh'
  return 'Trend: steady'
}

function formatLastPracticed(iso: string | null | undefined): string | null {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'Last practiced today'
  if (days === 1) return 'Last practiced yesterday'
  if (days < 7) return `Last practiced ${days} days ago`
  if (days < 30) return `Last practiced ${Math.floor(days / 7)} weeks ago`
  return 'Last practiced a while ago'
}

export type AbilityCardVm = {
  id: string
  title: string
  description: string
  mapGroup: AbilityMapGroupId
  band: AbilityMasteryBand
  bandLabel: string
  trend: AbilityConfidenceTrendUi
  trendLabel: string
  displayScore: number
  nextPractice: AbilityNextPracticeVm
  secondaryPractice: AbilityNextPracticeVm | null
  lastPracticedLabel: string | null
  weaknessNote: string | null
}

export type MasteryMapViewModel = {
  groups: { id: AbilityMapGroupId; label: string; abilities: AbilityCardVm[] }[]
  readiness: { title: string; body: string }
}

function scenarioTitleMap(scenarios: DemoScenario[]): Map<string, string> {
  return new Map(scenarios.map((s) => [s.id, s.title]))
}

export function buildMasteryMapViewModel(
  input: MasteryMapBuildInput & { scenarios: DemoScenario[] }
): MasteryMapViewModel {
  const state = loadAbilityMasteryState(input.userId)
  const weaknessSet = new Set(input.topWeaknessCategoryIds)

  const cards: AbilityCardVm[] = ABILITY_DEFINITIONS.map((def) => {
    const snap = state.byAbility[def.id]
    const displayScore = computeAbilityDisplayScore({
      def,
      snap,
      ledgerScenarioRefs: input.practiceScenarioLedgerRefs,
      topWeaknessCategoryIds: weaknessSet,
      skillTrackWeakestById: input.skillTrackWeakestById,
    })
    const band = scoreToMasteryBand(displayScore)
    const trend = computeAbilityTrendUi({
      scoreHistory: snap?.scoreHistory,
      lastPracticedAt: snap?.lastPracticedAt ?? null,
      displayScore,
    })
    const nextPractice = buildAbilityNextPractice({ def, band, trend })
    const secondary = secondaryAbilityPractice(def)
    const weaknessHit = def.weaknessCategoryIds.some((w) => weaknessSet.has(w))

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      mapGroup: def.mapGroup,
      band,
      bandLabel: bandCopy(band),
      trend,
      trendLabel: trendCopy(trend),
      displayScore,
      nextPractice,
      secondaryPractice:
        secondary && secondary.href !== nextPractice.href ? secondary : null,
      lastPracticedLabel: formatLastPracticed(snap?.lastPracticedAt ?? null),
      weaknessNote: weaknessHit
        ? 'A current focus area overlaps here — extra reps will feel worth it.'
        : null,
    }
  })

  const byGroup = new Map<AbilityMapGroupId, AbilityCardVm[]>()
  for (const g of GROUP_ORDER) byGroup.set(g, [])
  for (const c of cards) {
    const list = byGroup.get(c.mapGroup) ?? byGroup.get('other')!
    list.push(c)
  }

  const groups = GROUP_ORDER.filter((g) => (byGroup.get(g) ?? []).length > 0).map((g) => ({
    id: g,
    label: ABILITY_MAP_GROUP_LABEL[g],
    abilities: (byGroup.get(g) ?? []).sort((a, b) => b.displayScore - a.displayScore),
  }))

  const weakN = cards.filter((c) => c.band === 'weak').length
  const strongN = cards.filter((c) => c.band === 'strong').length

  const readiness =
    weakN >= 4
      ? {
          title: 'A2 confidence builder',
          body: 'You’re not “between levels” — you’re mapping real-life Dutch. Strengthen a few abilities, then B1 will feel lighter.',
        }
      : strongN >= 6
        ? {
            title: 'Solid real-life coverage',
            body: 'Many situations already feel workable. Push free-mode scenarios where you’re strong, and refresh older wins with short review.',
          }
        : {
            title: 'Your practical Dutch map',
            body: 'Each card is something you can do in the wild — not a grammar score. Practice what matters for your week ahead.',
          }

  return { groups, readiness }
}

export type AbilityDetailVm = {
  def: NonNullable<ReturnType<typeof getAbilityDefinition>>
  card: AbilityCardVm
  scenarios: Array<{ id: string; title: string; href: string }>
  skillTracks: Array<{ id: string; href: string; label: string }>
}

const TRACK_LABEL: Record<string, string> = {
  listening_confidence: 'Listening confidence',
  speaking_fluency: 'Speaking fluency',
  reading_real_life: 'Reading in real life',
  writing_messages: 'Writing simple messages',
  conversation_repair: 'Reaction speed & repair',
}

export function buildAbilityDetailViewModel(
  abilityId: string,
  input: MasteryMapBuildInput & { scenarios: DemoScenario[] }
): AbilityDetailVm | null {
  const def = getAbilityDefinition(abilityId)
  if (!def) return null
  const map = buildMasteryMapViewModel(input)
  const card = map.groups.flatMap((g) => g.abilities).find((a) => a.id === abilityId)
  if (!card) return null
  const titles = scenarioTitleMap(input.scenarios)
  const scenarios = def.scenarioIds.map((id) => ({
    id,
    title: titles.get(id) ?? id,
    href: getPracticeScenarioHref(id),
  }))
  const skillTracks = def.skillTrackIds.map((id) => ({
    id,
    href: `/app/practice/tracks/${encodeURIComponent(id)}`,
    label: TRACK_LABEL[id] ?? id,
  }))
  return { def, card, scenarios, skillTracks }
}
