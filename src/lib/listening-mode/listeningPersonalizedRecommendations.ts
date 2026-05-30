/**
 * Personalized listening focus cards — ranks packs from profile stress, recent sessions,
 * practice weak signals, replay/transcript behavior, level, and variety.
 */
import { LISTENING_PACKS } from '@/lib/listening-mode/catalog'
import type { ListeningLearnerProfile } from '@/lib/listening-mode/listeningProfileStorage'
import { readListeningSessionRecord } from '@/lib/listening-mode/listeningSessionStorage'
import type { ListeningDrillType } from '@/lib/listening-mode/schema'
import type { ListeningProfileDimension } from '@/lib/listening-mode/listeningSkillModel'
import { loadLastPracticeWeakSignals } from '@/lib/weakness/lastPracticeSignalsStorage'
import type { ListeningLevel } from '@/lib/listening-mode/schema'

export type ListeningFocusRecommendationCard = {
  id: string
  /** Sort key — higher surfaces first. */
  rankScore: number
  title: string
  explanation: string
  packId: string
  /** For dedupe / analytics. */
  primaryDimensions: ListeningProfileDimension[]
  /** Anchor for “More detail”. */
  detailHref: string
}

export type ListeningRecommendationContext = {
  level: ListeningLevel
  profile: ListeningLearnerProfile
  /** Newest-first session ids (bounded). */
  recentSessionIds: string[]
  /** Aggregates from stored session records. */
  recentSignals: {
    wrongByDrill: Partial<Record<ListeningDrillType, number>>
    sessionsWithReplayHeavy: number
    sessionsWithTranscriptLean: number
    recentPackIds: string[]
  }
  /** Optional practice scenario weak tags (7d). */
  practiceWeakTags: string[]
}

const MAX_SESSIONS = 8
const DETAIL_HREF = '#listening-skill-focus'

type CandidateDef = {
  id: string
  packId: string
  title: string
  explanation: string
  /** Profile dimensions this card speaks to. */
  dimensions: ListeningProfileDimension[]
  /** Drill types in recent sessions that boost this card. */
  drillBoost: ListeningDrillType[]
  /** High-value / always-trainable weight. */
  lifeValue: number
}

const CANDIDATES: CandidateDef[] = [
  {
    id: 'fast_speech',
    packId: 'pack-shop-fast',
    title: 'Listening to fast Dutch is still weak',
    explanation: 'Shelf and counter lines compress — a two-minute burst retrains your ear without turning it into a test.',
    dimensions: ['fast_speech'],
    drillBoost: ['fast_dutch'],
    lifeValue: 0.14,
  },
  {
    id: 'route_place',
    packId: 'pack-train-platform',
    title: 'You are missing route details',
    explanation: 'Platforms, turns, and “where next” show up in motion — short travel listens reward repetition.',
    dimensions: ['route_place'],
    drillBoost: ['detail_catch', 'order_instruction', 'gist'],
    lifeValue: 0.16,
  },
  {
    id: 'service_replies',
    packId: 'pack-cafe-burst',
    title: 'Catch short service replies faster',
    explanation: 'Counter Dutch loves a tiny, warm reply — gist, a number, then the natural line back.',
    dimensions: ['natural_reply', 'response_readiness'],
    drillBoost: ['listen_respond', 'gist'],
    lifeValue: 0.15,
  },
  {
    id: 'numbers_times',
    packId: 'pack-cafe-burst',
    title: 'Times and quantities still flicker by',
    explanation: 'Prices and polite asks stack fast — café bursts keep numbers in context, not on a worksheet.',
    dimensions: ['numbers_times'],
    drillBoost: ['detail_catch', 'listen_respond'],
    lifeValue: 0.12,
  },
  {
    id: 'detail_accuracy',
    packId: 'pack-clinic-instructions',
    title: 'Specifics want one more honest pass',
    explanation: 'You catch the scene — instructions and timings reward a second focused listen.',
    dimensions: ['detail_accuracy'],
    drillBoost: ['detail_catch', 'order_instruction'],
    lifeValue: 0.11,
  },
  {
    id: 'gist_anchor',
    packId: 'pack-train-platform',
    title: 'Keep the main idea glued while Dutch speeds up',
    explanation: 'When lines lengthen, gist holds the map — platform bursts mix gist with a concrete detail.',
    dimensions: ['gist'],
    drillBoost: ['gist', 'replay_reveal'],
    lifeValue: 0.1,
  },
  {
    id: 'first_listen_honesty',
    packId: 'pack-booking-reveal',
    title: 'First listen, then support',
    explanation: 'Replay and text are fine as bridges — booking-style reps reward trusting your ear once, then checking.',
    dimensions: ['replay_dependence', 'transcript_dependence'],
    drillBoost: ['gist', 'replay_reveal'],
    lifeValue: 0.08,
  },
]

