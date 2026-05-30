import {
  buildEnrichmentSystemMessage,
  buildEnrichmentUserPayload,
  buildReplyOnlySystemMessage,
  buildReplyPlainStreamingSystemMessage,
  buildTurnSystemMessage,
  buildTurnUserPayload,
  type ChatMessage,
  type SpeakLiveTrainPrimaryAnchor,
} from '../../../prompts/buildTurnMessages'
import { buildSpeakLiveFsmPromptBlock } from '../../../domain/speakLive/speakLiveFsmPrompt'
import {
  accumulateAnsweredFactsFromSession,
  buildTrainStationOrchestrationInput,
  buildTrainStationTurnOrchestrationJson,
  computeRecommendedNextResponseTarget,
} from '../../../domain/speakLive/trainStationReplyOrchestration'
import { detectTrainStationSlots } from '../../../domain/speakLive/trainStationSlotState'
import { normalizeTrainStationUtterance } from '../../../domain/speakLive/trainStationTranscriptNormalize'
import { PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID } from '../../../domain/speakLive/publicTransportScenario'
import { buildTrainStationReplyRulesBlock } from '../../../prompts/trainStationReplyPrompt'
import { buildSpeakLiveUltraLeanChatMessages } from '../../../prompts/liveSpeakUltraLeanPrompt'
import { buildLiveSpeakMicroLlmChatMessages } from '../../../prompts/liveSpeakMicroLlmPrompt'
import { useMockLlm } from '../../../config/env'
import {
  isLanguageCoachScenarioSlug,
  useSpeakLiveMicroLlmPrompt,
  useUltraLeanSpeakLivePromptForScenario,
} from '../config/aiProviderConfig'
import { formatSpeakLiveSupportStrategyForPrompt } from '../../../domain/speakLive/speakLiveSupportStrategy'
import {
  appendLanguageCoachCrossSessionMemoryBlock,
  buildLanguageCoachSpeakLivePromptBlock,
} from '../../language-coach/languageCoachSpeakLivePrompt'
import type { AiConversationTurnRequest } from '../contracts/AiConversationTurnRequest'
import type { AiTurnEnrichmentRequest } from '../contracts/AiTurnEnrichmentRequest'

/**
 * Assembles chat messages for a conversation turn. All providers use the same prompt shape.
 */
