'use client'

import Link from 'next/link'
import { useMemo, useRef } from 'react'
import { Check } from 'lucide-react'
import { clsx } from 'clsx'
import { PathSummaryStrip } from './PathSummaryStrip'
import { PathSupportingRow } from './PathSupportingRow'
import { LockedStagePreview } from './LockedStagePreview'
import { PathModuleLabel } from './PathModuleLabel'
import { PathLessonNode } from './PathLessonNode'
import { ProgressSummary } from './ProgressSummary'
import type { LearningPathViewModel, LessonRowModel } from '../types'
import { usePathStageSpy } from '../usePathStageSpy'
import { PathExploreEntry } from './PathExploreEntry'

function PlaceholderRailNode({ title }: { title: string }) {
  return (
    <div className="relative flex gap-3 opacity-90">
      <div className="flex w-8 shrink-0 justify-center pt-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-50" />
      </div>
      <div className="flex-1 rounded-2xl border border-dashed border-slate-200 bg-surface-muted/20 px-3.5 py-3">
        <p className="text-body-sm font-medium text-ink-secondary">{title}</p>
        <p className="text-caption text-ink-tertiary mt-0.5">Lessons ship on the roadmap.</p>
      </div>
    </div>
  )
}

function StageCompleteMarker() {
  return (
    <div className="pl-11 pr-2 py-3 motion-safe:animate-learn-segment-crossfade">
      <p className="text-caption font-semibold text-success flex items-center gap-2">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
          aria-hidden
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <span className="h-px flex-1 bg-success/20 max-w-[2.5rem]" aria-hidden />
        <span>Stage complete — onward</span>
      </p>
    </div>
  )
}

export function LearningPathJourney({
  vm,
  onLessonOpen,
  nextLessonSequentialBlocked,
}: {
  vm: LearningPathViewModel
  onLessonOpen: (row: LessonRowModel) => void
  /** When strict sequence blocks the path “next” lesson. */
  nextLessonSequentialBlocked: boolean
}) {
  const augmentRow = (row: LessonRowModel): LessonRowModel => {
    if (nextLessonSequentialBlocked && row.isNext) {
      return { ...row, isLocked: true, isNext: false }
    }
    return row
  }

  const scrollTargetId = vm.hero.continueLesson?.lessonId
  const shouldScrollNext =
    Boolean(scrollTargetId) && !nextLessonSequentialBlocked

  const sectionRefs = useRef(new Map<string, HTMLElement>())
  const scrollBands = useMemo(
    () => vm.stages.filter((s) => s.state !== 'locked').map((s) => s.bandId),
    [vm.stages]
  )
  const { activeBandId, stickyBarRef } = usePathStageSpy({
    bandIds: scrollBands,
    sectionRefs,
    preferredBandId: vm.hero.currentStageBand,
  })
  const spyStage = vm.stages.find((s) => s.bandId === activeBandId)

  return (
    <div className="space-y-5 pb-4">
      <PathSummaryStrip hero={vm.hero} />

      {vm.hero.postA2Cta ? (
        <Link
          href={vm.hero.postA2Cta.href}
          className="block rounded-xl border border-primary-200 bg-primary-50/50 px-4 py-3 text-body-sm font-semibold text-primary-900 transition-colors hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
        >
          {vm.hero.postA2Cta.label}
          <span className="block text-caption font-normal text-primary-800/90 mt-0.5">
            {vm.hero.postA2Cta.hint}
          </span>
        </Link>
      ) : null}

      <div>
        <div className="mb-2 space-y-1 px-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-body-sm font-semibold text-ink-tertiary uppercase tracking-wide">
              Your path
            </h2>
            <span className="text-caption text-ink-tertiary">{vm.course.cefrLevel}</span>
          </div>
          <p className="text-caption text-ink-secondary leading-snug max-w-prose">
            A clear sequence — your next step stays highlighted. Tap forward when you are ready.
          </p>
        </div>

        {scrollBands.length > 0 && spyStage && spyStage.state !== 'locked' ? (
          <div
            ref={stickyBarRef}
            className="sticky top-2 z-20 mb-2 rounded-xl border border-slate-200/90 bg-surface/95 px-3 py-2 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-surface/88"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary">
                {spyStage.bandId}
              </p>
              <span
                className={clsx(
                  'text-[11px] font-semibold shrink-0',
                  spyStage.state === 'completed' ? 'text-success' : 'text-primary-700'
                )}
              >
                {spyStage.state === 'completed' ? 'Done' : 'In progress'}
              </span>
            </div>
            <p className="text-body-sm font-semibold text-ink-primary leading-snug line-clamp-2">
              {spyStage.title}
            </p>
            {spyStage.description ? (
              <p className="mt-0.5 text-caption text-ink-secondary line-clamp-2 leading-snug">
                {spyStage.description}
              </p>
            ) : null}
            <ProgressSummary
              className="mt-1.5"
              label="Units in this stage"
              value={spyStage.modulesDone}
              max={Math.max(spyStage.modulesTotal, 1)}
            />
          </div>
        ) : null}

        <div className="relative">
          <div
            className="pointer-events-none absolute left-[15px] top-6 bottom-6 w-px bg-gradient-to-b from-primary-200/40 via-slate-200 to-slate-200/40"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-[15px] top-[40%] h-24 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-primary-300/35 to-transparent blur-[0.5px]"
            aria-hidden
          />

          <div className="space-y-1 relative">
            {vm.stages.map((stage, stageIndex) => {
              if (stage.state === 'locked') {
                return (
                  <div key={stage.bandId} className="relative z-[1] pt-2">
                    <LockedStagePreview stage={stage} />
                  </div>
                )
              }

              const nextStage = vm.stages[stageIndex + 1]
              const showStageComplete = stage.state === 'completed' && Boolean(nextStage)

              return (
                <div
                  key={stage.bandId}
                  ref={(el) => {
                    if (el) sectionRefs.current.set(stage.bandId, el)
                    else sectionRefs.current.delete(stage.bandId)
                  }}
                  className="space-y-1 relative z-[1]"
                >
                  {stage.modules.map((mod, modIdx) => (
                    <div key={mod.id} className="space-y-0.5">
                      <PathModuleLabel
                        title={mod.title}
                        kind={mod.kind}
                        unitIndex={modIdx + 1}
                        unitTotal={stage.modules.length}
                      />
                      {mod.lessons.length === 0 ? (
                        <PlaceholderRailNode title={mod.title} />
                      ) : (
                        mod.lessons.map((row) => {
                          const r = augmentRow(row)
                          return (
                            <PathLessonNode
                              key={row.lessonId}
                              row={r}
                              onOpen={() => onLessonOpen(augmentRow(row))}
                              scrollOnMount={
                                shouldScrollNext && row.lessonId === scrollTargetId
                              }
                            />
                          )
                        })
                      )}
                    </div>
                  ))}

                  {showStageComplete ? <StageCompleteMarker /> : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <PathSupportingRow actions={vm.actions} />

      <section className="space-y-2 pt-1" aria-label="Explore lessons">
        <PathExploreEntry />
      </section>
    </div>
  )
}
