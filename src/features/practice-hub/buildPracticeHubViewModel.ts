/**
 * Pure builder: Practice Hub view model from app data (testable, no React).
 */
import type { DemoScenario } from '@/demo-data/types'
import type { AbilityUnlock } from '@/lib/retention/types'
import type { Tier } from '@/features/entitlements/EntitlementContext'
import type { A2WeakTagCount } from '@/features/curriculum/a2ReviewStore'
import type { MistakeEvent } from '@/lib/schemas/mistakeEvent.schema'
import type { SkillTrackId } from '@/lib/schemas/practice/skillTrack.schema'
import type { WeaknessInsight } from '@/lib/schemas/practice/weaknessInsight.schema'
import type { WeaknessBuilderInput } from '@/lib/weakness/types'
import { buildWeaknessInsights } from '@/lib/weakness'
import {
  buildScenarioStreakVm,
  type MissionPresentationBundle,
} from '@/lib/missions/missionPresenterModel'
import { emptyMissionStateForSsr } from '@/lib/missions/missionAssigner'
import { WEAK_TAG_ROUTING, hubCategoryCards, skillTrackDefinitions } from './constants'
import type {
  ConfidenceSectionVm,
  ContinuePracticeItem,
  DailyMissionVm,
  PracticeHubViewModel,
  RecommendationVm,
  WeakAreaVm,
  WeakAreaActionVm,
} from './types'
import type { LastPracticeContinue } from './practiceHubStorage'
import { getPracticeScenarioHref } from '@/lib/practice/getPracticeScenarioHref'
import { APP_TALK_HUB } from '@/lib/routing/appRoutes'
import { NEXT_BEST_CTA } from '@/lib/dashboard/nextBestActionCtas'

function scenarioById(scenarios: DemoScenario[], id: string): DemoScenario | undefined {
  return scenarios.find((s) => s.id === id)
}

/** One line for recommendation cards when headline and coach would echo. */
function tightWeaknessRecommendationReason(headline: string, coachLine: string): string {
  const h = headline.trim()
  const c = coachLine.trim()
  if (!c) return h
  if (c === h) return h
  const hl = h.toLowerCase()
  const cl = c.toLowerCase()
  if (cl.startsWith(hl) && c.length >= h.length) return c
  if (hl.startsWith(cl) && h.length >= c.length) return h
  return `${h} — ${c}`
}

function mergeRecommendations(boost: RecommendationVm[], rest: RecommendationVm[], limit: number): RecommendationVm[] {
  const seen = new Set<string>()
  const out: RecommendationVm[] = []
  for (const r of [...boost, ...rest]) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    out.push(r)
    if (out.length >= limit) break
  }
  return out
}

function mapWeaknessInsightsToWeakAreas(insights: WeaknessInsight[]): WeakAreaVm[] {
  return insights.map((ins, i) => {
    const primary = ins.actions[0]
    const trend =
      ins.trend === 'needs_attention' ? ('down' as const) : ins.trend === 'improving' ? ('up' as const) : ('stable' as const)
    const actions: WeakAreaActionVm[] = ins.actions.map((a) => ({
      id: a.id,
      kind: a.kind,
      label: a.label,
      href: a.href,
      estimatedMinutes: a.estimatedMinutes,
    }))
    const scenarioTitles = ins.actions
      .filter((a) => a.kind === 'scenario')
      .map((a) => a.label.replace(/^Scenario · /, ''))
      .slice(0, 3)
    const seenInLabel =
      scenarioTitles.length > 0 ? `Seen in: ${scenarioTitles.join(', ')}` : undefined
    const trendProgressLabel =
      trend === 'up'
        ? 'Trending up from recent practice.'
        : trend === 'down'
          ? 'Still slipping — short, focused reps help most.'
          : 'Steady — one focused session usually unlocks progress.'
    const headlineNorm = ins.headline.trim().toLowerCase()
    const primaryShort = primary?.label.replace(/^(Scenario|Skill track|Review) · /, '').trim()
    const primaryShortNorm = primaryShort.toLowerCase()
    const hintEchoesHeadline =
      primaryShort.length > 0 &&
      (primaryShortNorm === headlineNorm ||
        headlineNorm.includes(primaryShortNorm) ||
        primaryShortNorm.includes(headlineNorm))
    const bestNextHint =
      primary && !hintEchoesHeadline
        ? `Best next: ${primaryShort}${
            primary.estimatedMinutes != null ? ` · ~${primary.estimatedMinutes} min` : ''
          }`
        : undefined
    const ctaLabel =
      primary?.kind === 'scenario' || primary?.kind === 'skill_track'
        ? NEXT_BEST_CTA.practiceNow
        : primary?.kind === 'review'
          ? 'Quick review'
          : NEXT_BEST_CTA.openPractice
    return {
      id: `weakness-${ins.categoryId}-${i}`,
      label: ins.headline,
      headline: ins.headline,
      whyItMatters: ins.coachLine,
      basedOn: ins.basedOn,
      ctaLabel,
      href: primary?.href ?? APP_TALK_HUB,
      trend,
      trendProgressLabel,
      seenInLabel,
      bestNextHint,
      actions,
    }
  })
}