export function buildTurnChatMessages(request: AiConversationTurnRequest): ChatMessage[] {
  const system = buildTurnSystemMessage({
    scenario: request.scenario,
    persona: request.persona,
    mode: request.mode,
    feedbackMode: request.feedbackMode,
    threadSummary: request.threadSummary,
  })
  const user = buildTurnUserPayload({
    recentMessages: request.recentMessages,
    userText: request.userText,
  })
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

export type LivePromptBuildResult = {
  messages: ChatMessage[]
  metrics?: import('../../../prompts/liveSpeakMicroLlmPrompt').LivePromptMetrics
}

export function buildReplyOnlyChatMessages(request: AiConversationTurnRequest): ChatMessage[] {
  return buildReplyOnlyChatMessagesWithMetrics(request).messages
}

export function buildReplyOnlyChatMessagesWithMetrics(request: AiConversationTurnRequest): LivePromptBuildResult {
  if (request.speakLive && useUltraLeanSpeakLivePromptForScenario(request.scenario.slug)) {
    if (useSpeakLiveMicroLlmPrompt()) {
      const result = buildLiveSpeakMicroLlmChatMessages(request)
      return { messages: result.messages, metrics: result.metrics }
    }
    return { messages: buildSpeakLiveUltraLeanChatMessages(request) }
  }

  const speakLiveFsmBlock =
    request.speakLive != null
      ? isLanguageCoachScenarioSlug(request.scenario.slug)
        ? buildLanguageCoachSpeakLivePromptBlock({
            state: request.speakLive.state,
            scenarioTitle: request.speakLive.scenarioTitle,
            learnerLevelCefr: request.speakLive.learnerLevelCefr ?? null,
            persistentPersonalizationEnglish: request.learningPersonalization?.coachBlockEnglish ?? null,
          })
        : buildSpeakLiveFsmPromptBlock({
            state: request.speakLive.state,
            scenarioGoals: request.speakLive.goalTitles,
            scenarioTitle: request.speakLive.scenarioTitle,
            scenarioSlug: request.scenario.slug,
            verifiedGroundingBlock: request.speakLive.verifiedGroundingBlock ?? null,
          })
      : null

  const isTrainSpeakLive =
    request.speakLive != null &&
    request.scenario.slug === 'train-station' &&
    Boolean(request.speakLive.userMessageId?.trim())

  let trainStationOrchestrationJson: string | null = null
  let trainStationRulesBlock: string | null = null
  let userFooter: string | null = null
  let trainPrimaryAnchor: SpeakLiveTrainPrimaryAnchor | null = null
  if (isTrainSpeakLive && request.speakLive?.userMessageId) {
    const answered = accumulateAnsweredFactsFromSession(request.speakLive.state.scenarioSessionState)
    const orch = buildTrainStationOrchestrationInput({
      scenario: request.scenario,
      slotState: request.speakLive.state.scenarioSessionState,
      userText: request.userText,
      userMessageId: request.speakLive.userMessageId,
      answered,
    })
    trainStationOrchestrationJson = buildTrainStationTurnOrchestrationJson(orch)
    const pt = request.scenario.runtimeConfig
    const isPublicTransportRuntime = pt?.id === PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID
    trainStationRulesBlock = buildTrainStationReplyRulesBlock({
      mockProfile: useMockLlm(),
      transportSubtype: isPublicTransportRuntime ? pt.subType : null,
      transportVariation: isPublicTransportRuntime ? pt.variation : null,
    })
    const { hits } = detectTrainStationSlots(request.userText, request.speakLive.userMessageId)
    const recommended = computeRecommendedNextResponseTarget({
      userText: request.userText,
      userMessageId: request.speakLive.userMessageId,
      answered,
    })
    trainPrimaryAnchor = {
      rawUserLine: request.userText.trim(),
      normalizedLine: normalizeTrainStationUtterance(request.userText),
      detectedGoalIds: hits.map((h) => h.goalId),
      recommendedTarget: recommended,
    }
    userFooter =
      'The PRIMARY GROUNDING section at the top of this message restates the latest learner line — treat it as authoritative over older chat lines.'
  }

  const scenarioSlugNorm = request.scenario.slug.trim().toLowerCase().replace(/-/g, '_')
  if (request.speakLive != null && scenarioSlugNorm === 'explaining_something') {
    const n = request.userText.trim().length
    const explainFooter = [
      '=== EXPLAINING-SCENARIO (full latest utterance) ===',
      `Latest learner utterance length (chars): ${n}`,
      'The `User message` line is the learner’s complete latest Dutch turn — often multiple sentences.',
      'assistantReply MUST: (1) recap every substantive step or time slice they stated, in order (faithful paraphrase — not only the first clause); (2) add concise informative Dutch feedback: optional clearer phrasing and/or typical missing step(s) for this assignment; (3) at most one follow-up question.',
      'speakLiveSignals.rollingSummaryEnglish: list in English every step you heard as separate clauses (e.g. "heard: woke 6am; shower; breakfast; …") — do not collapse to only the first step.',
    ].join('\n')
    userFooter = userFooter ? `${userFooter}\n\n${explainFooter}` : explainFooter
  }
  if (request.speakLive != null && scenarioSlugNorm === 'storytelling') {
    const n = request.userText.trim().length
    const storyFooter = [
      '=== STORYTELLING-SCENARIO (full latest utterance) ===',
      `Latest learner utterance length (chars): ${n}`,
      'The `User message` line is the learner’s complete latest Dutch turn — often multiple sentences.',
      'assistantReply MUST: (1) recap every substantive story beat they stated, in narrative order (faithful paraphrase — not only the opening); (2) add concise informative Dutch listener feedback: optional phrasing tip and/or one missing-arc nudge (setting, middle, outcome); (3) at most one follow-up question.',
      'speakLiveSignals.rollingSummaryEnglish: list in English every beat or time slice you heard as separate clauses — do not collapse to only the first line.',
    ].join('\n')
    userFooter = userFooter ? `${userFooter}\n\n${storyFooter}` : storyFooter
  }

  const speakLiveSupportSummary =
    request.speakLive?.state.supportStrategy != null
      ? formatSpeakLiveSupportStrategyForPrompt(request.speakLive.state.supportStrategy)
      : null

  let system = buildReplyOnlySystemMessage({
    scenario: request.scenario,
    persona: request.persona,
    mode: request.mode,
    threadSummary: request.threadSummary,
    speakLiveFsmBlock,
    speakLiveSupportSummary,
    trainStationOrchestrationJson,
    trainStationRulesBlock,
  })
  if (isLanguageCoachScenarioSlug(request.scenario.slug)) {
    system +=
      '\n\nLanguage Coach override: `assistantReply` is read aloud by neural TTS — put the full conversational coaching there (Dutch), including any correction, brief “Waarom:” explanation, and repeat request. Natural Dutch in persona voice. Implicit recasts, gentle clarification questions, and bounded Dutch-only guide-mode correction loops are allowed inside `assistantReply`. In guide mode, if the learner’s latest Dutch sounds grammatically off, unnatural, weak in word choice, or below the expected CEFR, prefer a short correction loop in this same turn instead of postponing it. Do not add English coaching text to `assistantReply`.' +
      '\n\nTTS safety: never put markdown in `assistantReply` (no `**`, `*`, `_`, `#` headings, bullets with `-`/`*` markers). Plain Dutch sentences only — the speech engine reads punctuation literally.' +
      '\n\nIf the learner repeats your previous line verbatim or almost verbatim, do not echo it back as your whole reply; acknowledge briefly in new words and move the conversation forward (follow-up question, recast, or next micro-step).' +
      '\n\nWhen session state includes a learner-pinned lesson spine (internal English line in `languageCoach`), keep orienting Dutch practice around that target across turns until the learner explicitly asks to change topic or focus.'
  }
  if (scenarioSlugNorm === 'explaining_something' && request.speakLive != null) {
    system +=
      '\n\nExplaining-scenario override: brief Dutch listener feedback (missing steps, smoother phrasing, connectors) inside `assistantReply` is encouraged — short and in-character; not a grammar lecture. This narrows the generic “no coaching in assistantReply” rule for this scene only.'
  }
  if (scenarioSlugNorm === 'storytelling' && request.speakLive != null) {
    system +=
      '\n\nStorytelling-scenario override: brief Dutch listener feedback (missing arc beats, smoother connectors, natural reaction) inside `assistantReply` is encouraged — short and in-character; not a grammar lecture. This narrows the generic “no coaching in assistantReply” rule for this scene only.'
  }
  const lp = request.learningPersonalization
  if (!isLanguageCoachScenarioSlug(request.scenario.slug) && request.speakLive && lp?.scenarioBlockEnglish?.trim()) {
    system += `\n\n${lp.scenarioBlockEnglish.trim()}`
  }
  /** Text Language Coach: FSM block is absent — inject cross-session coach memory here (Speak Live already embeds it in the LC block). */
  if (!request.speakLive && isLanguageCoachScenarioSlug(request.scenario.slug)) {
    system = appendLanguageCoachCrossSessionMemoryBlock(system, lp?.coachBlockEnglish)
  }
  const user = buildTurnUserPayload({
    recentMessages: request.recentMessages,
    userText: request.userText,
    footerNote: userFooter,
    speakLiveTrainPrimaryAnchor: trainPrimaryAnchor,
  })
  return {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  }
}

export function buildAssistantReplyPlainTextMessages(request: AiConversationTurnRequest): ChatMessage[] {
  let system = buildReplyPlainStreamingSystemMessage({
    scenario: request.scenario,
    persona: request.persona,
    mode: request.mode,
    threadSummary: request.threadSummary,
  })
  if (isLanguageCoachScenarioSlug(request.scenario.slug)) {
    system = appendLanguageCoachCrossSessionMemoryBlock(system, request.learningPersonalization?.coachBlockEnglish)
  }
  const user = buildTurnUserPayload({
    recentMessages: request.recentMessages,
    userText: request.userText,
  })
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

export function buildEnrichmentChatMessages(request: AiTurnEnrichmentRequest): ChatMessage[] {
  const system = buildEnrichmentSystemMessage({
    scenario: request.scenario,
    persona: request.persona,
    mode: request.mode,
    feedbackMode: request.feedbackMode,
    threadSummary: request.threadSummary,
  })
  const user = buildEnrichmentUserPayload({
    recentMessages: request.recentMessages,
    userText: request.userText,
    assistantReply: request.assistantReply,
  })
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}
