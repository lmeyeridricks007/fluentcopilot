'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { BackendRequiredScreen } from '@/lib/api/BackendRequiredScreen'
import { ApiRequestError } from '@/lib/api/apiErrors'
import { conversationClient } from '@/lib/api/conversationClient'
import {
  mapApiFeedbackModeToUi,
  parseThreadSummaryTextToRecap,
} from '@/lib/api/conversationMappers'
import { ConversationRecapView } from './components/ConversationRecapView'
import { RecapContentShell } from './components/ConversationThreadShell'
import { appTalkThread } from '@/lib/routing/appRoutes'
import type { ConversationRecapViewModel, FeedbackMode } from './types'

type RecapCachePayload = {
  model: ConversationRecapViewModel
  scenarioTitle: string
  feedbackMode: FeedbackMode
}

function TrainStationRecapPageBackend() {
  const params = useParams()
  const router = useRouter()
  const threadId = typeof params.threadId === 'string' ? params.threadId : params.threadId?.[0] ?? ''
  const qc = useQueryClient()

  const recapQuery = useQuery({
    queryKey: ['conversation', 'recap', threadId],
    enabled: Boolean(threadId),
    retry: 1,
    queryFn: async (): Promise<RecapCachePayload> => {
      const cached = qc.getQueryData<RecapCachePayload>(['conversation', 'recap', threadId])
      if (cached) return cached

      const raw = await conversationClient.getConversation(threadId)
      if (raw.thread.status !== 'completed') {
        router.replace(appTalkThread(threadId))
        throw new Error('Thread not completed')
      }
      const model = parseThreadSummaryTextToRecap(raw.thread.summaryText)
      if (!model) {
        throw new Error('Recap not available yet')
      }
      return {
        model,
        scenarioTitle: raw.scenario.title,
        feedbackMode: mapApiFeedbackModeToUi(raw.thread.feedbackMode),
      }
    },
  })

  useEffect(() => {
    if (!threadId) router.replace('/app/talk')
  }, [threadId, router])

  if (!threadId) {
    return null
  }

  if (recapQuery.isLoading) {
    return <RecapContentShell />
  }

  if (recapQuery.isError || !recapQuery.data) {
    const msg =
      recapQuery.error instanceof ApiRequestError && recapQuery.error.status === 404
        ? 'We could not find this recap.'
        : 'We could not load the recap. Try again in a moment.'
    return (
      <div className="px-4 py-12 max-w-lg mx-auto space-y-4 text-center">
        <p className="text-body-sm text-ink-secondary">{msg}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => recapQuery.refetch()}
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

  const { model, scenarioTitle, feedbackMode } = recapQuery.data

  return (
    <ConversationRecapView model={model} feedbackMode={feedbackMode} scenarioTitle={scenarioTitle} />
  )
}

export function TrainStationRecapPage() {
  if (!isFeature1ChatBackendEnabled()) {
    return (
      <BackendRequiredScreen
        title="Recap needs the API"
        description="Session recaps are loaded from your FluentCopilot backend. Set NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_FEATURE1_CHAT_SOURCE=backend, then redeploy."
      />
    )
  }
  return <TrainStationRecapPageBackend />
}
