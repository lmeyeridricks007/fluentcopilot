'use client'

import Link from 'next/link'
import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  ChevronLeft,
  Eye,
  Headphones,
  LayoutList,
  ListChecks,
  Sparkles,
  Star,
  Volume2,
  Zap,
} from 'lucide-react'
import {
  APP_LISTENING_MODE,
  APP_TALK_ACTIVITY,
  APP_TALK_HUB,
  APP_TALK_SKILLS,
  appTalkTrainingLoopHref,
  listeningModeSessionHref,
} from '@/lib/routing/appRoutes'
import { readListeningSessionRecord } from '@/lib/listening-mode/listeningSessionStorage'
import { buildListeningCoachReport } from '@/lib/listening-mode/listeningReportBuilder'
import type {
  ListeningCoachReport,
  ListeningReportBand,
  ListeningReportUserDimension,
} from '@/lib/listening-mode/listeningReportBuilder'
import { listeningTopRecommendations } from '@/lib/listening-mode/listeningRecommendations'
import { readListeningProfile } from '@/lib/listening-mode/listeningProfileStorage'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import { ListeningReviewMistakeCard } from '@/features/listening-mode/components/ListeningReviewMistakeCard'
import { getListeningPack } from '@/lib/listening-mode/catalog'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { conversationClient } from '@/lib/api/conversationClient'
import { isDevToolsEnabledClient } from '@/lib/dev-tools/devToolsAccess'

