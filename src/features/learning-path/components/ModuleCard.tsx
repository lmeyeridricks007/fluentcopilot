import { useState } from 'react'
import { ChevronDown, ChevronRight, Lock, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'
import { ProgressSummary } from './ProgressSummary'
import { LessonRow } from './LessonRow'
import type { ModuleCardModel } from '../types'

export function ModuleCard({
  mod,
  defaultOpen,
  onLessonOpen,
}: {
  mod: ModuleCardModel
  defaultOpen: boolean
  onLessonOpen: (row: ModuleCardModel['lessons'][0]) => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  const statusLabel =
    mod.state === 'completed' ? 'Completed' : mod.state === 'in_progress' ? 'In progress' : 'Locked'

  return (
    <Card
      padding="none"
      variant="outlined"
      className={clsx(
        'border-slate-200/90 shadow-sm overflow-hidden transition-shadow duration-200',
        mod.kind === 'placeholder' && 'opacity-80',
        mod.state === 'completed' && 'border-success/25'
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-surface-muted/60 min-h-touch transition-colors duration-200"
        aria-expanded={open}
      >
        <span className="mt-0.5 text-ink-secondary">
          {open ? <ChevronDown className="w-5 h-5" aria-hidden /> : <ChevronRight className="w-5 h-5" aria-hidden />}
        </span>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink-primary text-body leading-snug">{mod.title}</p>
            {mod.state === 'in_progress' ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-100 px-2 py-0.5 text-caption font-bold text-primary-800">
                <Sparkles className="w-3 h-3" aria-hidden />
                Active
              </span>
            ) : null}
            {mod.kind === 'placeholder' ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-caption font-semibold text-slate-600">
                Coming soon
              </span>
            ) : null}
          </div>
          <p className="text-caption text-ink-secondary line-clamp-2">{mod.description}</p>
          <p className="text-caption text-ink-tertiary">{mod.grammarOrOutcomeLine}</p>
          <ProgressSummary
            label={mod.kind === 'placeholder' ? 'Planned lessons' : 'Module progress'}
            value={mod.completedLessons}
            max={Math.max(mod.totalLessons, 1)}
          />
          <div className="flex items-center justify-between gap-2 pt-1">
            <span
              className={clsx(
                'text-caption font-semibold',
                mod.state === 'completed' && 'text-success',
                mod.state === 'in_progress' && 'text-primary-700',
                mod.state === 'locked' && 'text-ink-tertiary'
              )}
            >
              {statusLabel}
            </span>
            {mod.state === 'locked' && mod.kind === 'schema' ? (
              <Lock className="w-4 h-4 text-ink-tertiary" aria-hidden />
            ) : null}
          </div>
        </div>
      </button>
      <div
        className={clsx(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden min-h-0">
          {mod.lessons.length > 0 ? (
            <ul className="border-t border-slate-100 px-2 py-2 space-y-1.5 bg-surface-muted/30">
              {mod.lessons.map((row) => (
                <li key={row.lessonId}>
                  <LessonRow row={row} onOpen={() => onLessonOpen(row)} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-t border-slate-100 px-4 py-3 text-caption text-ink-secondary bg-surface-muted/20">
              {mod.kind === 'placeholder'
                ? 'Lessons will appear here when this module ships.'
                : 'No lessons to display.'}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
