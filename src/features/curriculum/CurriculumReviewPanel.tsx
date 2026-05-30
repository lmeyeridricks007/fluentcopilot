'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Crosshair, Layers, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { a2LessonIdsWithSelfCheckTag } from '@/demo-data/curriculum/a2Catalog'
import {
  peopleDailySchemaPlayerHref,
  SCHEMA_PEOPLE_DAILY_LESSON_IDS_ORDERED,
} from '@/demo-data/curriculum/schemaPeopleDailyPath'
import {
  dueReviewItems,
  loadWeakTags,
  markReviewed,
  type A2ReviewQueueItem,
} from './a2ReviewStore'

function ReviewQueueRow({
  item,
  onDone,
}: {
  item: A2ReviewQueueItem
  onDone: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-slate-200/90 bg-surface-elevated px-3 py-3 space-y-2 shadow-sm transition-shadow hover:shadow">
      <p className="text-[11px] font-medium text-ink-tertiary uppercase tracking-wide">
        {item.kind === 'grammar' ? 'Grammar' : 'Lemma'} · lesson {item.lessonId}
      </p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left min-h-touch rounded-lg border border-slate-100 bg-surface-muted/50 px-3 py-2.5 transition-colors active:scale-[0.99] active:bg-surface-muted"
      >
        <p className="text-body-sm font-semibold text-ink-primary">{open ? item.lemma : 'Show item'}</p>
        {!open ? (
          <p className="text-caption text-ink-secondary mt-1">One minute aloud — light and focused.</p>
        ) : null}
      </button>
      <Button size="sm" variant="secondary" className="w-full" onClick={() => onDone(item.id)}>
        Mark reviewed
      </Button>
    </div>
  )
}

function ActionRow({
  title,
  subtitle,
  icon,
  onClick,
  featured,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  onClick: () => void
  /** Quick-win hero — first tap on Review. */
  featured?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full min-h-touch items-center gap-3 rounded-2xl border px-3.5 py-3.5 text-left transition-all duration-200',
        'active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500',
        featured
          ? 'border-primary-200/90 bg-gradient-to-br from-primary-50/90 via-surface-elevated to-primary-50/30 shadow-md ring-1 ring-primary-200/50'
          : 'border-slate-200/90 bg-surface-elevated hover:border-slate-300 hover:shadow-sm',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          featured ? 'bg-primary-700/10 text-primary-800' : 'bg-surface-muted text-primary-700',
        ].join(' ')}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-body-sm font-semibold text-ink-primary block">{title}</span>
        <span className="text-caption text-ink-secondary block mt-0.5 leading-snug">{subtitle}</span>
      </span>
      <ChevronRight
        className={['w-4 h-4 shrink-0', featured ? 'text-primary-700' : 'text-ink-tertiary'].join(
          ' '
        )}
        aria-hidden
      />
    </button>
  )
}

export function CurriculumReviewPanel() {
  const router = useRouter()
  const [, bump] = useState(0)
  const due = dueReviewItems()
  const weak = loadWeakTags().sort((a, b) => b.wrongCount - a.wrongCount)
  const refresh = useCallback(() => bump((x) => x + 1), [])

  const practiceWeak = (tag: string) => {
    const ids = a2LessonIdsWithSelfCheckTag(tag)
    const first = ids.find((id) => SCHEMA_PEOPLE_DAILY_LESSON_IDS_ORDERED.includes(id))
    if (first) router.push(peopleDailySchemaPlayerHref(first))
    else if (SCHEMA_PEOPLE_DAILY_LESSON_IDS_ORDERED[0])
      router.push(peopleDailySchemaPlayerHref(SCHEMA_PEOPLE_DAILY_LESSON_IDS_ORDERED[0]))
    else router.push('/app/learn/explore')
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 ring-1 ring-primary-100">
            <Sparkles className="h-4 w-4 text-primary-700" aria-hidden />
          </div>
          <div>
            <h2 className="text-body-lg font-bold text-ink-primary">Review</h2>
            <p className="text-caption text-ink-secondary leading-relaxed mt-0.5">
              A fast way to stay sharp — short wins that keep your path moving.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider px-0.5">
          Start here
        </p>
        <p className="text-caption text-ink-tertiary px-0.5 -mt-0.5">
          ~5–15 minutes · ideal between path lessons
        </p>
        <ActionRow
          title="Structured daily review"
          subtitle="Spaced repetition — steady cards, full session in the hub."
          icon={<RotateCcw className="w-5 h-5" aria-hidden />}
          onClick={() => router.push('/app/review/daily')}
          featured
        />
        <ActionRow
          title="Fix mistakes"
          subtitle="Turn recent slips into a tight recovery set."
          icon={<Crosshair className="w-5 h-5" aria-hidden />}
          onClick={() => router.push('/app/review/mistakes')}
        />
      </div>

      <section className="space-y-2">
        <div className="flex items-center gap-2 px-0.5">
          <Layers className="w-4 h-4 text-ink-tertiary" aria-hidden />
          <h3 className="text-body-sm font-semibold text-ink-primary">Due in Learn (this device)</h3>
        </div>
        <p className="text-caption text-ink-secondary px-0.5">
          From guided lessons — +1d, +3d, +7d cadence. Private to this device.
        </p>
        {due.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-success/25 bg-success/[0.04] px-4 py-6 text-center">
            <p className="text-body-sm font-semibold text-ink-primary">Review queue is clear</p>
            <p className="text-caption text-ink-secondary mt-1 leading-snug">
              Nice — when items are due, they land here for a quick pass.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {due.map((item) => (
              <li key={item.id}>
                <ReviewQueueRow
                  item={item}
                  onDone={(id) => {
                    markReviewed(id)
                    refresh()
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-body-sm font-semibold text-ink-primary px-0.5">Repair weak tags</h3>
        <p className="text-caption text-ink-secondary px-0.5">
          From self-check misses — open a lesson that rehearses the pattern.
        </p>
        {weak.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-surface-muted/30 px-3 py-3">
            <p className="text-body-sm font-medium text-ink-primary">Nothing to repair yet</p>
            <p className="text-caption text-ink-secondary mt-0.5">
              Tags appear when practice misses stack up — clear sign you are pushing.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weak.map((w) => (
              <Button key={w.tag} size="sm" variant="secondary" onClick={() => practiceWeak(w.tag)}>
                {w.tag} · {w.wrongCount}
              </Button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
