'use client'

import Link from 'next/link'
import { Clock3, Mic2, RotateCcw } from 'lucide-react'
import type { ConversationRecapViewModel } from '@/features/feature1-chat/types'
import { APP_TALK_HUB, appSpeakLiveSessionEvaluation } from '@/lib/routing/appRoutes'
import { speakLiveRunHref } from '@/lib/routing/appRoutes'
import { normalizeGoalPhraseForSummaryLine } from '@/lib/speak-live/normalizeGoalPhraseForSummary'

export function SpeakLiveSessionRecapView({
  model,
  scenarioTitle,
  scenarioId,
  level,
  threadId,
  turnCount,
  createdAt,
  updatedAt,
}: {
  model: ConversationRecapViewModel
  scenarioTitle: string
  scenarioId: string
  level: string
  threadId?: string
  turnCount?: number
  createdAt?: string | null
  updatedAt?: string | null
}) {
  const practiceAgainHref = speakLiveRunHref({ scenarioId, level })
  const stepGapHints = parsePrefixedUpgradeLines(model.dutchUpgradeLines, 'step_gap_hint:')
  const storyPartHints = parsePrefixedUpgradeLines(model.dutchUpgradeLines, 'story_part_hint:')
  const discussionPointHints = parsePrefixedUpgradeLines(model.dutchUpgradeLines, 'discussion_point_hint:')
  const coachingHookLines = parsePrefixedUpgradeLines(model.dutchUpgradeLines, 'coaching_hook:')
  const recapLine = buildRecapLine(model, scenarioId)
  const worked = buildWorkedBullets(model, scenarioId).slice(0, 2)
  const nextTime = buildNextTimeBullets(model, scenarioId).slice(0, 2)
  const bestMove = buildBestNextMove(model, scenarioId)
  const durationLabel = formatSessionDuration(createdAt, updatedAt)
  const turnLabel = turnCount && turnCount > 0 ? `${turnCount} ${turnCount === 1 ? 'turn' : 'turns'}` : null

  return (
    <div className="min-h-[100dvh] bg-[#f7f7f3] text-ink-primary flex flex-col">
      <header className="shrink-0 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <div className="mx-auto max-w-lg rounded-[32px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.34)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Session close</p>
          <h1 className="mt-2 text-[30px] font-semibold tracking-tight leading-[1.02]">{scenarioTitle}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-ink-secondary">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
              <Mic2 className="h-3.5 w-3.5" />
              Speaking
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
              Level {level}
            </span>
            {durationLabel ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {durationLabel}
              </span>
            ) : null}
            {turnLabel ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                {turnLabel}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-40">
        <div className="mx-auto max-w-lg space-y-4">
          {recapLine ? (
            <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.32)]">
              <p className="text-[16px] leading-relaxed text-ink-primary">{recapLine}</p>
            </section>
          ) : null}

          {scenarioId === 'explaining_something' && (stepGapHints.length > 0 || coachingHookLines.length > 0) ? (
            <section className="rounded-[28px] border border-violet-200/85 bg-violet-50/50 px-5 py-5 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.28)]">
              {stepGapHints.length > 0 ? (
                <div className="space-y-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-900">Step breakdown</h2>
                  <p className="text-[12px] text-ink-secondary leading-relaxed">
                    These checklist lines were still thin — treat each as a step you can spell out next time.
                  </p>
                  <ul className="mt-2 space-y-2">
                    {stepGapHints.map((line, i) => (
                      <li key={`gap-${i}`} className="flex gap-2 text-[13px] text-ink-primary leading-relaxed">
                        <span className="text-violet-500 mt-0.5 font-bold">·</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {coachingHookLines.length > 0 ? (
                <div className={stepGapHints.length > 0 ? 'mt-4 space-y-2' : 'space-y-2'}>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-900">Drill ideas</h2>
                  <ul className="mt-2 space-y-2">
                    {coachingHookLines.map((line, i) => (
                      <li key={`hook-${i}`} className="flex gap-2 text-[13px] text-ink-primary leading-relaxed">
                        <span className="text-violet-500 mt-0.5 font-bold">·</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
          {scenarioId === 'storytelling' && (storyPartHints.length > 0 || coachingHookLines.length > 0) ? (
            <section className="rounded-[28px] border border-violet-200/85 bg-violet-50/50 px-5 py-5 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.28)]">
              {storyPartHints.length > 0 ? (
                <div className="space-y-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-900">Story breakdown</h2>
                  <p className="text-[12px] text-ink-secondary leading-relaxed">
                    These parts of your arc were thin — add a clearer opening, more middle moments, or a stronger ending
                    next time.
                  </p>
                  <ul className="mt-2 space-y-2">
                    {storyPartHints.map((line, i) => (
                      <li key={`story-${i}`} className="flex gap-2 text-[13px] text-ink-primary leading-relaxed">
                        <span className="text-violet-500 mt-0.5 font-bold">·</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {coachingHookLines.length > 0 ? (
                <div className={storyPartHints.length > 0 ? 'mt-4 space-y-2' : 'space-y-2'}>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-900">Drill ideas</h2>
                  <ul className="mt-2 space-y-2">
                    {coachingHookLines.map((line, i) => (
                      <li key={`st-hook-${i}`} className="flex gap-2 text-[13px] text-ink-primary leading-relaxed">
                        <span className="text-violet-500 mt-0.5 font-bold">·</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
          {scenarioId === 'opinions_discussions' && (discussionPointHints.length > 0 || coachingHookLines.length > 0) ? (
            <section className="rounded-[28px] border border-amber-200/85 bg-amber-50/50 px-5 py-5 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.28)]">
              {discussionPointHints.length > 0 ? (
                <div className="space-y-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-950/90">Discussion checklist</h2>
                  <p className="text-[12px] text-ink-secondary leading-relaxed">
                    These discussion moves were thin — next time make your stance explicit and add a short reason.
                  </p>
                  <ul className="mt-2 space-y-2">
                    {discussionPointHints.map((line, i) => (
                      <li key={`od-${i}`} className="flex gap-2 text-[13px] text-ink-primary leading-relaxed">
                        <span className="text-amber-600 mt-0.5 font-bold">·</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {coachingHookLines.length > 0 ? (
                <div className={discussionPointHints.length > 0 ? 'mt-4 space-y-2' : 'space-y-2'}>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-950/90">Drill ideas</h2>
                  <ul className="mt-2 space-y-2">
                    {coachingHookLines.map((line, i) => (
                      <li key={`od-hook-${i}`} className="flex gap-2 text-[13px] text-ink-primary leading-relaxed">
                        <span className="text-amber-600 mt-0.5 font-bold">·</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {(worked.length > 0 || nextTime.length > 0) ? (
            <section className="grid gap-3">
              {worked.length > 0 ? (
                <section className="rounded-[24px] border border-emerald-200/90 bg-emerald-50/70 px-4 py-4">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-900">What you did well</h2>
                  <ul className="mt-3 space-y-2">
                    {worked.map((line, i) => (
                      <li key={i} className="flex gap-2 text-[13px] text-ink-primary leading-relaxed">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {nextTime.length > 0 ? (
                <section className="rounded-[24px] border border-amber-200/90 bg-amber-50/70 px-4 py-4">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-900">What to improve next</h2>
                  <ul className="mt-3 space-y-2">
                    {nextTime.map((line, i) => (
                      <li key={i} className="flex gap-2 text-[13px] text-ink-primary leading-relaxed">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </section>
          ) : null}

          {bestMove ? (
            <section className="rounded-[30px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_22px_46px_-34px_rgba(15,23,42,0.34)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Best next step</p>
              <p className="mt-2 text-[17px] font-semibold tracking-tight text-ink-primary leading-snug">{bestMove}</p>
            </section>
          ) : null}
        </div>
      </main>

      <footer className="shrink-0 fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-white/96 backdrop-blur-xl px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_20px_-16px_rgb(0_0_0/0.14)]">
        <div className="max-w-lg mx-auto w-full flex flex-col gap-2.5">
          <Link
            href={practiceAgainHref}
            className="min-h-touch flex items-center justify-center gap-2 rounded-2xl bg-slate-950 text-white text-[13px] font-semibold px-4 py-3.5"
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
            Repeat this scenario
          </Link>
          {threadId ? (
            <Link
              href={`${appSpeakLiveSessionEvaluation(threadId)}?${new URLSearchParams({ scenarioId, level }).toString()}`}
              className="min-h-touch flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-[13px] font-semibold text-ink-primary px-4 py-3.5 hover:bg-slate-50"
            >
              Open full report
            </Link>
          ) : null}
          <Link href={APP_TALK_HUB} className="text-center text-[11px] text-ink-tertiary py-1 hover:text-ink-secondary">
            Back to Talk
          </Link>
        </div>
      </footer>
    </div>
  )
}

// ─── Helpers: derive sharp recap copy from available data ────────────────

function parsePrefixedUpgradeLines(lines: string[] | undefined, prefix: string): string[] {
  return (lines ?? [])
    .filter((l): l is string => typeof l === 'string' && l.startsWith(prefix))
    .map((l) => l.slice(prefix.length).trim())
    .filter(Boolean)
}

function buildRecapLine(m: ConversationRecapViewModel, scenarioId: string): string {
  const asked = m.youAskedAbout ?? []
  const missing = m.youCouldStillAdd ?? []
  if (scenarioId === 'explaining_something' && missing.length > 0) {
    const focus = missing[0].trim()
    return focus
      ? `Next run: spell out the flow more explicitly — especially “${focus.slice(0, 120)}${focus.length > 120 ? '…' : ''}”.`
      : ''
  }
  if (scenarioId === 'storytelling' && missing.length > 0) {
    const focus = missing[0].trim()
    return focus
      ? `Next run: shape your story more clearly — especially “${focus.slice(0, 120)}${focus.length > 120 ? '…' : ''}”.`
      : ''
  }
  if (scenarioId === 'opinions_discussions' && missing.length > 0) {
    const focus = missing[0].trim()
    return focus
      ? `Next run: make your opinion and reasoning clearer — especially “${focus.slice(0, 120)}${focus.length > 120 ? '…' : ''}”.`
      : ''
  }
  if (asked.length > 0 && missing.length > 0) {
    const did = asked.slice(0, 2).map(a => a.label.toLowerCase()).join(' and ')
    const gap = missing.slice(0, 1).map(l => l.toLowerCase()).join('')
    return `You handled ${did} clearly. Next, add the ${gap} question.`
  }
  if (asked.length > 0) {
    const did = asked.slice(0, 2).map(a => a.label.toLowerCase()).join(' and ')
    return `You handled ${did} well in this run.`
  }
  if (m.handledWell.length > 0) {
    return m.handledWell[0]
  }
  return ''
}

function buildWorkedBullets(m: ConversationRecapViewModel, scenarioId: string): string[] {
  const bullets: string[] = []
  const asked = m.youAskedAbout ?? []

  for (const goal of asked) {
    if (bullets.length >= 2) break
    const line = `You covered ${normalizeGoalPhraseForSummaryLine(goal.label)}.`
    bullets.push(line)
  }

  if (bullets.length < 2) {
    for (const line of m.handledWell) {
      if (bullets.length >= 2) break
      const trimmed = line.trim()
      if (trimmed && !bullets.includes(trimmed)) bullets.push(trimmed)
    }
  }

  if (
    (scenarioId === 'explaining_something' || scenarioId === 'storytelling' || scenarioId === 'opinions_discussions') &&
    bullets.length === 0 &&
    m.handledWell.length > 0
  ) {
    return m.handledWell.slice(0, 2).map((s) => s.trim()).filter(Boolean)
  }

  return bullets
}

function buildNextTimeBullets(m: ConversationRecapViewModel, scenarioId: string): string[] {
  const bullets: string[] = []
  const missing = m.youCouldStillAdd ?? []

  for (const label of missing) {
    if (bullets.length >= 2) break
    if (scenarioId === 'explaining_something') {
      const t = label.trim()
      if (t) bullets.push(`Strengthen this part of your explanation: ${t.charAt(0).toLowerCase()}${t.slice(1)}`)
    } else if (scenarioId === 'storytelling') {
      const t = label.trim()
      if (t) bullets.push(`Strengthen this part of your story: ${t.charAt(0).toLowerCase()}${t.slice(1)}`)
    } else {
      bullets.push(`Ask the ${label.toLowerCase()} directly.`)
    }
  }

  if (bullets.length < 2) {
    for (const line of m.whatToImprove) {
      if (bullets.length >= 2) break
      const trimmed = line.trim()
      if (trimmed && !bullets.some(b => b.includes(trimmed))) bullets.push(trimmed)
    }
  }

  return bullets
}

function buildBestNextMove(m: ConversationRecapViewModel, scenarioId: string): string {
  const tryNext = (m.tryNext ?? m.nextStep ?? '').trim()
  if (tryNext) return tryNext
  const missing = m.youCouldStillAdd ?? []
  if (missing.length > 0) {
    if (scenarioId === 'explaining_something') {
      const hint = missing[0].trim()
      const short = hint.length > 100 ? `${hint.slice(0, 100)}…` : hint
      return `Repeat with 4–5 short sentences (eerst → dan → daarna) and make this angle explicit: ${short.toLowerCase()}`
    }
    if (scenarioId === 'storytelling') {
      const hint = missing[0].trim()
      const short = hint.length > 100 ? `${hint.slice(0, 100)}…` : hint
      return `Repeat with a clear begin–midden–slot and spell this out more: ${short.toLowerCase()}`
    }
    return `Repeat this scenario and ask the ${missing[0].toLowerCase()} question early.`
  }
  return 'Repeat this scenario and keep the same wording, but make the delivery cleaner.'
}

function formatSessionDuration(createdAt?: string | null, updatedAt?: string | null): string | null {
  if (!createdAt || !updatedAt) return null
  const start = new Date(createdAt).getTime()
  const end = new Date(updatedAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  const totalSec = Math.round((end - start) / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min <= 0) return `${sec}s`
  if (sec === 0) return `${min}m`
  return `${min}m ${sec}s`
}