function effectiveStress(
  profile: ListeningLearnerProfile,
  practiceTagBoost: Partial<Record<ListeningProfileDimension, number>>,
): Record<ListeningProfileDimension, number> {
  const out = { ...profile.dimensionStress } as Record<ListeningProfileDimension, number>
  for (const d of Object.keys(out) as ListeningProfileDimension[]) {
    out[d] = (out[d] ?? 0) + (practiceTagBoost[d] ?? 0)
    out[d] = Math.min(1, out[d] ?? 0)
  }
  return out
}

/** Map last-practice weak tags → small bumps on listening dimensions (ranking only). */
export function practiceTagsToListeningBoost(tags: string[]): Partial<Record<ListeningProfileDimension, number>> {
  const t = tags.join(' ').toLowerCase()
  const bump: Partial<Record<ListeningProfileDimension, number>> = {}
  if (t.includes('listen') || t.includes('hear')) bump.gist = (bump.gist ?? 0) + 0.04
  if (t.includes('route') || t.includes('transport') || t.includes('platform') || t.includes('direction'))
    bump.route_place = (bump.route_place ?? 0) + 0.07
  if (t.includes('polite') || t.includes('order') || t.includes('request') || t.includes('service') || t.includes('cafe'))
    bump.natural_reply = (bump.natural_reply ?? 0) + 0.06
  if (t.includes('number') || t.includes('time') || t.includes('price') || t.includes('quantity'))
    bump.numbers_times = (bump.numbers_times ?? 0) + 0.06
  if (t.includes('fast') || t.includes('speed')) bump.fast_speech = (bump.fast_speech ?? 0) + 0.05
  return bump
}

export function aggregateRecentListeningSignals(sessionIds: string[]): ListeningRecommendationContext['recentSignals'] {
  const wrongByDrill: Partial<Record<ListeningDrillType, number>> = {}
  let sessionsWithReplayHeavy = 0
  let sessionsWithTranscriptLean = 0
  const recentPackIds: string[] = []
  const ids = sessionIds.slice(0, MAX_SESSIONS)

  for (const sid of ids) {
    const rec = readListeningSessionRecord(sid)
    if (!rec) continue
    recentPackIds.push(rec.packId)
    let replayHeavy = false
    let transcriptLean = false
    for (const a of rec.attempts) {
      wrongByDrill[a.drillType] = (wrongByDrill[a.drillType] ?? 0) + (a.correct ? 0 : 1)
      if (a.playsBeforeAnswer >= 3) replayHeavy = true
      if (a.transcriptPeekBeforeAnswer || (a.transcriptRevealed && !a.correct)) transcriptLean = true
    }
    if (replayHeavy) sessionsWithReplayHeavy += 1
    if (transcriptLean) sessionsWithTranscriptLean += 1
  }

  return { wrongByDrill, sessionsWithReplayHeavy, sessionsWithTranscriptLean, recentPackIds }
}

