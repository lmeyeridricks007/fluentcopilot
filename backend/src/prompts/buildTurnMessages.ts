import type { ConversationMessage, ConversationMode, FeedbackMode, PersonaConfig, ScenarioConfig } from '../models/contracts'
import { buildFeedbackPolicyBlock } from '../services/ai/orchestration/FeedbackPromptBuilder'
import { buildScenarioPersonaModeBlock } from '../services/ai/orchestration/ScenarioPromptBuilder'
import { ENRICHMENT_JSON_CONTRACT, REPLY_ONLY_JSON_CONTRACT, TURN_OUTPUT_JSON_CONTRACT } from './jsonContracts'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export function buildTurnSystemMessage(params: {
  scenario: ScenarioConfig
  persona: PersonaConfig
  mode: ConversationMode
  feedbackMode: FeedbackMode
  threadSummary: string | null
}): string {
  const scenarioBlock = buildScenarioPersonaModeBlock({
    scenario: params.scenario,
    persona: params.persona,
    mode: params.mode,
  })
  const fb = buildFeedbackPolicyBlock(params.feedbackMode)
  return [
    'You are the orchestration brain for a Dutch learning chat. Output a single JSON object only, no markdown.',
    'Contract:',
    TURN_OUTPUT_JSON_CONTRACT.trim(),
    '',
    scenarioBlock,
    fb,
    params.threadSummary
      ? `Rolling thread summary (English, maintain in updatedSummary): ${params.threadSummary}`
      : 'No prior summary yet — set updatedSummary to a short English recap after this turn.',
  ].join('\n')
}

export type SpeakLiveTrainPrimaryAnchor = {
  rawUserLine: string
  normalizedLine: string
  detectedGoalIds: string[]
  recommendedTarget: string
}

export function buildTurnUserPayload(params: {
  recentMessages: ConversationMessage[]
  userText: string
  /** Extra emphasis (e.g. Speak Live Train Station: answer the last line first). */
  footerNote?: string | null
  /** Train Station Speak Live: repeat latest line + detectors so the model cannot “lose” the utterance below history. */
  speakLiveTrainPrimaryAnchor?: SpeakLiveTrainPrimaryAnchor | null
}): string {
  const lines = params.recentMessages.map((m) => {
    const who = m.sender === 'user' ? 'User' : m.sender === 'assistant' ? 'Assistant' : m.sender
    return `${who}: ${m.content}`
  })
  const anchor = params.speakLiveTrainPrimaryAnchor
  const anchorBlock = anchor
    ? [
        '=== PRIMARY GROUNDING (non-negotiable) ===',
        'The assistant MUST answer the learner’s latest Dutch line below first. Do not invent questions they did not ask.',
        `Latest raw: ${anchor.rawUserLine}`,
        `Latest normalized (rule input): ${anchor.normalizedLine || '(empty)'}`,
        `Rule-detected goal IDs this turn: ${anchor.detectedGoalIds.length ? anchor.detectedGoalIds.join(', ') : '(none)'}`,
        `Ordered response instructions (English): ${anchor.recommendedTarget}`,
        '',
      ].join('\n')
    : ''

  return [
    anchorBlock,
    'Recent conversation (oldest first):',
    lines.length ? lines.join('\n') : '(empty)',
    '',
    `User message (Dutch, may mix English): ${params.userText}`,
    params.footerNote?.trim() ? `\n${params.footerNote.trim()}` : '',
    '',
    'Respond with JSON per contract. assistantReply must be Dutch in persona voice.',
  ].join('\n')
}

