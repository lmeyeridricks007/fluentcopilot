import type {
  ApiConversationMessage,
  ApiConversationSummary,
  ApiConversationThread,
  ApiFeedbackItem,
  ApiPersonaConfig,
  ApiScenarioConfig,
  EnrichTurnResponse,
} from './apiTypes'
import type {
  ChatMessage,
  ConversationMode,
  ConversationRecapViewModel,
  ConversationSummary,
  ConversationThread,
  FeedbackItem,
  FeedbackMode,
  PersonaConfig,
  ScenarioConfig,
  ThreadStatus,
} from '@/features/feature1-chat/types'
import type { ConversationSurface } from '@/lib/conversation/conversationSurface'

const AVATAR_BY_KEY: Record<string, string> = {
  'train-station': '🚆',
  ns_station_assistant: '🚆',
}

export function mapApiFeedbackModeToUi(mode: string): FeedbackMode {
  const m = (mode ?? '').toLowerCase()
  if (m === 'turn' || m === 'after_each') return 'after_each'
  return 'at_end'
}

export function mapUiFeedbackModeToApi(mode: FeedbackMode): 'turn' | 'end' {
  return mode === 'after_each' ? 'turn' : 'end'
}

function mapDifficulty(band: string): ScenarioConfig['difficulty'] {
  const u = band.toUpperCase()
  if (u === 'A1' || u === 'A2' || u === 'B1') return u as ScenarioConfig['difficulty']
  return 'A2'
}

export function mapApiScenarioToUi(s: ApiScenarioConfig, personaId: string): ScenarioConfig {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    description: s.description,
    userRole: s.userRole,
    personaId,
    goals: s.goals,
    starterSuggestions: s.starterSuggestions,
    difficulty: mapDifficulty(s.difficultyBand),
    tags: s.tags,
  }
}

export function mapApiPersonaToUi(p: ApiPersonaConfig): PersonaConfig {
  const emoji = p.avatarKey ? (AVATAR_BY_KEY[p.avatarKey] ?? '🙂') : '🙂'
  return {
    id: p.id,
    displayName: p.displayName,
    role: p.role,
    avatarEmoji: emoji,
    tone: p.tone,
    introLine: p.introLine,
  }
}

export function mapApiSenderToUi(sender: ApiConversationMessage['sender']): ChatMessage['sender'] {
  if (sender === 'assistant') return 'ai'
  if (sender === 'user') return 'user'
  if (sender === 'system') return 'system'
  return 'coach'
}

export function mapApiMessageToUi(m: ApiConversationMessage): ChatMessage {
  const meta = m.metadata
  const translationHint =
    meta && typeof meta.translationHint === 'string' ? meta.translationHint : undefined
  const saveWordCandidates =
    meta && Array.isArray(meta.saveWordCandidates)
      ? (meta.saveWordCandidates as string[]).filter((x) => typeof x === 'string')
      : undefined
  const audioUrl =
    meta && typeof meta.audioUrl === 'string' && meta.audioUrl.trim() ? meta.audioUrl.trim() : undefined
  const inputMode =
    meta && (meta.inputMode === 'text' || meta.inputMode === 'speech') ? meta.inputMode : undefined
  const originalTranscript =
    meta && typeof meta.originalTranscript === 'string' ? meta.originalTranscript : undefined
  const audioReference =
    meta && typeof meta.audioReference === 'string' ? meta.audioReference : undefined
  return {
    id: m.id,
    threadId: m.threadId,
    sender: mapApiSenderToUi(m.sender),
    content: m.content,
    createdAt: m.createdAt,
    type: m.messageType === 'system_banner' ? 'system_banner' : 'text',
    metadata: {
      translationHint,
      saveWordCandidates,
      audioUrl,
      inputMode,
      originalTranscript,
      audioReference,
    },
  }
}

export function mapApiFeedbackToUi(f: ApiFeedbackItem): FeedbackItem {
  return {
    id: f.id,
    linkedUserMessageId: f.linkedMessageId,
    original: f.originalText,
    corrected: f.correctedText,
    explanation: f.explanation,
    saveCandidates: [],
    category: f.category || 'phrasing',
  }
}

