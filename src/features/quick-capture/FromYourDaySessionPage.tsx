'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { quickCaptureClient, type DayPracticePackApi, type QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import { buildDayPracticePackFromCaptures, type DayPracticeStep, type PracticePackMode } from '@/features/quick-capture/dayPackFromCaptures'
import { useQuickCaptureOfflineStore } from '@/store/quickCaptureOfflineStore'
import {
  APP_HISTORY,
  APP_LANGUAGE_COACH,
  APP_LIBRARY_FROM_YOUR_DAY,
  APP_LIBRARY_HUB,
  APP_READ_ALOUD,
  APP_TALK_HUB,
  personalizedPracticeReportHref,
  speakLiveRunHref,
} from '@/lib/routing/appRoutes'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import { useQueryClient } from '@tanstack/react-query'
import {
  getClientTimeZone,
  invalidateProgressionQueries,
  postProgressionSessionComplete,
} from '@/lib/hooks/useProgression'
import {
  appendPersonalizedPracticeSession,
  buildPersonalizedPracticeReport,
  progressionSessionIdForFromYourDayPack,
} from '@/lib/quick-capture/personalizedPracticeHistory'
import {
  fromYourDayPackCompletionQualifies,
  fromYourDayPackProgressCountsQualify,
} from '@/lib/progression/fromYourDayPackRules'
import { personalizedPackXpBand } from '@/lib/progression/personalizedPackXp'
import { recordFromYourDayPracticeComplete } from '@/lib/retention/retentionService'
import {
  collectStruggleSignalsFromCaptures,
  inferPracticePackModeFromSteps,
} from '@/features/quick-capture/fromYourDayProgressionUtils'
import { playAppSound } from '@/lib/interaction/appSounds'
import { Button } from '@/components/ui/Button'
import { FromYourDayHubPanel } from '@/features/quick-capture/FromYourDayHubPanel'
import { friendlyPackStepEyebrow } from '@/features/quick-capture/fromYourDayStepLabels'
import { contextLineForStep } from '@/features/quick-capture/fromYourDayCaptureContext'
import { themeSummaryFromCaptures } from '@/features/quick-capture/fromYourDayHubUtils'
import { isCaptureEligibleForFromYourDayHub } from '@/features/quick-capture/fromYourDayCaptureEligibility'
import { buildInteractiveSessionFromSteps } from '@/features/quick-capture/interactivePack/buildInteractiveSessionFromSteps'
import { InteractiveFromYourDayRunner } from '@/features/quick-capture/interactivePack/InteractiveFromYourDayRunner'
import { interactivePackMeetsEffortBar } from '@/features/quick-capture/interactivePack/interactivePackMeaningfulPractice'
import type { InteractivePackProgressV2 } from '@/features/quick-capture/interactivePack/interactivePackProgressTypes'
import { countCompletedHeavyBlocks } from '@/features/quick-capture/interactivePack/interactivePackXpPreview'
import {
  loadInteractivePackProgress,
  mergeInteractiveBlockCompletion,
  saveInteractivePackProgress,
} from '@/features/quick-capture/interactivePack/packProgressStorage'
import type { ExerciseBlockResultPayload } from '@/features/generated-exercise-pack/exerciseBlockResult'

function SessionDeeperStrip(props: { focusDutch: string | null }) {
  const w = props.focusDutch?.trim()
  const coachHref = w
    ? `${APP_LANGUAGE_COACH}?focus=${encodeURIComponent(
        `I’m practicing “${w}” from my day — collocations and one line I can say today.`,
      )}`
    : APP_LANGUAGE_COACH
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1">More tools</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <Link href={APP_TALK_HUB} className="text-caption font-semibold text-primary-800 underline-offset-2 hover:underline">
          Talk
        </Link>
        <Link href={APP_READ_ALOUD} className="text-caption font-semibold text-primary-800 underline-offset-2 hover:underline">
          Read aloud
        </Link>
        <Link href={coachHref} className="text-caption font-semibold text-primary-800 underline-offset-2 hover:underline">
          Coach
        </Link>
        <Link href="/app/practice/voice" className="text-caption font-semibold text-primary-800 underline-offset-2 hover:underline">
          Voice
        </Link>
      </div>
    </div>
  )
}

