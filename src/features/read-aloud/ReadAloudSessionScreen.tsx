'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Mic, Square } from 'lucide-react'
import { playAppSound } from '@/lib/interaction/appSounds'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { APP_READ_ALOUD, APP_READ_ALOUD_REPORT } from '@/lib/routing/appRoutes'
import { blobToBase64 } from '@/lib/speech/speechClient'
import { startMediaRecordingSession, type ActiveMediaRecording } from '@/lib/speech/mediaRecorderCapture'
import { readAloudEvaluate, readAloudEvaluateErrorMessage } from './readAloudApi'
import { putReadAloudLearnerClip } from './readAloudLearnerAudioIdb'
import {
  clearReadAloudSession,
  loadReadAloudSession,
  saveReadAloudReport,
  type ReadAloudSessionPayload,
} from './readAloudStorage'
import { ReadAloudEvaluatingProgress } from './ReadAloudEvaluatingProgress'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import {
  getClientTimeZone,
  invalidateProgressionQueries,
  postProgressionSessionComplete,
} from '@/lib/hooks/useProgression'

function formatBusyElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m > 0) return `${m}:${r.toString().padStart(2, '0')}`
  return `${Math.max(0, r)}s`
}

function formatRecordTimer(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${r.toString().padStart(2, '0')}` : `0:${r.toString().padStart(2, '0')}`
}

function splitSentences(text: string): string[] {
  const t = text.replace(/\r\n/g, '\n').trim()
  if (!t) return []
  const parts = t.split(/(?<=[.!?…])\s+/u)
  const out: string[] = []
  for (const p of parts) {
    const s = p.trim()
    if (s) out.push(s)
  }
  return out.length > 0 ? out : [t]
}

export function ReadAloudSessionScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const authUserId = useAuthStore((s) => s.user?.id)
  const progressionSessionIdRef = useRef(
    `ra_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
  )
  const [session, setSession] = useState<ReadAloudSessionPayload | null>(null)
  const [sentenceIdx, setSentenceIdx] = useState(0)
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [recordElapsedMs, setRecordElapsedMs] = useState(0)
  const [busyElapsedMs, setBusyElapsedMs] = useState(0)
  const capRef = useRef<ActiveMediaRecording | null>(null)
  const recordStartedAtRef = useRef(0)

  useEffect(() => {
    const s = loadReadAloudSession()
    if (!s) {
      router.replace(APP_READ_ALOUD)
      return
    }
    setSession(s)
  }, [router])

  useEffect(() => {
    return () => {
      try {
        capRef.current?.cancel()
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    if (!recording) {
      setRecordElapsedMs(0)
      return
    }
    recordStartedAtRef.current = Date.now()
    setRecordElapsedMs(0)
    const id = window.setInterval(() => {
      setRecordElapsedMs(Date.now() - recordStartedAtRef.current)
    }, 200)
    return () => window.clearInterval(id)
  }, [recording])

  useEffect(() => {
    if (!busy) {
      setBusyElapsedMs(0)
      return
    }
    const t0 = Date.now()
    setBusyElapsedMs(0)
    const id = window.setInterval(() => setBusyElapsedMs(Date.now() - t0), 1000)
    return () => window.clearInterval(id)
  }, [busy])

  const sentences = useMemo(() => (session ? splitSentences(session.targetText) : []), [session])

  const stopAndEvaluate = useCallback(async () => {
    if (!session) return
    const c = capRef.current
    if (!c) return
    setRecording(false)
    capRef.current = null
    setBusy(true)
    setErr(null)
    try {
      const { blob, mimeType } = await c.stop()
      const audioBase64 = await blobToBase64(blob)
      const result = await readAloudEvaluate({
        targetText: session.targetText,
        audioBase64,
        mimeType,
        cefrLevel: session.cefrLevel,
        genre: session.genre ?? null,
      })
      const savedAt = new Date().toISOString()
      const maxB64 = 1_800_000
      const useInline = audioBase64.length <= maxB64
      const learnerAudio = useInline ? { mimeType, dataUrl: `data:${mimeType};base64,${audioBase64}` } : null
      let learnerAudioIdbKey: string | null = null
      if (!useInline) {
        learnerAudioIdbKey = savedAt
        try {
          await putReadAloudLearnerClip(savedAt, blob, mimeType)
        } catch {
          learnerAudioIdbKey = null
        }
      }
      saveReadAloudReport({
        session,
        result,
        savedAt,
        learnerAudio,
        learnerAudioIdbKey,
      })
      const uid = authUserId ?? LOCAL_ANONYMOUS_LEARNER_ID
      const tz = getClientTimeZone()
      const durationSeconds = Math.max(
        0,
        Math.floor((Date.now() - recordStartedAtRef.current) / 1000),
      )
      const overall = result.pronunciationAssessment?.overallScore ?? 0
      const completed = overall >= 45
      void postProgressionSessionComplete(
        {
          sessionId: progressionSessionIdRef.current,
          userId: uid,
          type: 'read_aloud',
          durationSeconds,
          completed,
          meaningfulCompletion: completed,
          turns: splitSentences(session.targetText).length,
          improvements: result.coaching?.focusArea ? [result.coaching.focusArea] : undefined,
          weaknessesTargeted: result.weakWords?.length ? result.weakWords.slice(0, 8) : undefined,
          createdAt: savedAt,
        },
        tz,
      )
        .then(() => invalidateProgressionQueries(queryClient, uid, tz))
        .catch(() => {})
      clearReadAloudSession()
      router.push(APP_READ_ALOUD_REPORT)
    } catch (e) {
      setErr(readAloudEvaluateErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }, [authUserId, queryClient, router, session])

  const startRec = async () => {
    if (!session || busy) return
    setErr(null)
    playAppSound('tap')
    try {
      const s = await startMediaRecordingSession({
        requestDataBeforeStop: true,
        /** Full passages can exceed the default 60s Speak Live clip cap — align with server audio cap (300s). */
        maxDurationMs: 300_000,
      })
      capRef.current = s
      setRecording(true)
    } catch {
      setErr('Microphone permission is required to record.')
    }
  }

  const stopRec = () => {
    void stopAndEvaluate()
  }

  if (!session) {
    return (
      <div className="px-4 py-10 text-center text-body-sm text-ink-secondary">
        Loading…
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-32">
      {busy ? (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-slate-950/45 px-4 py-10 backdrop-blur-sm"
          role="alertdialog"
          aria-busy="true"
          aria-live="polite"
          aria-label="Building read-aloud report"
        >
          <div className="max-h-[min(100dvh-2rem,40rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200/90 bg-white px-5 py-8 shadow-2xl">
            <div className="mx-auto h-11 w-11 rounded-full border-2 border-slate-200 border-t-violet-600 motion-safe:animate-spin" />
            <h2 className="mt-4 text-center text-title font-bold text-ink-primary tracking-tight">
              Building your read-aloud report
            </h2>
            <p className="mt-2 text-center text-body-sm text-ink-secondary leading-relaxed">
              Your recording is being transcribed, scored, and turned into coaching notes. Longer passages can take a
              little while — please keep this screen open.
            </p>
            <p className="mt-3 text-center text-caption font-semibold tabular-nums text-violet-800">
              Elapsed {formatBusyElapsed(busyElapsedMs)}
            </p>
            <ReadAloudEvaluatingProgress />
          </div>
        </div>
      ) : null}

      <Link
        href={APP_READ_ALOUD}
        className="inline-flex min-h-touch items-center rounded-full border border-slate-200/80 bg-white/90 px-3 py-2 text-caption font-semibold text-primary-700 shadow-sm hover:bg-white"
      >
        ← Edit passage
      </Link>

      <header className="space-y-1">
        <p className="text-caption font-semibold text-violet-700 uppercase tracking-wide">Read aloud</p>
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Your reading studio</h1>
        <p className="text-body-sm text-ink-secondary">
          Level <span className="font-semibold text-ink-primary">{session.cefrLevel}</span> · read calmly, then finish
          to generate your report.
        </p>
      </header>

      {session.lineFocus && sentences.length > 1 ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-2">
          <button
            type="button"
            className="inline-flex min-h-touch items-center gap-1 rounded-xl border border-slate-200 px-3 text-caption font-semibold text-ink-primary disabled:opacity-40"
            disabled={sentenceIdx <= 0}
            onClick={() => setSentenceIdx((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Focus
          </button>
          <p className="text-caption text-ink-tertiary">
            Line focus {sentenceIdx + 1}/{sentences.length} · read the full passage when you record
          </p>
          <button
            type="button"
            className="inline-flex min-h-touch items-center gap-1 rounded-xl border border-slate-200 px-3 text-caption font-semibold text-ink-primary disabled:opacity-40"
            disabled={sentenceIdx >= sentences.length - 1}
            onClick={() => setSentenceIdx((i) => Math.min(sentences.length - 1, i + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}

      <Card
        variant="outlined"
        className="rounded-[1.85rem] border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]"
      >
        {session.lineFocus && sentences.length > 1 ? (
          <div className="space-y-3">
            {sentences.map((s, i) => (
              <p
                key={i}
                className={clsx(
                  'whitespace-pre-wrap text-[1.05rem] leading-[1.75] tracking-tight rounded-xl px-2 py-1 transition-colors',
                  i === sentenceIdx
                    ? 'bg-violet-50 text-ink-primary ring-2 ring-violet-200/80 font-medium'
                    : 'text-ink-secondary/85'
                )}
              >
                {s}
              </p>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-[1.05rem] leading-[1.75] text-ink-primary tracking-tight">
            {session.targetText}
          </p>
        )}
      </Card>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-surface-elevated/98 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_14px_-6px_rgb(0_0_0/0.06)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3">
          {err ? (
            <div className="w-full max-w-md rounded-xl border border-red-200/90 bg-red-50/95 px-3 py-2.5 text-left shadow-sm">
              <p className="text-caption leading-relaxed text-red-900">{err}</p>
            </div>
          ) : null}

          {busy ? null : recording ? (
            <div className="flex min-h-[1.25rem] items-center gap-2 text-caption font-semibold text-rose-800">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
              </span>
              Recording ·{' '}
              <span className="tabular-nums tracking-tight">{formatRecordTimer(recordElapsedMs)}</span>
            </div>
          ) : (
            <p className="min-h-[1.25rem] text-center text-caption text-ink-tertiary">
              Tap the mic to start — read the full passage, then tap again to finish and open your report.
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (busy) return
              if (recording) {
                playAppSound('tap')
                stopRec()
                return
              }
              void startRec()
            }}
            className={clsx(
              'relative flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center rounded-full shadow-xl transition-all duration-300 touch-manipulation',
              busy && 'pointer-events-none opacity-50',
              !recording &&
                !busy &&
                'bg-gradient-to-br from-emerald-400 to-emerald-700 text-white ring-4 ring-emerald-500/25',
              recording &&
                'scale-105 bg-gradient-to-br from-rose-500 to-rose-700 text-white ring-4 ring-rose-400/35'
            )}
            aria-label={
              busy ? 'Working' : recording ? 'Finish recording and get report' : 'Start recording your read-aloud'
            }
          >
            {recording ? (
              <Square className="h-8 w-8 fill-current" strokeWidth={2} aria-hidden />
            ) : (
              <Mic className="h-9 w-9" strokeWidth={2} aria-hidden />
            )}
          </button>

          <p className="max-w-sm px-1 text-center text-[10px] leading-relaxed text-ink-tertiary">
            We compare your recording to the passage above. Need to edit? Use Edit passage at the top.
          </p>
        </div>
      </footer>
    </div>
  )
}
