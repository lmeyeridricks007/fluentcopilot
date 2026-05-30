import type {
  LanguageCoachConversationGoal,
  LanguageCoachConversationRole,
  LanguageCoachPersistedBlob,
} from '../../domain/speakLive/languageCoachSessionTypes'
import type { RecommendedFollowUp } from '../speak-live/liveVoiceEvaluationTypes'
import type { LanguageCoachSessionHandoff } from './languageCoachSessionHandoff'

/** One-paragraph “lens” for the report — shapes emphasis without replacing core coaching. */
export function roleSessionEmphasisNl(role: LanguageCoachConversationRole): string {
  switch (role) {
    case 'friend':
      return 'In friend mode, we mainly look at natural flow, confidence, and whether you keep the conversation alive, not every small mistake.'
    case 'colleague':
      return 'In colleague mode, the focus is on clarity, professional tone, and practical phrasing that stays short and usable in a work context.'
    case 'dutch_local':
      return 'In local mode, the focus is realism, slightly more direct exchanges, and following a natural Dutch rhythm without sounding stiff.'
    case 'date':
      return 'In date mode, we mainly weigh warmth, curiosity, and social follow-up questions while keeping the exchange safe and respectful.'
    case 'coach':
    default:
      return 'In coach mode, we combine your learning goal with weak spots, nudges, and growth patterns to create the strongest learning value without gimmicks.'
  }
}

export function roleFocusWhyNl(role: LanguageCoachConversationRole): string {
  switch (role) {
    case 'friend':
      return 'This theme helped the conversation flow best. Friend mode needs light steering, not perfectionism.'
    case 'colleague':
      return 'This is where you gain the most professional clarity, so pick one concrete improvement point per session.'
    case 'dutch_local':
      return 'This pattern stood out most in realistic exchanges, and tightening it will make your answers sound more natural in real life.'
    case 'date':
      return 'This is where you can ask warmer or more curious follow-up questions, which strengthens the social rhythm.'
    case 'coach':
    default:
      return 'This pattern came back most often in this session, based on heuristics, so it is the best place to repeat on purpose.'
  }
}

export function roleFollowUpSuggestionsNl(
  role: LanguageCoachConversationRole,
  params: { focusLabel: string; topPattern: string | null; suggestedNextFocus: string },
): string[] {
  const { focusLabel, topPattern, suggestedNextFocus } = params
  const p = topPattern?.replace(/\s*\(×\d+\)\s*$/, '') ?? focusLabel

  switch (role) {
    case 'friend':
      return [
        suggestedNextFocus,
        'Practice shorter, natural bridging responses such as “Oh leuk” or “En toen?” before telling your own story.',
        'Ask at least one open follow-up question each round to keep the flow warm.',
        'Repeat the same role mode and pay attention to staying in the conversation without correcting every detail.',
      ].filter(Boolean)
    case 'colleague':
      return [
        suggestedNextFocus,
        'Make work answers shorter: core point first, then optional detail. Practice in 1 to 2 sentences.',
        'Practice one professional help question such as “Kun je me kort uitleggen hoe … precies werkt?”',
        'Repeat a colleague session with one fixed context, such as a project or planning topic, to build routine.',
      ].filter(Boolean)
    case 'dutch_local':
      return [
        suggestedNextFocus,
        'Respond a little faster with one clear sentence and leave space for the other person, which is closer to a typical Dutch pace.',
        'Practice a short checking question after a statement, such as “Oké — en wat bedoel je daarmee precies?”',
        'Repeat local mode and aim for direct but friendly phrasing without sounding pushy.',
      ].filter(Boolean)
    case 'date':
      return [
        suggestedNextFocus,
        'Practice warmer follow-up questions about preference or experience, such as “Wat vond je daarvan?” or “Ging je dat makkelijk af?”',
        'Let a little emotion show in your response without overtalking, using one extra descriptive word per turn.',
        'Choose one small personal detail and ask about it respectfully to train natural curiosity.',
      ].filter(Boolean)
    case 'coach':
    default:
      return [
        suggestedNextFocus,
        topPattern ? `Repeat mini-drills around: ${p}. Three short sentences a day is enough.` : `Mini-focus: ${focusLabel}. Pick one fixed sentence and vary the opening.`,
        'Plan a second Language Coach session with the same feedback style so repetition can turn into routine.',
        'Write down one natural model sentence from the conversation and say it out loud again with a mirror or voice memo.',
      ].filter(Boolean)
  }
}

