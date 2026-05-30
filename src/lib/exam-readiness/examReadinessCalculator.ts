/**
 * Overall exam-prep readiness across domains (bottleneck-aware).
 */
import { EXAM_PREP_TYPE_IDS, type ExamPrepTypeId } from '@/features/exam-prep/examPrepCatalog'
import type { A2WeakTagCount } from '@/features/curriculum/a2ReviewStore'
import { loadExamReadinessAttempts } from '@/lib/exam-readiness/examReadinessHistory'
import { computeModuleReadinessSignalsFromAttempts } from '@/lib/exam-readiness/moduleReadinessCalculator'
import {
  passLikelihoodFromSignals,
  readinessStateFromScore,
} from '@/lib/exam-readiness/passLikelihoodBuilder'
import { readinessTrendForAttempts } from '@/lib/exam-readiness/readinessTrendCalculator'
import { aggregateWeakCategoriesForModule } from '@/lib/exam-readiness/weakCategoryAggregator'
import type {
  ExamReadinessPresenterBundle,
  ModuleReadinessModel,
  OverallReadinessModel,
  PassLikelihoodLabel,
  ReadinessStateLabel,
  ReadinessTrend,
} from '@/lib/exam-readiness/types'

function moduleHeadlineNl(state: ReadinessStateLabel, module: ExamPrepTypeId): string {
  const name: Record<ExamPrepTypeId, string> = {
    speaking: 'Spreken',
    writing: 'Schrijven',
    listening: 'Luisteren',
    reading: 'Lezen',
    kmn: 'KNM',
  }
  const n = name[module]
  switch (state) {
    case 'ready':
      return `${n}: oefeningen zien er examengericht sterk uit`
    case 'close':
      return `${n}: bijna op het niveau dat je wilt`
    case 'improving':
      return `${n}: je maakt stappen`
    case 'needs_work':
      return `${n}: hier is nog de meeste winst`
    default:
      return `${n}: nog weinig gegevens — start met training`
  }
}

function moduleNextHintNl(
  module: ExamPrepTypeId,
  state: ReadinessStateLabel,
  pass: PassLikelihoodLabel
): string {
  if (state === 'ready' || pass === 'likely_ready') {
    return module === 'speaking' || module === 'writing'
      ? 'Probeer een volledige simulatie om onder tijdsdruk te checken.'
      : 'Houd korte sessies vast om het niveau te stabiliseren.'
  }
  if (state === 'close' || pass === 'close_to_ready') {
    return 'Pak je zwakste rubriek met een korte trainingssessie of drill in Practice.'
  }
  return 'Start met training in dit onderdeel; daarna koppel je aan scenario’s in Practice.'
}

function recommendedHrefForModule(module: ExamPrepTypeId, state: ReadinessStateLabel): string {
  if (state === 'ready' && (module === 'speaking' || module === 'writing')) {
    return module === 'speaking' ? '/app/exam-prep/speaking/simulation' : '/app/exam-prep/writing/simulation'
  }
  if (module === 'speaking') return '/app/exam-prep/speaking/training'
  if (module === 'writing') return '/app/exam-prep/writing/training'
  if (module === 'listening') return '/app/exam-prep/listening/training'
  if (module === 'reading') return '/app/exam-prep/reading/training'
  return '/app/exam-prep/kmn'
}

function moduleExplanationNl(
  _module: ExamPrepTypeId,
  sig: ReturnType<typeof computeModuleReadinessSignalsFromAttempts>,
  weak: ModuleReadinessModel['weakCategories'],
  trend: ReadinessTrend
): string {
  const parts: string[] = []
  if (sig.attemptCount < 2) {
    parts.push(`Nog maar ${sig.attemptCount} geregistreerde poging — doe er nog een paar voor een betrouwbaar beeld.`)
  } else {
    parts.push(
      `Gebaseerd op je laatste pogingen (gemiddelde richting ${sig.emaPercent}%, voldoende in ${sig.recentPassRate != null ? Math.round(sig.recentPassRate * 100) : '—'}% ervan).`
    )
  }
  if (weak.length > 0) {
    parts.push(`Let extra op: ${weak.map((w) => w.labelNl).join(', ')}.`)
  }
  if (trend === 'improving') parts.push('Trend: licht omhoog — goed vol te houden.')
  if (trend === 'slipping') parts.push('Trend: iets minder stabiel — kortere sessies vaker werken hier vaak beter.')
  if (trend === 'stable' && sig.attemptCount >= 4) parts.push('Trend: redelijk stabiel.')
  return parts.join(' ')
}

