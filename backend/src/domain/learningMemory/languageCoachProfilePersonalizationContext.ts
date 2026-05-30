/**
 * Language Coach / free-talk personalization from {@link UserLearningProfile}.
 * All strings here are **English, internal** — never read as a checklist to the learner.
 */
import type { PracticeRecommendations } from './learningMemoryRecommendationService'
import { topWeaknessLabels } from './learningMemoryRecommendationService'
import type { UserLearningProfile } from './userLearningProfileDocument'
import { buildSkillCoachInternalEnglish } from '../skills/skillCoachHints'
import { getSkillDefinition } from '../skills/skillDefinitions'
import { rankWeakestSkillIdsFromProfile } from '../skills/scenarioSkillTags'
import { formatLanguageCoachListeningAdaptationRules } from './listeningMemoryAdaptation'

const COLD_SESSION_THRESHOLD = 2

export type LanguageCoachSessionSteerPlan = {
  coldStart: boolean
  learnerLevelEstimate: string | null
  /** At most two concrete steer targets (same family as active focus / weaknesses). */
  primarySteerTargets: string[]
  /** One lighter-touch area to reinforce occasionally. */
  secondaryReinforcement: string | null
  /** A strength to lean on for confidence and natural praise. */
  safeStrength: string | null
  /** Human-readable labels from persisted skill metrics (Skill System). */
  skillMetricSteerLabels: string[]
}

function skillMetricSteerLabelsFromDoc(doc: UserLearningProfile, max: number): string[] {
  if (doc.totalSessionsObserved < COLD_SESSION_THRESHOLD) return []
  return rankWeakestSkillIdsFromProfile(doc, max).map((id) => getSkillDefinition(id).label)
}

export function buildLanguageCoachSessionSteerPlan(doc: UserLearningProfile): LanguageCoachSessionSteerPlan {
  const coldStart = doc.totalSessionsObserved < COLD_SESSION_THRESHOLD
  const fromFocus = (doc.activeFocusAreas?.length ? doc.activeFocusAreas : topWeaknessLabels(doc, 3)).filter(Boolean)
  const primarySteerTargets = fromFocus.slice(0, 2)
  let secondaryReinforcement: string | null = fromFocus[2] ?? null
  if (!secondaryReinforcement && !coldStart) {
    const extras = topWeaknessLabels(doc, 6).filter((x) => !primarySteerTargets.includes(x))
    secondaryReinforcement = extras[0] ?? null
  }
  const safeStrength = doc.strongestAreas.find((s) => s.trim()) ?? null
  const skillMetricSteerLabels = skillMetricSteerLabelsFromDoc(doc, 4)
  return {
    coldStart,
    learnerLevelEstimate: doc.levelEstimate,
    primarySteerTargets,
    secondaryReinforcement,
    safeStrength: safeStrength?.trim() ?? null,
    skillMetricSteerLabels,
  }
}

/** One internal line persisted on LC state for the runtime prompt (`sessionFocusChip`). */
export function formatLanguageCoachSessionFocusChip(plan: LanguageCoachSessionSteerPlan): string | null {
  if (plan.coldStart) {
    return 'Profile still forming — stay exploratory; one warm opener; no implied long-term diagnosis.'
  }
  const bits: string[] = []
  if (plan.primarySteerTargets.length) {
    bits.push(`Subtle steer toward: ${plan.primarySteerTargets.join(' · ')}`)
  }
  if (plan.skillMetricSteerLabels.length) {
    bits.push(`Skill emphasis (internal): ${plan.skillMetricSteerLabels.slice(0, 2).join(' · ')}`)
  }
  if (plan.secondaryReinforcement) {
    bits.push(`light reinforcement: ${plan.secondaryReinforcement}`)
  }
  if (plan.safeStrength) {
    bits.push(`echo strength: ${plan.safeStrength}`)
  }
  const s = bits.join(' | ')
  return s.length ? s.slice(0, 280) : null
}

/**
 * Rich internal block for Language Coach + compact adaptation/micro-hint for lean prompts.
 * Call after {@link buildPracticeRecommendations} so `activeFocusAreas` and `rec` stay aligned with `doc`.
 */
