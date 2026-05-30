'use client'

import { clsx } from 'clsx'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { playAppSound } from '@/lib/interaction/appSounds'
import { parseSpeakLiveSituationCard } from './parseSpeakLiveSituationCard'

const EXPECTATION_LINE = 'Your turn: short, natural Dutch that fits the moment.'

const EXPECTATION_COMPACT = 'Your turn — keep it natural and in Dutch.'

export type LiveSituationCardExpectation = 'default' | 'compact' | 'none'

export function LiveSituationCard({
  summary,
  expectation = 'default',
}: {
  summary: string
  expectation?: LiveSituationCardExpectation
}) {
  const trimmed = summary.trim()
  const parsed = useMemo(() => parseSpeakLiveSituationCard(trimmed), [trimmed])
  /** Long plain summary: line-clamp until user taps “Read full situation”. */
  const [plainTextExpanded, setPlainTextExpanded] = useState(false)
  /** Whole card collapsed to a slim bar for more vertical space. */
  const [situationMinimized, setSituationMinimized] = useState(false)

  useEffect(() => {
    setPlainTextExpanded(false)
    setSituationMinimized(false)
  }, [trimmed])

  if (!trimmed) return null

  const plainNeedsExpand = parsed.kind === 'plain' && trimmed.length > 140

  const toggleMinimized = () => {
    playAppSound('tap')
    setSituationMinimized((m) => {
      const next = !m
      if (!m) setPlainTextExpanded(false)
      return next
    })
  }

  return (
    <article
      className={clsx(
        'rounded-xl border border-slate-200/70 bg-gradient-to-b from-white/95 via-slate-50/35 to-slate-50/80 px-3 shadow-sm ring-1 ring-slate-100/60',
        situationMinimized ? 'py-2' : 'py-2.5'
      )}
    >
      <button
        type="button"
        onClick={toggleMinimized}
        className="flex w-full min-h-touch items-center justify-between gap-2 rounded-xl text-left text-ink-primary hover:bg-slate-100/50 -mx-0.5 px-0.5"
        aria-expanded={!situationMinimized}
        aria-controls="live-situation-card-body"
        aria-label={situationMinimized ? 'Expand scene details' : 'Minimize scene details'}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Your scene</span>
          {situationMinimized ? (
            <span className="mt-0.5 block text-[11px] font-medium text-ink-secondary">
              Tap to expand — more space for the conversation
            </span>
          ) : null}
        </span>
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white/90 text-ink-secondary"
          aria-hidden
        >
          {situationMinimized ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </span>
      </button>

      <div id="live-situation-card-body" hidden={situationMinimized}>
        {parsed.kind === 'plain' ? (
            <div className="mt-1.5">
              <p
                className={clsx(
                  'text-body-sm font-medium text-ink-primary leading-relaxed',
                  !plainTextExpanded && plainNeedsExpand && 'line-clamp-4'
                )}
              >
                {parsed.text}
              </p>
              {plainNeedsExpand ? (
                <button
                  type="button"
                  onClick={() => {
                    playAppSound('tap')
                    setPlainTextExpanded((v) => !v)
                  }}
                  className="mt-2 text-caption font-bold text-primary-700 hover:text-primary-900 underline-offset-2 hover:underline"
                >
                  {plainTextExpanded ? 'Show less' : 'Read full scene'}
                </button>
              ) : null}
              {expectation !== 'none' ? (
                <p className="mt-2.5 border-t border-slate-200/80 pt-2.5 text-[11px] leading-snug text-ink-secondary">
                  <span className="font-semibold text-slate-700">Tip: </span>
                  {expectation === 'compact' ? EXPECTATION_COMPACT : EXPECTATION_LINE}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-2.5 flex flex-col gap-3">
          {parsed.intro.trim() ? (
                <section aria-labelledby="situation-role-heading">
                  <h2
                    id="situation-role-heading"
                    className="text-[10px] font-bold uppercase tracking-wide text-primary-800"
                  >
                    Your role
                  </h2>
                  <p className="mt-1 text-body-sm font-medium text-ink-primary leading-relaxed">{parsed.intro}</p>
                </section>
              ) : null}

              {parsed.setting.trim() ? (
                <section
                  className={parsed.intro.trim() ? 'border-t border-slate-200/80 pt-2.5' : ''}
                  aria-labelledby="situation-setting-heading"
                >
                  <h2
                    id="situation-setting-heading"
                    className="text-[10px] font-bold uppercase tracking-wide text-slate-600"
                  >
                    Setting
                  </h2>
                  <p className="mt-1 text-body-sm font-semibold text-ink-primary leading-snug">{parsed.setting}</p>
                </section>
              ) : null}

              {parsed.emphasis ? (
                <section
                  className="rounded-lg border border-emerald-200/70 bg-emerald-50/80 px-2.5 py-2 shadow-sm"
                  aria-labelledby="situation-emphasis-heading"
                >
                  <h2
                    id="situation-emphasis-heading"
                    className="text-[10px] font-bold uppercase tracking-wide text-emerald-900"
                  >
                    {parsed.emphasis.title}
                  </h2>
                  <p className="mt-1 text-body-sm text-ink-primary leading-relaxed">{parsed.emphasis.body}</p>
                </section>
              ) : null}

              {parsed.bullets.length > 0 ? (
                <section aria-labelledby="situation-practise-heading">
                  <h2
                    id="situation-practise-heading"
                    className="text-[10px] font-bold uppercase tracking-wide text-slate-600"
                  >
                    What to practise
                  </h2>
                  <ul className="mt-1.5 list-disc space-y-1.5 pl-[1.15rem] text-body-sm text-ink-primary leading-snug marker:text-slate-400">
                    {parsed.bullets.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {expectation !== 'none' ? (
                <footer className="border-t border-slate-200/90 pt-2.5 text-[11px] leading-snug text-ink-secondary">
                  <span className="font-semibold text-slate-700">Tip: </span>
                  {expectation === 'compact' ? EXPECTATION_COMPACT : EXPECTATION_LINE}
                </footer>
              ) : null}
            </div>
          )}
      </div>
    </article>
  )
}
