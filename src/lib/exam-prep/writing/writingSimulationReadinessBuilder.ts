/**
 * Session-level readiness for writing exam simulation (not a legal exam verdict).
 */
import type { ReadinessSignal } from '@/lib/schemas/exam/examResultSummary.schema'

export type WritingSimulationReadinessUi = {
  headlineNl: string
  detailNl: string
  readinessSignal: ReadinessSignal
  outcomeKey: 'ready' | 'nearly_ready' | 'needs_work' | 'mixed'
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const v = values.reduce((s, x) => s + (x - mean) ** 2, 0) / values.length
  return Math.sqrt(v)
}

function mapToSchemaBand(outcomeKey: WritingSimulationReadinessUi['outcomeKey']): ReadinessSignal['band'] {
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

export function buildWritingSimulationReadiness(input: {
  averageNormalizedPercent: number
  passesCount: number
  taskCount: number
  timedOutCount: number
  perTaskNormalizedPercents: number[]
}): WritingSimulationReadinessUi {
  const { averageNormalizedPercent, passesCount, taskCount, timedOutCount, perTaskNormalizedPercents } = input
  const passRate = taskCount > 0 ? passesCount / taskCount : 0
  const spread = stdDev(perTaskNormalizedPercents)
  const blended = Math.round(
    Math.min(100, Math.max(0, averageNormalizedPercent * 0.55 + passRate * 100 * 0.35 + (1 - Math.min(1, spread / 28)) * 10))
  )

  let outcomeKey: WritingSimulationReadinessUi['outcomeKey']
  let headlineNl: string
  let detailNl: string

  const unstable = spread >= 22 && taskCount >= 3

  if (timedOutCount >= 2 || (averageNormalizedPercent < 45 && passRate < 0.35)) {
    outcomeKey = 'needs_work'
    headlineNl = 'Nog niet klaar voor examenspanning'
    detailNl =
      'Train eerst per opdrachtsoort zonder tijd, werk aan uitvoering en spelling, en probeer daarna opnieuw de volledige simulatie.'
  } else if (unstable && averageNormalizedPercent < 68) {
    outcomeKey = 'mixed'
    headlineNl = 'Wisselend over de vier delen'
    detailNl =
      'Je scoort op sommige opdrachten goed, op andere minder. Herhaal je zwakste rubriek en plan daarna een tweede simulatie.'
  } else if (averageNormalizedPercent >= 70 && passRate >= 0.75 && timedOutCount === 0 && !unstable) {
    outcomeKey = 'ready'
    headlineNl = 'Goed vol te houden onder druk'
    detailNl =
      'Je houdt kwaliteit over formulier, berichten en algemene tekst. Blijf af en toe deze volledige simulatie doen.'
  } else if (averageNormalizedPercent >= 55 || passRate >= 0.5) {
    outcomeKey = 'nearly_ready'
    headlineNl = 'Bijna op examenniveau'
    detailNl =
      'Je zit dicht bij voldoende. Let op tijd en volledigheid van de opdracht; extra training op je zwakste onderdeel helpt.'
  } else {
    outcomeKey = 'needs_work'
    headlineNl = 'Meer structuur en rust nodig'
    detailNl =
      'Dit is normaal in een vroege fase. Oefen korte, duidelijke teksten per type en bouw daarna weer naar deze simulatie.'
  }

  const readinessSignal: ReadinessSignal = {
    band: mapToSchemaBand(outcomeKey),
    headline: headlineNl,
    detail: detailNl,
    metadata: {
      model: 'writing_simulation_v1',
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
