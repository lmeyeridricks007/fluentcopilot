'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { isConversationStreamEnabled, isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { BackendRequiredScreen } from '@/lib/api/BackendRequiredScreen'
import { ApiRequestError } from '@/lib/api/apiErrors'
import { conversationClient } from '@/lib/api/conversationClient'
import {
  buildConversationThreadView,
  mapApiFeedbackModeToUi,
  mapApiSummaryToRecapView,
  mapGetConversationResponse,
  mergeEnrichmentIntoSession,
  mergeSendMessageIntoSession,
} from '@/lib/api/conversationMappers'
import type { MappedConversationSession } from '@/lib/api/conversationMappers'
import { ChatSubheader } from './components/ChatSubheader'
import { EndConversationConfirmModal } from './components/EndConversationConfirmModal'
import { StartNewConversationModal } from './components/StartNewConversationModal'
import { TrainStationContextBanner } from './components/TrainStationContextBanner'
import { ChatMessageBubble } from './components/ChatMessageBubble'
import { InlineCoachFeedback } from './components/InlineCoachFeedback'
import { TypingIndicator } from './components/TypingIndicator'
import { StickyChatComposer } from './components/StickyChatComposer'
import { ConversationThreadShell } from './components/ConversationThreadShell'
import { CoachFeedbackPendingCard } from './components/CoachFeedbackPendingCard'
import { saveLexemeFromChatAsync } from './services/saveWordService'
import { APP_TALK_HUB, appTalkThread, appTalkThreadRecap, speakLiveRunHref } from '@/lib/routing/appRoutes'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import {
  getClientTimeZone,
  invalidateProgressionQueries,
  postProgressionSessionComplete,
} from '@/lib/hooks/useProgression'
import type { ChatMessage, ScenarioConfig, SpeakingCoachingRecapItem } from './types'
import { playAppSound } from '@/lib/interaction/appSounds'
import { logConversationPerf } from '@/lib/api/conversationPerfLog'
import { chatAudioManager } from '@/lib/audio/chatAudioManager'
import type { UserMessageInputMeta } from '@/lib/conversation/userMessageInputMeta'
import type { ComposerSendPayload } from '@/lib/conversation/composerSendPayload'
import type { PronunciationAssessmentApiResponse } from '@/lib/speech/audioPronunciationTypes'
import { evaluateSpeakingCoaching } from '@/lib/speech/speechClient'
import { SpeakingCoachingCard, type SpeakingCoachingCardState } from './components/SpeakingCoachingCard'
import { VoiceQualityFeedbackCard } from './components/VoiceQualityFeedbackCard'
import { pickMatchingStarterSuggestion } from '@/lib/speech/reconcileTranscriptWithReferencePhrase'
function findFeedbackForAiTurn(
  messages: ChatMessage[],
  aiIndex: number,
  pending: import('./types').FeedbackItem[],
  feedbackMode: import('./types').FeedbackMode
): import('./types').FeedbackItem | null {
  if (feedbackMode !== 'after_each') return null
  let prevUser: ChatMessage | undefined
  for (let i = aiIndex - 1; i >= 0; i--) {
    if (messages[i].sender === 'user') {
      prevUser = messages[i]
      break
    }
  }
  if (!prevUser) return null
  const uid = prevUser.id.toLowerCase()
  return pending.find((f) => f.linkedUserMessageId.toLowerCase() === uid) ?? null
}

function ctxStorageKey(threadId: string) {
  return `fc-f1-ctx-dismissed:${threadId}`
}

function pickLastAssistantBeforeUser(messages: ChatMessage[], userMessageId: string): string | undefined {
  const idx = messages.findIndex((m) => m.id === userMessageId)
  if (idx <= 0) return undefined
  for (let i = idx - 1; i >= 0; i--) {
    if (messages[i].sender === 'ai') return messages[i].content
  }
  return undefined
}

/** Zero-based index of this message among user turns in the thread. */
function userTurnIndex(messages: ChatMessage[], userMessageId: string): number {
  const idx = messages.findIndex((m) => m.id === userMessageId)
  if (idx < 0) return 0
  let n = 0
  for (let i = 0; i <= idx; i++) {
    if (messages[i].sender === 'user') n++
  }
  return Math.max(0, n - 1)
}

