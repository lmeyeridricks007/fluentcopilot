import type { ListeningAttempt } from '../listening/listeningAttempt'
import type { ListeningSession } from '../listening/listeningSession'
import {
  SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION,
  type SessionInsightWeakPattern,
  type SessionLearningInsights,
} from './sessionLearningInsightTypes'
import type { ScenarioPerformanceSummary } from './userLearningProfileDocument'

function weakPattern(
  patternId: string,
  label: string,
  explanation: string,
  severityScore: number,
  refs: string[],
): SessionInsightWeakPattern {
  return {
    patternId,
    label,
    explanation,
    source: 'listening_session',
    severity: Math.min(3, Math.max(1, Math.round(severityScore / 2))),
    severityScore,
    confidence: 0.62,
    evidenceRefs: refs,
    supportingText: null,
  }
}

function scenarioPerf(session: ListeningSession, ratioCorrect: number): ScenarioPerformanceSummary | null {
  const sid = session.scenarioId?.trim()
  if (!sid) return null
  const score = Math.round(42 + ratioCorrect * 52)
  return {
    scenarioId: sid,
    scenarioSlug: sid,
    attempts: 1,
    rollingScore: score,
    recentScore: score,
    confidence: 0.55,
    strongSubskills: ratioCorrect >= 0.72 ? ['gist'] : [],
    weakSubskills: ratioCorrect < 0.55 ? ['detail', 'pace'] : [],
    lastAttemptAt: new Date().toISOString(),
  }
}

/**
 * Builds {@link SessionLearningInsights} for a completed listening session so the training-loop engine
 * can rank listening-specific loop types the same way as other modalities.
 */
export function extractSessionInsightsFromListeningSession(params: {
  session: ListeningSession
  attempts: ListeningAttempt[]
  extractedAt: string
}): SessionLearningInsights {
  const { session, attempts, extractedAt } = params
  const ok = attempts.filter((a) => a.evaluation?.correct === true).length
  const ratio = attempts.length ? ok / attempts.length : 0
  const refsBase = attempts.map((a) => `${session.id}:${a.id}`)

  const weakPatterns: SessionInsightWeakPattern[] = []
  const scen = (session.scenarioId ?? '').toLowerCase()

  for (const a of attempts) {
    const correct = a.evaluation?.correct === true
    const tags = (a.evaluation?.tags ?? []).join(' ').toLowerCase()
    const clip = a.clipId.toLowerCase()
    const ref = `${session.id}:${a.id}`
    if (gistOkDetailWeak(a)) {
      weakPatterns.push(
        weakPattern('listening:gist_strong_detail_weak', 'Gist ok, detail slips', 'Missed a concrete anchor.', 2.4, [
          ref,
        ]),
      )
    }
    if (!correct) {
      if (/\d|\buur\b|\bmin\b|tijd|time|kwart|half|€|euro|prijs/i.test(`${tags} ${clip}`)) {
        weakPatterns.push(
          weakPattern('listening:number_time', 'Times & numbers', 'Catch quantities and clock bits.', 2.5, [ref]),
        )
      }
      if (
        (a.drillType === 'detail' || a.drillType === 'personalized_focus') &&
        /route|richting|exit|spoor|perron|direction|omleiding|train|station|metro|bus|ov/i.test(`${tags} ${clip} ${scen}`)
      ) {
        weakPatterns.push(
          weakPattern('listening:route_detail', 'Route details', 'Platforms, transfers, and exits moved quickly.', 2.3, [
            ref,
          ]),
        )
      }
      if (a.drillType === 'fast_speech') {
        weakPatterns.push(
          weakPattern('listening:fast_speech', 'Fast service audio', 'Short bursts at real counter speed.', 2.35, [ref]),
        )
      }
      if (a.drillType === 'listen_respond' || (a.drillType === 'instruction' && /cafe|shop|service|kassa|winkel/i.test(scen))) {
        weakPatterns.push(
          weakPattern('listening:listen_reply', 'Listen & reply', 'Natural one-beat answers under pressure.', 2.2, [ref]),
        )
      }
      if (!correct && (a.drillType === 'detail' || a.drillType === 'instruction')) {
        weakPatterns.push(
          weakPattern('listening:missed_detail', 'Missed detail', 'Concrete facet slipped past on first listen.', 2.1, [
            ref,
          ]),
        )
      }
    }
  }

  if (ratio < 0.62 && !weakPatterns.some((p) => p.patternId === 'listening:burst')) {
    weakPatterns.push(
      weakPattern('listening:burst', 'Listening burst polish', 'Overall hit rate suggests another short burst.', 2.0, refsBase.slice(0, 3)),
    )
  }

  const byId = new Map<string, SessionInsightWeakPattern>()
  for (const p of weakPatterns) {
    const prev = byId.get(p.patternId)
    if (!prev || p.severityScore > prev.severityScore) byId.set(p.patternId, p)
  }

  return {
    schemaVersion: SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION,
    sessionId: session.id,
    userId: session.userId,
    sessionType: 'listening',
    scenarioId: session.scenarioId,
    extractedAt,
    weakWords: [],
    weakPatterns: [...byId.values()],
    pronunciationIssues: [],
    hesitationIssues: [],
    scenarioPerformance: scenarioPerf(session, ratio),
    strengths: [],
    confidenceSummary: `listening|attempts=${attempts.length}|ratio=${ratio.toFixed(2)}`,
  }
}

function gistOkDetailWeak(a: ListeningAttempt): boolean {
  return a.correctGist === true && a.correctDetails !== true
}