export function buildListeningRecommendationContext(
  profile: ListeningLearnerProfile,
  level: ListeningLevel,
): ListeningRecommendationContext {
  const practiceWeakTags =
    typeof window !== 'undefined' ? (loadLastPracticeWeakSignals()?.tags ?? []) : []
  const recentSessionIds = profile.sessionIds.slice(0, MAX_SESSIONS)
  const recentSignals = aggregateRecentListeningSignals(recentSessionIds)
  return {
    level,
    profile,
    recentSessionIds,
    recentSignals,
    practiceWeakTags,
  }
}

function repetitionPenalty(packId: string, recentPackIds: string[]): number {
  let pen = 0
  const last4 = recentPackIds.slice(0, 4)
  const c = last4.filter((p) => p === packId).length
  pen += c * 0.11
  if (recentPackIds[0] === packId) pen += 0.08
  return pen
}

function sessionDrillBoost(c: CandidateDef, wrongByDrill: Partial<Record<ListeningDrillType, number>>): number {
  let b = 0
  for (const dt of c.drillBoost) {
    b += Math.min(0.2, (wrongByDrill[dt] ?? 0) * 0.055)
  }
  return b
}

function replayTranscriptBoost(
  c: CandidateDef,
  sessionsWithReplayHeavy: number,
  sessionsWithTranscriptLean: number,
): number {
  let b = 0
  if (c.dimensions.includes('replay_dependence') && sessionsWithReplayHeavy >= 1) b += 0.07 * Math.min(3, sessionsWithReplayHeavy)
  if (c.dimensions.includes('transcript_dependence') && sessionsWithTranscriptLean >= 1) b += 0.07 * Math.min(3, sessionsWithTranscriptLean)
  return b
}

function scoreCandidate(
  c: CandidateDef,
  eff: Record<ListeningProfileDimension, number>,
  ctx: ListeningRecommendationContext,
): number {
  let s = c.lifeValue
  for (const d of c.dimensions) {
    s += (eff[d] ?? 0) * 0.95
  }
  s += sessionDrillBoost(c, ctx.recentSignals.wrongByDrill)
  s += replayTranscriptBoost(
    c,
    ctx.recentSignals.sessionsWithReplayHeavy,
    ctx.recentSignals.sessionsWithTranscriptLean,
  )
  s -= repetitionPenalty(c.packId, ctx.recentSignals.recentPackIds)
  return s
}

/**
 * Ranked focus cards (coach copy, not scores). Typically take top 2–3 for UI.
 */
export function buildListeningFocusRecommendationCards(ctx: ListeningRecommendationContext, limit = 3): ListeningFocusRecommendationCard[] {
  const tagBump = practiceTagsToListeningBoost(ctx.practiceWeakTags)
  const eff = effectiveStress(ctx.profile, tagBump)

  const scored = CANDIDATES.map((c) => ({
    c,
    score: scoreCandidate(c, eff, ctx),
  })).sort((a, b) => b.score - a.score)

  const seenPack = new Set<string>()
  const out: ListeningFocusRecommendationCard[] = []
  for (const { c, score } of scored) {
    if (out.length >= limit) break
    if (!LISTENING_PACKS.some((p) => p.id === c.packId)) continue
    if (seenPack.has(c.packId)) continue
    seenPack.add(c.packId)
    out.push({
      id: c.id,
      rankScore: score,
      title: c.title,
      explanation: c.explanation,
      packId: c.packId,
      primaryDimensions: [...c.dimensions],
      detailHref: DETAIL_HREF,
    })
  }

  while (out.length < limit && out.length < LISTENING_PACKS.length) {
    const p = LISTENING_PACKS.find((pack) => !out.some((o) => o.packId === pack.id))
    if (!p) break
    out.push({
      id: `variety_${p.id}`,
      rankScore: 0.15,
      title: p.title,
      explanation: p.subtitle,
      packId: p.id,
      primaryDimensions: ['gist'],
      detailHref: DETAIL_HREF,
    })
  }

  return out.slice(0, limit)
}