function isStep(x: unknown): x is DayPracticeStep {
  if (!x || typeof x !== 'object' || !('kind' in x) || !('id' in x)) return false
  const k = (x as { kind: unknown }).kind
  return typeof k === 'string' && k.length > 0
}

export function FromYourDaySessionPage() {
  const qc = useQueryClient()
  const router = useRouter()
  const sp = useSearchParams()
  const packId = sp.get('pack')?.trim() ?? ''
  const dateParam = sp.get('date')?.trim() ?? quickCaptureClient.localDateYmd()

  const userId = useAuthStore((s) => s.user?.id) ?? LOCAL_ANONYMOUS_LEARNER_ID
  const backend = isFeature1ChatBackendEnabled()

  const [pack, setPack] = useState<DayPracticePackApi | null>(null)
  const [steps, setSteps] = useState<DayPracticeStep[]>([])
  const [loading, setLoading] = useState(Boolean(packId))
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [interactiveProgress, setInteractiveProgress] = useState<InteractivePackProgressV2>({
    schemaVersion: 2,
    blocks: {},
  })
  const [finished, setFinished] = useState(false)

  const [hubCaptures, setHubCaptures] = useState<QuickCaptureItem[]>([])
  const [hubLoading, setHubLoading] = useState(!packId)
  const [hubError, setHubError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const [captureById, setCaptureById] = useState<Map<string, QuickCaptureItem>>(new Map())

  const offlinePacks = useQuickCaptureOfflineStore((s) => s.packs)
  const offlineCaptures = useQuickCaptureOfflineStore((s) => s.captures)
  const offlineAddPack = useQuickCaptureOfflineStore((s) => s.addPack)
  const offlineCompletePack = useQuickCaptureOfflineStore((s) => s.completePack)
  const offlineSetCapture = useQuickCaptureOfflineStore((s) => s.setCaptureStatus)

  useEffect(() => {
    if (packId) return
    let cancelled = false
    ;(async () => {
      setHubLoading(true)
      setHubError(null)
      try {
        if (backend) {
          // No status filter — server returns all rows for the day; we mirror pack generation eligibility.
          const r = await quickCaptureClient.list({ localDate: dateParam })
          const items = (r.items ?? []).filter(isCaptureEligibleForFromYourDayHub)
          if (!cancelled) setHubCaptures(items)
        } else {
          const caps = offlineCaptures.filter(
            (c) => c.localCaptureDate === dateParam && isCaptureEligibleForFromYourDayHub(c),
          )
          if (!cancelled) setHubCaptures(caps)
        }
      } catch (e) {
        if (!cancelled) setHubError(e instanceof Error ? e.message : 'Could not load captures')
      } finally {
        if (!cancelled) setHubLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [backend, dateParam, offlineCaptures, packId])

  /** After saving a word in another tab or when enrichment flips status, refresh the hub list. */
  useEffect(() => {
    if (packId) return
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      void (async () => {
        try {
          if (backend) {
            const r = await quickCaptureClient.list({ localDate: dateParam })
            setHubCaptures((r.items ?? []).filter(isCaptureEligibleForFromYourDayHub))
          } else {
            setHubCaptures(
              offlineCaptures.filter(
                (c) => c.localCaptureDate === dateParam && isCaptureEligibleForFromYourDayHub(c),
              ),
            )
          }
        } catch {
          /* ignore — main load effect shows errors */
        }
      })()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [backend, dateParam, offlineCaptures, packId])

  useEffect(() => {
    if (!packId || !pack) return
    let cancelled = false
    ;(async () => {
      try {
        if (backend) {
          const r = await quickCaptureClient.list({ localDate: pack.localDate ?? dateParam })
          const m = new Map<string, QuickCaptureItem>()
          for (const it of r.items ?? []) m.set(it.id, it)
          if (!cancelled) setCaptureById(m)
        } else {
          const m = new Map<string, QuickCaptureItem>()
          for (const it of offlineCaptures) m.set(it.id, it)
          if (!cancelled) setCaptureById(m)
        }
      } catch {
        if (!cancelled) setCaptureById(new Map())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [backend, dateParam, offlineCaptures, pack, packId])

  useEffect(() => {
    if (!packId) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        if (backend) {
          const r = await quickCaptureClient.getPack(packId)
          if (cancelled) return
          setPack(r.pack)
          setSteps((r.steps ?? []).filter(isStep))
          if (!cancelled) setInteractiveProgress(loadInteractivePackProgress(packId))
        } else {
          const local = offlinePacks.find((p) => p.id === packId)
          if (!local) {
            setError('Pack not found')
            setLoading(false)
            return
          }
          setPack(local)
          setSteps((local.steps ?? []).filter(isStep))
          if (!cancelled) setInteractiveProgress(loadInteractivePackProgress(packId))
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load pack')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [backend, offlinePacks, packId])

  const workSteps = useMemo(() => steps.filter((s) => s.kind !== 'pack_meta'), [steps])

  const completedWorkCount = useMemo(
    () => workSteps.filter((s) => Boolean(done[s.id])).length,
    [done, workSteps],
  )

  const practicePackMode = useMemo(() => inferPracticePackModeFromSteps(steps), [steps])

  const interactiveSession = useMemo(() => {
    if (!steps.length) return null
    return buildInteractiveSessionFromSteps(steps, {
      packTitle: pack?.title?.trim() || 'From your day',
      mode: practicePackMode,
    })
  }, [steps, pack?.title, practicePackMode])

  const useInteractiveFlow = Boolean(interactiveSession && interactiveSession.exercises.length > 0)

  const interactiveTotal = interactiveSession?.exercises.length ?? 0
  const interactiveCompleted = useMemo(
    () =>
      interactiveSession
        ? interactiveSession.exercises.filter((e) => interactiveProgress.blocks[e.id]?.completionState === 'completed')
            .length
        : 0,
    [interactiveSession, interactiveProgress.blocks],
  )

  const interactiveEffortOk = useMemo(() => {
    if (!useInteractiveFlow || !interactiveSession) return true
    return interactivePackMeetsEffortBar(interactiveSession.exercises, interactiveProgress.blocks)
  }, [interactiveSession, interactiveProgress.blocks, useInteractiveFlow])

  const progressTotal = useInteractiveFlow ? interactiveTotal : workSteps.length
  const progressCompleted = useInteractiveFlow ? interactiveCompleted : completedWorkCount

  const sessionPackFocusWord = useMemo(() => {
    const w = workSteps.find((s): s is Extract<DayPracticeStep, { kind: 'word_rep' }> => s.kind === 'word_rep')
    return w?.dutch?.trim() ?? null
  }, [workSteps])

  const checklistProgressPct = useMemo(() => {
    if (progressTotal <= 0) return 0
    return Math.round((progressCompleted / progressTotal) * 100)
  }, [progressCompleted, progressTotal])

  /** Surface Talk / Coach / etc. only after the learner has cleared the same bar as “meaningful pack progress”. */
  const showSessionDeeperStrip = useMemo(
    () =>
      fromYourDayPackProgressCountsQualify({
        stepsTotal: progressTotal,
        stepsCompleted: progressCompleted,
      }),
    [progressCompleted, progressTotal],
  )

  const markInteractiveExerciseDone = useCallback(
    (exerciseId: string, result?: ExerciseBlockResultPayload) => {
      setInteractiveProgress((prev) => {
        const { next, didWrite } = mergeInteractiveBlockCompletion(prev, exerciseId, result)
        if (!didWrite) return prev
        if (packId) saveInteractivePackProgress(packId, next)
        playAppSound('tap')
        return next
      })
    },
    [packId],
  )

  const packCaptureIds = useMemo(() => {
    const raw = pack?.captureIdsJson?.trim()
    if (!raw) return [] as string[]
    try {
      const ids = JSON.parse(raw) as unknown
      return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : []
    } catch {
      return []
    }
  }, [pack?.captureIdsJson])

  const weaknessTagsForXp = useMemo(() => {
    const caps = packCaptureIds.map((id) => captureById.get(id)).filter(Boolean) as QuickCaptureItem[]
    return collectStruggleSignalsFromCaptures(caps.length ? caps : hubCaptures, 8)
  }, [captureById, hubCaptures, packCaptureIds])

  const sessionThemeSummary = useMemo(() => {
    const ids = new Set<string>()
    for (const s of steps) {
      if ('captureId' in s && typeof s.captureId === 'string' && s.captureId !== 'meta') ids.add(s.captureId)
    }
    const caps = [...ids].map((id) => captureById.get(id)).filter(Boolean) as QuickCaptureItem[]
    return themeSummaryFromCaptures(caps.length ? caps : hubCaptures)
  }, [captureById, hubCaptures, steps])

  const recapMeta = useMemo(() => {
    const r = steps.find((s) => s.kind === 'short_recap')
    return r && r.kind === 'short_recap' ? { minutes: r.estimatedMinutes, bullets: r.bullets } : null
  }, [steps])

  const toggleStep = useCallback((id: string) => {
    playAppSound('tap')
    setDone((d) => ({ ...d, [id]: !d[id] }))
  }, [])

  const generate = useCallback(
    async (mode: PracticePackMode) => {
      playAppSound('tap')
      setError(null)
      setGenerating(true)
      try {
        if (backend) {
          const r = await quickCaptureClient.generatePack(dateParam, { mode })
          router.replace(`${APP_LIBRARY_FROM_YOUR_DAY}?pack=${encodeURIComponent(r.packId)}&date=${encodeURIComponent(dateParam)}`)
          return
        }
        const caps = offlineCaptures.filter(
          (c) => c.localCaptureDate === dateParam && isCaptureEligibleForFromYourDayHub(c),
        )
        const content = buildDayPracticePackFromCaptures({ localDate: dateParam, captures: caps, mode })
        if (!content.steps.length) {
          setError('Save a few moments in Library first — then come back to build a short pack.')
          return
        }
        const id = crypto.randomUUID?.() ?? `pack-${Date.now()}`
        const now = new Date().toISOString()
        const p: DayPracticePackApi & { steps: unknown[] } = {
          id,
          userId,
          localDate: dateParam,
          title: content.title,
          stepsJson: JSON.stringify(content.steps),
          captureIdsJson: JSON.stringify(content.captureIds),
          status: 'active',
          createdAt: now,
          completedAt: null,
          steps: content.steps,
        }
        offlineAddPack(p)
        for (const cid of content.captureIds) {
          offlineSetCapture(cid, 'included_in_practice')
        }
        router.replace(`${APP_LIBRARY_FROM_YOUR_DAY}?pack=${encodeURIComponent(id)}&date=${encodeURIComponent(dateParam)}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not generate')
      } finally {
        setGenerating(false)
      }
    },
    [backend, dateParam, offlineAddPack, offlineCaptures, offlineSetCapture, router, userId],
  )

  const finalize = useCallback(async () => {
    if (!packId || !pack) return
    playAppSound('library_save')
    const countsQualify = fromYourDayPackCompletionQualifies({
      stepsTotal: progressTotal,
      stepsCompleted: progressCompleted,
      markedComplete: true,
    })
    if (!countsQualify) {
      setError(
        useInteractiveFlow
          ? 'Finish enough interactive beats in this pack to earn XP and a streak credit.'
          : 'Check off enough steps in this pack to earn XP and a streak credit.',
      )
      return
    }
    if (useInteractiveFlow && interactiveSession && !interactiveEffortOk) {
      setError(
        'For streak credit, also complete at least one writing, listening, read-aloud, or recording beat in this pack.',
      )
      return
    }
    try {
      if (backend) {
        await quickCaptureClient.completePack(packId)
      } else {
        offlineCompletePack(packId)
      }
      const tz = getClientTimeZone()
      const nowIso = new Date().toISOString()
      const progressionSessionId = progressionSessionIdForFromYourDayPack(packId)
      const interactiveExercisesDone =
        useInteractiveFlow && interactiveSession
          ? interactiveSession.exercises.filter((e) => interactiveProgress.blocks[e.id]?.completionState === 'completed')
              .length
          : 0
      const report = buildPersonalizedPracticeReport({
        pack,
        steps,
        captureById,
        packCaptureIds,
        themeSummary: sessionThemeSummary,
        practicePackMode,
        weaknessTags: weaknessTagsForXp,
        stepsCompleted: progressCompleted,
        stepsTotal: progressTotal,
        completedAt: nowIso,
        flowKind: useInteractiveFlow ? 'interactive' : 'checklist',
        interactiveMeta:
          useInteractiveFlow && interactiveSession
            ? {
                exercisesCompleted: interactiveExercisesDone,
                exercisesTotal: interactiveSession.exercises.length,
              }
            : null,
      })
      const heavyDone =
        useInteractiveFlow && interactiveSession
          ? countCompletedHeavyBlocks(interactiveSession.exercises, interactiveProgress.blocks)
          : 0
      const improvementLines = [
        useInteractiveFlow ? 'Interactive day pack (captures)' : 'Real-life capture practice',
      ]
      if (useInteractiveFlow && heavyDone > 0) {
        improvementLines.push(`Heavy practice beats completed: ${heavyDone}`)
      }

      const prog = await postProgressionSessionComplete(
        {
          sessionId: progressionSessionId,
          userId,
          type: 'from_your_day',
          durationSeconds: Math.max(45, progressTotal * 40),
          completed: true,
          turns: progressCompleted,
          improvements: improvementLines,
          weaknessesTargeted: weaknessTagsForXp,
          createdAt: nowIso,
          meaningfulCompletion: true,
          practicePackMode,
        },
        tz,
      )
      appendPersonalizedPracticeSession({
        packId,
        progressionSessionId,
        userId,
        title: pack.title?.trim() || 'From your day',
        localDateYmd: pack.localDate ?? dateParam,
        endedAt: nowIso,
        themeSummary: sessionThemeSummary,
        sourceThemes: report.sourceThemes,
        xpAwarded: prog.xpAwarded,
        completed: true,
        practicePackMode,
        report,
      })
      recordFromYourDayPracticeComplete({
        userId,
        packId,
        stepsTotal: progressTotal,
        stepsCompleted: progressCompleted,
        completed: true,
      })
      void invalidateProgressionQueries(qc, userId, getClientTimeZone())
      setFinished(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finalize')
    }
  }, [
    backend,
    offlineCompletePack,
    captureById,
    pack,
    packCaptureIds,
    packId,
    practicePackMode,
    progressCompleted,
    progressTotal,
    qc,
    sessionThemeSummary,
    steps,
    userId,
    weaknessTagsForXp,
    useInteractiveFlow,
    interactiveSession,
    interactiveEffortOk,
    interactiveProgress.blocks,
    dateParam,
  ])

  const hrefForStep = useCallback((s: DayPracticeStep): string | null => {
    const kind = (s as { kind: string }).kind
    if (kind === 'read_aloud_snippet' || kind === 'listen_burst') return APP_READ_ALOUD
    switch (s.kind) {
      case 'word_rep':
        /** Rich word cards render their own deep links (read-aloud, coach, voice). */
        return null
      case 'mini_scenario':
        return speakLiveRunHref({ scenarioId: s.scenarioSlug, level: 'A2' })
      case 'read_aloud':
        return APP_READ_ALOUD
      case 'listening_burst':
        return APP_READ_ALOUD
      case 'coach_debrief':
        return `${APP_LANGUAGE_COACH}?focus=${encodeURIComponent(s.summary.slice(0, 80))}`
      case 'correction_rep':
        return `${APP_LANGUAGE_COACH}?focus=${encodeURIComponent(s.situation.slice(0, 80))}`
      case 'strongest_next':
        return APP_LANGUAGE_COACH
      default:
        return null
    }
  }, [])

  if (!packId) {
    return (
      <div className="pb-12 max-w-lg mx-auto w-full px-4 pt-6 space-y-6">
        <Link
          href={APP_LIBRARY_HUB}
          className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary-700 min-h-touch"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          Library
        </Link>
        <FromYourDayHubPanel
          dateYmd={dateParam}
          captures={hubCaptures}
          loading={hubLoading}
          loadError={hubError}
          generating={generating}
          actionError={error}
          onStart={(mode) => void generate(mode)}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-10">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  if (error && !pack) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8 space-y-3">
        <p className="text-body-sm text-red-600">{error}</p>
        <Link href={APP_LIBRARY_HUB} className="text-body-sm font-semibold text-primary-700 underline">
          Back to Library
        </Link>
      </div>
    )
  }

  if (finished) {
    const reportHref = packId ? personalizedPracticeReportHref(packId) : APP_LIBRARY_FROM_YOUR_DAY
    return (
      <div className="max-w-lg mx-auto px-4 pt-10 text-center space-y-4">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
          <Sparkles className="w-7 h-7" aria-hidden />
        </span>
        <h1 className="text-title font-bold text-ink-primary">Nice work</h1>
        <p className="text-body-sm text-ink-secondary">
          XP and your streak are updated. These saves will surface in gentle suggestions when they help.
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="primary" fullWidth onClick={() => router.push(reportHref)}>
            See your recap
          </Button>
          <button
            type="button"
            onClick={() => router.push(APP_HISTORY)}
            className="w-full py-2.5 text-caption font-semibold text-primary-800 underline-offset-2 hover:underline min-h-touch"
          >
            History
          </button>
          <button
            type="button"
            onClick={() => router.push(APP_LIBRARY_HUB)}
            className="w-full py-2 text-caption font-medium text-ink-tertiary min-h-touch"
          >
            Library
          </button>
        </div>
      </div>
    )
  }

  const xpBand = personalizedPackXpBand(practicePackMode)

  return (
    <div className="pb-32 max-w-lg mx-auto w-full px-4 pt-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={APP_LIBRARY_HUB} className="text-caption font-semibold text-primary-700 min-h-touch">
          ← Library
        </Link>
        <Link
          href={`${APP_LIBRARY_FROM_YOUR_DAY}?date=${encodeURIComponent(pack?.localDate ?? dateParam)}`}
          className="text-caption font-semibold text-slate-500 min-h-touch"
        >
          Hub
        </Link>
      </div>

      <header className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 p-4 shadow-sm space-y-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Today’s session</p>
          {recapMeta?.minutes ? (
            <span className="text-caption font-semibold text-[#7c3aed] tabular-nums">~{recapMeta.minutes} min</span>
          ) : null}
        </div>
        <h1 className="text-title font-bold text-ink-primary tracking-tight leading-tight">{pack?.title ?? 'From your day'}</h1>
        <p className="text-body-sm text-slate-600 leading-snug line-clamp-3">{sessionThemeSummary}</p>
        {useInteractiveFlow && interactiveSession?.subtitle ? (
          <p className="text-caption text-slate-500 line-clamp-2">{interactiveSession.subtitle}</p>
        ) : !useInteractiveFlow ? (
          <p className="text-caption text-slate-500">Check off each beat, then save once for XP.</p>
        ) : null}
        {!useInteractiveFlow ? (
          <div className="flex items-center gap-3 pt-0.5">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary-500 transition-[width]"
                style={{ width: `${checklistProgressPct}%` }}
              />
            </div>
            <span className="text-caption font-semibold text-ink-primary tabular-nums shrink-0">
              {progressCompleted}/{progressTotal}
            </span>
          </div>
        ) : null}
        {useInteractiveFlow ? (
          <p className="text-caption text-slate-500">
            Save once when you’re done — about {xpBand.min}–{xpBand.max} XP (tiered; same-day replay decays on the server).
          </p>
        ) : null}
      </header>

      {error ? <p className="text-caption text-red-600">{error}</p> : null}

      {useInteractiveFlow && interactiveSession ? (
        <InteractiveFromYourDayRunner
          key={packId}
          session={interactiveSession}
          blockProgress={interactiveProgress.blocks}
          practicePackMode={practicePackMode}
          onMarkExerciseDone={markInteractiveExerciseDone}
          estimatedMinutes={recapMeta?.minutes}
        />
      ) : null}

      {!useInteractiveFlow ? (
        <ol className="space-y-3 list-none p-0 m-0">
          {workSteps.map((s, idx) => {
            const href = hrefForStep(s)
            const checked = Boolean(done[s.id])
            const isAnchor = s.kind === 'theme_anchor'
            const ctxLine =
              'captureId' in s && typeof s.captureId === 'string'
                ? contextLineForStep(s.captureId, captureById)
                : null
            const showWhy = Boolean(ctxLine && s.kind === 'strongest_next')

            return (
              <li key={s.id}>
                <div
                  className={clsx(
                    'rounded-2xl border p-3.5 shadow-sm transition-colors',
                    checked ? 'border-emerald-200 bg-emerald-50/35' : 'border-slate-200/90 bg-white',
                    isAnchor && 'border-indigo-100 bg-indigo-50/25',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStep(s.id)}
                      className="mt-1 h-5 w-5 rounded border-slate-300"
                      aria-label={`Step ${idx + 1} done`}
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        {friendlyPackStepEyebrow(s)}
                      </p>
                      {showWhy ? (
                        <p className="text-[12px] font-medium leading-snug text-indigo-950/85 bg-indigo-50/60 rounded-lg px-2.5 py-1.5 border border-indigo-100/80">
                          {ctxLine}
                        </p>
                      ) : null}
                      {s.kind === 'short_recap' ? (
                        <>
                          <p className="text-body-sm font-semibold text-ink-primary">{s.headline}</p>
                          <ul className="list-disc pl-4 text-body-sm text-ink-secondary space-y-0.5">
                            {s.bullets.slice(0, 4).map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                          <p className="text-body-sm text-ink-primary leading-snug">{s.prompt}</p>
                        </>
                      ) : s.kind === 'theme_anchor' ? (
                        <>
                          <p className="text-body-sm font-semibold text-ink-primary">{s.themeTitle}</p>
                          <p className="text-body-sm text-ink-primary leading-snug">{s.prompt}</p>
                        </>
                      ) : s.kind === 'word_rep' ? (
                        <>
                          <p className="text-title font-bold text-ink-primary tracking-tight">“{s.dutch}”</p>
                          {s.meaningEn ? (
                            <p className="text-body-sm text-ink-secondary leading-snug">{s.meaningEn}</p>
                          ) : (
                            <p className="text-caption text-ink-tertiary italic">No gloss yet — tap Coach in the bar below.</p>
                          )}
                          {s.usageWhenEn ? (
                            <p className="text-body-sm text-ink-secondary leading-snug">{s.usageWhenEn}</p>
                          ) : null}
                          {s.exampleLinesNl?.length ? (
                            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 space-y-1">
                              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Examples</p>
                              <ul className="list-disc pl-4 text-body-sm text-ink-primary space-y-0.5">
                                {s.exampleLinesNl.map((line, i) => (
                                  <li key={i}>{line}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {s.writingPromptNl ? (
                            <p className="text-body-sm text-ink-primary leading-snug rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2">
                              {s.writingPromptNl}
                            </p>
                          ) : null}
                          {s.hintEn ? <p className="text-caption text-ink-tertiary">{s.hintEn}</p> : null}
                          <p className="text-body-sm text-ink-primary leading-snug whitespace-pre-wrap">{s.prompt}</p>
                        </>
                      ) : (
                        <p className="text-body-sm text-ink-primary leading-snug">{s.prompt}</p>
                      )}
                      {s.kind === 'strongest_next' && s.actionLabel ? (
                        <p className="text-caption font-semibold text-primary-800">{s.actionLabel}</p>
                      ) : null}
                      {'dutch' in s && s.dutch && s.kind !== 'word_rep' ? (
                        <p className="text-body-sm font-semibold text-ink-primary">“{s.dutch}”</p>
                      ) : null}
                      {s.kind === 'correction_rep' ? (
                        <>
                          <p className="text-body-sm text-ink-secondary whitespace-pre-wrap">{s.situation}</p>
                          <p className="text-body-sm font-semibold text-ink-primary">“{s.correctedNl}”</p>
                        </>
                      ) : null}
                      {'text' in s && s.text ? (
                        <p className="text-body-sm text-ink-secondary whitespace-pre-wrap">{s.text}</p>
                      ) : null}
                      {href && s.kind !== 'word_rep' ? (
                        <Link
                          href={href}
                          className="inline-block pt-1 text-caption font-semibold text-primary-700 underline-offset-2 hover:underline"
                        >
                          Open in Talk
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      ) : null}

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/90 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.12)]">
        <div className="max-w-lg mx-auto w-full px-4 py-3 space-y-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {showSessionDeeperStrip ? <SessionDeeperStrip focusDutch={sessionPackFocusWord} /> : null}
          <Button
            variant="primary"
            fullWidth
            className="min-h-touch shadow-sm"
            disabled={
              progressTotal === 0 ||
              !fromYourDayPackCompletionQualifies({
                stepsTotal: progressTotal,
                stepsCompleted: progressCompleted,
                markedComplete: true,
              }) ||
              !interactiveEffortOk
            }
            onClick={() => void finalize()}
          >
            Save session & XP
          </Button>
          <p className="text-center text-[11px] text-slate-500">
            {useInteractiveFlow
              ? `${progressCompleted}/${progressTotal} beats · streak when the bar + effort rule pass`
              : `${progressCompleted}/${progressTotal} steps`}
          </p>
        </div>
      </footer>
    </div>
  )
}
