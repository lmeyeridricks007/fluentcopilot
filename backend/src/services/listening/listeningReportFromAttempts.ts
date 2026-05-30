import type { ListeningAttempt } from '../../domain/listening/listeningAttempt'
import type { ListeningClip } from '../../domain/listening/listeningClip'
import type {
  ListeningDimensionScores,
  ListeningReport,
  ListeningReportMissedDetail,
  ListeningReportWeakArea,
  ListeningRecommendedNext,
  ListeningRelatedPracticeLoop,
} from '../../domain/listening/listeningReport'
import type { ListeningSession } from '../../domain/listening/listeningSession'
import { getCatalogClipByKey, getListeningTrackById } from '../../domain/listening/listeningTrackCatalog'

function ratioCorrect(attempts: ListeningAttempt[]): number {
  if (!attempts.length) return 0
  const ok = attempts.filter((a) => a.evaluation?.correct === true).length
  return ok / attempts.length
}

export function buildListeningReportDocument(params: {
  session: ListeningSession
  attempts: ListeningAttempt[]
  clipByKey: Map<string, ListeningClip>
}): ListeningReport {
  const { session, attempts, clipByKey } = params
  const r = ratioCorrect(attempts)

  const topSummary =
    r >= 0.85
      ? 'You stayed with the Dutch that mattered in this burst.'
      : r >= 0.55
        ? 'Solid ear — a few catches are still training up.'
        : 'Honest rep: real-speed Dutch rewards short listens and quick decisions.'

  const dimensionScores: ListeningDimensionScores = {
    gist: Math.round(55 + r * 35),
    detailAccuracy: Math.round(50 + r * 38),
    fastSpeech: Math.round(48 + r * 40),
    naturalReply: Math.round(52 + r * 33),
    responseReadiness: Math.round(50 + r * 36),
  }

  const weakAreas: ListeningReportWeakArea[] = []
  if (r < 0.7) {
    weakAreas.push({
      key: 'detail_under_pressure',
      label: 'Details under time pressure',
      hint: 'Times, platforms, and quantities like to hide in polite bundles — replay slower once, then answer.',
    })
  }
  if (attempts.some((a) => a.replayCount >= 3 && !a.evaluation?.correct)) {
    weakAreas.push({
      key: 'replay_dependence',
      label: 'Replay habit',
      hint: 'Try one honest first listen, then use replay as polish — not as a crutch.',
    })
  }

  const missedDetails: ListeningReportMissedDetail[] = []
  for (const a of attempts) {
    if (a.evaluation?.correct) continue
    const clip = clipByKey.get(a.clipId)
    if (a.drillType === 'detail' || a.drillType === 'instruction') {
      missedDetails.push({
        facet: a.drillType,
        coachLine: clip
          ? `Clip “${clip.id}”: lock one concrete anchor (${clip.keyDetails.slice(0, 2).join(' · ') || 'listen again'})`
          : 'A concrete detail moved quickly — slow replay once.',
      })
    }
  }

  const recommendedNext: ListeningRecommendedNext[] = []
  const track = session.trackId ? getListeningTrackById(session.trackId) : null
  if (track) {
    recommendedNext.push({
      kind: 'track',
      title: 'Another burst in the same lane',
      subtitle: 'Keep variety while the scenario is warm.',
      targetId: track.id,
    })
  }
  recommendedNext.push({
    kind: 'speak_live',
    title: 'Speak Live in the same situation',
    subtitle: 'Listening warms the ear before you answer out loud.',
    targetId: session.scenarioId,
  })

  const relatedPracticeLoops: ListeningRelatedPracticeLoop[] = [
    {
      loopId: null,
      title: 'Personalized loop (when available)',
      reason: 'Loops generated from your sessions can target the same weakness keys.',
    },
  ]

  return {
    sessionId: session.id,
    userId: session.userId,
    level: session.level,
    scenarioId: session.scenarioId,
    topSummary,
    dimensionScores,
    weakAreas,
    missedDetails,
    recommendedNext,
    relatedPracticeLoops,
    createdAt: new Date().toISOString(),
  }
}

export function clipMapFromSession(session: ListeningSession, attempts: ListeningAttempt[]): Map<string, ListeningClip> {
  const m = new Map<string, ListeningClip>()
  for (const id of session.drillIds) {
    const c = getCatalogClipByKey(id)
    if (c) m.set(id, c)
  }
  for (const a of attempts) {
    if (!m.has(a.clipId)) {
      const c = getCatalogClipByKey(a.clipId)
      if (c) m.set(a.clipId, c)
    }
  }
  return m
}
