'use client'

import { ChevronDown, Shuffle } from 'lucide-react'
import { clsx } from 'clsx'
import { playAppSound } from '@/lib/interaction/appSounds'
import { SpeakLiveQuickVariationStrip } from './SpeakLiveQuickVariationStrip'
import {
  DIRECTIONS_DESTINATION_OPTIONS,
  DIRECTIONS_VARIATION_OPTIONS,
  type DirectionsGettingSomewhereDestination,
  type DirectionsGettingSomewhereOverrides,
  type DirectionsGettingSomewhereVariation,
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

export function DirectionsScenarioControls({
  smartMode,
  overrides,
  customizeOpen,
  onSmartModeChange,
  onOverridesChange,
  onCustomizeOpenChange,
}: {
  smartMode: boolean
  overrides: DirectionsGettingSomewhereOverrides
  customizeOpen: boolean
  onSmartModeChange: (next: boolean) => void
  onOverridesChange: (next: DirectionsGettingSomewhereOverrides) => void
  onCustomizeOpenChange: (next: boolean) => void
}) {
  function syncSmartModeFromOverrides(next: DirectionsGettingSomewhereOverrides) {
    if (!next.subType && !next.variation) {
      onSmartModeChange(true)
      onCustomizeOpenChange(false)
    } else {
      onSmartModeChange(false)
      onCustomizeOpenChange(Boolean(next.subType))
    }
  }

  const applyDestination = (nextDest: DirectionsGettingSomewhereDestination) => {
    const nextSubType = overrides.subType === nextDest ? undefined : nextDest
    const next: DirectionsGettingSomewhereOverrides = {
      ...(nextSubType ? { subType: nextSubType } : {}),
      ...(overrides.variation ? { variation: overrides.variation } : {}),
    }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  const applyVariation = (nextVar: DirectionsGettingSomewhereVariation) => {
    const nextVariation = overrides.variation === nextVar ? undefined : nextVar
    const next: DirectionsGettingSomewhereOverrides = {
      ...(overrides.subType ? { subType: overrides.subType } : {}),
      ...(nextVariation ? { variation: nextVariation } : {}),
    }
    onOverridesChange(next)
    syncSmartModeFromOverrides(next)
  }

  const quickVariationOptions = DIRECTIONS_VARIATION_OPTIONS.map((o) => ({ id: o.id, label: o.label }))

  return (
    <div className="mt-4 space-y-3">
      <SpeakLiveQuickVariationStrip
        title="Wayfinding task"
        description="Random mixes destination and task. Pick one task type to lock it while the place can still change."
        randomSelected={smartMode}
        selectedVariationId={overrides.variation}
        options={quickVariationOptions}
        onPickRandom={() => {
          onSmartModeChange(true)
          onOverridesChange({})
          onCustomizeOpenChange(false)
        }}
        onToggleVariation={(id) => applyVariation(id as DirectionsGettingSomewhereVariation)}
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
                <p className="mt-0.5 text-caption text-ink-secondary leading-snug">
                  We pick a destination, setting, and task focus unless you customize below.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
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
              'shrink-0 rounded-full px-3 py-1.5 text-caption font-bold transition-colors',
              smartMode ? 'bg-primary-600 text-white' : 'bg-slate-100 text-ink-secondary hover:bg-slate-200'
            )}
          >
            {smartMode ? 'Smart mix' : 'Custom'}
          </button>
        </div>

        {!smartMode ? (
          <div className="mt-3 space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-caption font-semibold text-ink-primary hover:bg-slate-50"
              onClick={() => {
                playAppSound('tap')
                onCustomizeOpenChange(!customizeOpen)
              }}
            >
              <span>Destination</span>
              <ChevronDown className={clsx('h-4 w-4 transition-transform', customizeOpen ? 'rotate-180' : '')} />
            </button>
            {customizeOpen ? (
              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">Destination</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DIRECTIONS_DESTINATION_OPTIONS.map((opt) => (
                      <ChoicePill
                        key={opt.id}
                        label={opt.label}
                        selected={overrides.subType === opt.id}
                        onClick={() => applyDestination(opt.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
