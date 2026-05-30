'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { conversationClient } from '@/lib/api/conversationClient'
import {
  mapApiFeedbackModeToUi,
  mapStartConversationResponseToMappedSession,
  mapUiFeedbackModeToApi,
} from '@/lib/api/conversationMappers'
import { logConversationPerf } from '@/lib/api/conversationPerfLog'
import { TRAIN_STATION_SCENARIO_ID, useFeature1ConversationStore } from '@/features/feature1-chat'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import type { ApiConversationThread } from '@/lib/api/apiTypes'
import type { ConversationMode, ConversationThread, FeedbackMode } from '@/features/feature1-chat/types'

function mockThreadToApiThread(t: ConversationThread, externalUserId: string): ApiConversationThread {
  const st = t.summary
  const summaryText =
    st?.nextStep?.trim() || st?.usefulPhrase?.trim() || st?.usefulWord?.trim() || null
  return {
    id: t.id,
    userId: externalUserId,
    scenarioId: t.scenarioId,
    personaId: t.personaId,
    mode: t.mode,
    conversationSurface: t.conversationSurface ?? 'text',
    feedbackMode: mapUiFeedbackModeToApi(t.feedbackMode),
    status: t.status,
    summaryText,
    currentStage: t.currentStage,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    lastUserMessageAt: null,
  }
}

/**
 * Shared train-station chat + `/talk/continue` data for Talk landing and Activity page.
 * Does not change API contracts — only centralizes the query and mock fallbacks.
 */
export function useTalkContinueSessions() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID)
  const useBackend = isFeature1ChatBackendEnabled()

  const activeTrainThread = useFeature1ConversationStore((s) =>
    s.byUserId[userId]?.threads.find(
      (t) => t.scenarioId === TRAIN_STATION_SCENARIO_ID && t.status === 'active'
    )
  )
  const mockTrainThreads = useFeature1ConversationStore((s) => s.byUserId[userId]?.threads)

  const pausedMockThreads = useMemo(() => {
    const list = mockTrainThreads ?? []
    return list
      .filter((t) => t.scenarioId === TRAIN_STATION_SCENARIO_ID && t.status === 'paused')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [mockTrainThreads])

  const completedMockThreads = useMemo(() => {
    const list = mockTrainThreads ?? []
    return list
      .filter((t) => t.scenarioId === TRAIN_STATION_SCENARIO_ID && t.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [mockTrainThreads])

  const continueQuery = useQuery({
    queryKey: ['talk', 'continue'],
    queryFn: () => conversationClient.getContinueConversation(),
    enabled: useBackend,
    staleTime: 15_000,
    retry: 1,
  })

  const sessionHistoryQuery = useQuery({
    queryKey: ['talk', 'session-history', userId],
    queryFn: () => conversationClient.getTalkSessionHistory(),
    enabled: useBackend,
    staleTime: 15_000,
    retry: 1,
  })

  const completedThreadsForHistory = useMemo((): ApiConversationThread[] => {
    if (useBackend) return sessionHistoryQuery.data?.threads ?? []
    const list = mockTrainThreads ?? []
    return list
      .filter((t) => t.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((t) => mockThreadToApiThread(t, userId))
  }, [useBackend, sessionHistoryQuery.data?.threads, mockTrainThreads, userId])

  const backendTrainContinue = useMemo(() => {
    if (!useBackend || !continueQuery.data?.activeThread || !continueQuery.data.scenario) return null
    if (continueQuery.data.scenario.slug !== TRAIN_STATION_SCENARIO_ID) return null
    const { activeThread, scenario, persona } = continueQuery.data
    return {
      threadId: activeThread.id,
      updatedAt: activeThread.updatedAt,
      mode: activeThread.mode as ConversationMode,
      feedbackMode: mapApiFeedbackModeToUi(activeThread.feedbackMode),
      scenarioTitle: scenario.title,
      personaName: persona?.displayName ?? 'Assistant',
    }
  }, [useBackend, continueQuery.data])

  const pauseTrainMut = useMutation({
    mutationFn: (tid: string) => conversationClient.pauseConversation(tid),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['talk', 'continue'] })
      void qc.invalidateQueries({ queryKey: ['talk', 'session-history'] })
    },
  })

  const startMut = useMutation({
    mutationFn: (opts: { mode: ConversationMode; feedbackMode: FeedbackMode }) =>
      conversationClient.startConversation({
        scenarioId: TRAIN_STATION_SCENARIO_ID,
        mode: opts.mode,
        feedbackMode: opts.feedbackMode,
      }),
    onSuccess: (data) => {
      qc.setQueryData(['conversation', data.thread.id], mapStartConversationResponseToMappedSession(data))
      logConversationPerf('start_seeded', { threadId: data.thread.id, messageCount: data.messages.length })
      void qc.invalidateQueries({ queryKey: ['talk', 'continue'] })
      void qc.invalidateQueries({ queryKey: ['talk', 'session-history'] })
    },
  })

  const trainPausedList = useBackend ? (continueQuery.data?.trainPausedThreads ?? []) : pausedMockThreads
  const trainCompletedList = useBackend ? (continueQuery.data?.trainRecentCompleted ?? []) : completedMockThreads

  const showContinueCard = useBackend ? Boolean(backendTrainContinue) : Boolean(activeTrainThread)

  return {
    useBackend,
    continueQuery,
    sessionHistoryQuery,
    /** All recently completed threads (Speak Live + coach chat) for History / Activity — not train-only. */
    completedThreadsForHistory,
    backendTrainContinue,
    activeTrainThread,
    pauseTrainMut,
    startMut,
    trainPausedList,
    trainCompletedList,
    showContinueCard,
    nextTrainingLoop: continueQuery.data?.nextTrainingLoop ?? null,
    activeTrainingLoops: continueQuery.data?.activeTrainingLoops ?? [],
    trainingLoopHistory: continueQuery.data?.trainingLoopHistory ?? [],
  }
}
