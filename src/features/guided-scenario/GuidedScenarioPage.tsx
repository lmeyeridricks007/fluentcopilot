'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useEntitlement, PaywallModal } from '@/features/entitlements'
import { setLastPracticeContinue } from '@/features/practice-hub'
import {
  track,
  ANALYTICS_EVENTS,
  trackScenarioAbandoned,
  trackScenarioCompleted,
  trackScenarioFirstResponse,
  trackScenarioStarted,
} from '@/lib/analytics'
import { getScenarioCatalogEntries, getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import { markGuidedScenarioComplete } from '@/lib/practice/scenarioProgressStorage'
import { getGuidedScenarioDefinition } from '@/lib/practice/guided/guidedScenarioRegistry'
import type { GuidedScenarioDefinition } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'
import {
  createGuidedSessionState,
  getCurrentTurn,
  reduceGuidedSession,
  type GuidedChatMessage,
  type GuidedSessionAction,
  type GuidedSessionState,
} from '@/lib/practice/guided/guidedSessionState'
import {
  loadGuidedScenarioCheckpoint,
  mergeCheckpointIntoGuidedState,
  saveGuidedScenarioCheckpoint,
} from '@/lib/storage/guidedScenarioCheckpoint'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import {
  getClientTimeZone,
  invalidateProgressionQueries,
  postProgressionSessionComplete,
} from '@/lib/hooks/useProgression'
import { maxVisibleSuggestions, tierEncouragesOpenTyping } from '@/features/guided-scenario/freedomTierUi'
import { ConversationProgress } from './components/ConversationProgress'
import { GuidedCalmSupportRow } from './components/GuidedCalmSupportRow'
import { ScenarioStickyHeader } from './components/scenario/ScenarioStickyHeader'
import { ScenarioPrepCompact } from './components/scenario/ScenarioPrepCompact'
import { GuidedConversationThread } from './components/scenario/GuidedConversationThread'
import { GuidedStickyComposer } from './components/scenario/GuidedStickyComposer'
import { PhraseAssistSheet } from './components/scenario/PhraseAssistSheet'
import { GuidedHelpBottomSheet } from './components/scenario/GuidedHelpBottomSheet'
import { chatAudioManager } from '@/lib/audio/chatAudioManager'
import { useChatAudioPlaybackSnapshot } from '@/lib/audio/chatAudioManager'
import {
  buildContextualMeaningEn,
  buildKeyPhraseTranslation,
  buildNaturalizedDutchSuggestion,
  buildSimplerAssistantReplay,
} from '@/lib/practice-orchestration/supportResponses'
import {
  applyPracticeFeedbackClientEffects,
  buildPostConversationFeedback,
} from '@/lib/practice-feedback'
import { PracticeFeedbackScreen } from '@/features/practice-feedback'
import { microCoachLineAfterUserTurn } from '@/features/guided-scenario/guidedMicroCoach'
import { playAppSound } from '@/lib/interaction/appSounds'
import { scenarioConversationDelaysMs } from '@/lib/interaction/prefersReducedInteraction'

function catalogTitle(scenarioId: string, fallback: string): string {
  return getScenarioCatalogEntries().find((e) => e.id === scenarioId)?.title ?? fallback
}

function lastAssistant(messages: GuidedChatMessage[]): GuidedChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.role === 'assistant') return messages[i]
  }
  return undefined
}

function sessionReducer(state: GuidedSessionState, action: GuidedSessionAction): GuidedSessionState {
  return reduceGuidedSession(state, action)
}