function speakingCoachingDeferredQueryKey(threadId: string) {
  return ['speakingCoachingDeferred', threadId] as const
}

function speakLiveHrefForThread(scenario: ScenarioConfig): string {
  const scenarioId = scenario.slug ?? scenario.id
  const level = scenario.difficulty === 'B1' ? 'B1' : scenario.difficulty === 'A1' ? 'A1' : 'A2'
  return speakLiveRunHref({ scenarioId, level })
}

function TrainStationChatPageBackend() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const threadId = typeof params.threadId === 'string' ? params.threadId : params.threadId?.[0] ?? ''
  const qc = useQueryClient()
  const progressionUserId = useAuthStore((s) => s.user?.id) ?? LOCAL_ANONYMOUS_LEARNER_ID

  const [composer, setComposer] = useState('')
  const [savedToast, setSavedToast] = useState<string | null>(null)
  const [savedKeys, setSavedKeys] = useState<Set<string>>(() => new Set())
  const [sendError, setSendError] = useState<string | null>(null)
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const [endError, setEndError] = useState<string | null>(null)
  const [ctxDismissed, setCtxDismissed] = useState(false)
  const [pendingUserText, setPendingUserText] = useState<string | null>(null)
  const [streamDraft, setStreamDraft] = useState<string | null>(null)
  const lastEnrichRef = useRef<{ userMessageId: string; assistantMessageId: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const useStream = isConversationStreamEnabled()
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [endConfirmOpen, setEndConfirmOpen] = useState(false)
  const [speakingCoachingByUserId, setSpeakingCoachingByUserId] = useState<
    Record<string, SpeakingCoachingCardState | undefined>
  >({})
  const [voiceQualityByUserMessageId, setVoiceQualityByUserMessageId] = useState<
    Record<string, PronunciationAssessmentApiResponse | undefined>
  >({})

  useEffect(() => {
    if (typeof window === 'undefined' || !threadId) return
    setCtxDismissed(sessionStorage.getItem(ctxStorageKey(threadId)) === '1')
  }, [threadId])

  useEffect(() => {
    if (searchParams.get('endReview') !== '1' || !threadId) return
    setEndConfirmOpen(true)
    router.replace(appTalkThread(threadId))
  }, [searchParams, threadId, router])

  const sessionQuery = useQuery({
    queryKey: ['conversation', threadId],
    queryFn: async () => {
      const raw = await conversationClient.getConversation(threadId)
      return mapGetConversationResponse(raw)
    },
    enabled: Boolean(threadId),
    retry: 1,
  })

  const enrichMut = useMutation({
    mutationFn: (input: { userMessageId: string; assistantMessageId: string }) =>
      conversationClient.enrichConversationTurn(threadId, input),
    onMutate: () => setEnrichError(null),
    onSuccess: (enrich) => {
      lastEnrichRef.current = null
      logConversationPerf('enrich_complete', enrich.perf ?? {})
      qc.setQueryData(['conversation', threadId], (prev: MappedConversationSession | undefined) =>
        prev ? mergeEnrichmentIntoSession(prev, enrich) : prev
      )
    },
    onError: (e) => {
      const msg =
        e instanceof ApiRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Coach tips could not load'
      setEnrichError(msg)
    },
  })

  const sendMut = useMutation({
    mutationFn: async (payload: {
      text: string
      inputMeta?: UserMessageInputMeta
      voiceQuality?: PronunciationAssessmentApiResponse
    }) => {
      const { text, inputMeta } = payload
      if (useStream) {
        return conversationClient.sendConversationMessageStream(
          threadId,
          text,
          { inputMeta },
          {
            onDelta: (chunk) => {
              setStreamDraft((prev) => (prev ?? '') + chunk)
            },
          }
        )
      }
      return conversationClient.sendConversationMessage(threadId, text, { inputMeta })
    },
    onMutate: (payload) => {
      setSendError(null)
      setPendingUserText(payload.text)
      if (useStream) setStreamDraft(null)
    },
    onSuccess: (res, variables) => {
      setPendingUserText(null)
      setStreamDraft(null)
      logConversationPerf('send_complete', res.perf ?? {})
      qc.setQueryData(['conversation', threadId], (prev: MappedConversationSession | undefined) =>
        prev ? mergeSendMessageIntoSession(prev, res) : prev
      )
      if (variables.voiceQuality && res.userMessage?.id) {
        setVoiceQualityByUserMessageId((prev) => ({
          ...prev,
          [res.userMessage.id]: variables.voiceQuality,
        }))
      }
      if (res.enrichmentPending) {
        lastEnrichRef.current = {
          userMessageId: res.userMessage.id,
          assistantMessageId: res.assistantMessage.id,
        }
        enrichMut.mutate({
          userMessageId: res.userMessage.id,
          assistantMessageId: res.assistantMessage.id,
        })
      }

      const speech = variables.inputMeta?.inputMode === 'speech'
      if (speech && res.userMessage?.id) {
        const fbMode = mapApiFeedbackModeToUi(res.thread.feedbackMode)
        if (fbMode === 'after_each') {
          setSpeakingCoachingByUserId((prev) => ({ ...prev, [res.userMessage.id]: { status: 'loading' } }))
        }
        const tid = threadId
        void (async () => {
          try {
            const merged = qc.getQueryData<MappedConversationSession>(['conversation', tid])
            if (!merged) return
            const lastAi = pickLastAssistantBeforeUser(merged.messages, res.userMessage.id)
            const turnIdx = userTurnIndex(merged.messages, res.userMessage.id)
            const cefr: 'A1' | 'A2' | 'B1' =
              merged.scenario.difficulty === 'B1' ? 'B1' : merged.scenario.difficulty === 'A1' ? 'A1' : 'A2'
            const coaching = await evaluateSpeakingCoaching({
              transcript: variables.text.trim(),
              scenarioId: merged.scenario.id,
              scenarioTitle: merged.scenario.title,
              scenarioDescription: merged.scenario.description,
              scenarioGoals: merged.scenario.goals,
              learnerLevelCefr: cefr,
              feedbackMode: fbMode === 'after_each' ? 'after_each' : 'at_end',
              conversationTurnIndex: turnIdx,
              lastAssistantTurn: lastAi ?? null,
              threadSummary: merged.thread.summaryText,
              expectedIntent: null,
            })
            if (fbMode === 'at_end') {
              qc.setQueryData(speakingCoachingDeferredQueryKey(tid), (prev: SpeakingCoachingRecapItem[] | undefined) => [
                ...(prev ?? []),
                { userMessageId: res.userMessage.id, coaching },
              ])
            } else {
              setSpeakingCoachingByUserId((prev) => ({
                ...prev,
                [res.userMessage.id]: { status: 'ready', coaching },
              }))
            }
          } catch (e) {
            const msg =
              e instanceof ApiRequestError
                ? e.message
                : e instanceof Error
                  ? e.message
                  : 'Speaking coach unavailable'
            if (fbMode === 'after_each') {
              setSpeakingCoachingByUserId((prev) => ({
                ...prev,
                [res.userMessage.id]: { status: 'error', message: msg },
              }))
            }
          }
        })()
      }
    },
    onError: (e) => {
      setPendingUserText(null)
      setStreamDraft(null)
      const msg =
        e instanceof ApiRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Something went wrong'
      setSendError(msg)
    },
  })

  const endMut = useMutation({
    mutationFn: () => conversationClient.endConversation(threadId),
    onMutate: () => setEndError(null),
    onSuccess: (res) => {
      setEndConfirmOpen(false)
      const sessionSnap = qc.getQueryData<MappedConversationSession>(['conversation', threadId])
      const deferred = qc.getQueryData<SpeakingCoachingRecapItem[]>(speakingCoachingDeferredQueryKey(threadId))
      const baseModel = mapApiSummaryToRecapView(res.summary)
      const model =
        deferred && deferred.length > 0 ? { ...baseModel, speakingCoachingRecap: deferred } : baseModel
      qc.setQueryData(['conversation', 'recap', threadId], {
        model,
        scenarioTitle: sessionSnap?.scenario.title ?? 'Conversation',
        feedbackMode: sessionSnap ? mapApiFeedbackModeToUi(sessionSnap.thread.feedbackMode) : 'after_each',
      })
      qc.removeQueries({ queryKey: speakingCoachingDeferredQueryKey(threadId) })
      qc.removeQueries({ queryKey: ['conversation', threadId] })
      void qc.invalidateQueries({ queryKey: ['talk', 'continue'] })
      void qc.invalidateQueries({ queryKey: ['talk', 'session-history'] })
      if (sessionSnap) {
        const tz = getClientTimeZone()
        const userTurns = sessionSnap.messages.filter((m) => m.sender === 'user').length
        const t0 = Date.parse(sessionSnap.thread.createdAt)
        const durationSeconds =
          Number.isFinite(t0) && t0 > 0 ? Math.max(0, Math.floor((Date.now() - t0) / 1000)) : 0
        const meaningfulCompletion = userTurns >= 2
        void postProgressionSessionComplete(
          {
            sessionId: threadId,
            userId: progressionUserId,
            type: 'coach',
            durationSeconds,
            completed: meaningfulCompletion,
            meaningfulCompletion,
            turns: userTurns,
            improvements: res.summary.whatToImprove?.slice(0, 8),
            weaknessesTargeted: res.summary.goalsMissed?.slice(0, 8),
            createdAt: new Date().toISOString(),
          },
          tz,
        )
          .then(() => invalidateProgressionQueries(qc, progressionUserId, tz))
          .catch(() => {})
      }
      router.push(appTalkThreadRecap(threadId))
    },
    onError: (e) => {
      const msg =
        e instanceof ApiRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not end this conversation. Try again.'
      setEndError(msg)
    },
  })

  const pauseMut = useMutation({
    mutationFn: () => conversationClient.pauseConversation(threadId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['conversation', threadId] })
      await qc.invalidateQueries({ queryKey: ['talk', 'continue'] })
      await qc.invalidateQueries({ queryKey: ['talk', 'session-history'] })
    },
  })

  const resumeMut = useMutation({
    mutationFn: () => conversationClient.resumeConversation(threadId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['conversation', threadId] })
      await qc.invalidateQueries({ queryKey: ['talk', 'continue'] })
      await qc.invalidateQueries({ queryKey: ['talk', 'session-history'] })
    },
  })

  useEffect(() => {
    const s = sessionQuery.data
    if (!s) return
    if (s.thread.status === 'completed') {
      router.replace(appTalkThreadRecap(threadId))
    }
  }, [sessionQuery.data, threadId, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sessionQuery.data?.messages.length, sendMut.isPending, pendingUserText, streamDraft, enrichMut.isPending])

  const session = sessionQuery.data

  useEffect(() => {
    return () => {
      chatAudioManager.stop()
    }
  }, [])

  useEffect(() => {
    if (!session?.messages) return
    for (const m of session.messages) {
      if (m.sender === 'ai' && m.content.trim()) {
        chatAudioManager.preload(m.id, m.content, m.metadata?.audioUrl, threadId)
      }
    }
  }, [session?.messages, threadId])

  const lastAiMessageId = useMemo(() => {
    const msgs = session?.messages ?? []
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sender === 'ai') return msgs[i].id
    }
    return null
  }, [session?.messages])

  const thread = useMemo(() => {
    if (!session) return null
    return buildConversationThreadView(session, {
      assistantTyping: sendMut.isPending && !useStream,
      contextDismissed: ctxDismissed,
    })
  }, [session, sendMut.isPending, ctxDismissed, useStream])

  const userTurnCount = useMemo(
    () => (session ? session.messages.filter((m) => m.sender === 'user').length : 0),
    [session]
  )

  const openNewFlow = useCallback(() => {
    if (!session) return
    if (session.thread.status === 'active') {
      setNewModalOpen(true)
      return
    }
    router.push(`${APP_TALK_HUB}?openTrainSetup=1`)
  }, [session, router])

  const scenario = session?.scenario ?? null
  const persona = session?.persona ?? null

  const suggestions = useMemo(() => {
    if (!thread || !scenario) return []
    if (thread.mode !== 'guided') return []
    return scenario.starterSuggestions
  }, [thread, scenario])

  const voiceReferenceFromComposer = useMemo(
    () => (suggestions.length > 0 ? pickMatchingStarterSuggestion(composer, suggestions) : null),
    [composer, suggestions]
  )

  const showToast = useCallback((msg: string) => {
    setSavedToast(msg)
    playAppSound('tap')
    window.setTimeout(() => setSavedToast(null), 2200)
  }, [])

  const dismissContext = useCallback(() => {
    if (typeof window !== 'undefined' && threadId) {
      sessionStorage.setItem(ctxStorageKey(threadId), '1')
    }
    setCtxDismissed(true)
  }, [threadId])

  const handleSave = useCallback(
    async (text: string, source: 'chat_ai' | 'chat_feedback', messageId: string, disambiguator?: string) => {
      if (!thread || !scenario) return
      const part = disambiguator ?? (source === 'chat_feedback' ? 'correct' : text)
      const key = `${messageId}|${source}|${part}`
      setSavedKeys((prev) => new Set(prev).add(key))
      try {
        await saveLexemeFromChatAsync({
          text,
          meaning: source === 'chat_ai' ? 'From assistant reply' : 'Coach correction',
          sourceType: source,
          sourceScenarioId: scenario.id,
          sourceThreadId: thread.id,
          sourceMessageId: messageId,
          createdAt: new Date().toISOString(),
        })
        showToast('Saved to Library')
      } catch {
        setSavedKeys((prev) => {
          const n = new Set(prev)
          n.delete(key)
          return n
        })
        showToast('Could not save — try again')
      }
    },
    [thread, scenario, showToast]
  )

  const onSend = useCallback(
    (sendPayload: ComposerSendPayload) => {
      if (!thread || sendMut.isPending || thread.status !== 'active') return
      const t = composer.trim()
      if (!t) return
      setComposer('')
      sendMut.mutate({
        text: t,
        inputMeta: sendPayload.inputMeta,
        voiceQuality: sendPayload.voiceQuality,
      })
    },
    [thread, composer, sendMut]
  )

  const confirmEndConversation = useCallback(() => {
    if (!thread || endMut.isPending) return
    endMut.mutate()
  }, [thread, endMut])

  if (!threadId) {
    return (
      <div className="px-4 py-12 text-center text-body-sm text-ink-secondary max-w-lg mx-auto">
        Missing conversation id.
      </div>
    )
  }

  if (sessionQuery.isLoading) {
    return <ConversationThreadShell statusLine="Syncing messages and scenario…" />
  }

  if (sessionQuery.isError || !session || !thread || !scenario || !persona) {
    return (
      <div className="px-4 py-12 max-w-lg mx-auto space-y-4 text-center">
        <p className="text-body-sm text-ink-secondary">
          {sessionQuery.error instanceof ApiRequestError && sessionQuery.error.status === 404
            ? 'This conversation was not found, or it belongs to another profile.'
            : 'We could not load this conversation. Check that the API is running and try again.'}
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => sessionQuery.refetch()}
            className="min-h-touch rounded-xl bg-primary-600 text-white text-body-sm font-bold px-4 py-3"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => router.push('/app/talk')}
            className="min-h-touch rounded-xl border border-slate-200 text-body-sm font-semibold px-4 py-3"
          >
            Back to Talk
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-7rem)] max-w-lg mx-auto w-full px-4 pb-4">
      <StartNewConversationModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onContinueCurrent={() => setNewModalOpen(false)}
        onPauseAndStartNew={() => {
          pauseMut.mutate(undefined, {
            onSuccess: () => {
              router.push(`${APP_TALK_HUB}?openTrainSetup=1`)
            },
          })
        }}
        onEndAndReviewFirst={() => setEndConfirmOpen(true)}
      />
      <EndConversationConfirmModal
        open={endConfirmOpen}
        onClose={() => setEndConfirmOpen(false)}
        onConfirm={confirmEndConversation}
        confirmPending={endMut.isPending}
      />

      <ChatSubheader
        backHref={APP_TALK_HUB}
        scenarioTitle={scenario.title}
        personaLabel={persona.displayName}
        mode={thread.mode}
        threadStatus={thread.status}
        onNewConversation={openNewFlow}
        newDisabled={sendMut.isPending || endMut.isPending || pauseMut.isPending}
        onPauseConversation={() => pauseMut.mutate()}
        pauseDisabled={
          sendMut.isPending || endMut.isPending || pauseMut.isPending || thread.status !== 'active'
        }
      />

      {thread.status === 'active' ? (
        <div className="mb-2 flex justify-end">
          <Link
            href={speakLiveHrefForThread(scenario)}
            className="text-caption font-bold text-primary-700 hover:text-primary-900 underline-offset-2 hover:underline min-h-touch inline-flex items-center px-1 py-1"
          >
            Switch to speaking
          </Link>
        </div>
      ) : null}

      {thread.status === 'paused' ? (
        <div className="mb-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-caption text-amber-950 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium">Paused — resume to send messages, or start a new chat from Talk.</p>
          <button
            type="button"
            disabled={resumeMut.isPending}
            onClick={() => resumeMut.mutate()}
            className="shrink-0 min-h-touch rounded-lg bg-amber-900 text-white text-caption font-bold px-3 py-2 disabled:opacity-50"
          >
            {resumeMut.isPending ? 'Resuming…' : 'Resume'}
          </button>
        </div>
      ) : null}

      {endError ? (
        <div
          className="mb-2 rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-2 text-caption text-rose-950"
          role="alert"
        >
          <p>{endError}</p>
          <button type="button" className="font-bold underline mt-1" onClick={() => setEndError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {sendError ? (
        <div
          className="mb-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-caption text-amber-950"
          role="alert"
        >
          <p>{sendError}</p>
          <button type="button" className="font-bold underline mt-1" onClick={() => setSendError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {enrichError ? (
        <div
          className="mb-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-caption text-slate-900"
          role="alert"
        >
          <p>{enrichError}</p>
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              className="font-bold underline"
              onClick={() => {
                const last = lastEnrichRef.current
                if (last) enrichMut.mutate(last)
              }}
            >
              Retry coach tips
            </button>
            <button type="button" className="font-bold underline" onClick={() => setEnrichError(null)}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {!thread.contextDismissed ? (
        <TrainStationContextBanner scenario={scenario} onDismiss={dismissContext} />
      ) : null}

      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 pb-44 scroll-smooth">
        {thread.messages.map((msg, i) => {
          if (msg.sender === 'user' || msg.sender === 'ai') {
            const fb =
              msg.sender === 'ai'
                ? findFeedbackForAiTurn(thread.messages, i, thread.pendingFeedback, thread.feedbackMode)
                : null
            const saveWordsPending =
              enrichMut.isPending &&
              msg.sender === 'ai' &&
              msg.id === lastAiMessageId &&
              !msg.metadata?.saveWordCandidates?.length
            const showCoachPending =
              thread.feedbackMode === 'after_each' &&
              enrichMut.isPending &&
              msg.sender === 'ai' &&
              msg.id === lastAiMessageId &&
              !fb
            return (
              <div key={msg.id} className="space-y-2">
                <ChatMessageBubble
                  message={msg}
                  personaEmoji={persona.avatarEmoji}
                  savedKeys={savedKeys}
                  saveWordsPending={saveWordsPending}
                  playbackThreadId={thread.id}
                  onSaveText={
                    msg.sender === 'ai'
                      ? (text, source) => void handleSave(text, source, msg.id)
                      : undefined
                  }
                />
                {fb ? (
                  <InlineCoachFeedback
                    item={fb}
                    savedKeys={savedKeys}
                    onSavePhrase={(text, source) =>
                      void handleSave(text, source, fb.id, text === fb.corrected ? 'correct' : text)
                    }
                  />
                ) : showCoachPending ? (
                  <CoachFeedbackPendingCard />
                ) : null}
                {msg.sender === 'user' && msg.metadata?.inputMode === 'speech' && voiceQualityByUserMessageId[msg.id] ? (
                  <VoiceQualityFeedbackCard
                    layout="thread"
                    payload={voiceQualityByUserMessageId[msg.id]!}
                    spokenTranscript={msg.content}
                    userRecordingUrl={null}
                    compareCoachingText={msg.content.trim()}
                    onDismiss={() =>
                      setVoiceQualityByUserMessageId((prev) => {
                        const next = { ...prev }
                        delete next[msg.id]
                        return next
                      })
                    }
                    onApplyPhraseToComposer={(phrase) => setComposer(phrase)}
                    onSavePhrase={(text) =>
                      void handleSave(text, 'chat_feedback', msg.id, `voice-inline|${text.trim()}`)
                    }
                  />
                ) : null}
                {msg.sender === 'user' && msg.metadata?.inputMode === 'speech' && speakingCoachingByUserId[msg.id] ? (
                  <SpeakingCoachingCard
                    userMessageId={msg.id}
                    state={speakingCoachingByUserId[msg.id]!}
                    savedKeys={savedKeys}
                    onSavePhrase={(text) => void handleSave(text, 'chat_feedback', msg.id, 'speaking-coach')}
                  />
                ) : null}
              </div>
            )
          }
          return null
        })}
        {pendingUserText ? (
          <div className="space-y-2 opacity-90">
            <ChatMessageBubble
              message={{
                id: 'pending-user',
                threadId,
                sender: 'user',
                content: pendingUserText,
                createdAt: new Date().toISOString(),
                type: 'text',
              }}
              personaEmoji={persona.avatarEmoji}
              savedKeys={savedKeys}
              animateEnter
            />
          </div>
        ) : null}
        {useStream && sendMut.isPending && streamDraft && streamDraft.length > 0 ? (
          <div className="space-y-2">
            <ChatMessageBubble
              message={{
                id: 'pending-stream-ai',
                threadId,
                sender: 'ai',
                content: streamDraft,
                createdAt: new Date().toISOString(),
                type: 'text',
              }}
              personaEmoji={persona.avatarEmoji}
              savedKeys={savedKeys}
              animateEnter
            />
          </div>
        ) : null}
        {sendMut.isPending && (!useStream || !streamDraft?.length) ? (
          <TypingIndicator label={`${persona.displayName} is typing`} />
        ) : null}
        <div ref={bottomRef} className="h-2" aria-hidden />
      </div>

      <StickyChatComposer
        value={composer}
        onChange={setComposer}
        onSend={onSend}
        sending={sendMut.isPending}
        disabled={sendMut.isPending || thread.status !== 'active' || endMut.isPending}
        voiceEnabled={thread.status === 'active' && !sendMut.isPending && !endMut.isPending}
        voiceCefrLevel={scenario.difficulty === 'B1' ? 'B1' : 'A2'}
        voiceScenarioHint={scenario.title}
        voiceThreadId={threadId}
        voiceScenarioId={scenario.id}
        voiceReferencePhrase={voiceReferenceFromComposer}
        voiceAssessmentMode={voiceReferenceFromComposer ? 'reference' : 'open_response'}
        voiceGuidedStarters={thread.mode === 'guided' ? suggestions : undefined}
        voiceOnApplyPhrase={(phrase) => setComposer(phrase)}
        voiceOnSavePhrase={(text) =>
          void handleSave(text, 'chat_feedback', `voice-feedback-${threadId}`, `voice|${text.trim()}`)
        }
        suggestions={suggestions}
        onPickSuggestion={(text) => {
          setComposer((c) => (c.trim() ? `${c.trim()} ${text}` : text))
        }}
        endAndReview={
          thread.status === 'active' && userTurnCount >= 2
            ? {
                visible: true,
                disabled: sendMut.isPending || endMut.isPending,
                onPress: () => setEndConfirmOpen(true),
                label: 'End & review',
              }
            : undefined
        }
      />

      {savedToast ? (
        <div
          className="fixed top-[calc(env(safe-area-inset-top)+4rem)] left-1/2 -translate-x-1/2 z-50 rounded-full bg-ink-primary text-white text-caption font-semibold px-4 py-2 shadow-lg motion-safe:animate-fc-message-in"
          role="status"
        >
          {savedToast}
        </div>
      ) : null}
    </div>
  )
}

export function TrainStationChatPage() {
  if (!isFeature1ChatBackendEnabled()) {
    return (
      <BackendRequiredScreen
        title="Talk chat needs the API"
        description="Text conversations use your FluentCopilot backend for the assistant, speech, and recap. Set NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend, then redeploy."
      />
    )
  }
  return <TrainStationChatPageBackend />
}