export function buildExamReadinessPresenterBundle(weakTags: A2WeakTagCount[]): ExamReadinessPresenterBundle {
  const all = loadExamReadinessAttempts()
  const modules: ModuleReadinessModel[] = EXAM_PREP_TYPE_IDS.map((module) => {
    const modAttempts = all.filter((a) => a.module === module)
    const sortedByRecency = [...modAttempts].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    )
    const lastAttemptAt = sortedByRecency[0]?.at ?? null
    const sig = computeModuleReadinessSignalsFromAttempts(modAttempts)
    const trend = readinessTrendForAttempts(modAttempts)
    const weakCats = aggregateWeakCategoriesForModule(module, modAttempts, weakTags, 3)
    const state = readinessStateFromScore(sig.readinessScore, sig.attemptCount)
    const passLikelihood = passLikelihoodFromSignals({
      readinessScore: sig.readinessScore,
      attemptCount: sig.attemptCount,
      recentPassRate: sig.recentPassRate,
    })

    return {
      module,
      headlineNl: moduleHeadlineNl(state, module),
      readinessScore: sig.readinessScore,
      state,
      passLikelihood,
      trend,
      attemptCount: sig.attemptCount,
      lastAttemptAt,
      recentPassRate: sig.recentPassRate,
      weakCategories: weakCats,
      explanationNl: moduleExplanationNl(module, sig, weakCats, trend),
      nextHintNl: moduleNextHintNl(module, state, passLikelihood),
      recommendedHref: recommendedHrefForModule(module, state),
    }
  })

  const scored = modules.filter((m) => m.readinessScore != null) as Array<ModuleReadinessModel & { readinessScore: number }>
  let overallScore: number | null = null
  if (scored.length >= 1) {
    const avg = scored.reduce((s, m) => s + m.readinessScore, 0) / scored.length
    const mins = scored.map((m) => m.readinessScore)
    const min = Math.min(...mins)
    overallScore = Math.round(avg * 0.78 + min * 0.22)
  }

  const totalAttempts = modules.reduce((s, m) => s + m.attemptCount, 0)
  const sortedAll = [...all].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const recentMix = sortedAll.slice(0, 18)
  const globalPassRate = recentMix.length
    ? recentMix.filter((x) => x.pass).length / recentMix.length
    : null

  const overallState = readinessStateFromScore(overallScore, totalAttempts >= 2 ? totalAttempts : 0)
  const overallPass = passLikelihoodFromSignals({
    readinessScore: overallScore,
    attemptCount: totalAttempts,
    recentPassRate: globalPassRate,
  })

  const trendOverall: ReadinessTrend =
    all.length >= 6 ? readinessTrendForAttempts(all) : 'unknown'

  const overall: OverallReadinessModel = {
    headlineNl: overallHeadlineNl(overallState, overallPass, overallScore),
    readinessScore: overallScore,
    state: overallState,
    passLikelihood: overallPass,
    trend: trendOverall,
    modulesWithData: modules.filter((m) => m.attemptCount > 0).length,
    explanationNl: buildOverallExplanationNl(overallScore, modules, overallPass),
    nextHintNl: buildOverallNextHintNl(overallState, overallPass),
    disclaimerNl:
      'Dit is geen officiële examenuitslag of garantie — alleen een leesbaar overzicht van je oefeningen in deze app.',
  }

  const updatedAt = all.length > 0 ? all.reduce((a, b) => (a > b.at ? a : b.at), all[0]!.at) : null

  return { overall, modules, updatedAt }
}

function buildOverallExplanationNl(
  overallScore: number | null,
  modules: ModuleReadinessModel[],
  pass: PassLikelihoodLabel
): string {
  const active = modules.filter((m) => m.attemptCount > 0)
  if (active.length === 0) {
    return 'Nog geen examenoefeningen geregistreerd — na je eerste sessies verschijnt hier je globale beeld.'
  }
  const weakest = [...active].sort((a, b) => (a.readinessScore ?? 999) - (b.readinessScore ?? 999))[0]
  const parts: string[] = []
  if (overallScore != null) {
    parts.push(`Globale examen-readiness rond ${overallScore}% (eigen app-schaal).`)
  }
  if (weakest && weakest.readinessScore != null && weakest.readinessScore < 68) {
    const label =
      weakest.module === 'speaking'
        ? 'spreken'
        : weakest.module === 'writing'
          ? 'schrijven'
          : weakest.module === 'listening'
            ? 'luisteren'
            : weakest.module === 'reading'
              ? 'lezen'
              : 'KNM'
    parts.push(`Het onderdeel ${label} trekt het gemiddelde het meeste naar beneden — daar levert gerichte training vaak snel winst.`)
  }
  if (pass === 'likely_ready') {
    parts.push('Patroon oogt stabiel genoeg om simulaties en planning serieus te overwegen — blijf realistisch en oefen zwakke rubrieken.')
  }
  return parts.join(' ')
}

function overallHeadlineNl(
  state: ReadinessStateLabel,
  pass: PassLikelihoodLabel,
  score: number | null
): string {
  if (pass === 'not_enough_data' || state === 'needs_data') {
    return 'Examen-readiness: nog meten'
  }
  if (state === 'ready' || pass === 'likely_ready') {
    return score != null ? `Examen-readiness: sterk (${score}%)` : 'Examen-readiness: sterk'
  }
  if (state === 'close' || pass === 'close_to_ready') {
    return score != null ? `Examen-readiness: bijna rond (${score}%)` : 'Examen-readiness: bijna rond'
  }
  if (state === 'improving' || pass === 'improving_band') {
    return score != null ? `Examen-readiness: aan het groeien (${score}%)` : 'Examen-readiness: aan het groeien'
  }
  return score != null ? `Examen-readiness: nog bouwen (${score}%)` : 'Examen-readiness: nog bouwen'
}

function buildOverallNextHintNl(state: ReadinessStateLabel, pass: PassLikelihoodLabel): string {
  if (pass === 'not_enough_data' || state === 'needs_data') {
    return 'Plan twee korte sessies in verschillende onderdelen (bijv. spreken + luisteren).'
  }
  if (state === 'ready' || pass === 'likely_ready') {
    return 'Rond af met simulaties waar je die hebt, en bekijk Practice voor zwakke tags uit je review.'
  }
  if (state === 'close' || pass === 'close_to_ready') {
    return 'Pak het onderdeel met de laagste score eerst, daarna een mixed sessie.'
  }
  return 'Focus op training per onderdeel voordat je lange simulaties doet.'
}
