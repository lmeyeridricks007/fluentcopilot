'use client'

import { ChevronDown, Shuffle } from 'lucide-react'
import { clsx } from 'clsx'
import { playAppSound } from '@/lib/interaction/appSounds'
import {
  WORK_COLLEAGUE_SUBTYPE_OPTIONS,
  WORK_COLLEAGUE_TASK_FOCUS_LAUNCHER_OPTIONS,
  WORK_COLLEAGUE_VARIATION_OPTIONS,
  type WorkColleagueScenarioOverrides,
  type WorkColleagueScenarioSubtype,
  type WorkColleagueScenarioVariation,
  type WorkColleagueTaskFocusId,
} from '../speakLiveScenarios'

function ChoicePill({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={() => {
        playAppSound('tap')
        onClick()
      }}
      className={clsx(
        'min-h-touch rounded-2xl border px-3.5 py-2 text-body-sm font-semibold transition-colors duration-150',
        selected
          ? 'border-primary-400/90 bg-white text-primary-950 shadow-[0_12px_28px_-18px_rgba(59,130,246,0.45)]'
          : 'border-slate-200/90 bg-white/90 text-ink-secondary hover:border-primary-200/90 hover:bg-white hover:text-ink-primary'
      )}
    >
      {label}
    </button>
  )
}

export function WorkColleagueInteractionScenarioControls({
  smartMode,
  overrides,
  customizeOpen,
  onSmartModeChange,
  onOverridesChange,
  onCustomizeOpenChange,
}: {
  smartMode: boolean
  overrides: WorkColleagueScenarioOverrides
  customizeOpen: boolean
  onSmartModeChange: (next: boolean) => void
  onOverridesChange: (next: WorkColleagueScenarioOverrides) => void
  onCustomizeOpenChange: (next: boolean) => void
}) {
  /** Any pinned subtype, variation, or task focus turns off smart mix; clearing all re-enables it. */
  function syncSmartModeFromOverrides(next: WorkColleagueScenarioOverrides) {
    if (!next.subType && !next.variation && !next.detailFocus) {
      onSmartModeChange(true)
      onCustomizeOpenChange(false)
    } else {
      onSmartModeChange(false)
    }
  }

  const applySubtype = (id: WorkColleagueScenarioSubtype) => {
    const nextSub = overrides.subType === id ? undefined : id
    const next: WorkColleagueScenarioOverrides = {
      ...(nextSub ? { subType: nextSub } : {}),
      ...(overrides.variation ? { variation: overrides.variation } : {}),
      ...(overrides.detailFocus ? { detailFocus: overrides.detailFocus } : {}),
    }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  const applyVariation = (id: WorkColleagueScenarioVariation) => {
    const nextVar = overrides.variation === id ? undefined : id
    const next: WorkColleagueScenarioOverrides = {
      ...(overrides.subType ? { subType: overrides.subType } : {}),
      ...(nextVar ? { variation: nextVar } : {}),
      ...(overrides.detailFocus ? { detailFocus: overrides.detailFocus } : {}),
    }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  const applyTaskFocus = (id: WorkColleagueTaskFocusId) => {
    const nextDf = overrides.detailFocus === id ? undefined : id
    const next: WorkColleagueScenarioOverrides = {
      ...(overrides.subType ? { subType: overrides.subType } : {}),
      ...(overrides.variation ? { variation: overrides.variation } : {}),
      ...(nextDf ? { detailFocus: nextDf } : {}),
    }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  const hasOverrides = Boolean(overrides.subType || overrides.variation || overrides.detailFocus)

  return (
    <div className="mt-4 space-y-3">
      <div
        className={clsx(
          'rounded-[1.45rem] border p-4 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.35)]',
          smartMode
            ? 'border-primary-200/70 bg-gradient-to-br from-white via-primary-50/40 to-white'
            : 'border-slate-200/80 bg-white/90'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div
                className={clsx(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                  smartMode ? 'border-primary-200/80 bg-white text-primary-700' : 'border-slate-200/80 bg-slate-50 text-slate-600'
                )}
              >
                <Shuffle className="h-[1.15rem] w-[1.15rem]" aria-hidden />
              </div>
              <div>
                <p className="text-body-sm font-semibold tracking-tight text-ink-primary">
                  Mix up the work situation each time
                </p>
                <p className="mt-1 max-w-prose text-caption leading-relaxed text-ink-secondary">
                  We vary the work context, task, and conversation goal so practice stays realistic.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={smartMode}
            aria-label={smartMode ? 'Smart mix on' : 'Smart mix off'}
            onClick={() => {
              playAppSound('tap')
              const next = !smartMode
              onSmartModeChange(next)
              if (next) {
                onOverridesChange({})
                onCustomizeOpenChange(false)
              }
            }}
            className={clsx(
              'relative mt-0.5 inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors duration-200',
              smartMode ? 'border-primary-500 bg-primary-600' : 'border-slate-300 bg-slate-200'
            )}
          >
            <span
              className={clsx(
                'pointer-events-none absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow-sm transition-transform duration-200',
                smartMode ? 'translate-x-[1.3rem]' : 'translate-x-0.5'
              )}
              aria-hidden
            />
          </button>
        </div>
        {!smartMode && hasOverrides ? (
          <p className="mt-3 border-t border-slate-200/70 pt-3 text-caption text-ink-tertiary">
            Smart mix is off for this launch because you chose specific options. Clear all choices below or turn the
            switch on to randomize again.
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[1.45rem] border border-slate-200/80 bg-white/90 shadow-[0_10px_36px_-30px_rgba(15,23,42,0.4)]">
        <button
          type="button"
          onClick={() => {
            playAppSound('tap')
            onCustomizeOpenChange(!customizeOpen)
          }}
          className="flex min-h-touch w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50/60"
          aria-expanded={customizeOpen}
        >
          <div>
            <p className="text-body-sm font-semibold text-ink-primary">Customize this scenario</p>
            <p className="mt-0.5 text-caption leading-snug text-ink-secondary">
              Optional — colleague, team, or lead; conversation focus; or a typical work artifact. Leave folded to use
              smart mix.
            </p>
          </div>
          <ChevronDown
            className={clsx('h-4.5 w-4.5 shrink-0 text-ink-tertiary transition-transform duration-200', customizeOpen && 'rotate-180')}
            aria-hidden
          />
        </button>

        {customizeOpen ? (
          <div className="border-t border-slate-200/80 px-4 py-4">
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Type</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WORK_COLLEAGUE_SUBTYPE_OPTIONS.map((o) => (
                    <ChoicePill
                      key={o.id}
                      label={o.label}
                      selected={overrides.subType === o.id}
                      onClick={() => applySubtype(o.id)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Focus</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WORK_COLLEAGUE_VARIATION_OPTIONS.map((o) => (
                    <ChoicePill
                      key={o.id}
                      label={o.label}
                      selected={overrides.variation === o.id}
                      onClick={() => applyVariation(o.id)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Optional task</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WORK_COLLEAGUE_TASK_FOCUS_LAUNCHER_OPTIONS.map((o) => (
                    <ChoicePill
                      key={o.id}
                      label={o.label}
                      selected={overrides.detailFocus === o.id}
                      onClick={() => applyTaskFocus(o.id)}
                    />
                  ))}
                </div>
              </div>
              <p className="text-caption leading-snug text-ink-tertiary">
                Any choice here pins that part of the run and turns smart mix off. Tap a selected pill again to clear
                it; when everything is cleared, smart mix turns back on.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
