import type { GuidedScenarioDefinition, GuidedTurn } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'

export type GuidedPhase = 'intro' | 'phrases' | 'chat' | 'complete'

export type GuidedOutcome = 'success' | 'partial' | 'needs_practice'

export type GuidedChatMessage = {
  id: string
  role: 'assistant' | 'user'
  nl: string
  en?: string
  source?: 'suggestion' | 'custom' | 'phrase'
  branchQuality?: 'strong' | 'ok' | 'weak'
  replyId?: string
  /** Turn the user was answering (for support: redo last pair). */
  answeredTurnId?: string
}

export type GuidedSessionState = {
  phase: GuidedPhase
  definition: GuidedScenarioDefinition
  currentTurnId: string
  messages: GuidedChatMessage[]
  branchQualities: Array<'strong' | 'ok' | 'weak'>
  outcome: GuidedOutcome | null
  chatStarted: boolean
}

/** Serializable subset for `guidedScenarioCheckpoint` (drafts.activeLessonState). */
export type GuidedScenarioCheckpointPayload = Pick<
  GuidedSessionState,
  'phase' | 'currentTurnId' | 'messages' | 'branchQualities' | 'outcome' | 'chatStarted'
>

export type GuidedSessionAction =
  | { type: 'SET_PHASE'; phase: GuidedPhase }
  | { type: 'START_CHAT' }
  /** Clear thread and open a fresh chat from the first assistant line (same definition). */
  | { type: 'RESTART_CHAT' }
  | { type: 'SUBMIT_REPLY'; replyId?: string; customText?: string }
  | { type: 'REWIND_LAST_PAIR' }
  /** Restore from persisted checkpoint (drafts). */
  | { type: 'REPLACE_STATE'; state: GuidedSessionState }

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function turnById(def: GuidedScenarioDefinition, id: string): GuidedTurn | undefined {
  return def.turns.find((t) => t.id === id)
}

function resolveNextTurnId(turn: GuidedTurn, replyId: string | 'custom'): string | null {
  if (turn.terminalAfterUser) return null
  const fb = turn.nextFallbackId
  if (!fb) return null
  if (replyId === 'custom') return fb
  const mapped = turn.nextByReplyId?.[replyId]
  return mapped ?? fb
}

/** First `nextWhenCustomContains` rule whose term appears as a substring of `customNl` (case-insensitive). */
function matchCustomContainsBranch(turn: GuidedTurn, customNl: string): string | null {
  const rules = turn.nextWhenCustomContains
  if (!rules?.length) return null
  const lower = customNl.toLowerCase()
  for (const rule of rules) {
    for (const term of rule.terms) {
      const t = term.trim().toLowerCase()
      if (t.length > 0 && lower.includes(t)) return rule.nextId
    }
  }
  return null
}

export function resolveNextTurnAfterUserReply(
  turn: GuidedTurn,
  opts: { usedCustom: boolean; replyId?: string; customNl: string }
): string | null {
  if (turn.terminalAfterUser) return null
  if (opts.usedCustom) {
    const branched = matchCustomContainsBranch(turn, opts.customNl)
    if (branched) return branched
    return resolveNextTurnId(turn, 'custom')
  }
  if (opts.replyId) return resolveNextTurnId(turn, opts.replyId)
  return null
}

function mergeOutcome(
  base: GuidedOutcome,
  qualities: Array<'strong' | 'ok' | 'weak'>
): GuidedOutcome {
  const weak = qualities.filter((q) => q === 'weak').length
  if (weak >= 2) return 'needs_practice'
  if (weak === 1 && base === 'success') return 'partial'
  return base
}

export function createGuidedSessionState(definition: GuidedScenarioDefinition): GuidedSessionState {
  return {
    phase: 'intro',
    definition,
    currentTurnId: definition.startTurnId,
    messages: [],
    branchQualities: [],
    outcome: null,
    chatStarted: false,
  }
}

