'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowLeftRight,
  BookOpen,
  Brain,
  Braces,
  ChevronDown,
  ChevronLeft,
  Columns2,
  Footprints,
  GitBranch,
  Ellipsis,
  Gauge,
  Handshake,
  Hash,
  HelpCircle,
  Layers2,
  ListChecks,
  MapPin,
  LayoutTemplate,
  Leaf,
  Library,
  Lightbulb,
  ListOrdered,
  MessageCircle,
  MessagesSquare,
  Mic2,
  Headphones,
  ShoppingBag,
  Smile,
  PenLine,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  Target,
  Timer,
  Users,
  Waypoints,
  Wind,
  ArrowRight,
} from 'lucide-react'
import { conversationClient } from '@/lib/api/conversationClient'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import type {
  ApiSkillDefinition,
  ApiSkillGroup,
  ApiSkillId,
  ApiSkillMetric,
  ApiSkillRecommendation,
  ApiSkillTrend,
  ApiUserSkillProfile,
  TalkTrainingLoopCard,
} from '@/lib/api/apiTypes'
import {
  APP_LANGUAGE_COACH,
  APP_LISTENING_MODE,
  APP_READ_ALOUD,
  APP_TALK_HUB,
  appTalkTrainingLoopHref,
  readAloudEntryHref,
  speakLiveRunHref,
} from '@/lib/routing/appRoutes'
import { playAppSound } from '@/lib/interaction/appSounds'
import { isReadAloudPersonalizationProfileId } from '@/features/read-aloud/readAloudApi'
import { groupTitle, skillStateLabel, skillTrendLabel } from './skillLabels'
import {
  groupScore,
  groupSkillIdSet,
  pickBestLoopForSkill,
  pickExtremeSkill,
  pickTopLoopForGroup,
} from './skillTrainingLoopPick'
import {
  filterListeningClusterDefinitions,
  listeningBestNextCta,
  listeningClusterDisplayLabel,
} from './listeningSkillSurface'

const GROUP_ORDER: ApiSkillGroup[] = ['speaking', 'conversation', 'structure', 'language', 'listening', 'advanced']

function defsForGroup(defs: ApiSkillDefinition[], g: ApiSkillGroup): ApiSkillDefinition[] {
  return defs.filter((d) => d.group === g)
}

function pickSkillScopedRecommendation(
  profile: ApiUserSkillProfile | null | undefined,
  skillId: ApiSkillId,
): ApiSkillRecommendation | null {
  const r = profile?.recommendations
  if (!r) return null
  const ordered = [r.focusChip, r.primary, r.secondary, r.encouragement]
  for (const rec of ordered) {
    if (!rec) continue
    if (rec.relatedSkillIds?.includes(skillId)) return rec
  }
  return null
}

function pickGroupScopedRecommendation(
  profile: ApiUserSkillProfile | null | undefined,
  groupIds: Set<ApiSkillId>,
): ApiSkillRecommendation | null {
  const r = profile?.recommendations
  if (!r) return null
  const ordered = [r.focusChip, r.primary, r.secondary, r.encouragement]
  for (const rec of ordered) {
    if (!rec) continue
    if (rec.relatedSkillIds?.some((id) => groupIds.has(id))) return rec
  }
  return null
}

function loopTypeShortLabel(loopType: string): string {
  const t = (loopType ?? '').trim()
  const map: Record<string, string> = {
    question_drill: 'Question drill',
    pronunciation_drill: 'Weak sound drill',
    storytelling_drill: 'Storytelling drill',
    weak_words: 'Weak words',
    retry_sentence: 'Sentence retry',
    mini_scenario: 'Mini scenario',
    read_aloud_fix: 'Read aloud fix',
    structure_drill: 'Structure drill',
    listening_burst: 'Listening burst',
    missed_detail_retry: 'Missed detail retry',
    fast_speech_burst: 'Fast speech burst',
    listen_and_reply: 'Listen & reply',
    route_detail_drill: 'Route detail drill',
    number_time_drill: 'Numbers & times',
  }
  return map[t] ?? humanizeTryNextSlug(t.replace(/_/g, '-'))
}

