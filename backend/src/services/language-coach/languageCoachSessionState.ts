import { defaultSpeakLiveState, type SpeakLivePersistedState } from '../../domain/speakLive/speakLiveFsm'
import type { SpeakLiveCefrLevel } from '../../domain/speakLive/speakLiveSupportStrategy'
import type { LanguageCoachPersistedBlob, LanguageCoachStartPayload } from '../../domain/speakLive/languageCoachSessionTypes'
import {
  normalizeLanguageCoachConversationRole,
} from '../../domain/speakLive/languageCoachSessionTypes'
import { mergeLanguageCoachAfterAssistantTurn, mergeLanguageCoachAfterUserTurn } from './languageCoachWeaknessSignals'
import { resolveLanguageCoachSupportStrategy } from './languageCoachSupportStrategy'
import type { SkillId } from '../../domain/skills/skillTypes'

/**
 * Cap on the deep-link pinned-focus string. The prompt builder itself slices to 220 chars in
 * the "Learner-pinned lesson spine" block (`languageCoachSpeakLivePrompt.ts`); we cap higher
 * here so we don't truncate any intermediate plumbing, then let the prompt builder enforce
 * its own display-safe limit.
 */
const PINNED_FOCUS_ENGLISH_MAX = 320

export function normalizeLanguageCoachStart(
  raw: Partial<LanguageCoachStartPayload> | null | undefined
): LanguageCoachStartPayload {
  const conversationRole = normalizeLanguageCoachConversationRole(raw?.conversationRole)
  const guideRaw: unknown = raw?.coachGuideWhileSpeaking
  const coachGuideWhileSpeaking =
    conversationRole === 'coach' && (guideRaw === true || guideRaw === 'true' || guideRaw === 1 || guideRaw === '1')
  const pinnedFocusRaw = typeof raw?.pinnedFocusEnglish === 'string' ? raw.pinnedFocusEnglish : null
  const pinnedFocusEnglish = pinnedFocusRaw && pinnedFocusRaw.trim().length > 0
    ? pinnedFocusRaw.trim().slice(0, PINNED_FOCUS_ENGLISH_MAX)
    : null
  return {
    conversationGoal: raw?.conversationGoal ?? 'general',
    feedbackStyle: raw?.feedbackStyle ?? 'subtle_and_end',
    coachStyle: raw?.coachStyle ?? 'balanced',
    personaStyle: raw?.personaStyle ?? 'coach',
    conversationRole,
    coachGuideWhileSpeaking,
    pinnedFocusEnglish,
  }
}

export function buildLanguageCoachSpeakLiveInit(
  _cefr: SpeakLiveCefrLevel,
  payload: LanguageCoachStartPayload,
  opts?: { weakestSkillIds?: SkillId[] },
): SpeakLivePersistedState {
  const supportStrategy = resolveLanguageCoachSupportStrategy(payload.coachStyle, opts?.weakestSkillIds)
  const languageCoach: LanguageCoachPersistedBlob = {
    conversationGoal: payload.conversationGoal,
    feedbackStyle: payload.feedbackStyle,
    coachStyle: payload.coachStyle,
    personaStyle: payload.personaStyle,
    conversationRole: payload.conversationRole,
    coachGuideWhileSpeaking: payload.conversationRole === 'coach' ? payload.coachGuideWhileSpeaking : false,
    learnerFactLinesEnglish: [],
    weaknessHits: {},
    coachTurnIndex: 0,
    sessionFocusChip: null,
    /**
     * Seed from the start-payload's `pinnedFocusEnglish` so a deep-link from the previous
     * session's report (`/app/talk/language-coach?lcPinnedFocus=…`) anchors the new coach
     * conversation around the requested focus from turn 1, via the existing
     * "Learner-pinned lesson spine" block in `languageCoachSpeakLivePrompt.ts`. Falls back
     * to `null` (= no preset) when the deep-link wasn't used.
     */
    learnerPinnedLessonFocusEnglish: payload.pinnedFocusEnglish?.trim() || null,
    nudgeEvents: [],
    pendingNudgePlan: null,
    lastNudgeCoachTurnIndex: -1,
    activeGuideCorrection: null,
    sessionSignals: {},
    topicsTokensMentioned: [],
    recentCoachLeadIns: [],
    vocabStemHits: {},
  }
  return {
    ...defaultSpeakLiveState(),
    phase: 'execution',
    goalIndex: 0,
    goalsCompleted: [],
    clarificationRounds: 0,
    rollingSummaryEnglish: '',
    intentLabel: null,
    updatedAt: new Date().toISOString(),
    supportStrategy,
    languageCoach,
  }
}

export function applyLanguageCoachUserTurnToState(
  state: SpeakLivePersistedState,
  userText: string,
  opts?: { learnerCefr?: string | null; inputMode?: 'text' | 'speech' }
): SpeakLivePersistedState {
  if (!state.languageCoach) return state
  return {
    ...state,
    languageCoach: mergeLanguageCoachAfterUserTurn(state.languageCoach, userText, opts),
  }
}

export function applyLanguageCoachAssistantTurnToState(
  state: SpeakLivePersistedState,
  assistantText: string
): SpeakLivePersistedState {
  if (!state.languageCoach) return state
  return {
    ...state,
    languageCoach: mergeLanguageCoachAfterAssistantTurn(state.languageCoach, assistantText),
  }
}
