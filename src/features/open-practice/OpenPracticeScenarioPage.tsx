'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LifeBuoy, Mic, Square, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useEntitlement, PaywallModal } from '@/features/entitlements'
import { ConversationSupportBar } from '@/features/practice-support'
import { setLastPracticeContinue } from '@/features/practice-hub'
import { useDictationToText } from '@/lib/speech/useDictationToText'
import { getPersonaPresetId } from '@/lib/practice-orchestration/personaPresets'
import {
  track,
  ANALYTICS_EVENTS,
  trackScenarioAbandoned,
  trackScenarioCompleted,
  trackScenarioFirstResponse,
  trackScenarioStarted,
} from '@/lib/analytics'
import { getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import { resolveScenarioVisual } from '@/lib/practice/scenarioImageRegistry'
import { ScenarioSceneVisual } from '@/components/visual/ScenarioSceneVisual'
import { getScenario } from '@/ai-conversation-engine/config/scenarios'
import { ensureCatalogScenariosRegistered } from '@/lib/practice/conversation/ensureCatalogScenarios'
import {
  generateOpenPracticeReply,
} from '@/lib/practice/conversation/generateOpenPracticeReply'
import { startOpenPracticeBackendSession } from '@/lib/practice/conversation/openPracticeBackend'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { BackendRequiredScreen } from '@/lib/api/BackendRequiredScreen'
import {
  applyPracticeFeedbackClientEffects,
  buildPostConversationFeedback,
  type PracticeFeedbackBuildResult,
} from '@/lib/practice-feedback'
import { PracticeFeedbackScreen } from '@/features/practice-feedback'
import { getPracticeModeAccess } from '@/lib/practice/scenarioModeAccess'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import {
  ConversationModeBadge,
  PracticeChatThread,
  type AssistantAvatar,
  type PracticeThreadMessage,
} from '@/features/practice-conversation'
import {
  getOpenPracticeSupportTools,
  runOpenSupportTool,
  type SupportEntitlementTier,
  type SupportToolId,
} from '@/lib/practice-support'
import type { A2DifficultyBand } from '@/lib/practice-orchestration/types'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import {
  getClientTimeZone,
  invalidateProgressionQueries,
  postProgressionSessionComplete,
} from '@/lib/hooks/useProgression'

type Phase = 'intro' | 'chat' | 'complete'

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function tierForSupport(t: 'free' | 'trial' | 'premium'): SupportEntitlementTier {
  return t
}

/** Friendly English copy for persona preset tokens (e.g. `shop_staff` → `Shop staff`). */
const PERSONA_LABEL_EN: Record<string, string> = {
  barista: 'Barista',
  doctor_or_reception: 'Doctor or receptionist',
  station_staff: 'Station staff',
  shop_staff: 'Shop staff',
  gemeente_clerk: 'Municipality clerk',
  colleague: 'Colleague',
  landlord_or_service: 'Landlord or service',
  friend: 'Friend',
  service_desk: 'Service desk',
}

function humanizePersonaToken(token: string): string {
  return token
    .split('_')
    .filter((part) => part.length > 0)
    .map((part, i) => (i === 0 ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function resolvePersonaLabelEn(scenarioId: string): string | null {
  const preset = getPersonaPresetId(scenarioId)
  if (!preset) return null
  return PERSONA_LABEL_EN[preset] ?? humanizePersonaToken(preset)
}

export function OpenPracticeScenarioPage({
  scenarioId,
  mode,
}: {
  scenarioId: string
  mode: Extract<PracticeConversationMode, 'semi_guided' | 'free'>
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const authUserId = useAuthStore((s) => s.user?.id)
  const entry = useMemo(() => getScenarioCatalogEntry(scenarioId), [scenarioId])
  const sceneVisual = useMemo(() => (entry ? resolveScenarioVisual(entry) : null), [entry])
  const { tier, canStartScenario, atScenarioCap, usage } = useEntitlement()
  const access = useMemo(
    () => (entry ? getPracticeModeAccess(entry, mode, tier) : { allowed: false, reason: 'unsupported' as const }),
    [entry, mode, tier]
  )

  const [phase, setPhase] = useState<Phase>('intro')
  const [messages, setMessages] = useState<PracticeThreadMessage[]>([])
  const [composer, setComposer] = useState('')
  const [loading, setLoading] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [paywallReason, setPaywallReason] = useState<'scenario_cap' | 'premium_feature'>('scenario_cap')
  /** Free mode: collapse support until learner opens it. Semi-guided: start open for calmer onboarding. */
  const [supportSheetOpen, setSupportSheetOpen] = useState(mode === 'semi_guided')
  const [translationId, setTranslationId] = useState<string | null>(null)
  const [lastCoachEn, setLastCoachEn] = useState<string | null>(null)
  const [sessionDifficulty, setSessionDifficulty] = useState<A2DifficultyBand>('a2_mid')
  const [easierModeActive, setEasierModeActive] = useState(false)
  const [hintUseCount, setHintUseCount] = useState(0)
  const [feedbackResult, setFeedbackResult] = useState<PracticeFeedbackBuildResult | null>(null)
  const [sessionXpGained, setSessionXpGained] = useState<number | undefined>(undefined)

  const [supportCard, setSupportCard] = useState<
    | null
    | { kind: 'hint'; text: string }
    | { kind: 'phrases'; phrases: string[] }
    | { kind: 'natural'; text: string }
  >(null)

  const listRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const completedTracked = useRef(false)
  const supportOpenedTracked = useRef(false)
  const finishOnce = useRef(false)
  const progressionPostedRef = useRef(false)
  const progressionOpenIdRef = useRef(`open_${scenarioId}_${newId()}`)
  const openedAtMsRef = useRef<number | null>(null)
  const chatStartedAtMsRef = useRef<number | null>(null)
  const backendThreadIdRef = useRef<string | null>(null)
  const [sessionBootError, setSessionBootError] = useState<string | null>(null)
  const [startingChat, setStartingChat] = useState(false)
  const supportToolUsesRef = useRef(0)
  const phaseRef = useRef<Phase>(phase)
  phaseRef.current = phase
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const tierRef = useRef(tier)
  tierRef.current = tier

  useEffect(() => {
    openedAtMsRef.current = Date.now()
    return () => {
      if (completedTracked.current) return
      if (phaseRef.current === 'complete') return
      const startMs = chatStartedAtMsRef.current ?? openedAtMsRef.current ?? Date.now()
      const userTc = messagesRef.current.filter((m) => m.role === 'user').length
      trackScenarioAbandoned({
        scenario_id: scenarioId,
        scenario_mode: mode,
        scenario_category: entry?.category,
        entitlement_tier: tierRef.current,
        exit_phase: phaseRef.current,
        duration_ms: Date.now() - startMs,
        user_turn_count: userTc,
        support_tool_count: supportToolUsesRef.current,
        goal_completed: false,
        exit_point: 'component_unmount',
      })
    }
  }, [entry?.category, mode, scenarioId])

  const title = entry?.title ?? 'Practice'
  const ctx = useMemo(() => {
    ensureCatalogScenariosRegistered()
    return getScenario(scenarioId)
  }, [scenarioId])

  const keyPhrases = useMemo(() => ctx?.key_phrases ?? [], [ctx?.key_phrases])

  const personaLabelEn = useMemo(() => resolvePersonaLabelEn(scenarioId), [scenarioId])
  const assistantAvatar = useMemo<AssistantAvatar | null>(() => {
    const src = sceneVisual?.thumbnailSrc || sceneVisual?.heroSrc
    if (!src) return null
    const role = personaLabelEn ?? 'Conversation partner'
    return { src, alt: `${role} avatar — ${title}` }
  }, [personaLabelEn, sceneVisual, title])

  /** `voice` once any dictated transcript lands; reset to `typing` whenever the learner types. */
  const lastInputModeRef = useRef<'typing' | 'voice'>('typing')

  const handleDictationAppend = useCallback((next: string) => {
    lastInputModeRef.current = 'voice'
    setComposer(next)
  }, [])

  const dictation = useDictationToText({
    composerValue: composer,
    onAppend: handleDictationAppend,
    scenarioHint: title,
    scenarioId,
    threadId: `open-practice:${scenarioId}`,
  })

  useEffect(() => {
    if (!entry || !access.allowed) {
      router.replace(`/app/practice/scenario/${encodeURIComponent(scenarioId)}`)
    }
  }, [access.allowed, entry, router, scenarioId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, phase])

  const ensureScenarioAccess = useCallback(() => {
    if (!canStartScenario && atScenarioCap) {
      setPaywallReason('scenario_cap')
      setPaywallOpen(true)
      return false
    }
    return true
  }, [atScenarioCap, canStartScenario])

  const startChat = useCallback(async () => {
    if (!ensureScenarioAccess()) return
    if (started.current) return
    started.current = true
    setStartingChat(true)
    setSessionBootError(null)
    chatStartedAtMsRef.current = Date.now()
    trackScenarioStarted({
      scenario_id: scenarioId,
      scenario_mode: mode,
      scenario_category: entry?.category,
      entitlement_tier: tier,
    })
    try {
      const session = await startOpenPracticeBackendSession(scenarioId, mode)
      backendThreadIdRef.current = session.threadId
      setMessages([
        {
          id: newId(),
          role: 'assistant',
          content: session.openingAssistantNl,
          translationEn:
            mode === 'semi_guided' ? 'Opening line from the other person in the scene.' : undefined,
        },
      ])
      setPhase('chat')
      setLastPracticeContinue({
        scenarioId,
        title,
        mode,
        updatedAt: new Date().toISOString(),
      })
      track(ANALYTICS_EVENTS.practice_open_conversation_started, { scenarioId, mode })
    } catch (e) {
      started.current = false
      setSessionBootError(e instanceof Error ? e.message : 'Could not start practice')
    } finally {
      setStartingChat(false)
    }
  }, [ensureScenarioAccess, entry?.category, mode, scenarioId, tier, title])

  const userTurns = messages.filter((m) => m.role === 'user').length

  const lastAssistant = useMemo(() => [...messages].reverse().find((m) => m.role === 'assistant'), [messages])

  const hasUserTurnToRewind = messages.length >= 2 && messages[messages.length - 1]?.role === 'assistant'

  const atMinDifficulty = sessionDifficulty === 'a2_lower' && easierModeActive

  const supportTools = useMemo(
    () =>
      getOpenPracticeSupportTools(tierForSupport(tier), {
        hasAssistantLine: Boolean(lastAssistant),
        hasUserTurnToRewind,
        atMinDifficulty,
        hasComposerDraft: composer.trim().length > 0,
      }),
    [tier, lastAssistant, hasUserTurnToRewind, atMinDifficulty, composer]
  )

  const buildSupportContext = useCallback(() => {
    return {
      mode,
      scenarioId,
      scenarioGoal: ctx?.goal,
      keyPhrases,
      messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
      composerDraft: composer,
      difficulty: sessionDifficulty,
      easierModeActive,
      tier: tierForSupport(tier),
      hintUseCount,
    }
  }, [mode, scenarioId, ctx?.goal, keyPhrases, messages, composer, sessionDifficulty, easierModeActive, tier, hintUseCount])

  const trackGranular = useCallback(
    (tool: SupportToolId) => {
      supportToolUsesRef.current += 1
      const base = { scenarioId, mode, tool, difficulty: sessionDifficulty, easierModeActive }
      track(ANALYTICS_EVENTS.practice_support_tool_used, base)
      switch (tool) {
        case 'hint':
          track(ANALYTICS_EVENTS.hint_used, base)
          break
        case 'phrase_suggestions':
          track(ANALYTICS_EVENTS.phrase_suggestion_used, base)
          break
        case 'slower_reply':
          track(ANALYTICS_EVENTS.slower_reply_requested, base)
          break
        case 'translate_key_phrase':
          track(ANALYTICS_EVENTS.translation_requested, base)
          break
        case 'say_naturally':
          track(ANALYTICS_EVENTS.natural_rephrase_requested, base)
          break
        case 'what_means':
          track(ANALYTICS_EVENTS.explanation_requested, base)
          break
        case 'restart_turn':
          track(ANALYTICS_EVENTS.turn_restarted, base)
          break
        case 'easier_mode':
          track(ANALYTICS_EVENTS.easier_mode_requested, base)
          break
        default:
          break
      }
    },
    [easierModeActive, mode, scenarioId, sessionDifficulty]
  )

  const openSupportUi = useCallback(() => {
    setSupportSheetOpen(true)
    if (!supportOpenedTracked.current) {
      supportOpenedTracked.current = true
      track(ANALYTICS_EVENTS.support_tool_opened, { scenarioId, mode, surface: 'open_practice' })
    }
  }, [mode, scenarioId])

  const handleSupportTool = useCallback(
    (tool: SupportToolId) => {
      const runtime = supportTools.find((t) => t.id === tool)
      if (runtime?.premiumLocked) {
        track(ANALYTICS_EVENTS.premium_feature_exposed, {
          feature: tool,
          scenarioId,
          mode,
          surface: 'open_practice',
        })
        track(ANALYTICS_EVENTS.premium_cta_viewed, { reason: 'support_natural', scenarioId, mode })
        setPaywallReason('premium_feature')
        setPaywallOpen(true)
        return
      }
      if (!runtime?.available) return

      openSupportUi()
      trackGranular(tool)

      const ctxSupport = buildSupportContext()
      const out = runOpenSupportTool(tool, ctxSupport)
      if (!out) return

      switch (out.kind) {
        case 'hint':
          setHintUseCount((c) => c + 1)
          setSupportCard({ kind: 'hint', text: out.text })
          break
        case 'phrase_suggestions':
          setSupportCard({ kind: 'phrases', phrases: out.phrases })
          break
        case 'slower_reply':
          setMessages((m) => [
            ...m,
            {
              id: newId(),
              role: 'assistant',
              content: out.assistantNl,
              translationEn: out.translationEn,
            },
          ])
          setSupportCard(null)
          break
        case 'translate_key_phrase':
          setMessages((m) =>
            m.map((row) =>
              row.id === out.messageId
                ? { ...row, keyPhraseGlossEn: `${out.chunkNl} → ${out.glossEn}` }
                : row
            )
          )
          setSupportCard(null)
          break
        case 'what_means':
          setMessages((m) =>
            m.map((row) => (row.id === out.messageId ? { ...row, lineMeaningEn: out.explanationEn } : row))
          )
          setSupportCard(null)
          break
        case 'say_naturally':
          setSupportCard({ kind: 'natural', text: out.text })
          break
        case 'restart_turn':
          setMessages((prev) =>
            prev
              .slice(0, -2)
              .map((row) =>
                row.role === 'assistant'
                  ? { ...row, keyPhraseGlossEn: undefined, lineMeaningEn: undefined }
                  : row
              )
          )
          setComposer('')
          setSupportCard(null)
          setLastCoachEn(null)
          break
        case 'easier_mode':
          setSessionDifficulty(out.nextDifficulty)
          setEasierModeActive(out.nextEasierModeActive)
          setLastCoachEn(out.coachEn)
          setSupportCard(null)
          break
        default:
          break
      }
    },
    [buildSupportContext, mode, openSupportUi, scenarioId, supportTools, trackGranular]
  )

  const sendUser = useCallback(async () => {
    const text = composer.trim()
    if (!text || loading) return
    setComposer('')
    setLoading(true)
    setLastCoachEn(null)

    const userMsg: PracticeThreadMessage = { id: newId(), role: 'user', content: text }
    const priorUserTurns = messages.filter((m) => m.role === 'user').length
    if (priorUserTurns === 0) {
      const modality = lastInputModeRef.current === 'voice' ? 'speaking' : 'typing'
      trackScenarioFirstResponse({
        scenario_id: scenarioId,
        scenario_mode: mode,
        input_modality: modality,
        user_turn_index: 1,
      })
      track(
        modality === 'speaking' ? ANALYTICS_EVENTS.speaking_mode_used : ANALYTICS_EVENTS.typing_mode_used,
        { scenarioId, mode, surface: 'open_practice' }
      )
    }
    const messageHistory = messages.map((m) => ({ role: m.role, content: m.content }))
    setMessages((prev) => [...prev, userMsg])
    try {
      const out = await generateOpenPracticeReply({
        mode,
        scenarioId,
        priorUserTurns,
        lastUserMessage: text,
        messageHistory,
        difficulty: sessionDifficulty,
        easierModeActive,
        backendThreadId: backendThreadIdRef.current ?? undefined,
      })
      const asst: PracticeThreadMessage = {
        id: newId(),
        role: 'assistant',
        content: out.assistantNl,
        translationEn:
          mode === 'semi_guided'
            ? 'A2-style Dutch — listen for chunks you can reuse.'
            : undefined,
      }
      setMessages((m) => [...m, asst])
      if (mode === 'semi_guided' && out.coachEn) setLastCoachEn(out.coachEn)
    } finally {
      setLoading(false)
    }
  }, [composer, easierModeActive, loading, messages, mode, scenarioId, sessionDifficulty])

  const finishSession = useCallback(() => {
    if (finishOnce.current) return
    finishOnce.current = true
    const built = buildPostConversationFeedback({
      mode,
      scenarioId,
      scenarioTitle: title,
      scenarioGoal: ctx?.goal,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      keyPhrases,
      supportUsage: {
        estimatedToolUses: hintUseCount + (easierModeActive ? 2 : 0),
        easierModeUsed: easierModeActive,
      },
      entitlementTier: tier,
    })
    setFeedbackResult(built)
    const xpAwarded = applyPracticeFeedbackClientEffects({
      scenarioId,
      mode,
      outcome: built.presenter.outcome,
      sideEffects: built.sideEffects,
      confidencePercent: built.presenter.confidencePercent,
      tier,
    })
    setSessionXpGained(xpAwarded ?? built.sideEffects.xpAmount)
    setPhase('complete')
    if (!completedTracked.current) {
      completedTracked.current = true
      track(ANALYTICS_EVENTS.practice_open_conversation_completed, {
        scenarioId,
        mode,
        outcome: built.presenter.outcome,
      })
      const startMs = chatStartedAtMsRef.current ?? openedAtMsRef.current
      trackScenarioCompleted({
        scenario_id: scenarioId,
        scenario_mode: mode,
        scenario_category: entry?.category,
        entitlement_tier: tier,
        session_outcome: built.presenter.outcome,
        scenario_goal_completed: built.presenter.outcome === 'success',
        duration_ms: startMs != null ? Date.now() - startMs : undefined,
        conversation_turn_count: messages.filter((m) => m.role === 'user').length,
        support_tool_count: supportToolUsesRef.current,
        confidence_percent: built.presenter.confidencePercent,
      })
    }
  }, [
    ctx?.goal,
    easierModeActive,
    entry?.category,
    hintUseCount,
    keyPhrases,
    messages,
    mode,
    scenarioId,
    tier,
    title,
  ])

  useEffect(() => {
    if (phase !== 'complete' || !feedbackResult) return
    if (progressionPostedRef.current) return
    progressionPostedRef.current = true
    const uid = authUserId ?? LOCAL_ANONYMOUS_LEARNER_ID
    const tz = getClientTimeZone()
    const startMs = chatStartedAtMsRef.current ?? openedAtMsRef.current ?? Date.now()
    const durationSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000))
    const completed = feedbackResult.presenter.outcome !== 'needs_practice'
    const turns = messagesRef.current.filter((m) => m.role === 'user').length
    void postProgressionSessionComplete(
      {
        sessionId: progressionOpenIdRef.current,
        userId: uid,
        type: 'scenario',
        durationSeconds,
        completed,
        meaningfulCompletion: true,
        turns,
        improvements: feedbackResult.presenter.improvements.slice(0, 8),
        weaknessesTargeted: feedbackResult.presenter.personalizationTags,
        createdAt: new Date().toISOString(),
      },
      tz,
    )
      .then(() => invalidateProgressionQueries(queryClient, uid, tz))
      .catch(() => {})
  }, [authUserId, feedbackResult, phase, queryClient])

  if (!isFeature1ChatBackendEnabled()) {
    return (
      <BackendRequiredScreen
        title="Practice needs the API"
        description="Semi-guided and free practice use your FluentCopilot backend for real assistant replies. Set NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend, then redeploy."
        backHref={`/app/practice/scenario/${encodeURIComponent(scenarioId)}`}
        backLabel="Back to scenario"
      />
    )
  }

  if (!entry || !access.allowed) {
    return (
      <div className="px-4 py-10 text-center text-body-sm text-ink-secondary max-w-lg mx-auto">
        Redirecting…
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] max-w-lg mx-auto w-full px-4 py-4 pb-28">
      <div className="flex items-center gap-2 mb-3">
        <Link
          href={`/app/practice/scenario/${scenarioId}`}
          className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-muted -ml-2"
          aria-label="Back to mode selection"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
          <h1 className="text-title font-bold text-ink-primary tracking-tight truncate">{title}</h1>
          <ConversationModeBadge mode={mode} />
        </div>
      </div>

      {phase === 'intro' ? (
        <div className="space-y-4">
          {sceneVisual ? (
            <ScenarioSceneVisual
              visual={sceneVisual}
              variant="hero"
              priority
              showSceneChip
              className="rounded-2xl shadow-sm"
            />
          ) : null}
          <Card variant="flat" padding="md" className="border border-slate-200/90">
            <p className="text-body-sm text-ink-secondary leading-relaxed">{entry.summary}</p>
            {ctx?.goal ? (
              <p className="text-body-sm text-ink-primary mt-3">
                <span className="font-semibold text-ink-secondary">Goal · </span>
                {ctx.goal}
              </p>
            ) : null}
          </Card>
          {mode === 'semi_guided' ? (
            <p className="text-caption text-ink-secondary leading-snug">
              Type your own Dutch in this situation. Support stays visible along the bottom — use it when you’re stuck;
              skipping it is fine when you’re flowing.
            </p>
          ) : (
            <p className="text-caption text-ink-secondary leading-snug">
              You steer the dialogue, still inside this scene. Tap <strong>Support</strong> when you want hints — the app
              won’t interrupt you otherwise.
            </p>
          )}
          {sessionBootError ? (
            <p className="text-body-sm text-red-700 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{sessionBootError}</p>
          ) : null}
          <Button type="button" size="lg" fullWidth onClick={startChat} disabled={startingChat}>
            {startingChat
              ? 'Starting…'
              : mode === 'semi_guided'
                ? 'Start semi-guided chat'
                : 'Start free conversation'}
          </Button>
        </div>
      ) : null}

      {phase === 'chat' ? (
        <div className="flex flex-col flex-1 min-h-0 gap-3">
          {assistantAvatar || personaLabelEn ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-surface-elevated/80 p-2.5">
              {assistantAvatar ? (
                <div
                  className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-200 ring-1 ring-slate-300/60 shrink-0"
                  role="img"
                  aria-label={assistantAvatar.alt}
                >
                  <Image
                    src={assistantAvatar.src}
                    alt={assistantAvatar.alt}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-ink-primary truncate">
                  {personaLabelEn ?? 'Conversation partner'}
                </p>
                <p className="text-caption text-ink-secondary truncate">at {title}</p>
              </div>
            </div>
          ) : null}

          <div className="flex justify-between text-caption text-ink-secondary">
            <span>Your turns · {userTurns}</span>
            <span className="truncate text-right">
              {easierModeActive ? 'Easier mode · ' : ''}
              {sessionDifficulty.replace('a2_', 'A2 ')}
            </span>
          </div>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto min-h-[200px] max-h-[min(52vh,440px)]"
          >
            <PracticeChatThread
              messages={messages}
              showTranslationForId={translationId}
              onToggleTranslation={(id) => setTranslationId((t) => (t === id ? null : id))}
              playbackThreadId={`open-practice:${scenarioId}`}
              assistantAvatar={assistantAvatar}
            />
          </div>

          {mode === 'semi_guided' && lastCoachEn ? (
            <Card
              variant="flat"
              padding="sm"
              className="border border-slate-200 bg-surface-muted/60 text-caption text-ink-secondary"
            >
              {lastCoachEn}
            </Card>
          ) : null}

          {mode === 'free' ? (
            <button
              type="button"
              onClick={() => setSupportSheetOpen((s) => !s)}
              className="inline-flex items-center gap-1.5 text-body-sm font-medium text-primary-600 min-h-touch self-start"
            >
              <LifeBuoy className="w-4 h-4" aria-hidden />
              {supportSheetOpen ? 'Hide support' : 'Support'}
            </button>
          ) : null}

          {(mode === 'semi_guided' || supportSheetOpen) && (
            <div className="space-y-2 rounded-xl border border-slate-200/90 bg-surface-elevated/80 p-2">
              <p className="text-caption text-ink-secondary px-1">
                {mode === 'semi_guided'
                  ? 'Guided-light: tools stay visible so you can recover quickly.'
                  : 'On-demand help — using support is part of learning, not giving up.'}
              </p>
              <ConversationSupportBar tools={supportTools} onTool={handleSupportTool} compact />
              {supportCard?.kind === 'hint' ? (
                <Card variant="flat" padding="sm" className="border border-amber-100 bg-amber-50/40 text-body-sm">
                  {supportCard.text}
                </Card>
              ) : null}
              {supportCard?.kind === 'phrases' ? (
                <div className="flex flex-wrap gap-1 px-0.5">
                  {supportCard.phrases.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        supportToolUsesRef.current += 1
                        setComposer((c) => (c ? `${c} ${p}` : p))
                        track(ANALYTICS_EVENTS.phrase_suggestion_used, { scenarioId, mode, phrase: p })
                        track(ANALYTICS_EVENTS.practice_support_tool_used, {
                          tool: 'phrase_chip',
                          scenarioId,
                          mode,
                        })
                      }}
                      className="text-caption px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-ink-primary"
                    >
                      {p.length > 40 ? `${p.slice(0, 38)}…` : p}
                    </button>
                  ))}
                </div>
              ) : null}
              {supportCard?.kind === 'natural' ? (
                <Card variant="flat" padding="sm" className="border border-primary-100 bg-primary-50/30 text-body-sm">
                  {supportCard.text}
                </Card>
              ) : null}
            </div>
          )}

          <textarea
            rows={3}
            value={composer}
            onChange={(e) => {
              lastInputModeRef.current = 'typing'
              setComposer(e.target.value)
            }}
            placeholder={
              dictation.phase === 'recording'
                ? 'Listening… speak in Dutch'
                : dictation.phase === 'processing'
                  ? 'Transcribing your speech…'
                  : 'Type in Dutch…'
            }
            disabled={loading || dictation.phase === 'processing'}
            className="w-full resize-none rounded-xl border border-slate-200 bg-surface-elevated px-3 py-2.5 text-body-sm text-ink-primary placeholder:text-ink-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          />

          {dictation.phase === 'recording' ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2 text-caption text-ink-secondary">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              <span className="font-medium text-ink-primary">Listening · {dictation.secondsLabel}</span>
              <span className="truncate text-ink-tertiary flex-1">
                {dictation.livePreview || 'Tap stop when you’re done.'}
              </span>
              <button
                type="button"
                onClick={dictation.cancel}
                aria-label="Cancel recording"
                className="min-h-touch min-w-touch inline-flex items-center justify-center text-ink-secondary hover:text-ink-primary"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
          ) : null}

          {dictation.phase === 'processing' ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-surface-muted px-3 py-2 text-caption text-ink-secondary">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              <span>Transcribing…</span>
            </div>
          ) : null}

          {dictation.phase === 'error' && dictation.error ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-caption text-ink-primary">
              <span className="flex-1">{dictation.error}</span>
              <button
                type="button"
                onClick={dictation.dismissError}
                aria-label="Dismiss"
                className="min-h-touch min-w-touch inline-flex items-center justify-center text-ink-secondary hover:text-ink-primary"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
          ) : null}

          <div className="flex items-stretch gap-2">
            {dictation.isAvailable ? (
              <button
                type="button"
                onClick={() => {
                  if (dictation.phase === 'recording') {
                    void dictation.stop()
                  } else if (dictation.phase === 'idle' || dictation.phase === 'error') {
                    void dictation.start()
                  }
                }}
                disabled={loading || dictation.phase === 'processing'}
                aria-label={
                  dictation.phase === 'recording'
                    ? 'Stop recording and transcribe'
                    : 'Start voice input — speak in Dutch'
                }
                aria-pressed={dictation.phase === 'recording'}
                className={
                  dictation.phase === 'recording'
                    ? 'inline-flex items-center justify-center rounded-full min-h-touch min-w-touch w-14 bg-rose-500 text-white shadow-md hover:bg-rose-600 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:opacity-50 disabled:pointer-events-none'
                    : 'inline-flex items-center justify-center rounded-full min-h-touch min-w-touch w-14 bg-primary-100 text-primary-700 ring-1 ring-primary-200 hover:bg-primary-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50 disabled:pointer-events-none'
                }
              >
                {dictation.phase === 'recording' ? (
                  <Square className="w-5 h-5 fill-current" aria-hidden />
                ) : (
                  <Mic className="w-5 h-5" aria-hidden />
                )}
              </button>
            ) : null}
            <Button
              type="button"
              size="lg"
              className="flex-1"
              disabled={loading || dictation.phase === 'recording' || dictation.phase === 'processing' || !composer.trim()}
              onClick={sendUser}
            >
              Send
            </Button>
          </div>

          <Button type="button" variant="secondary" fullWidth onClick={finishSession}>
            Finish & see feedback
          </Button>
        </div>
      ) : null}

      {phase === 'complete' && feedbackResult ? (
        <PracticeFeedbackScreen model={feedbackResult.presenter} xpGained={sessionXpGained} />
      ) : null}

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        reason={paywallReason}
        usage={
          paywallReason === 'scenario_cap'
            ? { used: usage.scenariosToday, limit: usage.scenariosLimit }
            : undefined
        }
      />
    </div>
  )
}