/** Collapsed group: one line — top group loop *or* a profile recommendation tied to this group. */
function SkillGroupPracticeHint({
  topLoop,
  groupRec,
  practiceLevel,
}: {
  topLoop: TalkTrainingLoopCard | null
  groupRec: ApiSkillRecommendation | null
  practiceLevel: 'A1' | 'A2' | 'B1' | 'B2'
}) {
  if (topLoop) {
    const mins = Math.max(0.5, Math.round(topLoop.estimatedMinutes * 10) / 10)
    return (
      <div className="border-t border-slate-100/90 bg-white/55 px-3.5 py-2.5 sm:px-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-800/85">Top loop</p>
        <Link
          href={appTalkTrainingLoopHref(topLoop.id)}
          onClick={() => playAppSound('tap')}
          className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] font-semibold text-violet-950 hover:underline"
        >
          {topLoop.title}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-600" aria-hidden />
        </Link>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {loopTypeShortLabel(topLoop.loopType)} · {mins} min
        </p>
      </div>
    )
  }
  if (groupRec) {
    const cta = launchCtaForSkillRecommendation(groupRec, practiceLevel)
    if (!cta) return null
    return (
      <div className="border-t border-slate-100/90 bg-white/55 px-3.5 py-2.5 sm:px-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-800/85">Best next practice</p>
        <p className="mt-1 text-[13px] font-semibold leading-snug text-slate-900">{groupRec.title}</p>
        {groupRec.subtitle ? (
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-slate-600">{groupRec.subtitle}</p>
        ) : null}
        <Link
          href={cta.href}
          onClick={() => playAppSound('tap')}
          className="mt-2 inline-flex min-h-touch w-full items-center justify-center gap-1.5 rounded-xl border border-violet-200/90 bg-white px-3 py-2 text-[12px] font-semibold text-sky-950 shadow-sm transition hover:bg-violet-50/90"
        >
          {cta.label}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-700" aria-hidden />
        </Link>
      </div>
    )
  }
  return null
}

/** One primary action: skill-scoped recommendation launch, else first mapped try-next route. */
function SkillBestNextPracticeCta({
  def,
  profile,
  practiceLevel,
}: {
  def: ApiSkillDefinition
  profile: ApiUserSkillProfile | null
  practiceLevel: 'A1' | 'A2' | 'B1' | 'B2'
}) {
  const listeningPrimary = def.group === 'listening' ? listeningBestNextCta(def, practiceLevel) : null
  const rec = profile ? pickSkillScopedRecommendation(profile, def.id) : null
  const fromRec = rec ? launchCtaForSkillRecommendation(rec, practiceLevel) : null
  const fallback = buildTryNextActions(def, practiceLevel)[0]
  const primary =
    listeningPrimary ??
    fromRec ??
    (fallback ? { href: fallback.href, label: `Practice · ${fallback.label}` } : null)
  if (!primary) return null
  return (
    <div className="mt-3 rounded-xl border border-violet-100/90 bg-gradient-to-br from-violet-50/50 to-white px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-800/85">Best next practice</p>
      {rec && fromRec && def.group !== 'listening' ? (
        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-slate-600">{rec.subtitle || rec.title}</p>
      ) : null}
      <Link
        href={primary.href}
        onClick={() => playAppSound('tap')}
        className="mt-2 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-[#7c3aed] px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0d5eb0]"
      >
        {primary.label}
        <ArrowRight className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
      </Link>
    </div>
  )
}

/** Single compact training-loop CTA aligned to skill (e.g. question drill). */
function SkillRelatedLoopCta({ loop }: { loop: TalkTrainingLoopCard }) {
  const kind = loopTypeShortLabel(loop.loopType)
  return (
    <div className="mt-2.5 rounded-xl border border-violet-100/90 bg-gradient-to-r from-violet-50/80 to-white px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-800/85">Related drill</p>
      <p className="mt-0.5 text-[12px] font-medium text-slate-700">
        <span className="text-slate-900">{kind}</span>
        <span className="text-slate-400"> · </span>
        <span className="line-clamp-1">{loop.title}</span>
      </p>
      <Link
        href={appTalkTrainingLoopHref(loop.id)}
        onClick={() => playAppSound('tap')}
        className="mt-2 inline-flex min-h-touch w-full items-center justify-center rounded-xl border border-violet-200/80 bg-white px-3 py-2 text-[12px] font-semibold text-violet-950 shadow-sm transition hover:bg-violet-50/90"
      >
        Start
        <ArrowRight className="ml-1 h-3.5 w-3.5 text-violet-700" aria-hidden />
      </Link>
    </div>
  )
}

