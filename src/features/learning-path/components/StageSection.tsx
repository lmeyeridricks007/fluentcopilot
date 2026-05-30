import { useState } from 'react'
import { ChevronDown, ChevronRight, Lock } from 'lucide-react'
import { clsx } from 'clsx'
import { ProgressSummary } from './ProgressSummary'
import { ModuleCard } from './ModuleCard'
import type { ModuleCardModel, StageSectionModel } from '../types'

export function StageSection({
  stage,
  defaultOpen,
  onLessonOpen,
}: {
  stage: StageSectionModel
  defaultOpen: boolean
  onLessonOpen: (row: ModuleCardModel['lessons'][0]) => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  const stateLabel =
    stage.state === 'locked' ? 'Locked' : stage.state === 'completed' ? 'Completed' : 'Your focus'

  return (
    <section className="space-y-3" aria-labelledby={`stage-${stage.bandId}-heading`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'w-full rounded-2xl border px-4 py-3.5 text-left min-h-touch transition-all duration-200',
          stage.state === 'locked' && 'border-slate-200/80 bg-slate-50/80 opacity-75',
          stage.state === 'active' && 'border-primary-200 bg-gradient-to-br from-primary-50/90 to-surface-elevated shadow-sm',
          stage.state === 'completed' && 'border-slate-200 bg-surface-elevated'
        )}
        aria-expanded={open}
      >
        <div className="flex items-start gap-3">
          <span className="mt-1 text-ink-secondary shrink-0">
            {open ? <ChevronDown className="w-5 h-5" aria-hidden /> : <ChevronRight className="w-5 h-5" aria-hidden />}
          </span>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-caption font-bold text-primary-700 tracking-wide">{stage.bandId}</p>
                <h2 id={`stage-${stage.bandId}-heading`} className="text-title font-bold text-ink-primary leading-tight">
                  {stage.title}
                </h2>
                <p className="text-caption text-ink-tertiary mt-0.5">{stage.subtitle}</p>
              </div>
              {stage.state === 'locked' ? (
                <Lock className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
              ) : (
                <span className="text-caption font-semibold text-primary-700 whitespace-nowrap">{stateLabel}</span>
              )}
            </div>
            <p className="text-body-sm text-ink-secondary line-clamp-2">{stage.description}</p>
            <p className="text-caption font-medium text-ink-primary">
              <span className="text-ink-tertiary font-normal">Grammar focus · </span>
              {stage.grammarFocus}
            </p>
            <ProgressSummary
              label="Modules on track"
              value={stage.modulesDone}
              max={Math.max(stage.modulesTotal, 1)}
            />
          </div>
        </div>
      </button>

      <div
        className={clsx(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden min-h-0 space-y-3 pl-1 sm:pl-2">
          {stage.modules.map((mod) => (
            <ModuleCard
              key={mod.id}
              mod={mod}
              defaultOpen={mod.defaultExpanded}
              onLessonOpen={onLessonOpen}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