export function roleSavePracticePromptsNl(role: LanguageCoachConversationRole): string[] {
  switch (role) {
    case 'friend':
      return [
        'Hé, hoe was je weekend eigenlijk?',
        'Wat deed je erna — nog iets leuks?',
        'Vertel eens: waar kijk je nu het meest naar uit?',
      ]
    case 'colleague':
      return [
        'Kun je in twee zinnen zeggen waar we nu staan met dit stuk werk?',
        'Wat heb jij nodig om hier vrijdag klaar voor te zijn?',
        'Kun je kort toelichten wat de volgende stap concreet inhoudt?',
      ]
    case 'dutch_local':
      return [
        'Dus je bedoelt … — klopt dat?',
        'En hoe ging dat verder, gisteren?',
        'Oké, en wat wil je daar nu mee?',
      ]
    case 'date':
      return [
        'Wat vond je daar het leukste aan?',
        'Ging dat makkelijk voor je, of spannend?',
        'Waar zou je het volgende keer weer naartoe willen?',
      ]
    case 'coach':
    default:
      return [
        'Hoe was je weekend eigenlijk?',
        'Waar wil je het volgende gesprek over hebben?',
        'Kun je dat in één zin samenvatten?',
      ]
  }
}

/** Opening clause for the short debrief summary (pattern sentence follows separately). */
export function roleCoachSummaryPrefixNl(role: LanguageCoachConversationRole, userTurnCount: number): string {
  const base = `${userTurnCount} learner turns`
  switch (role) {
    case 'friend':
      return `Friend mode debrief — ${base}.`
    case 'colleague':
      return `Colleague mode debrief — ${base}.`
    case 'dutch_local':
      return `Local mode debrief — ${base}.`
    case 'date':
      return `Date mode debrief — ${base}.`
    case 'coach':
    default:
      return `Short coach debrief — ${base}.`
  }
}

export function howGuidedFallbackNl(role: LanguageCoachConversationRole): string {
  switch (role) {
    case 'friend':
      return 'Your partner mostly stayed in conversation mode, with very little explicit correction, which fits friend mode.'
    case 'colleague':
      return 'The tone stayed businesslike and clear, and when meaning was unclear the response leaned toward clarification instead of teaching.'
    case 'dutch_local':
      return 'The support stayed natural and conversational without teacher-style corrections, which is closer to everyday Dutch.'
    case 'date':
      return 'The support stayed warm and curious without discouraging corrections, keeping flow and safety first.'
    case 'coach':
    default:
      return 'The coach mostly stayed in natural dialogue mode with light follow-up questions.'
  }
}

export type CoachLearningInsights = {
  bullets: string[]
  guideActiveSupportNote?: string
}

export function buildCoachLearningInsights(input: {
  lc: LanguageCoachPersistedBlob | null | undefined
  handoff: LanguageCoachSessionHandoff
  coachGuideWhileSpeaking: boolean
  topWeakPatternLine: string | null
}): CoachLearningInsights | undefined {
  const { lc, handoff, coachGuideWhileSpeaking, topWeakPatternLine } = input
  if (!lc || lc.conversationRole !== 'coach') return undefined

  const bullets: string[] = []
  /** Recasts stay in the interactive coach-moments list; keep insights to session-level signals only. */

  const targeted = topWeakPatternLine?.replace(/\s*\(×\d+\)\s*$/, '') ?? handoff.mostRepeatedWeakPattern
  if (targeted) {
    bullets.push(`Pattern the coach kept steering toward: ${targeted}.`)
  }

  const recovered = (lc.nudgeEvents ?? []).filter((e) => e.learnerRecoveredLater === true).length
  const lingered = (lc.nudgeEvents ?? []).filter((e) => e.learnerRecoveredLater === false).length
  if ((lc.nudgeEvents?.length ?? 0) > 0) {
    if (recovered || lingered) {
      const parts: string[] = []
      if (recovered > 0) {
        parts.push(
          `${recovered} ${recovered === 1 ? 'time' : 'times'} your next reply sounded cleaner after a nudge`,
        )
      }
      if (lingered > 0) {
        parts.push(
          `${lingered} ${lingered === 1 ? 'sticky spot' : 'sticky spots'} that are worth one more short drill`,
        )
      }
      bullets.push(`Recovery in this session: ${parts.join(', and ')}.`)
    } else {
      bullets.push(
        'Recovery in this session: we did not log a clear before-and-after yet — one more conversation will make this easier to read.',
      )
    }
  }

  const nudgeCount = lc.nudgeEvents?.length ?? 0
  if (bullets.length === 0 && nudgeCount > 0) {
    bullets.push(
      nudgeCount === 1
        ? 'One coach moment was logged (recast, clarification, or expansion). You will see it in the coach moments above.'
        : `${nudgeCount} coach moments were logged — recasts, clarifications, or expansions. See them in the coach moments above.`,
    )
  }

  const guideActiveSupportNote =
    coachGuideWhileSpeaking ?
      `With “Guide me while speaking” on, the coach leaned in with shorter, clearer help — mostly around “${targeted || 'overall clarity'}”.`
    : undefined

  if (bullets.length === 0 && guideActiveSupportNote) {
    return { bullets: [guideActiveSupportNote] }
  }
  if (bullets.length === 0) return undefined

  return {
    bullets: bullets.slice(0, 6),
    ...(guideActiveSupportNote ? { guideActiveSupportNote } : {}),
  }
}

