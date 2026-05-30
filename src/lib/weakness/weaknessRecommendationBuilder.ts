import type {
  WeaknessAction,
  WeaknessInsight,
  WeaknessTrend,
} from '@/lib/schemas/practice/weaknessInsight.schema'
import { getWeaknessCategoryById } from '@/lib/weakness/weaknessCategoryCatalog'
import { analyzeWeaknessSignals } from '@/lib/weakness/weaknessAnalyzer'
import { aggregateWeaknessCategories } from '@/lib/weakness/weaknessAggregator'
import { rankWeaknessCategories } from '@/lib/weakness/weaknessRanker'
import { resolveScenarioTargets } from '@/lib/weakness/weaknessToScenarioMapper'
import { skillTrackActionForCategory } from '@/lib/weakness/weaknessToSkillTrackMapper'
import { reviewActionForCategory } from '@/lib/weakness/weaknessToReviewMapper'
import type { CategoryScore, WeaknessBuilderInput } from '@/lib/weakness/types'
import { getPracticeScenarioHref } from '@/lib/practice/getPracticeScenarioHref'

/** Pull `listening_fast` off the board when recent listening bursts show no rising fast-speech stress. */
function applyListeningBurstRelief(
  scores: Map<string, CategoryScore>,
  relief: WeaknessBuilderInput['listeningBurstRelief'],
): Map<string, CategoryScore> {
  if (!relief || relief.sessionCount < 1) return scores
  const row = scores.get('listening_fast')
  if (!row) return scores
  const stress = relief.fastSpeechStress
  let delta = 0
  if (relief.sessionCount >= 1 && stress <= 0.36) delta += 0.9
  if (relief.sessionCount >= 2 && stress <= 0.37) delta += 1.6
  if (relief.sessionCount >= 4 && stress <= 0.37) delta += 2.2
  if (relief.sessionCount >= 3 && stress < 0.34) delta += 0.8
  if (delta <= 0) return scores
  const next = Math.max(0, row.score - delta)
  if (next < 0.45) scores.delete('listening_fast')
  else scores.set('listening_fast', { ...row, score: next, matchedSignals: row.matchedSignals })
  return scores
}

function headlineFor(def: ReturnType<typeof getWeaknessCategoryById>, categoryId: string): string {
  if (!def?.headlines.length) return 'A focused practice area'
  let h = 0
  for (let i = 0; i < categoryId.length; i++) h += categoryId.charCodeAt(i)
  return def.headlines[h % def.headlines.length]!
}

function basedOnLine(sources: Set<string>): string {
  const parts: string[] = []
  if (sources.has('mistake_event')) parts.push('recent mistakes')
  if (sources.has('weak_tag')) parts.push('lesson self-checks')
  if (sources.has('last_practice')) parts.push('your last scenario')
  if (sources.has('skill_track_band')) parts.push('skill track scores')
  if (sources.has('mastery_skill')) parts.push('skill snapshot')
  return parts.length ? `Grounded in ${parts.join(', ')}.` : 'Grounded in your recent Dutch practice.'
}

function trendFromScore(score: number): WeaknessTrend {
  if (score >= 5.5) return 'needs_attention'
  if (score <= 2.4) return 'improving'
  return 'stable'
}

function buildActionsForCategory(
  categoryId: string,
  scenarios: WeaknessBuilderInput['scenarios']
): WeaknessAction[] {
  const def = getWeaknessCategoryById(categoryId)
  if (!def) return []
  const actions: WeaknessAction[] = []
  const scenarioList = resolveScenarioTargets(def, scenarios)
  const primary = scenarioList[0]
  if (primary) {
    actions.push({
      id: `wa-sc-${primary.id}`,
      kind: 'scenario',
      label: `Scenario · ${primary.title}`,
      href: getPracticeScenarioHref(primary.id),
      estimatedMinutes: 7,
    })
  }
  const track = skillTrackActionForCategory(def)
  if (track && actions.length < 2) {
    actions.push({
      id: `wa-tr-${track.id}`,
      kind: 'skill_track',
      label: `Skill track · ${track.label}`,
      href: track.href,
      estimatedMinutes: 4,
    })
  }
  if (actions.length < 2) {
    const rev = reviewActionForCategory(def)
    actions.push({
      id: `wa-rv-${categoryId}`,
      kind: 'review',
      label: rev.label,
      href: rev.href,
      estimatedMinutes: 3,
    })
  }
  return actions.slice(0, 2)
}

export function buildWeaknessInsights(input: WeaknessBuilderInput): WeaknessInsight[] {
  const signals = analyzeWeaknessSignals({
    mistakeEvents: input.mistakeEvents,
    weakTags: input.weakTags,
    lastPractice: input.lastPractice,
    skillTrackWeakestById: input.skillTrackWeakestById,
    masterySkills: input.masterySkills,
  })
  let agg = aggregateWeaknessCategories(signals)
  agg = applyListeningBurstRelief(agg, input.listeningBurstRelief ?? null)
  const ranked = rankWeaknessCategories(agg)
  const out: WeaknessInsight[] = []

  for (const row of ranked) {
    const def = getWeaknessCategoryById(row.categoryId)
    if (!def) continue
    const sources = new Set(row.matchedSignals.map((s) => s.source))
    const actions = buildActionsForCategory(row.categoryId, input.scenarios).map((a) => ({
      id: a.id,
      kind: a.kind,
      label: a.label,
      href: a.href,
      estimatedMinutes: a.estimatedMinutes,
    }))
    if (actions.length === 0) continue

    out.push({
      categoryId: row.categoryId,
      headline: headlineFor(def, row.categoryId),
      coachLine: def.coachLine,
      trend: trendFromScore(row.score),
      basedOn: basedOnLine(sources),
      score: Math.round(row.score * 10) / 10,
      actions,
      sourceTags: [...new Set(row.matchedSignals.map((s) => s.tagBlob.split(/\s+/).slice(0, 3).join(' ')))].slice(
        0,
        4
      ),
    })
  }

  return out
}
