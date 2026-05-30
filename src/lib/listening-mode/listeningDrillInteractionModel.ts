/**
 * Interaction state model for Listening mode drills (FluentCopilot).
 *
 * Phases (derived):
 * - **Listen** — `!submitted`; learner should play audio before answering (soft norm, not blocked).
 * - **Answer** — `!submitted`; tap / typed / spoken surfaces compete to set `selectedIndex`.
 * - **Result** — `submitted`; feedback, optional replay / slower / transcript / meaning, then next.
 *
 * Reveal policy:
 * - Transcript default hidden; shown after submit OR after explicit pre-answer help (`transcriptPeekBeforeAnswer`).
 * - Slower replay unlocks only after the first locked-in answer (`submitted`).
 *
 * @see ListeningDrillCard
 */
export type ListeningAnswerSurface = 'tap' | 'typed' | 'spoken'

export type ListeningDrillInteractionPhase = 'listen' | 'answer' | 'result'

export function drillInteractionPhase(submitted: boolean): ListeningDrillInteractionPhase {
  if (submitted) return 'result'
  return 'answer'
}

/**
 * Slower replay is only offered after the learner locks in an answer (FluentCopilot Listening).
 * @see ListeningDrillCard `canSlowReplay`
 */
export function listeningSlowReplayUnlocked(submitted: boolean): boolean {
  return submitted
}

/**
 * Post-answer reveal row (meaning / transcript toggles) is meaningful once the attempt is locked in,
 * or when the learner already opened transcript help (peek) and controls stay available.
 */
export function listeningPostAnswerRevealSurfaceAllowed(submitted: boolean, transcriptPeekBeforeAnswer: boolean): boolean {
  return submitted || transcriptPeekBeforeAnswer
}