function mapWeaknessInsightsToRecommendations(insights: WeaknessInsight[]): RecommendationVm[] {
  const out: RecommendationVm[] = []
  for (const ins of insights.slice(0, 2)) {
    const sc = ins.actions.find((a) => a.kind === 'scenario')
    const tr = ins.actions.find((a) => a.kind === 'skill_track')
    if (sc) {
      const scenarioId = sc.id.replace(/^wa-sc-/, '')
      out.push({
        id: `wrec-sc-${ins.categoryId}`,
        scenarioId,
        title: sc.label.replace(/^Scenario · /, ''),
        reason: tightWeaknessRecommendationReason(ins.headline, ins.coachLine),
        level: 'Targeted',
        mode: 'semi_guided',
        estimatedMinutes: sc.estimatedMinutes ?? 7,
        href: sc.href,
        practiceKind: 'scenario',
      })
    }
    if (tr && out.length < 2) {
      const tid = tr.id.replace(/^wa-tr-/, '') as SkillTrackId
      const mode =
        tid === 'listening_confidence'
          ? 'listening_focus'
          : tid === 'speaking_fluency'
            ? 'speaking_focus'
            : 'semi_guided'
      out.push({
        id: `wrec-tr-${ins.categoryId}`,
        scenarioId: tid,
        title: tr.label.replace(/^Skill track · /, ''),
        reason: 'Shorter reps while this pattern settles — less pressure than a full scenario.',
        level: 'Micro-drill',
        mode,
        estimatedMinutes: tr.estimatedMinutes ?? 4,
        href: tr.href,
        practiceKind: 'skill_track',
      })
    }
  }
  return out
}

