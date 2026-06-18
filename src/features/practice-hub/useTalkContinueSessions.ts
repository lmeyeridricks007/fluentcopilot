'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { conversationClient } from '@/lib/api/conversationClient'
import {
  mapApiFeedbackModeToUi,
  mapStartConversationResponseToMappedSession,
} from '@/lib/api/conversationMappers'
import { logConversationPerf } from '@/lib/api/conversationPerfLog'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { TRAIN_STATION_SCENARIO_ID } from '@/features/feature1-chat'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import type { ApiConversationThread } from '@/lib/api/apiTypes'
import type { ConversationMode, FeedbackMode } from '@/features/feature1-chat/types'

/**
 * Shared train-station chat + `/talk/continue` data for Talk landing and Activity page.
 */
export function useTalkContinueSessions() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID)
  const useBackend = isFeature1ChatBackendEnabled()

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
    return sessionHistoryQuery.data?.threads ?? []
  }, [sessionHistoryQuery.data?.threads])

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

  const trainPausedList = continueQuery.data?.trainPausedThreads ?? []
  const trainCompletedList = continueQuery.data?.trainRecentCompleted ?? []

  return {
    useBackend,
    continueQuery,
    sessionHistoryQuery,
    completedThreadsForHistory,
    backendTrainContinue,
    activeTrainThread: null,
    pauseTrainMut,
    startMut,
    trainPausedList,
    trainCompletedList,
    showContinueCard: Boolean(backendTrainContinue),
    nextTrainingLoop: continueQuery.data?.nextTrainingLoop ?? null,
    activeTrainingLoops: continueQuery.data?.activeTrainingLoops ?? [],
    trainingLoopHistory: continueQuery.data?.trainingLoopHistory ?? [],
  }
}
