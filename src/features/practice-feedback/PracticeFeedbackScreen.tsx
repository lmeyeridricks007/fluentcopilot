'use client'

import { useEffect, useRef, useState } from 'react'
import { useCountUp } from '@/hooks/useCountUp'
import { playAppSound } from '@/lib/interaction/appSounds'
import Link from 'next/link'
import { clsx } from 'clsx'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ListOrdered,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { recordLastPracticeWeakSignals } from '@/lib/weakness'
import type { PracticeFeedbackPresenterModel } from '@/lib/practice-feedback/types'
import type { AnalyticsEvent } from '@/lib/analytics'
import { readPracticeCompletionUi } from '@/lib/practice-progress/practiceProgressUiStorage'
import type { PracticeCompletionUiPayload } from '@/lib/practice-progress/practiceProgressUiStorage'
import type { PracticeProgressHighlight } from '@/lib/practice-progress/types'
import { getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import { resolveScenarioVisual } from '@/lib/practice/scenarioImageRegistry'
import { ScenarioSceneVisual } from '@/components/visual/ScenarioSceneVisual'

function bandBadgeClass(band: PracticeFeedbackPresenterModel['proficiencyBand']): string {
  if (band === 'strong') return 'bg-emerald-50 text-emerald-900 border-emerald-200'
  if (band === 'developing') return 'bg-amber-50 text-amber-900 border-amber-200'
  return 'bg-slate-50 text-ink-primary border-slate-200'
}

const COACHING_LOOP_STEPS = [
  'You practiced a real situation',
  'We noted what slipped (weak signals)',
  'Fix mistakes or a targeted scenario closes the gap',
  'Your ability map updates as you repeat',
] as const

export function PracticeFeedbackScreen({
  model,
  xpGained,
  onRestartChat,
}: {
  model: PracticeFeedbackPresenterModel
  /** Shown when side effects ran (optional). */
  xpGained?: number
  /** Optional — e.g. guided scenario: restart the scripted chat from the top. */
  onRestartChat?: () => void
}) {
  const [retentionPayload, setRetentionPayload] = useState<PracticeCompletionUiPayload | null>(null)
  const trackedShown = useRef(false)
  const sectionTracked = useRef({ strength: false, improvement: false })
  const outcomeSoundPlayed = useRef(false)
  const streakSoundPlayed = useRef(false)

  const xpTarget = typeof xpGained === 'number' && xpGained > 0 ? Math.round(xpGained) : 0
  const xpShown = useCountUp(xpTarget, 880)

  const weaknessRecordedKey = useRef<string | null>(null)
  useEffect(() => {
    if (!model.personalizationTags?.length) return
    const key = `${model.scenarioId}:${model.outcome}:${model.personalizationTags.join(',')}`
    if (weaknessRecordedKey.current === key) return
    weaknessRecordedKey.current = key
    recordLastPracticeWeakSignals({
      tags: model.personalizationTags,
      scenarioId: model.scenarioId,
      outcome: model.outcome,
    })
  }, [model.outcome, model.personalizationTags, model.scenarioId])

  useEffect(() => {
    if (trackedShown.current) return
    trackedShown.current = true
    track(ANALYTICS_EVENTS.practice_feedback_shown, {
      scenarioId: model.scenarioId,
      mode: model.mode,
      outcome: model.outcome,
      confidencePercent: model.confidencePercent,
      premiumDepth: model.premiumDepth,
    })
  }, [model])

  useEffect(() => {
    if (outcomeSoundPlayed.current) return
    outcomeSoundPlayed.current = true
    if (model.outcome === 'success') playAppSound('completion_success')
    else if (model.outcome === 'needs_practice') playAppSound('answer_weak')
    else playAppSound('answer_ok')
  }, [model.outcome])

  useEffect(() => {
    if (xpTarget <= 0) return
    const t = window.setTimeout(() => playAppSound('xp_tick'), 280)
    return () => clearTimeout(t)
  }, [xpTarget])

  useEffect(() => {
    const payload = readPracticeCompletionUi()
    if (!payload || payload.scenarioId !== model.scenarioId) return
    setRetentionPayload(payload)
    track(ANALYTICS_EVENTS.practice_reward_shown, {
      scenarioId: model.scenarioId,
      highlightCount: payload.highlights.length,
      xpGained: payload.xpGained,
    })
  }, [model.scenarioId])

  useEffect(() => {
    if (!retentionPayload?.streakMessage || streakSoundPlayed.current) return
    streakSoundPlayed.current = true
    window.setTimeout(() => playAppSound('streak_extend'), 400)
  }, [retentionPayload?.streakMessage])

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (sectionTracked.current.strength) return
      sectionTracked.current.strength = true
      track(ANALYTICS_EVENTS.practice_feedback_strength_viewed, { scenarioId: model.scenarioId })
    }, 500)
    return () => window.clearTimeout(id)
  }, [model.scenarioId])

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (sectionTracked.current.improvement) return
      sectionTracked.current.improvement = true
      track(ANALYTICS_EVENTS.practice_feedback_improvement_viewed, { scenarioId: model.scenarioId })
    }, 900)
    return () => window.clearTimeout(id)
  }, [model.scenarioId])

  const scenarioEntry = getScenarioCatalogEntry(model.scenarioId)
  const scenarioVisual = scenarioEntry ? resolveScenarioVisual(scenarioEntry) : null

  const nextScenarioEntry =
    model.nextPractice.kind === 'scenario' ? getScenarioCatalogEntry(model.nextPractice.targetId) : null
  const nextScenarioVisual = nextScenarioEntry ? resolveScenarioVisual(nextScenarioEntry) : null

  const trackCta = (id: string, href: string) => {
    track(ANALYTICS_EVENTS.practice_reward_cta_clicked, {
      scenarioId: model.scenarioId,
      ctaId: id,
      href,
      hadRetentionHighlights: Boolean(retentionPayload?.highlights.length),
    })
    const map: Record<string, AnalyticsEvent> = {
      retry_scenario: ANALYTICS_EVENTS.retry_scenario_clicked,
      review_from_practice: ANALYTICS_EVENTS.review_from_practice_clicked,
      harder_mode: ANALYTICS_EVENTS.harder_mode_clicked,
      semi_mode: ANALYTICS_EVENTS.harder_mode_clicked,
      next_practice: ANALYTICS_EVENTS.next_practice_clicked,
      guided_next: ANALYTICS_EVENTS.next_practice_clicked,
      library: ANALYTICS_EVENTS.next_practice_clicked,
      skill_track_repair: ANALYTICS_EVENTS.next_practice_clicked,
      skill_track_speaking: ANALYTICS_EVENTS.next_practice_clicked,
      skill_track_listening: ANALYTICS_EVENTS.next_practice_clicked,
      skill_track_writing: ANALYTICS_EVENTS.next_practice_clicked,
      skill_tracks_hub: ANALYTICS_EVENTS.next_practice_clicked,
    }
    const ev = map[id]
    if (ev) track(ev, { scenarioId: model.scenarioId, href, ctaId: id })
  }

  return (
    <div className="pb-8">
      {onRestartChat ? (
        <div className="sticky top-0 z-20 mb-3 flex w-full justify-end border-b border-slate-200/70 bg-surface-elevated/90 px-4 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-surface-elevated/75">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRestartChat}
            className="gap-1.5 text-ink-secondary hover:bg-primary-50 hover:text-primary-900"
          >
            <RotateCcw className="w-4 h-4 shrink-0" aria-hidden />
            Restart chat
          </Button>
        </div>
      ) : null}

      <div className="space-y-5 px-4">
        <Card
          variant="flat"
          padding="none"
          className={clsx(
            'overflow-hidden rounded-2xl border bg-gradient-to-br from-primary-50/35 via-white to-slate-50/40 shadow-[0_14px_44px_-18px_rgba(15,23,42,0.14)] motion-safe:animate-fc-feedback-hero',
            model.outcome === 'success' && 'border-emerald-200/85 ring-1 ring-emerald-100/70',
            model.outcome === 'needs_practice' && 'border-amber-200/85 ring-1 ring-amber-100/65',
            model.outcome === 'partial' && 'border-primary-200/90 ring-1 ring-primary-100/55',
            model.outcome !== 'success' &&
              model.outcome !== 'needs_practice' &&
              model.outcome !== 'partial' &&
              'border-slate-200/90 ring-1 ring-slate-100/80'
          )}
        >
          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {scenarioVisual ? (
                  <div className="relative h-[4.75rem] w-[4.75rem] shrink-0 overflow-hidden rounded-2xl shadow-md ring-2 ring-white">
                    <ScenarioSceneVisual
                      visual={scenarioVisual}
                      variant="square"
                      fillSlot
                      className="rounded-2xl"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  {model.scenarioTitle ? (
                    <p className="text-caption font-bold uppercase tracking-wide text-primary-700/90">
                      {model.scenarioTitle}
                    </p>
                  ) : null}
                  <h2 className="mt-1 text-title font-bold tracking-tight text-ink-primary leading-tight">
                    {model.headline}
                  </h2>
                  <p className="mt-2 text-body text-ink-secondary leading-relaxed">{model.subline}</p>
                </div>
              </div>
              <div
                className={clsx(
                  'flex shrink-0 flex-col items-center justify-center rounded-2xl border px-4 py-3 text-center shadow-sm sm:min-w-[5.5rem]',
                  bandBadgeClass(model.proficiencyBand)
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-secondary/90">Confidence</p>
                <p className="mt-1 text-2xl font-bold tabular-nums leading-none tracking-tight">
                  {model.confidencePercent}%
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-white/55 px-3 py-2.5 ring-1 ring-slate-200/50 backdrop-blur-[2px]">
              <p className="text-caption text-ink-secondary flex items-start gap-2 leading-snug">
                <TrendingUp className="mt-0.5 w-4 h-4 shrink-0 text-primary-600" aria-hidden />
                <span>{model.confidenceLabel}</span>
              </p>
              {xpTarget > 0 ? (
                <p className="text-caption mt-2 border-t border-slate-200/60 pt-2 font-medium text-primary-800">
                  +<span className="tabular-nums font-bold">{xpShown}</span> XP earned
                  {retentionPayload?.streakMessage
                    ? ` · ${retentionPayload.streakMessage}`
                    : ' · tied to your habit & missions'}
                </p>
              ) : null}
            </div>
          </div>

          {retentionPayload && retentionPayload.highlights.length > 0 ? (
            <ul
              className="border-t border-slate-200/60 bg-slate-50/40 px-4 py-3 sm:px-5"
              aria-label="Progress updates"
            >
              {retentionPayload.highlights.map((h: PracticeProgressHighlight, i: number) => (
                <li
                  key={h.id}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className={clsx(
                    'motion-safe:animate-fc-message-in rounded-xl border px-3 py-2.5 text-body-sm first:mt-0 mt-2 shadow-sm',
                    h.tone === 'success' && 'border-emerald-200/80 bg-emerald-50/70 text-emerald-950',
                    h.tone === 'primary' && 'border-primary-200/80 bg-primary-50/50 text-ink-primary',
                    h.tone !== 'success' &&
                      h.tone !== 'primary' &&
                      'border-slate-200/80 bg-white/80 text-ink-secondary'
                  )}
                >
                  <span className="font-semibold text-ink-primary">{h.title}</span>
                  <span className="mt-0.5 block text-caption leading-snug">{h.body}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <section
          className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm sm:p-5"
          aria-labelledby="coaching-loop-heading"
        >
          <div className="flex items-center gap-2.5" id="coaching-loop-heading">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-800 shadow-sm ring-1 ring-primary-200/40">
              <ListOrdered className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-body-sm font-bold text-ink-primary">Your coaching loop</p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {COACHING_LOOP_STEPS.map((text, i) => (
              <div
                key={text}
                className="flex gap-2.5 rounded-xl bg-white/85 px-3 py-2.5 ring-1 ring-slate-200/55 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white shadow-sm">
                  {i + 1}
                </span>
                <p className="text-caption leading-snug text-ink-secondary">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-2xl border border-emerald-200/35 bg-gradient-to-b from-emerald-50/45 to-white p-4 shadow-sm sm:p-5"
          aria-labelledby="strengths-heading"
        >
          <p id="strengths-heading" className="flex items-center gap-2 text-body-sm font-bold text-emerald-950">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            What went well
          </p>
          <ul className="mt-3 space-y-2">
            {model.strengths.map((b) => (
              <li
                key={b}
                className="flex gap-3 rounded-xl bg-white/75 px-3 py-2.5 text-body-sm text-ink-secondary leading-snug ring-1 ring-emerald-100/70"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" />
                <span className="min-w-0 flex-1">{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="rounded-2xl border border-amber-200/35 bg-gradient-to-b from-amber-50/35 to-white p-4 shadow-sm sm:p-5"
          aria-labelledby="improve-heading"
        >
          <p id="improve-heading" className="text-body-sm font-bold text-ink-primary flex items-center gap-2">
            <Target className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            What to work on next
          </p>
          <ul className="mt-3 space-y-2">
            {model.improvements.map((b) => (
              <li
                key={b}
                className="flex gap-3 rounded-xl bg-white/75 px-3 py-2.5 text-body-sm text-ink-secondary leading-snug ring-1 ring-amber-100/70"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.2)]" />
                <span className="min-w-0 flex-1">{b}</span>
              </li>
            ))}
          </ul>
        </section>

        {(model.grammarNotes.length > 0 || model.wordOrderNotes.length > 0) && (
          <section
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"
            aria-labelledby="language-notes-heading"
          >
            <p id="language-notes-heading" className="text-body-sm font-bold text-ink-primary flex items-center gap-2">
              <Wrench className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
              Language notes
            </p>
            <div className="mt-3 space-y-3 text-body-sm text-ink-secondary">
              {model.wordOrderNotes.map((w) => (
                <div
                  key={w.id}
                  className="rounded-xl border border-slate-200/60 bg-slate-50/50 px-3 py-2.5 ring-1 ring-slate-100/80"
                >
                  <p className="text-caption font-bold uppercase tracking-wide text-ink-primary">Word order</p>
                  <p className="mt-1 leading-relaxed">{w.message}</p>
                  {w.modelSentence ? (
                    <p className="text-caption mt-1.5 font-medium text-primary-800">{w.modelSentence}</p>
                  ) : null}
                </div>
              ))}
              {model.grammarNotes.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl border border-slate-200/60 bg-slate-50/50 px-3 py-2.5 ring-1 ring-slate-100/80"
                >
                  <p className="leading-relaxed">{g.message}</p>
                  {g.quickFix ? <p className="text-caption mt-1.5 font-medium text-ink-primary">{g.quickFix}</p> : null}
                </div>
              ))}
            </div>
          </section>
        )}

        {model.phrasingUpgrades.length > 0 && (
          <section
            className="rounded-2xl border border-primary-200/50 bg-gradient-to-b from-primary-50/40 to-white p-4 shadow-sm sm:p-5"
            onPointerEnter={() =>
              track(ANALYTICS_EVENTS.phrasing_upgrade_viewed, { scenarioId: model.scenarioId })
            }
            aria-labelledby="phrasing-heading"
          >
            <p id="phrasing-heading" className="text-body-sm font-bold text-ink-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
              {model.premiumDepth ? 'More natural Dutch' : 'Phrase polish'}
            </p>
            <ul className="mt-3 space-y-3">
              {model.phrasingUpgrades.map((p, i) => (
                <li
                  key={i}
                  className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.08)] ring-1 ring-slate-100/60"
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-2">
                    <div className="min-w-0 rounded-xl bg-slate-50/90 px-3 py-2 ring-1 ring-slate-200/50">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">You said</p>
                      <p className="mt-1 text-body-sm font-semibold leading-snug text-ink-primary">{p.learnerSaid}</p>
                    </div>
                    <div className="flex justify-center sm:px-1">
                      <ArrowRight
                        className="h-5 w-5 shrink-0 text-primary-300 sm:rotate-0 rotate-90"
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0 rounded-xl bg-primary-50/50 px-3 py-2 ring-1 ring-primary-200/40">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-primary-800/90">Try</p>
                      <p className="mt-1 text-body-sm font-semibold leading-snug text-primary-950">{p.betterNl}</p>
                    </div>
                  </div>
                  {p.why && model.premiumDepth ? (
                    <p className="text-caption mt-3 border-t border-slate-200/60 pt-2.5 leading-snug text-ink-secondary">
                      {p.why}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        {model.vocabSuggestions.length > 0 && (
          <section
            className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/40 p-4 shadow-sm sm:p-5"
            aria-labelledby="vocab-heading"
          >
            <p id="vocab-heading" className="text-body-sm font-bold text-ink-primary flex items-center gap-2">
              <BookOpen className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
              Vocab to anchor
            </p>
            <ul className="mt-3 space-y-2">
              {model.vocabSuggestions.map((v, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-slate-200/55 bg-white/90 px-3 py-2.5 ring-1 ring-slate-100/70"
                >
                  <span className="font-semibold text-ink-primary">{v.nl}</span>
                  {v.en ? <span className="mt-0.5 block text-caption text-ink-secondary">{v.en}</span> : null}
                  {v.note && model.premiumDepth ? (
                    <span className="mt-1 block text-caption text-ink-tertiary">{v.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          className="rounded-2xl border-l-[4px] border-l-primary-500 bg-gradient-to-br from-slate-50/90 via-white to-primary-50/25 p-4 shadow-md ring-1 ring-slate-200/55 sm:p-5"
          aria-labelledby="next-step-heading"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            {nextScenarioVisual ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl shadow-md ring-2 ring-white">
                <ScenarioSceneVisual
                  visual={nextScenarioVisual}
                  variant="square"
                  fillSlot
                  className="rounded-2xl"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <p id="next-step-heading" className="text-body-sm font-bold text-ink-primary">
                Recommended next step
              </p>
              {nextScenarioEntry && model.nextPractice.kind === 'scenario' ? (
                <p className="mt-0.5 text-caption font-bold uppercase tracking-wide text-primary-800">
                  {nextScenarioEntry.title}
                </p>
              ) : null}
              {model.nextPractice.rationale ? (
                <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">{model.nextPractice.rationale}</p>
              ) : null}
              <p className="mt-2 text-caption leading-snug text-ink-tertiary">{model.reviewTeaser}</p>
            </div>
          </div>
        </section>

        <div className="border-t border-slate-200/80 pt-5">
          <p className="mb-2 text-center text-caption font-bold uppercase tracking-wide text-ink-tertiary">
            Continue
          </p>
          <div className="flex flex-col gap-2.5">
            {model.ctas.map((c) => (
              <Link
                key={c.id + c.href}
                href={c.href}
                onClick={() => trackCta(c.id, c.href)}
                className={clsx(
                  'inline-flex min-h-touch w-full items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-body font-semibold transition-[color,background-color,transform,box-shadow] duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 active:scale-[0.99]',
                  c.variant === 'primary' &&
                    'bg-primary-600 text-white shadow-[0_6px_20px_-8px_rgba(124,58,237,0.45)] hover:bg-primary-700',
                  c.variant === 'secondary' &&
                    'border border-slate-200/90 bg-surface-muted text-ink-primary hover:bg-slate-200/70',
                  c.variant === 'ghost' && 'text-primary-700 hover:bg-primary-50'
                )}
              >
                {c.label}
                <ChevronRight className="h-4 w-4 opacity-80" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
