/**
 * Merges a completed listening session into {@link UserLearningProfile}:
 * `listeningMemorySignals`, skill evidence (listening group), modality metadata, and derived recommendations.
 */
import { randomUUID } from 'node:crypto'
import type { ListeningAttempt } from '../listening/listeningAttempt'
import type { ListeningSession } from '../listening/listeningSession'
import { applyStandaloneSkillEvidence } from '../skills/skillProfileMerge'
import type { SkillEvidence, SkillId } from '../skills/skillTypes'
import { effectiveWeaknessItemScore } from './learningMemoryMergeScoring'
import {
  LISTENING_MEMORY_SIGNAL_LABELS,
  type ListeningMemorySignalId,
  type ListeningMemorySignalRow,
} from './listeningMemorySignalTypes'
import { recomputeDerivedAndRecommendations } from './learningMemoryRecommendationService'
import type { UserLearningProfile } from './userLearningProfileDocument'

const MAX_LISTENING_SIGNALS = 14

type SignalDelta = { severityInc: number; ref: string }

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function foldSignalDeltas(
  prev: ListeningMemorySignalRow[] | undefined,
  deltas: Map<ListeningMemorySignalId, SignalDelta[]>,
  nowIso: string,
): ListeningMemorySignalRow[] {
  const map = new Map<ListeningMemorySignalId, ListeningMemorySignalRow>()
  for (const r of prev ?? []) map.set(r.signalId, { ...r })

  for (const [id, bumps] of deltas) {
    const existing = map.get(id)
    let row: ListeningMemorySignalRow =
      existing ??
      ({
        signalId: id,
        label: LISTENING_MEMORY_SIGNAL_LABELS[id],
        severityScore: 0,
        confidence: 0.45,
        firstSeenAt: nowIso,
        lastSeenAt: nowIso,
        occurrences: 0,
        evidenceRefs: [],
        recoveryScore: 0.28,
      } satisfies ListeningMemorySignalRow)

    for (const b of bumps) {
      const sevInc = b.severityInc
      row = {
        ...row,
        lastSeenAt: nowIso,
        occurrences: row.occurrences + 1,
        severityScore: Math.min(3, row.severityScore * 0.86 + sevInc),
        confidence: Math.min(0.95, row.confidence * 0.9 + 0.052),
        evidenceRefs: [...row.evidenceRefs, b.ref].filter(Boolean).slice(-16),
      }
    }
    map.set(id, row)
  }

  return [...map.values()]
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .slice(0, MAX_LISTENING_SIGNALS)
}

function scenarioTail(scenarioId: string | null | undefined): string {
  return (scenarioId ?? '').toLowerCase()
}

function collectSignalDeltas(
  session: ListeningSession,
  attempts: ListeningAttempt[],
  sessionId: string,
): Map<ListeningMemorySignalId, SignalDelta[]> {
  const out = new Map<ListeningMemorySignalId, SignalDelta[]>()
  const push = (id: ListeningMemorySignalId, severityInc: number, ref: string) => {
    const arr = out.get(id) ?? []
    arr.push({ severityInc, ref })
    out.set(id, arr)
  }

  const scen = scenarioTail(session.scenarioId)

  for (const a of attempts) {
    const correct = a.evaluation?.correct === true
    const tags = (a.evaluation?.tags ?? []).join(' ').toLowerCase()
    const clip = a.clipId.toLowerCase()
    const gistOk = a.correctGist === true
    const detailWeak = a.correctDetails !== true
    const ref = `${sessionId}:${a.id}`

    if (gistOk && detailWeak) {
      push('gist_strong_detail_weak', 0.52, ref)
    }

    if (!correct) {
      if (/\d|\buur\b|\bmin\b|tijd|time|kwart|half|€|euro|prijs/i.test(`${tags} ${clip}`)) {
        push('often_misses_times', 0.54, ref)
      }
      if (
        (a.drillType === 'detail' || a.drillType === 'personalized_focus') &&
        /route|richting|exit|spoor|perron|direction|omleiding/i.test(`${tags} ${clip} ${scen}`)
      ) {
        push('weak_route_details', 0.5, ref)
      }
      if (a.replayCount >= 2) push('replay_before_answer', 0.44, ref)
      if (a.transcriptRevealed) push('transcript_reveal_dependent', 0.48, ref)
      if (a.drillType === 'fast_speech' && /train|station|metro|bus|ov|spoor|platform/i.test(`${scen} ${tags}`)) {
        push('fast_transport_replies_struggle', 0.56, ref)
      }
      if (
        (a.drillType === 'instruction' || a.drillType === 'listen_respond') &&
        /cafe|shop|market|super|winkel|store|service|kassa/i.test(scen)
      ) {
        push('misses_short_service_questions', 0.5, ref)
      }
    }
  }
  return out
}

