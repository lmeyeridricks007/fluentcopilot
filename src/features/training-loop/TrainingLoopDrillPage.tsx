'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react'
import type { ApiPersonalizedTrainingLoop } from '@/lib/api/apiTypes'
import { conversationClient } from '@/lib/api/conversationClient'
import { ApiRequestError } from '@/lib/api/apiErrors'
import { APP_TALK_HUB, listeningTrainingLoopLaunchHref } from '@/lib/routing/appRoutes'
import { playAppSound } from '@/lib/interaction/appSounds'

const LISTENING_TRAINING_LOOP_TYPES = new Set<string>([
  'listening_burst',
  'missed_detail_retry',
  'fast_speech_burst',
  'listen_and_reply',
  'route_detail_drill',
  'number_time_drill',
])

function payloadWords(loop: ApiPersonalizedTrainingLoop): string[] {
  const p = loop.payload as { words?: string[] } | null
  return Array.isArray(p?.words) ? p.words : []
}

function payloadSentences(loop: ApiPersonalizedTrainingLoop): {
  learnerOriginal?: string
  correctedVersion?: string
  explanationShort?: string
} {
  const p = loop.payload as {
    learnerOriginal?: string
    correctedVersion?: string
    explanationShort?: string
  } | null
  return p ?? {}
}

export function TrainingLoopDrillPage({ loopId }: { loopId: string }) {
  const router = useRouter()
  const [loop, setLoop] = useState<ApiPersonalizedTrainingLoop | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const res = await conversationClient.getTrainingLoop(loopId)
      const L = res.loop
      const deep = listeningTrainingLoopLaunchHref(L.payload)
      if (LISTENING_TRAINING_LOOP_TYPES.has(L.loopType) && deep) {
        router.replace(deep)
        return
      }
      setLoop(L)
      if (L.status === 'active') {
        await conversationClient.patchTrainingLoopStatus(loopId, { status: 'in_progress' })
        const again = await conversationClient.getTrainingLoop(loopId)
        setLoop(again.loop)
      }
    } catch (e) {
      const msg = e instanceof ApiRequestError ? e.message : 'Could not load this rep.'
      setErr(msg)
    }
  }, [loopId, router])

  useEffect(() => {
    void load()
  }, [load])

  const onComplete = async () => {
    setBusy(true)
    playAppSound('tap')
    try {
      await conversationClient.patchTrainingLoopStatus(loopId, { status: 'completed' })
      router.push(APP_TALK_HUB)
    } catch {
      setBusy(false)
    }
  }

  const onDismiss = async () => {
    setBusy(true)
    try {
      await conversationClient.patchTrainingLoopStatus(loopId, { status: 'dismissed' })
      router.push(APP_TALK_HUB)
    } catch {
      setBusy(false)
    }
  }

  if (err) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-[15px] text-red-700">{err}</p>
        <Link href={APP_TALK_HUB} className="mt-4 inline-block font-semibold text-[#7c3aed]">
          Back to Talk
        </Link>
      </div>
    )
  }

  if (!loop) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-[14px] text-slate-500">
        <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-slate-200" />
        Loading your rep…
      </div>
    )
  }

  const words = payloadWords(loop)
  const sent = payloadSentences(loop)

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-[#7c3aed]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </button>

      <header className="mt-6 rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-violet-50/50 px-5 py-6 shadow-sm ring-1 ring-violet-900/[0.04]">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-800/80">Personalized rep</p>
        <h1 className="mt-2 text-[1.45rem] font-bold leading-tight tracking-tight text-slate-900">{loop.title}</h1>
        {loop.subtitle ? <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{loop.subtitle}</p> : null}
        <p className="mt-3 text-[13px] leading-relaxed text-slate-500">{loop.reason}</p>
      </header>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm sm:px-5">
        {loop.loopType === 'weak_words' || loop.loopType === 'pronunciation_drill' ? (
          <ul className="space-y-2">
            {words.map((w) => (
              <li
                key={w}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-[16px] font-semibold text-slate-900"
              >
                {w}
              </li>
            ))}
          </ul>
        ) : null}

        {loop.loopType === 'retry_sentence' ? (
          <div className="space-y-3 text-[14px] leading-relaxed">
            {sent.learnerOriginal ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">You said</p>
                <p className="mt-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-slate-800">{sent.learnerOriginal}</p>
              </div>
            ) : null}
            {sent.correctedVersion ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Smoother line</p>
                <p className="mt-1 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2 font-medium text-emerald-950">
                  {sent.correctedVersion}
                </p>
              </div>
            ) : null}
            {sent.explanationShort ? <p className="text-[13px] text-slate-600">{sent.explanationShort}</p> : null}
          </div>
        ) : null}

        {['structure_drill', 'question_drill', 'storytelling_drill', 'mini_scenario', 'read_aloud_fix'].includes(loop.loopType) ? (
          <div className="space-y-2 text-[14px] leading-relaxed text-slate-700">
            <p className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
              <span>
                Work through this out loud — keep it short. When it feels solid, mark it done and we will fold the win
                into your learning profile.
              </span>
            </p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[13px] text-slate-800">
              {JSON.stringify(loop.payload, null, 2)}
            </pre>
          </div>
        ) : null}
      </section>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          disabled={busy || loop.status === 'completed'}
          onClick={() => void onComplete()}
          className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-2xl bg-[#7c3aed] px-4 py-3 text-[15px] font-semibold text-white shadow-sm hover:bg-[#0d5eb0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          {loop.status === 'completed' ? 'Completed' : 'Mark done'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDismiss()}
          className="inline-flex min-h-touch flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
