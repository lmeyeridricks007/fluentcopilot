'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, ChevronLeft, History, Radio, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { playAppSound } from '@/lib/interaction/appSounds'
import {
  APP_LIBRARY_FROM_YOUR_DAY,
  APP_LISTENING_MODE,
  APP_READ_ALOUD,
  APP_READ_ALOUD_REPORT,
  APP_SPEAK_LIVE,
  APP_EXAM_HISTORY,
  APP_TALK_HUB,
  appTalkThread,
  appTalkThreadRecap,
  appTalkTrainingLoopHref,
  listeningModeReportHref,
  fromYourDayPackSessionHref,
  personalizedPracticeReportHref,
  speakLiveRunHref,
} from '@/lib/routing/appRoutes'
import type { ConversationThread } from '@/features/feature1-chat/types'
import { readResumableLiveSession, type ResumableLiveSession } from '@/lib/speak-live/resumableLiveSessionStorage'
import { loadReadAloudReport } from '@/features/read-aloud/readAloudStorage'
import { useTalkContinueSessions } from './useTalkContinueSessions'
import type { ApiConversationThread, TalkTrainingLoopHistoryItem } from '@/lib/api/apiTypes'
import { getSpeakLiveCatalogItem } from '@/features/speak-live/speakLiveScenarios'
import { listListeningSessionHistory } from '@/lib/listening-mode/listeningSessionStorage'
import { listPersonalizedPracticeHistory } from '@/lib/quick-capture/personalizedPracticeHistory'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import { useAuthStore } from '@/store/authStore'
import { SessionHistoryCard } from './session-history/SessionHistoryCard'
import { TRAIN_DESK_HEADLINE } from './session-history/displayCopy'
import { modalityMatchesTab, type SessionFilterTab, type SessionHistoryStatus, type SessionModality } from './session-history/types'
import { readSpeakLiveSavedSessionBookmarks } from './session-history/speakLiveSavedSessionsRead'
import { threadRecapHref, threadReportHref } from './session-history/sessionThreadLinks'
import { fetchExamProfiles, fetchExamSessions } from '@/features/exam-system/examApi'
import {
  defaultExamHistoryFilters,
  examSessionCardSubtitle,
  examSessionCardTitle,
  examSessionFootNote,
  examSessionHistoryStatus,
  examSessionModality,
  examSessionPrimaryAction,
  examSessionSecondaryAction,
  examSessionSummaryLine,
  filterExamSessions,
  type ExamHistoryFilterState,
} from '@/features/exam-system/examHistoryCopy'