export type RoleSaveablePracticeItem = {
  id: string
  title: string
  body: string
  tagCategory: string
}

export function roleRecommendedFollowUps(role: LanguageCoachConversationRole): RecommendedFollowUp[] {
  const modeHint =
    role === 'friend'
      ? 'Friend mode'
      : role === 'colleague'
        ? 'Colleague mode'
        : role === 'dutch_local'
          ? 'Local mode'
          : role === 'date'
            ? 'Date mode'
            : 'Coach mode'

  return [
    {
      type: 'retry',
      title: `Another Language Coach session (${modeHint})`,
      reason: 'Repeat the same role to build routine. Short rounds often produce faster progress.',
      linkedScenarioIdOptional: 'language_coach',
    },
    {
      type: 'phrase',
      title: 'Phrases to practice',
      reason: 'Natural formulas that match your chosen role and learning goal.',
      linkedPhraseOptional: 'Hoe bedoel je precies?',
    },
    {
      type: 'phrase',
      title: 'Follow-up',
      reason: 'One extra question makes the conversation richer, so practice it out loud.',
      linkedPhraseOptional: 'Kun je dat iets concreter zeggen?',
    },
  ]
}

/**
 * Build the "More to practice" card list (formerly "Role practice to save").
 *
 * The 2026-05-16 slim-down removed three card types that didn't earn their space:
 *
 *   - `weak_structure`: was `Weak pattern to train: ${top}` + a generic mini-drill template.
 *     The same template ran for every weakness; "Patterns to work on" and "FROM YOUR CHAT
 *     FLOW" already name the patterns specifically.
 *   - `coach_follow_up`: a fixed Dutch question per role (e.g. `Kun je dat in één zin
 *     samenvatten?`). Claimed to "fit your role" but did not reference any actual exchange
 *     from the session — just a per-role constant.
 *   - `phrasing_upgrade`: duplicated the PHRASES TO REFINE card (which has audio, save, and
 *     tap-a-word on the isolated correction).
 *
 * What remains MUST be session-derived signal:
 *   - `mini_practice`: only emitted when the handoff's `suggestedNextFocusIsSessionDerived`
 *     flag is true (real overused word, learning goal, or named weakness — not the generic
 *     fallback).
 *   - `pronunciation_target`: only when the conversation goal was actually pronunciation.
 */
export function buildRoleSaveablePracticeItems(input: {
  role: LanguageCoachConversationRole
  patterns: string[]
  improvedPhrasing: Array<{ learnerish: string; better: string }>
  handoff: LanguageCoachSessionHandoff
  conversationGoal?: LanguageCoachConversationGoal | null
}): RoleSaveablePracticeItem[] {
  const out: RoleSaveablePracticeItem[] = []

  if (input.handoff.suggestedNextFocusIsSessionDerived) {
    out.push({
      id: 'mini-next-focus',
      title: 'Next mini-drill',
      body: input.handoff.suggestedNextFocus,
      tagCategory: 'mini_practice',
    })
  }

  if (input.conversationGoal === 'pronunciation') {
    out.push({
      id: 'pronunciation-mini-drill',
      title: 'Pronunciation mini-drill',
      body: 'Choose five words from this conversation and say them slowly and clearly. Pay extra attention to word endings and vowel combinations such as ui, eu, and ij.',
      tagCategory: 'pronunciation_target',
    })
  }

  return out.slice(0, 7)
}
