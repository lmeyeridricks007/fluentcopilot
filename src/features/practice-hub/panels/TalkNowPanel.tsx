'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Activity,
  BookOpen,
  ChevronRight,
  Flame,
  Headphones,
  History,
  LayoutGrid,
  LineChart,
  MessageCircle,
  Mic,
  Radio,
  Sparkles,
  Target,
  Train,
  Zap,
} from 'lucide-react'
import type { PracticeDashboardSummary } from '../usePracticeDashboardSummary'
import type { NextBestActionVm } from '@/lib/dashboard/nextBestAction'
import type { ContinuePracticeItem, PracticeHubViewModel } from '../types'
import { playAppSound } from '@/lib/interaction/appSounds'
import { ApiRequestError } from '@/lib/api/apiErrors'
import { StartNewConversationModal } from '@/features/feature1-chat/components/StartNewConversationModal'
import {
  APP_LANGUAGE_COACH,
  APP_LISTENING_MODE,
  APP_READ_ALOUD,
  APP_SPEAK_LIVE,
  APP_TALK_ACTIVITY,
  APP_TALK_SKILLS,
  appTalkThread,
  appTalkTrainingLoopHref,
  speakLiveRunHref,
} from '@/lib/routing/appRoutes'
import { clsx } from 'clsx'
import {
  getPersona,
  getScenario,
  NewConversationSetupSheet,
  TRAIN_STATION_SCENARIO_ID,
  useFeature1ConversationStore,
} from '@/features/feature1-chat'
import type { ConversationMode, FeedbackMode } from '@/features/feature1-chat/types'
import {
  readResumableLiveSession,
  clearResumableLiveSession,
  type ResumableLiveSession,
} from '@/lib/speak-live/resumableLiveSessionStorage'
import { useTalkContinueSessions } from '../useTalkContinueSessions'
import type { ApiConversationThread } from '@/lib/api/apiTypes'
import { threadRecapHref } from '../session-history/sessionThreadLinks'
import { talkSkillPreviewChips } from '@/features/talk/talkSkillSurfaces'
import { TalkSkillSignalRow } from '@/features/talk/TalkSkillSignalRow'
import {
  computeHubNextRepReady,
  pickDirectedNextRec,
  selectFallbackDirectedRec,
  selectPrimaryRepLoop,
  suppressStripDirectedNext as stripSuppressesDirectedNext,
  type DirectedRec,
  type LearningFocus,
} from '../talkNextRepHubModel'

type Props = {
  vm: PracticeHubViewModel
  dash: PracticeDashboardSummary
  retentionStreak: number
  retentionCaption: string
  totalXp: number
  exploreHref: string
}

function formatUpdated(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function continueItemModeLabel(mode: ContinuePracticeItem['mode']): string {
  switch (mode) {
    case 'guided':
      return 'Guided'
    case 'semi_guided':
      return 'Semi-guided'
    case 'free':
      return 'Free flow'
    case 'speaking_focus':
      return 'Speaking focus'
    case 'listening_focus':
      return 'Listening focus'
    default:
      return 'Practice'
  }
}

const primaryBlue =
  'inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-2xl bg-[#7c3aed] px-4 py-3 text-center text-[15px] font-bold text-white shadow-sm hover:bg-[#0d5eb0]'
const secondaryOutline =
  'inline-flex min-h-touch flex-1 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-center text-[15px] font-semibold text-[#0F172A] hover:bg-slate-50'

/** Tier-2 hero: next-best is a concrete route, not the generic “Practice hub” loopback. */
function isDirectedNextBest(nb: NextBestActionVm | undefined): nb is NextBestActionVm {
  return Boolean(nb?.href && nb.kind !== 'practice_hub')
}

type TalkHeroKind =
  | 'speak_live_paused'
  | 'train_active'
  | 'practice_continue'
  | 'recommended_next'
  | 'speak_default'

function QuickTile({
  href,
  icon: Icon,
  title,
  subtitle,
  accentClassName,
  embedded = false,
  className,
  iconWell = 'blue',
}: {
  href: string
  icon: typeof MessageCircle
  title: string
  subtitle: string
  accentClassName?: string
  /** Lighter tile inside a shared group — less box stacking. */
  embedded?: boolean
  className?: string
  iconWell?: 'blue' | 'violet'
}) {
  const well =
    iconWell === 'violet'
      ? 'bg-violet-50/90 text-[#7C3AED] ring-1 ring-violet-200/60'
      : 'bg-[#EFF6FF]/90 text-[#7c3aed] ring-1 ring-[#BFDBFE]/50'

  return (
    <Link
      href={href}
      onClick={() => playAppSound('tap')}
      className={clsx(
        'flex min-h-touch flex-row items-start gap-3 text-left transition-[transform,background-color,box-shadow] motion-safe:duration-200',
        embedded
          ? 'rounded-2xl border-0 bg-transparent px-3 py-2.5 shadow-none hover:bg-slate-50/90 active:scale-[0.99]'
          : 'rounded-3xl border border-[#E2E8F0] bg-white p-4 shadow-sm hover:border-[#CBD5E1] active:scale-[0.98]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7c3aed]',
        className,
      )}
    >
      <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', well)}>
        <Icon className={clsx('h-5 w-5', accentClassName)} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 flex flex-col gap-0.5 pt-0.5">
        <span className="text-[15px] font-semibold leading-tight text-[#0F172A]">{title}</span>
        <span className="text-[13px] leading-snug text-[#475569]">{subtitle}</span>
      </span>
    </Link>
  )
}

const DEFAULT_SPEAK_LEVEL = 'A2'

function normSoftHint(a: string, b: string): boolean {
  const x = a.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 72)
  const y = b.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 72)
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