/** Stage A — no per-turn coaching contract in system prompt (faster, smaller completion). */
export function buildReplyOnlySystemMessage(params: {
  scenario: ScenarioConfig
  persona: PersonaConfig
  mode: ConversationMode
  threadSummary: string | null
  speakLiveFsmBlock?: string | null
  /** Speak Live: replaces guided/free pacing line when present. */
  speakLiveSupportSummary?: string | null
  /** Train Station: structured orchestration JSON (system-only). */
  trainStationOrchestrationJson?: string | null
  trainStationRulesBlock?: string | null
}): string {
  const scenarioBlock = buildScenarioPersonaModeBlock({
    scenario: params.scenario,
    persona: params.persona,
    mode: params.mode,
    speakLiveSupportSummary: params.speakLiveSupportSummary,
  })
  const trainOrch =
    params.trainStationOrchestrationJson?.trim() && params.trainStationRulesBlock?.trim()
      ? `--- Turn orchestration input (JSON; obey recommendedNextResponseTarget) ---\n${params.trainStationOrchestrationJson.trim()}\n${params.trainStationRulesBlock.trim()}`
      : params.trainStationOrchestrationJson?.trim()
        ? `--- Turn orchestration input (JSON; obey recommendedNextResponseTarget) ---\n${params.trainStationOrchestrationJson.trim()}`
        : params.trainStationRulesBlock?.trim()
          ? params.trainStationRulesBlock.trim()
          : ''

  return [
    'You are the in-scene Dutch conversation partner (not a meta narrator). Output a single JSON object only, no markdown.',
    'Contract:',
    REPLY_ONLY_JSON_CONTRACT.trim(),
    '',
    scenarioBlock,
    params.threadSummary
      ? `Rolling thread summary (English, context only — do not paste to learner): ${params.threadSummary}`
      : 'No prior summary yet — infer goals from scenario and first turns.',
    '',
    trainOrch ? `${trainOrch}\n` : '',
    params.speakLiveFsmBlock ? `${params.speakLiveFsmBlock}\n` : '',
    '',
    'Do not include coaching, corrections, or English tips in assistantReply — stay in character.',
    'When trainTurnResponse is present in the contract, fill it with English slot labels matching what your Dutch reply actually covered.',
    'Turn orchestration JSON: assistantReply must address latestTranscript / normalizedLatestTranscript; never contradict thisTurnRuleHits evidence.',
  ].join('\n')
}

/** Streaming stage A — plain Dutch lines only (no JSON). */
export function buildReplyPlainStreamingSystemMessage(params: {
  scenario: ScenarioConfig
  persona: PersonaConfig
  mode: ConversationMode
  threadSummary: string | null
}): string {
  const scenarioBlock = buildScenarioPersonaModeBlock({
    scenario: params.scenario,
    persona: params.persona,
    mode: params.mode,
  })
  return [
    'You are the in-scene Dutch conversation partner. Reply ONLY with what the assistant says in Dutch, in character.',
    'Rules: no JSON, no quotes, no labels, no markdown, no English meta-commentary — just the spoken line(s) the learner reads as the chat bubble.',
    '',
    scenarioBlock,
    params.threadSummary
      ? `Context (English, do not output): ${params.threadSummary}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Stage B — coach + lexical + summary using the fixed assistant line. */
export function buildEnrichmentSystemMessage(params: {
  scenario: ScenarioConfig
  persona: PersonaConfig
  mode: ConversationMode
  feedbackMode: FeedbackMode
  threadSummary: string | null
}): string {
  const scenarioBlock = buildScenarioPersonaModeBlock({
    scenario: params.scenario,
    persona: params.persona,
    mode: params.mode,
  })
  const fb = buildFeedbackPolicyBlock(params.feedbackMode)
  return [
    'You are the post-turn coach for a Dutch learning chat. Output a single JSON object only, no markdown.',
    'Contract:',
    ENRICHMENT_JSON_CONTRACT.trim(),
    '',
    scenarioBlock,
    fb,
    params.threadSummary
      ? `Prior rolling summary (English, update in updatedSummary): ${params.threadSummary}`
      : 'No prior summary — set updatedSummary to a compact English recap after this turn.',
  ].join('\n')
}

export function buildEnrichmentUserPayload(params: {
  recentMessages: ConversationMessage[]
  userText: string
  assistantReply: string
}): string {
  const lines = params.recentMessages.map((m) => {
    const who = m.sender === 'user' ? 'User' : m.sender === 'assistant' ? 'Assistant' : m.sender
    return `${who}: ${m.content}`
  })
  return [
    'Recent conversation (oldest first):',
    lines.length ? lines.join('\n') : '(empty)',
    '',
    `User message: ${params.userText}`,
    '',
    `Assistant reply already shown to learner (do not change wording; coach around it): ${params.assistantReply}`,
    '',
    'Return JSON per contract. If feedbackMode policy is end-only, set feedback to null.',
  ].join('\n')
}
