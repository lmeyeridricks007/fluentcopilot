'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { ApiRequestError } from '@/lib/api/apiErrors'
import { conversationClient } from '@/lib/api/conversationClient'
import { parseThreadSummaryTextToRecap } from '@/lib/api/conversationMappers'
import { APP_SPEAK_LIVE_RUN } from '@/lib/routing/appRoutes'
import type { ConversationRecapViewModel } from '@/features/feature1-chat/types'
import { SpeakLiveSessionRecapView } from './SpeakLiveSessionRecapView'
import { SpeakLiveTrainDebugPanel } from './SpeakLiveTrainDebugPanel'

type RecapCache = {
  model: ConversationRecapViewModel
  scenarioTitle: string
  turnCount?: number
  createdAt?: string | null
  updatedAt?: string | null
  speakLiveRecapDebug?: Record<string, unknown> | null
}

function recapQueryKey(threadId: string) {
  return ['speakLive', 'recap', threadId] as const
}

export function SpeakLiveRecapPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const qc = useQueryClient()
  const threadId = typeof params.threadId === 'string' ? params.threadId : params.threadId?.[0] ?? ''

  const scenarioId = searchParams.get('scenarioId')?.trim() || 'train-station'
  const level = searchParams.get('level')?.trim().toUpperCase() || 'A2'

  const scenarioTitle =
    scenarioId.toLowerCase().includes('cafe') ? 'Café' : scenarioId.toLowerCase().includes('train') ? 'Train station' : 'Speak Live'

  const recapQuery = useQuery({
    queryKey: recapQueryKey(threadId),
    enabled: Boolean(threadId) && isFeature1ChatBackendEnabled(),
    retry: 1,
    queryFn: async (): Promise<RecapCache> => {
      const cached = qc.getQueryData<RecapCache>(recapQueryKey(threadId))
      if (cached) return cached

      const raw = await conversationClient.getConversation(threadId)
      if (raw.thread.status !== 'completed') {
        router.replace(`${APP_SPEAK_LIVE_RUN}?${new URLSearchParams({ scenarioId, level }).toString()}`)
        throw new Error('Thread not completed')
      }
      const model = parseThreadSummaryTextToRecap(raw.thread.summaryText)
      if (!model) {
        throw new Error('Recap not available')
      }
      return {
        model,
        scenarioTitle: raw.scenario.title,
        turnCount: raw.messages.filter((message) => message.sender === 'user').length,
        createdAt: raw.thread.createdAt,
        updatedAt: raw.thread.updatedAt,
        speakLiveRecapDebug: qc.getQueryData<RecapCache>(recapQueryKey(threadId))?.speakLiveRecapDebug ?? null,
      }
    },
  })

  useEffect(() => {
    if (!threadId) router.replace('/app/talk/live')
  }, [threadId, router])

  useEffect(() => {
    if (!isFeature1ChatBackendEnabled()) {
      router.replace('/app/talk/live')
    }
  }, [router])

  if (!threadId) {
    return (
      <div className="min-h-[100dvh] bg-surface text-ink-primary flex items-center justify-center text-caption text-ink-tertiary">
        Loading…
      </div>
    )
  }

  if (recapQuery.isLoading) {
    return (
      <div className="min-h-[100dvh] bg-surface text-ink-primary flex flex-col items-center justify-center gap-3">
        <div className="h-9 w-9 rounded-full border-2 border-emerald-200 border-t-primary-500 motion-safe:animate-spin" />
        <p className="text-caption text-ink-secondary">Preparing your recap…</p>
      </div>
    )
  }

  if (recapQuery.isError || !recapQuery.data) {
    const msg =
      recapQuery.error instanceof ApiRequestError && recapQuery.error.status === 404
        ? 'We could not find this session.'
        : 'We could not load your recap. Try ending the session again from Speak Live.'
    return (
      <div className="min-h-[100dvh] bg-surface text-ink-primary px-4 py-12 max-w-md mx-auto flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-body-sm text-ink-secondary">{msg}</p>
        <button
          type="button"
          onClick={() => recapQuery.refetch()}
          className="min-h-touch rounded-xl border border-slate-200 bg-white px-4 py-3 text-body-sm font-semibold text-ink-primary shadow-card"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => router.push('/app/talk/live')}
          className="text-caption text-primary-700 underline-offset-2 hover:underline"
        >
          Back to Speak Live
        </button>
      </div>
    )
  }

  const title = recapQuery.data.scenarioTitle || scenarioTitle

  return (
    <>
      <SpeakLiveSessionRecapView
        model={recapQuery.data.model}
        scenarioTitle={title}
        scenarioId={scenarioId}
        level={level}
        threadId={threadId}
        turnCount={recapQuery.data.turnCount ?? 0}
        createdAt={recapQuery.data.createdAt ?? null}
        updatedAt={recapQuery.data.updatedAt ?? null}
      />
      <SpeakLiveTrainDebugPanel
        scenarioId={scenarioId}
        threadId={threadId}
        recapDebug={recapQuery.data.speakLiveRecapDebug ?? null}
      />
    </>
  )
}