export function buildLanguageCoachPersonalizationBundle(params: {
  profile: UserLearningProfile
  scenarioSlug: string
  rec: PracticeRecommendations
  steer: LanguageCoachSessionSteerPlan
}): {
  coachPersistentEnglish: string
  scenarioAdaptationEnglish: string
  scenarioMicroHintEnglish: string
} {
  const { profile, scenarioSlug, rec, steer } = params
  const themes = rec.recommendedFreeTalkThemes.slice(0, 2)
  const nextHint = rec.recommendations?.find((r) => r.type === 'report_next_step')?.subtitle?.trim()
  const skillCoachBlock =
    !steer.coldStart && profile.userSkillProfile ? buildSkillCoachInternalEnglish(profile.userSkillProfile).trim() : ''
  const listeningCoachBlock = formatLanguageCoachListeningAdaptationRules(profile, steer.coldStart)

  const coachPersistentEnglish = [
    '--- Language Coach: persistent learner context (English; INTERNAL — never read as a list to the learner) ---',
    `Estimated CEFR / level (uncertain): ${steer.learnerLevelEstimate ?? 'unknown'}.`,
    steer.coldStart
      ? 'Cold start: keep tone exploratory; do not imply stable long-term weaknesses; avoid inventorying.'
      : [
          steer.primarySteerTargets.length
            ? `Primary session steer (max TWO ideas across the whole chat; rotate, do not stack every turn): ${steer.primarySteerTargets.join(' · ')}.`
            : 'Primary steer: general polish — still keep one light thread (plans, weekend, commute) before specializing.',
          steer.secondaryReinforcement
            ? `Secondary reinforcement (lighter cadence — roughly every several turns, not back-to-back): ${steer.secondaryReinforcement}.`
            : '',
          steer.safeStrength
            ? `Safe strength to lean on for confidence (natural praise, callbacks, parallel good examples): ${steer.safeStrength}.`
            : '',
          themes.length
            ? `Optional micro-themes for natural steering (max one idea / few turns): ${themes.join(', ')}.`
            : '',
          nextHint ? `Continuity hint (paraphrase in Dutch if useful; do not quote): ${nextHint}` : '',
        ]
          .filter(Boolean)
          .join(' '),
    '',
    'Conversational behavior (stay human):',
    '- Reuse target-area vocabulary naturally inside your Dutch replies (model it; do not quiz or label).',
    '- Ask Dutch follow-ups that invite the structures they need (e.g. plans/time for scheduling vocab; clean question shapes they can mirror).',
    '- Prefer implicit recasts inside a natural sentence over metalanguage.',
    '- After two hesitant turns, simplify; after two fluent turns, add one gentle stretch detail.',
    '- If momentum is good for several turns, do not interrupt — let the thread breathe.',
    '',
    'Do / Don’t guardrails:',
    'DO: sound like one consistent persona; vary sentence openings; acknowledge feelings briefly in Dutch.',
    'DO NOT: dump weaknesses, read internal labels aloud, correct every turn, sound like a rubric, or teach grammar lectures mid-flow.',
    '',
    'Subtle nudge EXAMPLES (English rehearsal only — express in natural Dutch as the persona):',
    '- Scheduling weak → ask about a concrete upcoming plan, a small delay, or how they will get somewhere (invites time/appointment phrasing).',
    '- Question-form weak → answer, then model a clean alternative shape they can echo without naming “grammar”.',
    '- Prepositions weak → narrate a tiny movement or location story (“between …, next to …”) instead of naming rules.',
    '- Follow-up / depth weak → hold one beat of silence in text, then one curious “why / what then / how did that feel?” in Dutch.',
    '- Storytelling weak → invite a tiny arc (“what happened next?”) after they share a fragment.',
    '- Nuance / opinion weak → one gentle “why?” or “what would you compare that to?” — keep stakes low.',
    '',
    'Feedback cadence alignment:',
    '- Default: at most one noticeable recast or strong steer every few coach turns unless the learner invites help.',
    '- If the learner sounds stuck or frustrated, prioritize clarity and warmth over practice targets for that beat.',
    '',
    skillCoachBlock ? `${skillCoachBlock}\n` : '',
    listeningCoachBlock ? `${listeningCoachBlock}\n` : '',
    '--- End Language Coach persistent context ---',
  ].join('\n')

  const scenarioAdaptationEnglish = [
    '--- Session adaptation (English; internal) ---',
    `Surface: Language Coach / free talk (${scenarioSlug.replace(/_/g, ' ')}).`,
    steer.coldStart
      ? 'Low cross-session history — prioritize rapport and light discovery before targeted steering.'
      : steer.primarySteerTargets.length
        ? `Steer priorities for this session: ${steer.primarySteerTargets.join(' · ')}.`
        : 'No strong steer yet — keep Dutch natural and lightly diagnostic.',
    'Pick one implicit mode from replies: reinforce (short scaffolding), stretch (one extra detail), recover (simpler sentences). Never announce the mode.',
  ].join('\n')

  const microParts: string[] = []
  if (!steer.coldStart && steer.primarySteerTargets[0]) {
    microParts.push(`steer:${steer.primarySteerTargets[0].replace(/\s+/g, ' ').slice(0, 72)}`)
  }
  if (themes[0]) microParts.push(`theme:${themes[0].replace(/_/g, ' ').slice(0, 56)}`)
  const scenarioMicroHintEnglish = (() => {
    const t = microParts.join(' | ') || 'adaptive:match pace; stay warm'
    return t.length > 200 ? `${t.slice(0, 199)}…` : t
  })()

  return { coachPersistentEnglish, scenarioAdaptationEnglish, scenarioMicroHintEnglish }
}