function formatUpdated(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function shortThreadRef(id: string): string {
  const tail = id.replace(/-/g, '').slice(-6)
  return tail.length >= 6 ? tail : id.slice(0, 6)
}

function shortSessionRef(id: string): string {
  const compact = id.replace(/-/g, '')
  const tail = compact.slice(-6)
  return tail.length >= 6 ? tail : id.slice(0, 6)
}

function isSpeakLiveThread(t: ApiConversationThread | ConversationThread): boolean {
  return 'conversationSurface' in t && t.conversationSurface === 'speak_live'
}

function feedbackPreferencePhrase(
  feedback: ApiConversationThread['feedbackMode'] | ConversationThread['feedbackMode'],
): string {
  return feedback === 'after_each' ? 'Notes after each reply' : 'Recap when you finish'
}

function trainThreadContextLine(t: ApiConversationThread | ConversationThread): string {
  const mode = t.mode === 'guided' ? 'Guided' : 'Free flow'
  if ('summaryText' in t && t.summaryText?.trim()) {
    const raw = t.summaryText.trim()
    const s = raw.slice(0, 52)
    return `${mode} · ${s}${raw.length > 52 ? '…' : ''}`
  }
  if ('summary' in t && t.summary?.nextStep?.trim()) {
    const raw = t.summary.nextStep.trim()
    const s = raw.slice(0, 48)
    return `${mode} · ${s}${raw.length > 48 ? '…' : ''}`
  }
  if ('currentStage' in t && t.currentStage) {
    return `${mode} · ${String(t.currentStage).replace(/_/g, ' ')}`
  }
  return `${mode} · ${formatUpdated(t.updatedAt)}`
}

function loopHistoryStatusLabel(status: TalkTrainingLoopHistoryItem['status']): string {
  switch (status) {
    case 'completed':
      return 'Done'
    case 'dismissed':
      return 'Skipped'
    case 'stale':
      return 'Expired'
  }
}

function LoopHistoryRow({ row }: { row: TalkTrainingLoopHistoryItem }) {
  const badge =
    row.status === 'completed'
      ? 'border-emerald-200/80 bg-emerald-50/90 text-emerald-900'
      : row.status === 'dismissed'
        ? 'border-slate-200/80 bg-slate-50 text-slate-700'
        : 'border-amber-200/80 bg-amber-50/90 text-amber-950'
  return (
    <li>
      <Link
        href={appTalkTrainingLoopHref(row.id)}
        onClick={() => playAppSound('tap')}
        className="flex min-h-touch items-start gap-3 rounded-2xl border border-slate-100 bg-white/90 px-3 py-2.5 text-left shadow-sm transition hover:border-slate-200/90"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <History className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-[#0F172A]">{row.title}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge}`}>
              {loopHistoryStatusLabel(row.status)}
            </span>
          </span>
          {row.completionInsight ? (
            <span className="mt-0.5 line-clamp-2 block text-[12px] text-[#64748B]">{row.completionInsight}</span>
          ) : (
            <span className="mt-0.5 block text-[11px] text-[#94A3B8]">{formatUpdated(row.updatedAt)}</span>
          )}
        </span>
      </Link>
    </li>
  )
}

export function TalkActivityPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = useAuthStore((s) => s.user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID)
  const [tab, setTab] = useState<SessionFilterTab>('all')
  const [resumableLive, setResumableLive] = useState<ResumableLiveSession | null>(null)
  const [speakBookmarks, setSpeakBookmarks] = useState(() => readSpeakLiveSavedSessionBookmarks())

  const {
    useBackend,
    continueQuery,
    sessionHistoryQuery,
    trainPausedList,
    completedThreadsForHistory,
    showContinueCard,
    backendTrainContinue,
    activeTrainingLoops,
    trainingLoopHistory,
  } = useTalkContinueSessions()

  const refreshResumable = useCallback(() => {
    setResumableLive(readResumableLiveSession())
    setSpeakBookmarks(readSpeakLiveSavedSessionBookmarks())
  }, [])

  useEffect(() => {
    refreshResumable()
  }, [pathname, refreshResumable])

  useEffect(() => {
    const raw = searchParams.get('tab')
    if (
      raw === 'speak' ||
      raw === 'chat' ||
      raw === 'read_aloud' ||
      raw === 'listening' ||
      raw === 'personalized_practice' ||
      raw === 'exam' ||
      raw === 'all'
    ) {
      setTab(raw)
    }
  }, [searchParams])

  const readAloudReport = useMemo(() => (typeof window !== 'undefined' ? loadReadAloudReport() : null), [pathname])

  const listeningHistory = useMemo(() => {
    if (typeof window === 'undefined') return []
    return listListeningSessionHistory(userId)
  }, [pathname, userId])

  const personalizedHistory = useMemo(() => {
    if (typeof window === 'undefined') return []
    return listPersonalizedPracticeHistory(userId)
  }, [pathname, userId])

  const [examFilters, setExamFilters] = useState<ExamHistoryFilterState>(defaultExamHistoryFilters)

  const examProfilesQ = useQuery({
    queryKey: ['exam', 'profiles', 'talk-activity'],
    queryFn: fetchExamProfiles,
  })

  const examSessionsQ = useQuery({
    queryKey: ['exam', 'sessions', userId, 'talk-activity'],
    queryFn: () => fetchExamSessions(userId),
  })

  const examProfileTitleById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of examProfilesQ.data ?? []) {
      m.set(p.examId, p.title)
    }
    return m
  }, [examProfilesQ.data])

  const examSessionsFiltered = useMemo(() => {
    return filterExamSessions(examSessionsQ.data ?? [], tab === 'exam' ? examFilters : defaultExamHistoryFilters())
  }, [examSessionsQ.data, examFilters, tab])

  const examSessionsForAllTab = useMemo(() => {
    const sorted = [...(examSessionsQ.data ?? [])].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    return sorted.slice(0, 5)
  }, [examSessionsQ.data])

  const activeThreadId = backendTrainContinue?.threadId

  const pausedWithoutActive = useMemo(() => {
    return trainPausedList.filter((t) => t.id !== activeThreadId)
  }, [trainPausedList, activeThreadId])

  const activeChatSubline = useMemo(() => {
    if (backendTrainContinue) {
      const mode = backendTrainContinue.mode === 'guided' ? 'Guided' : 'Free flow'
      const fb = feedbackPreferencePhrase(backendTrainContinue.feedbackMode)
      return `${mode} · ${fb} · ${formatUpdated(backendTrainContinue.updatedAt)}`
    }
    return 'Your last chat is open'
  }, [backendTrainContinue])

  const tabs: { id: SessionFilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'speak', label: 'Speak' },
    { id: 'chat', label: 'Chat' },
    { id: 'read_aloud', label: 'Read aloud' },
    { id: 'listening', label: 'Listening' },
    { id: 'personalized_practice', label: 'Your day' },
    { id: 'exam', label: 'Exam' },
  ]

  const setTabQuery = useCallback(
    (id: SessionFilterTab) => {
      playAppSound('tap')
      setTab(id)
      const p = new URLSearchParams(searchParams.toString())
      p.set('tab', id)
      router.replace(`/app/talk/activity?${p.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  type ContinueModel = {
    key: string
    modality: SessionModality
    sortAt: number
    title: string
    titleHint?: string | null
    subtitle: string
    status: SessionHistoryStatus
    dateLabel: string
    primary: { label: string; href: string }
    secondary?: { label: string; href: string } | null
  }

  const continueRows = useMemo((): ContinueModel[] => {
    const rows: ContinueModel[] = []

    if (resumableLive && modalityMatchesTab('speak', tab)) {
      rows.push({
        key: `speak-resumable-${resumableLive.threadId}`,
        modality: 'speak',
        sortAt: new Date(resumableLive.savedAt).getTime(),
        title: resumableLive.scenarioTitle,
        titleHint: `#${shortThreadRef(resumableLive.threadId)}`,
        subtitle: 'Same coach and thread — resume picks up exactly where you paused.',
        status: 'paused',
        dateLabel: `Updated ${formatUpdated(resumableLive.savedAt)}`,
        primary: {
          label: 'Resume',
          href: speakLiveRunHref({
            scenarioId: resumableLive.scenarioId,
            level: resumableLive.level,
            threadId: resumableLive.threadId,
          }),
        },
        secondary: { label: 'Scene library', href: APP_SPEAK_LIVE },
      })
    }

    if (
      showContinueCard &&
      activeThreadId &&
      backendTrainContinue &&
      modalityMatchesTab('chat', tab)
    ) {
      const updatedAt = backendTrainContinue.updatedAt
      rows.push({
        key: `chat-active-${activeThreadId}`,
        modality: 'chat',
        sortAt: new Date(updatedAt).getTime(),
        title: TRAIN_DESK_HEADLINE,
        titleHint: `#${shortThreadRef(activeThreadId)}`,
        subtitle: `${backendTrainContinue.personaName ?? 'Assistant'} · ${activeChatSubline}`,
        status: 'active',
        dateLabel: `Updated ${formatUpdated(updatedAt)}`,
        primary: { label: 'Resume chat', href: appTalkThread(activeThreadId) },
        secondary: null,
      })
    }

    for (const t of pausedWithoutActive) {
      const modality: SessionModality = isSpeakLiveThread(t) ? 'speak' : 'chat'
      if (!modalityMatchesTab(modality, tab)) continue
      const title = isSpeakLiveThread(t)
        ? getSpeakLiveCatalogItem(t.scenarioId)?.title ?? t.scenarioId.replace(/-/g, ' ')
        : TRAIN_DESK_HEADLINE
      const titleHint = `#${shortThreadRef(t.id)}`
      const subtitle = trainThreadContextLine(t)
      const resumeHref = isSpeakLiveThread(t)
        ? speakLiveRunHref({ scenarioId: t.scenarioId, level: 'A2', threadId: t.id })
        : appTalkThread(t.id)
      rows.push({
        key: `paused-${t.id}`,
        modality,
        sortAt: new Date(t.updatedAt).getTime(),
        title,
        titleHint,
        subtitle,
        status: 'paused',
        dateLabel: `Updated ${formatUpdated(t.updatedAt)}`,
        primary: { label: isSpeakLiveThread(t) ? 'Resume' : 'Resume chat', href: resumeHref },
        secondary: modality === 'speak' ? { label: 'Scene library', href: APP_SPEAK_LIVE } : null,
      })
    }

    return rows.sort((a, b) => b.sortAt - a.sortAt)
  }, [
    resumableLive,
    tab,
    showContinueCard,
    activeThreadId,
    backendTrainContinue,
    useBackend,
    pausedWithoutActive,
    activeChatSubline,
  ])

  const showReportsSection =
    modalityMatchesTab('speak', tab) || modalityMatchesTab('read_aloud', tab) || tab === 'all'

  const showCompletedSection =
    modalityMatchesTab('chat', tab) ||
    modalityMatchesTab('speak', tab) ||
    modalityMatchesTab('read_aloud', tab)

  const showListeningArchive =
    tab === 'listening' || (tab === 'all' && listeningHistory.length > 0)

  const showPersonalizedArchive =
    tab === 'personalized_practice' || (tab === 'all' && personalizedHistory.length > 0)

  return (
    <div className="min-h-[100dvh] bg-[#fafaf7] pb-28 text-[#0F172A]">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        {/* 1 — Header */}
        <header className="mb-8 space-y-3">
          <Link
            href={APP_TALK_HUB}
            onClick={() => playAppSound('tap')}
            className="inline-flex min-h-touch items-center gap-1 text-[13px] font-semibold text-[#7c3aed] underline-offset-2 hover:underline"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Talk
          </Link>
          <div>
            <h1 className="text-[1.35rem] font-bold tracking-tight text-[#0F172A] sm:text-[1.5rem]">Your sessions</h1>
            <p className="mt-1 text-[15px] leading-relaxed text-[#475569]">
              Threads to resume, wraps to revisit, and reports worth opening — one calm list.
            </p>
          </div>
        </header>

        {useBackend && (continueQuery.isLoading || sessionHistoryQuery.isLoading) ? (
          <div className="mb-6 h-24 animate-pulse rounded-3xl border border-[#E2E8F0] bg-white shadow-sm" />
        ) : null}
        {continueQuery.isError && useBackend ? (
          <p className="mb-6 rounded-2xl border border-amber-200/80 bg-[#FFF7ED] px-3 py-2.5 text-[13px] text-amber-950">
            Can&apos;t load this list right now. Nothing was lost — try again shortly.
          </p>
        ) : null}

        <div className="space-y-10">
          {/* 2 — Continue practicing */}
          {(tab === 'all' || tab === 'speak' || tab === 'chat') && (
            <section aria-labelledby="sh-continue" className="space-y-3">
              <h2 id="sh-continue" className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Resume
              </h2>
              {continueRows.length > 0 ? (
                <ul className="space-y-3">
                  {continueRows.map((row) => (
                    <li key={row.key}>
                      <SessionHistoryCard
                        modality={row.modality}
                        title={row.title}
                        titleHint={row.titleHint}
                        subtitle={row.subtitle}
                        dateLabel={row.dateLabel}
                        status={row.status}
                        primaryAction={row.primary}
                        secondaryAction={row.secondary}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-3xl border border-dashed border-[#E2E8F0] bg-white/80 px-4 py-5 text-[13px] leading-relaxed text-[#64748B]">
                  Nothing to resume here{tab !== 'all' ? ' in this filter' : ''}. Go to{' '}
                  <Link href={APP_TALK_HUB} className="font-semibold text-[#7c3aed] underline-offset-2 hover:underline">
                    Talk
                  </Link>{' '}
                  or{' '}
                  <Link href={APP_SPEAK_LIVE} className="font-semibold text-[#7c3aed] underline-offset-2 hover:underline">
                    Speak Live
                  </Link>
                  .
                </p>
              )}

              {tab === 'speak' && !resumableLive && continueRows.length === 0 ? (
                <Link
                  href={APP_SPEAK_LIVE}
                  onClick={() => playAppSound('tap')}
                  className="flex min-h-touch items-center justify-between gap-3 rounded-3xl border border-[#E2E8F0] bg-white px-4 py-4 shadow-sm"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#7c3aed]">
                      <Radio className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-[15px] font-semibold text-[#0F172A]">Speak Live</span>
                      <span className="mt-0.5 block text-[13px] text-[#475569]">Open a new voice scene</span>
                    </span>
                  </span>
                  <span className="text-[13px] font-bold text-[#7c3aed]">Start</span>
                </Link>
              ) : null}
            </section>
          )}

          {useBackend && activeTrainingLoops.length > 0 ? (
            <section aria-labelledby="sh-active-loops" className="space-y-3">
              <h2 id="sh-active-loops" className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Active reps
              </h2>
              <ul className="space-y-2.5">
                {activeTrainingLoops.map((loop) => (
                  <li key={loop.id}>
                    <Link
                      href={appTalkTrainingLoopHref(loop.id)}
                      onClick={() => playAppSound('tap')}
                      className="flex min-h-touch items-center justify-between gap-3 rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50/90 to-white px-4 py-3.5 shadow-sm"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-800">
                          <Sparkles className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-semibold text-[#0F172A]">{loop.title}</span>
                          <span className="mt-0.5 block truncate text-[12px] text-[#64748B]">{loop.reason}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-[13px] font-bold text-violet-800">Open</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {useBackend && trainingLoopHistory.length > 0 ? (
            <section aria-labelledby="sh-loop-history" className="space-y-3">
              <h2 id="sh-loop-history" className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Recent drills
              </h2>
              <p className="text-[12px] leading-relaxed text-[#64748B]">
                Past reps — for context. Active drills stay above when you have them.
              </p>
              <ul className="space-y-2">
                {trainingLoopHistory.slice(0, 6).map((row) => (
                  <LoopHistoryRow key={row.id} row={row} />
                ))}
              </ul>
            </section>
          ) : null}

          {/* 3 — Recent reports */}
          {showReportsSection ? (
            <section aria-labelledby="sh-reports" className="space-y-3">
              <h2 id="sh-reports" className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Insights
              </h2>
              <div className="space-y-3">
                {modalityMatchesTab('speak', tab) ? (
                  <SessionHistoryCard
                    variant="report"
                    reportBadge="Speaking overview"
                    modality="speak"
                    title="Voice progress & coaching"
                    subtitle="Trends, scores, and phrasing notes from Speak Live — worth a glance before your next rep."
                    dateLabel="Updates as you practice"
                    primaryAction={{ label: 'Open overview', href: '/app/talk/speaking-progress' }}
                    secondaryAction={{ label: 'Speak Live', href: APP_SPEAK_LIVE }}
                  />
                ) : null}
                {modalityMatchesTab('read_aloud', tab) && readAloudReport ? (
                  <SessionHistoryCard
                    variant="report"
                    reportBadge="Read debrief"
                    modality="read_aloud"
                    title={readAloudReport.session.title?.trim() || 'Last passage'}
                    subtitle="Pronunciation, rhythm, and fixes from this read-through — open when you want the detail."
                    dateLabel={`Saved ${formatUpdated(readAloudReport.savedAt)}`}
                    primaryAction={{ label: 'Open debrief', href: APP_READ_ALOUD_REPORT }}
                    secondaryAction={{ label: 'New read', href: APP_READ_ALOUD }}
                  />
                ) : null}
                {modalityMatchesTab('read_aloud', tab) && !readAloudReport ? (
                  <p className="rounded-3xl border border-[#E2E8F0] bg-white px-4 py-4 text-[13px] text-[#64748B] shadow-sm">
                    Finish a read-aloud in{' '}
                    <Link href={APP_READ_ALOUD} className="font-semibold text-[#7C3AED] underline-offset-2 hover:underline">
                      Read aloud
                    </Link>{' '}
                    and your report will show up here.
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {showListeningArchive ? (
            <section aria-labelledby="sh-listening" className="space-y-3">
              <h2 id="sh-listening" className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Listening sessions
              </h2>
              <p className="text-[12px] leading-relaxed text-[#64748B]">
                Short comprehension reps on this device — open a coach report anytime to see what landed.
              </p>
              {listeningHistory.length > 0 ? (
                <ul className="space-y-3">
                  {listeningHistory.map((row) => {
                    const scenarioLabel = row.scenarioId.replace(/_/g, ' ')
                    const scoreLine = `${row.correctCount}/${row.totalAttempts} correct`
                    const tail = row.coachSummarySnippet ? ` — ${row.coachSummarySnippet}` : ''
                    return (
                      <li key={row.sessionId}>
                        <SessionHistoryCard
                          modality="listening"
                          title={row.packTitle}
                          titleHint={`#${shortSessionRef(row.sessionId)}`}
                          subtitle={`${scenarioLabel} · ${row.level} · ${scoreLine}${tail}`}
                          dateLabel={`Finished ${formatUpdated(row.endedAt)}`}
                          status="ended"
                          primaryAction={{
                            label: 'Open report',
                            href: listeningModeReportHref(row.sessionId),
                          }}
                          secondaryAction={{ label: 'Listening home', href: APP_LISTENING_MODE }}
                        />
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="rounded-3xl border border-dashed border-[#E2E8F0] bg-white/80 px-4 py-5 text-[13px] leading-relaxed text-[#64748B]">
                  No finished listening reps yet. Start one in{' '}
                  <Link href={APP_LISTENING_MODE} className="font-semibold text-[#7c3aed] underline-offset-2 hover:underline">
                    Listening
                  </Link>{' '}
                  — when you complete a set, it appears here with a link to the full report.
                </p>
              )}
            </section>
          ) : null}

          {showPersonalizedArchive ? (
            <section aria-labelledby="sh-personalized" className="space-y-3">
              <h2 id="sh-personalized" className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                From your day
              </h2>
              <p className="text-[12px] leading-relaxed text-[#64748B]">
                Personalized practice packs built from Quick Capture — reopen the full recap anytime.
              </p>
              {personalizedHistory.length > 0 ? (
                <ul className="space-y-3">
                  {personalizedHistory.map((row) => {
                    const r = row.report
                    const pct =
                      typeof r.completionPct === 'number'
                        ? r.completionPct
                        : Math.min(100, Math.round((r.stats.stepsCompleted / Math.max(1, r.stats.stepsTotal)) * 100))
                    const sources =
                      (r.sourceCaptureTypeLabels?.length ? r.sourceCaptureTypeLabels.join(' · ') : null) ||
                      row.themeSummary ||
                      row.sourceThemes.slice(0, 4).join(' · ')
                    const xpLine = row.xpAwarded > 0 ? `+${row.xpAwarded} XP` : 'XP pending'
                    return (
                      <li key={row.packId}>
                        <SessionHistoryCard
                          modality="personalized_practice"
                          title={row.title}
                          titleHint={`#${shortSessionRef(row.packId)}`}
                          subtitle={sources}
                          dateLabel={`Finished ${formatUpdated(row.endedAt)}`}
                          status="ended"
                          footNote={`${xpLine} · ${pct}% complete`}
                          primaryAction={{
                            label: 'Reopen pack',
                            href: fromYourDayPackSessionHref(row.packId, row.localDateYmd),
                          }}
                          secondaryAction={{
                            label: 'Summary',
                            href: personalizedPracticeReportHref(row.packId),
                          }}
                        />
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="rounded-3xl border border-dashed border-[#E2E8F0] bg-white/80 px-4 py-5 text-[13px] leading-relaxed text-[#64748B]">
                  No completed packs yet. Capture Dutch in the wild in Library, then run{' '}
                  <Link href={APP_LIBRARY_FROM_YOUR_DAY} className="font-semibold text-[#7c3aed] underline-offset-2 hover:underline">
                    From your day
                  </Link>
                  .
                </p>
              )}
            </section>
          ) : null}

          {(tab === 'all' && examSessionsForAllTab.length > 0) || tab === 'exam' ? (
            <section aria-labelledby="sh-exam" className="space-y-3">
              <h2 id="sh-exam" className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Fluent Exam
              </h2>
              {tab === 'all' ? (
                <p className="text-[12px] leading-relaxed text-[#64748B]">
                  Recent simulations and training — open the full archive for filters and older runs.
                </p>
              ) : (
                <p className="text-[12px] leading-relaxed text-[#64748B]">
                  Filter by mode, level, profile, and date. Continue an in-progress run or open the report when you
                  finished.
                </p>
              )}

              {tab === 'exam' ? (
                <div className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white/90 p-3 shadow-sm">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="w-full text-[10px] font-bold uppercase tracking-wide text-[#64748B]">Mode</span>
                    {(['all', 'simulation', 'training'] as const).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          playAppSound('tap')
                          setExamFilters((f) => ({ ...f, runMode: id }))
                        }}
                        className={clsx(
                          'rounded-full border px-2.5 py-1 text-[10px] font-bold',
                          examFilters.runMode === id
                            ? 'border-[#7c3aed] bg-[#7c3aed] text-white'
                            : 'border-[#E2E8F0] bg-white text-[#475569]',
                        )}
                      >
                        {id === 'all' ? 'All' : id === 'simulation' ? 'Sim' : 'Train'}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="w-full text-[10px] font-bold uppercase tracking-wide text-[#64748B]">Level</span>
                    {(['all', 'A1', 'A2', 'B1'] as const).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          playAppSound('tap')
                          setExamFilters((f) => ({ ...f, level: id }))
                        }}
                        className={clsx(
                          'rounded-full border px-2.5 py-1 text-[10px] font-bold',
                          examFilters.level === id
                            ? 'border-[#7c3aed] bg-[#7c3aed] text-white'
                            : 'border-[#E2E8F0] bg-white text-[#475569]',
                        )}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-[#64748B]" htmlFor="talk-exam-profile">
                      Profile
                    </label>
                    <select
                      id="talk-exam-profile"
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-2 py-2 text-[13px] text-[#0F172A]"
                      value={examFilters.profileId}
                      onChange={(e) => {
                        playAppSound('tap')
                        const v = e.target.value
                        setExamFilters((f) => ({ ...f, profileId: v === 'all' ? 'all' : v }))
                      }}
                    >
                      <option value="all">All profiles</option>
                      {(examProfilesQ.data ?? []).map((p) => (
                        <option key={p.examId} value={p.examId}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="w-full text-[10px] font-bold uppercase tracking-wide text-[#64748B]">Date</span>
                    {(['all', '7d', '30d'] as const).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          playAppSound('tap')
                          setExamFilters((f) => ({ ...f, datePreset: id }))
                        }}
                        className={clsx(
                          'rounded-full border px-2.5 py-1 text-[10px] font-bold',
                          examFilters.datePreset === id
                            ? 'border-[#7c3aed] bg-[#7c3aed] text-white'
                            : 'border-[#E2E8F0] bg-white text-[#475569]',
                        )}
                      >
                        {id === 'all' ? 'Any' : id === '7d' ? '7d' : '30d'}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {examSessionsQ.isLoading ? (
                <p className="text-[13px] text-[#64748B]">Loading exam sessions…</p>
              ) : examSessionsQ.isError ? (
                <p className="text-[13px] text-amber-900">Could not load Fluent Exam history.</p>
              ) : (
                <ul className="space-y-3">
                  {(tab === 'all' ? examSessionsForAllTab : examSessionsFiltered).map((s) => {
                    const profileTitle = examProfileTitleById.get(s.profileId)
                    return (
                      <li key={s.id}>
                        <SessionHistoryCard
                          modality={examSessionModality(s)}
                          title={examSessionCardTitle(profileTitle, s)}
                          titleHint={`#${shortSessionRef(s.id)}`}
                          subtitle={`${examSessionCardSubtitle(profileTitle, s)} · ${examSessionSummaryLine(s)}`}
                          dateLabel={`Updated ${formatUpdated(s.updatedAt)}`}
                          status={examSessionHistoryStatus(s)}
                          footNote={examSessionFootNote(s)}
                          primaryAction={examSessionPrimaryAction(s)}
                          secondaryAction={examSessionSecondaryAction(s)}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}

              {tab === 'all' && examSessionsForAllTab.length > 0 ? (
                <Link
                  href={APP_EXAM_HISTORY}
                  onClick={() => playAppSound('tap')}
                  className="flex min-h-touch items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-[13px] font-semibold text-[#7c3aed] shadow-sm"
                >
                  Open full Fluent Exam archive
                </Link>
              ) : null}

              {tab === 'exam' && !examSessionsQ.isLoading && examSessionsFiltered.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white/80 px-4 py-4 text-[13px] text-[#64748B]">
                  Nothing matches these filters.{' '}
                  <button
                    type="button"
                    className="font-semibold text-[#7c3aed] underline"
                    onClick={() => {
                      playAppSound('tap')
                      setExamFilters(defaultExamHistoryFilters())
                    }}
                  >
                    Clear filters
                  </button>
                </p>
              ) : null}
            </section>
          ) : null}

          {/* 4 — Completed sessions */}
          {showCompletedSection ? (
            <section aria-labelledby="sh-completed" className="space-y-3">
              <h2 id="sh-completed" className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                Recently wrapped
              </h2>
              <ul className="space-y-3">
                {completedThreadsForHistory
                  .filter((t) => {
                    const m: SessionModality = isSpeakLiveThread(t) ? 'speak' : 'chat'
                    return modalityMatchesTab(m, tab)
                  })
                  .map((t) => {
                    const modality: SessionModality = isSpeakLiveThread(t) ? 'speak' : 'chat'
                    const speakTitle = isSpeakLiveThread(t)
                      ? getSpeakLiveCatalogItem(t.scenarioId)?.title ?? t.scenarioId.replace(/-/g, ' ')
                      : null
                    const apiT = t as ApiConversationThread
                    const recapHref = threadRecapHref(apiT)

                    let primaryHref: string
                    let primaryLabel: string
                    let secondary: { label: string; href: string } | null = null

                    if (modality === 'chat') {
                      primaryHref = appTalkThreadRecap(t.id)
                      primaryLabel = 'Open wrap-up'
                    } else {
                      const voiceReportHref = threadReportHref(apiT)
                      if (voiceReportHref) {
                        primaryHref = voiceReportHref
                        primaryLabel = 'Open voice report'
                        secondary = { label: 'Scene recap', href: recapHref }
                      } else {
                        primaryHref = recapHref
                        primaryLabel = 'Open scene recap'
                      }
                    }

                    const title = modality === 'speak' && speakTitle ? speakTitle : TRAIN_DESK_HEADLINE
                    const subtitle = trainThreadContextLine(t)

                    return (
                      <li key={t.id}>
                        <SessionHistoryCard
                          modality={modality}
                          title={title}
                          titleHint={`#${shortThreadRef(t.id)}`}
                          subtitle={subtitle}
                          dateLabel={`Wrapped ${formatUpdated(t.updatedAt)}`}
                          status="ended"
                          primaryAction={{ label: primaryLabel, href: primaryHref }}
                          secondaryAction={secondary}
                        />
                      </li>
                    )
                  })}

                {modalityMatchesTab('speak', tab)
                  ? speakBookmarks.map((b, i) => {
                      const item = getSpeakLiveCatalogItem(b.scenarioId)
                      const title = item?.title ?? b.scenarioId.replace(/-/g, ' ')
                      return (
                        <li key={`bookmark-${b.savedAt}-${i}`}>
                          <SessionHistoryCard
                            modality="speak"
                            title={title}
                            subtitle={
                              b.note?.trim() ||
                              `Pinned for later · ${b.level} — reopens the same scene without hunting the catalog.`
                            }
                            dateLabel={`Saved ${formatUpdated(b.savedAt)}`}
                            status="saved"
                            primaryAction={{
                              label: 'Open scene',
                              href: speakLiveRunHref({ scenarioId: b.scenarioId, level: b.level }),
                            }}
                            secondaryAction={{ label: 'Scene library', href: APP_SPEAK_LIVE }}
                          />
                        </li>
                      )
                    })
                  : null}
              </ul>

              {completedThreadsForHistory.filter((t) => modalityMatchesTab(isSpeakLiveThread(t) ? 'speak' : 'chat', tab))
                .length === 0 && (tab !== 'speak' || speakBookmarks.length === 0) ? (
                <p className="rounded-3xl border border-dashed border-[#E2E8F0] bg-white/80 px-4 py-5 text-[13px] text-[#64748B]">
                  Nothing wrapped here yet — finish a chat or voice scene and it lands in this stack.
                </p>
              ) : null}
            </section>
          ) : null}

          {tab === 'read_aloud' ? (
            <section aria-label="Read aloud entry" className="space-y-2">
              <Link
                href={APP_READ_ALOUD}
                onClick={() => playAppSound('tap')}
                className="flex min-h-touch items-center justify-center gap-2 rounded-3xl border border-[#E2E8F0] bg-white px-4 py-3 text-[14px] font-semibold text-[#0F172A] shadow-sm hover:bg-slate-50"
              >
                <BookOpen className="h-4 w-4 text-[#7C3AED]" aria-hidden />
                New read-aloud
              </Link>
            </section>
          ) : null}
        </div>
      </div>

      {/* 5 — Filter tabs (sticky, thumb-friendly) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E2E8F0] bg-[#fafaf7]/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md supports-[backdrop-filter]:bg-[#fafaf7]/88"
        aria-label="Filter by mode"
      >
        <div className="mx-auto flex max-w-lg justify-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTabQuery(t.id)}
              className={clsx(
                'min-h-touch flex-1 rounded-2xl px-1.5 py-2 text-center text-[11px] font-bold transition-colors sm:px-2 sm:text-[12px] md:text-[13px]',
                tab === t.id ? 'bg-[#7c3aed] text-white shadow-sm' : 'text-[#475569] hover:bg-white/90',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