/** Strip legacy / unclassified pronunciation markers so hub copy stays human. */
function displayWorkingOnChip(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const s = raw
    .replace(/\s*\(unknown\)\s*/gi, ' ')
    .replace(/\s*·\s*$/u, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return s || null
}

function hrefForDirectedRec(rec: DirectedRec, level: string): string | null {
  if (rec.type === 'speak_live_scenario' && rec.targetId?.trim()) {
    return speakLiveRunHref({ scenarioId: rec.targetId.trim(), level })
  }
  if (rec.type === 'read_aloud_profile') return APP_READ_ALOUD
  if (rec.type === 'free_talk_theme') return APP_LANGUAGE_COACH
  if (rec.type === 'report_next_step') return APP_SPEAK_LIVE
  return null
}

function clampHubReason(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, ' ')
  if (!t) return 'Built from your recent practice.'
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

function formatHubSkillLabel(raw: string | undefined): string {
  const t = (raw ?? '').trim().replace(/_/g, ' ')
  if (!t) return 'Practice'
  return t.replace(/\b\w/g, (c) => c.toUpperCase())
}

function hubFocusLabelForRec(rec: DirectedRec, focus: LearningFocus): string {
  const w = displayWorkingOnChip(focus.workingOnChip?.trim())
  if (w && w.length < 44) return w
  switch (rec.type) {
    case 'read_aloud_profile':
      return 'Reading'
    case 'speak_live_scenario':
      return 'Speaking'
    case 'free_talk_theme':
      return 'Conversation'
    case 'report_next_step':
      return 'Next step'
    default:
      return 'Your practice'
  }
}

/** One compact action surface — primary saved loop or a single directed recommendation. */
function TalkNextRepHubCard({
  eyebrow,
  title,
  reason,
  metaLine,
  href,
}: {
  eyebrow: string
  title: string
  reason: string
  metaLine: string
  href: string
}) {
  return (
    <section
      aria-label={eyebrow}
      className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-violet-50/35 to-violet-50/30 px-4 py-3.5 shadow-[0_10px_34px_-22px_rgba(79,70,229,0.2)] ring-1 ring-slate-900/[0.04] sm:px-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md ring-1 ring-violet-500/30">
          <Zap className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p>
          <h2 className="mt-1 text-[17px] font-bold leading-snug tracking-tight text-[#0F172A]">{title}</h2>
          <p className="mt-1.5 text-[13px] leading-snug text-[#475569] line-clamp-2">{reason}</p>
          <p className="mt-2 text-[12px] font-semibold text-[#334155]">
            <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold tracking-tight text-slate-700">
              {metaLine}
            </span>
          </p>
        </div>
      </div>
      <Link
        href={href}
        onClick={() => playAppSound('tap')}
        className="mt-3.5 inline-flex min-h-touch w-full items-center justify-center rounded-xl bg-[#0F172A] px-4 py-3 text-[14px] font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] transition-transform"
      >
        Start
      </Link>
    </section>
  )
}

function directedRecIcon(rec: DirectedRec): typeof Mic {
  switch (rec.type) {
    case 'speak_live_scenario':
      return Mic
    case 'read_aloud_profile':
      return BookOpen
    case 'free_talk_theme':
      return MessageCircle
    case 'report_next_step':
      return Sparkles
    default:
      return Zap
  }
}

function pickOptionalMomentumLine(
  focus: LearningFocus,
  nextRec: DirectedRec | null,
  currentFocus: string | null,
  nextTitle: string | null
): string | null {
  const scen = focus.scenarioPersonalizationLine?.trim()
  if (scen && nextRec?.type === 'speak_live_scenario') {
    if (currentFocus && normSoftHint(scen, currentFocus)) return null
    if (nextTitle && normSoftHint(scen, nextTitle)) return null
    return scen.length > 160 ? `${scen.slice(0, 157)}…` : scen
  }
  const read = focus.recommendations?.find((x) => x.type === 'read_aloud_profile')
  if (read && nextRec?.type !== 'read_aloud_profile') {
    const tail = (read.subtitle || read.title).trim()
    if (!tail) return null
    const line = `Pairs well · ${tail}`
    return line.length > 168 ? `${line.slice(0, 165)}…` : line
  }
  return null
}

/**
 * At most: one focus, one recommended next (with optional link), one soft momentum line.
 * Cold start / missing profile: warm generic copy only — no weakness dashboard.
 */
function TalkPersonalizedLandingStrip({
  focus,
  speakLevel = DEFAULT_SPEAK_LEVEL,
  /** When the hub already shows a primary training-loop / next-rep card, hide duplicate “Suggested next” blocks. */
  suppressDirectedNext = false,
}: {
  focus: LearningFocus | null
  speakLevel?: string
  suppressDirectedNext?: boolean
}) {
  const shellClass =
    'overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white via-slate-50/35 to-white px-4 py-4 shadow-[0_16px_44px_-28px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/[0.04] sm:px-5 sm:py-4.5'

  if (!focus) {
    return (
      <section aria-label="Practice orientation" className={shellClass}>
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">A calm start</p>
            <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-slate-700">
              One short session is enough to build momentum — Speak, Train, or Read aloud, at your pace.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (focus.coldStart) {
    const body =
      focus.bestNextStep?.trim() ||
      'After a few gentle sessions, suggestions here will feel more personal — no streak pressure.'
    return (
      <section aria-label="Practice orientation" className={shellClass}>
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md">
            <Zap className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Welcome</p>
            <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-slate-700">{body}</p>
          </div>
        </div>
      </section>
    )
  }

  const currentFocus = displayWorkingOnChip(focus.workingOnChip?.trim() || null)
  const nextRec = pickDirectedNextRec(focus)
  const nextTitle = nextRec?.title?.trim() || null
  const nextSubtitle = nextRec?.subtitle?.trim() || null
  const showFocus = Boolean(
    currentFocus && (!nextTitle || !normSoftHint(currentFocus, nextTitle))
  )
  const nextHref = nextRec ? hrefForDirectedRec(nextRec, speakLevel) : null
  const momentum = pickOptionalMomentumLine(focus, nextRec, currentFocus, nextTitle)
  const showMomentum = Boolean(
    momentum && (!currentFocus || !normSoftHint(momentum, currentFocus)) && (!nextSubtitle || !normSoftHint(momentum, nextSubtitle))
  )
  const hasNextBlock = Boolean(
    !suppressDirectedNext && ((nextRec && nextTitle) || focus.bestNextStep?.trim()),
  )

  const skillLine = !focus.coldStart ? focus.skillsPreview?.lines?.[0]?.trim() ?? null : null
  const skillChips = !focus.coldStart ? talkSkillPreviewChips(focus.skillsPreview, 2) : []
  const skillEcho =
    skillChips.length === 0 &&
    skillLine &&
    (!currentFocus || !normSoftHint(skillLine, currentFocus)) &&
    (!nextTitle || !normSoftHint(skillLine, nextTitle))
      ? skillLine
      : null

  if (!showFocus && !hasNextBlock && !showMomentum && !skillEcho && skillChips.length === 0) return null

  const NextIcon = nextRec ? directedRecIcon(nextRec) : Sparkles

  return (
    <section aria-label="Personalized practice hints" className={shellClass}>
      <div className="flex items-start gap-3 border-b border-slate-200/70 pb-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-600 text-white shadow-md">
          <Activity className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">Your rhythm</p>
          <p className="mt-1 text-[12px] font-medium leading-snug text-slate-500">From recent practice — not a scorecard.</p>
        </div>
      </div>

      {skillChips.length > 0 ? (
        <div className="mt-3 rounded-xl border border-slate-200/60 bg-slate-50/70 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Skill signals</p>
          <TalkSkillSignalRow chips={skillChips} className="mt-2" />
        </div>
      ) : null}
      {skillEcho && (!currentFocus || !normSoftHint(skillEcho, currentFocus)) ? (
        <p className="mt-2.5 rounded-lg border border-violet-100/90 bg-violet-50/40 px-3 py-2 text-[12px] font-medium leading-snug text-violet-950/90">
          {skillEcho}
        </p>
      ) : null}

      <div className="mt-3 space-y-3">
        {showFocus ? (
          <div className="relative flex gap-3 overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-orange-50/20 px-3 py-3 shadow-sm">
            <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full bg-amber-500" aria-hidden />
            <span className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 shadow-inner ring-1 ring-amber-200/60">
              <Target className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-900/80">Working on</p>
              <p className="mt-1 text-[14px] font-semibold leading-snug text-slate-900">{currentFocus}</p>
            </div>
          </div>
        ) : null}

        {!suppressDirectedNext && nextRec && nextTitle ? (
          <div className="relative overflow-hidden rounded-2xl border border-[#93C5FD]/90 bg-gradient-to-br from-[#EFF6FF] via-white to-[#EEF2FF] px-3 py-3 shadow-md ring-1 ring-[#BFDBFE]/50">
            <span
              className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#7c3aed]/[0.06]"
              aria-hidden
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c3aed]">Suggested next</p>
            {nextHref ? (
              <Link
                href={nextHref}
                onClick={() => playAppSound('tap')}
                className="mt-2 group flex items-start gap-3 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#7c3aed] shadow-sm ring-1 ring-[#BFDBFE]/80">
                  <NextIcon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="block text-[15px] font-bold leading-snug text-slate-900 group-hover:text-[#7c3aed]">
                    {nextTitle}
                  </span>
                  {nextSubtitle ? (
                    <span className="mt-1 block text-[13px] leading-snug text-slate-600">{nextSubtitle}</span>
                  ) : null}
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full bg-[#7c3aed] text-white shadow-md transition-transform group-hover:scale-105 group-active:scale-95">
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </span>
              </Link>
            ) : (
              <div className="mt-2 flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#7c3aed] shadow-sm ring-1 ring-[#BFDBFE]/80">
                  <NextIcon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[15px] font-bold leading-snug text-slate-900">{nextTitle}</p>
                  {nextSubtitle ? <p className="mt-1 text-[13px] leading-snug text-slate-600">{nextSubtitle}</p> : null}
                </div>
              </div>
            )}
          </div>
        ) : !suppressDirectedNext && focus.bestNextStep?.trim() ? (
          <div className="relative overflow-hidden rounded-2xl border border-[#93C5FD]/90 bg-gradient-to-br from-[#EFF6FF] to-white px-3 py-3 shadow-md ring-1 ring-[#BFDBFE]/50">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c3aed]">Suggested next</p>
            <div className="mt-2 flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#7c3aed] shadow-sm ring-1 ring-[#BFDBFE]/80">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <p className="min-w-0 flex-1 pt-1 text-[14px] font-semibold leading-snug text-slate-800">{focus.bestNextStep.trim()}</p>
            </div>
          </div>
        ) : null}

        {showMomentum && momentum ? (
          <div className="flex gap-2.5 rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2.5 shadow-sm">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
              <LineChart className="h-4 w-4" aria-hidden />
            </span>
            <p className="min-w-0 text-[12px] font-medium leading-relaxed text-slate-600">{momentum}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function HubMoreLink({
  href,
  icon: Icon,
  title,
  subtitle,
  iconWell = 'blue',
}: {
  href: string
  icon: typeof History
  title: string
  subtitle: string
  iconWell?: 'blue' | 'violet' | 'slate'
}) {
  const well =
    iconWell === 'violet'
      ? 'bg-violet-50/90 text-[#7C3AED] ring-1 ring-violet-200/60'
      : iconWell === 'slate'
        ? 'bg-slate-100/90 text-slate-600 ring-1 ring-slate-200/80'
        : 'bg-[#EFF6FF]/90 text-[#7c3aed] ring-1 ring-[#BFDBFE]/50'

  return (
    <Link
      href={href}
      onClick={() => playAppSound('tap')}
      className="flex min-h-touch flex-row items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50/90 active:scale-[0.99]"
    >
      <span className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', well)}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 flex flex-col gap-0.5 pt-0.5">
        <span className="text-[15px] font-semibold leading-tight text-slate-900">{title}</span>
        <span className="text-[13px] leading-snug text-slate-600">{subtitle}</span>
      </span>
      <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
    </Link>
  )
}

/** Talk > Now — premium, action-first Dutch practice hub (lists live on Activity). */
export function TalkNowPanel({
  vm,
  dash,
  retentionStreak,
  retentionCaption,
  totalXp,
  exploreHref,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const createTrainStationThread = useFeature1ConversationStore((s) => s.createTrainStationThread)
  const pauseTrainThreadMock = useFeature1ConversationStore((s) => s.pauseTrainThread)
  const {
    useBackend,
    continueQuery,
    nextTrainingLoop,
    activeTrainingLoops,
    backendTrainContinue,
    activeTrainThread,
    pauseTrainMut,
    startMut,
    showContinueCard,
  } = useTalkContinueSessions()

  const [resumableLive, setResumableLive] = useState<ResumableLiveSession | null>(null)
  const refreshResumable = useCallback(() => setResumableLive(readResumableLiveSession()), [])
  useEffect(() => {
    refreshResumable()
  }, [pathname, refreshResumable])

  const [setupOpen, setSetupOpen] = useState(false)
  const [trainNewModalOpen, setTrainNewModalOpen] = useState(false)
  const [draftMode, setDraftMode] = useState<ConversationMode>('guided')
  const [draftFeedback, setDraftFeedback] = useState<FeedbackMode>('after_each')
  const [startError, setStartError] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('openTrainSetup') !== '1') return
    setSetupOpen(true)
    router.replace(pathname)
  }, [searchParams, pathname, router])

  const trainScenario = useMemo(() => getScenario(TRAIN_STATION_SCENARIO_ID), [])
  const trainPersona = useMemo(() => getPersona(trainScenario.personaId), [trainScenario])

  const continueThreadId = useBackend ? backendTrainContinue?.threadId : activeTrainThread?.id
  const continueUpdatedAt = useBackend ? backendTrainContinue?.updatedAt : activeTrainThread?.updatedAt
  const continueMode = useBackend ? backendTrainContinue?.mode : activeTrainThread?.mode
  const continueFeedback = useBackend ? backendTrainContinue?.feedbackMode : activeTrainThread?.feedbackMode

  const startTrainChat = useCallback(() => {
    setStartError(null)
    if (useBackend) {
      startMut.mutate(
        { mode: draftMode, feedbackMode: draftFeedback },
        {
          onSuccess: (data) => {
            setSetupOpen(false)
            router.push(appTalkThread(data.thread.id))
          },
          onError: (e) => {
            const msg =
              e instanceof ApiRequestError
                ? e.message
                : e instanceof Error
                  ? e.message
                  : 'Could not start chat'
            setStartError(msg)
          },
        }
      )
      return
    }
    const id = createTrainStationThread({ mode: draftMode, feedbackMode: draftFeedback })
    setSetupOpen(false)
    router.push(appTalkThread(id))
  }, [useBackend, startMut, createTrainStationThread, draftFeedback, draftMode, router])

  const practiceContinue = vm.continueItem ?? vm.fallbackPrimary

  /**
   * Talk landing hero priority (presentation only — same inputs as before):
   * 1) Paused / in-flight / saved practice continue → Continue your practice
   * 2) Else directed next-best (not generic hub loopback) → Start practicing now
   * 3) Else Speak-first default
   */
  const heroKind = useMemo((): TalkHeroKind => {
    if (resumableLive) return 'speak_live_paused'
    if (showContinueCard && continueThreadId && continueUpdatedAt && continueMode && continueFeedback)
      return 'train_active'
    if (practiceContinue) return 'practice_continue'
    if (isDirectedNextBest(dash.nextBest)) return 'recommended_next'
    return 'speak_default'
  }, [
    resumableLive,
    showContinueCard,
    continueThreadId,
    continueUpdatedAt,
    continueMode,
    continueFeedback,
    practiceContinue,
    dash.nextBest,
  ])

  const suppressDuplicateTryNext =
    heroKind === 'recommended_next' ||
    heroKind === 'practice_continue' ||
    dash.nextBest.kind === 'practice_hub' ||
    (heroKind === 'speak_live_paused' && dash.nextBest.kind === 'continue_practice') ||
    (heroKind === 'train_active' && dash.nextBest.kind === 'continue_practice')

  const secondaryEmphasizesSpeak = heroKind !== 'speak_default'

  const recentCompletedOne = useMemo(() => {
    if (!useBackend || !continueQuery.data?.trainRecentCompleted?.length) return null
    return continueQuery.data.trainRecentCompleted[0] ?? null
  }, [useBackend, continueQuery.data])

  const messageHref =
    showContinueCard && continueThreadId ? appTalkThread(continueThreadId) : '/app/talk?openTrainSetup=1'

  const canManageTrainThread = Boolean(
    (useBackend && backendTrainContinue) || (!useBackend && activeTrainThread),
  )

  const trainLearningHint = useMemo(() => {
    const lf = continueQuery.data?.learningFocus
    if (!lf || lf.coldStart) return null
    const scen = lf.recommendations?.find((r) => r.type === 'speak_live_scenario')
    const fromRec = scen?.reason?.trim() ?? null
    const fromSkills = lf.skillsPreview?.lines?.[0]?.trim() ?? null
    if (fromRec) return fromRec
    if (fromSkills) return `${fromSkills} — a good match for this practice chat.`
    return null
  }, [continueQuery.data?.learningFocus])

  const primaryRepLoop = useMemo(
    () => (useBackend ? selectPrimaryRepLoop(activeTrainingLoops, nextTrainingLoop) : null),
    [useBackend, activeTrainingLoops, nextTrainingLoop],
  )

  const fallbackDirectedRec = useMemo(
    () =>
      selectFallbackDirectedRec({
        useBackend,
        primaryRepLoop,
        learningFocus: continueQuery.data?.learningFocus,
      }),
    [useBackend, primaryRepLoop, continueQuery.data?.learningFocus],
  )

  const hubNextRepReady = useMemo(
    () =>
      computeHubNextRepReady({
        useBackend,
        continueSuccess: continueQuery.isSuccess,
        primaryRepLoop,
        fallbackDirectedRec,
      }),
    [useBackend, continueQuery.isSuccess, primaryRepLoop, fallbackDirectedRec],
  )

  const suppressStripDirectedNext = useMemo(
    () => stripSuppressesDirectedNext(primaryRepLoop, fallbackDirectedRec),
    [primaryRepLoop, fallbackDirectedRec],
  )

  return (
    <div className="space-y-10 motion-safe:animate-learn-segment-crossfade sm:space-y-12">
      {useBackend && continueQuery.isSuccess && hubNextRepReady && primaryRepLoop ? (
        <TalkNextRepHubCard
          eyebrow="Your next rep"
          title={primaryRepLoop.title}
          reason={clampHubReason(primaryRepLoop.reason || primaryRepLoop.subtitle || '', 150)}
          metaLine={`${formatHubSkillLabel(primaryRepLoop.targetSkills?.[0])} · ${Math.max(0.5, Math.round(primaryRepLoop.estimatedMinutes * 10) / 10)} min`}
          href={appTalkTrainingLoopHref(primaryRepLoop.id)}
        />
      ) : useBackend && continueQuery.isSuccess && hubNextRepReady && fallbackDirectedRec && continueQuery.data?.learningFocus ? (
        <TalkNextRepHubCard
          eyebrow="Practice now"
          title={
            fallbackDirectedRec.title?.trim() ||
            fallbackDirectedRec.subtitle?.trim() ||
            'Recommended practice'
          }
          reason={clampHubReason(
            fallbackDirectedRec.reason || fallbackDirectedRec.subtitle || fallbackDirectedRec.title || '',
            150,
          )}
          metaLine={`${hubFocusLabelForRec(fallbackDirectedRec, continueQuery.data.learningFocus)} · Quick rep`}
          href={hrefForDirectedRec(fallbackDirectedRec, DEFAULT_SPEAK_LEVEL) ?? APP_SPEAK_LIVE}
        />
      ) : null}
      {useBackend && continueQuery.isSuccess ? (
        <TalkPersonalizedLandingStrip
          focus={continueQuery.data?.learningFocus ?? null}
          suppressDirectedNext={suppressStripDirectedNext}
        />
      ) : null}
      {useBackend && backendTrainContinue ? (
        <StartNewConversationModal
          open={trainNewModalOpen}
          onClose={() => setTrainNewModalOpen(false)}
          onContinueCurrent={() => setTrainNewModalOpen(false)}
          onPauseAndStartNew={() => {
            pauseTrainMut.mutate(backendTrainContinue.threadId, {
              onSuccess: () => {
                setTrainNewModalOpen(false)
                setSetupOpen(true)
              },
            })
          }}
          onEndAndReviewFirst={() => {
            setTrainNewModalOpen(false)
            router.push(`${appTalkThread(backendTrainContinue.threadId)}?endReview=1`)
          }}
        />
      ) : null}
      {!useBackend && activeTrainThread ? (
        <StartNewConversationModal
          open={trainNewModalOpen}
          onClose={() => setTrainNewModalOpen(false)}
          onContinueCurrent={() => setTrainNewModalOpen(false)}
          onPauseAndStartNew={() => {
            pauseTrainThreadMock(activeTrainThread.id)
            setTrainNewModalOpen(false)
            setSetupOpen(true)
          }}
          onEndAndReviewFirst={() => {
            setTrainNewModalOpen(false)
            router.push(`${appTalkThread(activeTrainThread.id)}?endReview=1`)
          }}
        />
      ) : null}

      <NewConversationSetupSheet
        open={setupOpen}
        onClose={() => {
          setSetupOpen(false)
          setStartError(null)
        }}
        mode={draftMode}
        feedbackMode={draftFeedback}
        onModeChange={setDraftMode}
        onFeedbackModeChange={setDraftFeedback}
        onStart={startTrainChat}
        startPending={useBackend && startMut.isPending}
        startError={startError}
        learningHint={trainLearningHint}
      />

      {/* A — Primary hero (strongest focal point) */}
      <section aria-label="What to practice now" className="space-y-3">
        {useBackend && continueQuery.isLoading ? (
          <div className="min-h-[11rem] animate-pulse rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_40px_-18px_rgba(15,23,42,0.08)]" />
        ) : null}
        {useBackend && continueQuery.isError ? (
          <p className="rounded-2xl border border-amber-200/70 bg-[#FFFBEB]/90 px-3 py-2.5 text-[13px] text-amber-950 backdrop-blur-sm">
            Updates are slow right now. You can still speak, message, or open{' '}
            <Link href={APP_TALK_ACTIVITY} className="font-semibold underline underline-offset-2">
              Your sessions
            </Link>
            .
          </p>
        ) : null}

        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-[0_14px_44px_-14px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.03]">
          {heroKind === 'speak_live_paused' && resumableLive ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7C3AED]">Continue your practice</p>
              <h2 className="mt-2 text-[1.35rem] font-bold leading-tight tracking-tight text-[#0F172A]">Speak Live</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#475569]">
                <span className="font-semibold text-[#0F172A]">{resumableLive.scenarioTitle}</span> — still here when
                you are.
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                <Link
                  href={speakLiveRunHref({
                    scenarioId: resumableLive.scenarioId,
                    level: resumableLive.level,
                    threadId: resumableLive.threadId,
                  })}
                  onClick={() => playAppSound('tap')}
                  className={primaryBlue}
                >
                  Resume
                </Link>
                <Link href={APP_TALK_ACTIVITY} onClick={() => playAppSound('tap')} className={secondaryOutline}>
                  All sessions
                </Link>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearResumableLiveSession()
                  refreshResumable()
                  playAppSound('tap')
                }}
                className="mt-4 text-[13px] font-semibold text-[#64748B] underline-offset-2 hover:text-[#0F172A] hover:underline"
              >
                Hide reminder
              </button>
            </>
          ) : null}

          {heroKind === 'train_active' && continueThreadId && continueUpdatedAt && continueMode && continueFeedback ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#16A34A]">Continue your practice</p>
              <h2 className="mt-2 text-[1.35rem] font-bold leading-tight tracking-tight text-[#0F172A]">Train station</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#475569]">
                With {(useBackend ? backendTrainContinue?.personaName : trainPersona.displayName) ?? trainPersona.displayName}.{' '}
                {continueMode === 'guided' ? 'Guided' : 'Free flow'} ·{' '}
                {continueFeedback === 'after_each' ? 'Notes after each turn' : 'Recap at the end'}.
              </p>
              <p className="mt-1 text-[12px] text-[#64748B]">{formatUpdated(continueUpdatedAt)}</p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                <Link
                  href={appTalkThread(continueThreadId)}
                  onClick={() => playAppSound('tap')}
                  className="inline-flex min-h-touch flex-1 items-center justify-center rounded-2xl bg-[#16A34A] px-4 py-3 text-center text-[15px] font-bold text-white shadow-sm hover:bg-[#15803d]"
                >
                  Resume
                </Link>
                <Link href={APP_TALK_ACTIVITY} onClick={() => playAppSound('tap')} className={secondaryOutline}>
                  All sessions
                </Link>
              </div>
            </>
          ) : null}

          {heroKind === 'practice_continue' && practiceContinue ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c3aed]">Continue your practice</p>
              <h2 className="mt-2 text-[1.35rem] font-bold leading-tight tracking-tight text-[#0F172A]">
                {practiceContinue.title}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#475569]">{practiceContinue.summary}</p>
              <p className="mt-2 text-[12px] text-[#64748B]">
                {continueItemModeLabel(practiceContinue.mode)} · ~{practiceContinue.estimatedMinutes} min
                {practiceContinue.lastActiveLabel ? ` · ${practiceContinue.lastActiveLabel}` : ''}
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                <Link href={practiceContinue.href} onClick={() => playAppSound('tap')} className={primaryBlue}>
                  Resume
                </Link>
                <Link href={APP_TALK_ACTIVITY} onClick={() => playAppSound('tap')} className={secondaryOutline}>
                  All sessions
                </Link>
              </div>
            </>
          ) : null}

          {heroKind === 'recommended_next' ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c3aed]">Start practicing now</p>
              <h2 className="mt-2 text-[1.35rem] font-bold leading-tight tracking-tight text-[#0F172A]">
                {dash.nextBest.title}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#475569]">{dash.nextBest.subline}</p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                <Link href={dash.nextBest.href} onClick={() => playAppSound('tap')} className={primaryBlue}>
                  {dash.nextBest.ctaLabel}
                </Link>
                <Link href={exploreHref} onClick={() => playAppSound('tap')} className={secondaryOutline}>
                  More practice modes
                </Link>
              </div>
            </>
          ) : null}

          {heroKind === 'speak_default' ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c3aed]">Start with Speak</p>
              <h2 className="mt-2 text-[1.35rem] font-bold leading-tight tracking-tight text-[#0F172A]">
                Practice real conversations in Dutch
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#475569]">
                One short voice rep builds momentum. Calm screen, clear coaching.
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                <Link href={APP_SPEAK_LIVE} onClick={() => playAppSound('tap')} className={primaryBlue}>
                  <Mic className="h-4 w-4 shrink-0" aria-hidden />
                  Open Speak Live
                </Link>
                <Link href={exploreHref} onClick={() => playAppSound('tap')} className={secondaryOutline}>
                  More practice modes
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* B — Quick paths + optional recap (single grouped surface, lighter than hero) */}
      <section aria-label="Start another way" className="space-y-3 pt-1">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Start another way</h2>
          <p className="mt-1 max-w-[22rem] text-[14px] leading-snug text-[#475569]">
            Same app, different rhythm — tap what fits right now.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-2 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="flex flex-col gap-0.5">
            {secondaryEmphasizesSpeak ? (
              <QuickTile
                embedded
                href={APP_SPEAK_LIVE}
                icon={Radio}
                title="Speak"
                subtitle="Voice-first scenes — hear real Dutch in context."
              />
            ) : null}
            <QuickTile
              embedded
              href={messageHref}
              icon={MessageCircle}
              title="Message"
              subtitle="A relaxed thread with structure and feedback on your side."
            />
            <QuickTile
              embedded
              href={APP_LISTENING_MODE}
              icon={Headphones}
              title="Listening"
              subtitle="Short Dutch bursts — gist, details, then replay on your terms."
              iconWell="violet"
            />
            <QuickTile
              embedded
              href={APP_READ_ALOUD}
              icon={BookOpen}
              title="Read aloud"
              subtitle="Pacing and clarity — a short report when you finish."
              iconWell="violet"
            />
            <QuickTile
              embedded
              href={APP_LANGUAGE_COACH}
              icon={Sparkles}
              title="Language Coach"
              subtitle="Free-flow Dutch with a coach who nudges you forward."
              iconWell="violet"
            />
            <QuickTile
              embedded
              href={APP_TALK_SKILLS}
              icon={LineChart}
              title="Skills"
              subtitle="Strengths, focus, and calm next steps from your practice."
              iconWell="violet"
            />
          </div>
          {!secondaryEmphasizesSpeak ? (
            <div className="mx-1 mt-1 border-t border-slate-100 pt-1">
              <Link
                href={APP_SPEAK_LIVE}
                onClick={() => playAppSound('tap')}
                className="flex min-h-touch flex-row items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50/80"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF]/90 text-[#7c3aed] ring-1 ring-[#BFDBFE]/50">
                  <Radio className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 flex flex-col gap-0.5 pt-0.5">
                  <span className="text-[15px] font-semibold leading-tight text-[#0F172A]">Speak Live</span>
                  <span className="text-[13px] leading-snug text-[#64748B]">Browse scenes and start a rep.</span>
                </span>
              </Link>
            </div>
          ) : null}
          {recentCompletedOne ? (
            <div className="mx-1 mt-1 border-t border-slate-100 pt-1">
              <Link
                href={threadRecapHref(recentCompletedOne as ApiConversationThread)}
                onClick={() => playAppSound('tap')}
                className="flex min-h-touch items-start justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50/80"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex rounded-full bg-slate-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-400/15">
                      {'conversationSurface' in recentCompletedOne &&
                      recentCompletedOne.conversationSurface === 'speak_live'
                        ? 'Speak'
                        : 'Chat'}
                    </span>
                    <span className="inline-flex rounded-full bg-slate-500/[0.06] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 ring-1 ring-slate-400/12">
                      Finished
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                      {formatUpdated(recentCompletedOne.updatedAt)}
                    </span>
                  </span>
                  <span className="mt-2 block text-[14px] font-semibold leading-snug text-slate-900">
                    {'conversationSurface' in recentCompletedOne &&
                    recentCompletedOne.conversationSurface === 'speak_live'
                      ? 'Voice session wrap-up'
                      : 'Desk chat wrap-up'}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-slate-600">
                    {'conversationSurface' in recentCompletedOne &&
                    recentCompletedOne.conversationSurface === 'speak_live'
                      ? 'Scene recap and coaching from your last rep.'
                      : 'Key lines and feedback from your last counter chat.'}
                  </span>
                </span>
                <span className="shrink-0 pt-0.5 text-[12px] font-bold text-[#7c3aed]">Open</span>
              </Link>
            </div>
          ) : null}
          {canManageTrainThread ? (
            <div className="mx-1 mt-1 border-t border-slate-100 pt-1">
              <button
                type="button"
                onClick={() => {
                  playAppSound('tap')
                  setTrainNewModalOpen(true)
                }}
                className="flex min-h-touch w-full flex-row items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50/80"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 ring-1 ring-slate-200/80">
                  <Train className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 flex flex-col gap-0.5 pt-0.5">
                  <span className="text-[15px] font-semibold leading-tight text-[#0F172A]">New station chat</span>
                  <span className="text-[13px] leading-snug text-[#64748B]">
                    Fresh thread at the desk — pick mode and feedback, then start.
                  </span>
                </span>
                <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* C — Momentum + next step (single elevated surface) */}
      <section aria-label="Your momentum" className="space-y-3 border-t border-slate-200/80 pt-8">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Momentum</h2>
          <p className="mt-1 max-w-[22rem] text-[13px] leading-snug text-[#64748B]">
            Small signals that your habit is sticking — tap through when you want the full picture.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.02]">
          <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="flex flex-row items-center gap-3 p-4 sm:p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100/80">
                <Flame className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Streak</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
                  {retentionStreak > 0 ? `${retentionStreak}d` : '—'}
                </p>
                <p className="mt-1 max-w-[14rem] text-[12px] leading-snug text-slate-600 line-clamp-2">{retentionCaption}</p>
              </div>
            </div>
            <div className="flex flex-row items-center gap-3 p-4 sm:p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-[#EFF6FF] text-[#7c3aed] shadow-sm ring-1 ring-violet-100/90">
                <Zap className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">XP</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{totalXp}</p>
                <Link
                  href="/app/progress"
                  onClick={() => playAppSound('tap')}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#EFF6FF] px-2.5 py-1 text-[12px] font-semibold text-[#7c3aed] ring-1 ring-[#BFDBFE]/60 transition hover:bg-[#DBEAFE]/90"
                >
                  See progress
                  <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
          {!suppressDuplicateTryNext ? (
            <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3.5 sm:px-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Try next</p>
              <Link
                href={dash.nextBest.href}
                onClick={() => playAppSound('tap')}
                className="group mt-2 flex w-full items-start justify-between gap-3 rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-slate-200/60 transition hover:bg-white hover:ring-slate-300/80"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-snug text-slate-900 group-hover:text-[#7c3aed]">
                    {dash.nextBest.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-slate-600 line-clamp-2">
                    {dash.nextBest.subline}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5 pt-0.5 text-[13px] font-bold text-[#7c3aed]">
                  <span className="hidden sm:inline">{dash.nextBest.ctaLabel}</span>
                  <ChevronRight className="h-5 w-5 opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
                </span>
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {/* D — Library & history (same row pattern as quick paths) */}
      <section aria-label="Sessions and reports" className="space-y-3 border-t border-slate-200/80 pt-8">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B]">Library & history</h2>
          <p className="mt-1 max-w-[22rem] text-[13px] leading-snug text-[#64748B]">
            Threads you’ve touched, how your Dutch is trending, and the full catalog.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-2 shadow-[0_6px_24px_-12px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="flex flex-col gap-0.5">
            <HubMoreLink
              href={APP_TALK_ACTIVITY}
              icon={History}
              title="Recent sessions"
              subtitle="Paused chats, Speak runs, and saved reports — one list."
              iconWell="blue"
            />
            <HubMoreLink
              href="/app/talk/speaking-progress"
              icon={LineChart}
              title="How you sound"
              subtitle="Coarse trends from your clips — not a fine-grained scorecard."
              iconWell="violet"
            />
            <HubMoreLink
              href={exploreHref}
              icon={LayoutGrid}
              title="All scenes & tracks"
              subtitle="Browse Speak, read-alouds, and everything else in the catalog."
              iconWell="slate"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
