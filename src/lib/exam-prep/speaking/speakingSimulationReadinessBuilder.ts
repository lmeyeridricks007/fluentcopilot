/**
 * Exam-oriented readiness copy for speaking simulation (session-level, post-hoc).
 * Uses average score, pass rate, timeouts, and score spread — not a legal exam verdict.
 */
import type { ReadinessSignal } from '@/lib/schemas/exam/examResultSummary.schema'

export type SpeakingSimulationReadinessUi = {
  headlineNl: string
  detailNl: string
  readinessSignal: ReadinessSignal
  /** Product-facing band for analytics */
  outcomeKey: 'ready' | 'nearly_ready' | 'needs_work' | 'mixed'
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const v = values.reduce((s, x) => s + (x - mean) ** 2, 0) / values.length
  return Math.sqrt(v)
}

function mapToSchemaBand(outcomeKey: SpeakingSimulationReadinessUi['outcomeKey']): ReadinessSignal['band'] {
  switch (outcomeKey) {
    case 'ready':
      return 'strong'
    case 'nearly_ready':
      return 'approaching'
    case 'needs_work':
      return 'not_ready'
    case 'mixed':
      return 'likely_ready'
    default:
      return 'approaching'
  }
}

export function buildSpeakingSimulationReadiness(input: {
  averageNormalizedPercent: number
  passesCount: number
  questionCount: number
  timedOutCount: number
  perQuestionNormalizedPercents: number[]
}): SpeakingSimulationReadinessUi {
  const { averageNormalizedPercent, passesCount, questionCount, timedOutCount, perQuestionNormalizedPercents } = input
  const passRate = questionCount > 0 ? passesCount / questionCount : 0
  const spread = stdDev(perQuestionNormalizedPercents)
  const blended = Math.round(
    Math.min(100, Math.max(0, averageNormalizedPercent * 0.55 + passRate * 100 * 0.35 + (1 - Math.min(1, spread / 28)) * 10))
  )

  let outcomeKey: SpeakingSimulationReadinessUi['outcomeKey']
  let headlineNl: string
  let detailNl: string

  const unstable = spread >= 22 && questionCount >= 3

  if (timedOutCount >= 2 || (averageNormalizedPercent < 45 && passRate < 0.4)) {
    outcomeKey = 'needs_work'
    headlineNl = 'Nog veel ruimte onder examendruk'
    detailNl =
      'Oefen eerst in training zonder tijdslimiet, daarna opnieuw simuleren. Let op volledige antwoorden binnen de tijd.'
  } else if (unstable && averageNormalizedPercent < 68) {
    outcomeKey = 'mixed'
    headlineNl = 'Sterk wisselend — nog niet stabiel'
    detailNl =
      'Je haalt punten op sommige vragen, maar niet consequent. Herhaal zwakke rubrieken en doe nog een simulatie.'
  } else if (averageNormalizedPercent >= 70 && passRate >= 0.75 && timedOutCount === 0 && !unstable) {
    outcomeKey = 'ready'
    headlineNl = 'Goed houdbaar onder druk'
    detailNl =
      'Je antwoorden blijven over de hele simulatie bruikbaar op A2-niveau. Blijf af en toe simuleren om scherp te blijven.'
  } else if (averageNormalizedPercent >= 55 || passRate >= 0.5) {
    outcomeKey = 'nearly_ready'
    headlineNl = 'Bijna examengericht'
    detailNl =
      'Je zit dicht bij voldoende, vooral als je tijd en volledigheid onder druk nog strakker maakt. Een trainingssessie op je zwakste rubriek helpt.'
  } else {
    outcomeKey = 'needs_work'
    headlineNl = 'Meer basis nodig voor examenspanning'
    detailNl =
      'Dit is normaal vroeg in je voorbereiding. Train gericht op uitvoering en fluency, en probeer later opnieuw.'
  }

  const readinessSignal: ReadinessSignal = {
    band: mapToSchemaBand(outcomeKey),
    headline: headlineNl,
    detail: detailNl,
    metadata: {
      model: 'speaking_simulation_v1',
      blendedPercent: blended,
      avgNormalizedPercent: averageNormalizedPercent,
      passRate,
      timedOutCount,
      scoreSpread: Math.round(spread * 10) / 10,
      outcomeKey,
    },
  }

  return { headlineNl, detailNl, readinessSignal, outcomeKey }
}
