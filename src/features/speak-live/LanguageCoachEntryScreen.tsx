'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { playAppSound } from '@/lib/interaction/appSounds'
import { clsx } from 'clsx'
import { APP_SPEAK_LIVE, speakLiveRunHref } from '@/lib/routing/appRoutes'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { conversationClient } from '@/lib/api/conversationClient'
import { LANGUAGE_COACH_SCENARIO_ID } from './speakLiveScenarios'
import type { LanguageCoachConversationRole } from '@/lib/api/languageCoachTypes'
import { LanguageCoachRoleModeSection } from './LanguageCoachRoleModeSection'
import { languageCoachEntrySkillChips } from '@/features/talk/talkSkillSurfaces'
import { TalkSkillSignalRow } from '@/features/talk/TalkSkillSignalRow'

const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const

const GOALS = [
  { id: 'general', label: 'General conversation' },
  { id: 'fluency', label: 'Fluency' },
  { id: 'pronunciation', label: 'Pronunciation' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'confidence', label: 'Confidence' },
  { id: 'storytelling', label: 'Storytelling' },
  { id: 'follow_up_questions', label: 'Follow-up questions' },
] as const

const FEEDBACK = [
  { id: 'subtle_and_end', label: 'Subtle nudges + debrief at end', hint: 'Best default — keeps Dutch feeling natural.' },
  { id: 'at_end_only', label: 'Feedback at end only', hint: 'Minimal steering while you talk.' },
  { id: 'every_turn', label: 'Stronger guidance each turn', hint: 'More micro-corrections; best if you want intensity.' },
] as const

const COACH_STYLES = [
  { id: 'supportive', label: 'Supportive', hint: 'Extra warmth and patience.' },
  { id: 'balanced', label: 'Balanced', hint: 'Clear feedback without overload.' },
  { id: 'challenging', label: 'More challenging', hint: 'Pushes you toward cleaner Dutch.' },
] as const

const PERSONAS = [
  { id: 'local', label: 'Friendly Dutch local', hint: 'Sounds like everyday life in NL.' },
  { id: 'coach', label: 'Patient coach', hint: 'Structured, encouraging guidance.' },
  { id: 'casual', label: 'Casual partner', hint: 'Relaxed back-and-forth.' },
] as const

function PillToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: readonly { id: T; label: string }[]
  onChange: (id: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((g) => {
        const active = value === g.id
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              playAppSound('tap')
              onChange(g.id)
            }}
            className={clsx(
              'rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all duration-200',
              active
                ? 'border-violet-400/90 bg-white text-violet-950 shadow-[0_4px_20px_-8px_rgba(109,40,217,0.35)] ring-1 ring-violet-100'
                : 'border-slate-200/90 bg-white/60 text-slate-600 hover:border-violet-200 hover:bg-white/90',
            )}
          >
            {g.label}
          </button>
        )
      })}
    </div>
  )
}