function dominantTrend(defs: ApiSkillDefinition[], metrics: Partial<Record<ApiSkillId, ApiSkillMetric>>): ApiSkillTrend {
  const trends = defs.map((d) => metrics[d.id]?.trend).filter((t): t is ApiSkillTrend => Boolean(t))
  if (!trends.length) return 'unstable'
  if (trends.includes('down')) return 'down'
  if (trends.includes('up')) return 'up'
  if (trends.every((t) => t === 'flat')) return 'flat'
  return 'unstable'
}

/** Maps backend `iconToken` → Lucide icon for Skills UI. */
const SKILL_TOKEN_ICONS: Record<string, LucideIcon> = {
  'audio-waveform': Activity,
  wind: Wind,
  timer: Timer,
  'help-circle': HelpCircle,
  'message-smile': Smile,
  'git-branch': GitBranch,
  'messages-square': MessagesSquare,
  'refresh-ccw': RefreshCw,
  'arrow-left-right': ArrowLeftRight,
  lightbulb: Lightbulb,
  'book-open': BookOpen,
  'list-ordered': ListOrdered,
  footsteps: Footprints,
  'layout-template': LayoutTemplate,
  'pen-line': PenLine,
  library: Library,
  braces: Braces,
  sparkles: Sparkles,
  leaf: Leaf,
  'message-circle': MessageCircle,
  brain: Brain,
  blend: Layers2,
  split: Columns2,
  handshake: Handshake,
  search: Search,
  'list-checks': ListChecks,
  gauge: Gauge,
  ellipsis: Ellipsis,
  waypoints: Waypoints,
  users: Users,
  hash: Hash,
  'map-pin': MapPin,
  store: Store,
  'shopping-bag': ShoppingBag,
}

const GROUP_ACCENTS: Record<
  ApiSkillGroup,
  { border: string; softBg: string; iconWrap: string; Icon: LucideIcon }
> = {
  speaking: {
    border: 'border-l-violet-500',
    softBg: 'from-violet-50/80 to-white',
    iconWrap: 'bg-violet-100 text-violet-800',
    Icon: Mic2,
  },
  conversation: {
    border: 'border-l-teal-500',
    softBg: 'from-teal-50/70 to-white',
    iconWrap: 'bg-teal-100 text-teal-900',
    Icon: MessagesSquare,
  },
  structure: {
    border: 'border-l-violet-500',
    softBg: 'from-violet-50/70 to-white',
    iconWrap: 'bg-violet-100 text-violet-900',
    Icon: LayoutTemplate,
  },
  language: {
    border: 'border-l-amber-500',
    softBg: 'from-amber-50/60 to-white',
    iconWrap: 'bg-amber-100 text-amber-950',
    Icon: Library,
  },
  listening: {
    border: 'border-l-cyan-500',
    softBg: 'from-cyan-50/70 to-white',
    iconWrap: 'bg-cyan-100 text-cyan-950',
    Icon: Headphones,
  },
  advanced: {
    border: 'border-l-rose-500',
    softBg: 'from-rose-50/60 to-white',
    iconWrap: 'bg-rose-100 text-rose-950',
    Icon: Sparkles,
  },
}

function SkillTokenIcon({ token, className }: { token: string; className?: string }) {
  const Icon = SKILL_TOKEN_ICONS[token] ?? Sparkles
  return <Icon className={className} aria-hidden />
}

function scoreMeterClass(score: number): string {
  if (score >= 72) return 'bg-emerald-500'
  if (score >= 54) return 'bg-violet-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-slate-400'
}

function humanizeTryNextSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/_/g, ' ')
}

function tryNextActionFromScenarioSlug(
  slug: string,
  practiceLevel: 'A1' | 'A2' | 'B1' | 'B2',
  relatedReadAloudProfiles: readonly string[],
): { href: string; label: string } | null {
  const t = slug.trim()
  if (!t) return null
  const norm = t.toLowerCase().replace(/-/g, '_')
  if (norm === 'read_aloud') {
    const p = relatedReadAloudProfiles.find((x) => isReadAloudPersonalizationProfileId(x))
    return {
      href: readAloudEntryHref(p ?? null),
      label: p ? `Read aloud · ${humanizeTryNextSlug(p)}` : 'Read aloud',
    }
  }
  if (norm === 'language_coach') {
    return { href: APP_LANGUAGE_COACH, label: 'Language Coach' }
  }
  return {
    href: speakLiveRunHref({ scenarioId: t, level: practiceLevel }),
    label: humanizeTryNextSlug(t),
  }
}

