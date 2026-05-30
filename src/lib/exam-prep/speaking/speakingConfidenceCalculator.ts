/**
 * Session-level speaking confidence (supportive, not a legal exam verdict).
 * Combines average rubric-normalized score with pass rate across questions.
 */
import type { ReadinessSignal } from '@/lib/schemas/exam/examResultSummary.schema'
import type { SpeakingTrainingEvaluationBundle } from '@/lib/exam-prep/speaking/types'

export type SpeakingSessionConfidenceUi = {
  /** 0–100 display */
  percent: number
  headlineNl: string
  detailNl: string
  readinessSignal: ReadinessSignal
}

const PLACEHOLDER_RESPONSE =
  'Dit is een interne placeholder voor sessieaggregatie en mag niet aan de gebruiker getoond worden.'

/**
 * Weighted blend: 60% gemiddelde % score, 40% slaagpercentage op de vragen.
 */
export function computeSpeakingSessionConfidence(bundles: SpeakingTrainingEvaluationBundle[]): SpeakingSessionConfidenceUi {
  if (bundles.length === 0) {
    return {
      percent: 0,
      headlineNl: 'Nog geen data',
      detailNl: 'Maak een sessie af om je spreekvertrouwen te zien.',
      readinessSignal: {
        band: 'not_ready',
        headline: 'Nog geen sessie',
        detail: 'Start een trainingssessie.',
        metadata: {},
      },
    }
  }

  const avgNorm =
    bundles.reduce((s, b) => s + b.engine.normalizedPercent, 0) / bundles.length
  const passRate = bundles.filter((b) => b.engine.pass).length / bundles.length
  const blended = Math.round(Math.min(100, Math.max(0, avgNorm * 0.6 + passRate * 100 * 0.4)))

  let band: ReadinessSignal['band']
  let headlineNl: string
  let detailNl: string

  if (blended < 38) {
    band = 'not_ready'
    headlineNl = 'Nog steun nodig'
    detailNl =
      'Dat is normaal in training. Focus op korte, duidelijke antwoorden en twee zinnen per vraag waar dat past.'
  } else if (blended < 58) {
    band = 'not_ready'
    headlineNl = 'Je bouwt op'
    detailNl = 'Blijf thema’s herhalen; let op structuur (antwoord + korte reden).'
  } else if (blended < 72) {
    band = 'approaching'
    headlineNl = 'Aan het groeien'
    detailNl = 'Je scoort wisselend — versterk je zwakste rubriek uit de samenvatting met gerichte oefening.'
  } else if (blended < 86) {
    band = 'likely_ready'
    headlineNl = 'Sterk in deze sessie'
    detailNl = 'Goed ritme voor A2-spreken. Blijf variëren in onderwerp en lengte van je antwoord.'
  } else {
    band = 'strong'
    headlineNl = 'Dicht bij examentempo'
    detailNl = 'Zo houd je scherpte; plan ook korte simulatie zonder tips als volgende stap.'
  }

  const readinessSignal: ReadinessSignal = {
    band,
    headline: headlineNl,
    detail: detailNl,
    metadata: {
      blendedModel: 'session_avg_norm_0.6_plus_pass_rate_0.4',
      questionCount: bundles.length,
      avgNormalizedPercent: Math.round(avgNorm),
      passRate,
    },
  }

  return {
    percent: blended,
    headlineNl,
    detailNl,
    readinessSignal,
  }
}

export { PLACEHOLDER_RESPONSE }
