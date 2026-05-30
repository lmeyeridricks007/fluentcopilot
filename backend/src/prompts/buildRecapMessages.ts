import type {
  ConversationMessage,
  ConversationRecapGenerationContext,
  ConversationSummary,
} from '../models/contracts'

function transcriptLine(m: ConversationMessage): string {
  const meta = m.metadata
  if (m.sender !== 'user' || !meta || typeof meta !== 'object') {
    return `${m.sender}: ${m.content}`
  }
  const inputMode = meta.inputMode
  const ot = meta.originalTranscript
  if (inputMode === 'speech' && typeof ot === 'string' && ot.trim()) {
    return `${m.sender}: ${m.content} [voice-stt: "${ot.trim().slice(0, 500)}"]`
  }
  if (inputMode === 'speech') {
    return `${m.sender}: ${m.content} [voice input]`
  }
  return `${m.sender}: ${m.content}`
}

export function buildRecapSystemMessage(recapContext?: ConversationRecapGenerationContext): string {
  const structuredTrain = Boolean(recapContext?.trainStationLiveRecapInputJson?.trim())
  const lines = [
    'You produce a single JSON object for end-of-conversation recap (no markdown).',
    'Shape:',
    '{',
    '  "whatWentWell": string[],',
    '  "whatToImprove": string[],',
    '  "correctedPhrases": { "original": string, "corrected": string, "note": string }[],',
    '  "suggestedNextAction": string,',
    '  "recommendedNextStep": string,',
    '  "saveWordCandidates": string[],',
    '  "savedWordSuggestions": string[],',
    '  "pronunciationHighlights": { "phrase": string, "tip": string }[],',
    '  "goalsCompleted": string[],',
    '  "goalsMissed": string[],',
    '  "languageNotes": string[],',
    '  "transcriptEvidence": { "goalId": string, "quote": string }[],',
    '  "dutchUpgrade": string[]',
    '}',
    'Rules:',
    '- Every whatWentWell / whatToImprove / languageNotes line must be grounded in this thread’s transcript, deferred coaching notes, or verified structured session state — no generic praise.',
    '- When "PRIMARY GROUNDING (LiveScenarioRecapInput)" is present, it overrides rolling summaries and free-form session notes for scenario facts: achievedGoals, pendingGoals, transcriptEvidence, and turnFactsDigest are authoritative.',
    '- goalsCompleted MUST include every goalId listed in that block’s achievedGoals / transcriptEvidence. goalsMissed MUST be drawn ONLY from pendingGoals in that block (never invent missed goals that are already achieved).',
    '- Never claim the learner did not ask about delay/punctuality or departure time if ASK_DELAY_STATUS or ASK_DEPARTURE_TIME appears in achievedGoals or transcriptEvidence.',
    '- Separate concerns: (1) scenario completion via goalsCompleted/goalsMissed, (2) language quality via languageNotes / correctedPhrases, (3) naturalness/pronunciation via pronunciationHighlights.',
    '- pronunciationHighlights: 0–5 items. Each "phrase" should quote or closely paraphrase something the user actually said (see [voice-stt: ...] lines when present). "tip" is one concrete pronunciation or rhythm tip (English). Use [] if there were no user speech lines to reference.',
    '- dutchUpgrade: 0–6 short bullets (English) naming one concrete Dutch upgrade tied to transcript lines.',
    'Tone: concise, adult, practical. English for meta; reference Dutch phrases where needed.',
  ]
  if (recapContext?.conversationSurface === 'speak_live') {
    lines.push(
      'Speak Live session: prioritize voice-stt lines and scenario goals when judging progress. suggestedNextAction / recommendedNextStep should name one specific drill for this scenario.'
    )
    if (recapContext.trainStationSlotRecapSummary?.trim() && !structuredTrain) {
      lines.push(
        'When "Structured slot summary" is present, treat it as verified progress from the session state engine — align whatWentWell with achieved slots when the transcript supports it.'
      )
    }
  }
  return lines.join('\n')
}

export function buildRecapUserPayload(
  messages: ConversationMessage[],
  feedbackNotes: string,
  recapContext?: ConversationRecapGenerationContext
): string {
  const transcript = messages.map(transcriptLine).join('\n')
  const structuredJson = recapContext?.trainStationLiveRecapInputJson?.trim()
  const ctxLines: string[] = []
  if (recapContext) {
    ctxLines.push(`Scenario: ${recapContext.scenarioTitle}`)
    if (recapContext.scenarioGoals.length > 0) {
      ctxLines.push(`Scenario goals:\n- ${recapContext.scenarioGoals.join('\n- ')}`)
    }
    if (recapContext.threadCurrentStage?.trim()) {
      ctxLines.push(`Thread stage: ${recapContext.threadCurrentStage.trim()}`)
    }
    if (recapContext.speakLiveGoalsCompletedIndexes?.length) {
      ctxLines.push(
        `Verified scenario goals marked completed (0-based indexes): ${recapContext.speakLiveGoalsCompletedIndexes.join(', ')}`
      )
    }
    if (!structuredJson && recapContext.trainStationSlotRecapSummary?.trim()) {
      ctxLines.push(`Structured slot summary: ${recapContext.trainStationSlotRecapSummary.trim()}`)
    }
  }
  const ctxBlock = ctxLines.length > 0 ? `${ctxLines.join('\n')}\n\n` : ''

  const rolling =
    recapContext?.speakLiveRollingSummary?.trim() && structuredJson
      ? `\n\n--- LOWEST PRIORITY (legacy rolling summary; may be stale — never contradict PRIMARY GROUNDING) ---\n${recapContext.speakLiveRollingSummary.trim().slice(0, 1200)}`
      : recapContext?.speakLiveRollingSummary?.trim()
        ? `\n\nSession notes (English): ${recapContext.speakLiveRollingSummary.trim().slice(0, 2000)}`
        : ''

  const primary = structuredJson
    ? `--- PRIMARY GROUNDING (LiveScenarioRecapInput JSON) ---\n${structuredJson}\n\n`
    : ''

  return `${primary}${ctxBlock}Full transcript:\n${transcript}\n\nDeferred coaching notes (if any):\n${feedbackNotes || '(none)'}${rolling}`
}

export function emptySummary(threadId: string): ConversationSummary {
  return {
    threadId,
    whatWentWell: [],
    whatToImprove: [],
    correctedPhrases: [],
    suggestedNextAction: 'Continue practicing this scenario tomorrow.',
    recommendedNextStep: 'Continue practicing this scenario tomorrow.',
    saveWordCandidates: [],
    pronunciationHighlights: [],
  }
}