function lastActiveLabelFromIso(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return 'Recently'
  const d = new Date(t)
  const now = new Date()
  const z = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((z(now) - z(d)) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function continueFromLast(
  last: LastPracticeContinue | null,
  scenarios: DemoScenario[]
): ContinuePracticeItem | null {
  if (!last) return null
  const sc = scenarioById(scenarios, last.scenarioId)
  if (!sc) return null
  return {
    scenarioId: last.scenarioId,
    title: sc.title,
    summary: last.title === sc.title ? sc.description : `${sc.title} · ${last.title}`,
    mode: last.mode,
    estimatedMinutes: 6,
    href: getPracticeScenarioHref(last.scenarioId),
    lastActiveLabel: lastActiveLabelFromIso(last.updatedAt),
  }
}

function recommendationsFromSignals(input: {
  scenarios: DemoScenario[]
  weakTags: A2WeakTagCount[]
  completedLessonIds: string[]
}): RecommendationVm[] {
  const { scenarios, weakTags, completedLessonIds } = input
  const out: RecommendationVm[] = []
  const used = new Set<string>()

  const push = (r: RecommendationVm) => {
    if (used.has(r.id)) return
    used.add(r.id)
    out.push(r)
  }

  if (weakTags.length > 0) {
    const top = [...weakTags].sort((a, b) => b.wrongCount - a.wrongCount)[0]!
    const route = WEAK_TAG_ROUTING.find((w) => w.match(top.tag)) ?? WEAK_TAG_ROUTING[WEAK_TAG_ROUTING.length - 1]!
    const sc = scenarioById(scenarios, route.scenarioId)
    if (/listen|gist|audio|hear/i.test(top.tag)) {
      push({
        id: `rec-skill-${top.tag}`,
        scenarioId: 'listening_confidence',
        title: 'Listening confidence',
        reason: `${route.label} — short clips build gist and detail without a full scenario.`,
        level: 'Micro-drill',
        mode: 'listening_focus',
        estimatedMinutes: 4,
        href: '/app/practice/tracks/listening_confidence',
        practiceKind: 'skill_track',
      })
    }
    if (/grammar|word-order|writing|spell/i.test(top.tag)) {
      push({
        id: `rec-skill-write-${top.tag}`,
        scenarioId: 'writing_messages',
        title: 'Writing simple messages',
        reason: 'Tight lines for real inboxes — reinforces tone and word order.',
        level: 'Micro-drill',
        mode: 'semi_guided',
        estimatedMinutes: 4,
        href: '/app/practice/tracks/writing_messages',
        practiceKind: 'skill_track',
      })
    }
    if (sc) {
      push({
        id: `rec-weak-${top.tag}`,
        scenarioId: sc.id,
        title: sc.title,
        reason: `${route.label} — patterns from your practice need a few focused reps.`,
        level: sc.level,
        mode: 'semi_guided',
        estimatedMinutes: 8,
        href: getPracticeScenarioHref(sc.id),
      })
    }
  }

  if (completedLessonIds.length >= 3) {
    const work = scenarioById(scenarios, 'work')
    if (work) {
      push({
        id: 'rec-work-module',
        scenarioId: work.id,
        title: work.title,
        reason: 'You’re moving through lessons — try a short work-style scenario.',
        level: work.level,
        mode: 'guided',
        estimatedMinutes: 10,
        href: getPracticeScenarioHref(work.id),
        premium: false,
      })
    }
  }

  const doctor = scenarioById(scenarios, 'doctor')
  if (doctor && !used.has('rec-doctor-health')) {
    push({
      id: 'rec-doctor-health',
      scenarioId: doctor.id,
      title: doctor.title,
      reason: 'Health Dutch is high value for daily life in the Netherlands.',
      level: doctor.level,
      mode: 'guided',
      estimatedMinutes: 8,
      href: getPracticeScenarioHref(doctor.id),
    })
  }

  const municipality = scenarioById(scenarios, 'municipality')
  if (municipality) {
    push({
      id: 'rec-gemeente',
      scenarioId: municipality.id,
      title: municipality.title,
      reason: 'Admin Dutch builds independence — short, structured practice.',
      level: municipality.level,
      mode: 'guided',
      estimatedMinutes: 9,
      href: getPracticeScenarioHref(municipality.id),
    })
  }

  const cafe = scenarioById(scenarios, 'cafe')
  if (cafe && out.length < 4) {
    push({
      id: 'rec-cafe-starter',
      scenarioId: cafe.id,
      title: cafe.title,
      reason: 'Quick win: polite ordering in a low-pressure setting.',
      level: cafe.level,
      mode: 'guided',
      estimatedMinutes: 5,
      href: getPracticeScenarioHref(cafe.id),
    })
  }

  return out.slice(0, 4)
}

function fallbackDailyMissionVm(atScenarioCap: boolean): DailyMissionVm {
  return {
    id: 'mission-daily-guided-fallback',
    scopeLabel: 'Today',
    title: 'One quick scenario today',
    description: 'A quick guided rep to keep your Dutch moving — low pressure.',
    progressCurrent: 0,
    progressTarget: 1,
    xpReward: 25,
    countsForStreak: true,
    ctaLabel: atScenarioCap ? 'See plans' : 'Start now',
    href: atScenarioCap ? '/app/premium' : '/app/practice/scenarios?mode=guided',
  }
}

function weakAreasVm(weakTags: A2WeakTagCount[], scenarios: DemoScenario[]): WeakAreaVm[] {
  if (weakTags.length === 0) return []
  const sorted = [...weakTags].sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 3)
  return sorted.map((w, i) => {
    const route = WEAK_TAG_ROUTING.find((r) => r.match(w.tag)) ?? WEAK_TAG_ROUTING[WEAK_TAG_ROUTING.length - 1]!
    const sc = scenarioById(scenarios, route.scenarioId)
    const trackHref = route.skillTrackPrimaryId
      ? `/app/practice/tracks/${encodeURIComponent(route.skillTrackPrimaryId)}`
      : null
    return {
      id: `weak-${w.tag}-${i}`,
      label: route.label,
      whyItMatters: route.why,
      ctaLabel: NEXT_BEST_CTA.practiceNow,
      href: trackHref ?? (sc ? getPracticeScenarioHref(sc.id) : '/app/practice/scenarios?weak=1'),
      trend: w.wrongCount >= 3 ? ('down' as const) : ('stable' as const),
    }
  })
}

function confidenceSection(
  abilities: AbilityUnlock[],
  weakTags: A2WeakTagCount[]
): ConfidenceSectionVm {
  const strengths: ConfidenceSectionVm['strengths'] = abilities.slice(-3).map((a) => ({
    label: a.headline,
  }))
  if (strengths.length === 0) {
    strengths.push(
      { label: 'Showing up to practice' },
      { label: 'Building a learning habit' }
    )
  }

  const gaps: ConfidenceSectionVm['gaps'] = []
  if (weakTags.length > 0) {
    gaps.push({ label: 'Patterns from recent mistakes' })
  }
  gaps.push(
    { label: 'Understanding faster Dutch in noise' },
    { label: 'Free speaking without script' },
    { label: 'Longer admin conversations' }
  )

  return {
    headline: 'A2 mastery & confidence',
    subline:
      weakTags.length === 0
        ? 'You’re in a great spot to push toward B1-style tasks — add breadth with scenarios.'
        : 'Keep mixing lessons, review, and scenarios — confidence grows from real use.',
    strengths: strengths.slice(0, 4),
    gaps: gaps.slice(0, 4),
    ctaLabel: 'How readiness works',
    ctaHref: '/app/progress',
  }
}

export function buildPracticeHubViewModel(input: {
  scenarios: DemoScenario[]
  lastContinue: LastPracticeContinue | null
  weakTags: A2WeakTagCount[]
  mistakeEvents: MistakeEvent[]
  lastPracticeWeak: {
    tags: string[]
    scenarioId: string
    recordedAt: string
    outcome?: 'success' | 'partial' | 'needs_practice'
  } | null
  skillTrackWeakestById: Partial<Record<SkillTrackId, number>>
  masterySkills?: Partial<Record<'listening' | 'speaking' | 'reading' | 'writing', number>>
  completedLessonIds: string[]
  abilities: AbilityUnlock[]
  tier: Tier
  atScenarioCap: boolean
  streak: number
  totalXp: number
  /** When set, skips recomputing weakness insights (caller already built for missions). */
  weaknessInsights?: WeaknessInsight[]
  /** Null before client hydration loads persisted mission progress. */
  missionPresentation: MissionPresentationBundle | null
  /** Passed through when insights are built here (SSR / tests). Client hook pre-builds insights instead. */
  listeningBurstRelief?: WeaknessBuilderInput['listeningBurstRelief']
}): PracticeHubViewModel {
  const {
    scenarios,
    lastContinue,
    weakTags,
    mistakeEvents,
    lastPracticeWeak,
    skillTrackWeakestById,
    masterySkills,
    completedLessonIds,
    abilities,
    tier,
    atScenarioCap,
    streak,
    totalXp,
    weaknessInsights: weaknessInsightsInput,
    missionPresentation: missionPresentationInput,
    listeningBurstRelief,
  } = input

  const missionPresentation: MissionPresentationBundle =
    missionPresentationInput ??
    ({
      daily: null,
      weekly: null,
      skillFocus: null,
      scenarioStreak: buildScenarioStreakVm(emptyMissionStateForSsr('_')),
    } satisfies MissionPresentationBundle)

  const weaknessInsights =
    weaknessInsightsInput ??
    buildWeaknessInsights({
      scenarios,
      weakTags,
      mistakeEvents,
      lastPractice: lastPracticeWeak,
      skillTrackWeakestById,
      masterySkills,
      listeningBurstRelief: listeningBurstRelief ?? null,
    })

  const weaknessBoost = mapWeaknessInsightsToRecommendations(weaknessInsights)
  const recommendations = mergeRecommendations(
    weaknessBoost,
    recommendationsFromSignals({
      scenarios,
      weakTags,
      completedLessonIds,
    }),
    4
  )

  const continueItem = continueFromLast(lastContinue, scenarios)

  const fallbackPrimary: ContinuePracticeItem | null =
    continueItem ??
    (recommendations[0]
      ? {
          scenarioId: recommendations[0].scenarioId,
          title: recommendations[0].title,
          summary: recommendations[0].reason,
          mode: recommendations[0].mode,
          estimatedMinutes: recommendations[0].estimatedMinutes,
          href: recommendations[0].href,
          premiumDepth: recommendations[0].premium,
        }
      : null)

  const categories = hubCategoryCards()

  const dailyMission: DailyMissionVm =
    missionPresentation.daily ?? fallbackDailyMissionVm(atScenarioCap)

  const streakSnapshot = { streak, totalXp }

  const weakAreas =
    weaknessInsights.length > 0 ? mapWeaknessInsightsToWeakAreas(weaknessInsights) : weakAreasVm(weakTags, scenarios)

  const weaknessCoachHint =
    weaknessInsights.length > 0
      ? {
          headline: weaknessInsights[0].headline,
          subline: weaknessInsights[0].coachLine,
          href: weaknessInsights[0].actions[0]?.href ?? APP_TALK_HUB,
          ctaLabel: weaknessInsights[0].actions[0]?.label ?? 'Start',
        }
      : null

  return {
    continueItem,
    fallbackPrimary,
    dailyMission,
    weeklyMission: missionPresentation.weekly,
    skillFocusMission: missionPresentation.skillFocus,
    scenarioStreak: missionPresentation.scenarioStreak,
    weaknessCoachHint,
    recommendations,
    weakAreas,
    categories,
    skillTracks: skillTrackDefinitions(),
    confidence: confidenceSection(abilities, weakTags),
    streakSnapshot,
    tierLabel: tier === 'premium' ? 'Premium' : tier === 'trial' ? 'Trial' : 'Free',
    atScenarioCap,
  }
}