export function ListeningModeReportScreen() {
  const sp = useSearchParams()
  const sessionId = sp.get('sessionId')?.trim() ?? ''
  const userId = useAuthStore((s) => s.user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID)
  const profile = useMemo(() => readListeningProfile(userId), [userId])
  const record = useMemo(() => (sessionId ? readListeningSessionRecord(sessionId) : null), [sessionId])
  const recs = useMemo(
    () =>
      record
        ? listeningTopRecommendations(profile, { excludePackId: record.packId, level: record.level })
        : [],
    [profile, record],
  )

  const useBackend = isFeature1ChatBackendEnabled()
  const listeningLoopsQuery = useQuery({
    queryKey: ['talk-skill-profile', 'listening-loops'],
    enabled: useBackend,
    queryFn: () => conversationClient.getTalkSkillProfile(),
    staleTime: 60_000,
  })
  const listeningFollowUps = useMemo(() => {
    const loops = listeningLoopsQuery.data?.activeTrainingLoops ?? []
    return loops.filter((l) => l.sourceType === 'listening').slice(0, 3)
  }, [listeningLoopsQuery.data?.activeTrainingLoops])

  const packMeta = useMemo(() => getListeningPack(record?.packId ?? ''), [record?.packId])

  const sessionStats = useMemo(() => {
    if (!record || !record.attempts.length) {
      return { total: 0, correct: 0, pct: 0, clipsWithReplay: 0, peekBeforeAnswer: 0 }
    }
    const attempts = record.attempts
    const total = attempts.length
    const correct = attempts.filter((a) => a.correct).length
    const clipsWithReplay = attempts.filter((a) => a.playsBeforeAnswer > 1 || a.playsSlowAfterAnswer > 0).length
    const peekBeforeAnswer = attempts.filter((a) => a.transcriptPeekBeforeAnswer).length
    return {
      total,
      correct,
      pct: total ? Math.round((correct / total) * 100) : 0,
      clipsWithReplay,
      peekBeforeAnswer,
    }
  }, [record])

  const report = useMemo(() => {
    if (!record) return null
    const top = recs[0]
    return buildListeningCoachReport({
      level: record.level,
      scenarioId: record.scenarioId,
      packId: record.packId,
      attempts: record.attempts,
      reviewClips: record.reviewClips,
      nextPackId: top?.packId ?? null,
      recommendedNext: top
        ? { packId: top.packId, title: top.title, reason: top.reason }
        : null,
    })
  }, [record, recs])

  if (!sessionId || !record || !report) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-body text-slate-600">No listening report found.</p>
        <p className="mt-2 text-body-sm text-slate-500">
          If you finished a session on another device, open it there — or pick a past run from your archive.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href={APP_LISTENING_MODE} className="font-semibold text-primary-700 hover:underline">
            ← Listening home
          </Link>
          <Link href={`${APP_TALK_ACTIVITY}?tab=listening`} className="font-semibold text-slate-700 hover:underline">
            Session archive (Listening)
          </Link>
        </div>
      </div>
    )
  }

  const narrativeSections = report.sections.filter((s) => s.id !== 'review_mistakes' && s.id !== 'recommended_track')
  const recommendedSection = report.sections.find((s) => s.id === 'recommended_track')
  const reviewSection = report.sections.find((s) => s.id === 'review_mistakes')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/40">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(45,212,191,0.14),transparent)]" aria-hidden />
      <div className="relative mx-auto max-w-lg px-4 pb-28 pt-5">
        <Link
          href={APP_LISTENING_MODE}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-primary-700"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Listening
        </Link>

        <header className="relative mt-6 overflow-hidden rounded-[1.35rem] border border-slate-200/70 bg-white/90 px-5 py-6 shadow-md shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.03] backdrop-blur-sm">
          <div
            className="pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full bg-teal-400/[0.09] blur-2xl"
            aria-hidden
          />
          <div className="relative flex items-center gap-5">
            <SessionScoreRing correct={sessionStats.correct} total={sessionStats.total} pct={sessionStats.pct} />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 ring-1 ring-teal-200/60">
                  <Headphones className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Listening coach</p>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200/80">
                  {record.level}
                </span>
              </div>
              {packMeta ? (
                <p className="mt-2.5 text-body-sm font-semibold leading-snug text-teal-900/95">{packMeta.title}</p>
              ) : null}
              <h1 className="mt-3 text-2xl font-bold leading-snug tracking-tight text-slate-900">{report.headline}</h1>
              <p className="mt-2 text-body-sm leading-relaxed text-slate-600">{report.subline}</p>
            </div>
          </div>

          {sessionStats.total > 0 ? (
            <div className="relative mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-5">
              <SessionStatTile
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />}
                label="Correct"
                value={`${sessionStats.correct}/${sessionStats.total}`}
                sub="This burst"
              />
              <SessionStatTile
                icon={<Volume2 className="h-4 w-4 text-teal-700" aria-hidden />}
                label="Replays"
                value={String(sessionStats.clipsWithReplay)}
                sub="Used extra listens"
              />
              <SessionStatTile
                icon={<Eye className="h-4 w-4 text-amber-700" aria-hidden />}
                label="Dutch peek"
                value={String(sessionStats.peekBeforeAnswer)}
                sub="Before answer"
              />
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2" aria-label="Listening focus this session">
            {report.userDimensions.map((d) => (
              <DimensionChip key={d.id} dim={d} />
            ))}
          </div>

          {report.internalNotes.length > 0 ? (
            <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4">
              {report.internalNotes.map((n) => (
                <li key={n.id} className="text-caption leading-snug text-slate-500">
                  <span className="font-semibold text-slate-600">{n.label}:</span> {n.line}
                </li>
              ))}
            </ul>
          ) : null}
        </header>

        <div className="mt-8 space-y-3.5">
          {narrativeSections.map((s) => (
            <NarrativeReportSection key={s.id} section={s} practiceNowLines={s.id === 'practice_now' ? report.practiceNowLines : undefined} />
          ))}
        </div>

        <section className="mt-8 rounded-[1.35rem] border border-teal-100/90 bg-gradient-to-br from-teal-50/50 via-white to-white px-4 py-5 shadow-sm ring-1 ring-teal-900/[0.04]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-800" aria-hidden />
            <h2 className="text-caption font-bold uppercase tracking-[0.12em] text-teal-900/80">
              {recommendedSection?.title ?? 'Recommended next track'}
            </h2>
          </div>
          <p className="mt-2 text-body-sm leading-relaxed text-slate-700">{recommendedSection?.body}</p>
          {report.recommendedNext ? (
            <Link
              href={listeningModeSessionHref({ packId: report.recommendedNext.packId, level: record.level })}
              className="mt-4 flex min-h-touch items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-body font-semibold text-white shadow-md shadow-primary-900/15 transition hover:bg-primary-700"
            >
              Start · {report.recommendedNext.title}
            </Link>
          ) : recs.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {recs.slice(0, 2).map((r) => (
                <li key={r.packId}>
                  <Link
                    href={listeningModeSessionHref({ packId: r.packId, level: record.level })}
                    className="block rounded-xl bg-white/90 px-3 py-2.5 text-body-sm font-semibold text-teal-950 ring-1 ring-teal-100 hover:bg-teal-50/60"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Link
              href={APP_LISTENING_MODE}
              className="mt-4 inline-flex min-h-touch items-center justify-center text-body-sm font-semibold text-primary-700 hover:underline"
            >
              Browse listening tracks
            </Link>
          )}
        </section>

        {useBackend && listeningFollowUps.length > 0 ? (
          <section className="mt-8 rounded-2xl border border-violet-100/90 bg-gradient-to-br from-violet-50/40 via-white to-white px-4 py-4 shadow-sm ring-1 ring-violet-900/[0.03]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-700" aria-hidden />
              <h2 className="text-caption font-bold uppercase tracking-[0.12em] text-violet-900/80">
                Personalized listening reps
              </h2>
            </div>
            <p className="mt-1 text-body-sm text-slate-600">
              Saved from your account — same weaknesses, short drills.
            </p>
            <ul className="mt-3 space-y-2">
              {listeningFollowUps.map((loop) => (
                <li key={loop.id}>
                  <Link
                    href={appTalkTrainingLoopHref(loop.id)}
                    className="block rounded-xl bg-white/90 px-3 py-2.5 text-body-sm font-semibold text-violet-950 ring-1 ring-violet-100 hover:bg-violet-50/60"
                  >
                    {loop.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={APP_TALK_SKILLS}
              className="mt-3 inline-flex text-body-sm font-semibold text-violet-800 hover:underline"
            >
              All skills & loops →
            </Link>
          </section>
        ) : null}

        <section className="mt-10" aria-labelledby="review-mistakes-heading">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200/80">
              <ListChecks className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 id="review-mistakes-heading" className="text-caption font-bold uppercase tracking-[0.12em] text-slate-500">
                {reviewSection?.title ?? 'Review mistakes'}
              </h2>
              <p className="mt-0.5 text-body-sm text-slate-600">{reviewSection?.body}</p>
            </div>
          </div>
          {report.reviewMistakes.length === 0 ? (
            <p className="mt-3 text-body-sm text-slate-500">Nothing to revisit — carry that momentum.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {report.reviewMistakes.map((item) => (
                <li key={item.clipId}>
                  <ListeningReviewMistakeCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-10 flex flex-col gap-2 sm:flex-row">
          <Link
            href={APP_TALK_HUB}
            className="inline-flex min-h-touch flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-body-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Talk home
          </Link>
          <Link
            href={APP_LISTENING_MODE}
            className="inline-flex min-h-touch flex-1 items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-body-sm font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            Another burst
          </Link>
        </div>
        <p className="mt-4 text-center">
          <Link
            href={`${APP_TALK_ACTIVITY}?tab=listening`}
            className="text-body-sm font-semibold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
          >
            Past listening sessions
          </Link>
        </p>

        {record && isDevToolsEnabledClient() ? (
          <details className="mt-8 rounded-2xl border border-amber-200/80 bg-amber-50/45 px-4 py-3 text-left ring-1 ring-amber-900/5">
            <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.14em] text-amber-950">
              Dev · stored session record
            </summary>
            <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-white/85 p-2 text-[10px] leading-snug text-amber-950 ring-1 ring-amber-100">
              {JSON.stringify(
                {
                  sessionId: record.sessionId,
                  packId: record.packId,
                  scenarioId: record.scenarioId,
                  level: record.level,
                  drillTypesUsed: record.drillTypesUsed,
                  attemptCount: record.attempts.length,
                  coachSummary: record.coachSummary?.slice(0, 200),
                },
                null,
                2,
              )}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  )
}

/** Wider viewBox + thinner stroke = larger safe area inside the ring so labels never clip. */
const SCORE_VB = 88
const SCORE_RING_R = 33
const SCORE_STROKE = 3
const SCORE_RING_C = 2 * Math.PI * SCORE_RING_R
const SCORE_CX = SCORE_VB / 2

function SessionScoreRing({ correct, total, pct }: { correct: number; total: number; pct: number }) {
  const progress = total === 0 ? 0 : pct / 100
  const dashOffset = SCORE_RING_C * (1 - progress)
  return (
    <div
      className="relative h-[104px] w-[104px] shrink-0"
      role="img"
      aria-label={total > 0 ? `${pct}% correct, ${correct} of ${total} clips` : 'No clips in this session'}
    >
      <svg viewBox={`0 0 ${SCORE_VB} ${SCORE_VB}`} className="h-full w-full -rotate-90" aria-hidden focusable="false">
        <circle
          cx={SCORE_CX}
          cy={SCORE_CX}
          r={SCORE_RING_R}
          fill="none"
          className="stroke-slate-200/90"
          strokeWidth={SCORE_STROKE}
        />
        <circle
          cx={SCORE_CX}
          cy={SCORE_CX}
          r={SCORE_RING_R}
          fill="none"
          className="stroke-teal-500 transition-[stroke-dashoffset] duration-500 ease-out"
          strokeWidth={SCORE_STROKE}
          strokeLinecap="round"
          strokeDasharray={SCORE_RING_C}
          strokeDashoffset={dashOffset}
        />
      </svg>
      {/* Inset keeps type inside the stroke’s inner edge at all breakpoints */}
      <div className="pointer-events-none absolute inset-[15%] flex items-center justify-center">
        {total > 0 ? (
          <div className="flex w-full max-w-[3.75rem] flex-col items-center gap-0.5 text-center">
            <p className="flex shrink-0 items-baseline justify-center gap-px font-extrabold tabular-nums tracking-tight text-teal-700">
              <span className="text-[1.375rem] leading-none">{pct}</span>
              <span className="text-sm font-bold leading-none text-teal-600/90">%</span>
            </p>
            <p className="text-[9px] font-medium leading-tight tracking-tight text-slate-500">
              {correct}/{total} clips
            </p>
          </div>
        ) : (
          <span className="text-caption font-semibold text-slate-400">—</span>
        )}
      </div>
    </div>
  )
}

function SessionStatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-xl bg-slate-50/90 px-2.5 py-2.5 text-center ring-1 ring-slate-200/70">
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/60">
        {icon}
      </div>
      <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-body font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-0.5 text-[10px] leading-tight text-slate-500">{sub}</p>
    </div>
  )
}

function narrativeIconFor(sectionId: ListeningCoachReport['sections'][number]['id']) {
  switch (sectionId) {
    case 'top_summary':
      return LayoutList
    case 'how_you_did':
      return BarChart2
    case 'strongest_area':
      return Star
    case 'main_miss':
      return AlertCircle
    case 'practice_now':
      return Zap
    default:
      return LayoutList
  }
}

function NarrativeReportSection({
  section,
  practiceNowLines,
}: {
  section: ListeningCoachReport['sections'][number]
  practiceNowLines?: string[]
}) {
  const Icon = narrativeIconFor(section.id)
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/85 bg-white/95 shadow-sm ring-1 ring-slate-900/[0.02]">
      <div
        className="absolute bottom-0 left-0 top-0 w-[3px] bg-gradient-to-b from-teal-400 via-teal-500 to-cyan-600"
        aria-hidden
      />
      <div className="flex gap-3 px-4 py-4 pl-5">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-800 ring-1 ring-teal-100/90 shadow-sm">
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-caption font-bold uppercase tracking-[0.12em] text-slate-500">{section.title}</h2>
          <p className="mt-2 text-body-sm leading-relaxed text-slate-700">{section.body}</p>
          {section.bullets?.length ? (
            <ul className="mt-2.5 space-y-1.5 border-l-2 border-teal-100 pl-3 text-body-sm text-slate-600">
              {section.bullets.map((b, i) => (
                <li key={i} className="leading-snug">
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
          {practiceNowLines?.length ? (
            <ul className="mt-2.5 space-y-1.5 border-l-2 border-amber-100 pl-3 text-body-sm text-slate-600">
              {practiceNowLines.map((line, i) => (
                <li key={i} className="leading-snug">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function dimensionChipTone(percent: number | null): string {
  if (percent == null) {
    return 'bg-slate-50/95 text-slate-800 ring-slate-200/90 ring-dashed'
  }
  if (percent >= 75) return 'bg-emerald-50 text-emerald-950 ring-emerald-200/90'
  if (percent >= 45) return 'bg-amber-50 text-amber-950 ring-amber-200/80'
  return 'bg-slate-50 text-slate-800 ring-slate-200/80'
}

function barFillFromPercent(percent: number | null): { widthPct: number; className: string } {
  if (percent == null) return { widthPct: 0, className: 'bg-slate-300/50' }
  if (percent >= 75) return { widthPct: percent, className: 'bg-emerald-500' }
  if (percent >= 45) return { widthPct: percent, className: 'bg-amber-500' }
  return { widthPct: percent, className: 'bg-slate-400/90' }
}

function DimensionChip({ dim }: { dim: ListeningReportUserDimension }) {
  const human: Record<ListeningReportBand, string> = {
    strong: 'Strong',
    building: 'Building',
    steady: 'Steady',
  }
  const tone = dimensionChipTone(dim.percentCorrect)
  const bar = barFillFromPercent(dim.percentCorrect)
  const pctLabel =
    dim.percentCorrect != null ? (
      <span className="text-[1.35rem] font-bold leading-none tabular-nums tracking-tight text-slate-900">
        {dim.percentCorrect}
        <span className="text-[0.65em] font-bold text-slate-600">%</span>
      </span>
    ) : (
      <span className="text-body font-semibold leading-none text-slate-500">—</span>
    )
  return (
    <span
      className={`inline-flex max-w-full min-w-[124px] flex-col gap-1 rounded-xl px-3 py-2.5 text-left ring-1 ${tone}`}
      title={dim.line}
    >
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600/90">{dim.label}</span>
      {pctLabel}
      <span className="text-[10px] font-semibold leading-none text-slate-600/90">
        {dim.percentCorrect != null ? human[dim.band] : 'Not in this burst'}
      </span>
      <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
        <span className={`block h-full rounded-full ${bar.className}`} style={{ width: `${bar.widthPct}%` }} />
      </span>
    </span>
  )
}
