/**
 * Turns {@link UserLearningProfile.listeningMemorySignals} into Speak Live + Language Coach adaptation hints.
 * All copy is English and **internal** — never read verbatim to the learner.
 */
import type { ListeningMemorySignalId, ListeningMemorySignalRow } from './listeningMemorySignalTypes'
import { effectiveWeaknessItemScore } from './learningMemoryMergeScoring'
import type { UserLearningProfile } from './userLearningProfileDocument'
import type { ScenarioLiveDimensionPack } from './scenarioLivePersonalizationPayload'

const MIN_CONF = 0.34
const MIN_SCORE = 0.55

function normSlug(s: string): string {
  return s.trim().toLowerCase().replace(/-/g, '_')
}

function rankedSignals(doc: UserLearningProfile, max: number): ListeningMemorySignalRow[] {
  return [...(doc.listeningMemorySignals ?? [])]
    .filter((s) => s.confidence >= MIN_CONF)
    .sort((a, b) => effectiveWeaknessItemScore(b) - effectiveWeaknessItemScore(a))
    .slice(0, max)
}

function hasId(signals: ListeningMemorySignalRow[], id: ListeningMemorySignalId): boolean {
  return signals.some((s) => s.signalId === id && effectiveWeaknessItemScore(s) >= MIN_SCORE)
}

export type ListeningScenarioMerge = {
  dimensionPatches: Partial<ScenarioLiveDimensionPack>
  hints: string[]
  scoringNotes: string[]
}

export type ListeningScenarioMergeOpts = {
  /** When `stretch`, avoid shrinking `responseLength` / lowering `pressure` so scene challenge stays intact; hints still carry early-turn pacing. */
  sessionStance?: ScenarioLiveDimensionPack['sessionStance']
}

/**
 * Scenario Speak Live: nudge pacing, repetition, and reply-type focus from listening-session memory.
 */
export function listeningMemoryScenarioMerge(
  doc: UserLearningProfile,
  scenarioSlugNorm: string,
  opts?: ListeningScenarioMergeOpts,
): ListeningScenarioMerge {
  const slug = normSlug(scenarioSlugNorm)
  const stance = opts?.sessionStance
  const sigs = rankedSignals(doc, 5)
  if (!sigs.length || doc.totalSessionsObserved < 2) {
    return { dimensionPatches: {}, hints: [], scoringNotes: [] }
  }

  const hints: string[] = []
  const scoringNotes: string[] = []
  const dimensionPatches: Partial<ScenarioLiveDimensionPack> = {}
  const stretchSafe = stance === 'stretch'

  const transportish =
    slug.includes('train') || slug.includes('station') || slug.includes('direction') || slug.includes('transport')
  const serviceish = slug.includes('order') || slug.includes('shop') || slug.includes('supermarket') || slug.includes('store')
  const phoneish = slug.includes('phone') || slug.includes('small_talk')

  const slowEar =
    hasId(sigs, 'fast_transport_replies_struggle') ||
    hasId(sigs, 'weak_route_details') ||
    hasId(sigs, 'often_misses_times')
  if (slowEar) {
    dimensionPatches.tolerance = 'patient'
    if (!stretchSafe && (hasId(sigs, 'fast_transport_replies_struggle') || hasId(sigs, 'weak_route_details'))) {
      dimensionPatches.responseLength = 'shorter'
      dimensionPatches.pressure = 'low'
    }
    hints.push(
      stretchSafe
        ? 'Listening memory: fast/dense Dutch is a weak spot — first 1–2 assistant turns keep richer vocabulary but break into shorter clauses and one idea per line; then resume stretch pacing if they track well.'
        : 'Listening memory: learner’s ear struggled with fast or dense Dutch — first 1–2 assistant turns slightly slower, shorter clauses, one idea per line; then normalize if they answer cleanly.',
    )
  }

  if (hasId(sigs, 'replay_before_answer') || hasId(sigs, 'transcript_reveal_dependent')) {
    hints.push(
      'Listening memory: replay/transcript dependence — vary assistant Dutch surface across beats; avoid repeating the same long line verbatim; prefer one short paraphrase-check (“dus …?”) before expanding.',
    )
    scoringNotes.push('Favor paraphrase variety over identical scripted repeats when judging assistant quality.')
  }

  if (hasId(sigs, 'gist_strong_detail_weak')) {
    dimensionPatches.followUpDepth = 'confirm_more'
    hints.push(
      'Listening memory: gist ok, detail weak — after learner replies, add one concrete confirmation probe (time, quantity, place, or next step) before stacking a new topic.',
    )
  }

  if (hasId(sigs, 'misses_short_service_questions') && (serviceish || transportish)) {
    hints.push(
      'Listening memory: short service-style questions are a weak spot — model compact counter-questions and natural one-beat replies the learner can mirror.',
    )
  }

  if (hasId(sigs, 'often_misses_times') && (transportish || serviceish || phoneish)) {
    hints.push(
      'Listening memory: times/numbers in audio — weave one clear time/price/quantity in Dutch then a gentle check-back; avoid rapid-fire number chains early.',
    )
  }

  if (transportish && (hasId(sigs, 'weak_route_details') || hasId(sigs, 'fast_transport_replies_struggle'))) {
    hints.push(
      'Optional (one sentence, only if learner stalls twice): suggest a short Listening warm-up in the same travel lane before drilling harder platform/transfer lines — never as homework inventory.',
    )
  } else if (serviceish && hasId(sigs, 'misses_short_service_questions')) {
    hints.push(
      'Optional (one sentence, only if learner stalls twice): suggest a brief café/shop Listening burst for counter-style audio before piling on new service lines.',
    )
  }

  return {
    dimensionPatches,
    hints: hints.slice(0, 6),
    scoringNotes: scoringNotes.slice(0, 3),
  }
}

