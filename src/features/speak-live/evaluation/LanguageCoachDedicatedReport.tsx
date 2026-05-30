'use client'

import { type ReactNode, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowRight,
  BookmarkPlus,
  Brain,
  Check,
  ChevronDown,
  Clock3,
  HelpCircle,
  Languages,
  ListChecks,
  type LucideIcon,
  Lightbulb,
  MessageSquare,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
} from 'lucide-react'
import type { EvidenceSummary, LanguageCoachDebriefReport, ScoredDimension, SessionEvaluationReport } from './reportTypes'
import { APP_LANGUAGE_COACH, APP_TALK_HUB, languageCoachStartHref, speakLiveRunHref } from '@/lib/routing/appRoutes'
import { LANGUAGE_COACH_ROLE_CARDS } from '../languageCoachRoleCatalog'
import { clsx } from 'clsx'
import { CoachGuidanceEvidenceList, coachSnippetForDisplay } from './CoachGuidanceEvidence'
import { LanguageCoachPhrasePracticeCard } from './LanguageCoachPhrasePracticeCard'
import { prefetchDutchWordGlosses, type DutchWordGlossPrefetchSource, type WordCorrection } from './dutchWordGlossSupport'
import { LearningMemoryRibbon, learningMemoryRibbonHasContent } from './LearningMemoryRibbon'
import type { ReportLearningMemoryRibbon } from '@/lib/api/apiTypes'

type AudioChip = { status: 'all' | 'partial' | 'none'; label: string } | null
type LangChip = { status: 'available' | 'unavailable'; label: string } | null

function deriveAudioEvidence(es: EvidenceSummary): AudioChip {
  const total = es.totalLearnerTurnCount
  const recorded = es.audioTurnCount
  const assessed = es.audioPipelineDiagnostics?.turnsAssessedOk ?? es.azurePronunciationTurnCount
  const replyWord = total === 1 ? 'reply' : 'replies'
  if (assessed >= total && assessed > 0) return { status: 'all', label: `Voice feedback for all ${total} ${replyWord}` }
  if (assessed > 0) return { status: 'partial', label: `Voice feedback on ${assessed} of ${total} ${replyWord}` }
  if (recorded > 0) {
    const recWord = recorded === 1 ? 'reply' : 'replies'
    return { status: 'partial', label: `Voice saved for ${recorded} ${recWord}; not all could be graded` }
  }
  return { status: 'none', label: 'No voice feedback for this session' }
}

function deriveLanguageEvidence(es: EvidenceSummary): LangChip {
  const text = es.transcriptTurnCount
  const replyWord = text === 1 ? 'reply' : 'replies'
  if (es.transcriptAvailable && text > 0) return { status: 'available', label: `What you said is saved (${text} ${replyWord})` }
  return { status: 'unavailable', label: 'Could not read back your text for scoring' }
}

function formatSessionDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds || 0))
  const min = Math.floor(safe / 60)
  const rem = safe % 60
  if (min <= 0) return `${rem}s`
  if (rem === 0) return `${min}m`
  return `${min}m ${rem}s`
}

function ReportSection({
  title,
  subtitle,
  icon: Icon,
  iconBgClass,
  children,
  bodyClassName,
}: {
  title: string
  subtitle?: string
  icon: LucideIcon
  iconBgClass: string
  children: ReactNode
  bodyClassName?: string
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/95 bg-white shadow-[0_16px_48px_-28px_rgba(15,23,42,0.22)]">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/95 via-white to-violet-50/20 px-4 py-3.5 sm:px-5 sm:py-4">
        <div
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md ring-1 ring-black/5',
            iconBgClass,
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-body font-bold tracking-tight text-ink-primary">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-caption leading-snug text-ink-tertiary">{subtitle}</p> : null}
        </div>
      </div>
      <div className={clsx('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

function HeroMetaPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[12px] font-semibold text-indigo-950 shadow-sm ring-1 ring-indigo-100/80">
      <Icon className="h-3.5 w-3.5 text-indigo-700" aria-hidden />
      {label}
    </span>
  )
}

function EvidenceBadge({ chip, icon: Icon }: { chip: AudioChip | LangChip; icon: LucideIcon }) {
  if (!chip) return null
  const tone =
    chip.status === 'all' || chip.status === 'available'
      ? 'border-emerald-200 bg-emerald-50/90 text-emerald-950'
      : chip.status === 'partial'
        ? 'border-amber-200 bg-amber-50/90 text-amber-950'
        : 'border-slate-200 bg-slate-50/90 text-slate-700'
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium', tone)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {chip.label}
    </span>
  )
}

function sessionScorePercent(score: number | null | undefined): number | null {
  if (typeof score !== 'number' || Number.isNaN(score)) return null
  return Math.max(0, Math.min(100, Math.round(score)))
}

/** Horizontal 0–100 meter for session score tiles. */
function SessionScoreMeter({
  score,
  variant,
  ariaLabel,
  className,
}: {
  score: number | null | undefined
  variant: 'voice' | 'chat' | 'overall'
  ariaLabel: string
  className?: string
}) {
  const pct = sessionScorePercent(score)
  const hasValue = pct != null
  const fillClass =
    variant === 'voice'
      ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600 shadow-[0_0_14px_rgba(16,185,129,0.28)]'
      : variant === 'overall'
        ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-600 shadow-[0_0_14px_rgba(139,92,246,0.28)]'
        : 'bg-gradient-to-r from-slate-400 via-indigo-400 to-violet-500 shadow-[0_0_12px_rgba(99,102,241,0.22)]'
  const trackClass =
    variant === 'voice'
      ? 'bg-emerald-950/[0.07]'
      : variant === 'overall'
        ? 'bg-indigo-950/[0.08]'
        : 'bg-slate-900/[0.07]'

  return (
    <div
      className={clsx('w-full', className)}
      role={hasValue ? 'progressbar' : 'presentation'}
      aria-label={ariaLabel}
      {...(hasValue ?
        {
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': pct,
          'aria-valuetext': `${pct} out of 100`,
        }
      : { 'aria-hidden': true })}
    >
      <div className={clsx('relative h-2 overflow-hidden rounded-full ring-1 ring-inset ring-black/[0.04]', trackClass)}>
        {hasValue ? (
          <div className={clsx('absolute inset-y-0 left-0 rounded-full', fillClass)} style={{ width: `${pct}%` }} />
        ) : null}
      </div>
    </div>
  )
}

function coachGuidedLineAccent(line: string): string {
  const t = line.trim()
  if (/^Clarification\b/i.test(t)) return 'border-l-[3px] border-amber-400 bg-amber-50/50'
  if (/^Implicit recast\b/i.test(t)) return 'border-l-[3px] border-violet-500 bg-violet-50/40'
  if (/^Follow-up/i.test(t)) return 'border-l-[3px] border-violet-500 bg-violet-50/40'
  if (/^Model line/i.test(t)) return 'border-l-[3px] border-fuchsia-500 bg-fuchsia-50/35'
  return 'border-l-[3px] border-slate-300 bg-slate-50/60'
}

