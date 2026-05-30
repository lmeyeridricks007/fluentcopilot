import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import { BookOpen, CheckCircle2, MessageCircle, Mic, PenLine, Timer, Volume2 } from 'lucide-react'

/** Polished device chrome for marketing — CSS-only, no stock imagery. */
function DeviceFrame({
  children,
  label,
  className,
}: {
  children: ReactNode
  label?: string
  className?: string
}) {
  return (
    <div
      className={clsx(
        'rounded-[1.25rem] border border-slate-200/90 bg-gradient-to-b from-slate-100 to-slate-200/80 p-2 sm:p-3 shadow-elevated',
        className,
      )}
    >
      <div className="flex items-center gap-2 px-2 pb-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400/40" />
        </span>
        {label && (
          <span className="flex-1 text-center text-caption font-medium text-slate-600 truncate">{label}</span>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-surface-elevated overflow-hidden">{children}</div>
    </div>
  )
}

export function HeroProductVisual({ className }: { className?: string }) {
  return (
    <DeviceFrame label="FluentCopilot" className={className}>
      <div className="bg-gradient-to-br from-primary-50 via-surface-elevated to-slate-50 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-primary-800">Today</p>
            <p className="mt-1 text-body font-bold text-ink-primary">Speaking · Exam-style</p>
            <p className="mt-1 text-body-sm text-ink-secondary max-w-[14rem]">Timed prompt · structured feedback</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-card">
            <Mic className="h-5 w-5" aria-hidden />
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 bg-white/90 p-3 shadow-card">
          <p className="text-body-sm text-ink-primary font-medium">“Beschrijf uw dagelijkse routine…”</p>
          <div className="mt-3 flex gap-1.5 h-10 items-end">
            {[0.35, 0.7, 0.5, 0.9, 0.45, 0.8].map((h, i) => (
              <span
                key={i}
                className="w-2 rounded-sm bg-primary-500/70"
                style={{ height: `${h * 100}%` }}
              />
            ))}
          </div>
          <p className="mt-2 text-caption text-primary-800 font-medium">Recording · 0:42</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-caption font-semibold text-emerald-900">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Next: fix word order
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-1 text-caption font-medium text-primary-900">
            A2-aligned
          </span>
        </div>
      </div>
    </DeviceFrame>
  )
}

export function WritingFeedbackVisual({ className }: { className?: string }) {
  return (
    <DeviceFrame label="Writing feedback" className={className}>
      <div className="p-4 sm:p-5 bg-surface-elevated">
        <div className="flex items-center gap-2 text-body-sm font-semibold text-ink-primary">
          <PenLine className="h-4 w-4 text-primary-600" aria-hidden />
          Revision snapshot
        </div>
        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-surface-muted/50 p-3 text-body-sm">
          <p className="text-ink-secondary">
            <span className="line-through text-ink-tertiary decoration-slate-400">Ik ga naar de werk gisteren.</span>
          </p>
          <p className="text-ink-primary font-medium">Ik ging gisteren naar het werk.</p>
        </div>
        <ul className="mt-3 space-y-2 text-body-sm text-ink-secondary">
          <li className="flex gap-2">
            <span className="text-primary-600 font-bold">·</span>
            Article + word order for past tense
          </li>
          <li className="flex gap-2">
            <span className="text-primary-600 font-bold">·</span>
            More natural connector for time phrase
          </li>
        </ul>
      </div>
    </DeviceFrame>
  )
}

export function ExamPrepModulesVisual({ className }: { className?: string }) {
  return (
    <DeviceFrame label="Exam prep hub" className={className}>
      <div className="p-4 sm:p-5 bg-slate-900 text-white">
        <div className="flex items-center justify-between gap-2">
          <p className="text-body-sm font-semibold">Modules</p>
          <Timer className="h-4 w-4 text-primary-300" aria-hidden />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {['Speaking', 'Writing', 'Listening', 'Reading', 'KNM', 'Mock exams'].map((name, i) => (
            <div
              key={name}
              className={clsx(
                'rounded-lg px-3 py-2.5 text-caption font-medium border',
                i === 5
                  ? 'border-primary-400/60 bg-primary-600/30 text-primary-100'
                  : 'border-white/10 bg-white/5 text-slate-200',
              )}
            >
              {name}
            </div>
          ))}
        </div>
        <p className="mt-4 text-caption text-slate-400">Training → simulation → practice exam</p>
      </div>
    </DeviceFrame>
  )
}

export function ReadinessVisual({ className }: { className?: string }) {
  return (
    <DeviceFrame label="Readiness" className={className}>
      <div className="p-4 sm:p-5 bg-gradient-to-b from-surface-elevated to-primary-50/40">
        <p className="text-body-sm font-semibold text-ink-primary">Where to focus next</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden>
              <path
                className="text-slate-200"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="text-primary-600"
                strokeLinecap="round"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 11.384 4.967"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="72, 100"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-body font-bold text-ink-primary">
              72%
            </span>
          </div>
          <ul className="min-w-0 flex-1 space-y-2 text-body-sm text-ink-secondary">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
              Speaking: tighten B1-style connectors
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary-500" aria-hidden />
              Writing: solid — schedule mock exam
            </li>
          </ul>
        </div>
      </div>
    </DeviceFrame>
  )
}

/** Chat-style practice — feedback modes, not a quiz grid. */
export function MessagingPracticeVisual({ className }: { className?: string }) {
  return (
    <DeviceFrame label="Messaging · Train station" className={className}>
      <div className="bg-gradient-to-b from-slate-50 to-surface-elevated p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-caption font-semibold uppercase tracking-wide text-primary-800">Feedback</p>
          <span className="rounded-full bg-primary-100 px-2.5 py-1 text-caption font-semibold text-primary-900">
            After each message
          </span>
        </div>
        <p className="mt-2 text-caption text-ink-secondary">Example dialogue</p>
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl rounded-tl-sm bg-white border border-slate-200 px-3 py-2 text-body-sm text-ink-secondary max-w-[92%] shadow-sm">
            Kun je me helpen met een retour?
          </div>
          <div className="rounded-2xl rounded-tr-sm bg-primary-600 px-3 py-2 text-body-sm text-white ml-auto max-w-[92%] shadow-sm">
            Ja — heeft u het bonnetje bij u?
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/90 px-3 py-2 text-body-sm text-ink-primary">
          <span className="font-semibold text-amber-900">Next:</span> softer question form at the counter
        </div>
      </div>
    </DeviceFrame>
  )
}

/** Read aloud + voice analysis — positioned beyond “speech to text”. */
export function ReadingAloudVisual({ className }: { className?: string }) {
  return (
    <DeviceFrame label="Read aloud" className={className}>
      <div className="p-4 sm:p-5 bg-surface-elevated">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-800">
            <BookOpen className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-caption font-semibold text-ink-secondary">Example text</p>
            <p className="mt-1 text-body-sm text-ink-primary leading-snug">
              De trein naar Utrecht vertrekt van spoor 4.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-1 h-12 px-1">
          {[0.25, 0.55, 0.4, 0.75, 0.5, 0.85, 0.35, 0.65].map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-primary-500/75"
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-caption font-medium text-ink-secondary">
            <Volume2 className="h-3.5 w-3.5" aria-hidden />
            Stress · pacing · clarity
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-1 text-caption font-semibold text-primary-900">
            Compare to model
          </span>
        </div>
      </div>
    </DeviceFrame>
  )
}

/** Stacked preview: messaging, speaking, recap — hero differentiation. */
export function CoachingLoopHeroVisual({ className }: { className?: string }) {
  return (
    <DeviceFrame label="FluentCopilot" className={className}>
      <div className="divide-y divide-slate-200 bg-surface-elevated">
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-2 text-caption font-semibold text-primary-800">
            <MessageCircle className="h-4 w-4" aria-hidden />
            Messaging
          </div>
          <p className="mt-2 text-caption text-ink-secondary">Example</p>
          <div className="mt-1 flex gap-2">
            <div className="rounded-xl bg-slate-100 px-2.5 py-1.5 text-caption text-ink-secondary max-w-[75%]">
              Ik wil een afspraak maken.
            </div>
          </div>
          <p className="mt-2 text-caption text-primary-800 font-medium">Feedback: end of chat — review key fixes</p>
        </div>
        <div className="p-3 sm:p-4 bg-gradient-to-r from-primary-50/80 to-surface-elevated">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-caption font-semibold text-primary-800">Speaking · Work</p>
              <p className="mt-0.5 text-body-sm text-ink-secondary">Example prompt</p>
              <p className="mt-1 text-body-sm font-medium text-ink-primary">Leg je rol uit in het team.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-card">
              <Mic className="h-5 w-5" aria-hidden />
            </span>
          </div>
        </div>
        <div className="p-3 sm:p-4 bg-slate-50/90">
          <p className="text-caption font-semibold text-ink-primary">Weekly recap</p>
          <ul className="mt-2 space-y-1 text-caption text-ink-secondary">
            <li className="flex gap-2">
              <span className="text-primary-600 font-bold">·</span>
              Weak spot: past tense in messages
            </li>
            <li className="flex gap-2">
              <span className="text-primary-600 font-bold">·</span>
              New: 12 words from your library
            </li>
          </ul>
        </div>
      </div>
    </DeviceFrame>
  )
}
