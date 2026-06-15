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
import { TrainingLoopSpeakLine } from '@/features/training-loop/TrainingLoopSpeakLine'
import {
  firstSpeakPrompt,
  pronunciationDrillLines,
  readAloudFixPractice,
  retrySentencePractice,
  weakWordsLines,
} from '@/features/training-loop/trainingLoopSpeakPayloads'

const LISTENING_TRAINING_LOOP_TYPES = new Set<string>([
  'listening_burst',
  'missed_detail_retry',
  'fast_speech_burst',
  'listen_and_reply',
  'route_detail_drill',
  'number_time_drill',
])

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

  const weakWordRows = weakWordsLines(loop)
  const pronunciationRows = pronunciationDrillLines(loop)
  const retry = retrySentencePractice(loop)
  const readAloud = readAloudFixPractice(loop)
  const speakPrompt = firstSpeakPrompt(loop)

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

      <section className="mt-6 space-y-3">
        {loop.loopType === 'weak_words' ? (
          <>
            <p className="text-[13px] leading-relaxed text-slate-600 px-0.5">
              Hear each word in Dutch, record yourself, then compare side by side.
            </p>
            <ul className="space-y-3 list-none p-0 m-0">
              {weakWordRows.map((row, i) => (
                <li key={`${row.text}-${i}`}>
                  <TrainingLoopSpeakLine
                    targetNl={row.text}
                    referenceAudioUrl={row.referenceAudioUrl}
                    practiceHint={row.practiceHint}
                    rowLabel={weakWordRows.length > 1 ? `Word ${i + 1}` : undefined}
                    maxRecordingSeconds={14}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {loop.loopType === 'pronunciation_drill' ? (
          <>
            <p className="text-[13px] leading-relaxed text-slate-600 px-0.5">
              Isolate each sound — reference first, then your take.
            </p>
            <ul className="space-y-3 list-none p-0 m-0">
              {pronunciationRows.map((row, i) => (
                <li key={`${row.text}-${i}`}>
                  <TrainingLoopSpeakLine
                    targetNl={row.text}
                    referenceAudioUrl={row.referenceAudioUrl}
                    rowLabel={pronunciationRows.length > 1 ? `Word ${i + 1}` : undefined}
                    maxRecordingSeconds={14}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {loop.loopType === 'retry_sentence' ? (
          <div className="space-y-3">
            {retry.learnerOriginal ? (
              <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">You said</p>
                <p className="mt-1 text-[14px] text-slate-800">{retry.learnerOriginal}</p>
              </div>
            ) : null}
            {retry.correctedVersion ? (
              <TrainingLoopSpeakLine
                targetNl={retry.correctedVersion}
                referenceAudioUrl={retry.referenceAudioUrl}
                sessionCompareAudioUrl={retry.compareAudioUrl}
                rowLabel="Smoother line"
                maxRecordingSeconds={28}
              />
            ) : null}
            {retry.explanationShort ? (
              <p className="text-[13px] text-slate-600 px-0.5">{retry.explanationShort}</p>
            ) : null}
          </div>
        ) : null}

        {loop.loopType === 'read_aloud_fix' ? (
          readAloud.passageText ? (
            <TrainingLoopSpeakLine
              targetNl={readAloud.passageText}
              referenceAudioUrl={readAloud.referenceAudioUrl}
              rowLabel={readAloud.focusLabel ?? 'Passage'}
              maxRecordingSeconds={45}
            />
          ) : readAloud.targetWords?.length ? (
            <ul className="space-y-3 list-none p-0 m-0">
              {readAloud.targetWords.map((w, i) => (
                <li key={`${w}-${i}`}>
                  <TrainingLoopSpeakLine
                    targetNl={w}
                    rowLabel={readAloud.targetWords!.length > 1 ? `Focus word ${i + 1}` : 'Focus word'}
                    maxRecordingSeconds={14}
                  />
                </li>
              ))}
            </ul>
          ) : null
        ) : null}

        {['structure_drill', 'question_drill', 'storytelling_drill', 'mini_scenario'].includes(loop.loopType) &&
        speakPrompt ? (
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-[14px] leading-relaxed text-slate-700 px-0.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
              <span>Work through this out loud — hear the model line, record, then compare.</span>
            </p>
            <TrainingLoopSpeakLine targetNl={speakPrompt} maxRecordingSeconds={35} />
          </div>
        ) : null}

        {['structure_drill', 'question_drill', 'storytelling_drill', 'mini_scenario'].includes(loop.loopType) &&
        !speakPrompt ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm sm:px-5">
            <p className="flex items-start gap-2 text-[14px] leading-relaxed text-slate-700">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
              <span>
                Work through this out loud — keep it short. When it feels solid, mark it done and we will fold the win
                into your learning profile.
              </span>
            </p>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[13px] text-slate-800">
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
