'use client'

import { ChevronDown, Shuffle } from 'lucide-react'
import { clsx } from 'clsx'
import { playAppSound } from '@/lib/interaction/appSounds'
import { SpeakLiveQuickVariationStrip } from './SpeakLiveQuickVariationStrip'
import {
  ORDERING_FOOD_FOCUS_OPTIONS,
  ORDERING_FOOD_SETTING_OPTIONS,
  type OrderingFoodScenarioFocus,
  type OrderingFoodScenarioOverrides,
  type OrderingFoodScenarioSetting,
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
        'min-h-touch rounded-2xl border px-3.5 py-2 text-body-sm font-semibold transition-colors',
        selected
          ? 'border-primary-400 bg-white text-primary-950 shadow-[0_10px_24px_-18px_rgba(59,130,246,0.5)]'
          : 'border-slate-200 bg-white text-ink-secondary hover:border-primary-200 hover:text-ink-primary'
      )}
    >
      {label}
    </button>
  )
}

export function OrderingFoodScenarioControls({
  smartMode,
  overrides,
  customizeOpen,
  onSmartModeChange,
  onOverridesChange,
  onCustomizeOpenChange,
}: {
  smartMode: boolean
  overrides: OrderingFoodScenarioOverrides
  customizeOpen: boolean
  onSmartModeChange: (next: boolean) => void
  onOverridesChange: (next: OrderingFoodScenarioOverrides) => void
  onCustomizeOpenChange: (next: boolean) => void
}) {
  const applySetting = (nextSetting: OrderingFoodScenarioSetting) => {
    onSmartModeChange(false)
    onCustomizeOpenChange(true)
    onOverridesChange({
      ...overrides,
      subType: overrides.subType === nextSetting ? undefined : nextSetting,
    })
  }

  const applyFocus = (nextFocus: OrderingFoodScenarioFocus) => {
    const nextVar = overrides.variation === nextFocus ? undefined : nextFocus
    const next: OrderingFoodScenarioOverrides = {
      ...(overrides.subType ? { subType: overrides.subType } : {}),
      ...(nextVar ? { variation: nextVar } : {}),
    }
    onOverridesChange(next)
    if (!next.subType && !next.variation) {
      onSmartModeChange(true)
      onCustomizeOpenChange(false)
    } else {
      onSmartModeChange(false)
      onCustomizeOpenChange(Boolean(next.subType))
    }
  }

  const quickVariationOptions = ORDERING_FOOD_FOCUS_OPTIONS.map((o) => ({ id: o.id, label: o.label }))

  return (
    <div className="mt-4 space-y-3">
      <SpeakLiveQuickVariationStrip
        title="Ordering task"
        description="Random mixes café, restaurant, or takeaway and the task. Pick one task focus while the venue can still change."
        randomSelected={smartMode}
        selectedVariationId={overrides.variation}
        options={quickVariationOptions}
        onPickRandom={() => {
          onSmartModeChange(true)
          onOverridesChange({})
          onCustomizeOpenChange(false)
        }}
        onToggleVariation={(id) => applyFocus(id as OrderingFoodScenarioFocus)}
      />

      <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/80 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                <Shuffle className="h-4.5 w-4.5" aria-hidden />
              </div>
              <div>
                <p className="text-body-sm font-semibold text-ink-primary">Mix it up each time</p>
                <p className="mt-0.5 text-caption text-ink-secondary">
                  We vary the situation and task to keep practice realistic.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={smartMode}
            onClick={() => {
              playAppSound('tap')
              const next = !smartMode
              onSmartModeChange(next)
              if (next) {
                onOverridesChange({})
                onCustomizeOpenChange(false)
              } else {
                onCustomizeOpenChange(false)
              }
            }}
            className={clsx(
              'relative mt-0.5 inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors',
              smartMode ? 'border-primary-500 bg-primary-600' : 'border-slate-300 bg-slate-200'
            )}
          >
            <span
              className={clsx(
                'absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow-sm transition-transform',
                smartMode ? 'translate-x-[1.3rem]' : 'translate-x-0.5'
              )}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/80">
        <button
          type="button"
          onClick={() => {
            playAppSound('tap')
            onCustomizeOpenChange(!customizeOpen)
          }}
          className="flex min-h-touch w-full items-center justify-between gap-3 px-4 py-3 text-left"
          aria-expanded={customizeOpen}
        >
          <div>
            <p className="text-body-sm font-semibold text-ink-primary">Customize this scenario</p>
            <p className="mt-0.5 text-caption text-ink-secondary">
              Optional overrides for advanced practice.
            </p>
          </div>
          <ChevronDown
            className={clsx('h-4.5 w-4.5 shrink-0 text-ink-tertiary transition-transform', customizeOpen && 'rotate-180')}
            aria-hidden
          />
        </button>

        {customizeOpen ? (
          <div className="border-t border-slate-200/80 px-4 py-4">
            <div className="space-y-4">
              <div>
                <p className="text-caption font-semibold text-ink-primary">Setting</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ORDERING_FOOD_SETTING_OPTIONS.map((option) => (
                    <ChoicePill
                      key={option.id}
                      label={option.label}
                      selected={overrides.subType === option.id}
                      onClick={() => applySetting(option.id)}
                    />
                  ))}
                </div>
              </div>

              <p className="text-caption text-ink-tertiary">
                Choosing any option turns off Smart mode. Turn Smart mode back on to randomize again.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