/**
 * Language Coach: internal rules derived from listening memory (paired with existing coach block).
 */
export function formatLanguageCoachListeningAdaptationRules(
  doc: UserLearningProfile,
  coldStart: boolean,
): string | null {
  if (coldStart) return null
  const sigs = rankedSignals(doc, 5)
  if (!sigs.length) return null

  const lines: string[] = [
    '--- Listening-memory adaptation (English; INTERNAL — never read as a checklist) ---',
    `Top listening signals (weighted): ${sigs.map((s) => `${s.label} [${s.signalId}]`).join(' · ')}.`,
    'Comprehension guardrails:',
    '- If the learner answers the wrong question twice, or says they did not catch it, treat as listening strain first: one short paraphrase in simpler Dutch, then continue — do not stack new facts.',
    '- Strategic repetition: at most one near-repeat of a key Dutch clause per topic for clarity; after that, rephrase with different vocabulary.',
    '- If they mirror vocabulary correctly but miss the task, simplify one clause (shorter subject + predicate) before switching topic.',
    'Weak-pattern steering (implicit, in Dutch dialogue):',
  ]

  if (hasId(sigs, 'often_misses_times')) {
    lines.push('- Weave times/prices/durations naturally, then one “even checken …” style confirmation they can echo.')
  }
  if (hasId(sigs, 'weak_route_details')) {
    lines.push('- Prefer one clear route beat (platform/exit/line) per turn; confirm before chaining a second move.')
  }
  if (hasId(sigs, 'fast_transport_replies_struggle')) {
    lines.push('- Keep your first Dutch lines in this session slightly calmer and shorter; add speed only after two fluent exchanges.')
  }
  if (hasId(sigs, 'misses_short_service_questions')) {
    lines.push('- Practice short listen→reply rhythm: one service question, space for their line, then your next move — no rapid interrogation.')
  }
  if (hasId(sigs, 'gist_strong_detail_weak')) {
    lines.push('- After they show gist understanding, anchor one concrete detail (who/when/where/how much) before moving on.')
  }
  if (hasId(sigs, 'replay_before_answer') || hasId(sigs, 'transcript_reveal_dependent')) {
    lines.push('- Reduce “say it again exactly the same” loops; vary surface form so they cannot lean on verbatim pattern matching.')
  }

  lines.push('--- End listening-memory adaptation ---')
  return lines.join('\n')
}
