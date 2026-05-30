'use client'

import Link from 'next/link'
import { Mic } from 'lucide-react'
import type { ConversationRecapViewModel, FeedbackMode } from '../types'
import { APP_TALK_HUB } from '@/lib/routing/appRoutes'

const TALK_OPEN_TRAIN_SETUP = `${APP_TALK_HUB}?openTrainSetup=1`

export function ConversationRecapView({
  model,
  feedbackMode,
  scenarioTitle,
}: {
  model: ConversationRecapViewModel
  feedbackMode: FeedbackMode
  scenarioTitle: string
}) {
  const hasUseful = Boolean(model.usefulPhrase?.trim() || model.usefulWord?.trim())
  const speakingMoments = model.speakingCoachingRecap ?? []
  const pronunciation = model.pronunciationHighlights ?? []

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto w-full space-y-5 motion-safe:animate-fc-message-in">
      <header className="space-y-1">
        <p className="text-caption font-bold uppercase tracking-wide text-ink-tertiary">Recap</p>
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Nice work</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">
          {scenarioTitle} — {feedbackMode === 'at_end' ? 'Your saved-up coaching' : 'Quick wrap-up'}.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200/90 bg-surface-elevated p-4 shadow-sm space-y-2">
        <h2 className="text-caption font-bold text-ink-tertiary uppercase tracking-wide">You handled</h2>
        {model.handledWell.length > 0 ? (
          <ul className="list-disc pl-4 space-y-1 text-body-sm text-ink-primary">
            {model.handledWell.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-ink-secondary">You stayed in the conversation — solid practice.</p>
        )}
      </section>

      {model.whatToImprove.length > 0 ? (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-2">
          <h2 className="text-caption font-bold text-ink-tertiary uppercase tracking-wide">Keep working on</h2>
          <ul className="list-disc pl-4 space-y-1 text-body-sm text-ink-primary">
            {model.whatToImprove.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {model.improvePhrases.length > 0 ? (
        <section className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4 space-y-2">
          <h2 className="text-caption font-bold text-amber-900/80 uppercase tracking-wide">
            Try saying this more naturally
          </h2>
          <ul className="space-y-3">
            {model.improvePhrases.map((row, i) => (
              <li key={i} className="text-body-sm">
                <p className="text-ink-tertiary line-through decoration-slate-300">{row.original}</p>
                <p className="font-semibold text-ink-primary mt-0.5">{row.corrected}</p>
                <p className="text-caption text-ink-secondary mt-1">{row.note}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {feedbackMode === 'at_end' && model.deferredFeedbackCount && model.deferredFeedbackCount > 0 ? (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-2">
          <h2 className="text-caption font-bold text-ink-tertiary uppercase tracking-wide">Stored notes</h2>
          <p className="text-caption text-ink-secondary">
            {model.deferredFeedbackCount} coaching moment
            {model.deferredFeedbackCount === 1 ? '' : 's'} from this chat.
          </p>
        </section>
      ) : null}

      {pronunciation.length > 0 ? (
        <section className="rounded-2xl border border-violet-200/70 bg-violet-50/30 p-4 space-y-3">
          <h2 className="text-caption font-bold text-violet-950 uppercase tracking-wide flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5" aria-hidden />
            Pronunciation highlights
          </h2>
          <ul className="space-y-2">
            {pronunciation.map((h) => (
              <li key={`${h.phrase}-${h.tip}`} className="rounded-xl bg-white/90 border border-violet-100/80 p-3">
                <p className="text-body-sm font-semibold text-ink-primary">{h.phrase}</p>
                <p className="text-caption text-ink-secondary mt-1">{h.tip}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {speakingMoments.length > 0 ? (
        <section className="rounded-2xl border border-primary-200/60 bg-primary-50/25 p-4 space-y-3">
          <h2 className="text-caption font-bold text-primary-950 uppercase tracking-wide flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5" aria-hidden />
            Speaking coach (from your replies)
          </h2>
          <p className="text-caption text-ink-secondary">
            Transcript-based tips — not full pronunciation scoring.
          </p>
          <ul className="space-y-3">
            {speakingMoments.map((row) => {
              const c = row.coaching
              const better = c.correctedAlternative?.trim() || c.savePhraseCandidates[0]?.phrase?.trim()
              return (
                <li key={row.userMessageId} className="rounded-xl bg-white/80 border border-primary-100/80 p-3 space-y-1">
                  <p className="text-body-sm font-medium text-ink-primary">{c.shortVerdict}</p>
                  {better ? (
                    <p className="text-body-sm text-ink-primary">
                      <span className="text-ink-tertiary">More natural: </span>
                      <span className="font-semibold">{better}</span>
                    </p>
                  ) : null}
                  {c.whyItMatters?.trim() ? (
                    <p className="text-caption text-ink-secondary">{c.whyItMatters}</p>
                  ) : null}
                  <p className="text-caption text-ink-tertiary">{c.encouragement}</p>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {hasUseful ? (
        <section className="rounded-2xl border border-primary-200/60 bg-primary-50/30 p-4 space-y-1">
          <h2 className="text-caption font-bold text-primary-900 uppercase tracking-wide">Useful phrase</h2>
          {model.usefulPhrase ? (
            <p className="text-body-sm font-semibold text-ink-primary">{model.usefulPhrase}</p>
          ) : null}
          {model.usefulWord ? (
            <p className="text-caption text-ink-secondary">Word to keep: {model.usefulWord}</p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200/90 bg-surface-muted/40 p-4">
        <h2 className="text-caption font-bold text-ink-tertiary uppercase tracking-wide">Next</h2>
        <p className="text-body-sm text-ink-primary leading-snug mt-1">{model.nextStep}</p>
      </section>

      <div className="flex flex-col gap-2 pt-2">
        <Link
          href={TALK_OPEN_TRAIN_SETUP}
          className="min-h-touch flex items-center justify-center rounded-xl bg-primary-600 text-white text-body-sm font-bold px-4 py-3"
        >
          Start new train chat
        </Link>
        <Link
          href={APP_TALK_HUB}
          className="min-h-touch flex items-center justify-center rounded-xl border border-slate-200 bg-surface-elevated text-body-sm font-semibold text-ink-primary px-4 py-3"
        >
          Back to Talk
        </Link>
        <p className="text-center text-caption text-ink-tertiary">
          Your last thread is closed — pick this when you are ready for another run.
        </p>
      </div>
    </div>
  )
}