function buildTryNextActions(
  d: ApiSkillDefinition,
  practiceLevel: 'A1' | 'A2' | 'B1' | 'B2',
): { href: string; label: string }[] {
  const out: { href: string; label: string }[] = []
  const pushUnique = (a: { href: string; label: string } | null) => {
    if (!a) return
    if (out.some((x) => x.href === a.href)) return
    out.push(a)
  }

  for (const slug of d.relatedScenarioSlugs) {
    pushUnique(tryNextActionFromScenarioSlug(slug, practiceLevel, d.relatedReadAloudProfiles))
    if (out.length >= 2) break
  }

  const p0 = d.relatedReadAloudProfiles[0]
  if (p0 && isReadAloudPersonalizationProfileId(p0)) {
    pushUnique({
      href: readAloudEntryHref(p0),
      label: `Read aloud · ${humanizeTryNextSlug(p0)}`,
    })
  }

  if (out.length === 0) {
    pushUnique({ href: APP_LANGUAGE_COACH, label: 'Language Coach' })
  }

  return out.slice(0, 3)
}

export function SkillsPage() {
  const enabled = isFeature1ChatBackendEnabled()
  const q = useQuery({
    queryKey: ['talk', 'skills-profile'],
    queryFn: () => conversationClient.getTalkSkillProfile(),
    enabled,
    staleTime: 20_000,
  })

  const [openGroup, setOpenGroup] = useState<ApiSkillGroup | null>(null)

  const profile = q.data?.profile
  const defs = q.data?.definitions ?? []
  const cold = q.data?.coldStart ?? true
  const trainingLoops = q.data?.activeTrainingLoops ?? []
  const showNumeric = profile?.displayPreferences?.showNumericScores !== false

  useEffect(() => {
    if (!cold && defs.length > 0) {
      setOpenGroup((prev) => prev ?? 'speaking')
    }
  }, [cold, defs.length])

  const byGroup = useMemo(() => {
    const m: Record<ApiSkillGroup, ApiSkillDefinition[]> = {
      speaking: [],
      conversation: [],
      structure: [],
      language: [],
      listening: [],
      advanced: [],
    }
    for (const g of GROUP_ORDER) {
      if (g === 'listening') {
        m[g] = filterListeningClusterDefinitions(defs)
      } else {
        m[g] = defsForGroup(defs, g)
      }
    }
    return m
  }, [defs])

  /** Speak Live run links need a level; skills API does not yet persist learner CEFR here — default A2. */
  const practiceLevel = normalizePracticeLevel(undefined)

  if (!enabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-body text-slate-600">Skills tracking uses the practice backend. Enable the chat backend to see your profile.</p>
        <Link href={APP_TALK_HUB} className="mt-4 inline-flex text-primary-600 font-semibold">
          Back to Talk
        </Link>
      </div>
    )
  }

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-20 rounded bg-slate-200" />
          <div className="h-9 w-56 rounded-lg bg-slate-200" />
          <div className="h-16 rounded-2xl bg-slate-100" />
          <div className="h-28 rounded-2xl bg-slate-100" />
          <div className="h-28 rounded-2xl bg-slate-100" />
        </div>
        <p className="mt-6 text-center text-[13px] text-slate-500">Loading your skills…</p>
      </div>
    )
  }

  if (q.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-body text-red-700">Could not load skills right now.</p>
        <Link href={APP_TALK_HUB} className="mt-4 inline-flex text-primary-600 font-semibold">
          Back to Talk
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-5 sm:px-6">
      <Link
        href={APP_TALK_HUB}
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-[#7c3aed]"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Talk
      </Link>

      <header className="relative mt-6 overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-b from-white via-slate-50/40 to-white px-5 py-6 shadow-sm ring-1 ring-slate-900/[0.03] sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-[#7c3aed]/[0.07] blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-teal-400/10 blur-2xl" aria-hidden />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">FluentCopilot</p>
        <h1 className="relative mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem]">
          Your practice skills
        </h1>
        <p className="relative mt-2.5 max-w-prose text-[15px] leading-relaxed text-slate-600">
          {cold || !profile
            ? 'A softer mirror of how you speak — no grades, no streak pressure. After a few short sessions, trends and focus areas appear here.'
            : 'Strengths first, then one honest focus — built from your real practice, not a test.'}
        </p>
      </header>

      <Link
        href={APP_LISTENING_MODE}
        className="mt-5 flex items-center gap-3 rounded-2xl border border-teal-100/90 bg-gradient-to-r from-teal-50/80 to-white px-4 py-3 text-left shadow-sm ring-1 ring-teal-900/[0.04] transition hover:border-teal-200"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-900">
          <Headphones className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-slate-900">Listening comprehension</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-slate-600">
            Scenario bursts for gist, details, and natural replies — separate from speaking scores here.
          </span>
        </span>
      </Link>

      {cold || !profile ? <ColdStartHint /> : null}

      {!cold && profile ? <SkillsSummary profile={profile} defs={defs} showNumeric={showNumeric} /> : null}

      <section className="mt-8 space-y-3.5" aria-label="Skill groups">
        {GROUP_ORDER.map((g) => (
          <SkillGroupSection
            key={g}
            group={g}
            defs={byGroup[g]}
            metrics={profile?.metrics ?? {}}
            showNumeric={showNumeric}
            cold={cold || !profile}
            open={openGroup === g}
            onToggle={() => setOpenGroup((v) => (v === g ? null : g))}
            practiceLevel={practiceLevel}
            trainingLoops={trainingLoops}
            profile={profile ?? null}
          />
        ))}
      </section>

      {!cold && profile ? <RecommendationsBlock profile={profile} /> : null}
    </div>
  )
}