function skillsForListeningAttempt(a: ListeningAttempt, scenarioId: string | null | undefined): SkillId[] {
  const scen = scenarioTail(scenarioId)
  const out: SkillId[] = []
  switch (a.drillType) {
    case 'gist':
      out.push('gist_understanding')
      break
    case 'detail':
      out.push('detail_recognition', 'numbers_and_times', 'quantities_and_items')
      break
    case 'instruction':
      out.push('instruction_following')
      break
    case 'listen_respond':
      out.push('response_readiness', 'service_replies')
      break
    case 'fast_speech':
      out.push('fast_speech_handling')
      break
    case 'replay_reveal':
      out.push('reduced_spoken_dutch')
      break
    case 'personalized_focus':
      out.push('speaker_variation')
      if (/direction|route|train|station|ov|metro|bus/.test(scen)) out.push('route_words')
      if (/shop|market|cafe|store|super|winkel|service/.test(scen)) {
        out.push('service_replies', 'quantities_and_items')
      }
      break
  }
  return [...new Set(out)].slice(0, 6)
}

function listeningAttemptsToSkillEvidence(params: {
  session: ListeningSession
  attempts: ListeningAttempt[]
  nowIso: string
  sessionTypeWeight: number
}): SkillEvidence[] {
  const { session, attempts, nowIso, sessionTypeWeight } = params
  const sid = session.id
  const w = sessionTypeWeight
  const out: SkillEvidence[] = []

  for (const a of attempts) {
    const correct = a.evaluation?.correct === true
    const polarity = correct ? 'positive' : 'negative'
    const baseMag = correct ? 0.32 : 0.48
    const replayAdj = !correct && a.replayCount >= 2 ? 0.06 : 0
    const magnitude = clamp01(baseMag + replayAdj)
    const skillIds = skillsForListeningAttempt(a, session.scenarioId)
    if (!skillIds.length) continue

    out.push({
      id: randomUUID(),
      sessionId: sid,
      at: nowIso,
      sessionType: 'listening',
      source: `listening_attempt:${a.drillType}`,
      polarity,
      magnitude,
      weight: w * (correct ? 0.82 : 0.94),
      skillIds,
      note: a.clipId,
    })

    if (!correct && a.transcriptRevealed) {
      out.push({
        id: randomUUID(),
        sessionId: sid,
        at: nowIso,
        sessionType: 'listening',
        source: 'listening_signal:transcript',
        polarity: 'negative',
        magnitude: 0.36,
        weight: w * 0.78,
        skillIds: (['filler_tolerance', 'gist_understanding'] as const).slice() as SkillId[],
        note: a.clipId,
      })
    }

    if (!correct && a.slowerReplayUsed) {
      out.push({
        id: randomUUID(),
        sessionId: sid,
        at: nowIso,
        sessionType: 'listening',
        source: 'listening_signal:slower_replay',
        polarity: 'negative',
        magnitude: 0.34,
        weight: w * 0.76,
        skillIds: (['reduced_spoken_dutch', 'fast_speech_handling'] as const).slice() as SkillId[],
        note: a.clipId,
      })
    }
  }

  return out
}

/**
 * Mutates `doc` — increments version / session counts, merges signals, applies skill evidence, refreshes recommendations.
 */
export function applyListeningSessionToUserLearningProfile(
  doc: UserLearningProfile,
  params: { session: ListeningSession; attempts: ListeningAttempt[]; nowIso: string; sessionTypeWeight?: number },
): void {
  const { session, attempts, nowIso } = params
  const w = params.sessionTypeWeight ?? 0.88

  const deltas = collectSignalDeltas(session, attempts, session.id)
  doc.listeningMemorySignals = foldSignalDeltas(doc.listeningMemorySignals, deltas, nowIso)

  const evidence = listeningAttemptsToSkillEvidence({ session, attempts, nowIso, sessionTypeWeight: w })
  if (evidence.length) {
    applyStandaloneSkillEvidence(doc, evidence, nowIso, w)
  }

  doc.updatedAt = nowIso
  doc.version = (doc.version ?? 0) + 1
  doc.totalSessionsObserved = (doc.totalSessionsObserved ?? 0) + 1
  doc.lastSessionModality = 'listening'

  if (session.scenarioId?.trim()) {
    const slug = session.scenarioId.trim()
    doc.recentScenarioSlugs = [...doc.recentScenarioSlugs.filter((s) => s !== slug), slug].slice(-24)
  }

  recomputeDerivedAndRecommendations(doc)
}
