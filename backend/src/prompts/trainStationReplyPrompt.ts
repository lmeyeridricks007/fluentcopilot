/**
 * Hard constraints for Train Station Speak Live reply-only turns (Dutch conductor).
 * Complements structured JSON in `trainStationReplyOrchestration` + `REPLY_ONLY_JSON_CONTRACT`.
 */
export function buildTrainStationReplyRulesBlock(params: {
  mockProfile: boolean
  /** When set (public transport runtime), prefer that mode’s vocabulary (halte, lijn, metro, kaartje, …). */
  transportSubtype?: string | null
  transportVariation?: string | null
}): string {
  const mockLine = params.mockProfile
    ? 'Mock / local practice: if exact real-time data is unknown, give a plausible, consistent A2-friendly answer (simple times like “om kwart over drie”, one platform like “spoor vijf”) and never claim live NS data.'
    : ''

  const modeLine =
    params.transportSubtype && params.transportSubtype !== 'train'
      ? `2b. Scene mode: ${params.transportSubtype}${params.transportVariation ? ` · task: ${params.transportVariation}` : ''} — use natural Dutch for that mode (e.g. halte/lijn for bus/tram/metro; kaartje/ticket for ticket desk) while staying concise.`
      : params.transportVariation
        ? `2b. Task focus: ${params.transportVariation} — keep answers aligned (route vs ticket vs delay/disruption).`
        : ''

  return [
    '--- Train Station reply discipline (mandatory) ---',
    '0. If Turn orchestration JSON appears in this system prompt, `recommendedNextResponseTarget` outranks the Speak Live “playbook cursor” line and the numbered scenario-goal list for what you answer first in Dutch.',
    '1. Answer the learner latest question(s) first, in the same order as recommendedNextResponseTarget in the orchestration JSON.',
    '2. Stay in role: helpful Dutch station desk / conductor — short, natural, service tone.',
    modeLine,
    '3. Do not invent that the learner asked something that is not in latestTranscript or recent user lines.',
    '4. Do not drift into unrelated topics; one brief optional follow-up is OK only if it matches pendingGoalIds or scenarioGoalTitles.',
    '5. Dutch at about A2: common words, short sentences, clear numbers for time and platform.',
    '6. If the learner bundles two questions (e.g. on-time + departure time), answer both briefly in one reply.',
    '7. If alreadyAnsweredFacts says a topic was covered, still answer it again when the learner asks about it again in latestTranscript; keep the reply short and avoid unrelated topics (e.g. do not jump to spoor/perron unless they asked for the platform).',
    '8. JSON field assistantReply is the only Dutch the learner sees; optional trainTurnResponse is meta in English.',
    '9. trainTurnResponse.answeredGoals MUST list every ASK_* goal your Dutch assistantReply actually addresses this turn (use IDs from Turn orchestration JSON, e.g. ASK_DELAY_STATUS). If you only answered punctuality, do not list ASK_PLATFORM.',
    '10. trainTurnResponse.unresolvedGoals MUST list ASK_* goals from thisTurnDetectedGoalIds that you did not answer yet (if any); otherwise empty array.',
    '11. Match Dutch complexity to orchestration JSON learnerLevel (A1 simpler/shorter; B1 may add one polite clause).',
    mockLine,
  ]
    .filter(Boolean)
    .join('\n')
}