function ColdStartHint() {
  return (
    <section
      className="mt-6 flex flex-col gap-4 rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/90 via-white to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
      aria-label="Getting started with skills"
    >
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-800">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-slate-900">Warm up your profile</p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
            Try <span className="font-medium text-slate-800">Speak Live</span>,{' '}
            <span className="font-medium text-slate-800">Listening</span>,{' '}
            <span className="font-medium text-slate-800">Read aloud</span>, or a{' '}
            <span className="font-medium text-slate-800">Language Coach</span> chat — each nudges different skills below.
          </p>
        </div>
      </div>
      <Link
        href={APP_TALK_HUB}
        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#7c3aed] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0b5aa8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed]"
      >
        Explore practice
      </Link>
    </section>
  )
}

function SkillsSummary({
  profile,
  defs,
  showNumeric,
}: {
  profile: ApiUserSkillProfile
  defs: ApiSkillDefinition[]
  showNumeric: boolean
}) {
  const defById = useMemo(() => new Map(defs.map((d) => [d.id, d])), [defs])
  const metrics = profile.metrics
  const overall = profile.overallSkillScore
  const strongId = profile.strongestSkills[0]
  const focusId = profile.currentFocusSkills[0] ?? profile.weakestSkills[0]
  const strongDef = strongId ? defById.get(strongId) : undefined
  const focusDef = focusId ? defById.get(focusId) : undefined
  const strong = strongDef?.label ?? null
  const focus = focusDef?.label ?? null
  const coachLine =
    strong && focus && strong !== focus
      ? `You’re strong in ${strong.toLowerCase()}; your next caring focus is ${focus.toLowerCase()}.`
      : focus
        ? `Your next caring focus is ${focus.toLowerCase()} — small reps beat long cramming.`
        : 'Keep going — your profile is still forming across sessions.'
  const showOverallCard = showNumeric && typeof overall === 'number'
  const focusIds = profile.currentFocusSkills.slice(0, 3)

  return (
    <section className="relative mt-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/40 to-white px-5 py-5 shadow-md ring-1 ring-slate-900/[0.04] sm:px-6 sm:py-6">
      <div
        className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-violet-400/[0.12] blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-teal-400/[0.11] blur-2xl"
        aria-hidden
      />
      <div className="pointer-events-none absolute right-1/4 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-[#7c3aed]/[0.05] blur-xl" aria-hidden />

      <div className="relative">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 via-white to-teal-500/10 text-violet-800 shadow-sm ring-1 ring-violet-200/50">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span className="hidden h-px w-5 rounded-full bg-gradient-to-r from-violet-400 to-teal-400 sm:inline" aria-hidden />
              Coach view
            </p>
            <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-slate-800">{coachLine}</p>
            {strongDef && focusDef && strong !== focus ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-200/90 bg-emerald-50/90 py-1 pl-1.5 pr-3 text-[12px] font-semibold text-emerald-950 shadow-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-emerald-800 ring-1 ring-emerald-200/80">
                    <SkillTokenIcon token={strongDef.iconToken} className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700/90">Strong</span>
                    <span className="text-emerald-950">{strongDef.label}</span>
                  </span>
                </span>
                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-200/90 bg-amber-50/90 py-1 pl-1.5 pr-3 text-[12px] font-semibold text-amber-950 shadow-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-amber-900 ring-1 ring-amber-200/80">
                    <SkillTokenIcon token={focusDef.iconToken} className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-amber-800/90">Next</span>
                    <span>{focusDef.label}</span>
                  </span>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={`mt-5 grid gap-4 ${showOverallCard && focusIds.length ? 'md:grid-cols-[minmax(0,11rem)_1fr]' : ''}`}
        >
          {showOverallCard ? (
            <div
              className={`order-2 flex flex-col justify-center rounded-2xl bg-gradient-to-br from-white via-violet-50/50 to-white p-4 shadow-[0_12px_28px_-18px_rgba(14,116,188,0.35)] ring-1 ring-violet-200/70 md:order-1 ${!focusIds.length ? 'md:max-w-xs' : ''}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700/90">Overall</p>
              <p className="mt-1 bg-gradient-to-r from-violet-700 to-[#7c3aed] bg-clip-text text-[2.35rem] font-semibold leading-none tabular-nums tracking-tight text-transparent sm:text-[2.5rem]">
                {overall}
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-violet-100/90">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-[#7c3aed]"
                  style={{ width: `${Math.min(100, Math.max(6, overall))}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-snug text-slate-500">Blended view across skills — not a grade.</p>
            </div>
          ) : null}

          {focusIds.length ? (
            <div
              className={`order-1 rounded-2xl border border-violet-200/55 bg-gradient-to-br from-violet-50/50 via-white to-white px-4 py-3.5 shadow-sm ring-1 ring-violet-900/[0.03] md:order-2 ${!showOverallCard ? 'md:col-span-2' : ''}`}
            >
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-800/85">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-800 ring-1 ring-violet-200/60">
                  <Target className="h-3.5 w-3.5" aria-hidden />
                </span>
                Current focus
              </p>
              <ul className="mt-3 space-y-2">
                {focusIds.map((id) => {
                  const d = defById.get(id)
                  const label = d?.label ?? id
                  const m = metrics[id]
                  const score = typeof m?.score === 'number' ? m.score : null
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-3 rounded-xl border border-white/90 bg-white/85 px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-900 ring-1 ring-violet-100">
                        <SkillTokenIcon token={d?.iconToken ?? 'sparkles'} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold leading-tight text-slate-900">{label}</p>
                        {showNumeric && score != null ? (
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${scoreMeterClass(score)}`}
                                style={{ width: `${Math.min(100, Math.max(4, score))}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#7c3aed]">{score}</span>
                          </div>
                        ) : (
                          <p className="mt-0.5 text-[11px] text-slate-500">Showing up in your next reps</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function SkillGroupSection({
  group,
  defs,
  metrics,
  showNumeric,
  cold,
  open,
  onToggle,
  practiceLevel,
  trainingLoops,
  profile,
}: {
  group: ApiSkillGroup
  defs: ApiSkillDefinition[]
  metrics: Partial<Record<ApiSkillId, ApiSkillMetric>>
  showNumeric: boolean
  cold: boolean
  open: boolean
  onToggle: () => void
  practiceLevel: 'A1' | 'A2' | 'B1' | 'B2'
  trainingLoops: TalkTrainingLoopCard[]
  profile: ApiUserSkillProfile | null
}) {
  const accent = GROUP_ACCENTS[group]
  const GroupIcon = accent.Icon
  const gScore = groupScore(metrics, defs)
  const trend = dominantTrend(defs, metrics)
  const hi = pickExtremeSkill(defs, metrics, 'high')
  const lo = pickExtremeSkill(defs, metrics, 'low')
  const evidenceSum = defs.reduce((n, d) => n + (metrics[d.id]?.evidenceCount ?? 0), 0)
  const trendReadable = skillTrendLabel(trend, evidenceSum, 'medium')
  const scoredCount = defs.filter((d) => typeof metrics[d.id]?.score === 'number').length
  const topGroupLoop = useMemo(
    () => pickTopLoopForGroup(defs, metrics, trainingLoops),
    [defs, metrics, trainingLoops],
  )
  const groupRec = useMemo(
    () =>
      !cold && profile ? pickGroupScopedRecommendation(profile, groupSkillIdSet(defs)) : null,
    [cold, profile, defs],
  )

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/80 border-l-4 ${accent.border} bg-gradient-to-br ${accent.softBg} shadow-sm ring-1 ring-slate-900/[0.02]`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left sm:px-4"
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accent.iconWrap}`}
          aria-hidden
        >
          <GroupIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-slate-900">{groupTitle(group)}</p>
          {group === 'listening' ? (
            <p className="mt-1 text-[11px] leading-snug text-slate-600 text-balance">
              Seven ear skills tracked from Listening bursts and mixed practice — open the group for gist, details,
              speed, and service audio.
            </p>
          ) : null}
          <p className={`text-[12px] leading-snug text-slate-600 ${group === 'listening' ? 'mt-2' : 'mt-0.5'}`}>
            {gScore != null ? (
              <>
                {showNumeric ? (
                  <>
                    Group <span className="font-semibold tabular-nums text-slate-900">{gScore}</span>
                    <span className="mx-1.5 text-slate-400">·</span>
                  </>
                ) : null}
                <span className="text-slate-500">Trend:</span>{' '}
                <span className="font-medium text-slate-800">{trendReadable}</span>
              </>
            ) : cold ? (
              <>
                {scoredCount === 0
                  ? 'We’re ready to track this area — open a skill to see what we watch for.'
                  : 'A bit more practice unlocks a group trend line here.'}
              </>
            ) : (
              'Practice a little more to unlock group trends.'
            )}
          </p>
          {hi && lo && hi.id !== lo.id ? (
            <p className="mt-1.5 text-[11px] text-slate-500">
              Strongest: <span className="font-medium text-slate-700">{hi.label}</span>
              <span className="mx-1.5 text-slate-300">·</span>
              Stretch: <span className="font-medium text-slate-700">{lo.label}</span>
            </p>
          ) : null}
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {!open ? (
        <SkillGroupPracticeHint
          topLoop={topGroupLoop}
          groupRec={!cold && !topGroupLoop ? groupRec : null}
          practiceLevel={practiceLevel}
        />
      ) : null}
      {open ? (
        <div className="space-y-2.5 border-t border-slate-100/90 bg-white/60 px-3 py-3.5 sm:px-4">
          {defs.map((d) => {
            const m = metrics[d.id]
            const bestLoop = pickBestLoopForSkill(d.id, trainingLoops)
            if (!m) {
              return (
                <div
                  key={d.id}
                  className="flex gap-3 rounded-2xl border border-slate-100 bg-white/95 px-3 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02] transition-colors hover:border-slate-200/90"
                >
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.iconWrap}`}
                  >
                    <SkillTokenIcon token={d.iconToken} className="h-[1.125rem] w-[1.125rem]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-900">
                      {group === 'listening' ? listeningClusterDisplayLabel(d.id) : d.label}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-600 line-clamp-2">{d.shortDescription}</p>
                    <div className="mt-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Why it matters</p>
                      <p className="mt-1 text-[12px] leading-snug text-slate-600 line-clamp-3">{d.whyItMatters}</p>
                    </div>
                    <div className="mt-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        {group === 'listening' ? 'Current strength' : 'Current state'}
                      </p>
                      <p className="mt-1 text-[12px] leading-snug text-slate-600">
                        Not enough signal yet — one short session here goes a long way.
                      </p>
                    </div>
                    <SkillBestNextPracticeCta def={d} profile={profile} practiceLevel={practiceLevel} />
                    {bestLoop ? <SkillRelatedLoopCta loop={bestLoop} /> : null}
                  </div>
                </div>
              )
            }
            return (
              <div
                key={d.id}
                className="rounded-2xl border border-slate-100 bg-white/95 px-3 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.02]"
              >
                <div className="flex gap-3">
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.iconWrap}`}
                  >
                    <SkillTokenIcon token={d.iconToken} className="h-[1.125rem] w-[1.125rem]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[13px] font-semibold text-slate-900">
                        {group === 'listening' ? listeningClusterDisplayLabel(d.id) : d.label}
                      </p>
                      {showNumeric ? (
                        <span className="text-[14px] font-bold tabular-nums text-[#7c3aed]">{m.score}</span>
                      ) : null}
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full max-w-full rounded-full ${scoreMeterClass(m.score)}`}
                        style={{ width: `${Math.min(100, Math.max(4, m.score))}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[12px] leading-relaxed text-slate-700 line-clamp-3">{d.shortDescription}</p>
                    <div className="mt-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Why it matters</p>
                      <p className="mt-1 text-[12px] leading-snug text-slate-600 line-clamp-3">{d.whyItMatters}</p>
                    </div>
                    <div className="mt-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        {group === 'listening' ? 'Current strength' : 'Current state'}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-slate-600">
                        {skillStateLabel(m.state)} · {skillTrendLabel(m.trend, m.evidenceCount, m.confidence)}
                        <span className="text-slate-400"> · </span>
                        Evidence <span className="tabular-nums font-medium text-slate-700">{m.evidenceCount}</span>
                      </p>
                    </div>
                    <SkillBestNextPracticeCta def={d} profile={profile} practiceLevel={practiceLevel} />
                    {bestLoop ? <SkillRelatedLoopCta loop={bestLoop} /> : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function normalizePracticeLevel(level: string | undefined): 'A1' | 'A2' | 'B1' | 'B2' {
  const u = (level ?? '').trim().toUpperCase()
  return u === 'A1' || u === 'A2' || u === 'B1' || u === 'B2' ? u : 'A2'
}

/** Deep link for a persisted skill recommendation (matches backend `SkillRecommendationKind`). */
function launchCtaForSkillRecommendation(
  rec: ApiSkillRecommendation,
  practiceLevel: 'A1' | 'A2' | 'B1' | 'B2',
): { href: string; label: string } | null {
  const k = rec.kind.toLowerCase()
  if (k === 'scenario') {
    const sid = rec.targetId?.trim()
    if (!sid) return null
    return {
      href: speakLiveRunHref({ scenarioId: sid, level: practiceLevel }),
      label: 'Start in Speak Live',
    }
  }
  if (k === 'read_aloud') {
    return { href: APP_READ_ALOUD, label: 'Open Read aloud' }
  }
  if (k === 'coach') {
    return { href: APP_LANGUAGE_COACH, label: 'Open Language Coach' }
  }
  if (k === 'encouragement' || k === 'skill_focus') {
    return { href: APP_TALK_HUB, label: 'Explore Talk' }
  }
  return null
}

function RecommendationsBlock({ profile }: { profile: ApiUserSkillProfile }) {
  const r = profile.recommendations
  if (!r) return null
  /** Speak Live run links need a level; skills API does not yet persist learner CEFR here — default A2. */
  const practiceLevel = normalizePracticeLevel(undefined)
  const rows = [
    { key: 'primary', rec: r.primary },
    { key: 'secondary', rec: r.secondary },
    { key: 'encouragement', rec: r.encouragement },
  ].filter((row): row is { key: string; rec: ApiSkillRecommendation } => Boolean(row.rec))

  return (
    <section
      className="mt-10 rounded-3xl border border-violet-200/60 bg-gradient-to-br from-violet-50/50 via-white to-fuchsia-50/20 px-5 py-5 shadow-sm ring-1 ring-violet-900/[0.04]"
      aria-label="Recommendations"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-900/85">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Recommendations
      </p>
      <ul className="mt-3 space-y-2.5">
        {rows.map(({ key, rec }) => {
          const cta = launchCtaForSkillRecommendation(rec, practiceLevel)
          return (
            <li
              key={key}
              className="rounded-2xl border border-white/80 bg-white/90 px-3.5 py-3 shadow-sm ring-1 ring-slate-900/[0.03]"
            >
              <p className="text-[13px] font-bold text-slate-900">{rec.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{rec.subtitle}</p>
              {cta ? (
                <Link
                  href={cta.href}
                  className="mt-3 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:from-violet-500 hover:to-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                >
                  {cta.label}
                  <ArrowRight className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                </Link>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
