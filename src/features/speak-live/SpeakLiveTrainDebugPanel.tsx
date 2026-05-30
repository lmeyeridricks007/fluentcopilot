'use client'

import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { Bug, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { conversationClient } from '@/lib/api/conversationClient'
import { isSpeakLiveDebugPanelVisible } from '@/lib/speak-live/speakLiveDebugGate'
import type { SpeakLiveTurnResponse } from '@/lib/api/apiTypes'

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  const text = useMemo(() => {
    try {
      if (typeof value === 'string') return value
      return JSON.stringify(
        value,
        (_k, v) => {
          if (typeof v === 'bigint') return v.toString()
          return v
        },
        2
      )
    } catch {
      return '[Could not serialize value]'
    }
  }, [value])
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">{label}</p>
      <pre className="text-[10px] leading-snug whitespace-pre-wrap break-words max-h-48 overflow-y-auto rounded-lg bg-slate-900 border border-slate-700 p-2 text-slate-100">
        {text}
      </pre>
    </div>
  )
}

type SpeakLivePersistedStateLike = {
  lastGroundingDebug?: Record<string, unknown> | null
  scenarioSessionState?: {
    achievedGoals?: unknown[]
    pendingGoals?: unknown[]
  } | null
}

function parseSpeakLiveJson(raw: string | null | undefined): SpeakLivePersistedStateLike | null {
  if (!raw?.trim()) return null
  try {
    return JSON.parse(raw) as SpeakLivePersistedStateLike
  } catch {
    return null
  }
}

export function SpeakLiveTrainDebugPanel({
  scenarioId,
  threadId,
  lastTurnApiDebug,
  recapDebug,
}: {
  scenarioId: string
  threadId: string | null
  /** Latest `speakLiveDebug` from `POST /speak-live/turn` when server debug is on. */
  lastTurnApiDebug?: SpeakLiveTurnResponse['speakLiveDebug'] | null
  /** Optional recap payload from `POST .../end` when server debug is on. */
  recapDebug?: Record<string, unknown> | null
}) {
  const [open, setOpen] = useState(false)
  const train = scenarioId.toLowerCase().includes('train')
  const enabled = isSpeakLiveDebugPanelVisible() && train

  const convQuery = useQuery({
    queryKey: ['speakLive', 'debugPanel', threadId],
    enabled: Boolean(enabled && open && threadId),
    queryFn: () => conversationClient.getConversation(threadId!),
    staleTime: 0,
  })

  const refresh = useCallback(() => {
    void convQuery.refetch()
  }, [convQuery])

  if (!enabled) return null

  const slRaw = convQuery.data?.thread?.speakLiveStateJson ?? null
  const parsed = parseSpeakLiveJson(slRaw ?? null)
  const lastUser = convQuery.data?.messages?.filter((m) => m.sender === 'user').slice(-1)[0]

  return (
    <div className="fixed bottom-[max(5rem,env(safe-area-inset-bottom)+3.5rem)] right-3 left-auto z-[28] w-[min(17rem,calc(100vw-1.5rem))] pointer-events-none">
      <div className="pointer-events-auto rounded-xl border border-amber-200 bg-amber-50 backdrop-blur-md shadow-elevated">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
        >
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
            <Bug className="w-3.5 h-3.5 shrink-0 opacity-90" aria-hidden />
            Dev
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-ink-tertiary" /> : <ChevronDown className="w-4 h-4 text-ink-tertiary" />}
        </button>
        {open ? (
          <div className="max-h-[55vh] overflow-y-auto px-3 pb-3 pt-0 space-y-3 border-t border-amber-200/80 bg-white">
            <p className="text-[10px] text-ink-secondary leading-snug">
              Server must set <code className="text-amber-900 font-mono text-[10px]">SPEAK_LIVE_DEBUG_PANEL=1</code> or{' '}
              <code className="text-amber-900 font-mono text-[10px]">SPEAK_LIVE_DEBUG_TURNS=1</code> (non-production) to attach payloads.
            </p>
            {!threadId ? (
              <p className="text-caption text-ink-secondary">No thread id — start a backend session first.</p>
            ) : (
              <button
                type="button"
                onClick={() => refresh()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-ink-primary hover:bg-slate-100"
              >
                <RefreshCw className={clsx('w-3.5 h-3.5', convQuery.isFetching && 'motion-safe:animate-spin')} />
                Refresh thread
              </button>
            )}
            {lastUser ? (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Latest user message</p>
                <p className="text-caption text-ink-primary">{lastUser.content}</p>
                {lastUser.metadata && typeof lastUser.metadata === 'object' && 'originalTranscript' in lastUser.metadata ? (
                  <JsonBlock label="STT / originalTranscript" value={(lastUser.metadata as { originalTranscript?: string }).originalTranscript} />
                ) : null}
              </div>
            ) : convQuery.isLoading ? (
              <p className="text-caption text-ink-secondary">Loading thread…</p>
            ) : null}
            {parsed?.scenarioSessionState ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <JsonBlock label="Cumulative achievedGoals" value={parsed.scenarioSessionState.achievedGoals ?? []} />
                <JsonBlock label="Pending goals" value={parsed.scenarioSessionState.pendingGoals ?? []} />
              </div>
            ) : null}
            {parsed?.lastGroundingDebug ? (
              <>
                <JsonBlock label="Last turn: detectedGoalsThisTurn" value={parsed.lastGroundingDebug.detectedGoalsThisTurn} />
                <JsonBlock label="Last turn: normalizedTranscript" value={parsed.lastGroundingDebug.normalizedTranscript} />
                <JsonBlock label="Assistant prompt (system+user)" value={parsed.lastGroundingDebug.assistantPromptMessages} />
                <JsonBlock label="Assistant structured output" value={parsed.lastGroundingDebug.assistantStructuredOutput} />
                <JsonBlock label="Merged speakLiveSignals" value={parsed.lastGroundingDebug.mergedSpeakLiveSignals} />
                <JsonBlock label="Recap input snapshot (JSON)" value={parsed.lastGroundingDebug.recapInputSnapshotJson} />
              </>
            ) : (
              <p className="text-caption text-ink-secondary">
                No <code className="text-ink-primary font-mono text-[11px]">lastGroundingDebug</code> on thread yet — trigger a persisted Speak Live turn
                (e.g. text chat with speech metadata, or <code className="text-ink-primary font-mono text-[11px]">/speak-live/turn</code>).
              </p>
            )}
            {lastTurnApiDebug && Object.keys(lastTurnApiDebug).length > 0 ? (
              <JsonBlock label="Last HTTP speak-live/turn speakLiveDebug" value={lastTurnApiDebug} />
            ) : null}
            {recapDebug && Object.keys(recapDebug).length > 0 ? <JsonBlock label="Recap (end session) debug" value={recapDebug} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