function CoachInsightTile({
  title,
  body,
  Icon,
  iconClass,
}: {
  title: string
  body: string
  Icon: LucideIcon
  iconClass: string
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/90 bg-white/90 p-3 shadow-sm ring-1 ring-indigo-950/[0.04] sm:p-3.5">
      <span className={clsx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-black/[0.04]', iconClass)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-800">{body}</p>
      </div>
    </div>
  )
}

function classifyCoachInsightBullet(line: string): { title: string; body: string; Icon: LucideIcon; iconClass: string } {
  const raw = line.trim()
  if (/^Pattern the coach kept steering toward:\s*/i.test(raw)) {
    const body = raw.replace(/^Pattern the coach kept steering toward:\s*/i, '').replace(/\.\s*$/, '').trim() || raw
    return { title: 'Main pattern', body, Icon: Target, iconClass: 'bg-indigo-100 text-indigo-800' }
  }
  if (/^Recovery in this session:/i.test(raw)) {
    return { title: 'How you bounced back', body: raw.replace(/^Recovery in this session:\s*/i, '').trim() || raw, Icon: Activity, iconClass: 'bg-emerald-100 text-emerald-800' }
  }
  if (/coach moments were logged|^One coach moment was logged/i.test(raw)) {
    return { title: 'Coach touches', body: raw, Icon: MessageSquare, iconClass: 'bg-violet-100 text-violet-800' }
  }
  return { title: 'Session note', body: raw, Icon: Sparkles, iconClass: 'bg-amber-100 text-amber-900' }
}

function CoachImprovementHint({ text, tone }: { text: string; tone: 'voice' | 'chat' }) {
  const shell =
    tone === 'voice'
      ? 'border-emerald-100/90 bg-white/95 ring-emerald-900/[0.03]'
      : 'border-violet-100/90 bg-white/95 ring-violet-900/[0.03]'
  const iconWrap = tone === 'voice' ? 'bg-emerald-100 text-emerald-800' : 'bg-violet-100 text-violet-800'
  const Icon = tone === 'voice' ? Mic : ListChecks
  return (
    <div className={clsx('flex gap-3 rounded-xl border px-3.5 py-3 shadow-sm ring-1', shell)}>
      <span className={clsx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconWrap)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <p className="min-w-0 text-[13px] leading-relaxed text-slate-700">{text}</p>
    </div>
  )
}

function CoachSessionDimensionCard({ dimension: d, variant }: { dimension: ScoredDimension; variant: 'voice' | 'chat' }) {
  const shell =
    variant === 'voice'
      ? 'border-emerald-200/90 bg-gradient-to-b from-emerald-50/95 to-white shadow-[0_10px_28px_-18px_rgba(5,150,105,0.45)] ring-emerald-900/[0.04]'
      : 'border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-white shadow-[0_10px_28px_-18px_rgba(15,23,42,0.12)] ring-slate-900/[0.03]'
  const labelCls = variant === 'voice' ? 'text-emerald-950/95' : 'text-slate-800'
  const scoreCls = variant === 'voice' ? 'text-emerald-950' : 'text-slate-900'
  const verdictCls = variant === 'voice' ? 'text-emerald-900/88' : 'text-slate-600'
  const meaningCls = variant === 'voice' ? 'text-emerald-900/62' : 'text-slate-500'

  return (
    <div className={clsx('rounded-xl border px-3.5 py-3 ring-1', shell)}>
      <div className="flex items-start justify-between gap-2">
        <p className={clsx('min-w-0 flex-1 text-[11px] font-semibold leading-snug', labelCls)}>{d.label}</p>
        <p className={clsx('shrink-0 text-[22px] font-bold tabular-nums leading-none tracking-tight', scoreCls)}>{d.score ?? '—'}</p>
      </div>
      <SessionScoreMeter score={d.score} variant={variant} ariaLabel={`${d.label}: score out of 100`} className="mt-2.5" />
      <p className={clsx('mt-2 text-[11px] leading-snug', verdictCls)}>{d.verdict}</p>
      {d.meaning ? <p className={clsx('mt-1.5 text-[10px] leading-relaxed', meaningCls)}>{d.meaning}</p> : null}
    </div>
  )
}

function CoachSaveButton({
  busyKey,
  saving,
  savedKeys,
  label,
  savedLabel,
  onClick,
}: {
  busyKey: string
  saving: string | null
  savedKeys: Set<string>
  label: string
  savedLabel: string
  onClick: () => void
}) {
  const saved = savedKeys.has(busyKey)
  const busy = saving === busyKey
  return (
    <button
      type="button"
      disabled={busy || saved}
      onClick={onClick}
      className={
        saved
          ? 'inline-flex min-h-touch shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-900'
          : 'inline-flex min-h-touch shrink-0 items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-[12px] font-semibold text-indigo-900 hover:bg-indigo-50/80'
      }
    >
      {saved ? <Check className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
      {saved ? savedLabel : busy ? 'Saving…' : label}
    </button>
  )
}

export function LanguageCoachDedicatedReport(props: {
  report: SessionEvaluationReport
  debrief: LanguageCoachDebriefReport
  memoryRibbon?: ReportLearningMemoryRibbon | null
  recapHref: string
  onSave: (input: Record<string, unknown>) => void
  saving: string | null
  savedKeys: Set<string>
  /** e.g. stop report audio before leaving (matches main evaluation header). */
  onBeforeLeave?: () => void
  /**
   * Re-run post-session evaluation (`forceRestart` on the server): reloads saved turns, transcript,
   * and coach session state, then rebuilds this report. Same pipeline as "Regenerate report" on other scenarios.
   */
  onRebuildReport?: () => void | Promise<void>
  rebuildingReport?: boolean
  sessionId: string
  scenarioId: string
  level: string
  /** TTS playback for coach Dutch (same helper as sentence-level “Dutch reference”). */
  onPlayDutchReference?: (playbackTurnId: string, dutchText: string) => Promise<void>
}) {
  const {
    report,
    debrief,
    memoryRibbon,
    recapHref,
    onSave,
    saving,
    savedKeys,
    onBeforeLeave,
    onRebuildReport,
    rebuildingReport,
    sessionId,
    scenarioId,
    level,
    onPlayDutchReference,
  } = props
  const router = useRouter()
  const es = report.evidenceSummary
  const audioEv = es ? deriveAudioEvidence(es) : null
  const langEv = es ? deriveLanguageEvidence(es) : null
  const handoff = debrief.sessionHandoff
  const oneLiner = debrief.coachOneLiner ?? report.coachSummaryLine ?? handoff?.strongestSkillShown ?? ''
  /**
   * Optional supporting example for the headline. Producer emits this as a structured field
   * (`coachOneLinerExample`) rather than inlining quotes into `coachOneLiner`, so the H1
   * stays clean and we render the example in its own compact two-row card below — heading
   * vs evidence stays visually distinct. Hide entirely when null.
   */
  const oneLinerExample = debrief.coachOneLinerExample ?? null
  const practicedLevel = report.practicedLevel ?? report.targetLevel
  const observedLevel = report.observedLevel?.trim() || null
  const levelObservationNote = report.levelObservationNote?.trim() || null
  const focusLabel = debrief.focusAreaLabel
  const focusWhy = report.focusArea?.why ?? 'Based on repeated signals in your answers during this conversation.'
  const improved = debrief.whatImprovedDuringSession ?? handoff?.bestExampleImprovement
  const guidedFiltered = useMemo(() => {
    const g = debrief.howCoachGuidedYou ?? handoff?.notableNudgeMoments ?? []
    if (!debrief.nudgeSessionLog?.length) return g
    return g.filter((line) => {
      const t = line.trim()
      if (/^\s*(Implicit recast|Clarification|Follow-up|Model line)/i.test(t) && /\bon:\s*[\u2018'"]/i.test(t)) return false
      return true
    })
  }, [debrief.howCoachGuidedYou, debrief.nudgeSessionLog, handoff?.notableNudgeMoments])

  const coachGlossPrefetchSources = useMemo((): DutchWordGlossPrefetchSource[] => {
    const rows = debrief.nudgeSessionLog
    if (!rows?.length) return []
    const corrections: WordCorrection[] = []
    return rows
      .map((r) => coachSnippetForDisplay(r.coachResponseSnippet))
      .filter((p) => p.length >= 2)
      .map((phrase) => ({ phrase, corrections }))
  }, [debrief.nudgeSessionLog])

  useEffect(() => {
    void prefetchDutchWordGlosses(coachGlossPrefetchSources)
  }, [coachGlossPrefetchSources])

  const heroSupport =
    improved ??
    debrief.roleSessionEmphasis ??
    'A conversation-first debrief focused on what will help your Dutch sound more natural next time.'

  const roleChipLabel = debrief.conversationRole
    ? LANGUAGE_COACH_ROLE_CARDS.find((c) => c.id === debrief.conversationRole)?.title ?? null
    : null
  const guideChip =
    debrief.conversationRole === 'coach' && typeof debrief.coachGuideWhileSpeaking === 'boolean' ?
      debrief.coachGuideWhileSpeaking ?
        'Guide while speaking: On'
      : 'Guide while speaking: Off'
    : null

  const nextPracticeLines = useMemo(() => {
    const primary = handoff?.suggestedNextFocus?.trim()
    const rest = debrief.followUpSuggestions.map((s) => s.trim()).filter(Boolean)
    const ordered = [primary, ...rest].filter((x): x is string => Boolean(x))
    const out: string[] = []
    const seen = new Set<string>()
    for (const line of ordered) {
      const k = line.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(line)
    }
    return out
  }, [handoff?.suggestedNextFocus, debrief.followUpSuggestions])

  const coachGuidedLayout = useMemo(() => {
    const full = guidedFiltered.map((s) => s.trim()).filter(Boolean)
    let modeIntro: string | null = null
    const rest: string[] = []
    for (const line of full) {
      if (!modeIntro && /Coach mode with/i.test(line)) modeIntro = line
      else rest.push(line)
    }
    return {
      modeIntro,
      visibleNudges: rest.slice(0, 4),
      extraNudges: rest.slice(4),
    }
  }, [guidedFiltered])

  const scoreDimensions = report.overall?.dimensions ?? []
  const headlineOverall = typeof report.overall?.overallScore === 'number' ? report.overall.overallScore : null
  const voiceDims = scoreDimensions.filter((d) => d.evidenceType === 'audio')
  const transcriptDims = scoreDimensions.filter((d) => d.evidenceType === 'transcript')
  const voiceImprovementFindings = debrief.voiceImprovementFindings ?? []
  const conversationScoreHints = debrief.conversationScoreHints ?? []
  const voiceTipsForUi = useMemo(() => {
    const junk = /^reference text is the transcript/i
    const out: string[] = []
    const seen = new Set<string>()
    for (const line of voiceImprovementFindings) {
      const t = line.trim()
      if (!t || junk.test(t) || seen.has(t.toLowerCase())) continue
      seen.add(t.toLowerCase())
      out.push(t)
    }
    return out.slice(0, 8)
  }, [voiceImprovementFindings])

  const breakdownLines = useMemo(
    () => (debrief.conversationSnapshotDutchLines ?? []).slice(-6),
    [debrief.conversationSnapshotDutchLines],
  )
  const fluencyNaturalDims = useMemo(
    () => transcriptDims.filter((d) => d.id === 'fluency_flow' || d.id === 'naturalness'),
    [transcriptDims],
  )
  const audioRecorded = es?.audioTurnCount ?? 0
  const audioGraded =
    typeof es?.audioPipelineDiagnostics?.turnsAssessedOk === 'number'
      ? es.audioPipelineDiagnostics.turnsAssessedOk
      : (es?.azurePronunciationTurnCount ?? 0)
  const hasWordsVoiceLeft =
    breakdownLines.length > 0 ||
    fluencyNaturalDims.length > 0 ||
    debrief.improvedPhrasingExamples.length > 0
  const voiceWordCompareCount = debrief.voiceWordCompareItems?.length ?? 0
  const hasWordsVoiceRight =
    voiceDims.length > 0 ||
    voiceTipsForUi.length > 0 ||
    audioRecorded > 0 ||
    voiceWordCompareCount > 0
  const showWordsAndVoiceSection = hasWordsVoiceLeft || hasWordsVoiceRight

  return (
    <div className="min-h-[100dvh] bg-[#f4f2fb] text-ink-primary">
      <header className="sticky top-0 z-30 border-b border-indigo-100/90 bg-white/90 backdrop-blur-xl px-5 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-[13px] font-semibold text-slate-600 shrink-0"
          onClick={() => {
            onBeforeLeave?.()
            router.push(APP_TALK_HUB)
          }}
        >
          Done
        </button>
        <p className="text-[13px] font-semibold text-indigo-950 truncate text-center flex-1">Coach debrief</p>
        <button
          type="button"
          className="text-[13px] text-indigo-800 shrink-0 font-medium"
          onClick={() => router.push(recapHref)}
        >
          Recap
        </button>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 pb-28 sm:px-5">
        {/**
         * Cross-session `LearningMemoryRibbon` is suppressed when this session produced a
         * `nextPracticePlan`. The plan section (rendered below the hero) is fully session-
         * derived and the ribbon's "Try {generic scenario} again briefly" copy would compete
         * with — and contradict — it. When there's no plan (cold start), the ribbon still
         * provides useful cross-session continuity.
         */}
        {memoryRibbon && learningMemoryRibbonHasContent(memoryRibbon) && !debrief.nextPracticePlan ? (
          <LearningMemoryRibbon ribbon={memoryRibbon} />
        ) : null}
        <section className="space-y-5">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-gradient-to-br from-white via-violet-50/35 to-slate-50/45 p-5 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.22)] sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/90 bg-violet-100/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-900">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Language Coach
              </span>
              {roleChipLabel ? (
                <span className="inline-flex items-center rounded-full border border-indigo-200/80 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-900">
                  Role · {roleChipLabel}
                </span>
              ) : null}
              {guideChip ? (
                <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-[11px] font-semibold tracking-wide text-emerald-950">
                  {guideChip}
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-800/80">Coach in one line</p>
                <h1 className="mt-2 text-[clamp(1.65rem,5vw,2.35rem)] font-bold leading-[1.05] tracking-tight text-ink-primary">
                  {oneLiner}
                </h1>
                {oneLinerExample ? (
                  <figure className="mt-4 max-w-2xl rounded-2xl border border-violet-100 bg-white/80 px-4 py-3 shadow-[0_8px_24px_-20px_rgba(67,56,202,0.25)]">
                    <figcaption className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-violet-800/75">
                      Example from this session
                    </figcaption>
                    <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[14px] leading-snug">
                      <dt className="font-semibold text-rose-700/85">You said</dt>
                      <dd className="text-ink-primary">
                        <span aria-hidden className="mr-1 text-rose-400">“</span>
                        {oneLinerExample.learnerish}
                        <span aria-hidden className="ml-1 text-rose-400">”</span>
                      </dd>
                      <dt className="font-semibold text-emerald-700/90">Aim for</dt>
                      <dd className="text-ink-primary">
                        <span aria-hidden className="mr-1 text-emerald-500">“</span>
                        {oneLinerExample.better}
                        <span aria-hidden className="ml-1 text-emerald-500">”</span>
                      </dd>
                    </dl>
                  </figure>
                ) : null}
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-secondary">{heroSupport}</p>
              </div>

              <div className="rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-[0_12px_32px_-20px_rgba(67,56,202,0.28)] ring-1 ring-slate-900/[0.04]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-800/75">Session snapshot</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <HeroMetaPill icon={Target} label={`Practice level ${practicedLevel}`} />
                  <HeroMetaPill icon={Clock3} label={formatSessionDuration(report.sessionDurationSeconds)} />
                  <HeroMetaPill
                    icon={Mic}
                    label={`${report.learnerTurnCount} ${report.learnerTurnCount === 1 ? 'time you spoke' : 'times you spoke'}`}
                  />
                  {observedLevel && observedLevel !== practicedLevel ? (
                    <HeroMetaPill icon={TrendingUp} label={`Observed closer to ${observedLevel}`} />
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <EvidenceBadge chip={audioEv} icon={audioEv?.status === 'none' ? MicOff : Mic} />
                  <EvidenceBadge chip={langEv} icon={Languages} />
                </div>
                {es?.audioPipelineDiagnostics?.issues?.[0] ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-slate-600">{es.audioPipelineDiagnostics.issues[0]}</p>
                ) : null}
                {levelObservationNote ? (
                  <div className="mt-4 rounded-xl border border-violet-100/90 bg-violet-50/60 px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-violet-900/80">Level note</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-violet-950/95">{levelObservationNote}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/**
           * "Plan your next session" — placed immediately after the hero so the actionable
           * next-step CTA is above the fold. Renders only when the backend producer attached
           * a session-derived `nextPracticePlan`; when absent, the legacy generic "Keep
           * going" CTA at the bottom of the page is shown instead (it's gated on the same
           * field). This avoids duplicate "start next session" calls-to-action.
           */}
          {debrief.nextPracticePlan ? (
            <NextPracticePlanSection plan={debrief.nextPracticePlan} />
          ) : null}

          {headlineOverall != null && scoreDimensions.length > 0 ? (
            <div className="rounded-[1.75rem] border border-indigo-200/90 bg-white/95 p-5 shadow-sm ring-1 ring-indigo-100/50 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-900/80">Session scores</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
                    Overall mixes how your Dutch read in the chat with how your voice clips sounded when we could grade
                    them.
                  </p>
                </div>
                <div className="flex w-full shrink-0 flex-col justify-center rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/90 to-white px-5 py-4 text-center shadow-[0_12px_32px_-20px_rgba(67,56,202,0.35)] sm:w-auto sm:min-w-[11.5rem]">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-900/75">Overall</p>
                  <p className="mt-1 text-[2.35rem] font-bold leading-none tabular-nums text-indigo-950">{headlineOverall}</p>
                  <p className="mt-1 text-[11px] font-medium text-indigo-900/70">out of 100</p>
                  <SessionScoreMeter
                    score={headlineOverall}
                    variant="overall"
                    ariaLabel="Overall session score out of 100"
                    className="mt-3"
                  />
                </div>
              </div>
              {voiceDims.length > 0 ? (
                <div className="mt-5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">How you sounded (voice)</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    {voiceDims.map((d) => (
                      <CoachSessionDimensionCard key={d.id} dimension={d} variant="voice" />
                    ))}
                  </div>
                  {voiceTipsForUi.length > 0 ? (
                    <p className="mt-3 text-[12px] leading-relaxed text-slate-600">
                      <span className="font-semibold text-slate-800">What shaped these numbers: </span>
                      {voiceTipsForUi.slice(0, 2).join(' ')}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {transcriptDims.length > 0 ? (
                <div className={voiceDims.length ? 'mt-5 border-t border-slate-100 pt-5' : 'mt-5'}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">From what you said in chat</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {transcriptDims.map((d) => (
                      <CoachSessionDimensionCard key={d.id} dimension={d} variant="chat" />
                    ))}
                  </div>
                  {debrief.weakPatterns?.[0] ? (
                    <p className="mt-3 text-[12px] leading-relaxed text-slate-600">
                      <span className="font-semibold text-slate-800">Example from your chat: </span>
                      {debrief.weakPatterns[0].replace(/\s*\(×\d+\)\s*$/, '')}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {voiceTipsForUi.length > 0 || conversationScoreHints.length > 0 ? (
                <div className="mt-5 border-t border-amber-100/90 pt-5">
                  <div className="rounded-2xl border border-amber-100/80 bg-gradient-to-br from-amber-50/70 via-white to-violet-50/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 shadow-sm ring-1 ring-amber-200/60">
                        <Lightbulb className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1 space-y-4">
                        <div>
                          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-amber-950/90">Practical next steps</p>
                          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                            {debrief.conversationRole === 'coach' ?
                              'Small wins you can repeat out loud. For audio playback, saves, and tap-a-word help on lines from this session, use the Phrases to refine card below.'
                            : 'Small wins you can repeat out loud. For lines from this session with support, open Phrases to refine below.'}
                          </p>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                          {voiceTipsForUi.length > 0 ? (
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900">
                                  <Mic className="h-3.5 w-3.5" aria-hidden />
                                </span>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-950/85">Listening back to you</p>
                              </div>
                              <div className="space-y-2">
                                {voiceTipsForUi.map((line, i) => (
                                  <CoachImprovementHint key={`voice-hint-${i}`} text={line} tone="voice" />
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {conversationScoreHints.length > 0 ? (
                            <div className={clsx('space-y-2.5', voiceTipsForUi.length > 0 ? 'lg:border-l lg:border-slate-200/80 lg:pl-4' : '')}>
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-900">
                                  <ListChecks className="h-3.5 w-3.5" aria-hidden />
                                </span>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-violet-950/85">From your chat flow</p>
                              </div>
                              <div className="space-y-2">
                                {conversationScoreHints.map((line, i) => (
                                  <CoachImprovementHint key={`conv-hint-${i}`} text={line} tone="chat" />
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : headlineOverall != null && scoreDimensions.length > 0 ? (
                <div className="mt-5 border-t border-amber-100/90 pt-5">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-4 sm:px-5">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                      <div>
                        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-800">Practical next steps</p>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                          {debrief.conversationRole === 'coach' ?
                            'These scores summarize the session. Turn them into real practice with the Phrases to refine card and the saveable rows further down — that is where you get replayable Dutch with audio and saves.'
                          : 'These scores summarize the session. Use the Phrases to refine card and the practice rows below for replayable lines and drills.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 shadow-sm ring-1 ring-slate-900/[0.03] sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Session framing</p>
            <p className="mt-2 text-body-sm leading-relaxed text-ink-primary">
              {debrief.roleSessionEmphasis ?? 'Conversation report — not a scenario scorecard.'}
            </p>
            <p className="mt-2 text-caption leading-relaxed text-ink-tertiary">
              This report is meant to show what happened, what matters most, and what to practice next.
            </p>
          </div>
        </section>

        <ReportSection
          title="Conversation snapshot"
          subtitle="A quick recap of how this session sounded and what you were working on."
          icon={MessageSquare}
          iconBgClass="bg-gradient-to-br from-violet-500 to-indigo-600"
        >
          {debrief.conversationSnapshotDutchLines?.length ? (
            <div className="space-y-5">
              <p className="text-[15px] leading-relaxed text-ink-secondary">
                {debrief.conversationSnapshotIntro?.trim() ||
                  "Here's a quick recap of how this session came across and what you were working on."}
              </p>
              <div className="rounded-[1.25rem] border border-violet-100/90 bg-gradient-to-b from-violet-50/50 to-white px-4 py-4 sm:px-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-900/75">
                  Latest from your Dutch
                </p>
                <p className="mt-1 text-caption leading-snug text-ink-tertiary">
                  One line per turn you spoke, most recent at the bottom.
                </p>
                <ol className="mt-4 list-decimal space-y-3 pl-5 text-[15px] leading-relaxed text-ink-primary marker:font-semibold marker:text-violet-700">
                  {debrief.conversationSnapshotDutchLines.map((line, i) => (
                    <li key={`snap-${i}`} className="break-words pl-1">
                      {line}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-secondary">{debrief.conversationSummary}</p>
          )}
        </ReportSection>

        <ReportSection
          title="Learning spotlight"
          subtitle="The clearest growth signal from this session, plus what started improving."
          icon={Target}
          iconBgClass="bg-gradient-to-br from-indigo-500 to-violet-600"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-[1.35rem] border border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/30 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-900/80">Your focus next</p>
              <p className="mt-2 text-[1.35rem] font-semibold leading-tight tracking-tight text-indigo-950">{focusLabel}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-indigo-950/85">{focusWhy}</p>
            </div>
            <div className="rounded-[1.35rem] border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-900/80">What improved</p>
              <p className="mt-2 text-[14px] leading-relaxed text-emerald-950/95">
                {improved ?? 'No single recovery moment stood out yet, so the next session should make the pattern clearer.'}
              </p>
            </div>
          </div>
        </ReportSection>

        <div className="grid gap-6 lg:grid-cols-2">
          {debrief.strengths.length > 0 ? (
            <ReportSection
              title="What you did well"
              subtitle="Signals worth keeping in your next conversation."
              icon={TrendingUp}
              iconBgClass="bg-gradient-to-br from-emerald-500 to-teal-600"
            >
              <ul className="space-y-3">
                {debrief.strengths.map((s, i) => (
                  <li key={`st-${i}`} className="rounded-xl border border-emerald-100/80 bg-emerald-50/35 px-4 py-3 text-[14px] leading-relaxed text-emerald-950/95">
                    {s}
                  </li>
                ))}
              </ul>
            </ReportSection>
          ) : null}

          {debrief.weakPatterns.length > 0 ? (
            <ReportSection
              title="Patterns to work on"
              subtitle="The repeated friction points that are most worth cleaning up next."
              icon={Lightbulb}
              iconBgClass="bg-gradient-to-br from-amber-500 to-orange-500"
            >
              <ul className="space-y-3">
                {debrief.weakPatterns.map((p, i) => (
                  <li key={`wp-${i}`} className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-[14px] leading-relaxed text-amber-950/95">
                    {p}
                  </li>
                ))}
              </ul>
            </ReportSection>
          ) : null}
        </div>

        {showWordsAndVoiceSection ? (
          <ReportSection
            title="Your words & your voice"
            subtitle="Real Dutch from this chat, how it reads in the transcript, graded mic scores when we have them, and specific tweaks — not a generic summary."
            icon={Mic}
            iconBgClass="bg-gradient-to-br from-violet-500 to-cyan-600"
          >
            <div
              className={clsx(
                'grid gap-5',
                hasWordsVoiceLeft && hasWordsVoiceRight ? 'lg:grid-cols-2 lg:items-start' : 'max-w-2xl',
              )}
            >
              {hasWordsVoiceLeft ? (
                <div className="min-w-0 rounded-[1.25rem] border border-violet-100/90 bg-gradient-to-b from-violet-50/45 to-white px-4 py-4 sm:px-5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-violet-900/85">What you said (this session)</p>
                  {breakdownLines.length > 0 ? (
                    <>
                      <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
                        These are your own lines, newest near the bottom — the same wording used for chat-side scores.
                      </p>
                      <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-[14px] leading-relaxed text-slate-900 marker:font-semibold marker:text-violet-700">
                        {breakdownLines.map((line, i) => (
                          <li key={`wv-line-${i}`} className="break-words pl-1">
                            {line}
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : fluencyNaturalDims.length > 0 ? (
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                      We could not show a tidy list of lines in this export, but the chat-based scores below still reflect
                      how your Dutch came across in the thread.
                    </p>
                  ) : debrief.improvedPhrasingExamples.length > 0 ? (
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                      We could not list every line in this view, but the phrases below are tied to wording from this session.
                    </p>
                  ) : (
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                      We did not capture enough Dutch lines to list here. A slightly longer back-and-forth next time lets
                      feedback anchor to your real wording.
                    </p>
                  )}
                  {fluencyNaturalDims.length > 0 ? (
                    <div className="mt-4 border-t border-violet-100/80 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">How that reads in chat</p>
                      <div className="mt-2 space-y-2">
                        {fluencyNaturalDims.map((d) => (
                          <div key={d.id} className="rounded-lg border border-white/90 bg-white/85 px-3 py-2.5 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[12px] font-semibold text-slate-800">{d.label}</span>
                              <span className="text-[13px] font-bold tabular-nums text-slate-900">{d.score ?? '—'}</span>
                            </div>
                            <SessionScoreMeter
                              score={d.score}
                              variant="chat"
                              ariaLabel={`${d.label} score out of 100`}
                              className="mt-1.5"
                            />
                            <p className="mt-2 text-[12px] leading-snug text-slate-600">{d.verdict}</p>
                            {d.meaning ? (
                              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{d.meaning}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {debrief.improvedPhrasingExamples.length > 0 && sessionId && onPlayDutchReference ? (
                    <div className="mt-4 border-t border-violet-100/80 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                        Phrases to refine (your line → better Dutch)
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
                        Pulled from this session’s transcript and coach moments — hear the model, then save it for drills.
                      </p>
                      <div className="mt-3 space-y-3">
                        {debrief.improvedPhrasingExamples.map((row, i) => (
                          <LanguageCoachPhrasePracticeCard
                            key={`lc-chat-${i}-${row.learnerish.slice(0, 24)}`}
                            variant="chat"
                            sessionId={sessionId}
                            scenarioId={scenarioId}
                            level={level}
                            yourLine={row.learnerish}
                            modelDutch={row.better}
                            saveKeyBase={`lc-chat-${sessionId}-${i}`}
                            playbackTurnId={`lc-chat-play-${sessionId}-${i}`}
                            onPlayDutchReference={onPlayDutchReference}
                            onSave={onSave}
                            saving={saving}
                            savedKeys={savedKeys}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {hasWordsVoiceRight ? (
                <div className="min-w-0 rounded-[1.25rem] border border-cyan-100/90 bg-gradient-to-b from-cyan-50/40 to-white px-4 py-4 sm:px-5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-950/85">How you sounded on mic</p>
                  {voiceDims.length > 0 ? (
                    <>
                      <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
                        Session averages from the voice replies we could grade — same numbers as in Session scores above,
                        shown here next to your wording.
                      </p>
                      <div className="mt-3 space-y-2">
                        {voiceDims.map((d) => (
                          <div key={`wv-mic-${d.id}`} className="rounded-lg border border-white/90 bg-white/85 px-3 py-2.5 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[12px] font-semibold text-slate-800">{d.label}</span>
                              <span className="text-[13px] font-bold tabular-nums text-emerald-950">{d.score ?? '—'}</span>
                            </div>
                            <SessionScoreMeter
                              score={d.score}
                              variant="voice"
                              ariaLabel={`${d.label} score out of 100`}
                              className="mt-1.5"
                            />
                            <p className="mt-1.5 text-[11px] leading-snug text-slate-600">{d.verdict}</p>
                            {d.meaning ? (
                              <p className="mt-1 text-[10px] leading-relaxed text-emerald-900/65">{d.meaning}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : audioRecorded > 0 && audioGraded === 0 ? (
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                      We saved {audioRecorded} voice {audioRecorded === 1 ? 'clip' : 'clips'}, but none were clear enough to
                      score. Try holding each reply a little longer, then use Rebuild report from scratch.
                    </p>
                  ) : audioRecorded === 0 ? (
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                      No voice clips were stored for this chat, so there is nothing to listen back to yet. Turn the mic on
                      next time if you want word-level sound feedback alongside your text.
                    </p>
                  ) : (
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                      Voice feedback was limited for this session — the transcript side on the left still reflects what you
                      typed or dictated.
                    </p>
                  )}
                  {debrief.voiceWordCompareItems && debrief.voiceWordCompareItems.length > 0 && sessionId && onPlayDutchReference ? (
                    <div className="mt-4 border-t border-cyan-100/80 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900/85">
                        Words that needed clearer sound
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
                        From your graded voice clips: the syllable we flagged, your full line as heard, and Dutch to aim for
                        (matched to coach or phrasing help when we can).
                      </p>
                      <div className="mt-3 space-y-3">
                        {debrief.voiceWordCompareItems.map((row) => (
                          <LanguageCoachPhrasePracticeCard
                            key={row.id}
                            variant="voice"
                            sessionId={sessionId}
                            scenarioId={scenarioId}
                            level={level}
                            yourLine={row.yourLine}
                            modelDutch={row.modelDutch}
                            weakWord={row.weakWord}
                            tip={row.tip}
                            intent={row.intent}
                            saveKeyBase={`${row.id}-${sessionId}`}
                            playbackTurnId={`lc-vw-play-${sessionId}-${row.id}`}
                            onPlayDutchReference={onPlayDutchReference}
                            onSave={onSave}
                            saving={saving}
                            savedKeys={savedKeys}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {voiceTipsForUi.length > 0 ? (
                    <div className="mt-4 border-t border-cyan-100/80 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900/80">
                        Tweaks from your recordings
                      </p>
                      <div className="mt-2 space-y-2">
                        {voiceTipsForUi.map((line, i) => (
                          <CoachImprovementHint key={`wv-rec-tip-${i}`} text={line} tone="voice" />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <p className="mt-4 text-[12px] leading-relaxed text-slate-500">
                    {debrief.conversationRole === 'coach' ?
                      'For the pedagogy of each guided moment (recast / expansion / clarification, severity, recovery) see How your coach guided you below.'
                    : 'For the pedagogy of each in-chat support moment, see In-conversation support below.'}
                  </p>
                </div>
              ) : null}
            </div>
          </ReportSection>
        ) : null}

        {(guidedFiltered.length > 0 ||
          debrief.conversationRole === 'coach' ||
          debrief.nudgeSessionLog?.length) ? (
          <ReportSection
            title={debrief.conversationRole === 'coach' ? 'How your coach guided you' : 'In-conversation support'}
            subtitle="Pedagogy of each guided moment — the coach style (recast, expansion, clarification, model), how serious it was, and whether you stayed cleaner after. Phrase audio, saves, and tap-a-word live in Phrases to refine above."
            icon={Brain}
            iconBgClass="bg-gradient-to-br from-violet-500 to-fuchsia-600"
          >
            <div className="space-y-6">
              {debrief.nudgeSessionLog && debrief.nudgeSessionLog.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-900/85">Coach moments</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-slate-600">Each card: nudge style, severity, recovery, your line, and the isolated correction.</p>
                    </div>
                  </div>
                  <CoachGuidanceEvidenceList rows={debrief.nudgeSessionLog} />
                </div>
              ) : null}

              {debrief.conversationRole === 'coach' && debrief.coachLearningInsights?.bullets?.length ? (
                <div className="rounded-[1.5rem] border border-indigo-200/85 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/30 p-4 shadow-[0_16px_40px_-28px_rgba(67,56,202,0.35)] sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md ring-1 ring-indigo-900/10">
                      <Brain className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-indigo-950/90">Session readout</p>
                      <p className="text-[12px] text-indigo-900/70">What the coach was working toward, in plain language.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {debrief.coachLearningInsights.bullets.map((line, i) => {
                      const meta = classifyCoachInsightBullet(line)
                      return (
                        <CoachInsightTile
                          key={`cli-${i}`}
                          title={meta.title}
                          body={meta.body}
                          Icon={meta.Icon}
                          iconClass={meta.iconClass}
                        />
                      )
                    })}
                  </div>
                  {debrief.coachLearningInsights.guideActiveSupportNote ? (
                    <div className="mt-4 flex gap-3 rounded-xl border border-violet-200/80 bg-violet-50/50 px-3.5 py-3 sm:px-4">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-200/80 text-violet-900">
                        <Wand2 className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-900/85">Guide while speaking</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-violet-950">{debrief.coachLearningInsights.guideActiveSupportNote}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {coachGuidedLayout.modeIntro || coachGuidedLayout.visibleNudges.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">How support showed up in chat</p>
                  {coachGuidedLayout.modeIntro ? (
                    <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-900/[0.04]">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Coach mode</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-slate-800">{coachGuidedLayout.modeIntro}</p>
                    </div>
                  ) : null}
                  {coachGuidedLayout.visibleNudges.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">In-the-moment nudges</p>
                      {coachGuidedLayout.visibleNudges.map((line, i) => (
                        <div
                          key={`gd-${i}`}
                          className={clsx(
                            'rounded-xl px-4 py-3 text-[14px] leading-relaxed text-slate-800 shadow-sm ring-1 ring-black/[0.03]',
                            coachGuidedLineAccent(line),
                          )}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {coachGuidedLayout.extraNudges.length > 0 ? (
                    <details className="group rounded-xl border border-slate-200/90 bg-slate-50/70 px-4 py-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
                        More nudges from this session
                        <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" aria-hidden />
                      </summary>
                      <div className="mt-3 space-y-2 border-t border-slate-200/80 pt-3">
                        {coachGuidedLayout.extraNudges.map((line, i) => (
                          <div
                            key={`gd-x-${i}`}
                            className={clsx(
                              'rounded-lg px-3 py-2 text-[14px] leading-relaxed text-slate-700',
                              coachGuidedLineAccent(line),
                            )}
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : null}

              {debrief.guideModeReflection ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex gap-3 rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 to-white px-4 py-3.5 shadow-sm">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800">
                      <HelpCircle className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-900/80">Where you asked for more help</p>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-indigo-950/95">
                        {debrief.guideModeReflection.neededMoreSupportWith.replace(
                          /^You needed more support with\s+/i,
                          'Most of the help went to: ',
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white px-4 py-3.5 shadow-sm">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                      <TrendingUp className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-900/80">Bright spot</p>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-emerald-950/95">
                        {debrief.guideModeReflection.strongestRecoveryMoment.replace(/^Your strongest recovery moment was:\s*/i, '')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {debrief.guidanceMomentsUseful && debrief.guidanceMomentsUseful.length > 0 ? (
                <div className="rounded-[1.35rem] border border-emerald-200/85 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/25 p-4 shadow-sm sm:p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                      <Check className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-emerald-950/90">Guidance that paid off</p>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {debrief.guidanceMomentsUseful.map((line, i) => (
                      <li
                        key={`gu-${i}`}
                        className="flex gap-2 rounded-lg border border-emerald-100/90 bg-white/90 px-3 py-2.5 text-[14px] leading-relaxed text-emerald-950/95 shadow-sm"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                        <span className="min-w-0">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {debrief.nudgeSessionLog && debrief.nudgeSessionLog.length > 0 ? (
                <details className="group rounded-[1.25rem] border border-slate-200/90 bg-slate-50/60 p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Compact nudge log</p>
                      <p className="mt-1 text-[13px] text-slate-500">Same events as the cards above, in a dense list (no audio or word tools here).</p>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <ul className="mt-4 space-y-3 border-t border-slate-200/80 pt-4">
                    {debrief.nudgeSessionLog.map((row, i) => (
                      <li key={`nl-${i}`} className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-[13px] leading-relaxed text-slate-700 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink-primary">{row.nudgeType}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{row.severity}</span>
                          {row.learnerRecoveredLater === true ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">Recovered</span>
                          ) : row.learnerRecoveredLater === false ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">Pattern lingered</span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-slate-600">
                          You: “{row.learnerOriginal.slice(0, 100)}{row.learnerOriginal.length > 100 ? '…' : ''}”
                        </p>
                        {row.coachResponseSnippet.trim() ? (
                          <p className="mt-1 text-[12px] text-slate-500">
                            Coach: “{row.coachResponseSnippet.slice(0, 140)}
                            {row.coachResponseSnippet.length > 140 ? '…' : ''}”
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          </ReportSection>
        ) : null}

        <ReportSection
          title="Next practice"
          subtitle="A short plan for your next session, plus phrases and role practice worth saving."
          icon={Lightbulb}
          iconBgClass="bg-gradient-to-br from-indigo-500 to-violet-600"
        >
          <div className="space-y-5">
            <div className="rounded-[1.35rem] border border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/25 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-900/80">What to practice next</p>
              <ul className="mt-3 space-y-3">
                {nextPracticeLines.map((line, i) => (
                  <li key={`nx-${i}`} className="rounded-xl bg-white/90 px-4 py-3 text-[14px] leading-relaxed text-ink-secondary shadow-sm ring-1 ring-indigo-100/70">
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            {debrief.savePracticePrompts.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Save for practice</p>
                {debrief.savePracticePrompts.map((p, i) => {
                  const key = `lc-practice-${i}`
                  return (
                    <div
                      key={key}
                      className="flex flex-col gap-3 rounded-[1.15rem] border border-slate-200/90 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Practice prompt</p>
                        <p className="mt-1 text-[15px] font-medium leading-relaxed text-ink-primary">“{p}”</p>
                      </div>
                      <CoachSaveButton
                        busyKey={key}
                        saving={saving}
                        savedKeys={savedKeys}
                        label="Save"
                        savedLabel="Saved"
                        onClick={() =>
                          onSave({
                            type: 'phrase',
                            title: `Practice: “${p}”`,
                            content: p,
                            saveBusyKey: key,
                            tagCategory: 'coach_follow_up',
                            suggestedTrainingMode: 'speaking',
                          })
                        }
                      />
                    </div>
                  )
                })}
              </div>
            ) : null}

            {debrief.roleSaveablePracticeItems && debrief.roleSaveablePracticeItems.length > 0 ? (
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">More to practice</p>
                {debrief.roleSaveablePracticeItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-[1.15rem] border border-slate-200/90 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-end sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{item.tagCategory.replace(/_/g, ' ')}</p>
                      <p className="mt-1 text-[15px] font-semibold leading-snug text-ink-primary">{item.title}</p>
                      <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-secondary">{item.body}</p>
                    </div>
                    <CoachSaveButton
                      busyKey={`lc-save-${item.id}`}
                      saving={saving}
                      savedKeys={savedKeys}
                      label="Save"
                      savedLabel="Saved"
                      onClick={() =>
                        onSave({
                          type: item.tagCategory === 'phrasing_upgrade' ? 'save_natural_phrasing' : 'phrase',
                          title: item.title,
                          content: item.body,
                          saveBusyKey: `lc-save-${item.id}`,
                          tagCategory: item.tagCategory,
                          suggestedTrainingMode: 'speaking',
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </ReportSection>

        {/**
         * Generic "Keep going" CTA only when no session-derived plan is available (cold
         * starts / very short sessions). When a plan exists, the rich `NextPracticePlanSection`
         * near the top of the page is the sole "start next session" surface — no duplicate.
         */}
        {!debrief.nextPracticePlan ? (
          <div className="rounded-[1.75rem] border border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/45 to-violet-50/35 p-5 shadow-[0_18px_40px_-28px_rgba(49,46,129,0.35)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-900/80">Keep going</p>
                <p className="mt-2 text-[18px] font-semibold tracking-tight text-ink-primary">Take this momentum into your next coach session.</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">
                  Repeat the same focus area while the corrections are still fresh, or run another guided session to reinforce the new phrasing.
                </p>
              </div>
              <Link
                href={APP_LANGUAGE_COACH}
                className="inline-flex min-h-touch shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-900 px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_20px_40px_-24px_rgba(49,46,129,0.75)] hover:bg-indigo-950"
              >
                Continue with Language Coach
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        ) : null}
      </main>

      {onRebuildReport ? (
        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/90 bg-white/96 backdrop-blur-xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-18px_rgba(15,23,42,0.12)]">
          <div className="mx-auto max-w-3xl w-full space-y-1.5">
            <button
              type="button"
              disabled={rebuildingReport}
              onClick={() => void onRebuildReport()}
              className="flex w-full min-h-touch items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw
                className={`h-4 w-4 shrink-0 ${rebuildingReport ? 'motion-safe:animate-spin' : ''}`}
                aria-hidden
              />
              {rebuildingReport ? 'Rebuilding…' : 'Rebuild report from scratch'}
            </button>
            <p className="text-center text-[11px] leading-snug text-slate-500 px-1">
              Pulls your latest saved messages, transcript text, and coach session data from the server, then runs the
              debrief pipeline again. Use this after an app update or if the summary does not match what you remember.
            </p>
          </div>
        </footer>
      ) : null}
    </div>
  )
}

/**
 * "Plan your next session" — rendered only when the debrief includes a session-derived
 * `nextPracticePlan`. The primary CTA deep-links to the Language Coach entry screen with
 * `goal` and `pinnedFocusEnglish` presets so the next conversation lands pre-anchored to
 * this session's focus (the backend seeds it into `learnerPinnedLessonFocusEnglish`, which
 * the coach prompt builder weaves into every reply from turn 1). Scenario cards launch the
 * corresponding Speak Live scenario directly via `speakLiveRunHref`.
 */
function NextPracticePlanSection({
  plan,
}: {
  plan: NonNullable<LanguageCoachDebriefReport['nextPracticePlan']>
}) {
  const focusBrief = plan.coachFocusBrief
  const coachHref = languageCoachStartHref({
    goal: focusBrief.suggestedGoal,
    pinnedFocusEnglish: focusBrief.pinnedFocusEnglish,
  })
  const hasAnchors = focusBrief.vocabAnchors.length > 0 || focusBrief.grammarAnchors.length > 0
  return (
    <section
      aria-labelledby="next-practice-plan-heading"
      className="overflow-hidden rounded-[1.75rem] border border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/45 to-violet-50/35 p-5 shadow-[0_18px_40px_-28px_rgba(49,46,129,0.35)]"
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-900/80">Plan your next session</p>
          <h2
            id="next-practice-plan-heading"
            className="mt-2 text-[20px] font-semibold leading-snug tracking-tight text-ink-primary"
          >
            {plan.headline}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
            Built from this session — not a generic suggestion. Tap “Continue Coach” and the coach will already know what
            to focus on; the scenario cards below give you a different setting for the same focus.
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-200/80 bg-white/85 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-900/75">Coach will focus on</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-primary">{focusBrief.pinnedFocusEnglish}</p>
          {hasAnchors ? (
            <div className="mt-3 space-y-2">
              {focusBrief.grammarAnchors.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Patterns</span>
                  {focusBrief.grammarAnchors.map((g) => (
                    <span
                      key={`g-${g}`}
                      className="rounded-full border border-indigo-200/80 bg-indigo-50/80 px-2.5 py-1 text-[11px] font-medium text-indigo-950"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              ) : null}
              {focusBrief.vocabAnchors.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Words</span>
                  {focusBrief.vocabAnchors.map((w) => (
                    <span
                      key={`w-${w}`}
                      className="rounded-full border border-violet-200/80 bg-violet-50/80 px-2.5 py-1 text-[11px] font-medium text-violet-950"
                    >
                      “{w}”
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <Link
            href={coachHref}
            className="mt-4 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl bg-indigo-900 px-5 py-3.5 text-[14px] font-semibold text-white shadow-[0_20px_40px_-24px_rgba(49,46,129,0.75)] hover:bg-indigo-950 sm:w-auto"
          >
            Continue Coach focused on this
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            You can change the goal, role, or feedback intensity before starting.
          </p>
        </div>

        {plan.scenarioCandidates.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-900/75">
              Or take the same focus into a scenario
            </p>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {plan.scenarioCandidates.map((cand) => (
                <li
                  key={cand.scenarioSlug}
                  className="rounded-2xl border border-slate-200/90 bg-white/90 p-3.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold tracking-tight text-ink-primary">
                        {cand.scenarioTitle}
                      </p>
                      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
                        Speak Live · {cand.level}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-snug text-ink-secondary">{cand.why}</p>
                  <Link
                    href={speakLiveRunHref({ scenarioId: cand.scenarioSlug, level: cand.level })}
                    className="mt-3 inline-flex min-h-touch w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-300/80 bg-white px-4 py-2.5 text-[13px] font-semibold text-indigo-900 transition-colors hover:bg-indigo-50"
                  >
                    Start scenario
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