export function mapApiThreadToUiPartial(t: ApiConversationThread): Pick<
  ConversationThread,
  | 'id'
  | 'scenarioId'
  | 'personaId'
  | 'mode'
  | 'conversationSurface'
  | 'feedbackMode'
  | 'status'
  | 'summary'
  | 'currentStage'
  | 'createdAt'
  | 'updatedAt'
> {
  const conversationSurface: ConversationSurface =
    t.conversationSurface === 'speak_live' ? 'speak_live' : 'text'
  return {
    id: t.id,
    scenarioId: t.scenarioId,
    personaId: t.personaId,
    mode: t.mode as ConversationMode,
    conversationSurface,
    feedbackMode: mapApiFeedbackModeToUi(t.feedbackMode),
    status: t.status as ThreadStatus,
    summary: null,
    currentStage: (t.currentStage ?? 'opening') as ConversationThread['currentStage'],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

export type MappedConversationSession = {
  thread: ApiConversationThread
  messages: ChatMessage[]
  feedback: FeedbackItem[]
  scenario: ScenarioConfig
  persona: PersonaConfig
}

export function mapGetConversationResponse(input: {
  thread: ApiConversationThread
  messages: ApiConversationMessage[]
  scenario: ApiScenarioConfig
  persona: ApiPersonaConfig
  feedback: ApiFeedbackItem[]
}): MappedConversationSession {
  return {
    thread: input.thread,
    messages: input.messages.map(mapApiMessageToUi),
    feedback: input.feedback.map(mapApiFeedbackToUi),
    scenario: mapApiScenarioToUi(input.scenario, input.thread.personaId),
    persona: mapApiPersonaToUi(input.persona),
  }
}

/** Hydrate React Query immediately after `POST /conversations/start` so the thread view is not blank. */
export function mapStartConversationResponseToMappedSession(input: {
  thread: ApiConversationThread
  messages: ApiConversationMessage[]
  scenario: ApiScenarioConfig
  persona: ApiPersonaConfig
}): MappedConversationSession {
  return {
    thread: input.thread,
    messages: input.messages.map(mapApiMessageToUi),
    feedback: [],
    scenario: mapApiScenarioToUi(input.scenario, input.thread.personaId),
    persona: mapApiPersonaToUi(input.persona),
  }
}

export function buildConversationThreadView(
  session: MappedConversationSession,
  opts: {
    assistantTyping: boolean
    contextDismissed: boolean
  }
): ConversationThread {
  const base = mapApiThreadToUiPartial(session.thread)
  return {
    ...base,
    messages: session.messages,
    pendingFeedback: session.feedback,
    assistantTyping: opts.assistantTyping,
    contextDismissed: opts.contextDismissed,
    stagesReached: [base.currentStage],
  }
}

export function mergeEnrichmentIntoSession(
  prev: MappedConversationSession,
  enrich: EnrichTurnResponse
): MappedConversationSession {
  const assistantUi = mapApiMessageToUi(enrich.assistantMessage)
  const messages = prev.messages.map((m) => (m.id === assistantUi.id ? assistantUi : m))
  let feedback = prev.feedback
  if (enrich.feedback) {
    const row = mapApiFeedbackToUi(enrich.feedback)
    feedback = [...prev.feedback.filter((f) => f.id !== row.id), row]
  }
  return {
    ...prev,
    thread: enrich.thread,
    messages,
    feedback,
    scenario: { ...prev.scenario, personaId: enrich.thread.personaId },
  }
}

export function mergeSendMessageIntoSession(
  prev: MappedConversationSession,
  send: {
    userMessage: ApiConversationMessage
    assistantMessage: ApiConversationMessage
    feedback: ApiFeedbackItem | null
    saveWordCandidates: string[]
    thread: ApiConversationThread
  }
): MappedConversationSession {
  const user = mapApiMessageToUi(send.userMessage)
  const assistantRaw = mapApiMessageToUi(send.assistantMessage)
  const assistant: ChatMessage = {
    ...assistantRaw,
    metadata: {
      ...assistantRaw.metadata,
      saveWordCandidates:
        send.saveWordCandidates.length > 0 ? send.saveWordCandidates : assistantRaw.metadata?.saveWordCandidates,
    },
  }

  const withoutDup = prev.messages.filter((m) => m.id !== user.id && m.id !== assistant.id)
  const messages = [...withoutDup, user, assistant].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  let feedback = prev.feedback
  if (send.feedback) {
    const row = mapApiFeedbackToUi(send.feedback)
    feedback = [...prev.feedback.filter((f) => f.id !== row.id), row]
  }

  return {
    ...prev,
    thread: send.thread,
    messages,
    feedback,
    scenario: { ...prev.scenario, personaId: send.thread.personaId },
  }
}

const TRAIN_GOAL_LABELS: Record<string, string> = {
  ASK_DELAY_STATUS: 'Delay / on time',
  ASK_DEPARTURE_TIME: 'Departure time',
  ASK_PLATFORM: 'Platform / track',
  ASK_DESTINATION: 'Destination / route',
  CONFIRM_DETAIL: 'Confirming a detail',
  THANK_AND_CLOSE: 'Closing / thanks',
}

function trainGoalLabel(id: string): string {
  return TRAIN_GOAL_LABELS[id] ?? id.replace(/_/g, ' ').toLowerCase()
}

export function mapApiSummaryToRecapView(s: ApiConversationSummary): ConversationRecapViewModel {
  const c = [...new Set([...(s.saveWordCandidates ?? []), ...(s.savedWordSuggestions ?? [])])].filter(Boolean)
  const highlights = (s.pronunciationHighlights ?? [])
    .filter((h) => h && typeof h.phrase === 'string' && typeof h.tip === 'string')
    .map((h) => ({ phrase: h.phrase.trim(), tip: h.tip.trim() }))
    .filter((h) => h.phrase && h.tip)

  const evidence = s.transcriptEvidence ?? []
  const youAskedAbout =
    evidence.length > 0
      ? evidence
          .filter((e) => e && typeof e.goalId === 'string')
          .map((e) => ({
            goalId: e.goalId,
            label: trainGoalLabel(e.goalId),
            quote: typeof e.quote === 'string' && e.quote.trim() ? e.quote.trim() : undefined,
          }))
      : (s.goalsCompleted ?? [])
          .filter((id) => typeof id === 'string' && id.trim())
          .map((id) => ({
            goalId: id.trim(),
            label: trainGoalLabel(id.trim()),
            quote: undefined,
          }))

  const pendingLabels = (s.goalsMissed ?? []).filter((id) => typeof id === 'string').map((id) => trainGoalLabel(id.trim()))

  const tryNext = (s.recommendedNextStep ?? s.suggestedNextAction).trim()
  const dutchUpgradeLines = (s.dutchUpgrade?.length ? s.dutchUpgrade : s.languageNotes)?.filter(
    (x) => typeof x === 'string' && x.trim()
  )

  return {
    handledWell: s.whatWentWell,
    improvePhrases: s.correctedPhrases ?? [],
    whatToImprove: s.whatToImprove ?? [],
    usefulPhrase: c[0],
    usefulWord: c[1],
    nextStep: tryNext || s.suggestedNextAction,
    pronunciationHighlights: highlights.length > 0 ? highlights : undefined,
    youAskedAbout: youAskedAbout.length > 0 ? youAskedAbout : undefined,
    youCouldStillAdd: pendingLabels.length > 0 ? pendingLabels : undefined,
    tryNext: tryNext || undefined,
    dutchUpgradeLines: dutchUpgradeLines && dutchUpgradeLines.length > 0 ? dutchUpgradeLines : undefined,
  }
}

export function parseThreadSummaryTextToRecap(summaryText: string | null): ConversationRecapViewModel | null {
  if (!summaryText?.trim()) return null
  try {
    const o = JSON.parse(summaryText) as ApiConversationSummary
    if (o && Array.isArray(o.whatWentWell)) return mapApiSummaryToRecapView(o)
  } catch {
    /* active threads use plain-text running summary */
  }
  return null
}

export function mockConversationSummaryToRecapView(s: ConversationSummary): ConversationRecapViewModel {
  return {
    handledWell: s.handledWell,
    improvePhrases: s.improvePhrases,
    whatToImprove: [],
    usefulPhrase: s.usefulPhrase,
    usefulWord: s.usefulWord,
    nextStep: s.nextStep,
    deferredFeedbackCount: s.deferredFeedback?.length,
  }
}