function GuidedScenarioRun({
  definition,
  scenarioId,
  title,
}: {
  definition: GuidedScenarioDefinition
  scenarioId: string
  title: string
}) {
  const userId = useAuthStore((s) => s.user?.id ?? '')
  const queryClient = useQueryClient()
  const progressionRunIdRef = useRef(
    `guided_${scenarioId}_${
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    }`,
  )
  const progressionPostedRef = useRef(false)
  const [state, dispatch] = useReducer(sessionReducer, definition, createGuidedSessionState)
  const checkpointHydratedRef = useRef(false)
  const { canStartScenario, atScenarioCap, usage, tier } = useEntitlement()
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [premiumPaywallOpen, setPremiumPaywallOpen] = useState(false)
  const [composer, setComposer] = useState('')
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null)
  const [phraseSheetOpen, setPhraseSheetOpen] = useState(false)
  const [hintSheetOpen, setHintSheetOpen] = useState(false)
  const [moreHelpSheetOpen, setMoreHelpSheetOpen] = useState(false)
  const [repeatOpen, setRepeatOpen] = useState(false)
  const [guidanceBoost, setGuidanceBoost] = useState(false)
  const [goalExpanded, setGoalExpanded] = useState(false)
  const audioSnap = useChatAudioPlaybackSnapshot()
  const [coachNudge, setCoachNudge] = useState<string | null>(null)
  const [overlayByMsgId, setOverlayByMsgId] = useState<
    Record<string, { keyPhraseGlossEn?: string; lineMeaningEn?: string }>
  >({})
  const [simplerLineNl, setSimplerLineNl] = useState<string | null>(null)
  const [naturalSuggestion, setNaturalSuggestion] = useState<string | null>(null)
  const [conversationFlow, setConversationFlow] = useState<'idle' | 'sending' | 'revealing'>('idle')
  const [suppressedAssistantId, setSuppressedAssistantId] = useState<string | null>(null)
  const [enterAnimAssistantId, setEnterAnimAssistantId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const completedTracked = useRef(false)
  const openedAtMsRef = useRef<number | null>(null)
  const chatStartedAtMsRef = useRef<number | null>(null)
  const supportToolCountRef = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state
  const tierRef = useRef(tier)
  tierRef.current = tier
  const scenarioCategory = getScenarioCatalogEntry(scenarioId)?.category

  const bumpSupportUse = useCallback(() => {
    supportToolCountRef.current += 1
  }, [])

  useEffect(() => {
    if (!userId) return
    if (checkpointHydratedRef.current) return
    checkpointHydratedRef.current = true
    const ck = loadGuidedScenarioCheckpoint(userId, scenarioId)
    if (ck) {
      try {
        dispatch({
          type: 'REPLACE_STATE',
          state: mergeCheckpointIntoGuidedState(definition, ck),
        })
      } catch {
        /* invalid checkpoint shape */
      }
    }
  }, [userId, scenarioId, definition])

  useEffect(() => {
    if (!userId) return
    saveGuidedScenarioCheckpoint(userId, scenarioId, state)
  }, [userId, scenarioId, state])

  useEffect(() => {
    openedAtMsRef.current = Date.now()
    return () => {
      if (completedTracked.current) return
      const s = stateRef.current
      if (s.phase === 'complete') return
      const startMs = chatStartedAtMsRef.current ?? openedAtMsRef.current ?? Date.now()
      trackScenarioAbandoned({
        scenario_id: scenarioId,
        scenario_mode: 'guided',
        scenario_category: scenarioCategory,
        entitlement_tier: tierRef.current,
        exit_phase: s.phase,
        duration_ms: Date.now() - startMs,
        user_turn_count: s.messages.filter((m) => m.role === 'user').length,
        support_tool_count: supportToolCountRef.current,
        goal_completed: false,
        exit_point: 'component_unmount',
      })
    }
  }, [scenarioCategory, scenarioId])

  const feedbackPack = useMemo(() => {
    if (state.phase !== 'complete' || !state.outcome) return null
    const ev = definition.evaluation
    return buildPostConversationFeedback({
      mode: 'guided',
      scenarioId,
      scenarioTitle: title,
      scenarioGoal: definition.goals.join(' · '),
      messages: state.messages.map((m) => ({ role: m.role, content: m.nl })),
      keyPhrases: definition.phrases.map((p) => ({ phrase: p.nl, translation: p.en })),
      sessionOutcome: state.outcome,
      branchQualities: state.branchQualities,
      supportUsage: {
        estimatedToolUses: guidanceBoost ? 3 : 0,
        easierModeUsed: guidanceBoost,
      },
      entitlementTier: tier,
      guidedOverlay: {
        wentWellBullets: ev.wentWellBullets,
        improveBullets: ev.improveBullets,
        betterPhrases: ev.betterPhrases,
        nextActions: ev.nextActions,
      },
    })
  }, [definition, guidanceBoost, scenarioId, state.branchQualities, state.messages, state.outcome, state.phase, tier, title])

  const [appliedRetentionXp, setAppliedRetentionXp] = useState<number | null>(null)
  useEffect(() => {
    if (!feedbackPack) return
    const xp = applyPracticeFeedbackClientEffects({
      scenarioId,
      mode: 'guided',
      outcome: feedbackPack.presenter.outcome,
      sideEffects: feedbackPack.sideEffects,
      confidencePercent: feedbackPack.presenter.confidencePercent,
      tier,
    })
    if (xp != null) setAppliedRetentionXp(xp)
  }, [feedbackPack, scenarioId, tier])

  useEffect(() => {
    if (!feedbackPack || !state.outcome) return
    if (progressionPostedRef.current) return
    progressionPostedRef.current = true
    const uid = userId || LOCAL_ANONYMOUS_LEARNER_ID
    const tz = getClientTimeZone()
    const startMs = chatStartedAtMsRef.current ?? openedAtMsRef.current ?? Date.now()
    const durationSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000))
    const completed = state.outcome !== 'needs_practice'
    const turns = state.messages.filter((m) => m.role === 'user').length
    void postProgressionSessionComplete(
      {
        sessionId: progressionRunIdRef.current,
        userId: uid,
        type: 'scenario',
        durationSeconds,
        completed,
        meaningfulCompletion: true,
        turns,
        improvements: feedbackPack.presenter.improvements.slice(0, 8),
        weaknessesTargeted: feedbackPack.presenter.personalizationTags,
        createdAt: new Date().toISOString(),
      },
      tz,
    )
      .then(() => invalidateProgressionQueries(queryClient, uid, tz))
      .catch(() => {})
  }, [feedbackPack, queryClient, state.messages, state.outcome, userId])

  useEffect(() => {
    setLastPracticeContinue({
      scenarioId,
      title,
      mode: 'guided',
      updatedAt: new Date().toISOString(),
    })
    track(ANALYTICS_EVENTS.guided_scenario_opened, { scenarioId })
  }, [scenarioId, title])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [state.messages, state.phase])

  const ensureScenarioAccess = useCallback(() => {
    if (!canStartScenario && atScenarioCap) {
      setPaywallOpen(true)
      return false
    }
    return true
  }, [atScenarioCap, canStartScenario])

  const currentTurn = state.phase === 'chat' ? getCurrentTurn(state) : undefined
  const assistantLast = lastAssistant(state.messages)

  useEffect(() => {
    chatAudioManager.stop()
  }, [assistantLast?.id])

  useEffect(() => {
    const scoped = `guided:${scenarioId}`
    for (const m of state.messages) {
      if (m.role === 'assistant' && m.nl.trim()) {
        chatAudioManager.preload(m.id, m.nl, undefined, scoped)
      }
    }
  }, [state.messages, scenarioId])

  useEffect(() => {
    if (state.phase === 'phrases') setPhraseSheetOpen(true)
  }, [state.phase])

  const anotherWayNl = useMemo(() => {
    if (!currentTurn || currentTurn.suggestedReplies.length < 2) return null
    const alt = currentTurn.suggestedReplies.find((r) => r.id !== selectedReplyId)
    return alt?.nl ?? currentTurn.suggestedReplies[1]!.nl
  }, [currentTurn, selectedReplyId])

  const userTurns = state.messages.filter((m) => m.role === 'user').length
  const progressTotal = definition.progressTotal ?? 5

  const hintText =
    currentTurn && definition.hintsByTurnId?.[currentTurn.id]
      ? definition.hintsByTurnId[currentTurn.id]
      : null

  const scenarioGoalText = definition.goals.join(' · ')
  const phraseKeyList = definition.phrases.map((p) => ({ phrase: p.nl, translation: p.en }))
  const canRewind =
    state.messages.length >= 2 &&
    state.messages[state.messages.length - 1]?.role === 'assistant' &&
    state.messages[state.messages.length - 2]?.role === 'user'
  const hasAssistant = Boolean(assistantLast)
  const composerTrim = composer.trim()
  const pickedSuggestion =
    selectedReplyId && currentTurn
      ? currentTurn.suggestedReplies.find((r) => r.id === selectedReplyId)
      : undefined
  const exactChipSend = Boolean(pickedSuggestion && pickedSuggestion.nl.trim() === composerTrim)
  const canSendReply =
    exactChipSend || Boolean(composerTrim.length > 0 && currentTurn?.allowCustomText)
  const naturalPremiumLocked = tier === 'free' && composerTrim.length > 0
  const suggestionCap = currentTurn
    ? Math.min(
        currentTurn.suggestedReplies.length,
        maxVisibleSuggestions(currentTurn.freedomTier) + (guidanceBoost ? 2 : 0)
      )
    : 0

  const submitReply = useCallback(
    (inputModality: 'typing' | 'voice' = 'typing', speakTextOverride?: string) => {
      const custom =
        typeof speakTextOverride === 'string' && speakTextOverride.trim().length > 0
          ? speakTextOverride.trim()
          : composer.trim()
      if (!currentTurn) return
      if (userTurns === 0) {
        trackScenarioFirstResponse({
          scenario_id: scenarioId,
          scenario_mode: 'guided',
          input_modality: inputModality === 'voice' ? 'speaking' : 'typing',
          user_turn_index: 1,
        })
        if (inputModality === 'voice') {
          track(ANALYTICS_EVENTS.typing_mode_used, { scenarioId, surface: 'guided_voice' })
        } else {
          track(ANALYTICS_EVENTS.typing_mode_used, { scenarioId, surface: 'guided' })
        }
      }

      const fromChip = selectedReplyId
        ? currentTurn.suggestedReplies.find((r) => r.id === selectedReplyId)
        : undefined
      const unchangedChip = Boolean(
        fromChip && fromChip.nl.trim() === custom && selectedReplyId
      )

      if (unchangedChip && selectedReplyId) {
        track(ANALYTICS_EVENTS.guided_scenario_reply_submitted, {
          scenarioId,
          turnId: state.currentTurnId,
          source: 'suggestion',
          edited_from_suggestion: false,
        })
        dispatch({ type: 'SUBMIT_REPLY', replyId: selectedReplyId })
        setSelectedReplyId(null)
        setComposer('')
        return
      }

      if (custom && currentTurn.allowCustomText) {
        track(ANALYTICS_EVENTS.guided_scenario_reply_submitted, {
          scenarioId,
          turnId: state.currentTurnId,
          source: fromChip ? 'suggestion_edited' : 'custom',
          edited_from_suggestion: Boolean(fromChip && !unchangedChip),
        })
        dispatch({ type: 'SUBMIT_REPLY', customText: custom })
        setSelectedReplyId(null)
        setComposer('')
      }
    },
    [composer, currentTurn, scenarioId, selectedReplyId, state.currentTurnId, userTurns]
  )

  const handleComposerChange = useCallback(
    (v: string) => {
      setComposer(v)
      if (!selectedReplyId || !currentTurn) return
      const pick = currentTurn.suggestedReplies.find((r) => r.id === selectedReplyId)
      if (!pick || pick.nl.trim() !== v.trim()) setSelectedReplyId(null)
    },
    [currentTurn, selectedReplyId]
  )

  const lastUserMessage = useMemo(() => {
    for (let i = state.messages.length - 1; i >= 0; i--) {
      if (state.messages[i]!.role === 'user') return state.messages[i]
    }
    return undefined
  }, [state.messages])

  const lastChatMessageMeta = useMemo(() => {
    const m = state.messages[state.messages.length - 1]
    return m ? { id: m.id, role: m.role } : null
  }, [state.messages])

  useEffect(() => {
    if (state.phase !== 'chat') {
      setConversationFlow('idle')
      setSuppressedAssistantId(null)
      setEnterAnimAssistantId(null)
    }
  }, [state.phase])

  useEffect(() => {
    if (conversationFlow !== 'revealing') return
    const last = state.messages[state.messages.length - 1]
    if (!last || last.role !== 'assistant') {
      setSuppressedAssistantId(null)
      setConversationFlow('idle')
      return
    }
    setSuppressedAssistantId(last.id)
    playAppSound('ai_message_arrival')
    const { partnerRevealMs } = scenarioConversationDelaysMs()
    const t = window.setTimeout(() => {
      const id = last.id
      setSuppressedAssistantId(null)
      setEnterAnimAssistantId(id)
      setConversationFlow('idle')
      window.setTimeout(() => setEnterAnimAssistantId(null), 480)
    }, partnerRevealMs)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reveal is keyed by last message id/role + flow; full messages[] identity would restart timers spuriously
  }, [conversationFlow, lastChatMessageMeta?.id, lastChatMessageMeta?.role])

  const sendWithInteraction = useCallback(
    (modality: 'typing' | 'voice', speakTextOverride?: string) => {
      playAppSound('scenario_submit')
      setConversationFlow('sending')
      const { sendMs } = scenarioConversationDelaysMs()
      window.setTimeout(() => {
        submitReply(modality, speakTextOverride)
        setConversationFlow('revealing')
      }, sendMs)
    },
    [submitReply]
  )

  useEffect(() => {
    if (state.phase !== 'chat') {
      setCoachNudge(null)
      return
    }
    if (!lastUserMessage) {
      setCoachNudge(null)
      return
    }
    const line = microCoachLineAfterUserTurn(lastUserMessage)
    if (!line) {
      setCoachNudge(null)
      return
    }
    setCoachNudge(line)
    track(ANALYTICS_EVENTS.guided_micro_nudge_shown, {
      scenarioId,
      turnId: lastUserMessage.answeredTurnId,
    })
    const t = window.setTimeout(() => setCoachNudge(null), 4200)
    return () => window.clearTimeout(t)
  }, [lastUserMessage, scenarioId, state.phase])

  useEffect(() => {
    if (state.phase !== 'complete' || !state.outcome || completedTracked.current) return
    completedTracked.current = true
    markGuidedScenarioComplete(scenarioId)
    track(ANALYTICS_EVENTS.guided_scenario_completed, {
      scenarioId,
      outcome: state.outcome,
    })
    const startMs = chatStartedAtMsRef.current ?? openedAtMsRef.current
    const durationMs = startMs != null ? Date.now() - startMs : undefined
    const userTc = state.messages.filter((m) => m.role === 'user').length
    trackScenarioCompleted({
      scenario_id: scenarioId,
      scenario_mode: 'guided',
      scenario_category: scenarioCategory,
      entitlement_tier: tier,
      session_outcome: state.outcome,
      scenario_goal_completed: state.outcome === 'success',
      duration_ms: durationMs,
      conversation_turn_count: userTc,
      support_tool_count: supportToolCountRef.current,
      confidence_percent: feedbackPack?.presenter.confidencePercent,
    })
  }, [feedbackPack?.presenter.confidencePercent, scenarioCategory, scenarioId, state.messages, state.outcome, state.phase, tier])

  const startChat = useCallback(() => {
    if (!ensureScenarioAccess()) return
    playAppSound('primary_action')
    chatStartedAtMsRef.current = Date.now()
    trackScenarioStarted({
      scenario_id: scenarioId,
      scenario_mode: 'guided',
      scenario_category: scenarioCategory,
      entitlement_tier: tier,
    })
    track(ANALYTICS_EVENTS.guided_scenario_started, { scenarioId })
    dispatch({ type: 'START_CHAT' })
  }, [ensureScenarioAccess, scenarioCategory, scenarioId, tier])

  const restartChat = useCallback(() => {
    if (conversationFlow !== 'idle') return
    chatAudioManager.stop()
    completedTracked.current = false
    progressionPostedRef.current = false
    progressionRunIdRef.current = `guided_${scenarioId}_${
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    }`
    supportToolCountRef.current = 0
    chatStartedAtMsRef.current = Date.now()
    setComposer('')
    setSelectedReplyId(null)
    setConversationFlow('idle')
    setOverlayByMsgId({})
    setSimplerLineNl(null)
    setNaturalSuggestion(null)
    setCoachNudge(null)
    setPhraseSheetOpen(false)
    setHintSheetOpen(false)
    setMoreHelpSheetOpen(false)
    setRepeatOpen(false)
    setGoalExpanded(false)
    setGuidanceBoost(false)
    setAppliedRetentionXp(null)
    dispatch({ type: 'RESTART_CHAT' })
    track(ANALYTICS_EVENTS.guided_scenario_chat_restarted, { scenarioId })
    track(ANALYTICS_EVENTS.guided_scenario_started, { scenarioId })
    trackScenarioStarted({
      scenario_id: scenarioId,
      scenario_mode: 'guided',
      scenario_category: scenarioCategory,
      entitlement_tier: tier,
    })
    playAppSound('primary_action')
  }, [conversationFlow, scenarioCategory, scenarioId, tier])

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-lg mx-auto w-full pb-28">
      {(state.phase === 'intro' || state.phase === 'phrases') && (
        <>
          <ScenarioStickyHeader
            backHref={`/app/practice/scenario/${scenarioId}`}
            backLabel="Back to mode choice"
            title={title}
            subtitle="Guided scene · Dutch in context — instructions in English"
          />
          <div className="px-4 pt-2 pb-6">
            <ScenarioPrepCompact
              scenarioId={scenarioId}
              definition={definition}
              onStartScene={startChat}
              onOpenPhrases={() => setPhraseSheetOpen(true)}
            />
            {state.phase === 'phrases' ? (
              <Button
                type="button"
                variant="ghost"
                fullWidth
                className="mt-3"
                onClick={() => dispatch({ type: 'SET_PHASE', phase: 'intro' })}
              >
                Back
              </Button>
            ) : null}
          </div>
        </>
      )}

      {state.phase === 'chat' && currentTurn ? (
        <div className="flex flex-col flex-1 min-h-0">
          <ScenarioStickyHeader
            backHref={`/app/practice/scenario/${scenarioId}`}
            backLabel="Back to Talk setup"
            title={title}
            subtitle={`Your turns ${userTurns} · ~${progressTotal} steps`}
            right={
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={restartChat}
                  disabled={conversationFlow !== 'idle'}
                  className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-xl text-ink-secondary hover:bg-slate-100/90 disabled:opacity-35 disabled:pointer-events-none"
                  aria-label="Restart chat from the beginning"
                  title="Restart chat"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden />
                </button>
                <div className="w-16">
                  <ConversationProgress userTurnsDone={userTurns} totalHint={progressTotal} />
                </div>
              </div>
            }
          />
          <button
            type="button"
            onClick={() => setGoalExpanded((g) => !g)}
            className="mx-4 -mt-1 mb-2 text-left text-caption font-semibold text-primary-700 min-h-touch py-1"
          >
            {goalExpanded
              ? 'Hide goal'
              : `Goal · ${scenarioGoalText.length > 72 ? `${scenarioGoalText.slice(0, 70)}…` : scenarioGoalText}`}
          </button>
          {goalExpanded ? (
            <div className="mx-4 mb-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-body-sm text-ink-secondary leading-snug">
              {scenarioGoalText}
            </div>
          ) : null}

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto min-h-[120px] px-2 pb-[min(52vh,380px)]"
          >
            {coachNudge ? (
              <Card
                variant="flat"
                padding="sm"
                className="mb-3 mx-1 border border-primary-100 bg-primary-50/35 text-body-sm text-ink-primary"
                role="status"
              >
                {coachNudge}
              </Card>
            ) : null}
            <GuidedConversationThread
              messages={state.messages}
              assistantLastId={assistantLast?.id ?? null}
              overlayByMsgId={overlayByMsgId}
              suppressedAssistantId={suppressedAssistantId}
              enterAnimAssistantId={enterAnimAssistantId}
              playbackThreadId={`guided:${scenarioId}`}
            />
          </div>

          <PhraseAssistSheet
            open={phraseSheetOpen}
            onClose={() => setPhraseSheetOpen(false)}
            phrases={definition.phrases}
            scenarioId={scenarioId}
            onPickPhrase={(nl) => {
              bumpSupportUse()
              setComposer((c) => (c ? `${c} ${nl}` : nl))
            }}
          />

          <GuidedHelpBottomSheet
            open={hintSheetOpen}
            onClose={() => setHintSheetOpen(false)}
            title="Hint"
          >
            {hintText ? (
              <p className="text-body-sm text-ink-primary leading-relaxed">{hintText}</p>
            ) : (
              <p className="text-caption text-ink-secondary">No hint for this turn.</p>
            )}
          </GuidedHelpBottomSheet>

          <GuidedHelpBottomSheet
            open={moreHelpSheetOpen}
            onClose={() => setMoreHelpSheetOpen(false)}
            title="More help"
          >
            <div className="space-y-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                fullWidth
                disabled={guidanceBoost}
                onClick={() => {
                  if (guidanceBoost) return
                  bumpSupportUse()
                  setGuidanceBoost(true)
                  setHintSheetOpen(true)
                  setPhraseSheetOpen(true)
                  track(ANALYTICS_EVENTS.easier_mode_requested, { scenarioId, surface: 'guided' })
                  track(ANALYTICS_EVENTS.practice_support_tool_used, { tool: 'easier_mode', scenarioId })
                }}
              >
                {guidanceBoost ? 'Easier mode on' : 'Easier mode (more structure)'}
              </Button>
              <GuidedCalmSupportRow
                repeatActive={repeatOpen}
                onRepeat={() => {
                  bumpSupportUse()
                  setRepeatOpen((r) => !r)
                  track(ANALYTICS_EVENTS.guided_scenario_support_used, { tool: 'repeat_line', scenarioId })
                }}
                anotherWayAvailable={Boolean(anotherWayNl)}
                onAnotherWay={() => {
                  if (!anotherWayNl) return
                  bumpSupportUse()
                  track(ANALYTICS_EVENTS.guided_scenario_support_used, { tool: 'another_way', scenarioId })
                  setComposer(anotherWayNl)
                  setSelectedReplyId(null)
                }}
                redoEnabled={canRewind}
                onRedo={() => {
                  if (!canRewind) return
                  bumpSupportUse()
                  dispatch({ type: 'REWIND_LAST_PAIR' })
                  setComposer('')
                  setSelectedReplyId(null)
                  setSimplerLineNl(null)
                  setNaturalSuggestion(null)
                  track(ANALYTICS_EVENTS.turn_restarted, { scenarioId, surface: 'guided' })
                  track(ANALYTICS_EVENTS.practice_support_tool_used, { tool: 'restart_turn', scenarioId })
                }}
                keyPhraseEnabled={hasAssistant}
                onKeyPhrase={() => {
                  if (!assistantLast) return
                  bumpSupportUse()
                  const { chunkNl, glossEn } = buildKeyPhraseTranslation(assistantLast.nl, phraseKeyList)
                  setOverlayByMsgId((o) => ({
                    ...o,
                    [assistantLast.id]: {
                      ...o[assistantLast.id],
                      keyPhraseGlossEn: `${chunkNl} → ${glossEn}`,
                    },
                  }))
                  track(ANALYTICS_EVENTS.translation_requested, { scenarioId, surface: 'guided' })
                  track(ANALYTICS_EVENTS.practice_support_tool_used, { tool: 'translate_key_phrase', scenarioId })
                }}
                meaningEnabled={hasAssistant}
                onMeaning={() => {
                  if (!assistantLast) return
                  bumpSupportUse()
                  const text = buildContextualMeaningEn(assistantLast.nl, scenarioGoalText)
                  setOverlayByMsgId((o) => ({
                    ...o,
                    [assistantLast.id]: { ...o[assistantLast.id], lineMeaningEn: text },
                  }))
                  track(ANALYTICS_EVENTS.explanation_requested, { scenarioId, surface: 'guided' })
                  track(ANALYTICS_EVENTS.practice_support_tool_used, { tool: 'what_means', scenarioId })
                }}
                simplerEnabled={hasAssistant}
                onSimpler={() => {
                  if (!assistantLast) return
                  bumpSupportUse()
                  setSimplerLineNl(buildSimplerAssistantReplay(assistantLast.nl))
                  track(ANALYTICS_EVENTS.slower_reply_requested, { scenarioId, surface: 'guided' })
                  track(ANALYTICS_EVENTS.practice_support_tool_used, { tool: 'slower_reply', scenarioId })
                }}
                naturalEnabled={composerTrim.length > 0}
                naturalPremiumLocked={naturalPremiumLocked}
                onNatural={() => {
                  if (!composerTrim) return
                  if (tier === 'free') {
                    track(ANALYTICS_EVENTS.premium_feature_exposed, {
                      feature: 'natural_phrase',
                      scenarioId,
                      surface: 'guided',
                    })
                    track(ANALYTICS_EVENTS.premium_cta_viewed, { reason: 'guided_natural', scenarioId })
                    setPremiumPaywallOpen(true)
                    return
                  }
                  bumpSupportUse()
                  setNaturalSuggestion(buildNaturalizedDutchSuggestion(composerTrim, phraseKeyList))
                  track(ANALYTICS_EVENTS.natural_rephrase_requested, { scenarioId, surface: 'guided' })
                  track(ANALYTICS_EVENTS.practice_support_tool_used, { tool: 'say_naturally', scenarioId })
                }}
              />
              {repeatOpen && assistantLast ? (
                <Card variant="flat" padding="sm" className="border border-slate-200 text-body-sm text-ink-primary">
                  <span className="text-caption font-medium text-ink-secondary block mb-1">Repeated line</span>
                  {assistantLast.nl}
                </Card>
              ) : null}
              {simplerLineNl ? (
                <Card variant="flat" padding="sm" className="border border-slate-200 text-body-sm text-ink-primary">
                  <span className="text-caption font-medium text-ink-secondary block mb-1">Simpler line</span>
                  {simplerLineNl}
                </Card>
              ) : null}
              {naturalSuggestion ? (
                <Card variant="flat" padding="sm" className="border border-primary-100 bg-primary-50/30 text-body-sm">
                  {naturalSuggestion}
                </Card>
              ) : null}
            </div>
          </GuidedHelpBottomSheet>

          <GuidedStickyComposer
            scenarioId={scenarioId}
            composer={composer}
            onComposerChange={handleComposerChange}
            allowCustom={currentTurn.allowCustomText}
            placeholder={currentTurn.customInputPlaceholder ?? 'Type your answer in Dutch…'}
            canSend={canSendReply && conversationFlow === 'idle'}
            sending={conversationFlow === 'sending'}
            onSend={(modality, speakOverride) => sendWithInteraction(modality, speakOverride)}
            starters={currentTurn.suggestedReplies}
            maxStarters={suggestionCap}
            selectedStarterId={selectedReplyId}
            onPickStarter={(r) => {
              track(ANALYTICS_EVENTS.guided_suggestion_loaded_to_composer, {
                scenarioId,
                replyId: r.id,
              })
              setComposer(r.nl)
              setSelectedReplyId(r.id)
            }}
            assistantLineNl={assistantLast?.nl ?? null}
            onListenNormal={() => {
              if (!assistantLast) return
              void chatAudioManager.playOrToggle(assistantLast.id, assistantLast.nl, undefined, {
                threadId: `guided:${scenarioId}`,
              })
            }}
            onListenSlow={() => {
              if (!assistantLast) return
              void chatAudioManager.playOrToggle(assistantLast.id, assistantLast.nl, undefined, {
                slow: true,
                threadId: `guided:${scenarioId}`,
              })
            }}
            listenPlaying={Boolean(
              assistantLast &&
                audioSnap.activeMessageId === assistantLast.id &&
                (audioSnap.uiState === 'playing' || audioSnap.uiState === 'loading')
            )}
            hintActive={hintSheetOpen}
            onToggleHint={() => {
              bumpSupportUse()
              setHintSheetOpen((h) => !h)
              track(ANALYTICS_EVENTS.guided_scenario_support_used, { tool: 'hint', scenarioId })
              track(ANALYTICS_EVENTS.hint_used, { scenarioId, surface: 'guided' })
            }}
            onOpenPhrases={() => setPhraseSheetOpen(true)}
            onOpenMoreHelp={() => {
              setMoreHelpSheetOpen((o) => {
                const next = !o
                track(ANALYTICS_EVENTS.support_tool_opened, {
                  tool: 'more_help',
                  scenarioId,
                  surface: 'guided',
                  open: next,
                })
                return next
              })
            }}
            helperText={
              tierEncouragesOpenTyping(currentTurn.freedomTier)
                ? 'Tweak loaded phrases so they stick in memory.'
                : 'Load a suggestion and make it yours before you send.'
            }
          />
        </div>
      ) : null}

      {state.phase === 'complete' && state.outcome && feedbackPack ? (
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
          <PracticeFeedbackScreen
            model={feedbackPack.presenter}
            xpGained={appliedRetentionXp ?? feedbackPack.sideEffects.xpAmount}
            onRestartChat={restartChat}
          />
        </div>
      ) : null}

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        reason="scenario_cap"
        usage={{ used: usage.scenariosToday, limit: usage.scenariosLimit }}
      />
      <PaywallModal
        open={premiumPaywallOpen}
        onClose={() => setPremiumPaywallOpen(false)}
        reason="premium_feature"
      />
    </div>
  )
}

export function GuidedScenarioPage({ scenarioId }: { scenarioId: string }) {
  const router = useRouter()
  const definition = useMemo(() => getGuidedScenarioDefinition(scenarioId), [scenarioId])
  const title = useMemo(
    () => (definition ? catalogTitle(scenarioId, definition.intro.headline) : ''),
    [definition, scenarioId]
  )

  useEffect(() => {
    if (!definition) {
      router.replace(`/app/practice/simulation/${encodeURIComponent(scenarioId)}`)
    }
  }, [definition, router, scenarioId])

  if (!definition) {
    return (
      <div className="px-4 py-10 text-center text-body-sm text-ink-secondary max-w-lg mx-auto">
        Redirecting…
      </div>
    )
  }

  return <GuidedScenarioRun definition={definition} scenarioId={scenarioId} title={title} />
}