export function reduceGuidedSession(
  state: GuidedSessionState,
  action: GuidedSessionAction
): GuidedSessionState {
  switch (action.type) {
    case 'REPLACE_STATE':
      return action.state
    case 'SET_PHASE':
      return { ...state, phase: action.phase }
    case 'START_CHAT': {
      if (state.chatStarted) return { ...state, phase: 'chat' }
      const first = turnById(state.definition, state.definition.startTurnId)
      if (!first) return state
      const msg: GuidedChatMessage = {
        id: newId(),
        role: 'assistant',
        nl: first.aiMessage,
      }
      return {
        ...state,
        phase: 'chat',
        chatStarted: true,
        currentTurnId: first.id,
        messages: [...state.messages, msg],
      }
    }
    case 'RESTART_CHAT': {
      const first = turnById(state.definition, state.definition.startTurnId)
      if (!first) return state
      const msg: GuidedChatMessage = {
        id: newId(),
        role: 'assistant',
        nl: first.aiMessage,
      }
      return {
        ...state,
        phase: 'chat',
        chatStarted: true,
        currentTurnId: first.id,
        messages: [msg],
        branchQualities: [],
        outcome: null,
      }
    }
    case 'REWIND_LAST_PAIR': {
      if (state.phase !== 'chat') return state
      const msgs = state.messages
      if (msgs.length < 2) return state
      const last = msgs[msgs.length - 1]!
      const prev = msgs[msgs.length - 2]!
      if (last.role !== 'assistant' || prev.role !== 'user' || !prev.answeredTurnId) return state
      const nextQualities =
        prev.branchQuality && state.branchQualities.length > 0
          ? state.branchQualities.slice(0, -1)
          : state.branchQualities
      return {
        ...state,
        messages: msgs.slice(0, -2),
        currentTurnId: prev.answeredTurnId,
        branchQualities: nextQualities,
      }
    }
    case 'SUBMIT_REPLY': {
      if (state.phase !== 'chat') return state
      const turn = turnById(state.definition, state.currentTurnId)
      if (!turn) return state

      const custom = action.customText?.trim() ?? ''
      const usedCustom = Boolean(custom.length)
      if (!usedCustom && !action.replyId) return state
      if (!usedCustom && action.replyId) {
        const allowed = turn.suggestedReplies.some((r) => r.id === action.replyId)
        if (!allowed) return state
      }
      if (usedCustom && !turn.allowCustomText) return state

      let nl = custom
      let en: string | undefined
      let branchQuality: 'strong' | 'ok' | 'weak' | undefined
      let replyId: string | undefined
      let source: GuidedChatMessage['source'] = 'custom'

      if (!usedCustom && action.replyId) {
        const pick = turn.suggestedReplies.find((r) => r.id === action.replyId)
        if (!pick) return state
        nl = pick.nl
        en = pick.en
        branchQuality = pick.branchQuality
        replyId = pick.id
        source = 'suggestion'
      }

      const userMsg: GuidedChatMessage = {
        id: newId(),
        role: 'user',
        nl,
        en,
        source,
        branchQuality,
        replyId,
        answeredTurnId: turn.id,
      }

      const nextQualities = branchQuality ? [...state.branchQualities, branchQuality] : state.branchQualities

      if (turn.terminalAfterUser) {
        const base = turn.endOutcome ?? 'success'
        const outcome = mergeOutcome(base, nextQualities)
        return {
          ...state,
          messages: [...state.messages, userMsg],
          branchQualities: nextQualities,
          phase: 'complete',
          outcome,
        }
      }

      const nextId = resolveNextTurnAfterUserReply(turn, {
        usedCustom,
        replyId: action.replyId,
        customNl: nl,
      })
      if (!nextId) return state

      const nextTurn = turnById(state.definition, nextId)
      if (!nextTurn) return state

      const assistantMsg: GuidedChatMessage = {
        id: newId(),
        role: 'assistant',
        nl: nextTurn.aiMessage,
      }

      return {
        ...state,
        messages: [...state.messages, userMsg, assistantMsg],
        branchQualities: nextQualities,
        currentTurnId: nextId,
      }
    }
    default:
      return state
  }
}

export function getCurrentTurn(state: GuidedSessionState): GuidedTurn | undefined {
  return turnById(state.definition, state.currentTurnId)
}
