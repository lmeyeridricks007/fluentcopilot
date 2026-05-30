import type { SpeakLivePersistedState } from './speakLiveFsm'
import { SPEAK_LIVE_PHASES } from './speakLiveFsm'

export type SpeakLivePromptContext = {
  state: SpeakLivePersistedState
  scenarioGoals: string[]
  scenarioTitle: string
  /** Used for scenario-specific brevity / turn shape (e.g. explaining_something). */
  scenarioSlug?: string | null
  /** Deterministic facts from the latest learner line (train-station, etc.). */
  verifiedGroundingBlock?: string | null
}

/**
 * Injected into reply-only system prompt for `conversationSurface === speak_live`.
 * Keeps the assistant aligned to a structured arc, not random small talk.
 */
export function buildSpeakLiveFsmPromptBlock(ctx: SpeakLivePromptContext): string {
  const { state, scenarioGoals, scenarioTitle, verifiedGroundingBlock } = ctx
  const slugNorm = (ctx.scenarioSlug ?? '').trim().toLowerCase().replace(/-/g, '_')
  const goalsNumbered = scenarioGoals.map((g, i) => `${i + 1}. ${g}`).join('\n')
  const completed = state.goalsCompleted.length ? state.goalsCompleted.join(', ') : '(none)'
  const nextObjective =
    state.phase === 'execution' && scenarioGoals.length > 0
      ? (() => {
          const cursor = scenarioGoals[state.goalIndex] ?? scenarioGoals[scenarioGoals.length - 1]
          return `Playbook cursor (goal index ${state.goalIndex}, for bookkeeping only): “${cursor}”. If Turn orchestration JSON is present in the system prompt, IGNORE the playbook cursor whenever it conflicts with latestTranscript / recommendedNextResponseTarget — never answer the playbook topic when the learner asked something else (e.g. do not give spoor/perron when they only asked about punctuality). The PRIMARY GROUNDING block in the user message repeats the latest line; treat it as highest priority. For booking/reservations: never re-ask for day, clock time, party size, or name if rolling summary or recent transcript already contains that fact—confirm briefly or move to the next missing detail.`
        })()
      : state.phase === 'intent_detection'
        ? 'Infer what the learner wants to accomplish in this scene, in one short line of reasoning (do not output that reasoning in assistantReply).'
        : state.phase === 'clarification'
          ? 'Ask at most one clear Dutch follow-up to disambiguate, stay in character.'
          : state.phase === 'closing'
            ? 'Close warmly in Dutch; keep it brief.'
            : 'Open with a short natural Dutch greeting in persona — one or two sentences max.'

  return [
    '--- Speak Live structured session ---',
    `Scene: ${scenarioTitle}`,
    `Current stage: ${state.phase} (must progress logically across turns; valid phases: ${SPEAK_LIVE_PHASES.join(', ')}).`,
    state.intentLabel ? `Detected intent label (hint): ${state.intentLabel}` : '',
    `Scenario goals (ordered):\n${goalsNumbered || '(none configured)'}`,
    `Goal progress: completed indexes [${completed}], active index: ${state.goalIndex}.`,
    state.rollingSummaryEnglish
      ? `Rolling summary (English, do not read aloud): ${state.rollingSummaryEnglish}`
      : '',
    `Turn guidance: ${nextObjective}`,
    '',
    'You MUST also output JSON field `speakLiveSignals` (see contract) each turn:',
    '- `nextPhase`: your recommended next stage (must respect the logical arc).',
    '- `needsClarification`: true if the learner is vague or contradictory.',
    '- `goalIndexesCompleted`: which goal indices (0-based) the learner satisfied this turn.',
    '- `advancePrimaryGoal`: true if the active goal is clearly satisfied.',
    '- `readyForClosing`: true if the scene should wind down politely.',
    '- `rollingSummaryEnglish`: ≤400 chars English — facts, intent, blockers for the NEXT model call.',
    '',
    'Stay in Dutch for `assistantReply`; signals are meta for orchestration only.',
    '',
    'Hard rule: `assistantReply` must contain zero English — no “Hi”, “what can I get you”, no translation pairs. Dutch only, same as a Dutch staff member speaking to a Dutch customer.',
    '',
    slugNorm === 'explaining_something'
      ? 'Speak Live — `explaining_something` reply shape: `assistantReply` may use up to 4–5 compact Dutch sentences. After the learner explains: (1) brief listen signal; (2) **faithful recap** of what *they* said (stay close to their wording/order—do not output a polished “correct manual” that replaces their answer); (3) **informative feedback**: briefly name missing steps for the task and/or one light phrasing/connector tip; (4) at most one follow-up question—or close if enough. Do not skip their steps; do not invent steps they did not say. No long grammar lecture; no English in assistantReply.'
      : slugNorm === 'storytelling'
        ? 'Speak Live — `storytelling` reply shape: `assistantReply` may use up to 4–5 compact Dutch sentences. After the learner tells a story: (1) brief listen signal; (2) **faithful recap** of the beats they shared (order and gist—do not replace their story with a tidier rewrite); (3) **informative feedback**: one light tip on arc or connectors if useful; (4) at most one follow-up question—or close if enough. Do not drop middle or ending beats they said; do not invent episodes they did not say. No long grammar lecture; no English in assistantReply.'
        : 'Speak Live brevity (latency): `assistantReply` must be at most 2–3 short Dutch sentences unless the learner explicitly asked for a long explanation. Answer directly; one brief follow-up question is OK.',
    verifiedGroundingBlock?.trim() ? `\n${verifiedGroundingBlock.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
