/**
 * Summaries + light comparison for practice exam reports.
 */
import { passLikelihoodFromSignals, readinessStateFromScore } from '@/lib/exam-readiness/passLikelihoodBuilder'
import type { PassLikelihoodLabel, ReadinessStateLabel } from '@/lib/exam-readiness/types'
import type { PracticeExamAttemptStored, PracticeExamCompareDelta } from '@/lib/exam-prep/practice-exams/types'

export type PracticeExamReportHeadline = {
  titleNl: string
  subNl: string
  passLikelihood: PassLikelihoodLabel
  readinessState: ReadinessStateLabel
}

/**
 * Call **before** `appendPracticeExamAttempt` so “previous” is the last completed run.
 */
export function compareToPreviousAttempt(
  priorAttemptsNewestFirst: PracticeExamAttemptStored[],
  currentPercent: number
): {
  delta: PracticeExamCompareDelta
  previousPercent: number | null
  deltaPoints: number | null
} {
  const prev = priorAttemptsNewestFirst[0]
  if (!prev) {
    return { delta: 'unknown', previousPercent: null, deltaPoints: null }
  }
  const previousPercent = prev.averagePercent
  const d = currentPercent - previousPercent
  if (Math.abs(d) < 3) return { delta: 'stable', previousPercent, deltaPoints: d }
  if (d > 0) return { delta: 'improved', previousPercent, deltaPoints: d }
  return { delta: 'worse', previousPercent, deltaPoints: d }
}

/** Note: attempt count for pass likelihood uses completed attempts including this run (caller passes n). */
export function practiceExamReportHeadline(input: {
  setTitleNl: string
  averagePercent: number
  passedRatio: number
  taskCount: number
  attemptNumber: number
}): PracticeExamReportHeadline {
  const readinessState = readinessStateFromScore(input.averagePercent, Math.max(2, input.attemptNumber))
  const passLikelihood = passLikelihoodFromSignals({
    readinessScore: input.averagePercent,
    attemptCount: input.attemptNumber,
    recentPassRate: input.passedRatio,
  })

  let subNl = `Gemiddeld ${Math.round(input.averagePercent)}% over ${input.taskCount} onderdelen — geen officiële examenuitslag.`
  if (passLikelihood === 'likely_ready') {
    subNl = `Sterke oefensessie (${Math.round(input.averagePercent)}%). Dit oefenexamen ziet er examengericht stabiel uit — blijf zwakke punten uit je review pakken.`
  } else if (passLikelihood === 'close_to_ready') {
    subNl = `Je zit dicht in de buurt (${Math.round(input.averagePercent)}%). Nog een paar gerichte sessies op je zwakste onderdeel helpen.`
  } else if (passLikelihood === 'needs_more_work') {
    subNl = `Er is nog ruimte (${Math.round(input.averagePercent)}%). Herhaal dit vaste oefenexamen of ga naar training per onderdeel.`
  }

  return {
    titleNl: `${input.setTitleNl} — afgerond`,
    subNl,
    passLikelihood,
    readinessState,
  }
}

export function compareDeltaNl(delta: PracticeExamCompareDelta, deltaPoints: number | null): string {
  switch (delta) {
    case 'improved':
      return deltaPoints != null
        ? `Verbeterd t.o.v. je vorige poging op deze set (+${Math.round(deltaPoints)} punten).`
        : 'Verbeterd t.o.v. je vorige poging op deze set.'
    case 'worse':
      return deltaPoints != null
        ? `Iets lager dan je vorige poging (${Math.round(deltaPoints)} punten) — dat kan gebeuren; korte sessies helpen stabiliteit.`
        : 'Iets lager dan je vorige poging — focus op rust en herhaling.'
    case 'stable':
      return 'Vergelijkbaar met je vorige poging op deze set — werk verder aan consistentie.'
    default:
      return 'Eerste keer dat je deze vaste set afrondt — volgende keer kun je trend zien.'
  }
}
