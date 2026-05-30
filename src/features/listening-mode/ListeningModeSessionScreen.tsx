'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { speakNlLinesAsync, speakNlAsync } from '@/lib/lesson-engine/speakNl'
import { APP_LISTENING_MODE, listeningModeReportHref } from '@/lib/routing/appRoutes'
import { getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import { getListeningPack } from '@/lib/listening-mode/catalog'
import type { ListeningClipAttempt, ListeningLevel, ListeningSessionReviewClip } from '@/lib/listening-mode/schema'
import {
  buildListeningDrillPayload,
  drillAnswerOptions,
  drillCorrectAnswerId,
  listeningMcqOrderSeedFromString,
} from '@/lib/listening-mode/listeningDrillPayloadBuilders'
import type { ListeningDrillPayload } from '@/lib/listening-mode/listeningDrillPayloadTypes'
import { resolveListeningSessionClips } from '@/lib/listening-mode/listeningSessionResolve'
import { readListeningProfile, mergeAttemptsIntoListeningProfile } from '@/lib/listening-mode/listeningProfileStorage'
import { buildListeningCoachReport } from '@/lib/listening-mode/listeningReportBuilder'
import { writeListeningSessionRecord } from '@/lib/listening-mode/listeningSessionStorage'
import { appendSessionActivityClient } from '@/store/sessionActivityStore'
import { buildListeningDebugSnapshot } from '@/lib/listening-mode/listeningDebug'
import { isDevToolsEnabledClient } from '@/lib/dev-tools/devToolsAccess'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import { bestOptionMatchIndex } from '@/lib/listening-mode/listeningAnswerMatch'
import {
  ListeningDrillCard,
  type ListeningDrillLockInPayload,
} from '@/features/listening-mode/components/ListeningDrillCard'
import {
  getClientTimeZone,
  invalidateProgressionQueries,
  postProgressionSessionComplete,
} from '@/lib/hooks/useProgression'

export function ListeningModeSessionScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const sp = useSearchParams()
  const packId = sp.get('pack')?.trim() ?? ''
  const levelRaw = sp.get('level')?.trim().toUpperCase() ?? 'A2'
  const level: ListeningLevel = levelRaw === 'A1' || levelRaw === 'B1' ? levelRaw : 'A2'
  const fromScenarioId = sp.get('fromScenario')?.trim() ?? ''
  const userId = useAuthStore((s) => s.user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID)

  const sessionIdRef = useRef<string>(`ls_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`)
  const sessionStartedAtMsRef = useRef(Date.now())
  const profile = useMemo(() => readListeningProfile(userId), [userId])
  const clips = useMemo(() => {
    if (!packId) return []
    return resolveListeningSessionClips(packId, profile.dimensionStress)
  }, [packId, profile.dimensionStress])

  const pack = useMemo(() => getListeningPack(packId), [packId])

  useEffect(() => {
    sessionStartedAtMsRef.current = Date.now()
  }, [packId])
  const scenarioBack = useMemo(
    () => (fromScenarioId ? getScenarioCatalogEntry(fromScenarioId) : undefined),
    [fromScenarioId],
  )

  const [idx, setIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [playsBefore, setPlaysBefore] = useState(0)
  const [playsSlow, setPlaysSlow] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showMeaning, setShowMeaning] = useState(false)
  const [attempts, setAttempts] = useState<ListeningClipAttempt[]>([])
  const [peekUsedThisClip, setPeekUsedThisClip] = useState(false)

  const clip = clips[idx]

  const payload = useMemo<ListeningDrillPayload | null>(() => {
    if (!clip) return null
    const mcqOrderSeed = listeningMcqOrderSeedFromString(`${sessionIdRef.current}:${clip.id}`)
    return buildListeningDrillPayload(clip, level, { packId: pack?.id ?? null, profile, mcqOrderSeed })
  }, [clip, level, pack?.id, profile])

  const debug = useMemo(() => {
    if (!isDevToolsEnabledClient() || !clip || !clips.length || !packId) return null
    return buildListeningDebugSnapshot({
      packId,
      level,
      clips,
      attempts,
      profile,
    })
  }, [packId, level, clips, attempts, profile, clip])

  useEffect(() => {
    setPlaysBefore(0)
    setPlaysSlow(0)
    setSubmitted(false)
    setSelected(null)
    setCorrect(null)
    setShowTranscript(false)
    setShowMeaning(false)
    setPeekUsedThisClip(false)
  }, [idx, clip?.id])

  const playClip = useCallback(
    async (mode: 'normal' | 'slow' | 'fast_speech_slow') => {
      if (!clip || !payload) return
      const lines = payload.audio.linesNl
      let useRate = payload.audio.rate
      if (mode === 'slow') useRate = Math.max(0.72, useRate - 0.14)
      if (mode === 'fast_speech_slow' && payload.kind === 'fast_speech') {
        useRate = payload.slowerAudio.rate
      }
      setBusy(true)
      try {
        if (lines.length === 1) {
          await speakNlAsync(lines[0], { rate: useRate })
        } else {
          await speakNlLinesAsync(lines, { rate: useRate, pauseMsBetween: 420 })
        }
        if (!submitted) setPlaysBefore((n) => n + 1)
        else if (mode === 'slow' || mode === 'fast_speech_slow') setPlaysSlow((n) => n + 1)
      } finally {
        setBusy(false)
      }
    },
    [clip, payload, submitted],
  )

  const onRequestTranscriptHelp = useCallback(() => {
    setShowTranscript(true)
    setPeekUsedThisClip(true)
  }, [])

  const onLockIn = useCallback(
    (p: ListeningDrillLockInPayload) => {
      if (!clip || !payload || submitted) return
      const opts = drillAnswerOptions(payload)
      let ix: number | null = null
      if (p.surface === 'tap') ix = p.selectedIndex
      else ix = bestOptionMatchIndex(opts, p.text)

      if (p.surface === 'tap') setSelected(p.selectedIndex)
      else setSelected(ix)

      const ok = ix != null && opts[ix]?.id === drillCorrectAnswerId(payload)
      setCorrect(ok)
      setSubmitted(true)

      const attempt: ListeningClipAttempt = {
        clipId: clip.id,
        drillType: clip.drillType,
        scenarioId: clip.scenarioId,
        correct: ok,
        selectedIndex: ix ?? undefined,
        playsBeforeAnswer: playsBefore,
        playsSlowAfterAnswer: playsSlow,
        transcriptRevealed: showTranscript,
        transcriptPeekBeforeAnswer: peekUsedThisClip,
        revealedMeaning: showMeaning,
        listeningTags: clip.listeningTags,
        answerDelivery: p.surface,
        typedAttempt: p.surface !== 'tap' ? p.text.trim().slice(0, 500) : undefined,
      }
      setAttempts((a) => [...a, attempt])
    },
    [clip, payload, submitted, playsBefore, playsSlow, showTranscript, showMeaning, peekUsedThisClip],
  )

  const finishSessionWith = (finalAttempts: ListeningClipAttempt[]) => {
    if (!pack) return
    const sid = sessionIdRef.current
    mergeAttemptsIntoListeningProfile(userId, sid, finalAttempts)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lt-listening-profile-updated'))
    }
    const reviewClips: ListeningSessionReviewClip[] = clips.map((c, i) => {
      const att = finalAttempts[i]
      const mcqOrderSeed = listeningMcqOrderSeedFromString(`${sid}:${c.id}`)
      const replayPayload = buildListeningDrillPayload(c, level, { packId: pack.id, profile, mcqOrderSeed })
      const opts = drillAnswerOptions(replayPayload)
      const correctId = drillCorrectAnswerId(replayPayload)
      const correctShuffledIndex = opts.findIndex((o) => o.id === correctId)
      return {
        clipId: c.id,
        drillType: c.drillType,
        scenarioId: c.scenarioId,
        instructionEn: c.instructionEn,
        meaningEn: c.meaningEn,
        transcriptNl: c.transcriptNl,
        optionLabels: opts.map((o) => o.label),
        correctIndex: correctShuffledIndex >= 0 ? correctShuffledIndex : 0,
        speakLinesNl: c.speakLinesNl,
        attemptCorrect: att?.correct ?? false,
        selectedIndex: att?.selectedIndex,
        hadTranscriptReveal: att?.transcriptRevealed ?? false,
      }
    })
    const report = buildListeningCoachReport({
      level,
      scenarioId: pack.scenarioId,
      packId: pack.id,
      attempts: finalAttempts,
      reviewClips,
      nextPackId: null,
    })
    const endedAtIso = new Date().toISOString()
    const record = {
      sessionId: sid,
      userId,
      startedAt: new Date(sessionStartedAtMsRef.current).toISOString(),
      endedAt: endedAtIso,
      level,
      packId: pack.id,
      scenarioId: pack.scenarioId,
      drillTypesUsed: [...new Set(clips.map((c) => c.drillType))],
      attempts: finalAttempts,
      coachSummary: report.headline,
      reviewClips,
    }
    writeListeningSessionRecord(record)
    const ok = finalAttempts.filter((a) => a.correct).length
    const n = finalAttempts.length
    appendSessionActivityClient({
      kind: 'listening',
      mode: 'Listening',
      title: pack.title,
      scenarioId: pack.scenarioId,
      outcome: n ? `${ok}/${n} correct` : 'Completed',
      turnCount: n || undefined,
      note: report.headline.trim().slice(0, 160) || undefined,
    })
    const tz = getClientTimeZone()
    const durationSeconds = Math.max(0, Math.floor((Date.now() - sessionStartedAtMsRef.current) / 1000))
    const completed = n > 0 && ok >= Math.max(1, Math.ceil(n * 0.35))
    void postProgressionSessionComplete(
      {
        sessionId: sid,
        userId,
        type: 'listening',
        durationSeconds,
        completed,
        meaningfulCompletion: completed && n >= 2,
        turns: n,
        improvements: report.headline.trim() ? [report.headline.trim().slice(0, 120)] : undefined,
        createdAt: endedAtIso,
      },
      tz,
    )
      .then(() => invalidateProgressionQueries(queryClient, userId, tz))
      .catch(() => {})
    router.replace(listeningModeReportHref(sid))
  }

  const tryAdvance = () => {
    if (!submitted || !clip) return
    const patched = attempts.map((a, i) => {
      if (i !== attempts.length - 1) return a
      if (a.clipId !== clip.id) return a
      return {
        ...a,
        playsSlowAfterAnswer: playsSlow,
        transcriptRevealed: showTranscript,
        revealedMeaning: showMeaning,
      }
    })
    if (idx + 1 >= clips.length) {
      finishSessionWith(patched)
    } else {
      setAttempts(patched)
      setIdx((i) => i + 1)
    }
  }

  if (!packId || !pack || clips.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-body text-slate-600">Pick a pack from Listening home.</p>
        <Link href={APP_LISTENING_MODE} className="mt-4 inline-block font-semibold text-primary-700">
          ← Back
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/20">
      <div className="mx-auto max-w-lg px-4 pb-28 pt-5">
        <Link
          href={APP_LISTENING_MODE}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-[#7c3aed]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Listening
        </Link>
        {scenarioBack ? (
          <Link
            href={`/app/practice/scenario/${encodeURIComponent(fromScenarioId)}`}
            className="mt-2 block text-[13px] font-semibold text-teal-800 hover:text-teal-950 hover:underline"
          >
            ← Back to {scenarioBack.title}
          </Link>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {pack.scenarioId.replace(/_/g, ' ')} · {level}
          </p>
          <p className="text-caption text-slate-400 tabular-nums">
            {idx + 1} / {clips.length}
          </p>
        </div>

        {clip && payload ? (
          <ListeningDrillCard
            clip={clip}
            payload={payload}
            isLast={idx + 1 >= clips.length}
            busy={busy}
            submitted={submitted}
            correct={correct}
            selected={selected}
            showTranscript={showTranscript}
            showMeaning={showMeaning}
            transcriptPeekBeforeAnswer={peekUsedThisClip}
            onPlay={() => void playClip('normal')}
            onPlaySlow={() =>
              void playClip(payload.kind === 'fast_speech' ? 'fast_speech_slow' : 'slow')
            }
            onPick={(i) => setSelected(i)}
            onLockIn={onLockIn}
            onToggleTranscript={() => setShowTranscript((s) => !s)}
            onToggleMeaning={() => setShowMeaning((s) => !s)}
            onRequestTranscriptHelp={onRequestTranscriptHelp}
            onNext={tryAdvance}
            canSlowReplay={submitted}
            canReveal={submitted}
          />
        ) : null}

        {debug ? (
          <details className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-[11px] text-amber-950">
            <summary className="cursor-pointer font-semibold">Listening debug</summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[10px] leading-snug">
              {JSON.stringify(debug, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  )
}