export function LanguageCoachEntryScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  /**
   * Deep-link presets from the previous session's "Plan your next session" CTA. The producer
   * (`languageCoachNextPracticePlanner.ts`) keeps `lcPinnedFocus` ≤220 chars; we cap to 320
   * here only as a defensive bound against tampered URLs (matches the server-side Zod max).
   */
  const presetGoalParam = searchParams?.get('lcGoal')?.trim() ?? null
  const presetGoal = (() => {
    const allowed = new Set<(typeof GOALS)[number]['id']>(GOALS.map((g) => g.id))
    if (presetGoalParam && (allowed as Set<string>).has(presetGoalParam)) {
      return presetGoalParam as (typeof GOALS)[number]['id']
    }
    return null
  })()
  const presetPinnedFocus = (() => {
    const raw = searchParams?.get('lcPinnedFocus')?.trim() ?? ''
    if (!raw) return null
    return raw.slice(0, 320)
  })()
  const profileRecsQuery = useQuery({
    queryKey: ['talk', 'continue'],
    queryFn: () => conversationClient.getContinueConversation(),
    enabled: isFeature1ChatBackendEnabled(),
    staleTime: 15_000,
  })
  const coachSkillChips = useMemo(() => {
    const lf = profileRecsQuery.data?.learningFocus
    if (!lf || lf.coldStart) return []
    return languageCoachEntrySkillChips(lf.skillsPreview, 2)
  }, [profileRecsQuery.data])

  const coachNudge = useMemo(() => {
    const lf = profileRecsQuery.data?.learningFocus
    if (!lf || lf.coldStart) return null
    if (coachSkillChips.length > 0) return null
    const chip = lf.recommendations?.find((r) => r.type === 'focus_chip')
    const read = lf.recommendations?.find((r) => r.type === 'read_aloud_profile')
    const line = chip?.subtitle?.trim() || read?.subtitle?.trim()
    const skill = lf.skillsPreview?.lines?.[0]?.trim() ?? null
    if (line && skill && line.toLowerCase() !== skill.toLowerCase()) return `${line} · ${skill}`
    return line || skill || null
  }, [profileRecsQuery.data, coachSkillChips.length])

  const [level, setLevel] = useState<(typeof LEVELS)[number]>('A2')
  /**
   * Goal pill seed: prefer the deep-link `lcGoal` preset over the default so the learner
   * lands on the entry screen with the recommended focus already selected. Falls back to
   * `general` when no preset (or an unknown preset) is supplied.
   */
  const [goal, setGoal] = useState<(typeof GOALS)[number]['id']>(presetGoal ?? 'general')
  const [feedback, setFeedback] = useState<(typeof FEEDBACK)[number]['id']>('subtle_and_end')
  const [coachStyle, setCoachStyle] = useState<(typeof COACH_STYLES)[number]['id']>('balanced')
  const [persona, setPersona] = useState<(typeof PERSONAS)[number]['id']>('coach')
  const [conversationRole, setConversationRole] = useState<LanguageCoachConversationRole>('coach')
  const [coachGuideWhileSpeaking, setCoachGuideWhileSpeaking] = useState(false)

  const setRole = useCallback((r: LanguageCoachConversationRole) => {
    setConversationRole(r)
    if (r !== 'coach') setCoachGuideWhileSpeaking(false)
  }, [])

  const runHref = useMemo(() => {
    const base = speakLiveRunHref({ scenarioId: LANGUAGE_COACH_SCENARIO_ID, level })
    const extra = new URLSearchParams({
      lcGoal: goal,
      lcFeedback: feedback,
      lcCoach: coachStyle,
      lcPersona: persona,
      lcRole: conversationRole,
    })
    if (conversationRole === 'coach' && coachGuideWhileSpeaking) {
      extra.set('lcGuide', '1')
    }
    /**
     * Forward the previous-session pinned focus to the run page; `SpeakLiveRunView` reads it
     * and includes it on `LanguageCoachStartBody` for `/conversations/start`. The backend
     * seeds it into `learnerPinnedLessonFocusEnglish` and the coach prompt builder anchors
     * every reply to it.
     */
    if (presetPinnedFocus) {
      extra.set('lcPinnedFocus', presetPinnedFocus)
    }
    return `${base}&${extra.toString()}`
  }, [level, goal, feedback, coachStyle, persona, conversationRole, coachGuideWhileSpeaking, presetPinnedFocus])

  const start = useCallback(() => {
    playAppSound('tap')
    router.push(runHref)
  }, [router, runHref])

  return (
    <div className="relative min-h-[100dvh]">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[#faf8ff]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 100% 55% at 50% -8%, rgba(167, 139, 250, 0.2), transparent 52%), radial-gradient(ellipse 70% 45% at 100% 20%, rgba(251, 207, 232, 0.12), transparent 45%), radial-gradient(ellipse 60% 40% at 0% 80%, rgba(196, 181, 253, 0.14), transparent 50%)',
        }}
        aria-hidden
      />

      <div className="mx-auto flex w-full max-w-md flex-col px-5 pb-36 pt-[max(1rem,env(safe-area-inset-top))] sm:max-w-lg">
        <Link
          href={APP_SPEAK_LIVE}
          className="mb-8 inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-violet-900"
        >
          <span aria-hidden className="text-lg leading-none">
            ←
          </span>
          Speak Live
        </Link>

        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-900 shadow-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-violet-600" aria-hidden />
            Flagship mode
          </div>
          <h1 className="text-[2rem] font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-[2.35rem]">
            Language Coach
          </h1>
          <p className="max-w-[28rem] text-[15px] leading-relaxed text-slate-600">
            Free-flow Dutch with a partner you pick. Role mode is the premium layer — same crisp audio as Speak Live,
            richer personality and pacing.
          </p>
        </header>

        {presetPinnedFocus ? (
          <div className="mt-5 rounded-2xl border border-indigo-300/80 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/70 px-4 py-3 shadow-[0_10px_28px_-22px_rgba(67,56,202,0.35)] backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-900/80">From your last session</p>
            <p className="mt-1.5 text-[13px] leading-snug text-slate-700">
              <span className="font-semibold text-indigo-950">Coach will focus on: </span>
              {presetPinnedFocus}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              {presetGoal ? 'Goal pill below was set from your previous report. ' : ''}You can still change any setting before starting.
            </p>
          </div>
        ) : null}

        {coachSkillChips.length > 0 ? (
          <div className="mt-5 space-y-1.5 rounded-2xl border border-violet-200/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-900/80">For you right now</p>
            <TalkSkillSignalRow chips={coachSkillChips} />
          </div>
        ) : coachNudge ? (
          <p className="mt-5 rounded-2xl border border-violet-200/70 bg-white/80 px-4 py-3 text-[13px] leading-snug text-slate-700 shadow-sm backdrop-blur-sm">
            <span className="font-semibold text-violet-950">From your profile: </span>
            {coachNudge}
          </p>
        ) : null}

        <LanguageCoachRoleModeSection value={conversationRole} onChange={setRole} />

        {conversationRole === 'coach' ? (
          <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-violet-300/40 bg-gradient-to-r from-violet-600/[0.07] via-white to-indigo-600/[0.06] shadow-[0_12px_40px_-28px_rgba(91,33,182,0.35)]">
            <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-900/75">Coach only</p>
                <h3 className="mt-1.5 text-[16px] font-semibold tracking-tight text-slate-900">Guide me while speaking</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                  Your coach can help mid-conversation by simplifying, nudging, and suggesting better phrasing when needed.
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                  Off by default — keeps Dutch natural first; turn on when you want quicker rescue lines.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                <span className="text-[12px] font-medium text-slate-500 sm:order-2">{coachGuideWhileSpeaking ? 'On' : 'Off'}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={coachGuideWhileSpeaking}
                  aria-label="Guide me while speaking"
                  onClick={() => {
                    playAppSound('tap')
                    setCoachGuideWhileSpeaking((v) => !v)
                  }}
                  className={clsx(
                    'relative h-9 w-[3.5rem] shrink-0 rounded-full border-2 transition-colors duration-300',
                    coachGuideWhileSpeaking
                      ? 'border-violet-500 bg-violet-600 shadow-[0_4px_16px_-4px_rgba(109,40,217,0.5)]'
                      : 'border-slate-200 bg-slate-100/90',
                  )}
                >
                  <span
                    className={clsx(
                      'absolute top-0.5 h-7 w-7 rounded-full bg-white shadow-md transition-transform duration-300 ease-out',
                      coachGuideWhileSpeaking ? 'left-[calc(100%-1.875rem)]' : 'left-0.5',
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-10 space-y-10 rounded-[1.75rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_-48px_rgba(49,46,129,0.35)] backdrop-blur-xl sm:p-8">
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Conversation goal</h2>
              <span className="text-[11px] text-slate-400">One tap</span>
            </div>
            <PillToggle value={goal} options={GOALS} onChange={setGoal} />
          </section>

          <section className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Feedback style</h2>
            <div className="space-y-2">
              {FEEDBACK.map((f) => {
                const active = feedback === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      playAppSound('tap')
                      setFeedback(f.id)
                    }}
                    className={clsx(
                      'flex w-full flex-col rounded-2xl border px-4 py-3 text-left transition-all duration-200',
                      active
                        ? 'border-violet-300 bg-violet-50/80 shadow-sm ring-1 ring-violet-100'
                        : 'border-slate-200/80 bg-slate-50/40 hover:border-slate-300 hover:bg-white',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                          active ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white',
                        )}
                      >
                        {active ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : null}
                      </span>
                      <span className="text-[14px] font-semibold text-slate-900">{f.label}</span>
                    </div>
                    <p className="mt-1.5 pl-7 text-[12px] leading-relaxed text-slate-500">{f.hint}</p>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Your level</h2>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((lv) => {
                const active = level === lv
                return (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => {
                      playAppSound('tap')
                      setLevel(lv)
                    }}
                    className={clsx(
                      'min-h-touch min-w-[3rem] rounded-2xl border px-4 text-[14px] font-semibold transition-all duration-200',
                      active
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-950 shadow-sm ring-1 ring-indigo-100'
                        : 'border-slate-200/90 bg-white/70 text-slate-600 hover:border-indigo-200',
                    )}
                  >
                    {lv}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Coach tone</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {COACH_STYLES.map((c) => {
                const active = coachStyle === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      playAppSound('tap')
                      setCoachStyle(c.id)
                    }}
                    className={clsx(
                      'flex min-h-touch w-full flex-col items-start justify-start rounded-2xl border px-4 py-3.5 text-left transition-all duration-200',
                      active
                        ? 'border-indigo-300 bg-gradient-to-b from-white to-indigo-50/90 shadow-sm ring-1 ring-indigo-100'
                        : 'border-slate-200/80 bg-white/50 hover:border-slate-300',
                    )}
                  >
                    <p className="text-[13px] font-semibold leading-tight text-slate-900">{c.label}</p>
                    <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{c.hint}</p>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Persona</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {PERSONAS.map((p) => {
                const active = persona === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      playAppSound('tap')
                      setPersona(p.id)
                    }}
                    className={clsx(
                      'flex min-h-touch w-full flex-col items-start justify-start rounded-2xl border px-4 py-3.5 text-left transition-all duration-200',
                      active
                        ? 'border-violet-300 bg-gradient-to-b from-white to-violet-50/80 shadow-sm ring-1 ring-violet-100'
                        : 'border-slate-200/80 bg-white/50 hover:border-slate-300',
                    )}
                  >
                    <p className="text-[13px] font-semibold leading-tight text-slate-900">{p.label}</p>
                    <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{p.hint}</p>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#faf8ff] via-[#faf8ff]/95 to-transparent pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-10">
          <div className="pointer-events-auto mx-auto max-w-md px-5 sm:max-w-lg">
            <button
              type="button"
              onClick={start}
              className="flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-700 via-violet-700 to-violet-700 px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_20px_50px_-24px_rgba(67,56,202,0.75)] transition-transform active:scale-[0.99] hover:from-indigo-600 hover:via-violet-600 hover:to-violet-600"
            >
              Start your session
              <ArrowRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            </button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
              You can change these anytime before you begin. Audio works like other Speak Live sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
